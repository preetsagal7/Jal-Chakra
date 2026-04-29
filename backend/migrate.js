const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./data.db');

db.serialize(() => {
    // Add timestamp to incidents if it doesn't exist
    db.run("ALTER TABLE incidents ADD COLUMN timestamp DATETIME", (err) => {
        if (err) console.log("Incidents timestamp might already exist.");
        else console.log("Added timestamp to incidents.");
    });
    
    // Add timestamp to usage_reports if it doesn't exist (though it should be there)
    db.run("ALTER TABLE usage_reports ADD COLUMN timestamp DATETIME", (err) => {
        if (err) console.log("Usage reports timestamp might already exist.");
        else console.log("Added timestamp to usage_reports.");
    });

    // Add status/flagged columns to usage_reports if they were missed during the messy replace
    db.run("ALTER TABLE usage_reports ADD COLUMN status TEXT DEFAULT 'pending'", (err) => {
        if (err) console.log("Status column might already exist.");
    });
});

db.close();
