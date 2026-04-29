const http = require('http');

async function testIncident() {
    try {
        // Login as admin
        const loginRes = await fetch('http://localhost:5000/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'Preetsagal7', password: 'Sagal@123' })
        });
        const loginText = await loginRes.text();
        console.log("Login Status:", loginRes.status);
        if (!loginRes.ok) {
            console.log("Login Error:", loginText);
            return;
        }
        
        const loginData = JSON.parse(loginText);
        if (!loginData.token) return;

        // Post Incident
        const incidentRes = await fetch('http://localhost:5000/api/incidents', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${loginData.token}`
            },
            body: JSON.stringify({ subject: 'Test', description: 'Test desc' })
        });
        const incidentText = await incidentRes.text();
        console.log("Incident Status:", incidentRes.status);
        console.log("Incident Response:", incidentText);

    } catch (e) {
        console.error("Test Script Error:", e);
    }
}

testIncident();
