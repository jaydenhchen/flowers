import { createBouquet } from './bouquet.js';

const canvas = document.querySelector('#bouquet');
const motionToggle = document.querySelector('#motion-toggle');
const motionLabel = document.querySelector('#motion-label');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

let manuallyPaused = false;
let paused = reducedMotion.matches;
const bouquet = createBouquet(canvas, { paused });

function updateMotion(nextPaused) {
  paused = nextPaused;
  bouquet.setPaused(paused);
  motionToggle.setAttribute('aria-pressed', String(paused));
  motionLabel.textContent = paused ? 'Resume rotation' : 'Pause rotation';
}

updateMotion(paused);

motionToggle.addEventListener('click', () => {
  manuallyPaused = !paused;
  updateMotion(manuallyPaused);
});

reducedMotion.addEventListener('change', (event) => {
  // Honor a new reduced-motion request without losing an explicit manual pause.
  // The button can still resume the bouquet whenever the recipient chooses.
  updateMotion(event.matches || manuallyPaused);
});
