import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
  Pagination
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
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Welcome back, {user?.username}! 👋
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Your collaborative coding workspace
        </Typography>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
                  <Code />
                </Avatar>
                <Box>
                  <Typography variant="h5">{myRooms.length}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Rooms
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Avatar sx={{ bgcolor: 'success.main', mr: 2 }}>
                  <People />
                </Avatar>
                <Box>
                  <Typography variant="h5">
                    {myRooms.filter(room => isOwner(room)).length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Owned Rooms
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Avatar sx={{ bgcolor: 'warning.main', mr: 2 }}>
                  <Schedule />
                </Avatar>
                <Box>
                  <Typography variant="h5">
                    {myRooms.filter(room => 
                      new Date(room.lastModified) > new Date(Date.now() - 24 * 60 * 60 * 1000)
                    ).length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Active Today
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Avatar sx={{ bgcolor: 'info.main', mr: 2 }}>
                  <PlayArrow />
                </Avatar>
                <Box>
                  <Typography variant="h5">0</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Executions
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Rooms Section with Tabs */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
            <Tab label="My Rooms" />
            <Tab label="Browse Public Rooms" />
          </Tabs>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setCreateDialogOpen(true)}
          >
            Create Room
          </Button>
        </Box>

        {/* Search and Filter Bar for Public Rooms */}
        {activeTab === 1 && (
          <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
            <TextField
              size="small"
              placeholder="Search public rooms..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
              }}
              sx={{ minWidth: 250 }}
            />
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>Language</InputLabel>
              <Select
                value={languageFilter}
                label="Language"
                onChange={(e) => setLanguageFilter(e.target.value)}
              >
                <MenuItem value="">All Languages</MenuItem>
                {LANGUAGES.map((lang) => (
                  <MenuItem key={lang.value} value={lang.value}>
                    {lang.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Sort By</InputLabel>
              <Select
                value={sortBy}
                label="Sort By"
                onChange={(e) => setSortBy(e.target.value)}
              >
                <MenuItem value="recent">Recent</MenuItem>
                <MenuItem value="popular">Popular</MenuItem>
                <MenuItem value="name">Name</MenuItem>
              </Select>
            </FormControl>
          </Box>
        )}
      </Box>

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
          <Card sx={{ textAlign: 'center', py: 8 }}>
            <CardContent>
              <Code sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                No rooms yet
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Create your first collaborative coding room to get started
              </Typography>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => setCreateDialogOpen(true)}
              >
                Create Your First Room
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Grid container spacing={3}>
            {myRooms.map((room) => {
              const languageInfo = getLanguageInfo(room.language);
              
              return (
                <Grid item xs={12} sm={6} md={4} key={room._id}>
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
                        <IconButton 
                          size="small" 
                          onClick={(e) => handleMenuOpen(e, room)}
                          disabled={!isOwner(room)}
                        >
                          <MoreVert />
                        </IconButton>
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
                          icon={room.isPublic ? <Public /> : <Lock />}
                          label={room.isPublic ? 'Public' : 'Private'}
                          size="small"
                          color={room.isPublic ? 'success' : 'default'}
                        />
                        {room.userRole && (
                          <Chip
                            label={room.userRole}
                            size="small"
                            color="primary"
                            variant="outlined"
                          />
                        )}
                      </Box>
                      
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Owner: {room.owner.username}
                      </Typography>
                      
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <AvatarGroup max={4} sx={{ '& .MuiAvatar-root': { width: 24, height: 24, fontSize: '0.75rem' } }}>
                          {room.participants?.map((participant, index) => (
                            <Avatar key={index} sx={{ bgcolor: 'primary.main' }}>
                              {participant.user.username.charAt(0).toUpperCase()}
                            </Avatar>
                          ))}
                        </AvatarGroup>
                        <Typography variant="caption" color="text.secondary">
                          {room.participantCount || room.participants?.length || 0} participants
                        </Typography>
                      </Box>
                      
                      <Typography variant="caption" color="text.secondary">
                        Modified {new Date(room.lastModified).toLocaleDateString()}
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
      <Fab
        color="primary"
        sx={{ position: 'fixed', bottom: 16, right: 16 }}
        onClick={() => setCreateDialogOpen(true)}
      >
        <Add />
      </Fab>

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
    </Container>
  );
};

export default DashboardPage;