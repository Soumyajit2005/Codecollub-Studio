import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Box,
  Paper,
  Typography,
  Button,
  IconButton,
  Tabs,
  Tab,
  List,
  Avatar,
  Chip,
  Switch,
  FormControlLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
  Card,
  CardContent,
  Badge,
  Alert,
  Tooltip
} from '@mui/material';
import {
  Users,
  UserPlus,
  UserMinus,
  Settings,
  Shield,
  MessageCircle,
  Code,
  Palette,
  Video,
  Monitor,
  Play,
  FileText,
  Check,
  X,
  Crown,
  Clock
} from 'lucide-react';
import toast from 'react-hot-toast';

const AdminDashboard = ({ roomId, room, onClose, onUpdate }) => {
  const [activeTab, setActiveTab] = useState(0);
  const [joinRequests, setJoinRequests] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [roomSettings, setRoomSettings] = useState({});
  const [permissionDialog, setPermissionDialog] = useState(null);
  const [selectedParticipant, setSelectedParticipant] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [roomId, loadData]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadJoinRequests(),
        loadParticipants(),
        loadRoomSettings()
      ]);
    } catch (error) {
      console.error('Failed to load admin data:', error);
      toast.error('Failed to load admin data');
    } finally {
      setLoading(false);
    }
  }, [roomId]);

  const loadJoinRequests = async () => {
    try {
      const response = await fetch(`/api/rooms/${roomId}/join-requests`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setJoinRequests(data.joinRequests || []);
      }
    } catch (error) {
      console.error('Failed to load join requests:', error);
    }
  };

  const loadParticipants = async () => {
    try {
      setParticipants(room?.participants || []);
    } catch (error) {
      console.error('Failed to load participants:', error);
    }
  };

  const loadRoomSettings = async () => {
    try {
      setRoomSettings(room?.settings || {});
    } catch (error) {
      console.error('Failed to load room settings:', error);
    }
  };

  const approveJoinRequest = async (requestId, role = 'editor') => {
    try {
      const response = await fetch(`/api/rooms/${roomId}/join-requests/${requestId}/approve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ role })
      });
      
      if (response.ok) {
        await loadJoinRequests();
        await loadParticipants();
        toast.success('Join request approved');
        onUpdate?.();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to approve request');
      }
    } catch (error) {
      console.error('Failed to approve join request:', error);
      toast.error('Failed to approve join request');
    }
  };

  const rejectJoinRequest = async (requestId, message = '') => {
    try {
      const response = await fetch(`/api/rooms/${roomId}/join-requests/${requestId}/reject`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message })
      });
      
      if (response.ok) {
        await loadJoinRequests();
        toast.success('Join request rejected');
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to reject request');
      }
    } catch (error) {
      console.error('Failed to reject join request:', error);
      toast.error('Failed to reject join request');
    }
  };

  const updateParticipantPermissions = async (participantId, updates) => {
    try {
      const response = await fetch(`/api/rooms/${roomId}/participants/${participantId}/permissions`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates)
      });
      
      if (response.ok) {
        await loadParticipants();
        toast.success('Permissions updated');
        onUpdate?.();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to update permissions');
      }
    } catch (error) {
      console.error('Failed to update permissions:', error);
      toast.error('Failed to update permissions');
    }
  };

  const removeParticipant = async (participantId) => {
    try {
      const response = await fetch(`/api/rooms/${roomId}/participants/${participantId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      
      if (response.ok) {
        await loadParticipants();
        toast.success('Participant removed');
        onUpdate?.();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to remove participant');
      }
    } catch (error) {
      console.error('Failed to remove participant:', error);
      toast.error('Failed to remove participant');
    }
  };

  const updateRoomSettings = async (newSettings) => {
    try {
      const response = await fetch(`/api/rooms/${roomId}/settings`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ settings: newSettings })
      });
      
      if (response.ok) {
        setRoomSettings(newSettings);
        toast.success('Room settings updated');
        onUpdate?.();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to update settings');
      }
    } catch (error) {
      console.error('Failed to update room settings:', error);
      toast.error('Failed to update room settings');
    }
  };

  const renderJoinRequests = () => (
    <Box>
      <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
        <UserPlus size={20} style={{ marginRight: 8 }} />
        Join Requests ({joinRequests.length})
      </Typography>

      {joinRequests.length === 0 ? (
        <Alert severity="info">
          No pending join requests
        </Alert>
      ) : (
        <List>
          {joinRequests.map((request) => (
            <motion.div
              key={request._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <Card sx={{ mb: 2 }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Avatar sx={{ mr: 2, bgcolor: '#4285f4' }}>
                        {request.user.username.charAt(0).toUpperCase()}
                      </Avatar>
                      <Box>
                        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                          {request.user.username}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {request.user.email}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                          <Clock size={14} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                          {new Date(request.requestedAt).toLocaleString()}
                        </Typography>
                        {request.message && (
                          <Typography variant="body2" sx={{ mt: 1, fontStyle: 'italic' }}>
                            "{request.message}"
                          </Typography>
                        )}
                      </Box>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button
                        variant="contained"
                        color="success"
                        size="small"
                        startIcon={<Check size={16} />}
                        onClick={() => approveJoinRequest(request._id, 'editor')}
                      >
                        Approve
                      </Button>
                      <Button
                        variant="outlined"
                        color="error"
                        size="small"
                        startIcon={<X size={16} />}
                        onClick={() => rejectJoinRequest(request._id)}
                      >
                        Reject
                      </Button>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </List>
      )}
    </Box>
  );

  const renderParticipants = () => (
    <Box>
      <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
        <Users size={20} style={{ marginRight: 8 }} />
        Participants ({participants.length})
      </Typography>

      <List>
        {participants.map((participant) => (
          <motion.div
            key={participant._id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <Card sx={{ mb: 2 }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Avatar 
                      src={participant.user?.avatar} 
                      sx={{ 
                        mr: 2, 
                        bgcolor: participant.role === 'owner' ? '#ff6b35' : 
                                participant.role === 'admin' ? '#4285f4' : '#34a853' 
                      }}
                    >
                      {participant.user?.username?.charAt(0).toUpperCase()}
                    </Avatar>
                    <Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                          {participant.user?.username || 'Unknown User'}
                        </Typography>
                        {participant.role === 'owner' && <Crown size={16} color="#ff6b35" />}
                        {participant.role === 'admin' && <Shield size={16} color="#4285f4" />}
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                        <Chip 
                          size="small" 
                          label={participant.role} 
                          color={participant.role === 'owner' ? 'error' : 
                                participant.role === 'admin' ? 'primary' : 'success'}
                        />
                        <Chip 
                          size="small" 
                          label={participant.status} 
                          color={participant.status === 'approved' ? 'success' : 'warning'}
                        />
                      </Box>
                      <Typography variant="caption" color="text.secondary">
                        Joined: {new Date(participant.joinedAt).toLocaleDateString()}
                      </Typography>
                    </Box>
                  </Box>
                  
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Tooltip title="Edit Permissions">
                      <IconButton
                        size="small"
                        onClick={() => {
                          setSelectedParticipant(participant);
                          setPermissionDialog(true);
                        }}
                        disabled={participant.role === 'owner'}
                      >
                        <Settings size={16} />
                      </IconButton>
                    </Tooltip>
                    
                    {participant.role !== 'owner' && (
                      <Tooltip title="Remove Participant">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => removeParticipant(participant._id)}
                        >
                          <UserMinus size={16} />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Box>
                </Box>

                {/* Permissions Summary */}
                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    Permissions:
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {Object.entries(participant.permissions || {}).map(([key, value]) => (
                      value && (
                        <Chip
                          key={key}
                          size="small"
                          label={key.replace('can', '').replace(/([A-Z])/g, ' $1').toLowerCase()}
                          variant="outlined"
                          sx={{ fontSize: '0.7rem' }}
                        />
                      )
                    ))}
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </List>
    </Box>
  );

  const renderRoomSettings = () => (
    <Box>
      <Typography variant="h6" sx={{ mb: 3, display: 'flex', alignItems: 'center' }}>
        <Settings size={20} style={{ marginRight: 8 }} />
        Room Settings
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
              Access Control
            </Typography>
            
            <FormControlLabel
              control={
                <Switch
                  checked={roomSettings.requireApproval || false}
                  onChange={(e) => updateRoomSettings({ 
                    ...roomSettings, 
                    requireApproval: e.target.checked 
                  })}
                />
              }
              label="Require approval to join"
              sx={{ mb: 2, display: 'block' }}
            />
            
            <FormControlLabel
              control={
                <Switch
                  checked={roomSettings.allowGuests || false}
                  onChange={(e) => updateRoomSettings({ 
                    ...roomSettings, 
                    allowGuests: e.target.checked 
                  })}
                />
              }
              label="Allow guest access"
              sx={{ mb: 2, display: 'block' }}
            />

            <TextField
              label="Max Participants"
              type="number"
              value={roomSettings.maxParticipants || 10}
              onChange={(e) => updateRoomSettings({ 
                ...roomSettings, 
                maxParticipants: parseInt(e.target.value) 
              })}
              inputProps={{ min: 1, max: 100 }}
              size="small"
              sx={{ mt: 2 }}
            />
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
              Feature Controls
            </Typography>
            
            {[
              { key: 'codeExecution', label: 'Code Execution', icon: <Play size={16} /> },
              { key: 'videoChat', label: 'Video Chat', icon: <Video size={16} /> },
              { key: 'screenShare', label: 'Screen Share', icon: <Monitor size={16} /> },
              { key: 'whiteboard', label: 'Whiteboard', icon: <Palette size={16} /> },
              { key: 'fileSystem', label: 'File System', icon: <FileText size={16} /> },
              { key: 'terminal', label: 'Terminal', icon: <Code size={16} /> }
            ].map((feature) => (
              <FormControlLabel
                key={feature.key}
                control={
                  <Switch
                    checked={roomSettings[feature.key] || false}
                    onChange={(e) => updateRoomSettings({ 
                      ...roomSettings, 
                      [feature.key]: e.target.checked 
                    })}
                  />
                }
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    {feature.icon}
                    <span style={{ marginLeft: 8 }}>{feature.label}</span>
                  </Box>
                }
                sx={{ mb: 1, display: 'block' }}
              />
            ))}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );

  const renderPermissionDialog = () => (
    <Dialog 
      open={permissionDialog && selectedParticipant} 
      onClose={() => {
        setPermissionDialog(false);
        setSelectedParticipant(null);
      }}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        Edit Permissions - {selectedParticipant?.user?.username}
      </DialogTitle>
      <DialogContent>
        <Box sx={{ py: 2 }}>
          <FormControl fullWidth sx={{ mb: 3 }}>
            <InputLabel>Role</InputLabel>
            <Select
              value={selectedParticipant?.role || 'viewer'}
              onChange={(e) => setSelectedParticipant(prev => ({ 
                ...prev, 
                role: e.target.value 
              }))}
              label="Role"
            >
              <MenuItem value="admin">Admin</MenuItem>
              <MenuItem value="editor">Editor</MenuItem>
              <MenuItem value="viewer">Viewer</MenuItem>
            </Select>
          </FormControl>

          <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
            Specific Permissions
          </Typography>

          <Grid container spacing={2}>
            {[
              { key: 'canChat', label: 'Chat', icon: <MessageCircle size={16} /> },
              { key: 'canCode', label: 'Code', icon: <Code size={16} /> },
              { key: 'canWhiteboard', label: 'Whiteboard', icon: <Palette size={16} /> },
              { key: 'canVideo', label: 'Video', icon: <Video size={16} /> },
              { key: 'canScreenShare', label: 'Screen Share', icon: <Monitor size={16} /> },
              { key: 'canExecuteCode', label: 'Execute Code', icon: <Play size={16} /> },
              { key: 'canManageFiles', label: 'Manage Files', icon: <FileText size={16} /> },
              { key: 'canInviteUsers', label: 'Invite Users', icon: <UserPlus size={16} /> },
              { key: 'canKickUsers', label: 'Kick Users', icon: <UserMinus size={16} /> }
            ].map((perm) => (
              <Grid item xs={6} key={perm.key}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={selectedParticipant?.permissions?.[perm.key] || false}
                      onChange={(e) => setSelectedParticipant(prev => ({
                        ...prev,
                        permissions: {
                          ...prev.permissions,
                          [perm.key]: e.target.checked
                        }
                      }))}
                    />
                  }
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      {perm.icon}
                      <span style={{ marginLeft: 8 }}>{perm.label}</span>
                    </Box>
                  }
                />
              </Grid>
            ))}
          </Grid>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => {
          setPermissionDialog(false);
          setSelectedParticipant(null);
        }}>
          Cancel
        </Button>
        <Button 
          variant="contained"
          onClick={() => {
            updateParticipantPermissions(selectedParticipant._id, {
              role: selectedParticipant.role,
              permissions: selectedParticipant.permissions
            });
            setPermissionDialog(false);
            setSelectedParticipant(null);
          }}
        >
          Save Changes
        </Button>
      </DialogActions>
    </Dialog>
  );

  return (
    <Dialog open onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center' }}>
            <Shield size={24} style={{ marginRight: 8 }} />
            Room Administration
          </Typography>
          <Chip 
            label={room?.name} 
            variant="outlined" 
            sx={{ fontFamily: 'monospace' }}
          />
        </Box>
      </DialogTitle>
      
      <DialogContent sx={{ p: 0 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
            <Tab 
              label={
                <Badge badgeContent={joinRequests.length} color="error">
                  Join Requests
                </Badge>
              } 
            />
            <Tab label="Participants" />
            <Tab label="Settings" />
          </Tabs>
        </Box>

        <Box sx={{ p: 3, minHeight: 400 }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <Typography>Loading...</Typography>
            </Box>
          ) : (
            <>
              {activeTab === 0 && renderJoinRequests()}
              {activeTab === 1 && renderParticipants()}
              {activeTab === 2 && renderRoomSettings()}
            </>
          )}
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>

      {renderPermissionDialog()}
    </Dialog>
  );
};

export default AdminDashboard;