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
  Paper
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
  FilterList
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
  TrendingUp
} from 'lucide-react';
import { useForm } from 'react-hook-form';
// Removed date-fns import - using native Date methods instead
import { useAuthStore } from '../store/authStore';
import roomService from '../services/room.service';
import toast from 'react-hot-toast';

const LANGUAGES = [
  { value: 'javascript', label: 'JavaScript', color: '#f7df1e' },
  { value: 'typescript', label: 'TypeScript', color: '#3178c6' },
  { value: 'python', label: 'Python', color: '#3776ab' },
  { value: 'cpp', label: 'C++', color: '#00599c' },
  { value: 'csharp', label: 'C#', color: '#239120' },
  { value: 'java', label: 'Java', color: '#ed8b00' },
  { value: 'go', label: 'Go', color: '#00add8' },
  { value: 'rust', label: 'Rust', color: '#000000' }
];

const DashboardPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState(0);
  const [myRooms, setMyRooms] = useState([]);
  const [publicRooms, setPublicRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [publicLoading, setPublicLoading] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [menuAnchorEl, setMenuAnchorEl] = useState(null);
  const [selectedRoom, setSelectedRoom] = useState(null);
  
  // Public rooms filters
  const [searchTerm, setSearchTerm] = useState('');
  const [languageFilter, setLanguageFilter] = useState('');
  const [sortBy, setSortBy] = useState('recent');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm({
    defaultValues: {
      name: '',
      language: 'javascript',
      isPublic: false,
      description: ''
    }
  });

  useEffect(() => {
    fetchMyRooms();
    
    // Check if create dialog should be opened
    if (searchParams.get('create') === 'true') {
      setCreateDialogOpen(true);
      setSearchParams({});
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    if (activeTab === 1) {
      fetchPublicRooms();
    }
  }, [activeTab, searchTerm, languageFilter, sortBy]);

  const fetchMyRooms = async () => {
    try {
      setLoading(true);
      const response = await roomService.getRooms(1, 50);
      setMyRooms(response.rooms || []);
    } catch (error) {
      console.error('Failed to fetch my rooms:', error);
      toast.error('Failed to load your rooms');
    } finally {
      setLoading(false);
    }
  };

  const fetchPublicRooms = async () => {
    try {
      setPublicLoading(true);
      const response = await roomService.getPublicRooms({
        search: searchTerm,
        language: languageFilter,
        sortBy,
        page: 1,
        limit: 24
      });
      setPublicRooms(response.rooms || []);
    } catch (error) {
      console.error('Failed to fetch public rooms:', error);
      toast.error('Failed to load public rooms');
    } finally {
      setPublicLoading(false);
    }
  };

  const handleCreateRoom = async (data) => {
    try {
      const room = await roomService.createRoom(data);
      setMyRooms(prev => [room, ...prev]);
      setCreateDialogOpen(false);
      reset();
      navigate(`/room/${room.roomId}`);
    } catch (error) {
      console.error('Failed to create room:', error);
    }
  };

  const handleJoinRoom = async (room) => {
    try {
      await roomService.joinRoom(room.roomId);
      navigate(`/room/${room.roomId}`);
    } catch (error) {
      console.error('Failed to join room:', error);
    }
  };

  const handleMenuOpen = (event, room) => {
    setMenuAnchorEl(event.currentTarget);
    setSelectedRoom(room);
  };

  const handleMenuClose = () => {
    setMenuAnchorEl(null);
    setSelectedRoom(null);
  };

  const handleDeleteRoom = async () => {
    if (!selectedRoom) return;
    
    try {
      await roomService.deleteRoom(selectedRoom._id);
      setRooms(prev => prev.filter(room => room._id !== selectedRoom._id));
      toast.success('Room deleted successfully');
    } catch (error) {
      console.error('Failed to delete room:', error);
    }
    
    handleMenuClose();
  };

  const getLanguageInfo = (language) => {
    return LANGUAGES.find(lang => lang.value === language) || LANGUAGES[0];
  };

  const isOwner = (room) => {
    return room.owner._id === user?._id;
  };

  return (
    <>
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
      <Box
        sx={{
          position: 'absolute',
          bottom: '20%',
          left: '-10%',
          width: '40%',
          height: '40%',
          background: 'radial-gradient(circle, rgba(255,255,255,0.03) 0%, transparent 70%)',
          borderRadius: '50%',
          animation: 'float 12s ease-in-out infinite reverse',
        }}
      />

      <Container maxWidth="xl" sx={{ py: 4, position: 'relative', zIndex: 1 }}>
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <Box sx={{ mb: 6, textAlign: 'center' }}>
            <Typography 
              variant="h3" 
              component="h1" 
              sx={{ 
                color: 'white',
                fontWeight: 700,
                mb: 2,
                textShadow: '0 2px 20px rgba(0,0,0,0.3)',
              }}
            >
              Welcome back, {user?.username}! 👋
            </Typography>
            <Typography 
              variant="h6" 
              sx={{ 
                color: 'rgba(255, 255, 255, 0.8)',
                fontWeight: 400,
                maxWidth: '600px',
                mx: 'auto'
              }}
            >
              Your collaborative coding workspace
            </Typography>
          </Box>
        </motion.div>

        {/* Stats Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <Grid container spacing={3} sx={{ mb: 6 }}>
            {[
              {
                icon: <CodeIcon size={28} />,
                value: myRooms.length,
                label: 'Total Rooms',
                gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                delay: 0
              },
              {
                icon: <Users size={28} />,
                value: myRooms.filter(room => isOwner(room)).length,
                label: 'Owned Rooms',
                gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                delay: 0.1
              },
              {
                icon: <Clock size={28} />,
                value: myRooms.filter(room => 
                  new Date(room.lastModified) > new Date(Date.now() - 24 * 60 * 60 * 1000)
                ).length,
                label: 'Active Today',
                gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                delay: 0.2
              },
              {
                icon: <Zap size={28} />,
                value: 0,
                label: 'Executions',
                gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
                delay: 0.3
              }
            ].map((stat, index) => (
              <Grid item xs={12} sm={6} md={3} key={index}>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: stat.delay }}
                  whileHover={{ 
                    y: -5,
                    transition: { duration: 0.2 }
                  }}
                >
                  <Paper
                    elevation={0}
                    sx={{
                      background: 'rgba(255, 255, 255, 0.1)',
                      backdropFilter: 'blur(20px)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '20px',
                      p: 3,
                      height: '140px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      position: 'relative',
                      overflow: 'hidden',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        background: 'rgba(255, 255, 255, 0.15)',
                        transform: 'translateY(-5px)',
                        boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
                      }
                    }}
                  >
                    <Box
                      sx={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: '4px',
                        background: stat.gradient,
                      }}
                    />
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: 50,
                          height: 50,
                          borderRadius: '12px',
                          background: stat.gradient,
                          mr: 2,
                          color: 'white'
                        }}
                      >
                        {stat.icon}
                      </Box>
                      <Box>
                        <Typography 
                          variant="h4" 
                          sx={{ 
                            color: 'white',
                            fontWeight: 700,
                            lineHeight: 1
                          }}
                        >
                          {stat.value}
                        </Typography>
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            color: 'rgba(255, 255, 255, 0.8)',
                            fontWeight: 500
                          }}
                        >
                          {stat.label}
                        </Typography>
                      </Box>
                    </Box>
                  </Paper>
                </motion.div>
              </Grid>
            ))}
          </Grid>
        </motion.div>

        {/* Rooms Section with Tabs */}
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
              borderRadius: '20px',
              p: 3,
              mb: 4,
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
              <Tabs 
                value={activeTab} 
                onChange={(e, newValue) => setActiveTab(newValue)}
                sx={{
                  '& .MuiTab-root': {
                    color: 'rgba(255, 255, 255, 0.7)',
                    fontWeight: 600,
                    fontSize: '1.1rem',
                    textTransform: 'none',
                    minHeight: 48,
                    '&.Mui-selected': {
                      color: 'white',
                    },
                  },
                  '& .MuiTabs-indicator': {
                    backgroundColor: 'white',
                    height: 3,
                    borderRadius: '2px',
                  },
                }}
              >
                <Tab label="My Rooms" />
                <Tab label="Browse Public Rooms" />
              </Tabs>
              
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
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
                    textTransform: 'none',
                    boxShadow: '0 8px 32px rgba(102, 126, 234, 0.3)',
                    '&:hover': {
                      boxShadow: '0 12px 40px rgba(102, 126, 234, 0.5)',
                    },
                  }}
                >
                  Create Room
                </Button>
              </motion.div>
            </Box>

            {/* Search and Filter Bar for Public Rooms */}
            <AnimatePresence>
              {activeTab === 1 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                    <TextField
                      size="medium"
                      placeholder="Search public rooms..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      sx={{
                        minWidth: 280,
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
                        '& .MuiInputBase-input::placeholder': {
                          color: 'rgba(255, 255, 255, 0.7)',
                          opacity: 1,
                        },
                      }}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <SearchIcon size={20} color="rgba(255, 255, 255, 0.7)" />
                          </InputAdornment>
                        ),
                      }}
                    />
                    <FormControl 
                      size="medium" 
                      sx={{ 
                        minWidth: 160,
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
                      <InputLabel>Language</InputLabel>
                      <Select
                        value={languageFilter}
                        label="Language"
                        onChange={(e) => setLanguageFilter(e.target.value)}
                        sx={{
                          color: 'white',
                          '& .MuiSelect-icon': {
                            color: 'rgba(255, 255, 255, 0.7)',
                          },
                        }}
                      >
                        <MenuItem value="">All Languages</MenuItem>
                        {LANGUAGES.map((lang) => (
                          <MenuItem key={lang.value} value={lang.value}>
                            {lang.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    <FormControl 
                      size="medium" 
                      sx={{ 
                        minWidth: 140,
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
                      <InputLabel>Sort By</InputLabel>
                      <Select
                        value={sortBy}
                        label="Sort By"
                        onChange={(e) => setSortBy(e.target.value)}
                        sx={{
                          color: 'white',
                          '& .MuiSelect-icon': {
                            color: 'rgba(255, 255, 255, 0.7)',
                          },
                        }}
                      >
                        <MenuItem value="recent">Recent</MenuItem>
                        <MenuItem value="popular">Popular</MenuItem>
                        <MenuItem value="name">Name</MenuItem>
                      </Select>
                    </FormControl>
                  </Box>
                </motion.div>
              )}
            </AnimatePresence>
          </Paper>
        </motion.div>

      {/* Rooms Content */}
      {activeTab === 0 ? (
        // My Rooms Tab
        loading ? (
          <Grid container spacing={3}>
            {[...Array(6)].map((_, index) => (
              <Grid item xs={12} sm={6} md={4} key={index}>
                <Card>
                  <CardContent>
                    <Skeleton variant="text" width="60%" height={32} />
                    <Skeleton variant="text" width="100%" />
                    <Skeleton variant="text" width="80%" />
                    <Box sx={{ mt: 2 }}>
                      <Skeleton variant="circular" width={24} height={24} />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        ) : myRooms.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Paper
              elevation={0}
              sx={{
                textAlign: 'center',
                py: 8,
                px: 4,
                background: 'rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '24px',
              }}
            >
              <motion.div
                animate={{ 
                  rotate: [0, 10, -10, 0],
                  scale: [1, 1.1, 1]
                }}
                transition={{ 
                  duration: 2,
                  repeat: Infinity,
                  repeatDelay: 3
                }}
              >
                <CodeIcon size={80} color="rgba(255, 255, 255, 0.7)" style={{ marginBottom: 24 }} />
              </motion.div>
              <Typography variant="h5" sx={{ color: 'white', mb: 2, fontWeight: 600 }}>
                No rooms yet
              </Typography>
              <Typography variant="body1" sx={{ color: 'rgba(255, 255, 255, 0.8)', mb: 4, maxWidth: '400px', mx: 'auto' }}>
                Create your first collaborative coding room to get started
              </Typography>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button
                  variant="contained"
                  startIcon={<Plus size={20} />}
                  onClick={() => setCreateDialogOpen(true)}
                  sx={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    borderRadius: '12px',
                    px: 4,
                    py: 1.5,
                    fontWeight: 600,
                    textTransform: 'none',
                    fontSize: '1.1rem',
                    boxShadow: '0 8px 32px rgba(102, 126, 234, 0.3)',
                  }}
                >
                  Create Your First Room
                </Button>
              </motion.div>
            </Paper>
          </motion.div>
        ) : (
          <Grid container spacing={3}>
            {myRooms.map((room, index) => {
              const languageInfo = getLanguageInfo(room.language);
              
              return (
                <Grid item xs={12} sm={6} md={4} key={room._id}>
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: index * 0.1 }}
                    whileHover={{ y: -8, transition: { duration: 0.2 } }}
                  >
                    <Paper
                      elevation={0}
                      sx={{
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        background: 'rgba(255, 255, 255, 0.1)',
                        backdropFilter: 'blur(20px)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: '20px',
                        overflow: 'hidden',
                        position: 'relative',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        '&:hover': {
                          background: 'rgba(255, 255, 255, 0.15)',
                          boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
                        }
                      }}
                    >
                      <Box
                        sx={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          right: 0,
                          height: '4px',
                          background: `linear-gradient(90deg, ${languageInfo.color}, ${languageInfo.color}aa)`,
                        }}
                      />
                      
                      <CardContent sx={{ flexGrow: 1, p: 3 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                          <Typography 
                            variant="h6" 
                            component="h3" 
                            noWrap 
                            sx={{ 
                              flexGrow: 1,
                              color: 'white',
                              fontWeight: 600,
                              fontSize: '1.2rem'
                            }}
                          >
                            {room.name}
                          </Typography>
                          <IconButton 
                            size="small" 
                            onClick={(e) => handleMenuOpen(e, room)}
                            disabled={!isOwner(room)}
                            sx={{ 
                              color: 'rgba(255, 255, 255, 0.7)',
                              '&:hover': {
                                color: 'white',
                                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                              }
                            }}
                          >
                            <MoreVertical size={18} />
                          </IconButton>
                        </Box>
                        
                        <Box sx={{ display: 'flex', gap: 1, mb: 3, flexWrap: 'wrap' }}>
                          <Chip
                            label={languageInfo.label}
                            size="small"
                            sx={{ 
                              bgcolor: `${languageInfo.color}30`,
                              color: languageInfo.color,
                              fontWeight: 600,
                              border: `1px solid ${languageInfo.color}50`,
                              '& .MuiChip-label': {
                                fontSize: '0.75rem'
                              }
                            }}
                          />
                          <Chip
                            icon={room.isPublic ? <Globe size={14} /> : <LockIcon size={14} />}
                            label={room.isPublic ? 'Public' : 'Private'}
                            size="small"
                            sx={{
                              bgcolor: room.isPublic ? 'rgba(76, 175, 80, 0.2)' : 'rgba(158, 158, 158, 0.2)',
                              color: room.isPublic ? '#4caf50' : '#9e9e9e',
                              border: room.isPublic ? '1px solid rgba(76, 175, 80, 0.5)' : '1px solid rgba(158, 158, 158, 0.5)',
                              '& .MuiChip-label': {
                                fontSize: '0.75rem'
                              }
                            }}
                          />
                          {room.userRole && (
                            <Chip
                              label={room.userRole}
                              size="small"
                              sx={{
                                bgcolor: 'rgba(103, 58, 183, 0.2)',
                                color: '#673ab7',
                                border: '1px solid rgba(103, 58, 183, 0.5)',
                                '& .MuiChip-label': {
                                  fontSize: '0.75rem'
                                }
                              }}
                            />
                          )}
                        </Box>
                        
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            color: 'rgba(255, 255, 255, 0.8)', 
                            mb: 3,
                            fontSize: '0.9rem'
                          }}
                        >
                          Owner: {room.owner.username}
                        </Typography>
                        
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                          <AvatarGroup max={4} sx={{ '& .MuiAvatar-root': { width: 28, height: 28, fontSize: '0.8rem', border: '2px solid rgba(255,255,255,0.3)' } }}>
                            {room.participants?.map((participant, index) => (
                              <Avatar 
                                key={index} 
                                sx={{ 
                                  bgcolor: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                  color: 'white',
                                  fontSize: '0.8rem'
                                }}
                              >
                                {participant.user.username.charAt(0).toUpperCase()}
                              </Avatar>
                            ))}
                          </AvatarGroup>
                          <Typography 
                            variant="caption" 
                            sx={{ 
                              color: 'rgba(255, 255, 255, 0.7)',
                              fontSize: '0.8rem',
                              fontWeight: 500
                            }}
                          >
                            {room.participantCount || room.participants?.length || 0} participants
                          </Typography>
                        </Box>
                        
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Calendar size={14} color="rgba(255, 255, 255, 0.6)" />
                          <Typography 
                            variant="caption" 
                            sx={{ 
                              color: 'rgba(255, 255, 255, 0.6)',
                              fontSize: '0.8rem'
                            }}
                          >
                            Modified {new Date(room.lastModified).toLocaleDateString()}
                          </Typography>
                        </Box>
                      </CardContent>
                      
                      <CardActions sx={{ p: 3, pt: 0 }}>
                        <motion.div 
                          style={{ width: '100%' }}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <Button
                            fullWidth
                            variant="contained"
                            startIcon={<Play size={18} />}
                            onClick={() => handleJoinRoom(room)}
                            sx={{
                              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                              borderRadius: '12px',
                              py: 1.5,
                              fontWeight: 600,
                              textTransform: 'none',
                              fontSize: '1rem',
                              boxShadow: '0 4px 20px rgba(102, 126, 234, 0.3)',
                              '&:hover': {
                                boxShadow: '0 8px 30px rgba(102, 126, 234, 0.4)',
                              }
                            }}
                          >
                            Join Room
                          </Button>
                        </motion.div>
                      </CardActions>
                    </Paper>
                  </motion.div>
                </Grid>
              );
            })}
          </Grid>
        )
      ) : (
        // Browse Public Rooms Tab
        publicLoading ? (
          <Grid container spacing={3}>
            {[...Array(12)].map((_, index) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={index}>
                <Card>
                  <CardContent>
                    <Skeleton variant="text" width="60%" height={32} />
                    <Skeleton variant="text" width="100%" />
                    <Skeleton variant="text" width="80%" />
                    <Box sx={{ mt: 2 }}>
                      <Skeleton variant="circular" width={24} height={24} />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        ) : publicRooms.length === 0 ? (
          <Card sx={{ textAlign: 'center', py: 8 }}>
            <CardContent>
              <Public sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                No public rooms found
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Try adjusting your search filters or create the first public room!
              </Typography>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => setCreateDialogOpen(true)}
              >
                Create Public Room
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Grid container spacing={3}>
            {publicRooms.map((room) => {
              const languageInfo = getLanguageInfo(room.language);
              
              return (
                <Grid item xs={12} sm={6} md={4} lg={3} key={room._id}>
                  <Card 
                    sx={{ 
                      height: '100%', 
                      display: 'flex', 
                      flexDirection: 'column',
                      '&:hover': { boxShadow: 4 }
                    }}
                  >
                    <CardContent sx={{ flexGrow: 1 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                        <Typography variant="h6" component="h3" noWrap sx={{ flexGrow: 1 }}>
                          {room.name}
                        </Typography>
                        {room.isActive && (
                          <Chip
                            label="Live"
                            size="small"
                            color="success"
                            variant="outlined"
                          />
                        )}
                      </Box>
                      
                      <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                        <Chip
                          label={languageInfo.label}
                          size="small"
                          sx={{ 
                            bgcolor: languageInfo.color + '20',
                            color: languageInfo.color,
                            fontWeight: 600
                          }}
                        />
                        <Chip
                          icon={<Public />}
                          label="Public"
                          size="small"
                          color="success"
                        />
                      </Box>
                      
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        by {room.owner.username}
                      </Typography>
                      
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <AvatarGroup max={4} sx={{ '& .MuiAvatar-root': { width: 24, height: 24, fontSize: '0.75rem' } }}>
                          {room.participants?.slice(0, 4).map((participant, index) => (
                            <Avatar key={index} sx={{ bgcolor: 'primary.main' }}>
                              {participant.user.username.charAt(0).toUpperCase()}
                            </Avatar>
                          ))}
                        </AvatarGroup>
                        <Typography variant="caption" color="text.secondary">
                          {room.participantCount || room.participants?.length || 0} active
                        </Typography>
                      </Box>
                      
                      <Typography variant="caption" color="text.secondary">
                        {new Date(room.lastModified).toLocaleDateString()}
                      </Typography>
                    </CardContent>
                    
                    <CardActions>
                      <Button
                        fullWidth
                        variant="contained"
                        startIcon={<PlayArrow />}
                        onClick={() => handleJoinRoom(room)}
                      >
                        Join Room
                      </Button>
                    </CardActions>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        )
      )}

        {/* Floating Action Button */}
        <motion.div
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 1 }}
          style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 1000 }}
        >
          <motion.div
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <Fab
              onClick={() => setCreateDialogOpen(true)}
              sx={{
                width: 64,
                height: 64,
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                boxShadow: '0 8px 32px rgba(102, 126, 234, 0.4)',
                '&:hover': {
                  boxShadow: '0 12px 40px rgba(102, 126, 234, 0.6)',
                },
              }}
            >
              <Plus size={24} color="white" />
            </Fab>
          </motion.div>
        </motion.div>

      </Container>
      </Box>

      {/* Create Room Dialog */}
      <Dialog 
        open={createDialogOpen} 
        onClose={() => setCreateDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <form onSubmit={handleSubmit(handleCreateRoom)}>
          <DialogTitle>Create New Room</DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 1 }}>
              <TextField
                fullWidth
                label="Room Name"
                {...register('name', {
                  required: 'Room name is required',
                  minLength: { value: 1, message: 'Room name is required' },
                  maxLength: { value: 100, message: 'Room name is too long' }
                })}
                error={!!errors.name}
                helperText={errors.name?.message}
              />
              
              <TextField
                fullWidth
                label="Description (Optional)"
                multiline
                rows={3}
                {...register('description')}
              />
              
              <FormControl fullWidth>
                <InputLabel>Programming Language</InputLabel>
                <Select
                  label="Programming Language"
                  {...register('language')}
                  defaultValue="javascript"
                >
                  {LANGUAGES.map((lang) => (
                    <MenuItem key={lang.value} value={lang.value}>
                      {lang.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              <FormControlLabel
                control={<Switch {...register('isPublic')} />}
                label="Make room public"
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Creating...' : 'Create Room'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Room Actions Menu */}
      <Menu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleMenuClose}>
          <Edit sx={{ mr: 1 }} />
          Edit Room
        </MenuItem>
        <MenuItem onClick={handleMenuClose}>
          <Share sx={{ mr: 1 }} />
          Share Room
        </MenuItem>
        <MenuItem onClick={handleDeleteRoom} sx={{ color: 'error.main' }}>
          <Delete sx={{ mr: 1 }} />
          Delete Room
        </MenuItem>
      </Menu>
    </>
  );
};

export default DashboardPage;