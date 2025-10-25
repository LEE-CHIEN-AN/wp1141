import React, { useEffect, useState } from 'react'
import { Box, Typography, Button, Alert } from '@mui/material'

const GoogleMapsTest: React.FC = () => {
  const [status, setStatus] = useState<string>('檢查中...')
  const [error, setError] = useState<string>('')

  useEffect(() => {
    const checkGoogleMaps = () => {
      console.log('檢查 Google Maps API...')
      console.log('window.google:', window.google)
      console.log('window.google.maps:', window.google?.maps)
      console.log('window.google.maps.places:', window.google?.maps?.places)
      
      if (window.google && window.google.maps) {
        if (window.google.maps.places) {
          setStatus('✅ Google Maps API 和 Places 庫已載入')
          setError('')
        } else {
          setStatus('⚠️ Google Maps API 已載入，但缺少 Places 庫')
          setError('Places 庫未載入')
        }
      } else {
        setStatus('❌ Google Maps API 未載入')
        setError('Google Maps API 未載入')
      }
    }

    // 等待一下讓 API 有時間載入
    setTimeout(checkGoogleMaps, 2000)
  }, [])

  const testPlacesAPI = () => {
    if (!window.google?.maps?.places) {
      setError('Places API 不可用')
      return
    }

    try {
      const autocompleteService = new window.google.maps.places.AutocompleteService()
      console.log('AutocompleteService 創建成功:', autocompleteService)
      
      const request = {
        input: '台北市咖啡廳',
        types: ['establishment'],
        componentRestrictions: { country: 'tw' }
      }

      autocompleteService.getPlacePredictions(request, (predictions, status) => {
        console.log('測試搜尋結果:', { predictions, status })
        if (status === window.google.maps.places.PlacesServiceStatus.OK) {
          setStatus(`✅ Places API 測試成功，找到 ${predictions?.length || 0} 個結果`)
          setError('')
        } else {
          setError(`Places API 測試失敗: ${status}`)
        }
      })
    } catch (err) {
      console.error('Places API 測試失敗:', err)
      setError(`Places API 測試失敗: ${err}`)
    }
  }

  return (
    <Box sx={{ p: 3, maxWidth: 600, mx: 'auto' }}>
      <Typography variant="h5" sx={{ mb: 2, fontFamily: '"Noto Sans TC", sans-serif' }}>
        Google Maps API 測試
      </Typography>
      
      <Alert severity={error ? 'error' : 'info'} sx={{ mb: 2 }}>
        {status}
      </Alert>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      <Button 
        variant="contained" 
        onClick={testPlacesAPI}
        disabled={!window.google?.maps?.places}
        sx={{ 
          backgroundColor: '#2F6F4E',
          '&:hover': { backgroundColor: '#1F4A33' }
        }}
      >
        測試 Places API
      </Button>
      
      <Box sx={{ mt: 2 }}>
        <Typography variant="body2" sx={{ fontFamily: '"Noto Sans TC", sans-serif' }}>
          <strong>環境變數檢查：</strong><br/>
          VITE_GOOGLE_MAPS_API_KEY: {(import.meta as any).env.VITE_GOOGLE_MAPS_API_KEY || '未設定'}
        </Typography>
      </Box>
    </Box>
  )
}

export default GoogleMapsTest
