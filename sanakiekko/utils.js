export function playBell() {
  try {
    const ctx = new AudioContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.value = 830
    osc.type = 'sine'
    gain.gain.setValueAtTime(0.8, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 2)
    osc.start()
    osc.stop(ctx.currentTime + 2)
  } catch (e) {
    // audio not available
  }
}
