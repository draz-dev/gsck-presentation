import { gsap } from 'gsap';
import Reveal from 'reveal.js';
import 'reveal.js/reveal.css';
import 'reveal.js/theme/black.css';
import RevealNotes from 'reveal.js/plugin/notes';
import { socket } from './shared/socket.js';

document.documentElement.classList.add('js-ready');

// Connection logs for debugging
socket.on("connect", () => {
  console.log("CONNECTED TO BACKEND:", socket.id);
});

socket.on("connect_error", (err) => {
  console.error("CONNECTION ERROR:", err);
});

// Audio management state
// Audio management state (Silent Presenter control)
let isMuted = false;
let guttila1Playing = false;
let guttila2Playing = false;
let slide13Playing = false;

function playAudio(track) {
  stopAll();
  if (track === 'guttila1') guttila1Playing = true;
  else if (track === 'guttila2') guttila2Playing = true;
  else if (track === 'slide13') slide13Playing = true;

  console.log(`[Presenter Audio] Emitting play track: ${track}`);
  socket.emit("audio-control", { action: "play", track: track });
  updateAudioButtonStates();
}

function stopAll(activeSlide) {
  guttila1Playing = false;
  guttila2Playing = false;
  slide13Playing = false;
  updateAudioButtonStates();

  // Reset all iframes that are NOT inside the active slide to stop background playback
  const allIframes = document.querySelectorAll('iframe');
  allIframes.forEach(iframe => {
    if (!activeSlide || !activeSlide.contains(iframe)) {
      const src = iframe.src;
      if (src && src !== 'about:blank') {
        iframe.src = '';
        iframe.src = src;
      }
    }
  });
}

function updateAudioButtonStates() {
  const btnG1 = document.getElementById('btn-audio-guttila1');
  const btnG2 = document.getElementById('btn-audio-guttila2');
  const btnS13 = document.getElementById('btn-audio-slide13');
  const labelG = document.getElementById('guttila-audio-status');
  const labelS13 = document.getElementById('slide13-audio-status');

  if (btnG1) btnG1.innerHTML = guttila1Playing ? '◼ Stop 1' : '▶ Play 1';
  if (btnG2) btnG2.innerHTML = guttila2Playing ? '◼ Stop 2' : '▶ Play 2';
  if (btnS13) btnS13.innerHTML = slide13Playing ? '◼ Stop Track' : '▶ Play Track';

  let gStatus = 'Stopped';
  if (guttila1Playing) gStatus = 'Playing Audio 1';
  if (guttila2Playing) gStatus = 'Playing Audio 2';
  if (labelG) labelG.textContent = gStatus;

  if (labelS13) {
    labelS13.textContent = slide13Playing ? 'Playing' : 'Stopped';
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
  const state = {
    indexh: Reveal.getIndices().h,
    indexv: Reveal.getIndices().v,
    fIndex: Reveal.getIndices().f || 0
  };
  console.log('[Presenter Console] Broadcasting slide change:', state);
  socket.emit("slidechange", state);
}

// Dedicated trigger functions for buttons
function nextSlide() {
  const indices = Reveal.getIndices();
  const total = Reveal.getTotalSlides();
  if (indices.h === total - 1) {
    Reveal.slide(0);
  } else {
    Reveal.next();
  }
  broadcastState();
}

function prevSlide() {
  Reveal.prev();
  broadcastState();
}

function firstSlide() {
  Reveal.slide(0);
  broadcastState();
}

function lastSlide() {
  const total = Reveal.getTotalSlides();
  Reveal.slide(total - 1);
  broadcastState();
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

        // Ensure video is visible in the preview by resolving its source and calling load()
        const previewVideo = clone.querySelector('video');
        if (previewVideo) {
          if (!previewVideo.src && previewVideo.dataset.src) {
            previewVideo.src = previewVideo.dataset.src;
          }
          previewVideo.muted = true;
          previewVideo.preload = 'auto';
          previewVideo.load();
        }

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

  startTimer();

  // Setup local Reveal events
  Reveal.on('slidechanged', event => {
    console.log(`[Presenter Console] Slide changed locally: ${event.indexh}`);
    
    playInnerAnimations(event.currentSlide);
    stopAll(event.currentSlide);
    socket.emit("audio-control", { action: "stopAll" });

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
    keyboard: false,
    center: true,
    hash: false,
    transition: 'fade',
    transitionSpeed: 'fast',
    plugins: [ RevealNotes ]
  });

  // Setup Keyboard control
  document.addEventListener("keydown", (e) => {
    switch (e.key) {
      case "ArrowRight":
      case " ":
        nextSlide();
        break;
      case "ArrowLeft":
        prevSlide();
        break;
      case "Home":
        firstSlide();
        break;
      case "End":
        lastSlide();
        break;
    }
  });

  // Setup Dashboard Controls (Support both click and pointerup for mobile responsive click trigger)
  const nextBtn = document.getElementById('btn-next');
  const prevBtn = document.getElementById('btn-prev');
  const firstBtn = document.getElementById('btn-first');
  const lastBtn = document.getElementById('btn-last');

  nextBtn?.addEventListener('click', nextSlide);
  prevBtn?.addEventListener('click', prevSlide);
  firstBtn?.addEventListener('click', firstSlide);
  lastBtn?.addEventListener('click', lastSlide);

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
    socket.emit("audio-control", { action: "mute", value: isMuted });
  });

  // Guttila Audio buttons event setup
  document.getElementById('btn-audio-guttila1')?.addEventListener('click', () => {
    if (!guttila1Playing) {
      playAudio('guttila1');
    } else {
      guttila1Playing = false;
      socket.emit("audio-control", { action: "stop", track: "guttila1" });
      updateAudioButtonStates();
    }
  });

  document.getElementById('btn-audio-guttila2')?.addEventListener('click', () => {
    if (!guttila2Playing) {
      playAudio('guttila2');
    } else {
      guttila2Playing = false;
      socket.emit("audio-control", { action: "stop", track: "guttila2" });
      updateAudioButtonStates();
    }
  });

  document.getElementById('btn-audio-slide13')?.addEventListener('click', () => {
    if (!slide13Playing) {
      playAudio('slide13');
    } else {
      slide13Playing = false;
      socket.emit("audio-control", { action: "stop", track: "slide13" });
      updateAudioButtonStates();
    }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
