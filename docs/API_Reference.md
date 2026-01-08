# API Reference 📡

The backend is built with Express.js and provides the following RESTful endpoints.

## Base URL
\`http://localhost:3001/api\`

## Users

### Get All Users
- **GET** \`/users\`
- **Returns**: Array of user objects.

### Create User
- **POST** \`/users\`
- **Body**:
  ```json
  {
    "name": "Jane Doe",
    "email": "jane@example.com",
    "team": "Engineering",
    "birthday": "1990-05-20",
    "hiringDate": "2021-01-15",
    "totalVacationDays": 20
  }
  ```

### Bulk Import Users
- **POST** \`/users/bulk\`
- **Body**: Array of user objects (same structure as Create User).
- **Description**: Validates and inserts multiple users at once.

### Update User
- **PUT** \`/users/:id\`
- **Body**: JSON object with fields to update.

### Delete User
- **DELETE** \`/users/:id\`

## Vacations

### Add Vacation
- **POST** \`/users/:userId/vacations\`
- **Body**:
  ```json
  {
    "startDate": "2026-10-10",
    "endDate": "2026-10-15",
    "daysUsed": 5
  }
  ```

### Delete Vacation
- **DELETE** \`/users/:userId/vacations/:vacationId\`
