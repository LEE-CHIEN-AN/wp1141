import React, { useState } from 'react'
import {
  Box,
  Typography,
  Button,
  TextField,
  Rating,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  Divider,
  Avatar,
  CardMedia
} from '@mui/material'
import { Add, Person } from '@mui/icons-material'
import { VisitRecord } from '../../types'
import PhotoUpload from './PhotoUpload'

interface VisitRecordsProps {
  storeId: string
  visitRecords: VisitRecord[]
  onAddVisitRecord: (record: Omit<VisitRecord, 'id'>) => void
}

const VisitRecords: React.FC<VisitRecordsProps> = ({
  storeId,
  visitRecords,
  onAddVisitRecord
}) => {
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [newRecord, setNewRecord] = useState({
    date: new Date().toISOString().split('T')[0],
    rating: 5,
    review: '',
    photos: [] as string[]
  })

  const handleAddRecord = () => {
    if (newRecord.review.trim()) {
      onAddVisitRecord({
        storeId,
        date: newRecord.date,
        rating: newRecord.rating,
        review: newRecord.review.trim(),
        photos: newRecord.photos
      })
      setNewRecord({
        date: new Date().toISOString().split('T')[0],
        rating: 5,
        review: '',
        photos: []
      })
      setShowAddDialog(false)
    }
  }

  return (
    <Box sx={{ 
      borderTop: '1px solid #E8E0D6', 
      pt: 2 
    }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography 
          variant="subtitle1" 
          sx={{ 
            fontWeight: 600,
            fontFamily: '"Noto Sans TC", sans-serif'
          }}
        >
          我的造訪紀錄
        </Typography>
        <Button
          variant="outlined"
          size="small"
          startIcon={<Add />}
          onClick={() => setShowAddDialog(true)}
          sx={{
            borderColor: '#2F6F4E',
            color: '#2F6F4E',
            fontFamily: '"Noto Sans TC", sans-serif',
            '&:hover': {
              borderColor: '#1F4A33',
              backgroundColor: '#FAF5EF'
            }
          }}
        >
          新增紀錄
        </Button>
      </Box>

      {visitRecords.length === 0 ? (
        <Typography 
          variant="body2" 
          sx={{ 
            color: '#666666',
            fontFamily: '"Noto Sans TC", sans-serif',
            mb: 2,
            textAlign: 'center',
            py: 2
          }}
        >
          您還沒有造訪過這家店
        </Typography>
      ) : (
        <List sx={{ p: 0 }}>
          {visitRecords.map((record, index) => (
            <React.Fragment key={record.id}>
              <ListItem sx={{ px: 0, py: 1 }}>
                <Avatar sx={{ mr: 2, backgroundColor: '#2F6F4E' }}>
                  <Person />
                </Avatar>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                      <Typography 
                        variant="subtitle2" 
                        sx={{ 
                          fontWeight: 600,
                          fontFamily: '"Noto Sans TC", sans-serif'
                        }}
                      >
                        {record.date}
                      </Typography>
                      <Rating 
                        value={record.rating} 
                        readOnly 
                        size="small"
                        sx={{ '& .MuiRating-iconFilled': { color: '#F4A261' } }}
                      />
                    </Box>
                  }
                  secondary={
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        color: '#666666',
                        fontFamily: '"Noto Sans TC", sans-serif',
                        lineHeight: 1.4,
                        mb: record.photos && record.photos.length > 0 ? 1 : 0
                      }}
                    >
                      {record.review}
                    </Typography>
                  }
                />
                
                {/* 照片縮圖 */}
                {record.photos && record.photos.length > 0 && (
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
                    {record.photos.slice(0, 3).map((photo: string, index: number) => (
                      <CardMedia
                        key={index}
                        component="img"
                        sx={{ 
                          width: 40, 
                          height: 40, 
                          borderRadius: 1,
                          objectFit: 'cover',
                          border: '1px solid #E8E0D6'
                        }}
                        image={photo}
                        alt={`造訪照片 ${index + 1}`}
                      />
                    ))}
                    {record.photos.length > 3 && (
                      <Box sx={{
                        width: 40,
                        height: 40,
                        borderRadius: 1,
                        backgroundColor: '#E8E0D6',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <Typography variant="caption" sx={{ color: '#666666', fontSize: 10 }}>
                          +{record.photos.length - 3}
                        </Typography>
                      </Box>
                    )}
                  </Box>
                )}
              </ListItem>
              {index < visitRecords.length - 1 && <Divider />}
            </React.Fragment>
          ))}
        </List>
      )}

      {/* 新增造訪紀錄對話框 */}
      <Dialog open={showAddDialog} onClose={() => setShowAddDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Typography variant="subtitle1" sx={{ fontFamily: '"Noto Sans TC", sans-serif' }}>
            新增造訪紀錄
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="造訪日期"
              type="date"
              value={newRecord.date}
              onChange={(e) => setNewRecord(prev => ({ ...prev, date: e.target.value }))}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />

            <Box>
              <Typography component="legend" sx={{ mb: 1, fontFamily: '"Noto Sans TC", sans-serif' }}>
                評分
              </Typography>
              <Rating
                value={newRecord.rating}
                onChange={(_, value) => setNewRecord(prev => ({ ...prev, rating: value || 5 }))}
                sx={{ '& .MuiRating-iconFilled': { color: '#F4A261' } }}
              />
            </Box>

            <TextField
              label="心得"
              multiline
              rows={3}
              value={newRecord.review}
              onChange={(e) => setNewRecord(prev => ({ ...prev, review: e.target.value }))}
              fullWidth
              placeholder="分享您的造訪心得..."
            />

            {/* 照片上傳 */}
            <PhotoUpload
              photos={newRecord.photos}
              onPhotosChange={(photos) => setNewRecord(prev => ({ ...prev, photos }))}
              maxPhotos={5}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowAddDialog(false)}>
            取消
          </Button>
          <Button 
            onClick={handleAddRecord} 
            variant="contained"
            disabled={!newRecord.review.trim()}
            sx={{
              backgroundColor: '#2F6F4E',
              '&:hover': { backgroundColor: '#1F4A33' }
            }}
          >
            新增
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default VisitRecords

