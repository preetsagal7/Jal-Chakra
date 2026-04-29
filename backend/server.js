require('dotenv').config();
const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const path = require('path');
const jwt = require('jsonwebtoken');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Import Firebase (Optional Integration)
const firestoreDb = require('./firebaseConfig');

const app = express();
app.use(helmet());
app.use(cors());
app.use(bodyParser.json());

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // Increased limit for smoother testing/usage
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many requests',
      message: 'Too many requests from this IP, please try again after 15 minutes'
    });
  }
});
app.use('/api/', limiter);

const JWT_SECRET = process.env.JWT_SECRET || 'jal-chakra-default-secret';

// Initialize SQLite database
const dbPath = process.env.DATABASE_URL || path.join(__dirname, 'data.db');
let db;

function initializeDB(retries = 5) {
  db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('Error opening database', err.message);
      if (retries > 0) {
        console.log(`Retrying connection in 5 seconds... (${retries} retries left)`);
        setTimeout(() => initializeDB(retries - 1), 5000);
      } else {
        process.exit(1);
      }
      return;
    }
    
    console.log('Connected to SQLite database.');
    
    db.serialize(() => {
      // Extended Users table
      db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        role TEXT, -- NORMAL_USER, MENTOR, COMMUNITY_CENTER, PENDING_MENTOR
        password TEXT,
        community_id INTEGER DEFAULT 1,
        full_name TEXT,
        age INTEGER,
        gender TEXT,
        family_members INTEGER,
        area TEXT,
        house_id TEXT,
        resource_type TEXT, -- Water, Electricity, Both
        trust_score INTEGER DEFAULT 100,
        profile_completed BOOLEAN DEFAULT 0
      )`);
      
      // New usage reports table
      db.run(`CREATE TABLE IF NOT EXISTS usage_reports (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        usage_level TEXT, -- LOW, MEDIUM, HIGH
        score INTEGER,
        status TEXT DEFAULT 'pending', -- pending, verified, flagged
        flagged BOOLEAN DEFAULT 0,
        flag_reason TEXT,
        input_method TEXT DEFAULT 'button', -- button, voice
        raw_voice_text TEXT,
        parsed_quantity TEXT,
        timestamp DATETIME,
        FOREIGN KEY(user_id) REFERENCES users(id)
      )`);

      // New Flags/Reviews table
      db.run(`CREATE TABLE IF NOT EXISTS flags (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        report_id INTEGER,
        mentor_id INTEGER,
        reason TEXT,
        status TEXT, -- pending, resolved
        timestamp DATETIME
      )`);

      // New Incidents table (Direct user reports to mentors)
      db.run(`CREATE TABLE IF NOT EXISTS incidents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        subject TEXT,
        description TEXT,
        status TEXT DEFAULT 'open', -- open, resolved
        timestamp DATETIME,
        FOREIGN KEY(user_id) REFERENCES users(id)
      )`);

      // New IVR Logs table
      db.run(`CREATE TABLE IF NOT EXISTS ivr_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        water_status TEXT,
        leakage_level TEXT,
        usage_level TEXT,
        family_size INTEGER,
        status TEXT DEFAULT 'pending',
        timestamp DATETIME,
        FOREIGN KEY(user_id) REFERENCES users(id)
      )`);

      // Ensure status column exists (for backward compatibility)
      db.run("ALTER TABLE ivr_logs ADD COLUMN status TEXT DEFAULT 'pending'", (err) => {});

      db.get("SELECT * FROM users WHERE username = 'Preetsagal7'", (err, row) => {
        if (!row) {
          db.run("INSERT INTO users (username, role, password) VALUES (?, ?, ?)", ["Preetsagal7", "COMMUNITY_CENTER", "Sagal@123"]);
        }
      });
    });
  });
}

initializeDB();

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.sendStatus(401);
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

const requireRole = (roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) return res.status(403).json({ error: "Access denied." });
  next();
};

// Voice Parsing Utility Logic
const parseVoiceCommand = (text) => {
  const lowerText = text.toLowerCase();
  let category = 'MEDIUM';
  
  const numMatch = lowerText.match(/\d+/);
  const qtyValue = numMatch ? parseInt(numMatch[0], 10) : null;

  if (qtyValue !== null) {
    if (qtyValue < 50) category = 'LOW';
    else if (qtyValue <= 100) category = 'MEDIUM';
    else category = 'HIGH';
  } else {
    const lowKeywords = ['low', 'no waste', 'green', 'minimal', 'कम', 'ಕಡಿಮೆ', 'తక్కువ', 'ਘੱਟ'];
    const highKeywords = ['high', 'leak', 'waste', 'much', 'leakage', 'ज्यादा', 'ಹೆಚ್ಚು', 'ಸೋರಿಕೆ', 'ఎక్కువ', 'లీక్', 'ਵੱਧ', 'ਲੀਕ'];
    
    if (lowKeywords.some(kw => lowerText.includes(kw))) category = 'LOW';
    else if (highKeywords.some(kw => lowerText.includes(kw))) category = 'HIGH';
  }
  
  return { category, quantity: numMatch ? numMatch[0] : null };
};

// --- AUTH & PROFILE APIs ---

app.post('/api/signup', (req, res) => {
  const { username, password, role } = req.body;
  const finalRole = role === 'MENTOR' ? 'PENDING_MENTOR' : 'NORMAL_USER';
  db.run("INSERT INTO users (username, role, password) VALUES (?, ?, ?)", [username, finalRole, password], function(err) {
    if (err) return res.status(400).json({ error: err.message });
    res.json({ message: "User created", id: this.lastID });
  });
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  db.get("SELECT * FROM users WHERE username = ? AND password = ?", [username, password], (err, user) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!user) return res.status(401).json({ error: "Invalid credentials" });
    if (user.role === 'PENDING_MENTOR') return res.status(403).json({ error: "Mentor account pending approval" });
    const token = jwt.sign(user, JWT_SECRET, { expiresIn: '24h' });
    res.json({ user, token });
  });
});

app.get('/api/user/profile', authenticateToken, (req, res) => {
  db.get("SELECT * FROM users WHERE id = ?", [req.user.id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(row);
  });
});

app.post('/api/user/profile', authenticateToken, (req, res) => {
  const { full_name, age, gender, family_members, area, house_id, resource_type } = req.body;
  db.run(`UPDATE users SET 
    full_name = ?, age = ?, gender = ?, family_members = ?, area = ?, house_id = ?, resource_type = ?, profile_completed = 1 
    WHERE id = ?`, 
    [full_name, age, gender, family_members, area, house_id, resource_type, req.user.id], 
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: "Profile updated successfully" });
    }
  );
});

// --- DATA & VALIDATION APIs ---

app.post('/api/data', authenticateToken, (req, res) => {
  const { usage_level, input_method, raw_voice_text } = req.body;
  const userId = req.user.id;
  
  let finalLevel = usage_level;
  let parsedQty = null;

  if (input_method === 'voice' && raw_voice_text) {
    const parsed = parseVoiceCommand(raw_voice_text);
    finalLevel = parsed.category;
    parsedQty = parsed.quantity;
  }

  db.get("SELECT family_members, trust_score FROM users WHERE id = ?", [userId], (err, user) => {
    let score = finalLevel === 'LOW' ? 2 : finalLevel === 'MEDIUM' ? 1 : -2;
    let flagged = false;
    let flagReason = null;

    // Smart Validation Logic
    if (user.family_members > 5 && finalLevel === 'LOW') {
      flagged = true;
      flagReason = "Unrealistic: Large family reporting extremely low usage.";
    }
    if (finalLevel === 'HIGH' && input_method === 'voice' && raw_voice_text.includes('leak')) {
      flagReason = "Leakage reported via voice.";
    }

    const timestamp = new Date().toISOString();
    db.run(`INSERT INTO usage_reports 
      (user_id, usage_level, score, input_method, raw_voice_text, parsed_quantity, flagged, flag_reason, status, timestamp) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, finalLevel, score, input_method || 'button', raw_voice_text, parsedQty, flagged ? 1 : 0, flagReason, flagged ? 'under_review' : 'pending', timestamp],
      function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Data logged", id: this.lastID, flagged, flagReason });
      }
    );
  });
});

