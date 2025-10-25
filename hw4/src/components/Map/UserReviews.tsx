import React from 'react'
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Divider,
  Avatar,
  Rating
} from '@mui/material'
import { Person } from '@mui/icons-material'
import { UserReview } from '../../types'

interface UserReviewsProps {
  reviews: UserReview[]
}

const UserReviews: React.FC<UserReviewsProps> = ({ reviews }) => {
  if (!reviews || reviews.length === 0) {
    return (
      <Box sx={{ 
        borderTop: '1px solid #E8E0D6', 
        pt: 2 
      }}>
        <Typography 
          variant="subtitle1" 
          sx={{ 
            fontWeight: 600,
            fontFamily: '"Noto Sans TC", sans-serif',
            mb: 2
          }}
        >
          使用者評論
        </Typography>
        <Typography 
          variant="body2" 
          sx={{ 
            color: '#666666',
            fontFamily: '"Noto Sans TC", sans-serif',
            textAlign: 'center',
            py: 2
          }}
        >
          還沒有其他使用者的評論
        </Typography>
      </Box>
    )
  }

  return (
    <Box sx={{ 
      borderTop: '1px solid #E8E0D6', 
      pt: 2 
    }}>
      <Typography 
        variant="subtitle1" 
        sx={{ 
          fontWeight: 600,
          fontFamily: '"Noto Sans TC", sans-serif',
          mb: 2
        }}
      >
        使用者評論 ({reviews.length})
      </Typography>

      <List sx={{ p: 0 }}>
        {reviews.map((review, index) => (
          <React.Fragment key={review.id}>
            <ListItem sx={{ px: 0, py: 2, alignItems: 'flex-start' }}>
              <ListItemAvatar>
                <Avatar sx={{ backgroundColor: '#2F6F4E' }}>
                  {review.userAvatar ? (
                    <img 
                      src={review.userAvatar} 
                      alt={review.userName}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <Person />
                  )}
                </Avatar>
              </ListItemAvatar>
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
                      {review.userName}
                    </Typography>
                    <Typography 
                      variant="caption" 
                      sx={{ 
                        color: '#999999',
                        fontFamily: '"Noto Sans TC", sans-serif'
                      }}
                    >
                      {review.date}
                    </Typography>
                  </Box>
                }
                secondary={
                  <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <Rating 
                        value={review.rating} 
                        readOnly 
                        size="small"
                        sx={{ '& .MuiRating-iconFilled': { color: '#F4A261' } }}
                      />
                    </Box>
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        color: '#666666',
                        fontFamily: '"Noto Sans TC", sans-serif',
                        lineHeight: 1.4
                      }}
                    >
                      {review.review}
                    </Typography>
                  </Box>
                }
              />
            </ListItem>
            {index < reviews.length - 1 && <Divider />}
          </React.Fragment>
        ))}
      </List>
    </Box>
  )
}

export default UserReviews

