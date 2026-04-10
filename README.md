# TM Playground — Turing Machine Simulator

A multi-tape, multi-head Turing Machine visualizer with:
- Interactive state diagram editor
- Live step-by-step execution
- Side-by-side O(n²) vs O(n) comparison
- Save/load machines to localStorage + JSON export

## Run locally

```bash
node server.js
# → http://localhost:3000
```

Custom port:
```bash
PORT=8080 node server.js
```

## Deploy to a host

### Render / Railway / Fly.io
Push this folder to GitHub, connect the repo, set **Start command** to `node server.js`.

### Vercel / Netlify (static)
Just drag `tm-simulator.html` into their dashboard — no server needed for static hosting.

### VPS (Ubuntu/Debian)
```bash
# install node if needed
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash -
sudo apt install -y nodejs

# copy files and run
node server.js &

# or keep alive with pm2
npm install -g pm2
pm2 start server.js --name tm-playground
pm2 save
pm2 startup
```

### Docker
```bash
docker build -t tm-playground .
docker run -p 3000:3000 tm-playground
# → http://localhost:3000
```
