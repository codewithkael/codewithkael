const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');

const app = express();
app.use(cors());
app.get('/', (_req, res) => res.send('Neon District Driver — Socket.io server running ✅'));

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*', methods: ['GET','POST'] } });

// In-memory player store
const players = new Map();
// { socketId -> { id, username, xp, x, y, angle, inCar, carKind } }

function leaderboardPayload() {
  return Array.from(players.values())
    .sort((a, b) => b.xp - a.xp)
    .slice(0, 20)
    .map(p => ({ username: p.username, xp: p.xp }));
}

function allPlayersPayload() {
  return Array.from(players.values()).map(p => ({
    id: p.id, username: p.username, xp: p.xp,
    x: p.x, y: p.y, angle: p.angle,
    inCar: p.inCar, carKind: p.carKind
  }));
}

io.on('connection', socket => {
  console.log('[+] connected', socket.id);

  // --- JOIN ---
  socket.on('join', payload => {
    const username = String((payload && payload.username) || 'Driver').slice(0, 24).trim() || 'Driver';
    players.set(socket.id, {
      id: socket.id, username,
      xp: 0, x: 900, y: 1500, angle: 0,
      inCar: false, carKind: null
    });
    socket.emit('joined', { id: socket.id, username });
    io.emit('leaderboard', leaderboardPayload());
    io.emit('playerList', allPlayersPayload());
    console.log('[join]', username);
  });

  // --- POSITION UPDATE (sent ~20 times/sec by each client) ---
  socket.on('pos', payload => {
    const p = players.get(socket.id);
    if (!p || !payload) return;
    p.x       = Number(payload.x)     || p.x;
    p.y       = Number(payload.y)     || p.y;
    p.angle   = Number(payload.angle) || p.angle;
    p.inCar   = !!payload.inCar;
    p.carKind = payload.carKind || null;
    // broadcast to everyone else (not back to sender)
    socket.broadcast.emit('playerMoved', {
      id: p.id, username: p.username,
      x: p.x, y: p.y, angle: p.angle,
      inCar: p.inCar, carKind: p.carKind
    });
  });

  // --- XP EVENT ---
  socket.on('xpEarned', payload => {
    const p = players.get(socket.id);
    if (!p || !payload) return;
    const delta = Math.max(0, Math.min(1000, Number(payload.delta) || 0));
    if (!delta) return;
    p.xp += delta;
    io.emit('leaderboard', leaderboardPayload());
  });

  // --- DISCONNECT ---
  socket.on('disconnect', () => {
    const p = players.get(socket.id);
    console.log('[-] disconnected', p ? p.username : socket.id);
    players.delete(socket.id);
    io.emit('playerLeft', { id: socket.id });
    io.emit('leaderboard', leaderboardPayload());
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log('Listening on port', PORT));
