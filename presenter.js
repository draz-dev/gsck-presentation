import { gsap } from 'gsap';
import Reveal from 'reveal.js';
import 'reveal.js/reveal.css';
import 'reveal.js/theme/black.css';
import RevealNotes from 'reveal.js/plugin/notes';
import { socket } from './shared/socket.js';

document.documentElement.classList.add('js-ready');

// Audio management state
let isMuted = false;
const audioCache = {};

const allAudioPaths = [
  '/assets/Sounds/Slide 02 Audio.mp3',
  '/assets/Sounds/Slide 03 Audio.mp3',
  '/assets/Sounds/Slide 06 Audio.mp3',
  '/assets/Sounds/Slide 09 Audio 01 Guttila.mp3',
  '/assets/Sounds/Slide 09 Audio 02 Guttila.mp3',
  '/assets/Sounds/slide 13 audio.mp3'
];

function preloadAllAudio() {
  allAudioPaths.forEach(path => {
    try {
      const encoded = encodeURI(path);
      const audio = new Audio(encoded);
      audio.preload = 'auto';
      audio.muted = isMuted;
      audio.load();
      audioCache[path] = audio;
      console.log(`[Presenter Audio] Preloaded: ${path}`);
    } catch (err) {
      console.error(`[Presenter Audio] Preload failed: ${path}`, err);
    }
  });
}

let guttilaAudio1, guttilaAudio2, slide13Audio;

function setupAudioInstances() {
  guttilaAudio1 = audioCache['/assets/Sounds/Slide 09 Audio 01 Guttila.mp3'] || new Audio(encodeURI('/assets/Sounds/Slide 09 Audio 01 Guttila.mp3'));
  guttilaAudio2 = audioCache['/assets/Sounds/Slide 09 Audio 02 Guttila.mp3'] || new Audio(encodeURI('/assets/Sounds/Slide 09 Audio 02 Guttila.mp3'));
  slide13Audio = audioCache['/assets/Sounds/slide 13 audio.mp3'] || new Audio(encodeURI('/assets/Sounds/slide 13 audio.mp3'));
}

let currentBgAudio = null;
let currentAudio = null;

function playAudio(audio) {
  stopAll();
  currentAudio = audio;
  if (currentAudio) {
    currentAudio.muted = isMuted;
    currentAudio.play().catch(e => console.warn('[Presenter Audio] Playback blocked:', e));
  }
  updateAudioButtonStates();
}

function stopAll() {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
  }
  if (guttilaAudio1) { guttilaAudio1.pause(); guttilaAudio1.currentTime = 0; }
  if (guttilaAudio2) { guttilaAudio2.pause(); guttilaAudio2.currentTime = 0; }
  if (slide13Audio) { slide13Audio.pause(); slide13Audio.currentTime = 0; }
  if (currentBgAudio) { currentBgAudio.pause(); currentBgAudio.currentTime = 0; currentBgAudio = null; }
  updateAudioButtonStates();
}

function updateAudioButtonStates() {
  const btnG1 = document.getElementById('btn-audio-guttila1');
  const btnG2 = document.getElementById('btn-audio-guttila2');
  const btnS13 = document.getElementById('btn-audio-slide13');
  const labelG = document.getElementById('guttila-audio-status');
  const labelS13 = document.getElementById('slide13-audio-status');

  if (btnG1) btnG1.innerHTML = guttilaAudio1 && !guttilaAudio1.paused ? '◼ Stop 1' : '▶ Play 1';
  if (btnG2) btnG2.innerHTML = guttilaAudio2 && !guttilaAudio2.paused ? '◼ Stop 2' : '▶ Play 2';
  if (btnS13) btnS13.innerHTML = slide13Audio && !slide13Audio.paused ? '◼ Stop Track' : '▶ Play Track';

  let gStatus = 'Stopped';
  if (guttilaAudio1 && !guttilaAudio1.paused) gStatus = 'Playing Audio 1';
  if (guttilaAudio2 && !guttilaAudio2.paused) gStatus = 'Playing Audio 2';
  if (labelG) labelG.textContent = gStatus;

  if (labelS13) {
    labelS13.textContent = slide13Audio && !slide13Audio.paused ? 'Playing' : 'Stopped';
  }
}

// Timer Logic
let timerSeconds = 0;
let timerInterval = null;
let timerRunning = false;

function startTimer() {
  if (timerRunning) return;
  timerRunning = true;
  timerInterval = setInterval(() => {
    timerSeconds++;
    updateTimerDisplay();
  }, 1000);
}

function pauseTimer() {
  timerRunning = false;
  clearInterval(timerInterval);
}

