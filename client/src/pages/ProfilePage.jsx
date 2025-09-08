import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Container,
  Typography,
  Card,
  CardContent,
  Box,
  Avatar,
  Button,
  TextField,
  Grid,
  IconButton,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Divider,
  Paper
} from '@mui/material';
import {
  PhotoCamera,
  Edit,
  Save,
  Cancel
} from '@mui/icons-material';
import { 
  Camera, 
  Edit as EditIcon, 
  Save as SaveIcon, 
  X,
  User,
  Settings,
  Bell,
  Globe,
  Palette
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import authService from '../services/auth.service';
import toast from 'react-hot-toast';

const ProfilePage = () => {
  const { user, setUser } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [editing, setEditing] = useState(false);
  const fileInputRef = useRef(null);

  const [profile, setProfile] = useState({
    firstName: '',
    lastName: '',
    bio: '',
    location: '',
    website: '',
    company: ''
  });

  const [preferences, setPreferences] = useState({
    theme: 'light',
    language: 'javascript',
    fontSize: 14,
    notifications: {
      email: true,
      browser: true,
      collaborationInvites: true
    }
  });

  useEffect(() => {
    if (user) {
      setProfile({
        firstName: user.profile?.firstName || '',
        lastName: user.profile?.lastName || '',
        bio: user.profile?.bio || '',
        location: user.profile?.location || '',
        website: user.profile?.website || '',
        company: user.profile?.company || ''
      });
      setPreferences(user.preferences || preferences);
    }
  }, [user]);

  const handleAvatarUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Please upload a valid image file (JPEG, PNG, or WebP)');
      return;
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    setUploadingAvatar(true);
    try {
      const result = await authService.uploadAvatar(file);
      
      // Update user state with new avatar
      if (result && result.user) {
        setUser(result.user);
        toast.success('Avatar updated successfully!');
      } else {
        toast.error('Failed to update avatar - invalid response');
      }
    } catch (error) {
      console.error('Avatar upload error:', error);
      const errorMessage = error.response?.data?.error || 
                          error.response?.data?.message ||
                          'Failed to upload avatar. Please try again.';
      toast.error(errorMessage);
    } finally {
      setUploadingAvatar(false);
      // Clear the file input so the same file can be selected again if needed
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleProfileSave = async () => {
    setLoading(true);
    try {
      const updatedUser = await authService.updateProfile(profile);
      setUser(updatedUser);
      setEditing(false);
    } catch (error) {
      console.error('Profile update error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePreferencesSave = async () => {
    setLoading(true);
    try {
      const updatedUser = await authService.updatePreferences(preferences);
      setUser(updatedUser);
      toast.success('Preferences updated successfully!');
    } catch (error) {
      console.error('Preferences update error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setProfile(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handlePreferenceChange = (field, value) => {
    setPreferences(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleNotificationChange = (field, value) => {
    setPreferences(prev => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        [field]: value
      }
    }));
  };

  if (!user) return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
      <CircularProgress />
    </Box>
  );

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        position: 'relative',
        pb: 4,
      }}
    >
      {/* Animated background elements */}
      <Box
        sx={{
          position: 'absolute',
          top: '10%',
          right: '-5%',
          width: '30%',
          height: '30%',
          background: 'radial-gradient(circle, rgba(255,255,255,0.05) 0%, transparent 70%)',
          borderRadius: '50%',
          animation: 'float 8s ease-in-out infinite',
          '@keyframes float': {
            '0%, 100%': { transform: 'translateY(0px) scale(1)' },
            '50%': { transform: 'translateY(-20px) scale(1.05)' },
          },
        }}
      />

      <Container maxWidth="md" sx={{ py: 4, position: 'relative', zIndex: 1 }}>
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <Box sx={{ textAlign: 'center', mb: 6 }}>
            <Typography 
              variant="h3" 
              sx={{ 
                color: 'white',
                fontWeight: 700,
                mb: 2,
                textShadow: '0 2px 20px rgba(0,0,0,0.3)',
              }}
            >
              Profile Settings
            </Typography>
            <Typography 
              variant="h6" 
              sx={{ 
                color: 'rgba(255, 255, 255, 0.8)',
                fontWeight: 400,
              }}
            >
              Manage your account and preferences
            </Typography>
          </Box>
        </motion.div>

        {/* Avatar Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <Paper
            elevation={0}
            sx={{
              mb: 4,
              background: 'rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '24px',
              overflow: 'hidden',
            }}
          >
            <CardContent sx={{ p: 4 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 3 }}>
                <Box sx={{ position: 'relative' }}>
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Avatar
                      src={user.avatar}
                      sx={{ 
                        width: 120, 
                        height: 120,
                        border: '4px solid rgba(255, 255, 255, 0.2)',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
                      }}
                    >
                      <Typography variant="h3" sx={{ color: 'white', fontWeight: 700 }}>
                        {user.username?.charAt(0).toUpperCase()}
                      </Typography>
                    </Avatar>
                  </motion.div>
                  {uploadingAvatar && (
                    <CircularProgress
                      size={128}
                      sx={{
                        position: 'absolute',
                        top: -4,
                        left: -4,
                        zIndex: 1,
                        color: 'rgba(255, 255, 255, 0.7)',
                      }}
                    />
                  )}
                </Box>
                <Box sx={{ flex: 1, minWidth: 200 }}>
                  <Typography 
                    variant="h4" 
                    sx={{ 
                      color: 'white',
                      fontWeight: 700,
                      mb: 1,
                      lineHeight: 1.2
                    }}
                  >
                    {profile.firstName || profile.lastName 
                      ? `${profile.firstName} ${profile.lastName}`
                      : user.username}
                  </Typography>
                  <Typography 
                    variant="body1" 
                    sx={{ 
                      color: 'rgba(255, 255, 255, 0.8)', 
                      mb: 3,
                      fontSize: '1.1rem'
                    }}
                  >
                    {user.email}
                  </Typography>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    style={{ display: 'none' }}
                  />
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Button
                      variant="contained"
                      startIcon={<Camera size={18} />}
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingAvatar}
                      sx={{
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        borderRadius: '12px',
                        px: 3,
                        py: 1.5,
                        fontWeight: 600,
                        textTransform: 'none',
                        boxShadow: '0 8px 32px rgba(102, 126, 234, 0.3)',
                      }}
                    >
                      {uploadingAvatar ? 'Uploading...' : 'Change Avatar'}
                    </Button>
                  </motion.div>
                </Box>
              </Box>
            </CardContent>
          </Paper>
        </motion.div>

        {/* Profile Information */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <Paper
            elevation={0}
            sx={{
              mb: 4,
              background: 'rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '24px',
              overflow: 'hidden',
            }}
          >
            <CardContent sx={{ p: 4 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <User size={24} color="white" />
                  <Typography 
                    variant="h5" 
                    sx={{ 
                      color: 'white',
                      fontWeight: 600
                    }}
                  >
                    Profile Information
                  </Typography>
                </Box>
                <Box>
                  {editing ? (
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                        <IconButton 
                          onClick={() => setEditing(false)} 
                          sx={{ 
                            color: 'rgba(255, 255, 255, 0.7)',
                            '&:hover': {
                              color: 'white',
                              backgroundColor: 'rgba(255, 255, 255, 0.1)',
                            }
                          }}
                        >
                          <X size={20} />
                        </IconButton>
                      </motion.div>
                      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                        <IconButton 
                          onClick={handleProfileSave} 
                          disabled={loading}
                          sx={{ 
                            color: 'rgba(255, 255, 255, 0.7)',
                            '&:hover': {
                              color: 'white',
                              backgroundColor: 'rgba(255, 255, 255, 0.1)',
                            }
                          }}
                        >
                          {loading ? <CircularProgress size={20} color="inherit" /> : <SaveIcon size={20} />}
                        </IconButton>
                      </motion.div>
                    </Box>
                  ) : (
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <IconButton 
                        onClick={() => setEditing(true)}
                        sx={{ 
                          color: 'rgba(255, 255, 255, 0.7)',
                          '&:hover': {
                            color: 'white',
                            backgroundColor: 'rgba(255, 255, 255, 0.1)',
                          }
                        }}
                      >
                        <EditIcon size={20} />
                      </IconButton>
                    </motion.div>
                  )}
                </Box>
              </Box>

              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="First Name"
                    value={profile.firstName}
                    onChange={(e) => handleInputChange('firstName', e.target.value)}
                    disabled={!editing}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: '12px',
                        backgroundColor: editing ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                        color: 'white',
                        '& .MuiOutlinedInput-notchedOutline': {
                          borderColor: 'rgba(255, 255, 255, 0.3)',
                        },
                        '&:hover .MuiOutlinedInput-notchedOutline': {
                          borderColor: 'rgba(255, 255, 255, 0.5)',
                        },
                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                          borderColor: 'white',
                        },
                      },
                      '& .MuiInputLabel-root': {
                        color: 'rgba(255, 255, 255, 0.7)',
                      },
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Last Name"
                    value={profile.lastName}
                    onChange={(e) => handleInputChange('lastName', e.target.value)}
                    disabled={!editing}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: '12px',
                        backgroundColor: editing ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                        color: 'white',
                        '& .MuiOutlinedInput-notchedOutline': {
                          borderColor: 'rgba(255, 255, 255, 0.3)',
                        },
                        '&:hover .MuiOutlinedInput-notchedOutline': {
                          borderColor: 'rgba(255, 255, 255, 0.5)',
                        },
                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                          borderColor: 'white',
                        },
                      },
                      '& .MuiInputLabel-root': {
                        color: 'rgba(255, 255, 255, 0.7)',
                      },
                    }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    label="Bio"
                    value={profile.bio}
                    onChange={(e) => handleInputChange('bio', e.target.value)}
                    disabled={!editing}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: '12px',
                        backgroundColor: editing ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                        color: 'white',
                        '& .MuiOutlinedInput-notchedOutline': {
                          borderColor: 'rgba(255, 255, 255, 0.3)',
                        },
                        '&:hover .MuiOutlinedInput-notchedOutline': {
                          borderColor: 'rgba(255, 255, 255, 0.5)',
                        },
                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                          borderColor: 'white',
                        },
                      },
                      '& .MuiInputLabel-root': {
                        color: 'rgba(255, 255, 255, 0.7)',
                      },
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Location"
                    value={profile.location}
                    onChange={(e) => handleInputChange('location', e.target.value)}
                    disabled={!editing}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: '12px',
                        backgroundColor: editing ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                        color: 'white',
                        '& .MuiOutlinedInput-notchedOutline': {
                          borderColor: 'rgba(255, 255, 255, 0.3)',
                        },
                        '&:hover .MuiOutlinedInput-notchedOutline': {
                          borderColor: 'rgba(255, 255, 255, 0.5)',
                        },
                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                          borderColor: 'white',
                        },
                      },
                      '& .MuiInputLabel-root': {
                        color: 'rgba(255, 255, 255, 0.7)',
                      },
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Company"
                    value={profile.company}
                    onChange={(e) => handleInputChange('company', e.target.value)}
                    disabled={!editing}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: '12px',
                        backgroundColor: editing ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                        color: 'white',
                        '& .MuiOutlinedInput-notchedOutline': {
                          borderColor: 'rgba(255, 255, 255, 0.3)',
                        },
                        '&:hover .MuiOutlinedInput-notchedOutline': {
                          borderColor: 'rgba(255, 255, 255, 0.5)',
                        },
                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                          borderColor: 'white',
                        },
                      },
                      '& .MuiInputLabel-root': {
                        color: 'rgba(255, 255, 255, 0.7)',
                      },
                    }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Website"
                    value={profile.website}
                    onChange={(e) => handleInputChange('website', e.target.value)}
                    disabled={!editing}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: '12px',
                        backgroundColor: editing ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                        color: 'white',
                        '& .MuiOutlinedInput-notchedOutline': {
                          borderColor: 'rgba(255, 255, 255, 0.3)',
                        },
                        '&:hover .MuiOutlinedInput-notchedOutline': {
                          borderColor: 'rgba(255, 255, 255, 0.5)',
                        },
                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                          borderColor: 'white',
                        },
                      },
                      '& .MuiInputLabel-root': {
                        color: 'rgba(255, 255, 255, 0.7)',
                      },
                    }}
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Paper>
        </motion.div>

        {/* Preferences */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <Paper
            elevation={0}
            sx={{
              background: 'rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '24px',
              overflow: 'hidden',
            }}
          >
            <CardContent sx={{ p: 4 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4, flexWrap: 'wrap', gap: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Settings size={24} color="white" />
                  <Typography 
                    variant="h5" 
                    sx={{ 
                      color: 'white',
                      fontWeight: 600
                    }}
                  >
                    Preferences
                  </Typography>
                </Box>
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button
                    variant="contained"
                    onClick={handlePreferencesSave}
                    disabled={loading}
                    startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <SaveIcon size={18} />}
                    sx={{
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      borderRadius: '12px',
                      px: 3,
                      py: 1.5,
                      fontWeight: 600,
                      textTransform: 'none',
                      boxShadow: '0 8px 32px rgba(102, 126, 234, 0.3)',
                    }}
                  >
                    Save Preferences
                  </Button>
                </motion.div>
              </Box>

              <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid item xs={12} sm={4}>
                  <FormControl 
                    fullWidth
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: '12px',
                        backgroundColor: 'rgba(255, 255, 255, 0.15)',
                        color: 'white',
                        '& .MuiOutlinedInput-notchedOutline': {
                          borderColor: 'rgba(255, 255, 255, 0.3)',
                        },
                        '&:hover .MuiOutlinedInput-notchedOutline': {
                          borderColor: 'rgba(255, 255, 255, 0.5)',
                        },
                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                          borderColor: 'white',
                        },
                      },
                      '& .MuiInputLabel-root': {
                        color: 'rgba(255, 255, 255, 0.7)',
                      },
                    }}
                  >
                    <InputLabel>Theme</InputLabel>
                    <Select
                      value={preferences.theme}
                      label="Theme"
                      onChange={(e) => handlePreferenceChange('theme', e.target.value)}
                      sx={{
                        color: 'white',
                        '& .MuiSelect-icon': {
                          color: 'rgba(255, 255, 255, 0.7)',
                        },
                      }}
                    >
                      <MenuItem value="light">Light</MenuItem>
                      <MenuItem value="dark">Dark</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <FormControl 
                    fullWidth
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: '12px',
                        backgroundColor: 'rgba(255, 255, 255, 0.15)',
                        color: 'white',
                        '& .MuiOutlinedInput-notchedOutline': {
                          borderColor: 'rgba(255, 255, 255, 0.3)',
                        },
                        '&:hover .MuiOutlinedInput-notchedOutline': {
                          borderColor: 'rgba(255, 255, 255, 0.5)',
                        },
                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                          borderColor: 'white',
                        },
                      },
                      '& .MuiInputLabel-root': {
                        color: 'rgba(255, 255, 255, 0.7)',
                      },
                    }}
                  >
                    <InputLabel>Default Language</InputLabel>
                    <Select
                      value={preferences.language}
                      label="Default Language"
                      onChange={(e) => handlePreferenceChange('language', e.target.value)}
                      sx={{
                        color: 'white',
                        '& .MuiSelect-icon': {
                          color: 'rgba(255, 255, 255, 0.7)',
                        },
                      }}
                    >
                      <MenuItem value="javascript">JavaScript</MenuItem>
                      <MenuItem value="python">Python</MenuItem>
                      <MenuItem value="cpp">C++</MenuItem>
                      <MenuItem value="java">Java</MenuItem>
                      <MenuItem value="go">Go</MenuItem>
                      <MenuItem value="rust">Rust</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Font Size"
                    value={preferences.fontSize}
                    onChange={(e) => handlePreferenceChange('fontSize', parseInt(e.target.value))}
                    InputProps={{ inputProps: { min: 10, max: 24 } }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: '12px',
                        backgroundColor: 'rgba(255, 255, 255, 0.15)',
                        color: 'white',
                        '& .MuiOutlinedInput-notchedOutline': {
                          borderColor: 'rgba(255, 255, 255, 0.3)',
                        },
                        '&:hover .MuiOutlinedInput-notchedOutline': {
                          borderColor: 'rgba(255, 255, 255, 0.5)',
                        },
                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                          borderColor: 'white',
                        },
                      },
                      '& .MuiInputLabel-root': {
                        color: 'rgba(255, 255, 255, 0.7)',
                      },
                    }}
                  />
                </Grid>
              </Grid>

              <Divider sx={{ my: 4, borderColor: 'rgba(255, 255, 255, 0.2)' }} />

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                <Bell size={24} color="white" />
                <Typography 
                  variant="h6" 
                  sx={{ 
                    color: 'white',
                    fontWeight: 600
                  }}
                >
                  Notifications
                </Typography>
              </Box>
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {[
                  {
                    key: 'email',
                    label: 'Email notifications',
                    description: 'Receive updates via email',
                    checked: preferences.notifications.email
                  },
                  {
                    key: 'browser',
                    label: 'Browser notifications',
                    description: 'Get browser push notifications',
                    checked: preferences.notifications.browser
                  },
                  {
                    key: 'collaborationInvites',
                    label: 'Collaboration invites',
                    description: 'Notifications for room invitations',
                    checked: preferences.notifications.collaborationInvites
                  }
                ].map((notification, index) => (
                  <motion.div
                    key={notification.key}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                  >
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        p: 2,
                        borderRadius: '12px',
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        transition: 'all 0.3s ease',
                        '&:hover': {
                          backgroundColor: 'rgba(255, 255, 255, 0.1)',
                        }
                      }}
                    >
                      <Box>
                        <Typography 
                          variant="body1" 
                          sx={{ 
                            color: 'white',
                            fontWeight: 500,
                            mb: 0.5
                          }}
                        >
                          {notification.label}
                        </Typography>
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            color: 'rgba(255, 255, 255, 0.7)',
                            fontSize: '0.875rem'
                          }}
                        >
                          {notification.description}
                        </Typography>
                      </Box>
                      <Switch
                        checked={notification.checked}
                        onChange={(e) => handleNotificationChange(notification.key, e.target.checked)}
                        sx={{
                          '& .MuiSwitch-switchBase.Mui-checked': {
                            color: '#667eea',
                          },
                          '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                            backgroundColor: '#667eea',
                          },
                          '& .MuiSwitch-track': {
                            backgroundColor: 'rgba(255, 255, 255, 0.3)',
                          },
                        }}
                      />
                    </Box>
                  </motion.div>
                ))}
              </Box>
            </CardContent>
          </Paper>
        </motion.div>
      </Container>
    </Box>
  );
};

export default ProfilePage;