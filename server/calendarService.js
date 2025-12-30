import { google } from 'googleapis';

const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
);

export const getAuthUrl = () => {
    if (!process.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID === 'your_google_client_id') {
        throw new Error('Google Calendar credentials are not configured in server/.env');
    }

    const scopes = ['https://www.googleapis.com/auth/calendar'];
    return oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: scopes,
    });
};

export const setCredentials = async (code) => {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);
    return tokens;
};

export const createEvent = async (auth, event) => {
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client }); // Use global client if tokens set, or pass auth
    // For simplicity in this demo, we assume global auth is set or passed
    // In a real multi-user app, we'd manage tokens per user.
    // Here we assume a single admin account manages the team calendar.

    try {
        const res = await calendar.events.insert({
            calendarId: 'primary',
            resource: event,
        });
        return res.data;
    } catch (error) {
        console.error('Error creating event:', error);
        throw error;
    }
};

export const deleteEvent = async (auth, eventId) => {
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    try {
        await calendar.events.delete({
            calendarId: 'primary',
            eventId: eventId,
        });
    } catch (error) {
        console.error('Error deleting event:', error);
        // Don't throw if it's just not found or already deleted
    }
};

export const updateEvent = async (auth, eventId, event) => {
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    try {
        const res = await calendar.events.update({
            calendarId: 'primary',
            eventId: eventId,
            resource: event,
        });
        return res.data;
    } catch (error) {
        console.error('Error updating event:', error);
        throw error;
    }
};
