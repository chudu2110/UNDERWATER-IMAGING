(() => {
  const $ = selector => document.querySelector(selector);
  const workspaces = [...document.querySelectorAll('[data-workspace]')].map(root => ({
    root, kind: root.dataset.workspace, file: null,
    busy: false, originalURL: null, resultURL: null, q: role => root.querySelector(`[data-role="${role}"]`)
  }));
  const upload = workspaces.find(w => w.kind === 'upload');
  function message(w, text, error = false) {
    w.q('message').textContent = text;
    w.q('message').classList.toggle('error', error);
  }
  function reset(w) {
    if (w.resultURL) { URL.revokeObjectURL(w.resultURL); w.resultURL = null; }
    w.q('after').src = w.q('before').src;
    w.q('viewer').style.setProperty('--split', '50%');
    w.q('compare').value = 50;
    w.q('meta').textContent = 'Not processed yet';
    w.q('download').hidden = true;
    w.q('download').removeAttribute('href');
    w.q('after-label').textContent = 'NOT PROCESSED';
  }
  function ready(w) { return Boolean(w.file); }
  function setBusy(w, busy) {
    w.busy = busy;
    w.q('loading').hidden = !busy;
    w.q('enhance').disabled = busy || !ready(w);
    w.q('model').disabled = busy;
    w.root.querySelectorAll('input[type="radio"]').forEach(el => { el.disabled = busy; });
    $('#upload').disabled = busy;
    w.q('viewer').setAttribute('aria-busy', String(busy));
  }
  for (const w of workspaces) {
    w.q('compare').addEventListener('input', e => w.q('viewer').style.setProperty('--split', `${e.target.value}%`));
    w.q('model').addEventListener('change', () => {
      if (!w.busy && ready(w)) { reset(w); message(w, 'Model changed. Enhance this image to create a new result.'); }
    });
    w.q('enhance').addEventListener('click', async () => {
      if (w.busy || !ready(w)) return;
      setBusy(w, true);
      message(w, 'Processing locally. The first request may take a moment.');
      try {
        const image = w.file;
        const data = new FormData();
        data.append('image', image);
        data.append('max_side', w.root.querySelector('input[type="radio"]:checked').value);
        data.append('model', w.q('model').value);
        const response = await fetch('/api/enhance', {method: 'POST', body: data});
        if (!response.ok) {
          let detail = 'Could not process this image. Please try again.';
          try { detail = (await response.json()).detail || detail; } catch {}
          throw Error(typeof detail === 'string' ? detail : 'Invalid image data.');
        }
        if (w.resultURL) URL.revokeObjectURL(w.resultURL);
        w.resultURL = URL.createObjectURL(await response.blob());
        w.q('after').src = w.resultURL;
        w.q('after').alt = 'Enhanced underwater image';
        w.q('download').href = w.resultURL;
        w.q('download').hidden = false;
        w.q('after-label').textContent = 'ENHANCED';
        const info = response.headers.get('X-Processing-Info');
        let modelName = 'Pretrained UIEB';
        if (w.q('model').value === 'trained' || w.q('model').value === 'epoch100') modelName = 'Trained · Epoch 100';
        else if (w.q('model').value === 'best') modelName = 'Trained · Best (Epoch 99)';
        w.q('meta').textContent = `${modelName} · ${info ? decodeURIComponent(info).replace('giây', 's') : 'Complete'}`;
        w.q('viewer').style.setProperty('--split', '50%');
        w.q('compare').value = 50;
        message(w, 'Done. Drag the divider to compare, or download your result.');
      } catch (error) { message(w, error.message, true); }
      finally { setBusy(w, false); }
    });
  }
  function selectFile(candidate) {
    if (upload.busy || !candidate) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(candidate.type)) {
      message(upload, 'Choose a JPG, PNG or WEBP image.', true); return;
    }
    if (candidate.size > 20 * 1024 * 1024) { message(upload, 'This image exceeds 20 MB. Choose a smaller file.', true); return; }
    if (upload.originalURL) URL.revokeObjectURL(upload.originalURL);
    upload.file = candidate;
    upload.originalURL = URL.createObjectURL(candidate);
    upload.q('before').src = upload.originalURL;
    upload.q('empty').hidden = true;
    for (const role of ['before', 'after', 'before-label', 'after-label', 'divider', 'compare']) upload.q(role).hidden = false;
    $('#upload-label').textContent = candidate.name;
    upload.q('caption').textContent = candidate.name;
    reset(upload);
    upload.q('enhance').disabled = false;
    message(upload, 'Your image is ready. Choose a model and enhance it.');
  }
  $('#upload').addEventListener('change', e => { selectFile(e.target.files[0]); e.target.value = ''; });
  const zone = $('#dropzone');
  for (const event of ['dragenter', 'dragover']) zone.addEventListener(event, e => { e.preventDefault(); if (!upload.busy) zone.classList.add('dragover'); });
  for (const event of ['dragleave', 'drop']) zone.addEventListener(event, e => { e.preventDefault(); zone.classList.remove('dragover'); });
  zone.addEventListener('drop', e => selectFile(e.dataTransfer.files[0]));
  zone.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (!upload.busy) $('#upload').click(); } });
  const scenes = {
    U45: {name: 'Stingray · U45', title: 'Color beneath the cast.', description: 'Compare the blue-green cast of the original with the restored color separation around the stingray and seabed.'},
    CH60: {name: 'Deep water · Challenging-60', title: 'Look into the shadows.', description: 'Compare visibility in darker regions and inspect how color and contrast change around the scene edges.'},
    UFO: {name: 'Below the surface · UFO-120', title: 'A reference for the scene.', description: 'Compare the original and enhanced image, then open the reference to examine the target colors and detail.', reference: true},
    LSUI: {name: 'Into the light · LSUI', title: 'Read the fine detail.', description: 'Inspect structure and color at a closer scale. A reference image is available for this paired example.', reference: true},
    CC7: {name: 'Blue depths · CC7', title: 'Separate the shades.', description: 'Look at color separation across the scene. Compare the result visually; no reference image is supplied for this example.'}
  };
  const demo = $('#demo-viewer');
  let currentScene = 'U45';
  function updateDemoResolution() {
    const edge = $('#demo-edge').value;
    const image = $('#demo-after');
    const expected = `/assets/examples/${currentScene}-${edge}.png`;
    image.onload = () => { $('#demo-output-size').textContent = `Output: ${image.naturalWidth} × ${image.naturalHeight} px · ${edge} px cap`; };
    image.src = expected;
  }
  $('#demo-edge').addEventListener('change', updateDemoResolution);
  updateDemoResolution();
  const diagramDialog = $('#architecture-dialog');
  $('#architecture-open').addEventListener('click', () => diagramDialog.showModal());
  $('#architecture-close').addEventListener('click', () => diagramDialog.close());
  diagramDialog.addEventListener('click', event => { if (event.target === diagramDialog) { const rect = diagramDialog.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) diagramDialog.close(); } });
  function view(mode) {
    demo.dataset.view = mode;
    $('#demo-compare').hidden = mode !== 'compare';
    document.querySelectorAll('[data-view]').forEach(button => {
      if (button.tagName === 'BUTTON') button.setAttribute('aria-pressed', String(button.dataset.view === mode));
    });
  }
  document.querySelectorAll('button[data-view]').forEach(button => button.addEventListener('click', () => view(button.dataset.view)));
  $('#demo-compare').addEventListener('input', e => demo.style.setProperty('--split', `${e.target.value}%`));
  function zoom() {
    const scale = $('#demo-zoom').value;
    demo.style.setProperty('--zoom', scale);
    demo.style.setProperty('--origin-x', '50%'); demo.style.setProperty('--origin-y', '50%');
    $('#demo-hint').textContent = Number(scale) > 1 ? 'Move your pointer over the image to inspect the details. Switch views to compare the same area.' : 'Drag the divider to compare, or choose a view above.';
  }
  $('#demo-zoom').addEventListener('change', zoom);
  demo.addEventListener('pointermove', event => {
    if ($('#demo-zoom').value === '1') return;
    const rect = demo.getBoundingClientRect();
    let x = (event.clientX - rect.left) / rect.width;
    if (demo.dataset.view === 'side-by-side') x = (x * 2) % 1;
    demo.style.setProperty('--origin-x', `${Math.max(0, Math.min(1, x)) * 100}%`);
    demo.style.setProperty('--origin-y', `${Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height)) * 100}%`);
  }, {passive: true});
  $('#demo-fullscreen').addEventListener('click', async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await $('#demo-preview').requestFullscreen();
    } catch { $('#demo-hint').textContent = 'Fullscreen is unavailable in this browser. Use the zoom control to inspect details.'; }
  });
  document.addEventListener('fullscreenchange', () => { $('#demo-fullscreen').textContent = document.fullscreenElement ? 'Close fullscreen ↙' : 'Expand ↗'; });
  document.querySelectorAll('.sample').forEach(button => button.addEventListener('click', () => {
    currentScene = button.dataset.sample;
    const scene = scenes[currentScene];
    $('#demo-before').src = `/samples/${currentScene}.png`;
    updateDemoResolution();
    $('#demo-before').alt = `${scene.name} original image`;
    $('#demo-after').alt = `${scene.name} enhanced image`;
    $('#demo-caption').textContent = scene.name;
    $('#demo-scene-title').textContent = scene.title;
    $('#demo-description').textContent = scene.description;
    $('#demo-kind').textContent = scene.reference ? 'With reference' : 'Without reference';
    $('#demo-reference').hidden = !scene.reference;
    $('#demo-reference').open = false;
    if (scene.reference) $('#demo-reference-image').src = `/assets/examples/${currentScene}_GT.jpg`;
    else $('#demo-reference-image').removeAttribute('src');
    $('#demo-compare').value = 50; demo.style.setProperty('--split', '50%');
    $('#demo-zoom').value = '1'; zoom();
    document.querySelectorAll('.sample').forEach(el => { el.classList.toggle('selected', el === button); el.setAttribute('aria-pressed', String(el === button)); });
  }));
  const num = (value, digits) => typeof value === 'number' && Number.isFinite(value) ? value.toFixed(digits) : '—';
  async function status() {
    try {
      const response = await fetch('/api/status');
      if (!response.ok) throw Error();
      const s = await response.json(), t = s.training;
      $('#device').textContent = `${s.device.toUpperCase()} · LOCAL INFERENCE`;
      document.querySelectorAll('[data-trained-option]').forEach(option => {
        option.disabled = !s.trained_available;
        option.textContent = s.epoch100_available ? 'Trained model · Epoch 100 (Final)' : (s.trained_available ? 'Trained model · latest run' : 'Trained model · no checkpoint yet');
      });
      document.querySelectorAll('[data-best-option]').forEach(option => {
        option.disabled = !s.best_available;
        option.textContent = s.best_available ? 'Trained model · Best (Epoch 99)' : 'Best model · not available';
      });
      const states = {not_started: 'Training not started', awaiting_vscode: 'Waiting to start', preparing: 'Preparing data', training: 'Training', validating: 'Validating', training_complete: 'Training finished · test pending', complete: 'Training and test complete', failed: 'Training failed', interrupted: 'Training interrupted'};
      $('#train-state').textContent = states[t.state] || 'Reading status';
      $('#train-dataset').textContent = t.dataset || '—';
      $('#epoch').textContent = t.epoch ?? '—'; $('#total-epochs').textContent = t.epochs || 100;
      $('#loss').textContent = num(t.loss, 4); $('#psnr').textContent = num(t.psnr, 2); $('#ssim').textContent = num(t.ssim, 4);
      const finished = ['complete', 'training_complete'].includes(t.state);
      const epochFraction = t.steps ? Math.min(1, (t.step || 0) / t.steps) : 0;
      const progress = finished ? 100 : 100 * Math.max(0, (t.epoch || 0) - 1 + epochFraction) / (t.epochs || 100);
      $('#train-progress').style.width = `${Math.min(100, progress)}%`;
      let detail = 'Metrics will appear as training progresses.';
      if (t.state === 'training') detail = `Epoch ${t.epoch}/${t.epochs} · batch ${t.step || 0}/${t.steps || '—'}. Charts update after each epoch and validation.`;
      else if (t.state === 'validating') detail = 'Evaluating the validation split of each dataset.';
      else if (t.state === 'complete') detail = 'All epochs and held-out test evaluation have finished.';
      else if (t.state === 'training_complete') detail = 'All epochs have finished. Held-out test evaluation is pending.';
      else if (['failed', 'interrupted'].includes(t.state)) detail = 'The training run stopped. Check the notebook output and logs/training/ for details.';
      else if (t.state === 'preparing') detail = 'Preparing the current run and its checkpoints.';
      $('#train-detail').textContent = detail;
    } catch { $('#device').textContent = 'Inference server unavailable'; $('#train-state').textContent = 'Status unavailable'; }
  }
  status(); setInterval(status, 10000);
})();
