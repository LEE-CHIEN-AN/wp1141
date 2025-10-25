import React, { useState, useEffect } from 'react'
import { Box, Alert, CircularProgress, Typography, Button } from '@mui/material'
import { CheckCircle, Error, Refresh } from '@mui/icons-material'

interface HealthStatus {
  status: 'success' | 'error' | 'loading'
  message: string
  timestamp?: string
  uptime?: number
  environment?: string
  database?: string
}

const HealthCheck: React.FC = () => {
  const [healthStatus, setHealthStatus] = useState<HealthStatus>({
    status: 'loading',
    message: '檢查中...'
  })

  const checkHealth = async () => {
    setHealthStatus({
      status: 'loading',
      message: '檢查中...'
    })

    try {
      const response = await fetch('http://localhost:3001/api/health')
      const data = await response.json()

      if (response.ok) {
        setHealthStatus({
          status: 'success',
          message: data.message,
          timestamp: data.timestamp,
          uptime: data.uptime,
          environment: data.environment,
          database: data.database
        })
      } else {
        setHealthStatus({
          status: 'error',
          message: data.message || '服務異常'
        })
      }
    } catch (error) {
      setHealthStatus({
        status: 'error',
        message: '無法連接到後端服務'
      })
    }
  }

  useEffect(() => {
    checkHealth()
  }, [])

  const getStatusIcon = () => {
    switch (healthStatus.status) {
      case 'success':
        return <CheckCircle sx={{ color: '#2F6F4E', fontSize: 24 }} />
      case 'error':
        return <Error sx={{ color: '#F4A261', fontSize: 24 }} />
      case 'loading':
        return <CircularProgress size={24} sx={{ color: '#2F6F4E' }} />
      default:
        return null
    }
  }

  const getStatusColor = () => {
    switch (healthStatus.status) {
      case 'success':
        return '#2F6F4E'
      case 'error':
        return '#F4A261'
      case 'loading':
        return '#666666'
      default:
        return '#666666'
    }
  }

  return (
    <Box sx={{ p: 3, maxWidth: 600, mx: 'auto' }}>
      <Typography 
        variant="h5" 
        sx={{ 
          fontWeight: 700,
          fontFamily: '"Noto Sans TC", sans-serif',
          color: '#333333',
          mb: 3,
          textAlign: 'center'
        }}
      >
        系統健康檢查
      </Typography>

      <Alert 
        severity={healthStatus.status === 'success' ? 'success' : healthStatus.status === 'error' ? 'error' : 'info'}
        icon={getStatusIcon()}
        sx={{
          mb: 2,
          borderRadius: 2,
          '& .MuiAlert-message': {
            width: '100%'
          }
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <Typography 
            variant="body1" 
            sx={{ 
              fontFamily: '"Noto Sans TC", sans-serif',
              fontWeight: 500
            }}
          >
            {healthStatus.message}
          </Typography>
          
          <Button
            variant="outlined"
            size="small"
            startIcon={<Refresh />}
            onClick={checkHealth}
            disabled={healthStatus.status === 'loading'}
            sx={{
              borderColor: getStatusColor(),
              color: getStatusColor(),
              fontFamily: '"Noto Sans TC", sans-serif',
              '&:hover': {
                borderColor: getStatusColor(),
                backgroundColor: `${getStatusColor()}10`
              }
            }}
          >
            重新檢查
          </Button>
        </Box>
      </Alert>

      {healthStatus.status === 'success' && (
        <Box sx={{ 
          backgroundColor: '#FAF5EF', 
          p: 2, 
          borderRadius: 2,
          border: '1px solid #E8E0D6'
        }}>
          <Typography 
            variant="subtitle2" 
            sx={{ 
              fontWeight: 600,
              fontFamily: '"Noto Sans TC", sans-serif',
              color: '#333333',
              mb: 1
            }}
          >
            服務資訊
          </Typography>
          
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            {healthStatus.timestamp && (
              <Typography 
                variant="body2" 
                sx={{ 
                  fontFamily: '"Noto Sans TC", sans-serif',
                  color: '#666666'
                }}
              >
                檢查時間: {new Date(healthStatus.timestamp).toLocaleString('zh-TW')}
              </Typography>
            )}
            
            {healthStatus.uptime && (
              <Typography 
                variant="body2" 
                sx={{ 
                  fontFamily: '"Noto Sans TC", sans-serif',
                  color: '#666666'
                }}
              >
                運行時間: {Math.floor(healthStatus.uptime)} 秒
              </Typography>
            )}
            
            {healthStatus.environment && (
              <Typography 
                variant="body2" 
                sx={{ 
                  fontFamily: '"Noto Sans TC", sans-serif',
                  color: '#666666'
                }}
              >
                環境: {healthStatus.environment}
              </Typography>
            )}
            
            {healthStatus.database && (
              <Typography 
                variant="body2" 
                sx={{ 
                  fontFamily: '"Noto Sans TC", sans-serif',
                  color: '#666666'
                }}
              >
                資料庫: {healthStatus.database}
              </Typography>
            )}
          </Box>
        </Box>
      )}

      {healthStatus.status === 'error' && (
        <Box sx={{ 
          backgroundColor: '#FFF5F5', 
          p: 2, 
          borderRadius: 2,
          border: '1px solid #FED7D7'
        }}>
          <Typography 
            variant="subtitle2" 
            sx={{ 
              fontWeight: 600,
              fontFamily: '"Noto Sans TC", sans-serif',
              color: '#C53030',
              mb: 1
            }}
          >
            故障排除
          </Typography>
          
          <Typography 
            variant="body2" 
            sx={{ 
              fontFamily: '"Noto Sans TC", sans-serif',
              color: '#666666',
              mb: 1
            }}
          >
            請確認後端服務是否正在運行：
          </Typography>
          
          <Box component="pre" sx={{ 
            backgroundColor: '#F7FAFC', 
            p: 1, 
            borderRadius: 1,
            fontSize: '12px',
            fontFamily: 'monospace',
            color: '#4A5568',
            overflow: 'auto'
          }}>
{`cd backend
npm run dev`}
          </Box>
        </Box>
      )}
    </Box>
  )
}

export default HealthCheck
