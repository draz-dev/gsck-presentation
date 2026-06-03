import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const server = http.createServer(app);

app.use(cors());

// Serve static assets from the compiled production directory
app.use(express.static(join(__dirname, 'dist')));

const io = new Server(server, {
  cors: {
    origin: "*"
  }
});

let state = {
  indexh: 0,
  indexv: 0,
  fIndex: 0
};

io.on("connection", (socket) => {
  socket.emit("stateUpdate", state);

  socket.on("slidechange", (data) => {
    state = data;
    socket.broadcast.emit("stateUpdate", state);
  });

  socket.on("getCurrentState", () => {
    socket.emit("stateUpdate", state);
  });

  socket.on("audio-control", (data) => {
    socket.broadcast.emit("audio-control", data);
  });
});

// Explicitly handle specific routes
app.get('/presenter', (req, res) => {
  res.sendFile(join(__dirname, 'dist', 'presenter.html'));
});

app.get('/display', (req, res) => {
  res.sendFile(join(__dirname, 'dist', 'display.html'));
});

// Serve index.html only for actual page routes, not API/asset requests
app.get('/', (req, res) => {
  res.sendFile(join(__dirname, 'dist', 'index.html'));
});

// Return 404 for unmatched requests (don't serve HTML for asset requests)
app.use((req, res) => {
  res.status(404).send('Not Found');
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on ${PORT}`);
});