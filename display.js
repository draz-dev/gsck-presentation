import { gsap } from 'gsap';
import Reveal from 'reveal.js';
import 'reveal.js/reveal.css';
import 'reveal.js/theme/black.css';
import { socket } from './shared/socket.js';

// Root level identifier to indicate JS ready
document.documentElement.classList.add('js-ready');

let activeTimeline = null;
let currentBgAudio = null;
const audioCache = {};

const customAudioPaths = {
  guttila1: '/assets/Slide 09 Audio 01 Guttila.mp3.mpeg',
  guttila2: '/assets/Slide 09 Audio 02 Guttila.mp3.mpeg',
  slide13: '/assets/Sounds/slide 13 audio.mp3'
};
const customAudioCache = {};
let isMuted = false;

function getCustomAudio(track) {
  const path = customAudioPaths[track];
  if (!path) return null;
  if (!customAudioCache[track]) {
    customAudioCache[track] = new Audio(encodeURI(path));
    customAudioCache[track].muted = isMuted;
  }
  return customAudioCache[track];
}

function stopAllAudio(activeSlide) {
  if (currentBgAudio) {
    currentBgAudio.onended = null; // Clear auto-transition listener
    currentBgAudio.pause();
    currentBgAudio.currentTime = 0;
    currentBgAudio = null;
  }
  Object.values(customAudioCache).forEach(audio => {
    audio.pause();
    audio.currentTime = 0;
  });

  // Clear all iframes that are NOT inside the active slide to stop background playback
  const allIframes = document.querySelectorAll('iframe');
  allIframes.forEach(iframe => {
    if (!activeSlide || !activeSlide.contains(iframe)) {
      iframe.src = '';
    }
  });
}

function playInnerAnimations(slide) {
  if (!slide) return;

  const currentSlideNum = slide.getAttribute('data-slide');
  console.log(`[Audience View] Animate Slide: #${currentSlideNum}`);

  if (activeTimeline) {
    activeTimeline.kill();
  }

  // Handle slide audio
  stopAllAudio(slide);
  const audioSrc = slide.getAttribute('data-audio');
  if (audioSrc) {
    if (!audioCache[audioSrc]) {
      audioCache[audioSrc] = new Audio(encodeURI(audioSrc));
    }
    currentBgAudio = audioCache[audioSrc];
    currentBgAudio.muted = isMuted;

    // Auto-transition back to Slide 1 when National Anthem ends
    if (audioSrc === '/assets/anthemaudio.mpeg') {
      currentBgAudio.onended = () => {
        console.log('[Audience Audio] National Anthem ended. Going back to Slide 1.');
        socket.emit("slidechange", { indexh: 0, indexv: 0, fIndex: 0 });
        Reveal.slide(0, 0, 0);
      };
    } else {
      currentBgAudio.onended = null;
    }

    currentBgAudio.play().catch(e => {
      console.warn('[Audience Audio] Autoplay blocked (requires interaction):', e);
    });
  }

  // Handle active slide iframe loading
  const iframe = slide.querySelector('iframe');
  if (iframe) {
    if (!iframe.src && iframe.dataset.src) {
      iframe.src = iframe.dataset.src;
    }
  }

  const video = slide.querySelector('video');
  if (video) {
    try {
      if (!video.src && video.dataset.src) {
        video.src = video.dataset.src;
      }
      // Play with audio if data-with-audio="true" is specified, otherwise keep muted
      if (video.getAttribute('data-with-audio') === 'true') {
        video.muted = isMuted;
      } else {
        video.muted = true;
      }
      video.load();
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          console.warn('[Audience Video] Playback blocked or failed:', error);
          // If unmuted autoplay fails, try muted playback so it plays visually
          if (video.getAttribute('data-with-audio') === 'true' && !video.muted) {
            console.log('[Audience Video] Attempting muted fallback playback...');
            video.muted = true;
            video.play().catch(err => console.error('[Audience Video] Muted fallback also failed:', err));
          }
        });
      }
    } catch (e) {
      console.warn('[Audience Video] Playback failed:', e);
    }
  }

  const animatable = Array.from(slide.querySelectorAll('[class*="gsap-"]'));
  if (animatable.length === 0) return;

  try {
    const tl = gsap.timeline();
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
      duration: 0.4,
      stagger: 0.08,
      ease: 'power3.out',
      clearProps: 'transform'
    });
  } catch (err) {
    console.error('[Audience View] GSAP animation failed:', err);
    animatable.forEach(el => {
      el.style.opacity = '1';
      el.style.transform = 'none';
    });
  }
}

function init() {
  console.log('[Audience View] Initializing...');

  // Click anywhere on display page to satisfy browser autoplay policies and unmute active video
  document.addEventListener('click', () => {
    console.log('[Audience View] Interaction registered; unmuting any active with-audio videos.');
    const videos = document.querySelectorAll('video[data-with-audio="true"]');
    videos.forEach(video => {
      if (!video.paused && video.muted) {
        video.muted = isMuted;
      }
    });
  });

  // Setup Event Listeners BEFORE initialize
  Reveal.on('slidechanged', event => {
    playInnerAnimations(event.currentSlide);
    if (event.previousSlide) {
      const prevVideo = event.previousSlide.querySelector('video');
      if (prevVideo && !prevVideo.paused) {
        prevVideo.pause();
      }
    }
  });

  Reveal.on('ready', event => {
    playInnerAnimations(event.currentSlide);
  });

  Reveal.initialize({
    controls: false,
    progress: false,
    keyboard: false,
    overview: false,
    touch: false,
    disableLayout: true,
    width: 1920,
    height: 1080,
    transition: 'fade',
    transitionSpeed: 'fast'
  }).then(() => {
    console.log('[Audience View] Reveal initialized');
  });

  // Synchronization Listener via WebSockets
  socket.on('stateUpdate', (state) => {
    if (!state) return;
    console.log(`[Audience View] Syncing from server: [${state.indexh}, ${state.indexv}, ${state.fIndex || 0}]`);
    Reveal.slide(
      state.indexh ?? 0,
      state.indexv ?? 0,
      state.fIndex ?? 0
    );
  });

  // Request presentation state immediately on connect or reconnect
  socket.on('connect', () => {
    console.log('[Audience View] Requesting current slide state from server');
    socket.emit('getCurrentState');
  });

  // Handle remote audio control events from presenter
  socket.on("audio-control", (data) => {
    if (!data) return;
    const { action, track, value } = data;
    console.log(`[Audience View] Audio Control event: ${action}`, data);

    if (action === "play") {
      stopAllAudio(Reveal.getCurrentSlide());
      const audio = getCustomAudio(track);
      if (audio) {
        audio.muted = isMuted;
        audio.play().catch(e => {
          console.warn(`[Audience Audio] Custom play blocked for ${track}:`, e);
        });
      }
    } else if (action === "stop") {
      const audio = getCustomAudio(track);
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
      }
    } else if (action === "stopAll") {
      stopAllAudio(Reveal.getCurrentSlide());
    } else if (action === "mute") {
      isMuted = value;
      // Mute custom audios
      Object.values(customAudioCache).forEach(audio => {
        audio.muted = isMuted;
      });
      // Mute background slide audios
      Object.values(audioCache).forEach(audio => {
        audio.muted = isMuted;
      });
      if (currentBgAudio) {
        currentBgAudio.muted = isMuted;
      }
    }
  });
}

document.addEventListener('DOMContentLoaded', init);
