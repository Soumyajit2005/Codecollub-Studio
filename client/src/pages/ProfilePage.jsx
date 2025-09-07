import React, { useState, useEffect, useRef } from 'react';
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
  Divider
} from '@mui/material';
import {
  PhotoCamera,
  Edit,
  Save,
  Cancel
} from '@mui/icons-material';
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

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    setUploadingAvatar(true);
    try {
      const result = await authService.uploadAvatar(file);
      setUser(result.user);
    } catch (error) {
      console.error('Avatar upload error:', error);
    } finally {
      setUploadingAvatar(false);
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

  if (!user) return <CircularProgress />;

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      {/* Avatar Section */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <Box sx={{ position: 'relative', mr: 3 }}>
              <Avatar
                src={user.avatar}
                sx={{ width: 100, height: 100 }}
              >
                {user.username?.charAt(0).toUpperCase()}
              </Avatar>
              {uploadingAvatar && (
                <CircularProgress
                  size={100}
                  sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    zIndex: 1,
                  }}
                />
              )}
            </Box>
            <Box>
              <Typography variant="h5" gutterBottom>
                {profile.firstName || profile.lastName 
                  ? `${profile.firstName} ${profile.lastName}`
                  : user.username}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                {user.email}
              </Typography>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                style={{ display: 'none' }}
              />
              <Button
                variant="outlined"
                startIcon={<PhotoCamera />}
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
                size="small"
              >
                {uploadingAvatar ? 'Uploading...' : 'Change Avatar'}
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Profile Information */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h6">Profile Information</Typography>
            <Box>
              {editing ? (
                <>
                  <IconButton onClick={() => setEditing(false)} sx={{ mr: 1 }}>
                    <Cancel />
                  </IconButton>
                  <IconButton onClick={handleProfileSave} disabled={loading}>
                    {loading ? <CircularProgress size={20} /> : <Save />}
                  </IconButton>
                </>
              ) : (
                <IconButton onClick={() => setEditing(true)}>
                  <Edit />
                </IconButton>
              )}
            </Box>
          </Box>

          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="First Name"
                value={profile.firstName}
                onChange={(e) => handleInputChange('firstName', e.target.value)}
                disabled={!editing}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Last Name"
                value={profile.lastName}
                onChange={(e) => handleInputChange('lastName', e.target.value)}
                disabled={!editing}
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
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Location"
                value={profile.location}
                onChange={(e) => handleInputChange('location', e.target.value)}
                disabled={!editing}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Company"
                value={profile.company}
                onChange={(e) => handleInputChange('company', e.target.value)}
                disabled={!editing}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Website"
                value={profile.website}
                onChange={(e) => handleInputChange('website', e.target.value)}
                disabled={!editing}
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Preferences */}
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h6">Preferences</Typography>
            <Button
              variant="contained"
              onClick={handlePreferencesSave}
              disabled={loading}
              startIcon={loading ? <CircularProgress size={16} /> : <Save />}
            >
              Save Preferences
            </Button>
          </Box>

          <Grid container spacing={3}>
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth>
                <InputLabel>Theme</InputLabel>
                <Select
                  value={preferences.theme}
                  label="Theme"
                  onChange={(e) => handlePreferenceChange('theme', e.target.value)}
                >
                  <MenuItem value="light">Light</MenuItem>
                  <MenuItem value="dark">Dark</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth>
                <InputLabel>Default Language</InputLabel>
                <Select
                  value={preferences.language}
                  label="Default Language"
                  onChange={(e) => handlePreferenceChange('language', e.target.value)}
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
              />
            </Grid>
          </Grid>

          <Divider sx={{ my: 3 }} />

          <Typography variant="h6" gutterBottom>Notifications</Typography>
          <Box>
            <FormControlLabel
              control={
                <Switch
                  checked={preferences.notifications.email}
                  onChange={(e) => handleNotificationChange('email', e.target.checked)}
                />
              }
              label="Email notifications"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={preferences.notifications.browser}
                  onChange={(e) => handleNotificationChange('browser', e.target.checked)}
                />
              }
              label="Browser notifications"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={preferences.notifications.collaborationInvites}
                  onChange={(e) => handleNotificationChange('collaborationInvites', e.target.checked)}
                />
              }
              label="Collaboration invites"
            />
          </Box>
        </CardContent>
      </Card>
    </Container>
  );
};

export default ProfilePage;