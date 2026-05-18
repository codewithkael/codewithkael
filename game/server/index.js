'use strict';
const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const PORT = process.env.PORT || 3000;

const app = express();
app.use(cors());
app.get('/', (_, res) => res.json({ status: 'Neon District Driver server online' }));
app.get('/leaderboard', (_, res) => res.json(getLeaderboard()));

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
  transports: ['websocket', 'polling']
});

// players map: socketId -> { id, username, xp, x, y, dir, inCar, carKind, lastSeen }
const players = new Map();

function getLeaderboard() {
  return [...players.values()]
    .sort((a, b) => b.xp - a.xp)
    .slice(0, 20)
    .map(({ id, username, xp }) => ({ id, username, xp }));
}

function broadcastLeaderboard() {
  io.emit('leaderboard', getLeaderboard());
}

function getPlayerStates(excludeId) {
  const out = [];
  for (const [id, p] of players) {
    if (id === excludeId) continue;
    out.push({ id: p.id, username: p.username, x: p.x, y: p.y, dir: p.dir, inCar: p.inCar, carKind: p.carKind });
  }
  return out;
}

io.on('connection', (socket) => {
  console.log('[+] connected:', socket.id);

  socket.on('join', ({ username }) => {
    const name = String(username || 'Driver').slice(0, 24) || 'Driver';
    players.set(socket.id, { id: socket.id, username: name, xp: 0, x: 900, y: 1500, dir: 0, inCar: false, carKind: '', lastSeen: Date.now() });
    console.log(`[join] ${name} (${socket.id})`);
    socket.emit('joined', { id: socket.id, username: name });
    broadcastLeaderboard();
  });

  // Client sends position every ~100ms
  socket.on('pos', ({ x, y, dir, inCar, carKind }) => {
    const p = players.get(socket.id);
    if (!p) return;
    p.x = x; p.y = y; p.dir = dir; p.inCar = !!inCar; p.carKind = carKind || '';
    p.lastSeen = Date.now();
    // Broadcast this player's state to everyone else
    socket.broadcast.emit('playerMoved', { id: socket.id, x, y, dir, inCar: p.inCar, carKind: p.carKind, username: p.username });
  });

  socket.on('xpEarned', ({ delta }) => {
    const p = players.get(socket.id);
    if (!p) return;
    const amount = Math.max(0, Math.min(Number(delta) || 0, 500));
    p.xp += amount;
    p.lastSeen = Date.now();
    broadcastLeaderboard();
  });

  socket.on('disconnect', () => {
    const p = players.get(socket.id);
    console.log(`[-] disconnected: ${p ? p.username : socket.id}`);
    players.delete(socket.id);
    io.emit('playerLeft', { id: socket.id });
    broadcastLeaderboard();
  });
});

// Prune stale players every 5 minutes (idle > 30 min)
setInterval(() => {
  const cutoff = Date.now() - 30 * 60 * 1000;
  for (const [id, p] of players) {
    if (p.lastSeen < cutoff) players.delete(id);
  }
}, 5 * 60 * 1000);

httpServer.listen(PORT, () => {
  console.log(`Neon District Driver server listening on port ${PORT}`);
});
