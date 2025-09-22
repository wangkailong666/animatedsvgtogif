const svgInput = document.getElementById('svgInput');
const fileInput = document.getElementById('fileInput');
const previewBtn = document.getElementById('previewBtn');
const preview = document.getElementById('preview');
const widthEl = document.getElementById('width');
const heightEl = document.getElementById('height');
const fpsEl = document.getElementById('fps');
const durationEl = document.getElementById('duration');
const loopEl = document.getElementById('loop');
const bgColorEl = document.getElementById('bgColor');
const formatEl = document.getElementById('format');
const convertBtn = document.getElementById('convertBtn');
const saveBtn = document.getElementById('saveBtn');
const savePathSpan = document.getElementById('savePath');
const progressWrap = document.getElementById('progressWrap');
const progressBar = document.getElementById('progressBar');
const progressText = document.getElementById('progressText');
const message = document.getElementById('message');
const resultImg = document.getElementById('resultImg');

let chosenPath = null;

fileInput.addEventListener('change', async (e) => {
  const f = e.target.files[0];
  if (!f) return;
  const text = await f.text();
  svgInput.value = text;
});

previewBtn.addEventListener('click', () => {
  renderPreview(svgInput.value);
});

function renderPreview(svgText) {
  if (!svgText.trim()) {
    preview.innerHTML = '<em>No SVG</em>';
    return;
  }
  preview.innerHTML = `<div style="width:100%;height:100%">${svgText}</div>`;
}

saveBtn.addEventListener('click', async () => {
  const ext = formatEl.value;
  const suggested = `output.${ext}`;
  const file = await window.electronAPI.showSaveDialog(suggested);
  if (file) {
    chosenPath = file;
    savePathSpan.textContent = file;
  } else {
    savePathSpan.textContent = '(not selected)';
    chosenPath = null;
  }
});

window.electronAPI.onProgress((data) => {
  const { index, total } = data;
  const pct = Math.round((index / total) * 100);
  progressWrap.style.display = 'block';
  progressBar.value = pct;
  progressText.textContent = `${index}/${total} frames (${pct}%)`;
});

convertBtn.addEventListener('click', async () => {
  message.textContent = '';
  resultImg.style.display = 'none';
  if (!svgInput.value.trim()) {
    message.textContent = 'Paste or load an SVG first.';
    return;
  }
  if (!chosenPath) {
    message.textContent = 'Choose a save location first.';
    return;
  }
  convertBtn.disabled = true;
  progressWrap.style.display = 'block';
  progressBar.value = 0;
  progressText.textContent = 'Starting...';

  const payload = {
    svgText: svgInput.value,
    width: Math.max(1, parseInt(widthEl.value) || 500),
    height: Math.max(1, parseInt(heightEl.value) || 300),
    fps: Math.max(1, parseInt(fpsEl.value) || 15),
    duration: Math.max(0.1, parseFloat(durationEl.value) || 3),
    loop: parseInt(loopEl.value) || 0,
    bgColor: bgColorEl.value || '#ffffff',
    outputPath: chosenPath,
    format: formatEl.value
  };

  try {
    const res = await window.electronAPI.convert(payload);
    if (res.success) {
      message.textContent = `${payload.format.toUpperCase()} saved: ${res.path}`;
      resultImg.src = res.path + '?' + Date.now();
      resultImg.style.display = 'block';
    } else {
      message.textContent = 'Error: ' + (res.error || 'unknown');
    }
  } catch (err) {
    message.textContent = 'IPC error: ' + (err && err.message ? err.message : String(err));
  } finally {
    convertBtn.disabled = false;
  }
});
