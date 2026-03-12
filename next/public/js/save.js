/* =====================================================
   SAVE DIALOG - v2
===================================================== */

function openSaveDialog() {
  document.getElementById('saveDialog').style.display = 'flex';
  document.getElementById('saveDialogName').focus();
}

function closeSaveDialog() {
  document.getElementById('saveDialog').style.display = 'none';
  document.getElementById('saveStatus').textContent = '';
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('saveDialogName').maxLength = 100;
  document.getElementById('saveDialogKeywords').maxLength = 200;
  document.getElementById('saveDialogDesc').maxLength = 1000;

  document.getElementById('btnSave').addEventListener('click', openSaveDialog);
  document.getElementById('saveCancel').addEventListener('click', closeSaveDialog);
  document.getElementById('saveFinal').addEventListener('click', saveAnimation);
  document.getElementById('saveLocalBtn').addEventListener('click', saveLocal);
  document.getElementById('loadLocalBtn').addEventListener('click', loadLocal);
});

/* =====================================================
   LOCAL SAVE
   Exports the current frames array as a .json file.
   Filename is taken from the Name field (or "animation").
===================================================== */

function saveLocal() {
  const title = (document.getElementById('saveDialogName').value.trim() || 'animation');
  const payload = JSON.stringify(frames);
  const blob = new Blob([payload], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = title.replace(/[^a-z0-9_\-]/gi, '_') + '.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* =====================================================
   LOCAL LOAD
   Imports a .json file previously saved with saveLocal().
   Supports both a raw array [ {strokes:[]}, ... ]
   and a wrapped object { frames: [ {strokes:[]}, ... ] }.
===================================================== */

function loadLocal() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json,application/json';

  input.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      // Accept raw array, {frames:[...]} or new {frames:[...], settings:{...}} wrapper
      const loaded = Array.isArray(data)
        ? data
        : (data && Array.isArray(data.frames) ? data.frames : null);

      if (!loaded || loaded.length === 0) {
        throw new Error('No frames found in file.');
      }

      // Validate basic shape of first frame
      if (typeof loaded[0] !== 'object' || !Array.isArray(loaded[0].strokes)) {
        throw new Error('File does not look like a Toonator animation.');
      }

      // Replace current frames
      frames.length = 0;
      loaded.forEach(f => frames.push(f));

      // Rebuild thumbnails
      frameThumbs.length = 0;
      frames.forEach((_, i) => updateThumbnail(i));

      currentFrame = 0;
      previousFrame = -1;
      lastViewedFrame = -1;

      updateSliderMax();
      render();
      drawFramesTimeline();

      closeSaveDialog();

    } catch (err) {
      const status = document.getElementById('saveStatus');
      status.textContent = 'Load failed: ' + err.message;
    }
  });

  input.click();
}

/* =====================================================
   RENDER FRAME TO CANVAS AT SIZE
   Correctly handles eraser strokes via destination-out,
   matching the live canvas rendering in app.js.
===================================================== */

function renderFrameToCanvas(frame, width, height) {
  const c = document.createElement('canvas');
  c.width = width;
  c.height = height;
  const cx = c.getContext('2d');
  cx.fillStyle = '#ffffff';
  cx.fillRect(0, 0, width, height);
  const scaleX = width / 600;

  frame.strokes.forEach(stroke => {
    if (!stroke.points || stroke.points.length === 0) return;

    // Eraser strokes use destination-out to cut through the canvas
    if (stroke.eraser) {
      cx.globalCompositeOperation = 'destination-out';
    } else {
      cx.globalCompositeOperation = 'source-over';
    }

    // Oldschool brush — filled polygon
    if (stroke.oldschool && stroke.polygon && stroke.polygon.length > 0) {
      cx.beginPath();
      stroke.polygon.forEach((p, i) => {
        const x = p.x * scaleX, y = p.y * scaleX;
        i === 0 ? cx.moveTo(x, y) : cx.lineTo(x, y);
      });
      cx.closePath();
      if (stroke.eraser) {
        cx.fillStyle = 'rgba(0,0,0,1)'; // color doesn't matter for destination-out, just needs alpha
      } else {
        cx.fillStyle = stroke.color;
      }
      cx.fill();
      cx.globalCompositeOperation = 'source-over';
      return;
    }

    if (stroke.points.length < 2) {
      cx.globalCompositeOperation = 'source-over';
      return;
    }

    cx.beginPath();
    cx.strokeStyle = stroke.eraser ? 'rgba(0,0,0,1)' : stroke.color;
    cx.lineWidth = Math.max(1, stroke.size * scaleX);
    cx.lineCap = 'round';
    cx.lineJoin = 'round';

    if (settings.smoothing && stroke.points.length > 2) {
      drawMulticurveRaw(cx, stroke.points, scaleX, false);
    } else {
      stroke.points.forEach((p, i) => {
        const x = p.x * scaleX;
        const y = p.y * scaleX;
        if (i === 0) cx.moveTo(x, y);
        else cx.lineTo(x, y);
      });
    }
    cx.stroke();

    // Always reset after each stroke
    cx.globalCompositeOperation = 'source-over';
  });

  // Flatten to white background — GIF doesn't support transparency,
  // so destination-out would leave transparent holes without this step.
  const flat = document.createElement('canvas');
  flat.width = width;
  flat.height = height;
  const flatCtx = flat.getContext('2d');
  flatCtx.fillStyle = '#ffffff';
  flatCtx.fillRect(0, 0, width, height);
  flatCtx.drawImage(c, 0, 0);

  return flat;
}

