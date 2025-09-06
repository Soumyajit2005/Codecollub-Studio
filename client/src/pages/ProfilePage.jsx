import React from 'react';
import { Container, Typography, Card, CardContent, Box } from '@mui/material';
import { Person } from '@mui/icons-material';

const ProfilePage = () => {
  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <Person sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
        <Typography variant="h4" gutterBottom>
          Profile Page
        </Typography>
        <Typography variant="body1" color="text.secondary">
          User profile management coming soon...
        </Typography>
      </Box>
      
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Profile Settings
          </Typography>
          <Typography variant="body2" color="text.secondary">
            This page will contain user profile settings, preferences, and account management.
          </Typography>
        </CardContent>
      </Card>
    </Container>
  );
};

export default ProfilePage;