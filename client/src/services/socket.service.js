import { io } from 'socket.io-client';
import toast from 'react-hot-toast';

const WS_URL = import.meta.env.VITE_WS_URL || 'http://localhost:3001';

class SocketService {
  constructor() {
    this.socket = null;
    this.connected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.callbacks = new Map();
  }

  connect(token) {
    if (this.socket?.connected) {
      return this.socket;
    }

    this.socket = io(WS_URL, {
      auth: {
        token: token
      },
      transports: ['websocket', 'polling'],
      upgrade: true,
      rememberUpgrade: true,
      timeout: 20000,
      forceNew: true
    });

    this.setupEventListeners();
    return this.socket;
  }

  setupEventListeners() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      this.connected = true;
      this.reconnectAttempts = 0;
      console.log('Connected to server');
      toast.success('Connected to server');
      
      this.processEventQueue();
    });

    this.socket.on('disconnect', (reason) => {
      this.connected = false;
      console.log('Disconnected from server:', reason);
      
      if (reason === 'io server disconnect') {
        this.handleReconnect();
      }
    });

    this.socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      
      if (error.message?.includes('Authentication')) {
        toast.error('Authentication failed. Please log in again.');
        localStorage.removeItem('token');
        window.location.href = '/login';
      } else {
        this.handleReconnect();
      }
    });

    this.socket.on('error', (error) => {
      console.error('Socket error:', error);
      toast.error(error.message || 'Connection error occurred');
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log('Reconnected after', attemptNumber, 'attempts');
      toast.success('Reconnected to server');
      this.reconnectAttempts = 0;
    });

    this.socket.on('reconnect_attempt', (attemptNumber) => {
      console.log('Attempting to reconnect...', attemptNumber);
    });

    this.socket.on('reconnect_failed', () => {
      console.error('Failed to reconnect to server');
      toast.error('Failed to reconnect to server. Please refresh the page.');
    });
  }

  handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
      
      setTimeout(() => {
        console.log(`Reconnection attempt ${this.reconnectAttempts}`);
        if (this.socket) {
          this.socket.connect();
        }
      }, delay);
    } else {
      toast.error('Connection lost. Please refresh the page.');
    }
  }

  processEventQueue() {
    // Process any queued events when reconnected
    // This could be implemented to store events while offline
  }

  disconnect() {
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }
    this.connected = false;
    this.callbacks.clear();
  }

  on(event, callback) {
    if (this.socket) {
      this.socket.on(event, callback);
    }
    
    if (!this.callbacks.has(event)) {
      this.callbacks.set(event, []);
    }
    this.callbacks.get(event).push(callback);
  }

  off(event, callback) {
    if (this.socket) {
      this.socket.off(event, callback);
    }
    
    const callbacks = this.callbacks.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  emit(event, data) {
    if (this.socket && this.connected) {
      this.socket.emit(event, data);
    } else {
      // Only show warning for important events, not for cleanup events
      if (!['leave-room'].includes(event)) {
        console.warn(`Cannot emit ${event}: not connected to server`);
      }
    }
  }

  joinRoom(roomId) {
    this.emit('join-room', roomId);
  }

  leaveRoom(roomId) {
    this.emit('leave-room', roomId);
  }

  sendCodeChange(roomId, code, language, cursor) {
    this.emit('code-change', {
      roomId,
      code,
      language,
      cursor
    });
  }

  sendCursorPosition(roomId, position, selection) {
    this.emit('cursor-position', {
      roomId,
      position,
      selection
    });
  }

  sendChatMessage(roomId, message, type = 'text') {
    this.emit('chat-message', {
      roomId,
      message,
      type
    });
  }

  startTyping(roomId) {
    this.emit('typing-start', roomId);
  }

  stopTyping(roomId) {
    this.emit('typing-stop', roomId);
  }

  executeCode(roomId, code, language, input) {
    this.emit('execute-code', {
      roomId,
      code,
      language,
      input
    });
  }

  sendVideoOffer(roomId, offer, to) {
    this.emit('video-offer', {
      roomId,
      offer,
      to
    });
  }

  sendVideoAnswer(answer, to) {
    this.emit('video-answer', {
      answer,
      to
    });
  }

  sendIceCandidate(candidate, to) {
    this.emit('ice-candidate', {
      candidate,
      to
    });
  }

  startScreenShare(roomId) {
    this.emit('screen-share-start', roomId);
  }

  stopScreenShare(roomId) {
    this.emit('screen-share-stop', roomId);
  }

  sendWhiteboardDraw(roomId, drawData) {
    this.emit('whiteboard-draw', {
      roomId,
      drawData
    });
  }

  clearWhiteboard(roomId) {
    this.emit('whiteboard-clear', roomId);
  }

  requestWhiteboardSync(roomId) {
    this.emit('whiteboard-sync-request', roomId);
  }

  sendWhiteboardCursor(roomId, position, color) {
    this.emit('whiteboard-cursor', {
      roomId,
      position,
      color
    });
  }

  sendUserActivity(roomId, activity, data) {
    this.emit('user-activity', {
      roomId,
      activity,
      data
    });
  }

  isConnected() {
    return this.connected && this.socket?.connected;
  }

  getSocket() {
    return this.socket;
  }
}

export default new SocketService();