/* =====================================================
   GIF GENERATION
===================================================== */

function generateGif(width, height) {
  return new Promise((resolve, reject) => {
    const frameDelay = Math.round(1000 / (settings.playFPS || 10));

    const gif = new GIF({
      workers: 2,
      quality: 20,
      width: width,
      height: height,
      workerScript: '/js/gif.worker.js',
      dither: false,
      background: '#ffffff',
      transparent: null
    });

    frames.forEach(frame => {
      const c = renderFrameToCanvas(frame, width, height);
      gif.addFrame(c, { delay: frameDelay });
    });

    gif.on('finished', blob => resolve(blob));
    gif.on('error', err => reject(err));
    gif.render();
  });
}

/* =====================================================
   SAVE ANIMATION
===================================================== */

async function saveAnimation() {
  const title       = (document.getElementById('saveDialogName').value.trim() || 'Untitled').slice(0, 100);
  const keywords    = document.getElementById('saveDialogKeywords').value.trim().slice(0, 200);
  const description = document.getElementById('saveDialogDesc').value.trim().slice(0, 1000);
  const isDraft     = document.getElementById('saveDialogDraft').checked;

  const status = document.getElementById('saveStatus');
  const btn    = document.getElementById('saveFinal');

  btn.disabled = true;
  status.textContent = 'Saving...';

  try {
    // 1. Get current user
    const { data: { user }, error: userError } = await db.auth.getUser();
    if (userError || !user) throw new Error('You must be logged in to save.');
    console.log('[save] user ok:', user.id);

    // 2. Snapshot settings
    const savedSettings = {
      playFPS:           settings.playFPS,
      smoothing:         settings.smoothing,
      simplifyTolerance: settings.simplifyTolerance,
    };

    // 3. Build insert payload
    const insertData = {
      user_id:     user.id,
      title,
      keywords,
      description,
      is_draft:    isDraft,
      frames:      frames,
      settings:    savedSettings,
    };

    if (window.CONTINUE_ID && /^[a-zA-Z0-9_-]{1,100}$/.test(window.CONTINUE_ID)) {
      insertData.continued_from = window.CONTINUE_ID;
    }

    const { data: anim, error: insertError } = await db
      .from('animations')
      .insert(insertData)
      .select('id')
      .single();

    if (insertError) throw insertError;

    const animId = anim.id;
    console.log('[save] animation inserted:', animId);

    status.textContent = 'Generating previews...';

    // 4. Generate GIFs at two sizes
    const [blob200, blob40] = await Promise.all([
      generateGif(200, 100),
      generateGif(40,  20)
    ]);
    console.log('[save] GIFs generated, sizes:', blob200.size, blob40.size);

    // 5. Upload GIFs to Supabase Storage
    const upload = async (blob, path) => {
      console.log('[save] uploading:', path, 'size:', blob.size);
      const result = await db.storage
        .from('previews')
        .upload(path, blob, { contentType: 'image/gif', upsert: true });
      console.log('[save] upload result for', path, ':', JSON.stringify(result));
      if (result.error) throw result.error;
    };

    status.textContent = 'Uploading previews...';

    await Promise.all([
      upload(blob200, `${animId}_100.gif`),
      upload(blob40,  `${animId}_40.gif`)
    ]);

    console.log('[save] all done!');
    status.textContent = 'Saved!';

    setTimeout(() => {
      closeSaveDialog();
      window.location.href = `/toon/${animId}`;
    }, 800);

  } catch (err) {
    console.error('[save] ERROR:', err);
    status.textContent = 'Error: ' + (err.message || 'Something went wrong.');
    btn.disabled = false;
  }
}