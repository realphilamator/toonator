/* =====================================================
   TOON PLAYER — HTML5 Canvas player for Toonator
   Drop-in replacement for the Flash player.

   Usage:
     <div id="toonPlayerRoot"></div>
     <script src="/js/toon-player.js"></script>
     <script>
       initToonPlayer('toonPlayerRoot', TOON_FRAMES, toonSettings);
     </script>

   Or as a standalone auto-init if window.TOON_FRAMES is set.
===================================================== */

(function () {
  'use strict';

  /* =====================================================
     MULTICURVE — ported from ActionScript multicurve()
     Draws smooth quadratic Bézier splines through points.
  ===================================================== */
  function drawMulticurve(ctx, points, scale, closed) {
    if (!points || points.length === 0) return;
    const s = scale || 1;
    const sc = points.map(p => ({ x: p.x * s, y: p.y * s }));
    const n = sc.length;

    if (n === 1) {
      ctx.arc(sc[0].x, sc[0].y, ctx.lineWidth / 2, 0, Math.PI * 2);
      return;
    }
    if (n === 2) {
      ctx.moveTo(sc[0].x, sc[0].y);
      ctx.lineTo(sc[1].x, sc[1].y);
      return;
    }

    const mx = [], my = [];
    for (let i = 1; i < n - 2; i++) {
      mx[i] = 0.5 * (sc[i + 1].x + sc[i].x);
      my[i] = 0.5 * (sc[i + 1].y + sc[i].y);
    }

    if (closed) {
      mx[0]     = 0.5 * (sc[1].x + sc[0].x);
      my[0]     = 0.5 * (sc[1].y + sc[0].y);
      mx[n - 1] = 0.5 * (sc[n - 1].x + sc[n - 2].x);
      my[n - 1] = 0.5 * (sc[n - 1].y + sc[n - 2].y);
    } else {
      mx[0]     = sc[0].x;
      my[0]     = sc[0].y;
      mx[n - 2] = sc[n - 1].x;
      my[n - 2] = sc[n - 1].y;
    }

    ctx.moveTo(mx[0], my[0]);
    for (let i = 1; i < n - 1; i++) {
      ctx.quadraticCurveTo(sc[i].x, sc[i].y, mx[i], my[i]);
    }
    if (closed) {
      ctx.quadraticCurveTo(sc[n - 1].x, sc[n - 1].y, mx[0], my[0]);
      ctx.closePath();
    }
  }

  /* =====================================================
     DRAW A SINGLE FRAME
  ===================================================== */
  function drawFrame(ctx, frame, scale) {
    if (!frame || !frame.strokes) return;
    const s = scale || 1;

    frame.strokes.forEach(stroke => {
      if (!stroke.points || stroke.points.length === 0) return;

      // Oldschool brush — pre-built polygon
      if (stroke.oldschool && stroke.polygon && stroke.polygon.length > 0) {
        ctx.beginPath();
        stroke.polygon.forEach((p, i) => {
          const x = p.x * s, y = p.y * s;
          i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        });
        ctx.closePath();
        ctx.fillStyle = stroke.color;
        ctx.fill();
        return;
      }

      // Normal / eraser stroke
      ctx.beginPath();
      ctx.strokeStyle = stroke.color || '#000000';
      ctx.lineWidth = (stroke.size || 2) * s;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (stroke.points.length === 1) {
        // Single dot
        ctx.arc(stroke.points[0].x * s, stroke.points[0].y * s, ctx.lineWidth / 2, 0, Math.PI * 2);
        ctx.fillStyle = stroke.color || '#000000';
        ctx.fill();
        return;
      }

      drawMulticurve(ctx, stroke.points, s, false);
      ctx.stroke();
    });
  }

  /* =====================================================
     PLAYER FACTORY
  ===================================================== */
  function initToonPlayer(rootId, frames, savedSettings) {
    const root = document.getElementById(rootId);
    if (!root) { console.error('toon-player: root element not found:', rootId); return; }

    const fps    = (savedSettings && savedSettings.playFPS) ? savedSettings.playFPS : 10;
    const W      = 600;
    const H      = 300;

    /* ---- Build UI ---- */
    root.innerHTML = '';
    root.style.display    = 'inline-block';
    root.style.fontFamily = "'Courier New', monospace";
    root.style.userSelect = 'none';

    // Wrapper
    const wrap = document.createElement('div');
    wrap.style.cssText = 'position:relative;background:#fff;line-height:0;';

    // Canvas
    const canvas = document.createElement('canvas');
    canvas.width  = W;
    canvas.height = H;
    canvas.style.cssText = 'display:block;width:100%;max-width:' + W + 'px;background:#fff;cursor:pointer;';
    wrap.appendChild(canvas);

    // Toolbar
    const bar = document.createElement('div');
    bar.style.cssText = [
      'display:flex',
      'align-items:center',
      'gap:6px',
      'padding:5px 8px',
      'background:#1a1a1a',
      'line-height:1',
    ].join(';');

    // Play/Pause button
    const btnPlay = document.createElement('button');
    const styleBtn = [
      'background:none',
      'border:1px solid #555',
      'color:#eee',
      'cursor:pointer',
      'border-radius:3px',
      'padding:3px 8px',
      'font-size:12px',
      'font-family:inherit',
      'transition:background 0.15s',
    ].join(';');
    btnPlay.style.cssText = styleBtn;
    btnPlay.textContent = '▶ Play';

    // Frame counter
    const counter = document.createElement('span');
    counter.style.cssText = 'color:#aaa;font-size:11px;min-width:70px;';

    // Progress bar track
    const progTrack = document.createElement('div');
    progTrack.style.cssText = 'flex:1;height:4px;background:#333;border-radius:2px;cursor:pointer;position:relative;';
    const progFill = document.createElement('div');
    progFill.style.cssText = 'height:100%;width:0%;background:#e05;border-radius:2px;pointer-events:none;transition:width 0.05s linear;';
    progTrack.appendChild(progFill);

    // FPS display
    const fpsLabel = document.createElement('span');
    fpsLabel.style.cssText = 'color:#555;font-size:10px;';
    fpsLabel.textContent = fps + ' fps';

    bar.appendChild(btnPlay);
    bar.appendChild(counter);
    bar.appendChild(progTrack);
    bar.appendChild(fpsLabel);

    root.appendChild(wrap);
    root.appendChild(bar);

    const ctx = canvas.getContext('2d');

    /* ---- State ---- */
    let currentFrame = 0;
    let playing = false;
    let timer = null;
    const frameCount = frames.length || 1;

    /* ---- Render ---- */
    function renderFrame() {
      ctx.clearRect(0, 0, W, H);
      if (frames[currentFrame]) drawFrame(ctx, frames[currentFrame], 1);
      counter.textContent = 'Frame ' + (currentFrame + 1) + ' / ' + frameCount;
      progFill.style.width = (frameCount <= 1 ? 100 : (currentFrame / (frameCount - 1)) * 100) + '%';
    }

    /* ---- Playback ---- */
    function startPlay() {
      if (playing || frameCount <= 1) return;
      playing = true;
      btnPlay.textContent = '⏸ Pause';
      timer = setInterval(() => {
        currentFrame = (currentFrame + 1) % frameCount;
        renderFrame();
      }, Math.round(1000 / fps));
    }

    function stopPlay() {
      playing = false;
      clearInterval(timer);
      btnPlay.textContent = '▶ Play';
    }

    /* ---- Events ---- */
    btnPlay.addEventListener('click', () => playing ? stopPlay() : startPlay());

    // Click canvas to toggle play/pause
    canvas.addEventListener('click', () => playing ? stopPlay() : startPlay());

    // Scrub by clicking progress bar
    progTrack.addEventListener('click', (e) => {
      stopPlay();
      const rect = progTrack.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      currentFrame = Math.round(ratio * (frameCount - 1));
      renderFrame();
    });

    // Hover styles
    btnPlay.addEventListener('mouseenter', () => { btnPlay.style.background = '#333'; });
    btnPlay.addEventListener('mouseleave', () => { btnPlay.style.background = 'none'; });

    /* ---- Init ---- */
    renderFrame();

    // Auto-play if more than 1 frame
    if (frameCount > 1) startPlay();

    /* ---- Public API ---- */
    return { play: startPlay, pause: stopPlay, goTo: (n) => { currentFrame = n % frameCount; renderFrame(); } };
  }

  /* ---- Expose globally ---- */
  window.initToonPlayer = initToonPlayer;

  /* ---- Auto-init if TOON_FRAMES and TOON_PLAYER_ROOT are set ---- */
  if (typeof window.TOON_FRAMES !== 'undefined' && typeof window.TOON_PLAYER_ROOT !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
      initToonPlayer(window.TOON_PLAYER_ROOT, window.TOON_FRAMES, window.TOON_SETTINGS || {});
    });
  }

})();