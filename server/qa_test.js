import fetch from 'node-fetch';

const API_URL = 'http://localhost:3001/api';

async function runTests() {
    console.log('Starting API QA Tests...');
    let passed = 0;
    let failed = 0;

    const assert = (condition, message) => {
        if (condition) {
            console.log(`✅ PASS: ${message}`);
            passed++;
        } else {
            console.error(`❌ FAIL: ${message}`);
            failed++;
        }
    };

    try {
        // 1. Create User
        console.log('\n--- Testing User Management ---');
        const userRes = await fetch(`${API_URL}/users`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: 'QA Test User',
                email: 'qa@test.com',
                team: 'QA Team',
                birthday: '1990-01-01',
                totalVacationDays: 20
            })
        });
        const user = await userRes.json();
        assert(userRes.status === 201, 'Create User status is 201');
        assert(user.name === 'QA Test User', 'Created user name matches');
        assert(user.id, 'Created user has ID');

        // 2. Get Users
        const listRes = await fetch(`${API_URL}/users`);
        const users = await listRes.json();
        assert(users.some(u => u.id === user.id), 'New user appears in list');

        // 3. Update User
        const updateRes = await fetch(`${API_URL}/users/${user.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...user, name: 'QA User Updated' })
        });
        const updatedUser = await updateRes.json();
        assert(updatedUser.name === 'QA User Updated', 'User name updated');

        // 4. Add Vacation
        console.log('\n--- Testing Vacation Management ---');
        const vacRes = await fetch(`${API_URL}/users/${user.id}/vacations`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                startDate: '2025-06-01',
                endDate: '2025-06-05',
                daysUsed: 5
            })
        });
        const vacUser = await vacRes.json();
        assert(vacRes.status === 201, 'Add Vacation status is 201');
        assert(vacUser.vacations.length > 0, 'Vacation added to user');
        const vacationId = vacUser.vacations[0].id;

        // 5. Delete Vacation
        const delVacRes = await fetch(`${API_URL}/users/${user.id}/vacations/${vacationId}`, {
            method: 'DELETE'
        });
        const delVacUser = await delVacRes.json();
        assert(delVacUser.vacations.length === 0, 'Vacation deleted');

        // 6. Delete User (Cleanup - though API doesn't have delete user, we'll skip or implement if needed. 
        // The current API doesn't seem to have DELETE /users/:id based on index.js view earlier. 
        // We will just leave it or manually clean up if we had a delete endpoint.)

        console.log('\n--- Summary ---');
        console.log(`Total: ${passed + failed}, Passed: ${passed}, Failed: ${failed}`);

    } catch (error) {
        console.error('Test execution failed:', error);
    }
}

runTests();
