const http = require('http');

async function testIncident() {
    try {
        // 1. Register a test user
        const regRes = await fetch('http://localhost:5000/api/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'test_incident_user3', password: 'password', role: 'NORMAL_USER' })
        });
        const regData = await regRes.json();
        console.log("Register:", regData);

        // 2. Login
        const loginRes = await fetch('http://localhost:5000/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'test_incident_user3', password: 'password' })
        });
        const loginData = await loginRes.json();
        console.log("Login:", loginData);
        
        if (!loginData.token) return;

        // 3. Post Incident
        const incidentRes = await fetch('http://localhost:5000/api/incidents', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${loginData.token}`
            },
            body: JSON.stringify({ subject: 'Test', description: 'Test desc' })
        });
        const incidentData = await incidentRes.json();
        console.log("Incident Response:", incidentRes.status, incidentData);

    } catch (e) {
        console.error("Test Script Error:", e);
    }
}

testIncident();
