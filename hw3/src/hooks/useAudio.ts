// src/hooks/useAudio.ts
import { useRef, useCallback, useState } from 'react'
import { DEFAULT_AUDIO_VOLUME } from '../constants'

export const useAudio = () => {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [isMuted, setIsMuted] = useState(false)

  const toggleMute = useCallback(() => {
    setIsMuted(prev => {
      const newMuted = !prev
      if (audioRef.current) {
        audioRef.current.volume = newMuted ? 0 : DEFAULT_AUDIO_VOLUME
      }
      return newMuted
    })
  }, [])

  const playAudio = useCallback(() => {
    if (audioRef.current && !isMuted) {
      audioRef.current.volume = DEFAULT_AUDIO_VOLUME
      audioRef.current.loop = true
      audioRef.current.play().catch(() => {
        // 忽略自動播放限制錯誤
      })
    }
  }, [isMuted])

  return {
    audioRef,
    isMuted,
    toggleMute,
    playAudio
  }
}
