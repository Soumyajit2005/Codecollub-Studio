import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  Avatar,
  AvatarGroup,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  FormControl,
  InputLabel,
  Switch,
  FormControlLabel,
  Alert,
  Fab,
  Skeleton,
  Tabs,
  Tab,
  InputAdornment,
  Pagination,
  Paper,
  AppBar,
  Toolbar,
  Divider,
  Badge,
  Tooltip,
  CircularProgress
} from '@mui/material';
import {
  Add,
  MoreVert,
  People,
  Code,
  Schedule,
  PlayArrow,
  Edit,
  Delete,
  Share,
  Lock,
  Public,
  Search,
  FilterList,
  Logout,
  Settings,
  VideoCall,
  Dashboard as DashboardIcon,
  Notifications,
  AccountCircle
} from '@mui/icons-material';
import { 
  Plus, 
  Users, 
  Code as CodeIcon, 
  Clock, 
  Play, 
  Search as SearchIcon,
  Filter,
  Zap,
  Globe,
  LockIcon,
  MoreVertical,
  Calendar,
  TrendingUp,
  Palette,
  Terminal,
  Layers,
  Crown,
  Star,
  Bookmark,
  Settings as SettingsIcon,
  LogOut,
  Bell,
  User,
  BookOpen,
  Monitor
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useAuthStore } from '../store/authStore';
import roomService from '../services/room.service';
import authService from '../services/auth.service';
import toast from 'react-hot-toast';

const LANGUAGES = [
  { value: 'javascript', label: 'JavaScript', color: '#f7df1e', icon: '🟨' },
  { value: 'typescript', label: 'TypeScript', color: '#3178c6', icon: '🔵' },
  { value: 'python', label: 'Python', color: '#3776ab', icon: '🐍' },
  { value: 'cpp', label: 'C++', color: '#00599c', icon: '⚡' },
  { value: 'csharp', label: 'C#', color: '#239120', icon: '#️⃣' },
  { value: 'java', label: 'Java', color: '#ed8b00', icon: '☕' },
  { value: 'go', label: 'Go', color: '#00add8', icon: '🔵' },
  { value: 'rust', label: 'Rust', color: '#ce422b', icon: '🦀' }
];

const ROOM_TEMPLATES = [
  {
    id: 'blank',
    name: 'Blank Canvas',
    description: 'Start fresh with an empty project',
    icon: <Layers size={24} />,
    gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
  },
  {
    id: 'interview',
    name: 'Technical Interview',
    description: 'Perfect for coding interviews',
    icon: <Users size={24} />,
    gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
  },
  {
    id: 'study',
    name: 'Study Session',
    description: 'Learn and practice together',
    icon: <BookOpen size={24} />,
    gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)'
  },
  {
    id: 'presentation',
    name: 'Code Review',
    description: 'Present and review code',
    icon: <Monitor size={24} />,
    gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)'
  }
];

const DashboardPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, logout } = useAuthStore();
  const [activeTab, setActiveTab] = useState(0);
  const [myRooms, setMyRooms] = useState([]);
  const [publicRooms, setPublicRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [publicLoading, setPublicLoading] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [menuAnchorEl, setMenuAnchorEl] = useState(null);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [userMenuAnchor, setUserMenuAnchor] = useState(null);
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  
  // Public rooms filters
  const [searchTerm, setSearchTerm] = useState('');
  const [languageFilter, setLanguageFilter] = useState('');
  const [sortBy, setSortBy] = useState('recent');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Form handling
  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm({
    defaultValues: {
      name: '',
      description: '',
      language: 'javascript',
      isPublic: false,
      maxParticipants: 10
    }
  });

  // Profile form
  const { 
    register: registerProfile, 
    handleSubmit: handleSubmitProfile, 
    formState: { errors: profileErrors }, 
    reset: resetProfile, 
    setValue: setProfileValue 
  } = useForm({
    defaultValues: {
      firstName: user?.profile?.firstName || '',
      lastName: user?.profile?.lastName || '',
      bio: user?.profile?.bio || '',
      location: user?.profile?.location || '',
      website: user?.profile?.website || '',
      company: user?.profile?.company || ''
    }
  });

  const watchedValues = watch();

  useEffect(() => {
    loadMyRooms();
  }, []);

  // Update profile form when user data changes or dialog opens
  useEffect(() => {
    if (profileDialogOpen && user) {
      setProfileValue('firstName', user?.profile?.firstName || '');
      setProfileValue('lastName', user?.profile?.lastName || '');
      setProfileValue('bio', user?.profile?.bio || '');
      setProfileValue('location', user?.profile?.location || '');
      setProfileValue('website', user?.profile?.website || '');
      setProfileValue('company', user?.profile?.company || '');
    }
  }, [profileDialogOpen, user, setProfileValue]);

  useEffect(() => {
    if (activeTab === 1) {
      loadPublicRooms();
    }
  }, [activeTab, searchTerm, languageFilter, sortBy, currentPage]);

  const loadMyRooms = async () => {
    try {
      setLoading(true);
      const rooms = await roomService.getUserRooms();
      setMyRooms(rooms);
    } catch (error) {
      console.error('Failed to load rooms:', error);
      toast.error('Failed to load your rooms');
    } finally {
      setLoading(false);
    }
  };

  const loadPublicRooms = async () => {
    try {
      setPublicLoading(true);
      const params = {
        search: searchTerm,
        language: languageFilter,
        sortBy,
        page: currentPage,
        limit: 12
      };
      
      const response = await roomService.getPublicRooms(params);
      setPublicRooms(response.rooms || []);
      setTotalPages(response.totalPages || 1);
    } catch (error) {
      console.error('Failed to load public rooms:', error);
      toast.error('Failed to load public rooms');
    } finally {
      setPublicLoading(false);
    }
  };

  const handleCreateRoom = async (data) => {
    try {
      // Process tags from comma-separated string to array
      const tags = data.tags 
        ? data.tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0)
        : [];

      const room = await roomService.createRoom({
        ...data,
        tags,
        createdBy: user.id
      });
      
      toast.success('🎉 Room created successfully!');
      setCreateDialogOpen(false);
      reset();
      await loadMyRooms();
      navigate(`/room/${room.roomId || room._id}`);
    } catch (error) {
      console.error('Failed to create room:', error);
      toast.error('Failed to create room. Please try again.');
    }
  };

  const handleUpdateProfile = async (profileData) => {
    try {
      const updatedUser = await authService.updateProfile({
        profile: profileData
      });
      updateUser(updatedUser);
      setProfileDialogOpen(false);
      toast.success('Profile updated successfully! 🎉');
    } catch (error) {
      console.error('Failed to update profile:', error);
      toast.error('Failed to update profile. Please try again.');
    }
  };

  const handleAvatarUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Basic file validation
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      toast.error('Image size must be less than 10MB');
      return;
    }

    try {
      setAvatarUploading(true);
      
      // Upload avatar through backend API (auth service will handle FormData creation)
      const updatedUser = await authService.uploadAvatar(file);
      updateUser(updatedUser);
      
      toast.success('Avatar updated successfully! ✨');
    } catch (error) {
      console.error('Failed to upload avatar:', error);
      toast.error('Failed to upload avatar. Please try again.');
    } finally {
      setAvatarUploading(false);
      // Clear file input
      event.target.value = '';
    }
  };

  const handleJoinRoom = (roomId) => {
    navigate(`/room/${roomId}`);
  };

  const handleDeleteRoom = async (roomId) => {
    if (!window.confirm('Are you sure you want to delete this room?')) return;
    
    try {
      await roomService.deleteRoom(roomId);
      toast.success('Room deleted successfully');
      await loadMyRooms();
    } catch (error) {
      console.error('Failed to delete room:', error);
      toast.error('Failed to delete room');
    }
    setMenuAnchorEl(null);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return 'Today';
    } else if (diffInHours < 48) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString();
    }
  };

  const getLanguageInfo = (language) => {
    return LANGUAGES.find(lang => lang.value === language) || LANGUAGES[0];
  };

  const RoomCard = ({ room, isPublic = false }) => {
    const langInfo = getLanguageInfo(room.language);
    
    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
        whileHover={{ y: -4 }}
      >
        <Card
          elevation={0}
          sx={{
            height: '100%',
            background: 'rgba(255, 255, 255, 0.05)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '16px',
            overflow: 'hidden',
            transition: 'all 0.3s ease',
            '&:hover': {
              border: '1px solid rgba(102, 126, 234, 0.3)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
              transform: 'translateY(-2px)'
            }
          }}
        >
          {/* Card Header */}
          <Box
            sx={{
              background: langInfo.color ? 
                `linear-gradient(135deg, ${langInfo.color}40 0%, ${langInfo.color}20 100%)` :
                'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              p: 2,
              position: 'relative'
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Box sx={{ flex: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Typography 
                    variant="h6" 
                    sx={{ 
                      color: 'white', 
                      fontWeight: 700,
                      fontSize: '1.1rem'
                    }}
                  >
                    {room.name}
                  </Typography>
                  {room.isPublic && (
                    <Tooltip title="Public Room">
                      <Globe size={16} style={{ color: 'rgba(255, 255, 255, 0.8)' }} />
                    </Tooltip>
                  )}
                  {!room.isPublic && (
                    <Tooltip title="Private Room">
                      <LockIcon size={16} style={{ color: 'rgba(255, 255, 255, 0.8)' }} />
                    </Tooltip>
                  )}
                </Box>
                
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Chip
                    label={`${langInfo.icon} ${langInfo.label}`}
                    size="small"
                    sx={{
                      background: 'rgba(255, 255, 255, 0.2)',
                      color: 'white',
                      fontWeight: 600,
                      fontSize: '0.75rem'
                    }}
                  />
                  
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Users size={14} style={{ color: 'rgba(255, 255, 255, 0.8)' }} />
                    <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                      {room.participants?.length || 0}
                    </Typography>
                  </Box>
                </Box>
              </Box>

              {!isPublic && (
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedRoom(room);
                    setMenuAnchorEl(e.currentTarget);
                  }}
                  sx={{ color: 'rgba(255, 255, 255, 0.8)' }}
                >
                  <MoreVertical size={18} />
                </IconButton>
              )}
            </Box>
          </Box>

          {/* Card Content */}
          <CardContent sx={{ p: 2, pb: 1 }}>
            <Typography 
              variant="body2" 
              sx={{ 
                color: 'rgba(255, 255, 255, 0.8)',
                mb: 2,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                minHeight: '2.5em'
              }}
            >
              {room.description || 'No description provided'}
            </Typography>

            {/* Tags */}
            {room.tags && room.tags.length > 0 && (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1.5 }}>
                {room.tags.slice(0, 3).map((tag, index) => (
                  <Chip
                    key={index}
                    label={tag}
                    size="small"
                    variant="outlined"
                    sx={{
                      color: 'rgba(255, 255, 255, 0.8)',
                      borderColor: 'rgba(255, 255, 255, 0.3)',
                      fontSize: '0.7rem',
                      height: '24px',
                      '& .MuiChip-label': {
                        px: 1
                      }
                    }}
                  />
                ))}
                {room.tags.length > 3 && (
                  <Chip
                    label={`+${room.tags.length - 3}`}
                    size="small"
                    variant="outlined"
                    sx={{
                      color: 'rgba(255, 255, 255, 0.6)',
                      borderColor: 'rgba(255, 255, 255, 0.2)',
                      fontSize: '0.7rem',
                      height: '24px'
                    }}
                  />
                )}
              </Box>
            )}

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                <Clock size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                {formatDate(room.createdAt)}
              </Typography>

              {isPublic && room.createdBy && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Avatar 
                    src={room.createdBy.avatar}
                    sx={{ 
                      width: 20, 
                      height: 20, 
                      fontSize: '0.7rem',
                      bgcolor: room.createdBy.avatar ? 'transparent' : '#4285f4'
                    }}
                  >
                    {!room.createdBy.avatar && (room.createdBy.profile?.firstName?.charAt(0) || room.createdBy.username?.charAt(0))?.toUpperCase()}
                  </Avatar>
                  <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                    {room.createdBy.profile?.firstName || room.createdBy.username}
                  </Typography>
                </Box>
              )}
            </Box>
          </CardContent>

          {/* Card Actions */}
          <CardActions sx={{ p: 2, pt: 0 }}>
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              style={{ width: '100%' }}
            >
              <Button
                variant="contained"
                fullWidth
                startIcon={<Play size={18} />}
                onClick={() => handleJoinRoom(room.roomId || room._id)}
                sx={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  fontWeight: 600,
                  borderRadius: '12px',
                  textTransform: 'none',
                  py: 1,
                  '&:hover': {
                    background: 'linear-gradient(135deg, #5a67d8 0%, #6b46c1 100%)',
                    boxShadow: '0 8px 25px rgba(102, 126, 234, 0.3)'
                  }
                }}
              >
                Join Room
              </Button>
            </motion.div>
          </CardActions>
        </Card>
      </motion.div>
    );
  };

  return (
    <Box sx={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
      color: 'white'
    }}>
      {/* Modern App Bar */}
      <AppBar 
        position="sticky" 
        elevation={0}
        sx={{
          background: 'rgba(32, 33, 36, 0.95)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
        }}
      >
        <Toolbar sx={{ justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 1,
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                px: 2,
                py: 1,
                borderRadius: '12px'
              }}>
                <Zap size={24} color="white" />
                <Typography variant="h6" sx={{ fontWeight: 700, color: 'white' }}>
                  CodeCollab
                </Typography>
              </Box>
            </motion.div>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', mr: 2 }}>
              Welcome back, <strong>{user?.username}</strong>
            </Typography>

            <Tooltip title="Notifications">
              <IconButton sx={{ color: 'rgba(255,255,255,0.8)' }}>
                <Badge badgeContent={0} color="error">
                  <Bell size={20} />
                </Badge>
              </IconButton>
            </Tooltip>

            <Tooltip title={`${user?.profile?.firstName || user?.username} (${user?.email})`}>
              <IconButton 
                onClick={(e) => setUserMenuAnchor(e.currentTarget)}
                sx={{ color: 'rgba(255,255,255,0.8)' }}
              >
                <Avatar 
                  src={user?.avatar}
                  sx={{ 
                    width: 32, 
                    height: 32, 
                    bgcolor: user?.avatar ? 'transparent' : '#4285f4',
                    border: user?.avatar ? '2px solid rgba(255,255,255,0.2)' : 'none'
                  }}
                >
                  {!user?.avatar && (user?.profile?.firstName?.charAt(0) || user?.username?.charAt(0))?.toUpperCase()}
                </Avatar>
              </IconButton>
            </Tooltip>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Hero Section */}
      <Container maxWidth="xl" sx={{ pt: 4, pb: 2 }}>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Typography 
              variant="h3" 
              component="h1" 
              sx={{ 
                fontWeight: 800, 
                mb: 2,
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                color: 'transparent'
              }}
            >
              Your Collaborative Workspace
            </Typography>
            <Typography 
              variant="h6" 
              sx={{ 
                color: 'rgba(255, 255, 255, 0.7)', 
                mb: 4,
                maxWidth: '600px',
                mx: 'auto'
              }}
            >
              Code together, create together, learn together. Start a new session or join existing rooms.
            </Typography>

            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button
                variant="contained"
                size="large"
                startIcon={<Plus size={24} />}
                onClick={() => setCreateDialogOpen(true)}
                sx={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  fontWeight: 600,
                  px: 4,
                  py: 1.5,
                  borderRadius: '16px',
                  textTransform: 'none',
                  fontSize: '1.1rem',
                  boxShadow: '0 8px 32px rgba(102, 126, 234, 0.3)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #5a67d8 0%, #6b46c1 100%)',
                    boxShadow: '0 12px 40px rgba(102, 126, 234, 0.4)'
                  }
                }}
              >
                Create New Room
              </Button>
            </motion.div>
          </Box>
        </motion.div>
      </Container>

      {/* Main Content */}
      <Container maxWidth="xl" sx={{ pb: 4 }}>
        {/* Tabs */}
        <Paper
          elevation={0}
          sx={{
            background: 'rgba(255, 255, 255, 0.05)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '16px',
            mb: 3,
            overflow: 'hidden'
          }}
        >
          <Tabs
            value={activeTab}
            onChange={(e, newValue) => setActiveTab(newValue)}
            variant="fullWidth"
            sx={{
              '& .MuiTab-root': {
                color: 'rgba(255, 255, 255, 0.7)',
                fontWeight: 600,
                textTransform: 'none',
                fontSize: '1rem',
                py: 2
              },
              '& .Mui-selected': {
                color: '#4285f4'
              },
              '& .MuiTabs-indicator': {
                backgroundColor: '#4285f4',
                height: 3,
                borderRadius: '3px 3px 0 0'
              }
            }}
          >
            <Tab 
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Crown size={20} />
                  My Rooms
                  <Chip 
                    label={myRooms.length} 
                    size="small" 
                    sx={{ 
                      bgcolor: activeTab === 0 ? 'rgba(66, 133, 244, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                      color: 'white',
                      fontWeight: 600
                    }} 
                  />
                </Box>
              } 
            />
            <Tab 
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Globe size={20} />
                  Explore Rooms
                  <Chip 
                    label={publicRooms.length} 
                    size="small" 
                    sx={{ 
                      bgcolor: activeTab === 1 ? 'rgba(66, 133, 244, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                      color: 'white',
                      fontWeight: 600
                    }} 
                  />
                </Box>
              } 
            />
          </Tabs>
        </Paper>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          {/* My Rooms Tab */}
          {activeTab === 0 && (
            <motion.div
              key="my-rooms"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              {loading ? (
                <Grid container spacing={3}>
                  {[...Array(6)].map((_, index) => (
                    <Grid item xs={12} sm={6} md={4} key={index}>
                      <Skeleton
                        variant="rounded"
                        height={300}
                        sx={{
                          bgcolor: 'rgba(255, 255, 255, 0.1)',
                          borderRadius: '16px'
                        }}
                      />
                    </Grid>
                  ))}
                </Grid>
              ) : myRooms.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5 }}
                >
                  <Paper
                    elevation={0}
                    sx={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      backdropFilter: 'blur(20px)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '20px',
                      p: 6,
                      textAlign: 'center'
                    }}
                  >
                    <motion.div
                      animate={{
                        scale: [1, 1.1, 1],
                        rotate: [0, 5, -5, 0]
                      }}
                      transition={{
                        duration: 3,
                        repeat: Infinity,
                        repeatDelay: 2
                      }}
                    >
                      <CodeIcon size={80} style={{ color: '#667eea', marginBottom: 24 }} />
                    </motion.div>
                    <Typography variant="h5" sx={{ fontWeight: 600, mb: 2 }}>
                      No rooms yet
                    </Typography>
                    <Typography variant="body1" sx={{ color: 'rgba(255, 255, 255, 0.7)', mb: 3 }}>
                      🚀 Create your first collaborative coding room and start building amazing things together!
                    </Typography>
                    <Button
                      variant="contained"
                      startIcon={<Plus size={20} />}
                      onClick={() => setCreateDialogOpen(true)}
                      sx={{
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        borderRadius: '12px',
                        px: 3,
                        py: 1.5,
                        fontWeight: 600,
                        textTransform: 'none'
                      }}
                    >
                      Create Your First Room
                    </Button>
                  </Paper>
                </motion.div>
              ) : (
                <Grid container spacing={3}>
                  <AnimatePresence>
                    {myRooms.map((room) => (
                      <Grid item xs={12} sm={6} md={4} key={room._id}>
                        <RoomCard room={room} />
                      </Grid>
                    ))}
                  </AnimatePresence>
                </Grid>
              )}
            </motion.div>
          )}

          {/* Public Rooms Tab */}
          {activeTab === 1 && (
            <motion.div
              key="public-rooms"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              {/* Filters */}
              <Paper
                elevation={0}
                sx={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '16px',
                  p: 3,
                  mb: 3
                }}
              >
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      placeholder="Search rooms..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <SearchIcon size={20} style={{ color: 'rgba(255, 255, 255, 0.5)' }} />
                          </InputAdornment>
                        ),
                        sx: {
                          backgroundColor: 'rgba(255, 255, 255, 0.1)',
                          borderRadius: '12px',
                          color: 'white',
                          '& .MuiOutlinedInput-notchedOutline': {
                            border: 'none'
                          }
                        }
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <FormControl fullWidth>
                      <Select
                        value={languageFilter}
                        onChange={(e) => setLanguageFilter(e.target.value)}
                        displayEmpty
                        sx={{
                          backgroundColor: 'rgba(255, 255, 255, 0.1)',
                          borderRadius: '12px',
                          color: 'white',
                          '& .MuiOutlinedInput-notchedOutline': {
                            border: 'none'
                          },
                          '& .MuiSelect-icon': {
                            color: 'rgba(255, 255, 255, 0.7)'
                          }
                        }}
                      >
                        <MenuItem value="">All Languages</MenuItem>
                        {LANGUAGES.map((lang) => (
                          <MenuItem key={lang.value} value={lang.value}>
                            {lang.icon} {lang.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <FormControl fullWidth>
                      <Select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        sx={{
                          backgroundColor: 'rgba(255, 255, 255, 0.1)',
                          borderRadius: '12px',
                          color: 'white',
                          '& .MuiOutlinedInput-notchedOutline': {
                            border: 'none'
                          },
                          '& .MuiSelect-icon': {
                            color: 'rgba(255, 255, 255, 0.7)'
                          }
                        }}
                      >
                        <MenuItem value="recent">Recently Created</MenuItem>
                        <MenuItem value="popular">Most Popular</MenuItem>
                        <MenuItem value="active">Most Active</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={2}>
                    <Button
                      fullWidth
                      variant="outlined"
                      startIcon={<Filter size={18} />}
                      sx={{
                        borderColor: 'rgba(255, 255, 255, 0.2)',
                        color: 'rgba(255, 255, 255, 0.8)',
                        borderRadius: '12px',
                        textTransform: 'none',
                        '&:hover': {
                          borderColor: '#4285f4',
                          color: '#4285f4'
                        }
                      }}
                    >
                      Filter
                    </Button>
                  </Grid>
                </Grid>
              </Paper>

              {/* Public Rooms Grid */}
              {publicLoading ? (
                <Grid container spacing={3}>
                  {[...Array(6)].map((_, index) => (
                    <Grid item xs={12} sm={6} md={4} key={index}>
                      <Skeleton
                        variant="rounded"
                        height={300}
                        sx={{
                          bgcolor: 'rgba(255, 255, 255, 0.1)',
                          borderRadius: '16px'
                        }}
                      />
                    </Grid>
                  ))}
                </Grid>
              ) : publicRooms.length === 0 ? (
                <Paper
                  elevation={0}
                  sx={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '20px',
                    p: 6,
                    textAlign: 'center'
                  }}
                >
                  <Globe size={80} style={{ color: '#667eea', marginBottom: 24 }} />
                  <Typography variant="h5" sx={{ fontWeight: 600, mb: 2 }}>
                    No public rooms found
                  </Typography>
                  <Typography variant="body1" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                    Try adjusting your search filters or create a public room to get started!
                  </Typography>
                </Paper>
              ) : (
                <>
                  <Grid container spacing={3}>
                    <AnimatePresence>
                      {publicRooms.map((room) => (
                        <Grid item xs={12} sm={6} md={4} key={room._id}>
                          <RoomCard room={room} isPublic />
                        </Grid>
                      ))}
                    </AnimatePresence>
                  </Grid>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                      <Pagination
                        count={totalPages}
                        page={currentPage}
                        onChange={(e, page) => setCurrentPage(page)}
                        color="primary"
                        sx={{
                          '& .MuiPaginationItem-root': {
                            color: 'rgba(255, 255, 255, 0.8)',
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            '&:hover': {
                              backgroundColor: 'rgba(255, 255, 255, 0.1)'
                            },
                            '&.Mui-selected': {
                              backgroundColor: '#4285f4',
                              color: 'white'
                            }
                          }
                        }}
                      />
                    </Box>
                  )}
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </Container>

      {/* Create Room Dialog */}
      <Dialog 
        open={createDialogOpen} 
        onClose={() => setCreateDialogOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            background: 'rgba(32, 33, 36, 0.95)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '20px',
            color: 'white'
          }
        }}
      >
        <DialogTitle sx={{ pb: 2 }}>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            🚀 Create New Room
          </Typography>
          <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
            Set up your collaborative coding environment
          </Typography>
        </DialogTitle>
        
        <form onSubmit={handleSubmit(handleCreateRoom)}>
          <DialogContent sx={{ pb: 2 }}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <TextField
                  {...register('name', { required: 'Room name is required' })}
                  label="Room Name"
                  fullWidth
                  error={!!errors.name}
                  helperText={errors.name?.message}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      borderRadius: '12px',
                      color: 'white'
                    },
                    '& .MuiInputLabel-root': {
                      color: 'rgba(255, 255, 255, 0.7)'
                    }
                  }}
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  {...register('description')}
                  label="Description (Optional)"
                  fullWidth
                  multiline
                  rows={3}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      borderRadius: '12px',
                      color: 'white'
                    },
                    '& .MuiInputLabel-root': {
                      color: 'rgba(255, 255, 255, 0.7)'
                    }
                  }}
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  {...register('tags')}
                  label="Tags (comma-separated)"
                  placeholder="e.g., react, backend, tutorial, beginner"
                  fullWidth
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      borderRadius: '12px',
                      color: 'white'
                    },
                    '& .MuiInputLabel-root': {
                      color: 'rgba(255, 255, 255, 0.7)'
                    }
                  }}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                    Programming Language
                  </InputLabel>
                  <Select
                    {...register('language')}
                    value={watchedValues.language}
                    sx={{
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      borderRadius: '12px',
                      color: 'white'
                    }}
                  >
                    {LANGUAGES.map((lang) => (
                      <MenuItem key={lang.value} value={lang.value}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box
                            sx={{
                              width: 12,
                              height: 12,
                              borderRadius: '50%',
                              backgroundColor: lang.color
                            }}
                          />
                          {lang.icon} {lang.label}
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  {...register('maxParticipants', { 
                    min: { value: 2, message: 'Minimum 2 participants' },
                    max: { value: 50, message: 'Maximum 50 participants' }
                  })}
                  label="Max Participants"
                  type="number"
                  fullWidth
                  error={!!errors.maxParticipants}
                  helperText={errors.maxParticipants?.message}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      borderRadius: '12px',
                      color: 'white'
                    },
                    '& .MuiInputLabel-root': {
                      color: 'rgba(255, 255, 255, 0.7)'
                    }
                  }}
                />
              </Grid>

              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      {...register('isPublic')}
                      checked={watchedValues.isPublic}
                      sx={{
                        '& .MuiSwitch-switchBase.Mui-checked': {
                          color: '#4285f4'
                        },
                        '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                          backgroundColor: '#4285f4'
                        }
                      }}
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body1" sx={{ fontWeight: 600 }}>
                        Make this room public
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                        Other users can discover and join this room
                      </Typography>
                    </Box>
                  }
                />
              </Grid>
            </Grid>
          </DialogContent>
          
          <DialogActions sx={{ p: 3, pt: 2 }}>
            <Button 
              onClick={() => setCreateDialogOpen(false)}
              sx={{ 
                color: 'rgba(255, 255, 255, 0.7)',
                borderRadius: '12px',
                textTransform: 'none'
              }}
            >
              Cancel
            </Button>
            <Button 
              type="submit"
              variant="contained"
              sx={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                borderRadius: '12px',
                px: 3,
                fontWeight: 600,
                textTransform: 'none',
                '&:hover': {
                  background: 'linear-gradient(135deg, #5a67d8 0%, #6b46c1 100%)'
                }
              }}
            >
              Create Room
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Profile Settings Dialog */}
      <Dialog 
        open={profileDialogOpen} 
        onClose={() => setProfileDialogOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            background: 'linear-gradient(135deg, #1e1e1e 0%, #2d2d2d 100%)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '16px',
            color: 'white'
          }
        }}
      >
        <DialogTitle sx={{ pb: 2 }}>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            👤 Profile Settings
          </Typography>
          <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
            Update your profile information and preferences
          </Typography>
        </DialogTitle>
        
        <form onSubmit={handleSubmitProfile(handleUpdateProfile)}>
          <DialogContent sx={{ pb: 2 }}>
            <Grid container spacing={3}>
              {/* Profile Picture Section */}
              <Grid item xs={12} sx={{ textAlign: 'center', mb: 2 }}>
                <Box sx={{ position: 'relative', display: 'inline-block' }}>
                  <Avatar 
                    src={user?.avatar}
                    sx={{ 
                      width: 120, 
                      height: 120, 
                      mx: 'auto',
                      mb: 2,
                      bgcolor: user?.avatar ? 'transparent' : '#4285f4',
                      border: '4px solid rgba(255,255,255,0.2)',
                      fontSize: '2rem',
                      cursor: avatarUploading ? 'not-allowed' : 'pointer',
                      opacity: avatarUploading ? 0.7 : 1
                    }}
                  >
                    {!user?.avatar && (user?.profile?.firstName?.charAt(0) || user?.username?.charAt(0))?.toUpperCase()}
                  </Avatar>
                  {avatarUploading && (
                    <CircularProgress
                      size={30}
                      sx={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        marginTop: '-15px',
                        marginLeft: '-15px',
                        color: 'white'
                      }}
                    />
                  )}
                </Box>
                
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  style={{ display: 'none' }}
                  id="avatar-upload"
                  disabled={avatarUploading}
                />
                
                <Button
                  component="label"
                  htmlFor="avatar-upload"
                  variant="outlined"
                  size="small"
                  disabled={avatarUploading}
                  sx={{
                    color: 'rgba(255, 255, 255, 0.8)',
                    borderColor: 'rgba(255, 255, 255, 0.3)',
                    '&:hover': {
                      borderColor: 'rgba(255, 255, 255, 0.5)',
                      backgroundColor: 'rgba(255, 255, 255, 0.1)'
                    },
                    '&:disabled': {
                      color: 'rgba(255, 255, 255, 0.5)',
                      borderColor: 'rgba(255, 255, 255, 0.2)'
                    }
                  }}
                >
                  {avatarUploading ? 'Uploading...' : '📸 Change Avatar'}
                </Button>
              </Grid>

              {/* Name Fields */}
              <Grid item xs={12} md={6}>
                <TextField
                  {...registerProfile('firstName')}
                  label="First Name"
                  fullWidth
                  error={!!profileErrors.firstName}
                  helperText={profileErrors.firstName?.message}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      borderRadius: '12px',
                      color: 'white'
                    },
                    '& .MuiInputLabel-root': {
                      color: 'rgba(255, 255, 255, 0.7)'
                    }
                  }}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  {...registerProfile('lastName')}
                  label="Last Name"
                  fullWidth
                  error={!!profileErrors.lastName}
                  helperText={profileErrors.lastName?.message}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      borderRadius: '12px',
                      color: 'white'
                    },
                    '& .MuiInputLabel-root': {
                      color: 'rgba(255, 255, 255, 0.7)'
                    }
                  }}
                />
              </Grid>

              {/* Bio */}
              <Grid item xs={12}>
                <TextField
                  {...registerProfile('bio')}
                  label="Bio"
                  fullWidth
                  multiline
                  rows={3}
                  placeholder="Tell us about yourself..."
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      borderRadius: '12px',
                      color: 'white'
                    },
                    '& .MuiInputLabel-root': {
                      color: 'rgba(255, 255, 255, 0.7)'
                    }
                  }}
                />
              </Grid>

              {/* Location */}
              <Grid item xs={12} md={6}>
                <TextField
                  {...registerProfile('location')}
                  label="Location"
                  fullWidth
                  placeholder="City, Country"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      borderRadius: '12px',
                      color: 'white'
                    },
                    '& .MuiInputLabel-root': {
                      color: 'rgba(255, 255, 255, 0.7)'
                    }
                  }}
                />
              </Grid>

              {/* Company */}
              <Grid item xs={12} md={6}>
                <TextField
                  {...registerProfile('company')}
                  label="Company"
                  fullWidth
                  placeholder="Your company or organization"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      borderRadius: '12px',
                      color: 'white'
                    },
                    '& .MuiInputLabel-root': {
                      color: 'rgba(255, 255, 255, 0.7)'
                    }
                  }}
                />
              </Grid>

              {/* Website */}
              <Grid item xs={12}>
                <TextField
                  {...registerProfile('website')}
                  label="Website"
                  fullWidth
                  placeholder="https://yourwebsite.com"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      borderRadius: '12px',
                      color: 'white'
                    },
                    '& .MuiInputLabel-root': {
                      color: 'rgba(255, 255, 255, 0.7)'
                    }
                  }}
                />
              </Grid>
            </Grid>
          </DialogContent>
          
          <DialogActions sx={{ p: 3, pt: 2 }}>
            <Button 
              onClick={() => setProfileDialogOpen(false)}
              sx={{
                color: 'rgba(255, 255, 255, 0.7)',
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.1)'
                }
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              sx={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                fontWeight: 600,
                borderRadius: '12px',
                textTransform: 'none',
                px: 3,
                py: 1,
                '&:hover': {
                  background: 'linear-gradient(135deg, #5a67d8 0%, #6b46c1 100%)',
                  boxShadow: '0 8px 25px rgba(102, 126, 234, 0.3)'
                }
              }}
            >
              Save Profile
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Room Actions Menu */}
      <Menu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl) && Boolean(selectedRoom)}
        onClose={() => {
          setMenuAnchorEl(null);
          setSelectedRoom(null);
        }}
        PaperProps={{
          sx: {
            background: 'rgba(32, 33, 36, 0.95)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '12px',
            color: 'white'
          }
        }}
      >
        <MenuItem onClick={() => selectedRoom && handleJoinRoom(selectedRoom._id)}>
          <Play size={18} style={{ marginRight: 8 }} />
          Join Room
        </MenuItem>
        <MenuItem onClick={() => navigator.share && navigator.share({ 
          title: selectedRoom?.name, 
          url: `${window.location.origin}/room/${selectedRoom?._id}` 
        })}>
          <Share size={18} style={{ marginRight: 8 }} />
          Share Room
        </MenuItem>
        <Divider sx={{ bgcolor: 'rgba(255, 255, 255, 0.1)' }} />
        <MenuItem 
          onClick={() => selectedRoom && handleDeleteRoom(selectedRoom._id)}
          sx={{ color: '#f44336' }}
        >
          <Delete size={18} style={{ marginRight: 8 }} />
          Delete Room
        </MenuItem>
      </Menu>

      {/* User Menu */}
      <Menu
        anchorEl={userMenuAnchor}
        open={Boolean(userMenuAnchor)}
        onClose={() => setUserMenuAnchor(null)}
        onClick={() => setUserMenuAnchor(null)}
        PaperProps={{
          sx: {
            background: 'rgba(32, 33, 36, 0.95)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '12px',
            color: 'white',
            minWidth: 200
          }
        }}
      >
        <MenuItem onClick={() => {setProfileDialogOpen(true); setUserMenuAnchor(null);}}>
          <User size={18} style={{ marginRight: 8 }} />
          Profile Settings
        </MenuItem>
        <MenuItem>
          <SettingsIcon size={18} style={{ marginRight: 8 }} />
          Preferences
        </MenuItem>
        <Divider sx={{ bgcolor: 'rgba(255, 255, 255, 0.1)' }} />
        <MenuItem 
          onClick={() => {
            logout();
            navigate('/login');
          }}
          sx={{ color: '#f44336' }}
        >
          <LogOut size={18} style={{ marginRight: 8 }} />
          Sign Out
        </MenuItem>
      </Menu>

      {/* Floating Action Button - Quick Create */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          zIndex: 1000
        }}
      >
        <Tooltip title="Quick Create Room">
          <Fab
            color="primary"
            size="large"
            onClick={() => setCreateDialogOpen(true)}
            sx={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              boxShadow: '0 8px 32px rgba(102, 126, 234, 0.3)',
              '&:hover': {
                background: 'linear-gradient(135deg, #5a67d8 0%, #6b46c1 100%)',
                boxShadow: '0 12px 40px rgba(102, 126, 234, 0.4)'
              }
            }}
          >
            <Plus size={28} />
          </Fab>
        </Tooltip>
      </motion.div>
    </Box>
  );
};

export default DashboardPage;