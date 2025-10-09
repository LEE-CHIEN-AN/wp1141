import React, { useEffect } from 'react'
import { motion } from 'framer-motion'
import { SpaceBackgroundProps } from '../types'
import { convertGoogleDriveAudioUrl } from '../utils'
import './SpaceBackground.css'

const SpaceBackground: React.FC<SpaceBackgroundProps> = ({ audioRef }) => {
  // Google Drive 音訊連結
  const googleDriveAudioUrl = 'https://drive.google.com/file/d/1bBHRlQcI2fyKEoNCq59e6jZ9I3tlZdO1/view?usp=drive_link'
  const audioSrc = convertGoogleDriveAudioUrl(googleDriveAudioUrl)

  // 生成隨機星星
  const stars = Array.from({ length: 200 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 4 + 1,
    delay: Math.random() * 3,
    brightness: Math.random() * 0.8 + 0.2
  }))

  // 生成星雲
  const nebulas = Array.from({ length: 5 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 300 + 200,
    color: ['#8B5CF6', '#3B82F6', '#EC4899', '#F59E0B', '#10B981'][i],
    opacity: Math.random() * 0.3 + 0.1
  }))

  // 生成行星
  const planets = Array.from({ length: 3 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 80 + 40,
    color: ['#8B5CF6', '#F59E0B', '#10B981'][i],
    orbitRadius: Math.random() * 100 + 50,
    orbitSpeed: Math.random() * 20 + 10
  }))

  // 音效控制
  useEffect(() => {
    const handleUserInteraction = () => {
      if (audioRef?.current) {
        audioRef.current.volume = 0.3
        audioRef.current.loop = true
        audioRef.current.play().catch(() => {
          // 忽略自動播放限制錯誤
        })
      }
    }

    // 在用戶首次互動時播放音效
    document.addEventListener('click', handleUserInteraction, { once: true })
    document.addEventListener('keydown', handleUserInteraction, { once: true })

    return () => {
      document.removeEventListener('click', handleUserInteraction)
      document.removeEventListener('keydown', handleUserInteraction)
    }
  }, [audioRef])

  return (
    <div className="space-background">
      {/* 音效 */}
      <audio ref={audioRef} preload="auto">
        <source src={audioSrc} type="audio/mpeg" />
      </audio>

      {/* 深空背景漸層 */}
      <div className="deep-space-gradient" />
      
      {/* 星雲效果 */}
      {nebulas.map(nebula => (
        <motion.div
          key={`nebula-${nebula.id}`}
          className="nebula"
          style={{
            left: `${nebula.x}%`,
            top: `${nebula.y}%`,
            width: `${nebula.size}px`,
            height: `${nebula.size}px`,
            background: `radial-gradient(circle, ${nebula.color}${Math.floor(nebula.opacity * 255).toString(16).padStart(2, '0')} 0%, transparent 70%)`,
            filter: 'blur(20px)'
          }}
          animate={{
            scale: [1, 1.2, 1],
            opacity: [nebula.opacity * 0.5, nebula.opacity, nebula.opacity * 0.5],
            rotate: [0, 360]
          }}
          transition={{
            duration: 20 + nebula.id * 5,
            repeat: Infinity,
            ease: "linear"
          }}
        />
      ))}

      {/* 行星軌道 */}
      {planets.map(planet => (
        <motion.div
          key={`planet-${planet.id}`}
          className="planet-orbit"
          style={{
            left: `${planet.x}%`,
            top: `${planet.y}%`,
            width: `${planet.orbitRadius * 2}px`,
            height: `${planet.orbitRadius * 2}px`
          }}
          animate={{ rotate: 360 }}
          transition={{
            duration: planet.orbitSpeed,
            repeat: Infinity,
            ease: "linear"
          }}
        >
          <div
            className="planet"
            style={{
              width: `${planet.size}px`,
              height: `${planet.size}px`,
              background: `radial-gradient(circle at 30% 30%, ${planet.color}, ${planet.color}80)`,
              boxShadow: `0 0 ${planet.size}px ${planet.color}40`
            }}
          />
        </motion.div>
      ))}

      {/* 星空背景 */}
      <div className="stars-container">
        {stars.map(star => (
          <motion.div
            key={star.id}
            className="star"
            style={{
              left: `${star.x}%`,
              top: `${star.y}%`,
              width: `${star.size}px`,
              height: `${star.size}px`,
              opacity: star.brightness
            }}
            animate={{
              opacity: [star.brightness * 0.3, star.brightness, star.brightness * 0.3],
              scale: [1, 1.5, 1],
              boxShadow: [
                `0 0 ${star.size}px rgba(255, 255, 255, 0.3)`,
                `0 0 ${star.size * 2}px rgba(255, 255, 255, 0.8)`,
                `0 0 ${star.size}px rgba(255, 255, 255, 0.3)`
              ]
            }}
            transition={{
              duration: 2 + Math.random() * 2,
              delay: star.delay,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
        ))}
      </div>

      {/* 流星效果 */}
      <motion.div
        className="meteor meteor-1"
        animate={{
          x: ['-100px', '100vw'],
          y: ['0px', '100px'],
          opacity: [0, 1, 0]
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          repeatDelay: 8,
          ease: "linear"
        }}
      />
      
      <motion.div
        className="meteor meteor-2"
        animate={{
          x: ['-50px', '100vw'],
          y: ['50px', '200px'],
          opacity: [0, 1, 0]
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          repeatDelay: 12,
          ease: "linear"
        }}
      />

      <motion.div
        className="meteor meteor-3"
        animate={{
          x: ['-80px', '100vw'],
          y: ['100px', '300px'],
          opacity: [0, 1, 0]
        }}
        transition={{
          duration: 2.5,
          repeat: Infinity,
          repeatDelay: 15,
          ease: "linear"
        }}
      />

      {/* 宇宙塵埃 */}
      <div className="cosmic-dust">
        {Array.from({ length: 50 }, (_, i) => (
          <motion.div
            key={`dust-${i}`}
            className="dust-particle"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              width: `${Math.random() * 2 + 1}px`,
              height: `${Math.random() * 2 + 1}px`
            }}
            animate={{
              y: [0, -20, 0],
              opacity: [0, 0.6, 0],
              scale: [0.5, 1, 0.5]
            }}
            transition={{
              duration: 3 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 3,
              ease: "easeInOut"
            }}
          />
        ))}
      </div>

      {/* 能量脈衝 */}
      <motion.div
        className="energy-pulse"
        animate={{
          scale: [1, 1.5, 1],
          opacity: [0.1, 0.3, 0.1]
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />

      {/* 宇宙射線 */}
      <div className="cosmic-rays">
        {Array.from({ length: 8 }, (_, i) => (
          <motion.div
            key={`ray-${i}`}
            className="cosmic-ray"
            style={{
              transform: `rotate(${i * 45}deg)`,
              transformOrigin: 'center'
            }}
            animate={{
              opacity: [0, 0.3, 0],
              scaleY: [0.5, 1, 0.5]
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              delay: i * 0.2,
              ease: "easeInOut"
            }}
          />
        ))}
      </div>
    </div>
  )
}

export default SpaceBackground