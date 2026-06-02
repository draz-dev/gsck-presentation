import { gsap } from 'gsap';
import Reveal from 'reveal.js';
import 'reveal.js/reveal.css';
import 'reveal.js/theme/black.css';
import RevealNotes from 'reveal.js/plugin/notes';

// Audio management state
let isMuted = false;
const audioCache = {};

// 1. සියලුම ඕඩියෝ ෆයිල්ස් (පසුබිම් සින්දු සහ බටන් සින්දු සියල්ලම) මෙතනට ඇතුළත් කළා
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
      console.log(`[Audio Manager] Preloaded asset: ${path}`);
    } catch (err) {
      console.error(`[Audio Manager] Error preloading asset: ${path}`, err);
    }
  });
}

// Global reference for audio instances
let guttilaAudio1, guttilaAudio2, slide13Audio;

function setupAudioInstances() {
    guttilaAudio1 = audioCache['/assets/Sounds/Slide 09 Audio 01 Guttila.mp3'] || new Audio(encodeURI('/assets/Sounds/Slide 09 Audio 01 Guttila.mp3'));
    guttilaAudio2 = audioCache['/assets/Sounds/Slide 09 Audio 02 Guttila.mp3'] || new Audio(encodeURI('/assets/Sounds/Slide 09 Audio 02 Guttila.mp3'));
    slide13Audio = audioCache['/assets/Sounds/slide 13 audio.mp3'] || new Audio(encodeURI('/assets/Sounds/slide 13 audio.mp3'));
}

// පසුබිම් සින්දු පාලනය සඳහා වෙනම විචල්‍යයක්
let currentBgAudio = null;

/**
 * Builds and triggers a staggered GSAP timeline to animate
 * active slide contents into view, and plays video if present.
 */
let activeTimeline = null;
function playInnerAnimations(slide) {
  if (!slide) return;

  const currentSlideNum = slide.getAttribute('data-slide');
  console.log(`[Presentation Debug] Animate Slide: #${currentSlideNum}`);

  if (activeTimeline) {
    console.log('[Presentation Debug] Killing active timeline');
    activeTimeline.kill();
  }

  const video = slide.querySelector('video');
  if (video) {
    try {
      if (!video.src && video.dataset.src) {
        video.src = video.dataset.src;
      }
      video.muted = isMuted;
      video.load();
      console.log(`[Video Handler] Starting playback for slide #${currentSlideNum}: ${video.src}`);
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise.catch(error => console.warn('[Video Handler] Autoplay video blocked:', error));
      }
    } catch (e) {
      console.warn('[Video Handler] Video play failed:', e);
    }
  }

  const animatable = Array.from(slide.querySelectorAll('[class*="gsap-"]'));
  if (animatable.length === 0) {
    console.log('[Presentation Debug] No GSAP animatable layers found on slide');
    return;
  }

  try {
    const tl = gsap.timeline({
      onStart: () => console.log(`[Presentation Debug] GSAP animation started for slide #${currentSlideNum}`),
      onComplete: () => console.log(`[Presentation Debug] GSAP animation completed for slide #${currentSlideNum}`)
    });
    activeTimeline = tl;

    animatable.forEach(el => {
      const setProps = { opacity: 0 };
      if (el.classList.contains('gsap-slide-up')) setProps.y = 45;
      else if (el.classList.contains('gsap-slide-down')) setProps.y = -45;
      else if (el.classList.contains('gsap-slide-left')) setProps.x = 45;
      else if (el.classList.contains('gsap-slide-right')) setProps.x = -45;
      
      if (el.classList.contains('gsap-scale-in')) setProps.scale = 0.94;
      
      gsap.set(el, setProps);
    });

    tl.to(animatable, {
      opacity: 1,
      x: 0,
      y: 0,
      scale: 1,
      duration: 0.75,
      stagger: 0.12,
      ease: 'power3.out',
      clearProps: 'transform'
    });
  } catch (err) {
    console.error('[Presentation Debug] GSAP animation failed:', err);
    // Safe fallback: force visibility of elements if animation system fails
    animatable.forEach(el => {
      el.style.opacity = '1';
      el.style.transform = 'none';
    });
  }
}

// සියලුම සින්දු එකපාර නැවැත්වීමට ශක්තිමත් පද්ධතියක්
function stopAllGlobalAudios() {
  console.log('[Audio Manager] Stopping all active playbacks');
  if (guttilaAudio1) { guttilaAudio1.pause(); guttilaAudio1.currentTime = 0; }
  if (guttilaAudio2) { guttilaAudio2.pause(); guttilaAudio2.currentTime = 0; }
  if (slide13Audio) { slide13Audio.pause(); slide13Audio.currentTime = 0; }
  if (currentBgAudio) { currentBgAudio.pause(); currentBgAudio.currentTime = 0; currentBgAudio = null; }
}

// Verify resource load states and log status to the console
function verifySlideAssets() {
  const images = document.querySelectorAll('.slide-canvas img');
  const videos = document.querySelectorAll('.slide-canvas video');
  
  console.log(`[Diagnostic Report] Total images: ${images.length}, Total videos: ${videos.length}`);
  
  images.forEach(img => {
    if (img.complete) {
      if (img.naturalWidth === 0) {
        console.error(`[Asset Error] Image failed to load (404/Corrupted): ${img.src}`);
      } else {
        console.log(`[Asset Success] Image loaded successfully: ${img.src}`);
      }
    } else {
      img.addEventListener('load', () => console.log(`[Asset Success] Image loaded asynchronously: ${img.src}`));
      img.addEventListener('error', () => console.error(`[Asset Error] Image failed to load: ${img.src}`));
    }
  });

  videos.forEach(video => {
    video.addEventListener('loadeddata', () => console.log(`[Asset Success] Video data loaded: ${video.src || video.dataset.src}`));
    video.addEventListener('error', () => console.error(`[Asset Error] Video failed to load: ${video.src || video.dataset.src}`));
  });
}

