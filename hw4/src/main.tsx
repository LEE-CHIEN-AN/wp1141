import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import App from './App.tsx'
import './index.css'

const theme = createTheme({
  palette: {
    primary: {
      main: '#2F6F4E', // 森林綠
      dark: '#1F4A33',
      light: '#4A8B6B',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#F4A261', // 亮橘
      dark: '#E8914A',
      light: '#F6B584',
      contrastText: '#FFFFFF',
    },
    background: {
      default: '#FAF5EF', // 溫暖米色
      paper: '#FFFFFF',
    },
    text: {
      primary: '#333333', // 深灰
      secondary: '#666666',
    },
    grey: {
      50: '#FAF5EF', // 溫暖米色
      100: '#F5F0E8',
      200: '#E8E0D6',
      300: '#D4C9B8',
      400: '#B8A896',
      500: '#9C8B74',
      600: '#806E52',
      700: '#645130',
      800: '#48340E',
      900: '#2C1700',
    },
  },
  typography: {
    fontFamily: '"Noto Sans TC", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontFamily: '"Noto Sans TC", "Roboto", sans-serif',
      fontWeight: 700,
    },
    h2: {
      fontFamily: '"Noto Sans TC", "Roboto", sans-serif',
      fontWeight: 700,
    },
    h3: {
      fontFamily: '"Noto Sans TC", "Roboto", sans-serif',
      fontWeight: 700,
    },
    h4: {
      fontFamily: '"Noto Sans TC", "Roboto", sans-serif',
      fontWeight: 700,
    },
    h5: {
      fontFamily: '"Noto Sans TC", "Roboto", sans-serif',
      fontWeight: 700,
    },
    h6: {
      fontFamily: '"Noto Sans TC", "Roboto", sans-serif',
      fontWeight: 700,
    },
    body1: {
      fontFamily: '"Noto Sans TC", "Roboto", sans-serif',
      fontWeight: 400,
    },
    body2: {
      fontFamily: '"Noto Sans TC", "Roboto", sans-serif',
      fontWeight: 400,
    },
  },
  shape: {
    borderRadius: 12, // 圓角設計
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
          fontWeight: 500,
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0 2px 8px rgba(47, 111, 78, 0.2)',
          },
        },
        contained: {
          backgroundColor: '#2F6F4E',
          '&:hover': {
            backgroundColor: '#1F4A33',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0 2px 12px rgba(0, 0, 0, 0.08)',
          border: '1px solid rgba(47, 111, 78, 0.1)',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          fontWeight: 500,
        },
        outlined: {
          borderColor: '#2F6F4E',
          color: '#2F6F4E',
          '&:hover': {
            backgroundColor: 'rgba(47, 111, 78, 0.04)',
          },
        },
        filled: {
          backgroundColor: '#2F6F4E',
          color: '#FFFFFF',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: '#2F6F4E',
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: '#2F6F4E',
            },
          },
        },
      },
    },
  },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <App />
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
