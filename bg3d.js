// Live mesh-gradient field: unlit pastel blobs drifting behind the glass UI.
// Guarded — the CSS radial-gradient fallback is always painted underneath.
import * as THREE from "three";

const PALETTE = [0xffb3c7, 0xa8c8ff, 0xcdb4ff, 0xa8e6cf, 0xffd9a8, 0xf0b3ff];

export function start(canvas) {
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const narrow = matchMedia("(max-width: 819px)").matches;
  if (reduced || narrow) return;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: "low-power",
    });
  } catch {
    return;
  }

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
  camera.position.z = 14;

  const geo = new THREE.SphereGeometry(1, 32, 24);
  const blobs = PALETTE.map((c, i) => {
    const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: c }));
    const base = 2.6 + (i % 3) * 1.1;
    mesh.scale.setScalar(base);
    mesh.userData = {
      base,
      px: Math.sin(i * 2.4) * 6.5,
      py: Math.cos(i * 1.7) * 3.6,
      pz: -(i % 3) * 2,
      sp: 0.09 + 0.045 * (i % 3),
      ph: i * 1.31,
    };
    scene.add(mesh);
    return mesh;
  });

  function resize() {
    const w = canvas.clientWidth || innerWidth;
    const h = canvas.clientHeight || innerHeight;
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();
  addEventListener("resize", resize);

  const clock = new THREE.Clock();
  let raf = 0;
  let running = true;

  function frame() {
    const t = clock.getElapsedTime();
    for (const b of blobs) {
      const { base, px, py, pz, sp, ph } = b.userData;
      b.position.set(
        px + Math.sin(t * sp + ph) * 2.6,
        py + Math.cos(t * sp * 0.8 + ph) * 1.8,
        pz,
      );
      b.scale.setScalar(base * (1 + Math.sin(t * 0.35 + ph) * 0.08));
    }
    renderer.render(scene, camera);
    if (running) raf = requestAnimationFrame(frame);
  }

  document.addEventListener("visibilitychange", () => {
    running = !document.hidden;
    if (running) {
      clock.getDelta();
      raf = requestAnimationFrame(frame);
    } else {
      cancelAnimationFrame(raf);
    }
  });

  canvas.classList.add("on");
  raf = requestAnimationFrame(frame);
}
