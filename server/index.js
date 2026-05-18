const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');

const app = express();
app.use(cors());
app.get('/', (req, res) => res.send('Neon District Driver Socket.io server is running'));

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*', methods: ['GET', 'POST'] } });
const players = new Map();

function leaderboard() {
  return [...players.values()].sort((a, b) => b.xp - a.xp).slice(0, 20).map(p => ({ username: p.username, xp: p.xp }));
}
function broadcast() { io.emit('leaderboard', leaderboard()); }

io.on('connection', socket => {
  socket.on('join', ({ username }) => {
    const name = String(username || 'Driver').slice(0, 24) || 'Driver';
    players.set(socket.id, { id: socket.id, username: name, xp: 0 });
    socket.emit('joined', { id: socket.id, username: name });
    broadcast();
  });
  socket.on('xpEarned', ({ delta }) => {
    const p = players.get(socket.id);
    const n = Number(delta);
    if (!p || !Number.isFinite(n) || n <= 0) return;
    p.xp += Math.min(n, 1000);
    broadcast();
  });
  socket.on('disconnect', () => { players.delete(socket.id); broadcast(); });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log('listening on', PORT));
