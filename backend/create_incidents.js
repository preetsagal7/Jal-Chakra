const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./data.db');
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS incidents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        subject TEXT,
        description TEXT,
        status TEXT DEFAULT 'open',
        timestamp DATETIME,
        FOREIGN KEY(user_id) REFERENCES users(id)
    )`);
});
db.close();
