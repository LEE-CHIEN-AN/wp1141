import React from 'react'
import { Box } from '@mui/material'
import Header from '../components/Header/Header'
import HealthCheck from '../components/HealthCheck'

const HealthCheckPage: React.FC = () => {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Header
        searchQuery=""
        onSearchChange={() => {}}
        onSearchSubmit={() => {}}
        isSearching={false}
        onAddStore={() => {}}
        user={null}
        onLogin={() => {}}
        onLogout={() => {}}
      />
      
      <Box sx={{ flex: 1, py: 4 }}>
        <HealthCheck />
      </Box>
    </Box>
  )
}

export default HealthCheckPage
