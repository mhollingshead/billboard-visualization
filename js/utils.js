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

async function createTrack(url) {
    const audio = new Audio(url);
    audio.crossOrigin = "anonymous";

    const source = audioCtx.createMediaElementSource(audio);
    const gain = audioCtx.createGain();

    source.connect(gain).connect(audioCtx.destination);

    audio.addEventListener('ended', () => {
        // Only restart if this track is still the active one
        if (state.currentTrack?.audio === audio) {
            audio.currentTime = 0;
            audio.play();
        }
    });

    return { audio, source, gain };
}

function fadeOut(track, duration = 1.5) {
    const now = audioCtx.currentTime;

    track.gain.gain.cancelScheduledValues(now);
    track.gain.gain.setValueAtTime(track.gain.gain.value, now);
    track.gain.gain.linearRampToValueAtTime(0, now + duration);

    setTimeout(() => {
        track.audio.pause();
        track.audio.src = "";
    }, duration * 1000);
}

function fadeIn(track, duration = 1.5, targetVolume = 1) {
    const now = audioCtx.currentTime;

    track.gain.gain.setValueAtTime(0, now);
    track.gain.gain.linearRampToValueAtTime(targetVolume, now + duration);

    track.audio.currentTime = 0;
    track.audio.play();
}

async function crossfadeTo(url, fadeDuration = 1.5) {
    const newTrack = await createTrack(url);

    if (state.currentTrack) {
        fadeOut(state.currentTrack, fadeDuration);
    }

    fadeIn(newTrack, fadeDuration);

    state.currentTrack = newTrack;
}