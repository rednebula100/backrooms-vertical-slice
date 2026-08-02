const MOTION_PRESETS = Object.freeze({
  instant: { duration: 80, easing: "cubic-bezier(.25,.8,.25,1)" },
  fast: { duration: 120, easing: "cubic-bezier(.25,.8,.25,1)" },
  panel: { duration: 220, easing: "cubic-bezier(.22,1,.36,1)" },
  scene: { duration: 280, easing: "cubic-bezier(.22,1,.36,1)" },
  confirm: { duration: 360, easing: "cubic-bezier(.34,1.56,.64,1)" },
});

export class EditorMotion {
  constructor({ reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)") } = {}) {
    this.reducedMotion = reducedMotion;
    this.running = new WeakMap();
  }

  play(node, keyframes, preset = "panel", options = {}) {
    if (!node?.animate) return Promise.resolve();
    this.running.get(node)?.cancel();
    const motion = MOTION_PRESETS[preset] ?? MOTION_PRESETS.panel;
    const animation = node.animate(keyframes, {
      ...motion,
      ...options,
      duration: this.reducedMotion.matches ? 1 : options.duration ?? motion.duration,
      fill: options.fill ?? "both",
    });
    this.running.set(node, animation);
    return animation.finished.catch(() => undefined);
  }

  enterPanel(node, side = "left") {
    const x = side === "left" ? -18 : 18;
    return this.play(node, [{ opacity: 0, transform: `translate3d(${x}px,0,0)` }, { opacity: 1, transform: "translate3d(0,0,0)" }], "panel");
  }

  swapScene(node) {
    return this.play(node, [{ opacity: 0.35, transform: "scale(.992)" }, { opacity: 1, transform: "scale(1)" }], "scene");
  }

  confirm(node) {
    return this.play(node, [{ transform: "scale(.92)" }, { transform: "scale(1)" }], "confirm");
  }
}

export { MOTION_PRESETS };
