import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Button,
  CircularProgress,
  Alert
} from '@mui/material';
import { Code, ArrowBack } from '@mui/icons-material';
import roomService from '../services/room.service';

const RoomPage = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchRoom = async () => {
      try {
        setLoading(true);
        const roomData = await roomService.getRoom(roomId);
        setRoom(roomData);
      } catch (err) {
        console.error('Failed to fetch room:', err);
        setError('Failed to load room. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    if (roomId) {
      fetchRoom();
    }
  }, [roomId]);

  const handleGoBack = () => {
    navigate('/dashboard');
  };

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ py: 4, textAlign: 'center' }}>
        <CircularProgress size={40} />
        <Typography variant="h6" sx={{ mt: 2 }}>
          Loading room...
        </Typography>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button
          variant="contained"
          startIcon={<ArrowBack />}
          onClick={handleGoBack}
        >
          Back to Dashboard
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Button
          startIcon={<ArrowBack />}
          onClick={handleGoBack}
          sx={{ mb: 2 }}
        >
          Back to Dashboard
        </Button>
        
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Code sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
          <Typography variant="h4" gutterBottom>
            {room?.name || 'Coding Room'}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Collaborative coding environment - Full interface coming soon!
          </Typography>
        </Box>
      </Box>

      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Room Details
          </Typography>
          {room && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" sx={{ mb: 1 }}>
                <strong>Language:</strong> {room.language}
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                <strong>Owner:</strong> {room.owner?.username}
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                <strong>Participants:</strong> {room.participants?.length || 0}
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                <strong>Created:</strong> {new Date(room.createdAt).toLocaleDateString()}
              </Typography>
            </Box>
          )}
          
          <Typography variant="body2" color="text.secondary" sx={{ mt: 3 }}>
            The full collaborative coding interface with Monaco Editor, real-time collaboration,
            video chat, whiteboard, and code execution will be implemented here.
          </Typography>
        </CardContent>
      </Card>
    </Container>
  );
};

export default RoomPage;