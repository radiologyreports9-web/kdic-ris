#!/usr/bin/env node

/**
 * KDIC RIS - Laptop Server
 * Auto-starts when you open your laptop
 * Receives backups from mobile app
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const BACKUP_DIR = path.join(__dirname, 'backups');

// Create backups directory
if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR);
}

const server = http.createServer((req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }
    
    // Ping endpoint
    if (req.url === '/ping' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', message: 'Server is running' }));
        return;
    }
    
    // Sync endpoint - receive data from mobile
    if (req.url === '/sync' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                const timestamp = new Date().toISOString().replace(/:/g, '-');
                const filename = `backup-${timestamp}.json`;
                const filepath = path.join(BACKUP_DIR, filename);
                
                fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
                console.log(`✅ Backup saved: ${filename}`);
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, filename }));
            } catch (err) {
                console.error('Error saving backup:', err);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Failed to save backup' }));
            }
        });
        return;
    }
    
    // Serve the web app
    if (req.url === '/' || req.url === '/index.html') {
        fs.readFile(path.join(__dirname, 'index.html'), (err, data) => {
            if (err) {
                res.writeHead(500);
                res.end('Error loading app');
                return;
            }
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(data);
        });
        return;
    }
    
    // Serve static files
    const filePath = path.join(__dirname, req.url);
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        const ext = path.extname(filePath);
        const contentTypes = {
            '.html': 'text/html',
            '.js': 'application/javascript',
            '.json': 'application/json',
            '.png': 'image/png',
            '.svg': 'image/svg+xml'
        };
        fs.readFile(filePath, (err, data) => {
            if (err) {
                res.writeHead(404);
                res.end('Not found');
                return;
            }
            res.writeHead(200, { 'Content-Type': contentTypes[ext] || 'text/plain' });
            res.end(data);
        });
        return;
    }
    
    res.writeHead(404);
    res.end('Not found');
});

server.listen(PORT, () => {
    console.log('\n╔══════════════════════════════════════════════════════╗');
    console.log('║  🏥 KDIC RIS Server - Running on Your Laptop       ║');
    console.log('╠══════════════════════════════════════════════════════╣');
    console.log(`║  Local:   http://localhost:${PORT}                    ║`);
    console.log(`║  Network: http://YOUR-IP:${PORT}                      ║`);
    console.log('║                                                      ║');
    console.log('║  📱 On Mobile App:                                   ║');
    console.log('║  1. Go to Backup tab                                 ║');
    console.log('║  2. Enter server address                             ║');
    console.log('║  3. Click "Test Connection"                          ║');
    console.log('║  4. Click "Sync to Laptop Server"                    ║');
    console.log('║                                                      ║');
    console.log('║  💾 Backups saved to: ./backups/                     ║');
    console.log('║                                                      ║');
    console.log('║  Press Ctrl+C to stop                                ║');
    console.log('╚══════════════════════════════════════════════════════╝\n');
});

// Get network IP
const os = require('os');
const networkInterfaces = os.networkInterfaces();
Object.keys(networkInterfaces).forEach(interfaceName => {
    networkInterfaces[interfaceName].forEach(iface => {
        if (iface.family === 'IPv4' && !iface.internal) {
            console.log(`   📡 Network IP: http://${iface.address}:${PORT}`);
        }
    });
});
console.log('');