// --- MENTOR & ADMIN APIs ---

app.get('/api/mentor/users', authenticateToken, requireRole(['MENTOR', 'COMMUNITY_CENTER']), (req, res) => {
  db.all(`SELECT id, username, full_name, area, family_members, trust_score, role FROM users WHERE role != 'COMMUNITY_CENTER'`, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.get('/api/verify', authenticateToken, requireRole(['MENTOR', 'COMMUNITY_CENTER']), (req, res) => {
  db.all(`SELECT r.*, u.username, u.full_name, u.family_members, u.area 
    FROM usage_reports r 
    JOIN users u ON r.user_id = u.id 
    WHERE r.status IN ('pending', 'under_review') 
    ORDER BY r.timestamp DESC`, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/verify/:id', authenticateToken, requireRole(['MENTOR', 'COMMUNITY_CENTER']), (req, res) => {
  const { action, corrected_level, remarks } = req.body; // verified, flagged
  const status = action === 'verified' ? 'verified' : 'flagged';
  
  db.run("UPDATE usage_reports SET status = ?, usage_level = COALESCE(?, usage_level), flag_reason = COALESCE(?, flag_reason) WHERE id = ?", 
    [status, corrected_level, remarks, req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: `Record ${status}` });
  });
});

app.get('/api/admin/users', authenticateToken, requireRole(['COMMUNITY_CENTER']), (req, res) => {
  const query = `
    SELECT u.*,
    COALESCE((
      SELECT SUM(
        CASE 
          WHEN usage_level = 'HIGH' THEN 150 
          WHEN usage_level = 'MEDIUM' THEN 75 
          ELSE 30 
        END
      ) 
      FROM usage_reports 
      WHERE user_id = u.id AND timestamp >= datetime('now', '-7 days')
    ), 0) as weekly_waste
    FROM users u WHERE role != 'COMMUNITY_CENTER'
  `;
  db.all(query, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/admin/change-role', authenticateToken, requireRole(['COMMUNITY_CENTER']), (req, res) => {
  const { user_id, new_role } = req.body;
  db.run("UPDATE users SET role = ? WHERE id = ?", [new_role, user_id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Role updated" });
  });
});

app.delete('/api/admin/users/:id', authenticateToken, requireRole(['COMMUNITY_CENTER']), (req, res) => {
  const userId = req.params.id;
  db.run("DELETE FROM users WHERE id = ?", [userId], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "User deleted successfully" });
  });
});

