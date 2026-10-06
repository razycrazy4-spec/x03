// gen-certs.js
const fs = require('fs');
const path = require('path');
const { generateKeyPairSync } = require('crypto');

const certDir = path.join(__dirname, 'certs');
if (!fs.existsSync(certDir)) {
    fs.mkdirSync(certDir);
}

console.log('Generating keys...');
const { publicKey, privateKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});

// Create a simple self-signed certificate
const startDate = new Date();
const endDate = new Date();
endDate.setFullYear(startDate.getFullYear() + 1);

const cert = `-----BEGIN CERTIFICATE-----
MIIBqTCCAS+gAwIBAgIUYz9vZ7lGpRbJxJfXkYvJvVvJvVw=
... (Simplified for brevity - we'll use a real generator below) ...
-----END CERTIFICATE-----`;

// Better approach: Use a library or a more robust script. 
// For simplicity, let's just use the 'selfsigned' package if available, 
// or write a minimal valid cert structure.

// Actually, let's just install 'selfsigned' to do it right.