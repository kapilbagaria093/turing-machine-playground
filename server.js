const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const FILE = path.join(__dirname, 'tm-simulator.html');

const server = http.createServer((req, res) => {
  // serve the simulator at root
  if (req.url === '/' || req.url === '/index.html') {
    fs.readFile(FILE, (err, data) => {
      if (err) {
        res.writeHead(500);
        res.end('Error loading tm-simulator.html');
        return;
      }
      res.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-cache',
      });
      res.end(data);
    });
    return;
  }
  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, () => {
  console.log(`\n  TM Playground running at:\n`);
  console.log(`  ➜  http://localhost:${PORT}`);
  console.log(`\n  Press Ctrl+C to stop.\n`);
});
