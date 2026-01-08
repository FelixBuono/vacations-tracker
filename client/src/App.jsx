import { useState, useEffect } from 'react';
import './App.css';

const API_URL = 'http://localhost:3001/api';

function App() {
  const [users, setUsers] = useState([]);
  const [view, setView] = useState('yearly'); // yearly, dashboard, user-details, add-user
  const [selectedUser, setSelectedUser] = useState(null);
  const [formData, setFormData] = useState({ name: '', email: '', team: '', birthday: '', hiringDate: '', totalVacationDays: 20 });
  const [vacationForm, setVacationForm] = useState({ startDate: '', endDate: '', holidays: 0 });
  const [editingVacationId, setEditingVacationId] = useState(null);
  const [editingUserId, setEditingUserId] = useState(null);
  const [calculatedDays, setCalculatedDays] = useState(0);



  // Theme State
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');

  useEffect(() => {
    if (theme === 'dark') {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    if (vacationForm.startDate && vacationForm.endDate) {
      const days = calculateBusinessDays(vacationForm.startDate, vacationForm.endDate);
      const finalDays = Math.max(0, days - (parseInt(vacationForm.holidays) || 0));
      setCalculatedDays(finalDays);
    } else {
      setCalculatedDays(0);
    }
  }, [vacationForm]);

  const calculateBusinessDays = (start, end) => {
    // Append time to ensure local timezone parsing and avoid midnight boundary issues
    const startDate = new Date(start + 'T12:00:00');
    const endDate = new Date(end + 'T12:00:00');
    let count = 0;
    const curDate = new Date(startDate.getTime());

    while (curDate <= endDate) {
      const dayOfWeek = curDate.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) count++;
      curDate.setDate(curDate.getDate() + 1);
    }
    return count;
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch(`${API_URL}/users`);
      const data = await res.json();
      setUsers(data);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    try {
      const url = editingUserId ? `${API_URL}/users/${editingUserId}` : `${API_URL}/users`;
      const method = editingUserId ? 'PUT' : 'POST';

      await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      setFormData({ name: '', email: '', team: '', birthday: '', hiringDate: '', totalVacationDays: 20 });
      setEditingUserId(null);
      setView('dashboard');
      fetchUsers();
      if (editingUserId) {
        // If we were editing, go back to details or dashboard. Let's go to dashboard to see list.
        // Or update selectedUser if we want to stay in details.
        // For now, dashboard is fine as per existing flow.
      }
    } catch (error) {
      console.error('Error saving user:', error);
    }
  };

  const handleEditUserClick = () => {
    setFormData({
      name: selectedUser.name,
      email: selectedUser.email,
      team: selectedUser.team || '',
      birthday: selectedUser.birthday || '',
      hiringDate: selectedUser.hiringDate || '',
      totalVacationDays: selectedUser.totalVacationDays
    });
    setEditingUserId(selectedUser.id);
    setView('add-user');
  };

  const handleDeleteUser = async () => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) return;
    try {
      const res = await fetch(`${API_URL}/users/${editingUserId}`, {
        method: 'DELETE'
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to delete user');
      }

      setEditingUserId(null);
      setFormData({ name: '', email: '', team: '', birthday: '', hiringDate: '', totalVacationDays: 20 });
      setView('dashboard');
      fetchUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      alert(`Error deleting user: ${error.message}. Please try restarting the server.`);
    }
  };

  const handleAddVacation = async (e) => {
    e.preventDefault();
    const { startDate, endDate } = vacationForm;
    const daysUsed = calculatedDays;

    try {
      const url = editingVacationId
        ? `${API_URL}/users/${selectedUser.id}/vacations/${editingVacationId}`
        : `${API_URL}/users/${selectedUser.id}/vacations`;

      const method = editingVacationId ? 'PUT' : 'POST';

      await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startDate, endDate, daysUsed }),
      });
      setVacationForm({ startDate: '', endDate: '', holidays: 0 });
      setEditingVacationId(null);
      // Refresh selected user data
      const res = await fetch(`${API_URL}/users`);
      const data = await res.json();
      setUsers(data);
      setSelectedUser(data.find(u => u.id === selectedUser.id));
    } catch (error) {
      console.error('Error saving vacation:', error);
    }
  };

  const handleDeleteVacation = async (vacationId) => {
    if (!confirm('Are you sure you want to delete this vacation?')) return;
    try {
      await fetch(`${API_URL}/users/${selectedUser.id}/vacations/${vacationId}`, {
        method: 'DELETE'
      });
      // Refresh
      const res = await fetch(`${API_URL}/users`);
      const data = await res.json();
      setUsers(data);
      setSelectedUser(data.find(u => u.id === selectedUser.id));
    } catch (error) {
      console.error('Error deleting vacation:', error);
    }
  };

  const handleEditVacation = (vacation) => {
    setVacationForm({
      startDate: vacation.startDate,
      endDate: vacation.endDate,
      holidays: 0 // We don't store holidays, so user has to re-enter if needed, or we could store it. For now resetting.
    });
    setEditingVacationId(vacation.id);
  };

  const calculateRemainingDays = (user) => {
    const used = user.vacations?.reduce((acc, v) => acc + v.daysUsed, 0) || 0;
    return user.totalVacationDays - used;
  };

  const handleConnectCalendar = async () => {
    try {
      const res = await fetch(`${API_URL}/auth/url`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      window.location.href = data.url;
    } catch (error) {
      alert(`Cannot connect to calendar: ${error.message}\n\nPlease check server/.env configuration.`);
    }
  };

  const calculateTenure = (hiringDate) => {
    if (!hiringDate) return '';
    const start = new Date(hiringDate);
    const now = new Date();

    let years = now.getFullYear() - start.getFullYear();
    let months = now.getMonth() - start.getMonth();

    if (months < 0) {
      years--;
      months += 12;
    }

    return `${years.toString().padStart(2, '0')}Y ${months.toString().padStart(2, '0')}M`;
  };

  // Check for code in URL (callback handling)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    if (code) {
      fetch(`${API_URL}/auth/callback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      }).then(() => {
        window.history.replaceState({}, document.title, "/");
        alert('Calendar Connected!');
      });
    }
  }, []);

  const getVacationData = () => {
    const data = {};
    const filteredUsers = selectedTeamFilter === 'All'
      ? users
      : users.filter(u => (u.team || 'Unassigned') === selectedTeamFilter);

    filteredUsers.forEach(user => {
      user.vacations.forEach(vacation => {
        let current = new Date(vacation.startDate + 'T12:00:00');
        const end = new Date(vacation.endDate + 'T12:00:00');
        while (current <= end) {
          const dateStr = current.toISOString().split('T')[0];
          if (!data[dateStr]) data[dateStr] = { count: 0, names: [] };
          data[dateStr].count++;
          data[dateStr].names.push(user.name);
          current.setDate(current.getDate() + 1);
        }
      });
    });
    return data;
  };

  const exportToCSV = () => {
    // Headers
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Name,Email,Team,Birthday,HiringDate,TotalVacationDays\n";

    // Data
    users.forEach(user => {
      const row = [
        `"${user.name}"`,
        `"${user.email}"`,
        `"${user.team || ''}"`,
        `"${user.birthday || ''}"`,
        `"${user.hiringDate || ''}"`,
        `"${user.totalVacationDays}"`
      ].join(",");
      csvContent += row + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "roster_export.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const importFromCSV = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const text = evt.target.result;
      const lines = text.split('\n');
      const newUsers = [];

      // Skip header assuming standard format
      for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;

        // Simple CSV parse handling quotes
        const match = lines[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
        // Fallback for simple split if regex fails or simple CSV
        const cols = lines[i].split(',').map(c => c.replace(/^"|"$/g, '').trim());

        if (cols.length >= 2) {
          newUsers.push({
            name: cols[0],
            email: cols[1],
            team: cols[2] || '',
            birthday: cols[3] || '',
            hiringDate: cols[4] || '',
            totalVacationDays: parseInt(cols[5]) || 20
          });
        }
      }

      if (newUsers.length > 0) {
        try {
          const res = await fetch(`${API_URL}/users/bulk`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newUsers)
          });

          if (res.ok) {
            alert(`Successfully imported ${newUsers.length} users!`);
            fetchUsers();
          } else {
            const err = await res.json();
            alert(`Import failed: ${err.error}`);
          }
        } catch (error) {
          console.error("Import error", error);
          alert("Failed to import users.");
        }
      } else {
        alert("No valid users found in CSV.");
      }
    };
    reader.readAsText(file);
    // Reset input
    e.target.value = '';
  };


  const YearlyView = () => {
    const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
    const vacationData = getVacationData();
    const months = Array.from({ length: 12 }, (_, i) => i);

    const getDaysInMonth = (month) => {
      const date = new Date(currentYear, month, 1);
      const days = [];
      while (date.getMonth() === month) {
        days.push(new Date(date));
        date.setDate(date.getDate() + 1);
      }
      return days;
    };

    const getBirthdays = (date) => {
      const m = date.getMonth() + 1;
      const d = date.getDate();
      const suffix = `-${m.toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
      const filteredUsers = selectedTeamFilter === 'All'
        ? users
        : users.filter(u => (u.team || 'Unassigned') === selectedTeamFilter);
      return filteredUsers.filter(u => u.birthday && u.birthday.endsWith(suffix)).map(u => u.name);
    };

    const getIntensityColor = (count) => {
      if (!count) return 'transparent';
      if (count === 1) return '#89e0d1'; // Teal
      return '#ff5c5c'; // Red/Coral for overlap
    };

    const [hoveredDay, setHoveredDay] = useState(null);

    const getAnniversaries = (date) => {
      const m = date.getMonth() + 1;
      const d = date.getDate();
      const suffix = `-${m.toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
      const filteredUsers = selectedTeamFilter === 'All'
        ? users
        : users.filter(u => (u.team || 'Unassigned') === selectedTeamFilter);
      return filteredUsers.filter(u => u.hiringDate && u.hiringDate.endsWith(suffix)).map(u => u.name);
    };

    return (
      <div style={{ position: 'relative' }}>
        {/* Custom Tooltip */}
        {hoveredDay && (
          <div style={{
            position: 'fixed',
            top: hoveredDay.y,
            left: hoveredDay.x,
            transform: 'translate(-50%, -110%)',
            backgroundColor: 'var(--primary-color)',
            color: 'white',
            padding: '0.8rem',
            borderRadius: '8px',
            boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
            zIndex: 1000,
            minWidth: '150px',
            pointerEvents: 'none',
            border: '1px solid var(--secondary-color)'
          }}>
            <div style={{ fontWeight: 'bold', marginBottom: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.2)', paddingBottom: '0.3rem' }}>
              {hoveredDay.date}
            </div>
            {hoveredDay.vacations.length > 0 && (
              <div style={{ marginBottom: '0.3rem' }}>
                <div style={{ fontSize: '0.75rem', color: '#ccc' }}>Vacation:</div>
                {hoveredDay.vacations.map((name, i) => (
                  <div key={i} style={{ color: 'var(--secondary-color)' }}>• {name}</div>
                ))}
              </div>
            )}
            {hoveredDay.birthdays.length > 0 && (
              <div>
                <div style={{ fontSize: '0.75rem', color: '#ccc' }}>Birthday:</div>
                {hoveredDay.birthdays.map((name, i) => (
                  <div key={i} style={{ color: 'var(--accent-yellow)' }}>🎂 {name}</div>
                ))}
              </div>
            )}
            {hoveredDay.anniversaries && hoveredDay.anniversaries.length > 0 && (
              <div>
                <div style={{ fontSize: '0.75rem', color: '#ccc' }}>Anniversary:</div>
                {hoveredDay.anniversaries.map((name, i) => (
                  <div key={i} style={{ color: 'var(--accent-yellow)' }}>⭐ {name}</div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex justify-between" style={{
          alignItems: 'center',
          marginBottom: '2rem',
          backgroundColor: 'var(--primary-color)',
          color: 'white',
          padding: '1rem 2rem',
          borderRadius: 'var(--border-radius)',
          boxShadow: 'var(--shadow)'
        }}>
          <button className="btn" style={{ backgroundColor: 'rgba(255,255,255,0.2)', color: 'white', border: '1px solid rgba(255,255,255,0.3)' }} onClick={() => setCurrentYear(currentYear - 1)}>← {currentYear - 1}</button>
          <h2 style={{ margin: 0, fontSize: '2.5rem', color: 'var(--accent-yellow)', textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>{currentYear}</h2>
          <button className="btn" style={{ backgroundColor: 'rgba(255,255,255,0.2)', color: 'white', border: '1px solid rgba(255,255,255,0.3)' }} onClick={() => setCurrentYear(currentYear + 1)}>{currentYear + 1} →</button>
        </div>
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
          {months.map(month => {
            const isCurrentMonth = new Date().getMonth() === month && new Date().getFullYear() === currentYear;
            return (
              <div
                key={month}
                className="card"
                style={{
                  padding: '0',
                  border: isCurrentMonth ? '3px solid var(--danger)' : '1px solid var(--primary-color)',
                  boxShadow: isCurrentMonth ? '0 0 15px rgba(255, 92, 92, 0.3)' : 'var(--shadow)',
                  transform: isCurrentMonth ? 'scale(1.02)' : 'none',
                  transition: 'all 0.3s ease',
                  overflow: 'hidden'
                }}
              >
                <div style={{ backgroundColor: 'var(--primary-color)', padding: '1rem 0.5rem' }}>
                  <h3 style={{ textAlign: 'center', margin: '0 0 0.5rem 0', color: 'var(--accent-yellow)' }}>
                    {new Date(currentYear, month).toLocaleString('default', { month: 'long' })}
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', textAlign: 'center', color: 'white', fontSize: '0.7rem', fontWeight: 'bold' }}>
                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <div key={i}>{d}</div>)}
                  </div>
                </div>

                <div style={{ padding: '1rem', display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', fontSize: '0.7rem', textAlign: 'center' }}>

                  {/* Padding for starting day of week */}
                  {Array.from({ length: new Date(currentYear, month, 1).getDay() }).map((_, i) => (
                    <div key={`pad-${i}`} />
                  ))}

                  {getDaysInMonth(month).map(date => {
                    const dateStr = date.toISOString().split('T')[0];
                    const dayData = vacationData[dateStr] || { count: 0, names: [] };
                    const birthdays = getBirthdays(date);
                    const anniversaries = getAnniversaries(date);
                    const hasContent = dayData.count > 0 || birthdays.length > 0 || anniversaries.length > 0;

                    return (
                      <div
                        key={dateStr}
                        onMouseEnter={(e) => {
                          if (hasContent) {
                            const rect = e.target.getBoundingClientRect();
                            setHoveredDay({
                              x: rect.left + rect.width / 2,
                              y: rect.top,
                              date: date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }),
                              vacations: dayData.names,
                              birthdays: birthdays,
                              anniversaries: anniversaries
                            });
                          }
                        }}
                        onMouseLeave={() => setHoveredDay(null)}
                        style={{
                          aspectRatio: '1',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: getIntensityColor(dayData.count),
                          borderRadius: '2px',
                          color: dayData.count > 1 ? 'white' : 'inherit',
                          cursor: hasContent ? 'pointer' : 'default',
                          position: 'relative',
                          fontSize: '0.8rem'
                        }}
                      >
                        {date.getDate()}
                        {birthdays.length > 0 && (
                          <span className="birthday-glow" style={{ position: 'absolute', top: '-5px', right: '-5px', fontSize: '1.2rem', pointerEvents: 'none', zIndex: 1 }}>🎂</span>
                        )}
                        {anniversaries.length > 0 && (
                          <span className="anniversary-glow" style={{ position: 'absolute', top: '-5px', left: '-5px', fontSize: '1rem', pointerEvents: 'none', zIndex: 1 }}>⭐</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const [selectedTeamFilter, setSelectedTeamFilter] = useState('All');
  const uniqueTeams = ['All', ...new Set(users.map(u => u.team || 'Unassigned').filter(t => t))].sort();

  return (
    <div className="container">
      <div style={{ position: 'absolute', top: '1rem', right: '1rem', zIndex: 1000 }}>
        <button
          onClick={toggleTheme}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '1.5rem',
            cursor: 'pointer',
            padding: '0.5rem',
            borderRadius: '50%',
            backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
            boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
            transition: 'all 0.3s ease'
          }}
          title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
        >
          {theme === 'light' ? '🌙' : '💡'}
        </button>
      </div>

      <header className="flex justify-between" style={{ marginBottom: '2rem', alignItems: 'center' }}>
        <div className="flex" style={{ alignItems: 'center' }}>
          <div onClick={() => setView('yearly')} className="app-header-container">
            <div className="header-icon icon-left">🌴</div>
            <div className="title-text-container">
              <div className="title-line-1">
                <span className="word-vacations">Vacations</span>
                <span className="word-amp">&</span>
                <span className="word-birthdays">Birthdays</span>
              </div>
              <div className="title-line-2">Tracker</div>
            </div>
            <div className="header-icon icon-right">🎂</div>
          </div>
        </div>
        <div className="flex" style={{ gap: '1rem', alignItems: 'center' }}>
          {(view === 'dashboard' || view === 'yearly') && (
            <div style={{ position: 'relative' }}>
              <select
                value={selectedTeamFilter}
                onChange={(e) => setSelectedTeamFilter(e.target.value)}
                style={{
                  padding: '0 2rem 0 1rem',
                  height: '40px',
                  borderRadius: 'var(--border-radius)',
                  border: '2px solid var(--primary-color)',
                  backgroundColor: 'white',
                  color: 'var(--primary-color)',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  appearance: 'none',
                  backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%232c3e50' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 0.5rem center',
                  backgroundSize: '1em',
                  minWidth: '150px',
                  boxSizing: 'border-box',
                  marginBottom: 0
                }}
              >
                {uniqueTeams.map(team => (
                  <option key={team} value={team}>{team}</option>
                ))}
              </select>
            </div>
          )}

          {view === 'yearly' ? (
            <>
              <button
                className="btn"
                onClick={handleConnectCalendar}
                style={{
                  backgroundColor: 'var(--primary-color)',
                  color: 'white',
                  border: 'none',
                  whiteSpace: 'nowrap',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  height: '40px',
                  padding: '0 1rem',
                  boxSizing: 'border-box'
                }}
              >
                📅 Connect Calendar
              </button>
              <button
                className="btn"
                onClick={() => setView('dashboard')}
                style={{
                  backgroundColor: 'var(--primary-color)',
                  color: 'white',
                  border: 'none',
                  whiteSpace: 'nowrap',
                  height: '40px',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0 1rem',
                  boxSizing: 'border-box'
                }}
              >
                View Roster
              </button>
            </>
          ) : (
            <>
              <button
                className="btn"
                onClick={handleConnectCalendar}
                style={{
                  backgroundColor: 'var(--primary-color)',
                  color: 'white',
                  border: 'none',
                  whiteSpace: 'nowrap',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  height: '40px',
                  padding: '0 1rem',
                  boxSizing: 'border-box'
                }}
              >
                📅 Connect Calendar
              </button>
              {view !== 'dashboard' && (
                <button
                  className="btn"
                  onClick={() => setView('dashboard')}
                  style={{
                    backgroundColor: 'var(--primary-color)',
                    color: 'white',
                    border: 'none',
                    whiteSpace: 'nowrap',
                    height: '40px',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0 1rem',
                    boxSizing: 'border-box'
                  }}
                >
                  View Roster
                </button>
              )}
              <button
                className="btn"
                onClick={() => {
                  setEditingUserId(null);
                  setFormData({ name: '', email: '', team: '', birthday: '', hiringDate: '', totalVacationDays: 20 });
                  setView('add-user');
                }}
                style={{
                  backgroundColor: 'var(--danger)',
                  color: 'white',
                  border: 'none',
                  whiteSpace: 'nowrap',
                  height: '40px',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0 1rem',
                  boxSizing: 'border-box'
                }}
              >
                + Add Member
              </button>
            </>
          )}

          {view === 'dashboard' && (
            <>
              <button
                className="btn"
                onClick={exportToCSV}
                style={{
                  backgroundColor: 'var(--accent-green)',
                  color: 'white',
                  border: 'none',
                  whiteSpace: 'nowrap',
                  height: '40px',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0 1rem',
                  boxSizing: 'border-box',
                  gap: '0.5rem'
                }}
              >
                ⬇️ Export CSV
              </button>
              <label
                className="btn"
                style={{
                  backgroundColor: 'var(--secondary-color)',
                  color: 'white',
                  border: 'none',
                  whiteSpace: 'nowrap',
                  height: '40px',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0 1rem',
                  boxSizing: 'border-box',
                  gap: '0.5rem',
                  cursor: 'pointer',
                  margin: 0
                }}
              >
                ⬆️ Import CSV
                <input type="file" accept=".csv" onChange={importFromCSV} style={{ display: 'none' }} />
              </label>
            </>
          )}
        </div>
      </header >

      {view === 'yearly' && <YearlyView />
      }

      {
        view === 'dashboard' && (
          <div>
            {Object.entries(users
              .filter(user => selectedTeamFilter === 'All' || (user.team || 'Unassigned') === selectedTeamFilter)
              .reduce((acc, user) => {
                const team = user.team || 'Unassigned';
                if (!acc[team]) acc[team] = [];
                acc[team].push(user);
                return acc;
              }, {})).sort((a, b) => a[0].localeCompare(b[0])).map(([team, teamUsers]) => (
                <div key={team} style={{ marginBottom: '2rem' }}>
                  <h2 style={{
                    backgroundColor: 'var(--primary-color)',
                    color: 'white',
                    padding: '0.5rem 1rem',
                    borderRadius: 'var(--border-radius)',
                    marginBottom: '1rem',
                    fontSize: '1.5rem',
                    boxShadow: 'var(--shadow)'
                  }}>
                    {team}
                  </h2>
                  <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1rem' }}>
                    {teamUsers.map(user => (
                      <div key={user.id} className="card" onClick={() => { setSelectedUser(user); setView('user-details'); }} style={{ cursor: 'pointer', textAlign: 'center', padding: '1rem' }}>
                        <h3 style={{ marginBottom: '0.25rem', color: 'var(--primary-color)', fontSize: '1.1rem' }}>{user.name}</h3>
                        <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>{user.team || 'No Team'}</p>

                        {user.hiringDate && (
                          <div style={{ margin: '0.5rem 0 0', fontSize: '0.8rem', backgroundColor: 'var(--bg-color)', padding: '0.2rem 0.5rem', borderRadius: '4px', display: 'inline-block' }}>
                            Time: <strong>{calculateTenure(user.hiringDate)}</strong>
                          </div>
                        )}

                        <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.25rem', alignItems: 'center' }}>
                          <p style={{ margin: 0, fontSize: '0.9rem' }}>
                            🎂 {user.birthday ? new Date(user.birthday + 'T12:00:00').toLocaleString('default', { month: 'long', day: 'numeric' }) : 'Not set'}
                          </p>
                          <p style={{ margin: 0, fontWeight: 'bold', color: 'var(--danger)', fontSize: '0.9rem' }}>
                            🏖️ {calculateRemainingDays(user)} days left
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        )
      }

      {
        view === 'add-user' && (
          <div className="card" style={{ maxWidth: '600px', margin: '0 auto' }}>
            <h2>{editingUserId ? 'Edit Team Member' : 'Add New Team Member'}</h2>
            <form onSubmit={handleAddUser}>
              <label>Name</label>
              <input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />

              <label>Email</label>
              <input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} required />

              <label>Team</label>
              <input value={formData.team} onChange={e => setFormData({ ...formData, team: e.target.value })} placeholder="e.g. Engineering, Design" />

              <label>Birthday</label>
              <input type="date" value={formData.birthday} onChange={e => setFormData({ ...formData, birthday: e.target.value })} />

              <label>Hiring Date</label>
              <input type="date" value={formData.hiringDate} onChange={e => setFormData({ ...formData, hiringDate: e.target.value })} />

              <label>Total Vacation Days</label>
              <input type="number" value={formData.totalVacationDays} onChange={e => setFormData({ ...formData, totalVacationDays: parseInt(e.target.value) })} />

              <div className="flex" style={{ justifyContent: 'space-between', marginTop: '1rem' }}>
                {editingUserId && (
                  <button type="button" className="btn btn-danger" onClick={handleDeleteUser}>Delete User</button>
                )}
                <div className="flex">
                  <button type="button" className="btn" onClick={() => { setView('dashboard'); setEditingUserId(null); }} style={{ marginRight: '0.5rem' }}>Cancel</button>
                  <button type="submit" className="btn btn-primary">{editingUserId ? 'Update Member' : 'Save Member'}</button>
                </div>
              </div>
            </form>
          </div>
        )
      }

      {
        view === 'user-details' && selectedUser && (
          <div>
            <div className="flex justify-between" style={{ marginBottom: '1rem' }}>
              <button className="btn" onClick={() => setView('dashboard')}>← Back</button>
              <button className="btn" onClick={handleEditUserClick} style={{ backgroundColor: 'var(--primary-color)', color: 'white', border: 'none' }}>Edit Profile</button>
            </div>



            <div className="grid">
              <div className="card">
                <h3>{editingVacationId ? 'Edit Vacation' : 'Book Vacation'}</h3>
                <form onSubmit={handleAddVacation}>
                  <label>Start Date</label>
                  <input
                    name="startDate"
                    type="date"
                    value={vacationForm.startDate}
                    onChange={e => setVacationForm({ ...vacationForm, startDate: e.target.value })}
                    required
                  />

                  <label>End Date</label>
                  <input
                    name="endDate"
                    type="date"
                    value={vacationForm.endDate}
                    onChange={e => setVacationForm({ ...vacationForm, endDate: e.target.value })}
                    required
                  />

                  <label>Holidays (to deduct)</label>
                  <input
                    name="holidays"
                    type="number"
                    min="0"
                    value={vacationForm.holidays}
                    onChange={e => setVacationForm({ ...vacationForm, holidays: e.target.value })}
                  />

                  <div style={{ marginBottom: '1rem', padding: '0.5rem', background: 'var(--bg-color)', border: '1px solid #e0e0e0', borderRadius: '4px' }}>
                    <strong>Days to Deduct: {calculatedDays}</strong>
                    <p style={{ fontSize: '0.8rem', margin: '0.2rem 0 0' }}>(Business days - Holidays)</p>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {editingVacationId && (
                      <button type="button" className="btn" onClick={() => { setEditingVacationId(null); setVacationForm({ startDate: '', endDate: '', holidays: 0 }); }} style={{ flex: 1 }}>Cancel</button>
                    )}
                    <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>{editingVacationId ? 'Update' : 'Book Time Off'}</button>
                  </div>
                </form>
              </div>

              <div className="card">
                <h3>Vacation History</h3>
                {selectedUser.vacations?.length === 0 ? (
                  <p style={{ color: 'var(--text-secondary)' }}>No vacations booked yet.</p>
                ) : (
                  <ul style={{ listStyle: 'none', padding: 0 }}>
                    {selectedUser.vacations?.map(v => (
                      <li key={v.id} style={{ padding: '0.5rem 0', borderBottom: '1px solid #eee' }}>
                        <div className="flex justify-between" style={{ alignItems: 'flex-start' }}>
                          <div>
                            <span>{v.startDate} → {v.endDate}</span>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>-{v.daysUsed} days</div>
                          </div>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button className="btn" style={{ padding: '0.2rem 0.5rem', fontSize: '0.8rem' }} onClick={() => handleEditVacation(v)}>✏️</button>
                            <button className="btn btn-danger" style={{ padding: '0.2rem 0.5rem', fontSize: '0.8rem' }} onClick={() => handleDeleteVacation(v.id)}>🗑️</button>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="card">
                <h3>User Profile</h3>
                <div style={{ marginBottom: '1rem' }}>
                  <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{selectedUser.name}</h2>
                  <p style={{ color: 'var(--text-secondary)', margin: 0 }}>{selectedUser.email}</p>
                  {selectedUser.team && <p style={{ color: 'var(--text-secondary)', margin: '0.25rem 0 0' }}>{selectedUser.team}</p>}
                </div>

                <div style={{ padding: '1rem', background: 'var(--bg-color)', borderRadius: 'var(--border-radius)', textAlign: 'center' }}>
                  <h3 style={{ fontSize: '2rem', color: 'var(--primary-color)', margin: '0 0 0.5rem 0' }}>
                    {calculateRemainingDays(selectedUser)} / {selectedUser.totalVacationDays}
                  </h3>
                  <p style={{ margin: 0, fontWeight: 'bold', color: 'var(--text-secondary)' }}>Days Available</p>
                </div>

                <div style={{ marginTop: '1.5rem' }}>
                  <p><strong>Birthday:</strong> {selectedUser.birthday ? new Date(selectedUser.birthday + 'T12:00:00').toLocaleString('default', { month: 'long', day: 'numeric' }) : 'Not set'}</p>
                  <p><strong>Hiring Date:</strong> {selectedUser.hiringDate ? new Date(selectedUser.hiringDate + 'T12:00:00').toLocaleDateString() : 'Not set'}</p>
                  {selectedUser.hiringDate && (
                    <p><strong>Tenure:</strong> {calculateTenure(selectedUser.hiringDate)}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )
      }
    </div >
  );
}

export default App;
