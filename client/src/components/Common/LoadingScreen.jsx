import React from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';
import { styled } from '@mui/material/styles';

const LoadingContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '100vh',
  backgroundColor: theme.palette.background.default,
  gap: theme.spacing(2),
}));

const Logo = styled('div')(({ theme }) => ({
  fontSize: '2.5rem',
  fontWeight: 'bold',
  background: 'linear-gradient(45deg, #1976d2 30%, #42a5f5 90%)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  backgroundClip: 'text',
  marginBottom: theme.spacing(2),
}));

const LoadingScreen = ({ message = 'Loading...' }) => {
  return (
    <LoadingContainer>
      <Logo>CodeCollab Studio</Logo>
      <CircularProgress size={40} thickness={4} />
      <Typography variant="body1" color="text.secondary">
        {message}
      </Typography>
    </LoadingContainer>
  );
};

export default LoadingScreen;