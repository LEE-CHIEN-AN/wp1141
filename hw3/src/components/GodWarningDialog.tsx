// src/components/GodWarningDialog.tsx
import React from 'react'
import { Dialog, DialogContent, Typography, Button } from '@mui/material'
import { GodWarningState } from '../types'

interface GodWarningDialogProps {
  warning: GodWarningState
  onClose: () => void
}

const GodWarningDialog: React.FC<GodWarningDialogProps> = ({ warning, onClose }) => {
  return (
    <Dialog
      open={warning.show}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          background: 'linear-gradient(135deg, #1E1B4B 0%, #3B1E69 50%, #0F0A1A 100%)',
          border: '2px solid rgba(167, 139, 250, 0.5)',
          borderRadius: 3,
          boxShadow: '0 0 30px rgba(167, 139, 250, 0.3)',
          backdropFilter: 'blur(10px)',
        }
      }}
    >
      <DialogContent sx={{ p: 4, textAlign: 'center' }}>
        <Typography 
          variant="h5" 
          sx={{ 
            color: '#F59E0B', 
            mb: 3,
            fontFamily: 'Orbitron, monospace',
            textShadow: '0 0 10px rgba(245, 158, 11, 0.5)'
          }}
        >
          🔮 購買數量已達上限：
        </Typography>
        
        <Typography 
          variant="h6" 
          sx={{ 
            color: 'text.primary', 
            mb: 4,
            fontFamily: 'Orbitron, monospace',
            fontStyle: 'italic',
            lineHeight: 1.6
          }}
        >
          『{warning.message}』
        </Typography>
        
        <Button
          variant="contained"
          onClick={onClose}
          sx={{
            background: 'linear-gradient(45deg, #EF4444, #DC2626)',
            boxShadow: '0 0 20px rgba(239, 68, 68, 0.4)',
            borderRadius: 2,
            px: 4,
            py: 1.5,
            fontSize: '1.1rem',
            fontFamily: 'Orbitron, monospace',
            '&:hover': {
              transform: 'translateY(-2px)',
              boxShadow: '0 4px 20px rgba(239, 68, 68, 0.6)',
            },
            transition: 'all 0.3s ease',
          }}
        >
          🙇‍♀️ 我錯了
        </Button>
      </DialogContent>
    </Dialog>
  )
}

export default GodWarningDialog