app.get('/api/dashboard', authenticateToken, requireRole(['COMMUNITY_CENTER']), (req, res) => {
  db.all("SELECT SUM(score) as totalScore FROM usage_reports WHERE status != 'flagged'", (err, row) => {
    const totalScore = row ? row[0].totalScore || 0 : 0;
    db.all(`SELECT r.*, u.username, u.area FROM usage_reports r JOIN users u ON r.user_id = u.id ORDER BY r.timestamp DESC LIMIT 20`, (err, reports) => {
      res.json({ totalScore, recentReports: reports });
    });
  });
});

// --- INCIDENT APIs ---

app.post('/api/ivr', authenticateToken, (req, res) => {
  const { waterStatus, leakageLevel, usageLevel, familySize } = req.body;
  const timestamp = new Date().toISOString();
  db.run(`INSERT INTO ivr_logs (user_id, water_status, leakage_level, usage_level, family_size, status, timestamp) VALUES (?, ?, ?, ?, ?, 'pending', ?)`,
    [req.user.id, waterStatus, leakageLevel, usageLevel, familySize, timestamp], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: "IVR Log saved", id: this.lastID });
  });
});

app.get('/api/ivr', authenticateToken, requireRole(['MENTOR', 'COMMUNITY_CENTER']), (req, res) => {
  db.all(`SELECT i.*, u.username, u.full_name, u.area 
    FROM ivr_logs i 
    JOIN users u ON i.user_id = u.id 
    WHERE i.status = 'pending'
    ORDER BY i.timestamp DESC`, (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

app.post('/api/ivr/verify/:id', authenticateToken, requireRole(['MENTOR', 'COMMUNITY_CENTER']), (req, res) => {
  const { action } = req.body; // verified, rejected
  db.run("UPDATE ivr_logs SET status = ? WHERE id = ?", [action, req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: `IVR log ${action}` });
  });
});

app.post('/api/incidents', authenticateToken, (req, res) => {
  const { subject, description } = req.body;
  const timestamp = new Date().toISOString();
  db.run("INSERT INTO incidents (user_id, subject, description, timestamp) VALUES (?, ?, ?, ?)", 
    [req.user.id, subject, description, timestamp], async function(err) {
      if (err) {
        console.error("INCIDENT ERROR:", err);
        return res.status(500).json({ error: err.message });
      }
      
      const localId = this.lastID;
      
      // FIREBASE SYNC: If Firebase is connected, store a cloud copy
      if (firestoreDb) {
        try {
          await firestoreDb.collection('incidents').doc(localId.toString()).set({
            user_id: req.user.id,
            username: req.user.username,
            subject,
            description,
            timestamp,
            status: 'open'
          });
          console.log(`Incident #${localId} synced to Firebase.`);
        } catch (fbError) {
          console.error("Failed to sync incident to Firebase:", fbError);
        }
      }

      res.json({ message: "Report sent to mentor", id: localId });
    }
  );
});

app.get('/api/incidents', authenticateToken, requireRole(['MENTOR', 'COMMUNITY_CENTER']), (req, res) => {
  db.all(`SELECT i.*, u.username, u.full_name, u.area, u.house_id 
    FROM incidents i 
    JOIN users u ON i.user_id = u.id 
    ORDER BY i.timestamp DESC`, (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

app.post('/api/incidents/resolve/:id', authenticateToken, requireRole(['MENTOR', 'COMMUNITY_CENTER']), (req, res) => {
  db.run("UPDATE incidents SET status = 'resolved' WHERE id = ?", [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Incident resolved" });
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'production' ? 'Something went wrong!' : err.message
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`));
