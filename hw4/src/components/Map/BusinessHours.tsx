import React from 'react'
import { Box, Typography } from '@mui/material'
import { AccessTime } from '@mui/icons-material'

interface BusinessHoursProps {
  businessHours?: string | {
    monday?: string
    tuesday?: string
    wednesday?: string
    thursday?: string
    friday?: string
    saturday?: string
    sunday?: string
  }
}

const BusinessHours: React.FC<BusinessHoursProps> = ({ businessHours }) => {
  if (!businessHours) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <AccessTime sx={{ fontSize: 18, mr: 1, color: '#666666' }} />
        <Typography 
          variant="body1" 
          sx={{ 
            color: '#666666',
            fontFamily: '"Noto Sans TC", sans-serif'
          }}
        >
          營業時間未提供
        </Typography>
      </Box>
    )
  }

  // 如果是字符串格式，直接顯示
  if (typeof businessHours === 'string') {
    return (
      <Box sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <AccessTime sx={{ fontSize: 18, mr: 1, color: '#666666' }} />
          <Typography 
            variant="subtitle1" 
            sx={{ 
              fontWeight: 600,
              fontFamily: '"Noto Sans TC", sans-serif',
              color: '#333333'
            }}
          >
            營業時間
          </Typography>
        </Box>
        
        <Box sx={{ pl: 3 }}>
          <Typography 
            variant="body2" 
            sx={{ 
              color: '#666666',
              fontFamily: '"Noto Sans TC", sans-serif',
              whiteSpace: 'pre-line'
            }}
          >
            {businessHours}
          </Typography>
        </Box>
      </Box>
    )
  }

  // 如果是物件格式，使用原來的邏輯
  const days = [
    { key: 'monday', label: '週一' },
    { key: 'tuesday', label: '週二' },
    { key: 'wednesday', label: '週三' },
    { key: 'thursday', label: '週四' },
    { key: 'friday', label: '週五' },
    { key: 'saturday', label: '週六' },
    { key: 'sunday', label: '週日' }
  ]

  return (
    <Box sx={{ mb: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
        <AccessTime sx={{ fontSize: 18, mr: 1, color: '#666666' }} />
        <Typography 
          variant="subtitle1" 
          sx={{ 
            fontWeight: 600,
            fontFamily: '"Noto Sans TC", sans-serif',
            color: '#333333'
          }}
        >
          營業時間
        </Typography>
      </Box>
      
      <Box sx={{ pl: 3 }}>
        {days.map((day) => {
          const hours = businessHours[day.key as keyof typeof businessHours]
          if (!hours) return null
          
          return (
            <Box 
              key={day.key}
              sx={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                mb: 0.5,
                alignItems: 'center'
              }}
            >
              <Typography 
                variant="body2" 
                sx={{ 
                  color: '#666666',
                  fontFamily: '"Noto Sans TC", sans-serif',
                  minWidth: '40px'
                }}
              >
                {day.label}
              </Typography>
              <Typography 
                variant="body2" 
                sx={{ 
                  color: '#333333',
                  fontFamily: '"Noto Sans TC", sans-serif',
                  fontWeight: 500
                }}
              >
                {hours}
              </Typography>
            </Box>
          )
        })}
      </Box>
    </Box>
  )
}

export default BusinessHours

