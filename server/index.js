const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');

const app = express();
app.use(cors());
app.get('/', (_req, res) => res.send('Neon District Driver – Server OK'));

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*', methods: ['GET', 'POST'] } });

// players: socketId -> { id, username, xp, x, y, angle, inCar, carKind }
const players = new Map();

function leaderboard() {
  return [...players.values()]
    .sort((a, b) => b.xp - a.xp)
    .slice(0, 20)
    .map(p => ({ username: p.username, xp: p.xp }));
}

function broadcastPositions() {
  const list = [...players.values()].map(p => ({
    id: p.id, username: p.username,
    x: p.x, y: p.y, angle: p.angle,
    inCar: p.inCar, carKind: p.carKind
  }));
  io.emit('playerList', list);
}

io.on('connection', socket => {
  console.log('+ connect', socket.id);

  socket.on('join', ({ username } = {}) => {
    const name = String(username || 'Driver').substring(0, 24);
    players.set(socket.id, {
      id: socket.id, username: name, xp: 0,
      x: 900, y: 1500, angle: 0, inCar: false, carKind: 'On foot'
    });
    socket.emit('joined', { id: socket.id, username: name });
    io.emit('leaderboard', leaderboard());
    broadcastPositions();
  });

  socket.on('move', ({ x, y, angle, inCar, carKind } = {}) => {
    const p = players.get(socket.id);
    if (!p) return;
    p.x = +x || p.x;
    p.y = +y || p.y;
    p.angle = +angle || p.angle;
    p.inCar = !!inCar;
    p.carKind = String(carKind || 'On foot').substring(0, 20);
    broadcastPositions();
  });

  socket.on('xpEarned', ({ delta } = {}) => {
    const p = players.get(socket.id);
    if (!p) return;
    const d = Math.max(0, Math.min(1000, +delta || 0));
    p.xp += d;
    io.emit('leaderboard', leaderboard());
  });

  socket.on('disconnect', () => {
    console.log('- disconnect', socket.id);
    players.delete(socket.id);
    io.emit('leaderboard', leaderboard());
    broadcastPositions();
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log('Neon District Driver server listening on port', PORT));
