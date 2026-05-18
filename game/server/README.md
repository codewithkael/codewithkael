# Neon District Driver — Multiplayer Server

A lightweight Socket.io leaderboard server for **Neon District Driver**.

## Local Development

```bash
cd game/server
npm install
npm run dev
```

Server starts on `http://localhost:3000`.

## Deploy on Render.com (free)

1. Go to [render.com](https://render.com) and create a **New Web Service**
2. Connect your GitHub repo (`codewithkael/codewithkael`)
3. Set **Root Directory** → `game/server`
4. Set **Build Command** → `npm install`
5. Set **Start Command** → `npm start`
6. Set **Environment** → Node
7. Copy the generated URL (e.g. `https://neon-district-driver.onrender.com`)
8. Paste it as `SERVER_URL` in `game/index.html`

## Socket.io Events

| Direction | Event | Payload | Description |
|-----------|-------|---------|-------------|
| client → server | `join` | `{ username }` | Register player |
| server → client | `joined` | `{ id, username }` | Confirm join |
| client → server | `xpEarned` | `{ delta }` | Add XP |
| server → client | `leaderboard` | `Array<{ id, username, xp }>` | Top 20 broadcast |

## REST

| Route | Response |
|-------|----------|
| `GET /` | `{ status }` |
| `GET /leaderboard` | Top 20 players JSON |
