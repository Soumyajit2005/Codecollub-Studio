import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Container,
  Alert,
  InputAdornment,
  IconButton,
  Divider,
  Link as MuiLink,
  Paper
} from '@mui/material';
import {
  Email,
  Lock,
  Person,
  Visibility,
  VisibilityOff,
  PersonAdd
} from '@mui/icons-material';
import { UserPlus, Mail, Eye, EyeOff, User, Lock as LockIcon, Code2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useAuthStore } from '../store/authStore';
import authService from '../services/auth.service';

const RegisterPage = () => {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors }
  } = useForm({
    defaultValues: {
      username: '',
      email: '',
      password: '',
      confirmPassword: ''
    }
  });

  const password = watch('password');

  const onSubmit = async (data) => {
    try {
      setError('');
      setIsLoading(true);
      
      const { confirmPassword, ...registrationData } = data;
      const response = await authService.register(registrationData);
      login(response.user, response.token);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Animated background elements */}
      <Box
        sx={{
          position: 'absolute',
          top: '-30%',
          right: '-20%',
          width: '80%',
          height: '80%',
          background: 'radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 70%)',
          borderRadius: '50%',
          animation: 'float 10s ease-in-out infinite',
          '@keyframes float': {
            '0%, 100%': { transform: 'translateY(0px) rotate(0deg)' },
            '50%': { transform: 'translateY(-30px) rotate(180deg)' },
          },
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          bottom: '-40%',
          left: '-20%',
          width: '60%',
          height: '60%',
          background: 'radial-gradient(circle, rgba(255,255,255,0.05) 0%, transparent 70%)',
          borderRadius: '50%',
          animation: 'float 12s ease-in-out infinite reverse',
        }}
      />

      <Container component="main" maxWidth="sm" sx={{ position: 'relative', zIndex: 1 }}>
        <Box
          sx={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            py: 4,
          }}
        >
          <motion.div
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <Box sx={{ textAlign: 'center', mb: 6 }}>
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: 0.2 }}
              >
                <Box
                  sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 80,
                    height: 80,
                    borderRadius: '20px',
                    background: 'rgba(255, 255, 255, 0.15)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    mb: 3,
                  }}
                >
                  <Code2 size={40} color="white" />
                </Box>
              </motion.div>
              
              <Typography
                variant="h3"
                component="h1"
                sx={{
                  fontWeight: 800,
                  color: 'white',
                  mb: 1,
                  textShadow: '0 2px 20px rgba(0,0,0,0.3)',
                  letterSpacing: '-1px',
                }}
              >
                CodeCollab Studio
              </Typography>
              <Typography 
                variant="h5" 
                sx={{ 
                  color: 'rgba(255, 255, 255, 0.9)', 
                  fontWeight: 300,
                  mb: 1 
                }}
              >
                Create Your Account
              </Typography>
              <Typography 
                variant="body1" 
                sx={{ 
                  color: 'rgba(255, 255, 255, 0.8)',
                  fontSize: '1.1rem'
                }}
              >
                Join thousands of developers collaborating on code
              </Typography>
            </Box>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
          >
            <Paper
              elevation={0}
              sx={{
                background: 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '24px',
                overflow: 'hidden',
              }}
            >
              <CardContent sx={{ p: { xs: 3, sm: 5 } }}>
                <form onSubmit={handleSubmit(onSubmit)} noValidate>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {error && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.3 }}
                      >
                        <Alert 
                          severity="error" 
                          sx={{ 
                            borderRadius: '12px',
                            '& .MuiAlert-icon': {
                              color: '#d32f2f'
                            }
                          }}
                        >
                          {error}
                        </Alert>
                      </motion.div>
                    )}

                    <TextField
                      fullWidth
                      label="Username"
                      type="text"
                      autoComplete="username"
                      autoFocus
                      {...register('username', {
                        required: 'Username is required',
                        minLength: {
                          value: 3,
                          message: 'Username must be at least 3 characters'
                        },
                        maxLength: {
                          value: 30,
                          message: 'Username must be less than 30 characters'
                        },
                        pattern: {
                          value: /^[a-zA-Z0-9_]+$/,
                          message: 'Username can only contain letters, numbers, and underscores'
                        }
                      })}
                      error={!!errors.username}
                      helperText={errors.username?.message}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: '16px',
                          backgroundColor: 'rgba(255, 255, 255, 0.8)',
                          transition: 'all 0.3s ease',
                          '&:hover': {
                            backgroundColor: 'rgba(255, 255, 255, 0.9)',
                            '& .MuiOutlinedInput-notchedOutline': {
                              borderColor: '#667eea',
                            },
                          },
                          '&.Mui-focused': {
                            backgroundColor: 'rgba(255, 255, 255, 1)',
                            '& .MuiOutlinedInput-notchedOutline': {
                              borderColor: '#667eea',
                              borderWidth: 2,
                            },
                          },
                        },
                      }}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <User size={20} color="#667eea" />
                          </InputAdornment>
                        ),
                      }}
                    />

                    <TextField
                      fullWidth
                      label="Email Address"
                      type="email"
                      autoComplete="email"
                      {...register('email', {
                        required: 'Email is required',
                        pattern: {
                          value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                          message: 'Please enter a valid email address'
                        }
                      })}
                      error={!!errors.email}
                      helperText={errors.email?.message}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: '16px',
                          backgroundColor: 'rgba(255, 255, 255, 0.8)',
                          transition: 'all 0.3s ease',
                          '&:hover': {
                            backgroundColor: 'rgba(255, 255, 255, 0.9)',
                            '& .MuiOutlinedInput-notchedOutline': {
                              borderColor: '#667eea',
                            },
                          },
                          '&.Mui-focused': {
                            backgroundColor: 'rgba(255, 255, 255, 1)',
                            '& .MuiOutlinedInput-notchedOutline': {
                              borderColor: '#667eea',
                              borderWidth: 2,
                            },
                          },
                        },
                      }}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <Mail size={20} color="#667eea" />
                          </InputAdornment>
                        ),
                      }}
                    />

                    <TextField
                      fullWidth
                      label="Password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      {...register('password', {
                        required: 'Password is required',
                        minLength: {
                          value: 8,
                          message: 'Password must be at least 8 characters'
                        },
                        pattern: {
                          value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
                          message: 'Password must contain uppercase, lowercase, number, and special character'
                        }
                      })}
                      error={!!errors.password}
                      helperText={errors.password?.message}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: '16px',
                          backgroundColor: 'rgba(255, 255, 255, 0.8)',
                          transition: 'all 0.3s ease',
                          '&:hover': {
                            backgroundColor: 'rgba(255, 255, 255, 0.9)',
                            '& .MuiOutlinedInput-notchedOutline': {
                              borderColor: '#667eea',
                            },
                          },
                          '&.Mui-focused': {
                            backgroundColor: 'rgba(255, 255, 255, 1)',
                            '& .MuiOutlinedInput-notchedOutline': {
                              borderColor: '#667eea',
                              borderWidth: 2,
                            },
                          },
                        },
                      }}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <LockIcon size={20} color="#667eea" />
                          </InputAdornment>
                        ),
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              aria-label="toggle password visibility"
                              onClick={togglePasswordVisibility}
                              edge="end"
                              sx={{ color: '#667eea' }}
                            >
                              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                    />

                    <TextField
                      fullWidth
                      label="Confirm Password"
                      type="password"
                      autoComplete="new-password"
                      {...register('confirmPassword', {
                        required: 'Please confirm your password',
                        validate: (value) =>
                          value === password || 'Passwords do not match'
                      })}
                      error={!!errors.confirmPassword}
                      helperText={errors.confirmPassword?.message}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: '16px',
                          backgroundColor: 'rgba(255, 255, 255, 0.8)',
                          transition: 'all 0.3s ease',
                          '&:hover': {
                            backgroundColor: 'rgba(255, 255, 255, 0.9)',
                            '& .MuiOutlinedInput-notchedOutline': {
                              borderColor: '#667eea',
                            },
                          },
                          '&.Mui-focused': {
                            backgroundColor: 'rgba(255, 255, 255, 1)',
                            '& .MuiOutlinedInput-notchedOutline': {
                              borderColor: '#667eea',
                              borderWidth: 2,
                            },
                          },
                        },
                      }}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <LockIcon size={20} color="#667eea" />
                          </InputAdornment>
                        ),
                      }}
                    />

                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Button
                        type="submit"
                        fullWidth
                        variant="contained"
                        size="large"
                        disabled={isLoading}
                        startIcon={<UserPlus size={20} />}
                        sx={{ 
                          py: 2, 
                          mt: 2,
                          borderRadius: '16px',
                          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                          boxShadow: '0 8px 32px rgba(102, 126, 234, 0.4)',
                          fontSize: '1.1rem',
                          fontWeight: 600,
                          textTransform: 'none',
                          transition: 'all 0.3s ease',
                          '&:hover': {
                            boxShadow: '0 12px 40px rgba(102, 126, 234, 0.6)',
                            transform: 'translateY(-2px)',
                          },
                          '&:disabled': {
                            background: 'linear-gradient(135deg, #999 0%, #aaa 100%)',
                          }
                        }}
                      >
                        {isLoading ? 'Creating Account...' : 'Create Account'}
                      </Button>
                    </motion.div>

                    <Divider sx={{ my: 3 }}>
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          color: 'text.secondary',
                          fontWeight: 500,
                          px: 2
                        }}
                      >
                        OR
                      </Typography>
                    </Divider>

                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="body1" sx={{ color: 'text.primary' }}>
                        Already have an account?{' '}
                        <MuiLink
                          component={Link}
                          to="/login"
                          sx={{
                            color: '#667eea',
                            textDecoration: 'none',
                            fontWeight: 600,
                            transition: 'all 0.3s ease',
                            '&:hover': {
                              textDecoration: 'underline',
                              color: '#764ba2',
                            }
                          }}
                        >
                          Sign in here
                        </MuiLink>
                      </Typography>
                    </Box>
                  </Box>
                </form>
              </CardContent>
            </Paper>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.6 }}
          >
            <Box sx={{ textAlign: 'center', mt: 4 }}>
              <Typography 
                variant="body2" 
                sx={{ 
                  color: 'rgba(255, 255, 255, 0.7)',
                  fontSize: '0.9rem'
                }}
              >
                © {new Date().getFullYear()} CodeCollab Studio. All rights reserved.
              </Typography>
            </Box>
          </motion.div>
        </Box>
      </Container>
    </Box>
  );
};

export default RegisterPage;