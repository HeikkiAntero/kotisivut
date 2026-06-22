const TEXT_SOURCE = `
metsän tontuista, mökeistä, sammalesta ja puista.
Metsän tarina
Syvällä metsän syvyyksissä, tuuli humisee.
Auringon säteet siivilöityvät puiden latvojen läpi.
Metsätontut olivat metsän vartijoita.
Tontut asuivat pienissä sammalpeitteisissä mökeissä.
Puiden juuret ulottuivat syvälle maan uumeniin.
Tontut hoitivat eläimiä ja kasveja.
Metsä täyttyi valosta ja ilosta.
`;

const VALID_LETTERS = "ABCDEFGHIJKLMNOPRSTUVYÄÖ";
const VOWELS = "AEIOUYÄÖ";

const TILE_COLORS = [
    "#c62828", "#0277bd", "#4e342e",
    "#2e7d32", "#f9a825", "#6a1b9a",
    "#1a1a2e", "#ad1457", "#bf360c"
];

// Timer: circumference of SVG circle at r=50
const CIRCUMFERENCE = 2 * Math.PI * 50;

const tiles          = document.querySelectorAll(".tile");
const timerArc       = document.getElementById("timer-arc");
const timerDisplay   = document.getElementById("timer-display");
const timerMessage   = document.getElementById("timer-message");
const durationInput  = document.getElementById("duration-input");
const wheel          = document.getElementById("wheel");

timerArc.style.strokeDasharray  = CIRCUMFERENCE;
timerArc.style.strokeDashoffset = 0;

let letterPool    = [];
let timerRunning  = false;
let timerEndTime  = null;
let totalDuration = null;
let rafId         = null;
let pendingTile   = null;
let pendingTapId  = null;

buildLetterPool();
generateWheel();

document.getElementById("shuffle-btn").addEventListener("click", () => {
    generateWheel();
    startTimer();
});

wheel.addEventListener("click", (event) => {
    const tile = event.target.closest(".tile");
    if (!tile) return;

    if (pendingTile === tile) {
        clearPendingTap();
        replaceTileLetter(tile);
        return;
    }

    clearPendingTap();
    pendingTile = tile;
    pendingTapId = window.setTimeout(() => {
        clearPendingTap();
    }, 400);
});

function clearPendingTap() {
    if (pendingTapId !== null) {
        clearTimeout(pendingTapId);
        pendingTapId = null;
    }
    pendingTile = null;
}

function parseDurationMinutes(value) {
    const normalized = value.trim().replace(",", ".");
    const minutes = Number(normalized);
    return Number.isFinite(minutes) ? minutes : 0;
}

function formatDurationPreview(minutes) {
    const totalSeconds = Math.round(minutes * 60);
    if (totalSeconds <= 0) return "";

    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function replaceTileLetter(tile) {
    const currentLetter = tile.textContent;
    const currentIsVowel = VOWELS.includes(currentLetter);
    const currentVowelCount = Array.from(tiles).filter((t) => VOWELS.includes(t.textContent)).length;

    const candidates = letterPool.filter((letter) => {
        if (letter === currentLetter) return false;

        const nextVowelCount =
            currentVowelCount +
            (VOWELS.includes(letter) ? 1 : 0) -
            (currentIsVowel ? 1 : 0);

        return nextVowelCount >= 3 && nextVowelCount <= 6;
    });

    if (candidates.length === 0) return;

    const newLetter = candidates[Math.floor(Math.random() * candidates.length)];
    tile.textContent = newLetter;
}

durationInput.addEventListener("input", () => {
    if (!timerRunning) {
        const mins = parseDurationMinutes(durationInput.value);
        timerDisplay.textContent = formatDurationPreview(mins);
        timerArc.style.strokeDashoffset = 0;
        timerMessage.textContent = "";
    }
});

function buildLetterPool() {
    const upper = TEXT_SOURCE.toUpperCase();
    for (const char of upper) {
        if (VALID_LETTERS.includes(char)) {
            letterPool.push(char);
        }
    }
}

function generateWheel() {
    while (true) {
        const letters = [];
        for (let i = 0; i < 9; i++) {
            const idx = Math.floor(Math.random() * letterPool.length);
            letters.push(letterPool[idx]);
        }

        const vowelCount = letters.filter(l => VOWELS.includes(l)).length;

        if (vowelCount >= 3 && vowelCount <= 6) {
            const colors = [...TILE_COLORS].sort(() => Math.random() - 0.5);
            tiles.forEach((tile, i) => {
                tile.textContent = letters[i];
                tile.style.backgroundColor = colors[i];
                const rotation = Math.floor(Math.random() * 360);
                tile.style.transform = `translate(-50%, -50%) rotate(${rotation}deg)`;
            });
            return;
        }
    }
}

function startTimer() {
    const minutes = parseDurationMinutes(durationInput.value);

    if (minutes <= 0) {
        if (rafId) cancelAnimationFrame(rafId);
        timerRunning = false;
        timerDisplay.textContent = "";
        timerArc.style.strokeDashoffset = 0;
        timerMessage.textContent = "";
        return;
    }

    totalDuration = minutes * 60 * 1000;
    timerEndTime  = Date.now() + totalDuration;
    timerRunning  = true;
    timerMessage.textContent = "";
    if (rafId) cancelAnimationFrame(rafId);
    tick();
}

function tick() {
    const remaining = Math.max(0, timerEndTime - Date.now());
    const fraction  = remaining / totalDuration;

    timerArc.style.strokeDashoffset = CIRCUMFERENCE * (1 - fraction);

    const mins = Math.floor(remaining / 60000);
    const secs = Math.floor((remaining % 60000) / 1000);
    timerDisplay.textContent = `${mins}:${secs.toString().padStart(2, "0")}`;

    if (remaining === 0) {
        timerRunning = false;
        timerMessage.textContent = "Aika loppui!";
        playBell();
        return;
    }

    rafId = requestAnimationFrame(tick);
}

function playBell() {
    try {
        const ctx  = new AudioContext();
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = 830;
        osc.type = "sine";
        gain.gain.setValueAtTime(0.8, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 2);
        osc.start();
        osc.stop(ctx.currentTime + 2);
    } catch (e) {
        // audio not available
    }
}
