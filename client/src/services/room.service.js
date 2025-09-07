import axios from 'axios';
import toast from 'react-hot-toast';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

class RoomService {
  constructor() {
    this.api = axios.create({
      baseURL: `${API_BASE_URL}/api/rooms`,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add token to requests
    this.api.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Handle responses
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          localStorage.removeItem('token');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  async createRoom(roomData) {
    try {
      const response = await this.api.post('/', roomData);
      toast.success('Room created successfully!');
      return response.data.room;
    } catch (error) {
      const message = error.response?.data?.error || 
                     error.response?.data?.errors?.[0]?.msg ||
                     'Failed to create room';
      toast.error(message);
      throw error;
    }
  }

  async getRooms(page = 1, limit = 20, type = 'all') {
    try {
      const response = await this.api.get(`/?page=${page}&limit=${limit}&type=${type}`);
      return response.data;
    } catch (error) {
      const message = error.response?.data?.error || 'Failed to fetch rooms';
      toast.error(message);
      throw error;
    }
  }

  async getPublicRooms(filters = {}) {
    try {
      const { search = '', language = '', sortBy = 'recent', page = 1, limit = 12 } = filters;
      const queryParams = new URLSearchParams({
        search,
        language,
        sortBy,
        page: page.toString(),
        limit: limit.toString()
      });

      const response = await this.api.get(`/public?${queryParams}`);
      return response.data;
    } catch (error) {
      const message = error.response?.data?.error || 'Failed to fetch public rooms';
      toast.error(message);
      throw error;
    }
  }

  async getRoom(roomId) {
    try {
      const response = await this.api.get(`/${roomId}`);
      return response.data.room;
    } catch (error) {
      const message = error.response?.data?.error || 'Failed to fetch room';
      toast.error(message);
      throw error;
    }
  }

  async joinRoom(roomId, password = null) {
    try {
      const payload = password ? { password } : {};
      const response = await this.api.post(`/${roomId}/join`, payload);
      toast.success('Joined room successfully!');
      return response.data.room;
    } catch (error) {
      const message = error.response?.data?.error || 'Failed to join room';
      toast.error(message);
      throw error;
    }
  }

  async leaveRoom(roomId) {
    try {
      const response = await this.api.post(`/${roomId}/leave`);
      toast.success('Left room successfully');
      return response.data;
    } catch (error) {
      const message = error.response?.data?.error || 'Failed to leave room';
      toast.error(message);
      throw error;
    }
  }

  async updateRoom(roomId, updateData) {
    try {
      const response = await this.api.put(`/${roomId}`, updateData);
      toast.success('Room updated successfully!');
      return response.data.room;
    } catch (error) {
      const message = error.response?.data?.error || 'Failed to update room';
      toast.error(message);
      throw error;
    }
  }

  async deleteRoom(roomId) {
    try {
      const response = await this.api.delete(`/${roomId}`);
      toast.success('Room deleted successfully');
      return response.data;
    } catch (error) {
      const message = error.response?.data?.error || 'Failed to delete room';
      toast.error(message);
      throw error;
    }
  }

  async updateParticipantRole(roomId, userId, role) {
    try {
      const response = await this.api.put(`/${roomId}/participants/${userId}`, { role });
      toast.success(`Participant role updated to ${role}`);
      return response.data;
    } catch (error) {
      const message = error.response?.data?.error || 'Failed to update participant role';
      toast.error(message);
      throw error;
    }
  }

  async removeParticipant(roomId, userId) {
    try {
      const response = await this.api.delete(`/${roomId}/participants/${userId}`);
      toast.success('Participant removed successfully');
      return response.data;
    } catch (error) {
      const message = error.response?.data?.error || 'Failed to remove participant';
      toast.error(message);
      throw error;
    }
  }

  async inviteToRoom(roomId, email) {
    try {
      const response = await this.api.post(`/${roomId}/invite`, { email });
      toast.success('Invitation sent successfully!');
      return response.data;
    } catch (error) {
      const message = error.response?.data?.error || 'Failed to send invitation';
      toast.error(message);
      throw error;
    }
  }

  async getRoomActivity(roomId, page = 1, limit = 20) {
    try {
      const response = await this.api.get(`/${roomId}/activity?page=${page}&limit=${limit}`);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch room activity:', error);
      throw error;
    }
  }

  async getRoomStats(roomId) {
    try {
      const response = await this.api.get(`/${roomId}/stats`);
      return response.data.stats;
    } catch (error) {
      console.error('Failed to fetch room stats:', error);
      throw error;
    }
  }

  async saveCode(roomId, code, language) {
    try {
      const response = await this.api.post(`/${roomId}/save`, { code, language });
      toast.success('Code saved successfully!');
      return response.data;
    } catch (error) {
      const message = error.response?.data?.error || 'Failed to save code';
      toast.error(message);
      throw error;
    }
  }

  async getCodeHistory(roomId, page = 1, limit = 20) {
    try {
      const response = await this.api.get(`/${roomId}/history?page=${page}&limit=${limit}`);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch code history:', error);
      throw error;
    }
  }

  async executeCode(roomId, code, language, input = '') {
    try {
      const response = await this.api.post(`/${roomId}/execute`, {
        code,
        language,
        input
      });
      return response.data;
    } catch (error) {
      const message = error.response?.data?.error || 'Code execution failed';
      toast.error(message);
      throw error;
    }
  }

  async getExecutionHistory(roomId, page = 1, limit = 10) {
    try {
      const response = await this.api.get(`/${roomId}/executions?page=${page}&limit=${limit}`);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch execution history:', error);
      throw error;
    }
  }
}

export default new RoomService();