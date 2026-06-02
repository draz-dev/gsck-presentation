import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Presentation state stored in memory for persistence
let presentationState = {
  indexh: 0,
  indexv: 0,
  fIndex: 0
};

// Serve static assets from Vite build output directory
app.use(express.static(join(__dirname, 'dist')));

// Serve custom clean routes mapping to compiled HTML outputs
app.get('/display', (req, res) => {
  res.sendFile(join(__dirname, 'dist', 'display.html'));
});

app.get('/presenter', (req, res) => {
  res.sendFile(join(__dirname, 'dist', 'presenter.html'));
});

// Fallback to launch portal landing page
app.get('*', (req, res) => {
  res.sendFile(join(__dirname, 'dist', 'index.html'));
});

// Socket.IO event handler
io.on('connection', (socket) => {
  console.log(`[Socket.IO Server] Client connected: ${socket.id}`);

  // Send current persisted state to newly connected/reconnected client
  socket.emit('stateUpdate', presentationState);

  // Listen for slide navigation requests from the controller
  socket.on('slidechange', (state) => {
    console.log('[Socket.IO Server] Received state change request:', state);
    presentationState = {
      indexh: state.indexh ?? 0,
      indexv: state.indexv ?? 0,
      fIndex: state.fIndex ?? 0
    };
    // Authoritative update: broadcast to all clients except the sender
    socket.broadcast.emit('stateUpdate', presentationState);
  });

  socket.on('getCurrentState', () => {
    socket.emit('stateUpdate', presentationState);
  });

  socket.on('disconnect', () => {
    console.log(`[Socket.IO Server] Client disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`[Socket.IO Server] Server listening on port ${PORT}`);
  console.log(`[Socket.IO Server] Audience URL: http://localhost:${PORT}/display`);
  console.log(`[Socket.IO Server] Presenter URL: http://localhost:${PORT}/presenter`);
});
