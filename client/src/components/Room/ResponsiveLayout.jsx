import React from 'react';
import { Box, useTheme, useMediaQuery } from '@mui/material';

const ResponsiveLayout = ({ children, layout }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isTablet = useMediaQuery(theme.breakpoints.down('lg'));

  // Mobile-first responsive styling
  const getResponsiveStyles = () => {
    if (isMobile) {
      return {
        flexDirection: 'column',
        height: '100vh',
        overflow: 'hidden'
      };
    }
    
    if (isTablet) {
      return {
        flexDirection: layout === 'split' ? 'column' : 'row',
        height: '100vh'
      };
    }
    
    return {
      flexDirection: 'row',
      height: '100vh'
    };
  };

  return (
    <Box
      sx={{
        display: 'flex',
        ...getResponsiveStyles(),
        width: '100%',
        position: 'relative'
      }}
    >
      {children}
    </Box>
  );
};

export default ResponsiveLayout;