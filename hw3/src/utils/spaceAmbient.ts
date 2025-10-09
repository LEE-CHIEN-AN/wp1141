// 太空環境音效生成器
// 這個檔案會在瀏覽器中動態生成太空環境音效

class SpaceAmbientGenerator {
  private audioContext: AudioContext | null = null
  private oscillators: OscillatorNode[] = []
  private gainNode: GainNode | null = null
  private isPlaying = false

  async initialize() {
    if (this.audioContext) return

    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      this.gainNode = this.audioContext.createGain()
      this.gainNode.connect(this.audioContext.destination)
      this.gainNode.gain.value = 0.1 // 低音量
    } catch (error) {
      console.log('Web Audio API not supported')
    }
  }

  startAmbient() {
    if (!this.audioContext || !this.gainNode || this.isPlaying) return

    this.isPlaying = true

    // 創建多個低頻振盪器模擬太空環境
    const frequencies = [60, 80, 120, 200] // 低頻音調

    frequencies.forEach((freq, index) => {
      const oscillator = this.audioContext!.createOscillator()
      const gain = this.audioContext!.createGain()
      
      oscillator.type = 'sine'
      oscillator.frequency.setValueAtTime(freq, this.audioContext!.currentTime)
      
      // 添加輕微的頻率調製
      const lfo = this.audioContext!.createOscillator()
      const lfoGain = this.audioContext!.createGain()
      
      lfo.type = 'sine'
      lfo.frequency.setValueAtTime(0.1 + index * 0.05, this.audioContext!.currentTime)
      lfoGain.gain.setValueAtTime(5, this.audioContext!.currentTime)
      
      lfo.connect(lfoGain)
      lfoGain.connect(oscillator.frequency)
      
      gain.gain.setValueAtTime(0.02, this.audioContext!.currentTime)
      
      oscillator.connect(gain)
      gain.connect(this.gainNode!)
      
      oscillator.start()
      lfo.start()
      
      this.oscillators.push(oscillator)
    })

    // 添加白噪音模擬宇宙背景輻射
    const bufferSize = this.audioContext!.sampleRate * 2
    const noiseBuffer = this.audioContext!.createBuffer(1, bufferSize, this.audioContext!.sampleRate)
    const output = noiseBuffer.getChannelData(0)
    
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1
    }
    
    const whiteNoise = this.audioContext!.createBufferSource()
    whiteNoise.buffer = noiseBuffer
    whiteNoise.loop = true
    
    const noiseGain = this.audioContext!.createGain()
    noiseGain.gain.setValueAtTime(0.01, this.audioContext!.currentTime)
    
    whiteNoise.connect(noiseGain)
    noiseGain.connect(this.gainNode!)
    
    whiteNoise.start()
    this.oscillators.push(whiteNoise as any)
  }

  stopAmbient() {
    if (!this.isPlaying) return

    this.oscillators.forEach(oscillator => {
      try {
        oscillator.stop()
      } catch (error) {
        // 忽略已經停止的振盪器錯誤
      }
    })
    
    this.oscillators = []
    this.isPlaying = false
  }

  setVolume(volume: number) {
    if (this.gainNode) {
      this.gainNode.gain.value = Math.max(0, Math.min(1, volume))
    }
  }
}

// 導出單例
export const spaceAmbient = new SpaceAmbientGenerator()

// 自動初始化
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    spaceAmbient.initialize()
  })
}

