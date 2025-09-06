import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  Avatar,
  Menu,
  MenuItem,
  IconButton,
  Badge,
  Tooltip,
  Divider,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import {
  Code,
  Dashboard,
  Person,
  Settings,
  Logout,
  Notifications,
  Add,
  VideoCall
} from '@mui/icons-material';
import { useAuthStore } from '../../store/authStore';
import authService from '../../services/auth.service';

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const [anchorEl, setAnchorEl] = useState(null);
  const [notificationsAnchorEl, setNotificationsAnchorEl] = useState(null);

  const handleProfileMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleProfileMenuClose = () => {
    setAnchorEl(null);
  };

  const handleNotificationsOpen = (event) => {
    setNotificationsAnchorEl(event.currentTarget);
  };

  const handleNotificationsClose = () => {
    setNotificationsAnchorEl(null);
  };

  const handleLogout = async () => {
    try {
      await authService.logout();
      logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
      logout();
      navigate('/login');
    }
    handleProfileMenuClose();
  };

  const handleNavigate = (path) => {
    navigate(path);
    handleProfileMenuClose();
  };

  const isActive = (path) => location.pathname === path;

  return (
    <AppBar position="sticky" sx={{ zIndex: 1201 }}>
      <Toolbar sx={{ px: { xs: 2, sm: 3 } }}>
        {/* Logo */}
        <Box sx={{ display: 'flex', alignItems: 'center', mr: 4 }}>
          <Code sx={{ mr: 1 }} />
          <Typography
            variant="h6"
            component={Link}
            to="/dashboard"
            sx={{
              fontWeight: 700,
              textDecoration: 'none',
              color: 'inherit',
              '&:hover': { opacity: 0.8 }
            }}
          >
            CodeCollab Studio
          </Typography>
        </Box>

        {/* Navigation Links */}
        <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 1, flexGrow: 1 }}>
          <Button
            color="inherit"
            startIcon={<Dashboard />}
            onClick={() => navigate('/dashboard')}
            sx={{
              backgroundColor: isActive('/dashboard') ? 'rgba(255,255,255,0.1)' : 'transparent',
              '&:hover': { backgroundColor: 'rgba(255,255,255,0.1)' }
            }}
          >
            Dashboard
          </Button>
        </Box>

        {/* Action Buttons */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {/* Create Room Button */}
          <Tooltip title="Create New Room">
            <Button
              variant="contained"
              color="secondary"
              startIcon={<Add />}
              onClick={() => navigate('/dashboard?create=true')}
              sx={{ mr: 1, display: { xs: 'none', sm: 'flex' } }}
            >
              New Room
            </Button>
          </Tooltip>

          {/* Mobile Create Room Button */}
          <Tooltip title="Create New Room">
            <IconButton
              color="inherit"
              onClick={() => navigate('/dashboard?create=true')}
              sx={{ display: { xs: 'flex', sm: 'none' } }}
            >
              <Add />
            </IconButton>
          </Tooltip>

          {/* Notifications */}
          <Tooltip title="Notifications">
            <IconButton
              color="inherit"
              onClick={handleNotificationsOpen}
            >
              <Badge badgeContent={0} color="error">
                <Notifications />
              </Badge>
            </IconButton>
          </Tooltip>

          {/* Profile Menu */}
          <Tooltip title="Account">
            <IconButton
              onClick={handleProfileMenuOpen}
              size="small"
              sx={{ ml: 1 }}
            >
              <Avatar
                sx={{ width: 32, height: 32 }}
                src={user?.avatar}
                alt={user?.username}
              >
                {user?.username?.charAt(0).toUpperCase()}
              </Avatar>
            </IconButton>
          </Tooltip>
        </Box>

        {/* Profile Menu */}
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleProfileMenuClose}
          onClick={handleProfileMenuClose}
          transformOrigin={{ horizontal: 'right', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          sx={{ mt: 1 }}
        >
          <Box sx={{ px: 2, py: 1, minWidth: 200 }}>
            <Typography variant="subtitle1" fontWeight={600}>
              {user?.username}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {user?.email}
            </Typography>
          </Box>
          <Divider />
          
          <MenuItem onClick={() => handleNavigate('/profile')}>
            <ListItemIcon>
              <Person fontSize="small" />
            </ListItemIcon>
            <ListItemText>Profile</ListItemText>
          </MenuItem>
          
          <MenuItem onClick={() => handleNavigate('/settings')}>
            <ListItemIcon>
              <Settings fontSize="small" />
            </ListItemIcon>
            <ListItemText>Settings</ListItemText>
          </MenuItem>
          
          <Divider />
          
          <MenuItem onClick={handleLogout} sx={{ color: 'error.main' }}>
            <ListItemIcon>
              <Logout fontSize="small" sx={{ color: 'error.main' }} />
            </ListItemIcon>
            <ListItemText>Logout</ListItemText>
          </MenuItem>
        </Menu>

        {/* Notifications Menu */}
        <Menu
          anchorEl={notificationsAnchorEl}
          open={Boolean(notificationsAnchorEl)}
          onClose={handleNotificationsClose}
          transformOrigin={{ horizontal: 'right', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          sx={{ mt: 1 }}
        >
          <Box sx={{ px: 2, py: 1, minWidth: 300 }}>
            <Typography variant="subtitle1" fontWeight={600}>
              Notifications
            </Typography>
          </Box>
          <Divider />
          
          <MenuItem>
            <Box sx={{ py: 2, textAlign: 'center', width: '100%' }}>
              <Typography variant="body2" color="text.secondary">
                No new notifications
              </Typography>
            </Box>
          </MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;