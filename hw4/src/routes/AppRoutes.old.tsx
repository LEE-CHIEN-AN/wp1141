import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import HomePage from '../pages/HomePage'
import FavoritesPageContainer from '../pages/FavoritesPageContainer'
import MyVisitsPageContainer from '../pages/MyVisitsPageContainer'
import UserProfilePageContainer from '../pages/UserProfilePageContainer'
import HealthCheckPage from '../pages/HealthCheckPage'

const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/favorites" element={<FavoritesPageContainer />} />
      <Route path="/visits" element={<MyVisitsPageContainer />} />
      <Route path="/profile" element={<UserProfilePageContainer />} />
      <Route path="/health" element={<HealthCheckPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default AppRoutes
