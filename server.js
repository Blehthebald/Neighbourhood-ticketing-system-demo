require('dotenv').config();
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname))); 

// Configure Cloudinary securely using environment variables from .env
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'nts_tickets',
        allowed_formats: ['jpg', 'png', 'jpeg', 'webp', 'mp4', 'mov'],
        resource_type: 'auto'
    }
});

const upload = multer({ storage: storage });

// Initialize SQLite Database File
const db = new sqlite3.Database('./nts-database.db', (err) => {
    if (err) console.error("Database connection error:", err.message);
    else console.log('Connected to local SQLite database.');
});

// Create Tickets Table
db.run(`CREATE TABLE IF NOT EXISTS tickets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    incident_name TEXT,
    description TEXT,
    tag TEXT,
    media_url TEXT,
    latitude REAL,
    longitude REAL,
    email TEXT,
    status TEXT DEFAULT 'Unresolved',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`);

// Fetch All Tickets API
app.get('/api/tickets', (req, res) => {
    db.all("SELECT * FROM tickets ORDER BY created_at DESC", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// File a New Ticket API
app.post('/api/tickets', upload.single('media'), (req, res) => {
    const { 'incident-name': incident_name, description, tags, latitude, longitude, email } = req.body;
    const media_url = req.file ? req.file.path : null;

    const sql = `INSERT INTO tickets (incident_name, description, tag, media_url, latitude, longitude, email) VALUES (?, ?, ?, ?, ?, ?, ?)`;
    const params = [incident_name, description, tags, media_url, latitude, longitude, email];
    
    db.run(sql, params, function(err) {
        if (err) return res.status(400).json({ error: err.message });
        res.json({ message: 'Ticket filed successfully', ticket_id: this.lastID });
    });
});


const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});	