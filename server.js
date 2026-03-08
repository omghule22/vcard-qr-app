const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Database Setup (SQLite)
const db = new sqlite3.Database('./vcard.db', (err) => {
    if (err) {
        console.error('Error opening database', err.message);
    } else {
        console.log('✅ Connected to SQLite database');
        db.run(`CREATE TABLE IF NOT EXISTS contacts (
            id TEXT PRIMARY KEY,
            name TEXT,
            job_title TEXT,
            company TEXT,
            phone TEXT,
            email TEXT,
            website TEXT,
            address TEXT,
            facebook TEXT,
            qr_color TEXT,
            bg_color TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);
    }
});

// 1. Create a new vCard entry
app.post('/api/vcard', (req, res) => {
    const { name, job_title, company, phone, email, website, address, facebook, qr_color, bg_color } = req.body;
    const id = uuidv4();

    const sql = `INSERT INTO contacts (id, name, job_title, company, phone, email, website, address, facebook, qr_color, bg_color) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    
    db.run(sql, [name, job_title, company, phone, email, website, address, facebook, qr_color, bg_color, id], function(err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ id: id, message: 'Contact saved successfully' });
    });
});

// 2. Get vCard data for editing
app.get('/api/vcard/:id', (req, res) => {
    const sql = `SELECT * FROM contacts WHERE id = ?`;
    db.get(sql, [req.params.id], (err, row) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (!row) {
            return res.status(404).json({ error: 'Contact not found' });
        }
        res.json(row);
    });
});

// 3. Update vCard data (Dynamic Editing)
app.put('/api/vcard/:id', (req, res) => {
    const { name, job_title, company, phone, email, website, address, facebook, qr_color, bg_color } = req.body;
    const sql = `UPDATE contacts SET name=?, job_title=?, company=?, phone=?, email=?, website=?, address=?, facebook=?, qr_color=?, bg_color=? WHERE id=?`;
    
    db.run(sql, [name, job_title, company, phone, email, website, address, facebook, qr_color, bg_color, req.params.id], function(err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ message: 'Contact updated successfully' });
    });
});

// 4. Public View (When QR code is scanned)
app.get('/vcard/:id', (req, res) => {
    const sql = `SELECT * FROM contacts WHERE id = ?`;
    db.get(sql, [req.params.id], (err, row) => {
        if (err || !row) {
            return res.status(404).send('Contact not found');
        }

        const vCard = `BEGIN:VCARD
VERSION:3.0
FN:${row.name}
TITLE:${row.job_title}
ORG:${row.company}
TEL;TYPE=WORK,VOICE:${row.phone}
EMAIL:${row.email}
URL:${row.website}
ADR;TYPE=WORK:;;${row.address}
X-SOCIALPROFILE:${row.facebook}
END:VCARD`;

        res.setHeader('Content-Type', 'text/vcard');
        res.setHeader('Content-Disposition', `attachment; filename="${row.name.replace(/\s+/g, '_')}.vcf"`);
        res.send(vCard);
    });
});

// Vercel Serverless Handler
module.exports = app;

// For local testing
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`🚀 Server running at http://localhost:${PORT}`);
    });
}