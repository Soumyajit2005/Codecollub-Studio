import axios from 'axios';
import toast from 'react-hot-toast';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3003';

class AuthService {
  constructor() {
    this.api = axios.create({
      baseURL: `${API_BASE_URL}/api/auth`,
      headers: {
        'Content-Type': 'application/json',
      },
    });

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

  async register(userData) {
    try {
      const response = await this.api.post('/register', userData);
      const { token, user, message } = response.data;
      
      if (token) {
        localStorage.setItem('token', token);
      }
      
      toast.success(message || 'Registration successful!');
      return { user, token };
    } catch (error) {
      const message = error.response?.data?.error || 
                     error.response?.data?.errors?.[0]?.msg ||
                     'Registration failed';
      toast.error(message);
      throw error;
    }
  }

  async login(credentials) {
    try {
      const response = await this.api.post('/login', credentials);
      const { token, user, message } = response.data;
      
      if (token) {
        localStorage.setItem('token', token);
      }
      
      toast.success(message || 'Login successful!');
      return { user, token };
    } catch (error) {
      const message = error.response?.data?.error || 'Login failed';
      toast.error(message);
      throw error;
    }
  }

  async logout() {
    try {
      await this.api.post('/logout');
      localStorage.removeItem('token');
      toast.success('Logged out successfully');
    } catch (error) {
      console.error('Logout error:', error);
      localStorage.removeItem('token');
    }
  }

  async getProfile() {
    try {
      const response = await this.api.get('/me');
      return response.data.user;
    } catch (error) {
      throw error;
    }
  }

  async updateProfile(profileData) {
    try {
      const response = await this.api.put('/profile', profileData);
      toast.success('Profile updated successfully');
      return response.data.user;
    } catch (error) {
      const message = error.response?.data?.error || 'Profile update failed';
      toast.error(message);
      throw error;
    }
  }

  async updatePreferences(preferences) {
    try {
      const response = await this.api.put('/preferences', preferences);
      toast.success('Preferences updated successfully');
      return response.data.user;
    } catch (error) {
      const message = error.response?.data?.error || 'Preferences update failed';
      toast.error(message);
      throw error;
    }
  }

  async updateStatus(status) {
    try {
      const response = await this.api.put('/status', { status });
      return response.data.user;
    } catch (error) {
      console.error('Status update error:', error);
      throw error;
    }
  }

  async refreshToken() {
    try {
      const response = await this.api.post('/refresh');
      const { token } = response.data;
      
      if (token) {
        localStorage.setItem('token', token);
      }
      
      return token;
    } catch (error) {
      localStorage.removeItem('token');
      throw error;
    }
  }

  isAuthenticated() {
    const token = localStorage.getItem('token');
    if (!token) return false;
    
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp * 1000 > Date.now();
    } catch {
      return false;
    }
  }

  getToken() {
    return localStorage.getItem('token');
  }

  async uploadAvatar(file) {
    try {
      const formData = new FormData();
      formData.append('avatar', file);
      
      const response = await this.api.post('/upload-avatar', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      toast.success('Avatar uploaded successfully!');
      return response.data;
    } catch (error) {
      const message = error.response?.data?.error || 'Avatar upload failed';
      toast.error(message);
      throw error;
    }
  }

  setAuthHeader(token) {
    if (token) {
      this.api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete this.api.defaults.headers.common['Authorization'];
    }
  }
}

export default new AuthService();