function resetTimer() {
  timerSeconds = 0;
  updateTimerDisplay();
}

function updateTimerDisplay() {
  const hrs = Math.floor(timerSeconds / 3600).toString().padStart(2, '0');
  const mins = Math.floor((timerSeconds % 3600) / 60).toString().padStart(2, '0');
  const secs = (timerSeconds % 60).toString().padStart(2, '0');
  const display = document.getElementById('timer-display');
  if (display) {
    display.textContent = `${hrs}:${mins}:${secs}`;
  }
}

// Authoritative sync broadcast
function broadcastState() {
  console.log('[Presenter Console] Broadcasting slide change:', Reveal.getIndices());
  socket.emit("slidechange", {
    indexh: Reveal.getIndices().h,
    indexv: Reveal.getIndices().v,
    fIndex: Reveal.getIndices().f || 0
  });
}

// Extract Slide Notes & Next Slide Preview
function updatePresenterConsole(currentSlide) {
  if (!currentSlide) return;

  const indices = Reveal.getIndices();
  const currentSlideIdx = indices.h;
  const totalSlides = Reveal.getTotalSlides();

  // 1. Counter Display
  const currentNumEl = document.getElementById('current-slide-num');
  const totalNumEl = document.getElementById('total-slide-num');
  if (currentNumEl) currentNumEl.textContent = currentSlideIdx + 1;
  if (totalNumEl) totalNumEl.textContent = totalSlides;

  // 2. Extract Notes
  const notesEl = currentSlide.querySelector('aside.notes');
  const notesContentEl = document.getElementById('notes-content');
  if (notesContentEl) {
    if (notesEl) {
      notesContentEl.innerHTML = notesEl.innerHTML;
    } else {
      notesContentEl.innerHTML = '<span class="text-zinc-500 italic">No notes written for this slide.</span>';
    }
  }

  // 3. Render Next Slide Preview
  const nextStage = document.getElementById('next-preview-stage');
  const nextIndicator = document.getElementById('next-slide-indicator');
  if (nextStage) {
    const nextIdx = currentSlideIdx + 1;
    if (nextIdx < totalSlides) {
      if (nextIndicator) nextIndicator.textContent = `Slide ${nextIdx + 1}`;
      const nextSlideEl = Reveal.getSlides()[nextIdx];
      if (nextSlideEl) {
        // Clone slide content into next stage for visual preview
        const clone = nextSlideEl.cloneNode(true);
        const canvas = clone.querySelector('.slide-canvas');
        if (canvas) {
          canvas.style.position = 'relative';
          canvas.style.width = '100%';
          canvas.style.height = '100%';
        }
        clone.querySelectorAll('[class*="gsap-"]').forEach(el => {
          el.style.opacity = '1';
          el.style.transform = 'none';
        });
        nextStage.innerHTML = '';
        nextStage.appendChild(clone);
      }
    } else {
      if (nextIndicator) nextIndicator.textContent = 'End';
      nextStage.innerHTML = '<span class="text-zinc-500 text-sm font-semibold">End of Presentation</span>';
    }
  }
}

// GSAP Animations control for local presenter preview slide
let activeTimeline = null;
function playInnerAnimations(slide) {
  if (!slide) return;
  if (activeTimeline) activeTimeline.kill();

  const video = slide.querySelector('video');
  if (video) {
    try {
      if (!video.src && video.dataset.src) video.src = video.dataset.src;
      video.muted = true;
      video.load();
      video.play().catch(() => {});
    } catch (e) {}
  }

  const animatable = Array.from(slide.querySelectorAll('[class*="gsap-"]'));
  if (animatable.length === 0) return;

  try {
    const tl = gsap.timeline();
    activeTimeline = tl;
    animatable.forEach(el => {
      const setProps = { opacity: 0 };
      if (el.classList.contains('gsap-slide-up')) setProps.y = 20;
      else if (el.classList.contains('gsap-slide-down')) setProps.y = -20;
      else if (el.classList.contains('gsap-slide-left')) setProps.x = 20;
      else if (el.classList.contains('gsap-slide-right')) setProps.x = -20;
      if (el.classList.contains('gsap-scale-in')) setProps.scale = 0.96;
      gsap.set(el, setProps);
    });

    tl.to(animatable, {
      opacity: 1,
      x: 0,
      y: 0,
      scale: 1,
      duration: 0.5,
      stagger: 0.08,
      ease: 'power2.out',
      clearProps: 'transform'
    });
  } catch (err) {
    animatable.forEach(el => el.style.opacity = '1');
  }
}

