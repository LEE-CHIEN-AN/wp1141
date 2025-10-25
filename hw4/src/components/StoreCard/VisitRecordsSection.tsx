import React, { useState, useEffect } from 'react'
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
  CardMedia,
  IconButton,
  Alert,
  CircularProgress,
  Chip
} from '@mui/material'
import {
  Add,
  Person,
  Edit,
  Delete,
  AddPhotoAlternate,
  Close
} from '@mui/icons-material'
import { VisitRecord, User } from '../../types'
import { visitsAPI, mediaAPI } from '../../services/api'

interface VisitRecordsSectionProps {
  storeId: string
  isAuthenticated: boolean
  currentUser: User | null
  onLoginPrompt: () => void
}

interface VisitRecordWithUser extends VisitRecord {
  user: {
    id: string
    username: string
    nickname?: string
    avatarId?: string
  }
}

const VisitRecordsSection: React.FC<VisitRecordsSectionProps> = ({
  storeId,
  isAuthenticated,
  currentUser,
  onLoginPrompt
}) => {
  const [allVisits, setAllVisits] = useState<VisitRecordWithUser[]>([])
  const [myVisits, setMyVisits] = useState<VisitRecordWithUser[]>([])
  const [loading, setLoading] = useState(false)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [newRecord, setNewRecord] = useState({
    date: new Date().toISOString().split('T')[0],
    rating: 5,
    note: '',
    photos: [] as { file: File; preview: string; id?: string }[]
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  // 載入造訪紀錄
  const loadVisitRecords = async () => {
    if (!storeId) return
    
    setLoading(true)
    try {
      const data = await visitsAPI.getVisits(storeId, 1, 50)
      const visits = data.items || []
      setAllVisits(visits)
      
      // 分離當前用戶的造訪紀錄
      if (isAuthenticated && currentUser) {
        const userVisits = visits.filter(visit => visit.user?.id === currentUser.id)
        setMyVisits(userVisits)
      } else {
        setMyVisits([])
      }
    } catch (err: any) {
      console.error('載入造訪紀錄失敗:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadVisitRecords()
  }, [storeId, isAuthenticated, currentUser])

  // 處理檔案上傳
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    const newPhotos: { file: File; preview: string }[] = []

    for (const file of files) {
      if (!['image/jpeg', 'image/png'].includes(file.type)) {
        setError('只允許上傳 JPG 或 PNG 格式的圖片')
        return
      }
      if (file.size > 5 * 1024 * 1024) {
        setError('單張圖片大小不能超過 5MB')
        return
      }
      newPhotos.push({ file, preview: URL.createObjectURL(file) })
    }

    setNewRecord(prev => ({
      ...prev,
      photos: [...prev.photos, ...newPhotos]
    }))
    setError('')
  }

  const handleRemovePhoto = (indexToRemove: number) => {
    setNewRecord(prev => ({
      ...prev,
      photos: prev.photos.filter((_, index) => index !== indexToRemove)
    }))
  }

  // 新增造訪紀錄
  const handleAddRecord = async () => {
    if (!newRecord.note.trim()) return

    setIsSubmitting(true)
    setError('')

    try {
      let photoIds: string[] = []

      // 上傳照片
      for (const photo of newRecord.photos) {
        const uploadFormData = new FormData()
        uploadFormData.append('file', photo.file)
        const uploadedMedia = await mediaAPI.upload(uploadFormData)
        photoIds.push(uploadedMedia.id)
      }

      await visitsAPI.createVisit(storeId, {
        date: newRecord.date,
        rating: newRecord.rating,
        note: newRecord.note.trim(),
        photoIds: photoIds.length > 0 ? photoIds : undefined
      })

      // 重新載入造訪紀錄
      await loadVisitRecords()

      // 重置表單
      setNewRecord({
        date: new Date().toISOString().split('T')[0],
        rating: 5,
        note: '',
        photos: []
      })
      setShowAddDialog(false)
    } catch (err: any) {
      setError(err.message || '新增造訪紀錄失敗')
    } finally {
      setIsSubmitting(false)
    }
  }

  // 編輯造訪紀錄
  const handleEditVisit = (visit: VisitRecordWithUser) => {
    // TODO: 實現編輯功能
    console.log('編輯造訪紀錄:', visit)
  }

  // 刪除造訪紀錄
  const handleDeleteVisit = async (visitId: string) => {
    if (!window.confirm('確定要刪除這筆造訪紀錄嗎？')) return

    try {
      await visitsAPI.deleteVisit(visitId)
      await loadVisitRecords()
    } catch (err: any) {
      setError(err.message || '刪除造訪紀錄失敗')
    }
  }

  const handleAddClick = () => {
    if (!isAuthenticated) {
      onLoginPrompt()
      return
    }
    setShowAddDialog(true)
  }

  const renderVisitItem = (visit: VisitRecordWithUser, isMyVisit: boolean = false) => {
    const displayName = visit.user.nickname || visit.user.username
    const isCurrentUser = isAuthenticated && currentUser && visit.user.id === currentUser.id

    return (
      <ListItem key={visit.id} sx={{ px: 0, py: 2 }}>
        <Avatar 
          sx={{ 
            mr: 2, 
            backgroundColor: isCurrentUser ? '#2F6F4E' : '#F4A261',
            width: 40,
            height: 40
          }}
        >
          {visit.user.avatarId ? (
            <img
              src={mediaAPI.getImageUrl(visit.user.avatarId)}
              alt={displayName}
              style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
            />
          ) : (
            <Person />
          )}
        </Avatar>
        <ListItemText
          primary={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              <Typography 
                variant="subtitle2" 
                sx={{ 
                  fontWeight: 600,
                  fontFamily: '"Noto Sans TC", sans-serif',
                  color: isCurrentUser ? '#2F6F4E' : '#333333'
                }}
              >
                {displayName}
              </Typography>
              <Typography 
                variant="caption" 
                sx={{ 
                  color: '#666666',
                  fontFamily: '"Noto Sans TC", sans-serif'
                }}
              >
                {visit.date}
              </Typography>
              {isCurrentUser && (
                <Chip 
                  label="我的" 
                  size="small" 
                  sx={{ 
                    backgroundColor: '#FAF5EF',
                    color: '#2F6F4E',
                    fontSize: '0.7rem',
                    height: 20
                  }} 
                />
              )}
              <Rating 
                value={visit.rating} 
                readOnly 
                size="small"
                sx={{ '& .MuiRating-iconFilled': { color: '#F4A261' } }}
              />
            </Box>
          }
          secondary={
            <Box>
              <Typography 
                variant="body2" 
                sx={{ 
                  color: '#666666',
                  fontFamily: '"Noto Sans TC", sans-serif',
                  lineHeight: 1.4,
                  mb: visit.photos && visit.photos.length > 0 ? 1 : 0
                }}
              >
                {visit.note}
              </Typography>
              
              {/* 照片縮圖 */}
              {visit.photos && visit.photos.length > 0 && (
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {visit.photos.slice(0, 3).map((photo: string, index: number) => (
                    <CardMedia
                      key={index}
                      component="img"
                      sx={{ 
                        width: 50, 
                        height: 50, 
                        borderRadius: 1,
                        objectFit: 'cover',
                        border: '1px solid #E8E0D6'
                      }}
                      image={mediaAPI.getImageUrl(photo)}
                      alt={`造訪照片 ${index + 1}`}
                    />
                  ))}
                  {visit.photos.length > 3 && (
                    <Box sx={{
                      width: 50,
                      height: 50,
                      borderRadius: 1,
                      backgroundColor: '#E8E0D6',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <Typography variant="caption" sx={{ color: '#666666', fontSize: 10 }}>
                        +{visit.photos.length - 3}
                      </Typography>
                    </Box>
                  )}
                </Box>
              )}

              {/* 編輯/刪除按鈕（僅限自己的紀錄） */}
              {isCurrentUser && (
                <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                  <IconButton 
                    size="small" 
                    onClick={() => handleEditVisit(visit)}
                    sx={{ color: '#2F6F4E' }}
                  >
                    <Edit fontSize="small" />
                  </IconButton>
                  <IconButton 
                    size="small" 
                    onClick={() => handleDeleteVisit(visit.id)}
                    sx={{ color: '#F4A261' }}
                  >
                    <Delete fontSize="small" />
                  </IconButton>
                </Box>
              )}
            </Box>
          }
        />
      </ListItem>
    )
  }

  return (
    <Box sx={{ 
      borderTop: '1px solid #E8E0D6', 
      pt: 3 
    }}>
      {/* 標題和新增按鈕 */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography 
          variant="h6" 
          sx={{ 
            fontWeight: 700,
            fontFamily: '"Noto Sans TC", sans-serif',
            color: '#333333'
          }}
        >
          造訪紀錄
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={handleAddClick}
          sx={{
            backgroundColor: '#2F6F4E',
            fontFamily: '"Noto Sans TC", sans-serif',
            '&:hover': { backgroundColor: '#1F4A33' }
          }}
        >
          新增紀錄
        </Button>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress sx={{ color: '#2F6F4E' }} />
        </Box>
      ) : (
        <>
          {/* 我的造訪紀錄（僅登入用戶可見） */}
          {isAuthenticated && myVisits.length > 0 && (
            <Box sx={{ mb: 3 }}>
              <Typography 
                variant="subtitle1" 
                sx={{ 
                  fontWeight: 600,
                  fontFamily: '"Noto Sans TC", sans-serif',
                  color: '#2F6F4E',
                  mb: 2
                }}
              >
                📌 我的紀錄
              </Typography>
              <List sx={{ p: 0 }}>
                {myVisits.map((visit, index) => (
                  <React.Fragment key={visit.id}>
                    {renderVisitItem(visit, true)}
                    {index < myVisits.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            </Box>
          )}

          {/* 所有使用者評論 */}
          <Box>
            <Typography 
              variant="subtitle1" 
              sx={{ 
                fontWeight: 600,
                fontFamily: '"Noto Sans TC", sans-serif',
                color: '#333333',
                mb: 2
              }}
            >
              💬 所有使用者評論
            </Typography>

            {allVisits.length === 0 ? (
              <Box sx={{ 
                textAlign: 'center', 
                py: 4,
                backgroundColor: '#FAF5EF',
                borderRadius: 2,
                border: '1px dashed #E8E0D6'
              }}>
                <Typography 
                  variant="body1" 
                  sx={{ 
                    color: '#666666',
                    fontFamily: '"Noto Sans TC", sans-serif',
                    mb: 2
                  }}
                >
                  目前還沒有造訪評論，成為第一個分享的人吧！
                </Typography>
                <Button
                  variant="outlined"
                  onClick={handleAddClick}
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
                  分享我的造訪心得
                </Button>
              </Box>
            ) : (
              <List sx={{ p: 0 }}>
                {allVisits.map((visit, index) => (
                  <React.Fragment key={visit.id}>
                    {renderVisitItem(visit)}
                    {index < allVisits.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            )}
          </Box>
        </>
      )}

      {/* 新增造訪紀錄對話框 */}
      <Dialog open={showAddDialog} onClose={() => setShowAddDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6" sx={{ fontFamily: '"Noto Sans TC", sans-serif', fontWeight: 700 }}>
              新增造訪紀錄
            </Typography>
            <IconButton onClick={() => setShowAddDialog(false)} size="small">
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            {error && (
              <Alert severity="error" sx={{ fontFamily: '"Noto Sans TC", sans-serif' }}>
                {error}
              </Alert>
            )}

            <TextField
              label="造訪日期"
              type="date"
              value={newRecord.date}
              onChange={(e) => setNewRecord(prev => ({ ...prev, date: e.target.value }))}
              fullWidth
              InputLabelProps={{ shrink: true }}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
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
              rows={4}
              value={newRecord.note}
              onChange={(e) => setNewRecord(prev => ({ ...prev, note: e.target.value }))}
              fullWidth
              placeholder="分享您的造訪心得..."
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            />

            {/* 照片上傳 */}
            <Box sx={{ border: '1px dashed #E8E0D6', borderRadius: 2, p: 2, textAlign: 'center' }}>
              <input
                type="file"
                accept="image/jpeg,image/png"
                multiple
                onChange={handleFileChange}
                style={{ display: 'none' }}
                id="photo-upload"
              />
              <Button
                variant="outlined"
                startIcon={<AddPhotoAlternate />}
                onClick={() => document.getElementById('photo-upload')?.click()}
                sx={{
                  borderColor: '#2F6F4E',
                  color: '#2F6F4E',
                  fontFamily: '"Noto Sans TC", sans-serif',
                  '&:hover': { backgroundColor: '#FAF5EF' },
                  mb: 1
                }}
              >
                上傳照片 ({newRecord.photos.length})
              </Button>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 2, justifyContent: 'center' }}>
                {newRecord.photos.map((photo, index) => (
                  <Box key={index} sx={{ position: 'relative', width: 60, height: 60, borderRadius: 1, overflow: 'hidden' }}>
                    <img
                      src={photo.preview}
                      alt={`預覽 ${index + 1}`}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                    <IconButton
                      size="small"
                      onClick={() => handleRemovePhoto(index)}
                      sx={{
                        position: 'absolute',
                        top: 2,
                        right: 2,
                        backgroundColor: 'rgba(0,0,0,0.6)',
                        color: 'white',
                        '&:hover': { backgroundColor: 'rgba(0,0,0,0.8)' }
                      }}
                    >
                      <Close sx={{ fontSize: 12 }} />
                    </IconButton>
                  </Box>
                ))}
              </Box>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button 
            onClick={() => setShowAddDialog(false)} 
            disabled={isSubmitting}
            sx={{ fontFamily: '"Noto Sans TC", sans-serif' }}
          >
            取消
          </Button>
          <Button 
            onClick={handleAddRecord} 
            variant="contained"
            disabled={!newRecord.note.trim() || isSubmitting}
            sx={{
              backgroundColor: '#2F6F4E',
              fontFamily: '"Noto Sans TC", sans-serif',
              '&:hover': { backgroundColor: '#1F4A33' }
            }}
          >
            {isSubmitting ? <CircularProgress size={24} color="inherit" /> : '新增紀錄'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default VisitRecordsSection
