import { io } from 'socket.io-client';

const socketUrl = import.meta.env.VITE_SOCKET_URL || window.location.origin;

console.log(`[Socket Client] Instantiating socket connection to: ${socketUrl}`);

export const socket = io(socketUrl, {
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 20000
});

socket.on('connect', () => {
  console.log('[Socket Client] Connected to presentation server:', socket.id);
  updateStatusIndicator(true);
});

socket.on('disconnect', (reason) => {
  console.warn('[Socket Client] Disconnected from server:', reason);
  updateStatusIndicator(false);
});

socket.on('connect_error', (error) => {
  console.error('[Socket Client] Connection error:', error);
  updateStatusIndicator(false);
});

function updateStatusIndicator(isConnected) {
  const indicator = document.getElementById('connection-status');
  if (indicator) {
    if (isConnected) {
      indicator.textContent = '● Connected';
      indicator.className = 'text-[10px] text-emerald-400 font-mono';
    } else {
      indicator.textContent = '○ Reconnecting...';
      indicator.className = 'text-[10px] text-rose-400 font-mono animate-pulse';
    }
  }
}