function init() {
  console.log('[Presenter Console] Initializing...');

  preloadAllAudio();
  setupAudioInstances();
  startTimer();

  // Setup local Reveal events
  Reveal.on('slidechanged', event => {
    console.log(`[Presenter Console] Slide changed locally: ${event.indexh}`);
    
    playInnerAnimations(event.currentSlide);
    stopAll();

    // Check if background slide audio exists
    const audioSrc = event.currentSlide.getAttribute('data-audio');
    if (audioSrc) {
      const cached = audioCache[audioSrc] || new Audio(encodeURI(audioSrc));
      currentBgAudio = cached;
      currentBgAudio.muted = isMuted;
      currentBgAudio.play().catch(e => console.warn('[Presenter Audio] Background play blocked:', e));
    }

    updatePresenterConsole(event.currentSlide);
    broadcastState();
  });

  Reveal.on('ready', event => {
    updatePresenterConsole(event.currentSlide);
    playInnerAnimations(event.currentSlide);
    broadcastState();
  });

  // Re-sync local presenter deck if another controller (or server) triggers changes
  socket.on('stateUpdate', (state) => {
    if (!state) return;
    const { indexh, indexv, fIndex } = state;
    if (Reveal.getIndices().h !== indexh || Reveal.getIndices().v !== indexv) {
      console.log(`[Presenter Console] Synchronizing local slide to: [${indexh}, ${indexv}]`);
      Reveal.slide(indexh, indexv, fIndex);
    }
  });

  // Initialize local Reveal instance inside presenter console
  Reveal.initialize({
    width: 960,
    height: 540,
    margin: 0.02,
    controls: false,
    progress: false,
    keyboard: false, // Turn off Reveal's built-in keyboard navigation so we can control broadcastState cleanly
    center: true,
    hash: false,
    transition: 'fade',
    plugins: [ RevealNotes ]
  });

  // Setup Keyboard control
  document.addEventListener("keydown", (e) => {
    switch (e.key) {
      case "ArrowRight":
      case " ":
        Reveal.next();
        break;
      case "ArrowLeft":
        Reveal.prev();
        break;
      case "Home":
        Reveal.slide(0);
        break;
      case "End":
        const total = Reveal.getTotalSlides();
        Reveal.slide(total - 1);
        break;
    }
    broadcastState();
  });

  // Setup Dashboard Controls
  document.getElementById('btn-next')?.addEventListener('click', () => { Reveal.next(); broadcastState(); });
  document.getElementById('btn-prev')?.addEventListener('click', () => { Reveal.prev(); broadcastState(); });
  document.getElementById('btn-first')?.addEventListener('click', () => { Reveal.slide(0); broadcastState(); });
  document.getElementById('btn-last')?.addEventListener('click', () => {
    const total = Reveal.getTotalSlides();
    Reveal.slide(total - 1);
    broadcastState();
  });

  // Timer Buttons
  document.getElementById('btn-timer-toggle')?.addEventListener('click', () => {
    if (timerRunning) {
      pauseTimer();
    } else {
      startTimer();
    }
  });
  document.getElementById('btn-timer-reset')?.addEventListener('click', resetTimer);

  // Mute / Unmute
  document.getElementById('btn-mute')?.addEventListener('click', (e) => {
    isMuted = !isMuted;
    e.currentTarget.textContent = isMuted ? '🔇 Muted' : '🔊 Unmuted';
    allAudioPaths.forEach(path => {
      if (audioCache[path]) {
        audioCache[path].muted = isMuted;
      }
    });
    if (guttilaAudio1) guttilaAudio1.muted = isMuted;
    if (guttilaAudio2) guttilaAudio2.muted = isMuted;
    if (slide13Audio) slide13Audio.muted = isMuted;
    if (currentBgAudio) currentBgAudio.muted = isMuted;
    if (currentAudio) currentAudio.muted = isMuted;
  });

  // Guttila Audio buttons event setup
  document.getElementById('btn-audio-guttila1')?.addEventListener('click', () => {
    if (guttilaAudio1.paused) {
      playAudio(guttilaAudio1);
    } else {
      guttilaAudio1.pause();
      updateAudioButtonStates();
    }
  });

  document.getElementById('btn-audio-guttila2')?.addEventListener('click', () => {
    if (guttilaAudio2.paused) {
      playAudio(guttilaAudio2);
    } else {
      guttilaAudio2.pause();
      updateAudioButtonStates();
    }
  });

  document.getElementById('btn-audio-slide13')?.addEventListener('click', () => {
    if (slide13Audio.paused) {
      playAudio(slide13Audio);
    } else {
      slide13Audio.pause();
      updateAudioButtonStates();
    }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
