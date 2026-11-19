import { createBouquet } from './bouquet.js';

const canvas = document.querySelector('#bouquet');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
let manuallyPaused = false;
let paused = reducedMotion.matches;
const bouquet = createBouquet(canvas, { paused });

canvas.addEventListener('keydown', (event) => {
  if (event.code !== 'Space' || event.repeat || event.altKey || event.ctrlKey || event.metaKey) return;
  event.preventDefault();
  manuallyPaused = !paused;
  paused = manuallyPaused;
  bouquet.setPaused(paused);
});

reducedMotion.addEventListener('change', (event) => {
  paused = event.matches || manuallyPaused;
  bouquet.setPaused(paused);
});
