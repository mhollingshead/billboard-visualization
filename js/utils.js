const MONTH_DURATION = 4000;
const MAX_ROWS = 101;

const MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

const getMonthKey = date => date.slice(0, 7);
const getYear = date => date.slice(0, 4);
const getMonthName = date => MONTH_NAMES[Number(date.slice(5, 7)) - 1];
const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
const songKey = (title, artist) => `${title}|||${artist}`;

const chartEl = document.querySelector('#chart');
const dateEl = document.querySelector('#date');
const startEl = document.querySelector('#play-pause');
const timelineEl = document.querySelector('#timeline');
const prevEl = document.querySelector('#prev-week');
const nextEl = document.querySelector('#next-week');

const animateNumber = (
    el,
    target,
    {
        duration = 1000,
        easing = easeOutCubic
    } = {}
) => {
    const start = Number(el.innerText.replace(/,/g, "")) || 1;
    const change = target - start;
    const startTime = performance.now();

    function tick(now) {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = easing(progress);

        const value = Math.round(start + change * eased);
        el.innerText = value;

        if (progress < 1) {
            requestAnimationFrame(tick);
        } else {
            el.innerText = target;
        }
    }

    requestAnimationFrame(tick);
}

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
document.addEventListener("click", () => audioCtx.resume(), { once: true });

async function initAudioDecks() {
    if (state.audioDeckA && state.audioDeckB) return;

    const createDeck = () => {
        const audio = new Audio();
        audio.crossOrigin = "anonymous";

        audio.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';

        const source = audioCtx.createMediaElementSource(audio);
        const gain = audioCtx.createGain();
        source.connect(gain).connect(audioCtx.destination);

        audio.addEventListener('ended', () => {
            if (state.currentTrack?.audio === audio) {
                audio.currentTime = 0;
                audio.play();
            }
        });

        return { audio, source, gain, active: false };
    };

    state.audioDeckA = createDeck();
    state.audioDeckB = createDeck();

    await state.audioDeckA.audio.play().then(() => state.audioDeckA.audio.pause());
    await state.audioDeckB.audio.play().then(() => state.audioDeckB.audio.pause());
}

async function crossfadeTo(url, fadeDuration = 1.5) {
    const nextDeck = (state.currentTrack === state.audioDeckA) ? state.audioDeckB : state.audioDeckA;
    const oldDeck = state.currentTrack;

    nextDeck.audio.src = url;
    nextDeck.audio.currentTime = 0;
    nextDeck.active = true;

    const now = audioCtx.currentTime;
    nextDeck.gain.gain.setValueAtTime(0, now);
    nextDeck.gain.gain.linearRampToValueAtTime(1, now + fadeDuration);
    nextDeck.audio.play();

    if (oldDeck) {
        oldDeck.active = false;
        oldDeck.gain.gain.cancelScheduledValues(now);
        oldDeck.gain.gain.setValueAtTime(oldDeck.gain.gain.value, now);
        oldDeck.gain.gain.linearRampToValueAtTime(0, now + fadeDuration);
        setTimeout(() => oldDeck.audio.pause(), fadeDuration * 1000);
    }

    state.currentTrack = nextDeck;
}