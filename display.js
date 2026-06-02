import { gsap } from 'gsap';
import Reveal from 'reveal.js';
import 'reveal.js/reveal.css';
import 'reveal.js/theme/black.css';
import { socket } from './shared/socket.js';

// Root level identifier to indicate JS ready
document.documentElement.classList.add('js-ready');

let activeTimeline = null;
function playInnerAnimations(slide) {
  if (!slide) return;

  const currentSlideNum = slide.getAttribute('data-slide');
  console.log(`[Audience View] Animate Slide: #${currentSlideNum}`);

  if (activeTimeline) {
    activeTimeline.kill();
  }

  const video = slide.querySelector('video');
  if (video) {
    try {
      if (!video.src && video.dataset.src) {
        video.src = video.dataset.src;
      }
      video.muted = true; // Mute video explicitly
      video.load();
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise.catch(error => console.warn('[Audience Video] Autoplay blocked:', error));
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
}

document.addEventListener('DOMContentLoaded', init);
