import { TEXT_SOURCE } from './textSource.js'

import { VALID_LETTERS } from './constants.js'
import { VOWELS } from './constants.js'
import { TILE_COLORS } from './constants.js'
import { CIRCUMFERENCE } from './constants.js'

import { playBell } from './utils.js'

const tiles = document.querySelectorAll('.tile')
const timerArc = document.getElementById('timer-arc')
const timerDisplay = document.getElementById('timer-display')
const timerMessage = document.getElementById('timer-message')
const durationInput = document.getElementById('duration-input')
const durationInputLabel = document.getElementById('duration-input-label')
const wheel = document.getElementById('wheel')
const helpBtn = document.getElementById('help-btn')
const helpModal = document.getElementById('help-modal')
const helpPanel = helpModal.querySelector('.modal-panel')
const helpCloseTargets = helpModal.querySelectorAll('[data-close-help]')

timerArc.style.strokeDasharray = CIRCUMFERENCE
timerArc.style.strokeDashoffset = 0

let letterPool = []
let timerRunning = false
let timerEndTime = null
let totalDuration = null
let rafId = null
let pendingTile = null
let pendingTapId = null
const shuffleButton = document.getElementById('shuffle-btn')

// MAIN ============================================
function main() {
  buildLetterPool()
  generateWheel()
  setGameState(false)
}

main()


// FUNCTIONS ============================================

shuffleButton.addEventListener('click', () => {
  if (timerRunning) {
    stopTimer()
    return
  }

  generateWheel()
  startTimer()
})

wheel.addEventListener('click', (event) => {
  const tile = event.target.closest('.tile')
  if (!tile) return

  if (pendingTile === tile) {
    clearPendingTap()
    replaceTileLetter(tile)
    return
  }

  clearPendingTap()
  pendingTile = tile
  pendingTapId = window.setTimeout(() => {
    clearPendingTap()
  }, 400)
})

function clearPendingTap() {
  if (pendingTapId !== null) {
    clearTimeout(pendingTapId)
    pendingTapId = null
  }
  pendingTile = null
}

function setGameState(isRunning) {
  shuffleButton.textContent = isRunning ? 'Pysäytä' : 'Uusi'
  durationInputLabel.hidden = isRunning
  timerDisplay.hidden = !isRunning
  if (isRunning) {
    shuffleButton.classList.add('is-running')
    shuffleButton.classList.remove('is-idle')
  } else {
    shuffleButton.classList.remove('is-running')
    shuffleButton.classList.add('is-idle')
  }
}

function parseDurationMinutes(value) {
  const normalized = value.trim().replace(',', '.')
  const minutes = Number(normalized)
  return Number.isFinite(minutes) ? minutes : 0
}

function formatDurationPreview(minutes) {
  const totalSeconds = Math.round(minutes * 60)
  if (totalSeconds <= 0) return ''

  const mins = Math.floor(totalSeconds / 60)
  const secs = totalSeconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

function replaceTileLetter(tile) {
  const currentLetter = tile.textContent
  const currentIsVowel = VOWELS.includes(currentLetter)
  const currentVowelCount = Array.from(tiles).filter((t) =>
    VOWELS.includes(t.textContent),
  ).length

  const candidates = letterPool.filter((letter) => {
    if (letter === currentLetter) return false

    const nextVowelCount =
      currentVowelCount +
      (VOWELS.includes(letter) ? 1 : 0) -
      (currentIsVowel ? 1 : 0)

    return nextVowelCount >= 3 && nextVowelCount <= 6
  })

  if (candidates.length === 0) return

  const newLetter = candidates[Math.floor(Math.random() * candidates.length)]
  tile.textContent = newLetter
}

durationInput.addEventListener('input', () => {
  if (!timerRunning) {
    const mins = parseDurationMinutes(durationInput.value)
    timerDisplay.textContent = formatDurationPreview(mins)
    timerDisplay.hidden = true
    timerArc.style.strokeDashoffset = 0
    timerMessage.textContent = ''
  }
})

helpBtn.addEventListener('click', openHelpModal)

helpCloseTargets.forEach((target) => {
  target.addEventListener('click', closeHelpModal)
})

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !helpModal.classList.contains('hidden')) {
    closeHelpModal()
  }
})

helpPanel.addEventListener('click', (event) => {
  event.stopPropagation()
})

function openHelpModal() {
  helpModal.classList.remove('hidden')
  helpModal.setAttribute('aria-hidden', 'false')
  helpBtn.setAttribute('aria-expanded', 'true')
  helpModal.querySelector('.modal-close').focus()
}

function closeHelpModal() {
  helpModal.classList.add('hidden')
  helpModal.setAttribute('aria-hidden', 'true')
  helpBtn.setAttribute('aria-expanded', 'false')
  helpBtn.focus()
}

function buildLetterPool() {
  const upper = TEXT_SOURCE.toUpperCase()
  for (const char of upper) {
    if (VALID_LETTERS.includes(char)) {
      letterPool.push(char)
    }
  }
}

function generateWheel() {
  while (true) {
    const letters = []
    for (let i = 0; i < 9; i++) {
      const idx = Math.floor(Math.random() * letterPool.length)
      letters.push(letterPool[idx])
    }

    const vowelCount = letters.filter((l) => VOWELS.includes(l)).length

    if (vowelCount >= 3 && vowelCount <= 6) {
      const colors = [...TILE_COLORS].sort(() => Math.random() - 0.5)
      tiles.forEach((tile, i) => {
        tile.textContent = letters[i]
        tile.style.backgroundColor = colors[i]
        const rotation = Math.floor(Math.random() * 360)
        tile.style.transform = `translate(-50%, -50%) rotate(${rotation}deg)`
      })
      return
    }
  }
}

function startTimer() {
  const minutes = parseDurationMinutes(durationInput.value)

  if (minutes <= 0) {
    if (rafId) cancelAnimationFrame(rafId)
    timerRunning = false
    setGameState(false)
    timerDisplay.textContent = ''
    timerArc.style.strokeDashoffset = 0
    timerMessage.textContent = ''
    return
  }

  totalDuration = minutes * 60 * 1000
  timerEndTime = Date.now() + totalDuration
  timerRunning = true
  setGameState(true)
  timerMessage.textContent = ''
  if (rafId) cancelAnimationFrame(rafId)
  tick()
}

function stopTimer() {
  if (rafId) cancelAnimationFrame(rafId)
  timerRunning = false
  timerEndTime = null
  totalDuration = null
  setGameState(false)
  timerDisplay.textContent = ''
  timerArc.style.strokeDashoffset = 0
  timerMessage.textContent = ''
}

function tick() {
  const remaining = Math.max(0, timerEndTime - Date.now())
  const fraction = remaining / totalDuration

  timerArc.style.strokeDashoffset = CIRCUMFERENCE * (1 - fraction)

  const mins = Math.floor(remaining / 60000)
  const secs = Math.floor((remaining % 60000) / 1000)
  timerDisplay.textContent = `${mins}:${secs.toString().padStart(2, '0')}`

  if (remaining === 0) {
    timerRunning = false
    timerEndTime = null
    totalDuration = null
    setGameState(false)
    timerMessage.textContent = 'Aika loppui!'
    playBell()
    return
  }

  rafId = requestAnimationFrame(tick)
}
