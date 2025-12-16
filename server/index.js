import express from 'express';
import cors from 'cors';
import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { getAuthUrl, setCredentials, createEvent, deleteEvent, updateEvent } from './calendarService.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Database setup
const __dirname = dirname(fileURLToPath(import.meta.url));
const file = join(__dirname, 'db.json');
const adapter = new JSONFile(file);
const db = new Low(adapter, { users: [] });

// Initialize DB
await db.read();
db.data ||= { users: [] };
await db.write();

let calendarAuth = null;

// Calendar Routes
app.get('/api/auth/url', (req, res) => {
  const url = getAuthUrl();
  res.json({ url });
});

app.post('/api/auth/callback', async (req, res) => {
  const { code } = req.body;
  try {
    const tokens = await setCredentials(code);
    calendarAuth = tokens; // In real app, save to DB per user
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to authenticate' });
  }
});

// Routes
app.get('/api/users', async (req, res) => {
  await db.read();
  res.json(db.data.users);
});

app.post('/api/users', async (req, res) => {
  await db.read();
  const newUser = {
    id: crypto.randomUUID(),
    name: req.body.name,
    email: req.body.email,
    birthday: req.body.birthday, // YYYY-MM-DD
    totalVacationDays: req.body.totalVacationDays || 0,
    vacations: [], // Array of { id, startDate, endDate, daysUsed }
    ...req.body
  };
  db.data.users.push(newUser);
  await db.write();
  res.status(201).json(newUser);
});

app.put('/api/users/:id', async (req, res) => {
  await db.read();
  const userIndex = db.data.users.findIndex(u => u.id === req.params.id);
  if (userIndex === -1) return res.status(404).json({ error: 'User not found' });

  db.data.users[userIndex] = { ...db.data.users[userIndex], ...req.body };
  await db.write();
  res.json(db.data.users[userIndex]);
});

app.delete('/api/users/:id', async (req, res) => {
  await db.read();
  const userIndex = db.data.users.findIndex(u => u.id === req.params.id);
  if (userIndex === -1) return res.status(404).json({ error: 'User not found' });

  db.data.users.splice(userIndex, 1);
  await db.write();
  res.json({ success: true });
});

app.post('/api/users/:id/vacations', async (req, res) => {
  await db.read();
  const user = db.data.users.find(u => u.id === req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const { startDate, endDate, daysUsed } = req.body;

  // Simple validation
  if (!startDate || !endDate || !daysUsed) {
    return res.status(400).json({ error: 'Missing vacation details' });
  }

  const vacation = {
    id: crypto.randomUUID(),
    startDate,
    endDate,
    daysUsed: parseInt(daysUsed)
  };

  // Sync to Calendar if connected
  if (calendarAuth) {
    try {
      const event = await createEvent(calendarAuth, {
        summary: `${user.name} - Vacation`,
        description: `Vacation for ${user.name}`,
        start: { date: startDate },
        end: { date: endDate }, // Google Calendar end date is exclusive for all-day events
      });
      vacation.googleEventId = event.id;
    } catch (err) {
      console.error('Failed to sync to calendar', err);
    }
  }

  user.vacations.push(vacation);
  await db.write();

  res.status(201).json(user);

});

app.put('/api/users/:id/vacations/:vacationId', async (req, res) => {
  await db.read();
  const user = db.data.users.find(u => u.id === req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const vacationIndex = user.vacations.findIndex(v => v.id === req.params.vacationId);
  if (vacationIndex === -1) return res.status(404).json({ error: 'Vacation not found' });

  const { startDate, endDate, daysUsed } = req.body;
  if (!startDate || !endDate || !daysUsed) {
    return res.status(400).json({ error: 'Missing vacation details' });
  }

  const oldVacation = user.vacations[vacationIndex];
  const updatedVacation = {
    ...oldVacation,
    startDate,
    endDate,
    daysUsed: parseInt(daysUsed)
  };

  // Sync to Calendar if connected
  if (calendarAuth && updatedVacation.googleEventId) {
    try {
      await updateEvent(calendarAuth, updatedVacation.googleEventId, {
        summary: `${user.name} - Vacation`,
        description: `Vacation for ${user.name}`,
        start: { date: startDate },
        end: { date: endDate },
      });
    } catch (err) {
      console.error('Failed to sync update to calendar', err);
    }
  }

  user.vacations[vacationIndex] = updatedVacation;
  await db.write();
  res.json(user);
});

app.delete('/api/users/:id/vacations/:vacationId', async (req, res) => {
  await db.read();
  const user = db.data.users.find(u => u.id === req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const vacation = user.vacations.find(v => v.id === req.params.vacationId);
  if (vacation && vacation.googleEventId && calendarAuth) {
    await deleteEvent(calendarAuth, vacation.googleEventId);
  }

  user.vacations = user.vacations.filter(v => v.id !== req.params.vacationId);
  await db.write();
  res.json(user);
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
