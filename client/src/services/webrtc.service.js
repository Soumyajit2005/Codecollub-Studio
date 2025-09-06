import Peer from 'simple-peer';

class WebRTCService {
  constructor() {
    this.localStream = null;
    this.peers = new Map();
    this.isScreenSharing = false;
    this.screenStream = null;
    this.socket = null;
    this.roomId = null;
    this.userId = null;
    
    this.callbacks = {
      onLocalStream: null,
      onRemoteStream: null,
      onPeerDisconnected: null,
      onScreenShare: null,
      onScreenShareStopped: null,
      onError: null
    };
  }

  initialize(socket, roomId, userId) {
    this.socket = socket;
    this.roomId = roomId;
    this.userId = userId;
    this.setupSocketListeners();
  }

  setupSocketListeners() {
    this.socket.on('video-offer', this.handleOffer.bind(this));
    this.socket.on('video-answer', this.handleAnswer.bind(this));
    this.socket.on('ice-candidate', this.handleIceCandidate.bind(this));
    this.socket.on('user-left', this.handleUserLeft.bind(this));
    this.socket.on('user-disconnected', this.handleUserLeft.bind(this));
    this.socket.on('user-screen-sharing', this.handleScreenShareStart.bind(this));
    this.socket.on('user-stopped-screen-sharing', this.handleScreenShareStop.bind(this));
  }

  async startVideoCall() {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 }
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      if (this.callbacks.onLocalStream) {
        this.callbacks.onLocalStream(this.localStream);
      }

      return this.localStream;
    } catch (error) {
      console.error('Error starting video call:', error);
      if (this.callbacks.onError) {
        this.callbacks.onError('Failed to access camera/microphone: ' + error.message);
      }
      throw error;
    }
  }

  async startScreenShare() {
    try {
      const displayMediaOptions = {
        video: {
          cursor: 'always',
          displaySurface: 'monitor'
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true
        }
      };

      this.screenStream = await navigator.mediaDevices.getDisplayMedia(displayMediaOptions);
      this.isScreenSharing = true;

      const videoTrack = this.screenStream.getVideoTracks()[0];
      
      this.peers.forEach(peer => {
        const sender = peer.connection._pc.getSenders().find(
          s => s.track && s.track.kind === 'video'
        );
        if (sender) {
          sender.replaceTrack(videoTrack);
        }
      });

      this.socket.emit('screen-share-start', this.roomId);

      videoTrack.addEventListener('ended', () => {
        this.stopScreenShare();
      });

      if (this.callbacks.onScreenShare) {
        this.callbacks.onScreenShare(this.screenStream);
      }

      return this.screenStream;
    } catch (error) {
      console.error('Error starting screen share:', error);
      if (this.callbacks.onError) {
        this.callbacks.onError('Failed to start screen sharing: ' + error.message);
      }
      throw error;
    }
  }

  async stopScreenShare() {
    if (!this.isScreenSharing || !this.screenStream) return;

    this.screenStream.getTracks().forEach(track => track.stop());
    this.screenStream = null;
    this.isScreenSharing = false;

    if (this.localStream) {
      const videoTrack = this.localStream.getVideoTracks()[0];
      
      this.peers.forEach(peer => {
        const sender = peer.connection._pc.getSenders().find(
          s => s.track && s.track.kind === 'video'
        );
        if (sender && videoTrack) {
          sender.replaceTrack(videoTrack);
        }
      });
    }

    this.socket.emit('screen-share-stop', this.roomId);

    if (this.callbacks.onScreenShareStopped) {
      this.callbacks.onScreenShareStopped();
    }
  }

  async connectToPeer(targetUserId, isInitiator = false) {
    const peer = new Peer({
      initiator: isInitiator,
      trickle: false,
      stream: this.localStream,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          {
            urls: 'turn:openrelay.metered.ca:80',
            username: 'openrelayproject',
            credential: 'openrelayproject'
          }
        ]
      }
    });

    this.peers.set(targetUserId, {
      connection: peer,
      userId: targetUserId
    });

    peer.on('signal', (data) => {
      if (isInitiator) {
        this.socket.emit('video-offer', {
          roomId: this.roomId,
          offer: data,
          to: targetUserId
        });
      } else {
        this.socket.emit('video-answer', {
          answer: data,
          to: targetUserId
        });
      }
    });

    peer.on('stream', (remoteStream) => {
      if (this.callbacks.onRemoteStream) {
        this.callbacks.onRemoteStream(remoteStream, targetUserId);
      }
    });

    peer.on('error', (error) => {
      console.error('Peer connection error:', error);
      this.peers.delete(targetUserId);
      if (this.callbacks.onError) {
        this.callbacks.onError('Connection failed with peer: ' + error.message);
      }
    });

    peer.on('close', () => {
      this.peers.delete(targetUserId);
      if (this.callbacks.onPeerDisconnected) {
        this.callbacks.onPeerDisconnected(targetUserId);
      }
    });

    return peer;
  }

  handleOffer({ offer, from, username }) {
    this.connectToPeer(from, false).then(peer => {
      peer.signal(offer);
    });
  }

  handleAnswer({ answer, from }) {
    const peerData = this.peers.get(from);
    if (peerData) {
      peerData.connection.signal(answer);
    }
  }

  handleIceCandidate({ candidate, from }) {
    const peerData = this.peers.get(from);
    if (peerData) {
      peerData.connection.signal(candidate);
    }
  }

  handleUserLeft({ userId }) {
    const peerData = this.peers.get(userId);
    if (peerData) {
      peerData.connection.destroy();
      this.peers.delete(userId);
    }
  }

  handleScreenShareStart({ userId, username }) {
    if (this.callbacks.onScreenShare) {
      this.callbacks.onScreenShare(null, userId, username);
    }
  }

  handleScreenShareStop({ userId }) {
    if (this.callbacks.onScreenShareStopped) {
      this.callbacks.onScreenShareStopped(userId);
    }
  }

  toggleMute() {
    if (this.localStream) {
      const audioTrack = this.localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        return !audioTrack.enabled;
      }
    }
    return false;
  }

  toggleVideo() {
    if (this.localStream) {
      const videoTrack = this.localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        return !videoTrack.enabled;
      }
    }
    return false;
  }

  endCall() {
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }

    if (this.screenStream) {
      this.screenStream.getTracks().forEach(track => track.stop());
      this.screenStream = null;
    }

    this.peers.forEach(peerData => {
      peerData.connection.destroy();
    });
    this.peers.clear();

    this.isScreenSharing = false;
  }

  setCallbacks(callbacks) {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }
}

export default new WebRTCService();