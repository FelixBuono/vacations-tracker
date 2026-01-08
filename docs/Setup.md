# Setup Guide 🛠️

Follow these instructions to get the **Vacations & Birthdays Tracker** running on your local machine.

## Prerequisites
- **Node.js**: Ensure you have Node.js installed (v14+ recommended).
- **Git**: To clone the repository.

## Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/FelixBuono/vacations-tracker.git
   cd vacations-tracker
   ```

2. **Install Server Dependencies**
   ```bash
   cd server
   npm install
   ```

3. **Install Client Dependencies**
   Open a new terminal:
   ```bash
   cd client
   npm install
   ```

## Running the Application

You need to run both the backend server and the frontend client simultaneously.

**1. Start the Server** (Port 3001)
Inside `server/`:
```bash
npm start
```

**2. Start the Client** (Port 5173)
Inside `client/`:
```bash
npm run dev
```

Open your browser and navigate to `http://localhost:5173`.

## Configuration
- **.env**: The server uses a `.env` file (if applicable) for Google Calendar API keys. Ensure this is configured if you plan to use calendar integrations.
