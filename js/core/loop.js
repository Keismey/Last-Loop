// Boucle de jeu : simulation à pas fixe, rendu à chaque image avec interpolation (GDD §17.3).
export function createLoop({ step, maxSteps, update, render }) {
  let acc = 0;
  let last = null;
  let paused = true;
  let speed = 1;
  let rafId = 0;
  let fps = 60;
  let fpsAcc = 0;
  let fpsFrames = 0;

  function frame(ts) {
    rafId = requestAnimationFrame(frame);
    if (last === null) last = ts;
    let dt = (ts - last) / 1000;
    last = ts;
    if (dt > 0.25) dt = 0.25;      // retour d'arrière-plan : pas de rattrapage

    fpsAcc += dt;
    fpsFrames += 1;
    if (fpsAcc >= 0.5) {
      fps = Math.round(fpsFrames / fpsAcc);
      fpsAcc = 0;
      fpsFrames = 0;
    }

    if (!paused) {
      acc += dt * speed;
      let n = 0;
      while (acc >= step && n < maxSteps) {
        update(step);
        acc -= step;
        n += 1;
      }
      if (n === maxSteps) acc = 0;  // trop en retard : on abandonne le surplus
    }
    render(paused ? 1 : acc / step, dt);
  }

  return {
    start() {
      if (!rafId) rafId = requestAnimationFrame(frame);
    },
    setPaused(p) {
      paused = p;
      if (!p) last = null;
    },
    isPaused: () => paused,
    setSpeed(s) { speed = s; },
    getSpeed: () => speed,
    getFps: () => fps
  };
}