function init() {
  console.log('[Presentation Debug] Initializing Presentation Deck...');
  document.documentElement.classList.add('js-ready');
  
  preloadAllAudio();
  setupAudioInstances();
  verifySlideAssets();

  // ස්ලයිඩ් මාරු වෙද්දී පසුබිම් සින්දු (Background Tracks) පාලනය කිරීම
  Reveal.on('slidechanged', event => {
    const activeIdx = Reveal.getIndices().h + 1;
    console.log(`[Presentation Debug] Slide changed to index: ${activeIdx}`);
    playInnerAnimations(event.currentSlide);
    
    // 1. හැම ස්ලයිඩ් එකක් මාරු වෙද්දීම කලින් දිවෙන්න සලස්වපු ඔක්කොම සින්දු නවත්වනවා
    stopAllGlobalAudios();

    // 2. බටන් වල පෙනුම රීසෙට් කිරීම
    const b1 = document.getElementById('guttila-btn-1');
    const b2 = document.getElementById('guttila-btn-2');
    if (b1) b1.innerHTML = '▶ Play Audio 1';
    if (b2) b2.innerHTML = '▶ Play Audio 2';
    
    const b3 = document.getElementById('btn-audio-slide12');
    if (b3) {
      b3.innerHTML = `
        <svg class="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"></path>
        </svg>
        Play Slide 13 Audio
      `;
    }

    // 3. අලුත් ස්ලයිඩ් එකට අදාළව data-audio එකක් තියෙනවාද බලා ප්ලේ කිරීම
    const audioSrc = event.currentSlide.getAttribute('data-audio');
    if (audioSrc) {
        console.log(`[Audio Manager] Play background audio track: ${audioSrc}`);
        const cachedAudio = audioCache[audioSrc] || new Audio(encodeURI(audioSrc));
        currentBgAudio = cachedAudio;
        currentBgAudio.muted = isMuted;
        currentBgAudio.play().catch(e => console.warn("[Audio Manager] Background audio play blocked:", e));
    }

    // Pause any active videos in previous slides
    if (event.previousSlide) {
        const prevVideo = event.previousSlide.querySelector('video');
        if (prevVideo && !prevVideo.paused) {
            prevVideo.pause();
            console.log('[Video Handler] Paused previous video playback');
        }
    }
  });

  Reveal.on('ready', event => {
    console.log('[Presentation Debug] Reveal.js is ready');
    playInnerAnimations(event.currentSlide);
  });

  Reveal.initialize({
      width: 1920,
      height: 1080,
      margin: 0.04,
      minScale: 0.2,
      maxScale: 2.0,
      controls: false,
      progress: false,
      center: true,
      hash: true,
      transition: 'fade',
      plugins: [ RevealNotes ]
  }).then(() => {
      console.log('[Presentation Debug] Reveal.initialize() promise resolved successfully');
  }).catch(err => {
      console.error('[Presentation Debug] Reveal.initialize() failed:', err);
  });

  // Start Overlay Logic
  const startBtn = document.getElementById('start-btn');
  const startOverlay = document.getElementById('start-overlay');
  
  if (startBtn && startOverlay) {
    startBtn.addEventListener('click', () => {
      console.log('[Presentation Debug] Start button clicked');
      try {
        const dummyAudio = new Audio();
        dummyAudio.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA==';
        dummyAudio.play().then(() => dummyAudio.pause()).catch(e => {});
      } catch (err) {}

      gsap.to(startOverlay, {
        opacity: 0,
        duration: 0.45,
        ease: 'power2.out',
        onComplete: () => {
          startOverlay.classList.add('hidden');
          startOverlay.style.display = 'none'; // Absolute fallback to prevent blocking interactions
        }
      });
    });
  }

  // ====== Guttila Independent Dual Audio Logic ======
  document.addEventListener('click', (e) => {
    const btn1 = e.target.closest('#guttila-btn-1');
    const btn2 = e.target.closest('#guttila-btn-2');
    const btnSlide13 = e.target.closest('#btn-audio-slide12');

    if (btn1) {
      if (guttilaAudio1.paused) {
        stopAllGlobalAudios(); // අනෙක් ඒවා එකපාර නවත්වයි
        guttilaAudio1.play();
        btn1.innerHTML = '◼ Stop Audio 1';
      } else {
        guttilaAudio1.pause();
        btn1.innerHTML = '▶ Play Audio 1';
      }
    } else if (btn2) {
      if (guttilaAudio2.paused) {
        stopAllGlobalAudios();
        guttilaAudio2.play();
        btn2.innerHTML = '◼ Stop Audio 2';
      } else {
        guttilaAudio2.pause();
        btn2.innerHTML = '▶ Play Audio 2';
      }
    } else if (btnSlide13) {
      if (slide13Audio.paused) {
        stopAllGlobalAudios();
        slide13Audio.play();
        btnSlide13.innerHTML = `
          <svg class="w-4 h-4 text-red-400 animate-pulse" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 10h6v6H9z"></path>
          </svg>
          Stop Slide 13 Audio
        `;
      } else {
        slide13Audio.pause();
        btnSlide13.innerHTML = `
          <svg class="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"></path>
          </svg>
          Play Slide 13 Audio
        `;
      }
    }
  });
}

// Start presentation setup on content ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}