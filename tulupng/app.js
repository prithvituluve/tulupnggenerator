'use strict';

const byId = id => document.getElementById(id);
const editor = byId('text');
const settings = byId('settings');
const preview = byId('preview');
const stage = byId('stage');
const download = byId('download');
const status = byId('status');
const touchDevice = matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;
const shareButton = byId('share-png');
const openPng = byId('open-png');
let mobileFile;
let mobileUrl;
const measure = document.createElement('canvas').getContext('2d');
const uploadedFonts = ['Kepula', 'Mandara', 'Darage', 'Palantulu'];
const kannadaFonts = ['Noto Sans Kannada', 'Noto Serif Kannada', 'Anek Kannada', 'Baloo Tamma 2'];
const scriptFonts = new Set([...kannadaFonts, ...uploadedFonts]);
const fontStacks = {
  'Open Sans': '"Open Sans", "Noto Sans Kannada", sans-serif',
  'Arial': 'Arial, "Noto Sans Kannada", sans-serif',
  'Georgia': 'Georgia, "Noto Sans Kannada", serif',
  'Verdana': 'Verdana, "Noto Sans Kannada", sans-serif',
  'Times New Roman': '"Times New Roman", "Noto Sans Kannada", serif',
  'Courier New': '"Courier New", "Noto Sans Kannada", monospace',
  ...Object.fromEntries([...scriptFonts].map(family => [family, `"${family}", "Open Sans", "Noto Sans Kannada", sans-serif`])),
};
const segmenter = typeof Intl.Segmenter === 'function' ? new Intl.Segmenter(undefined, {granularity: 'grapheme'}) : null;
const graphemes = value => segmenter ? Array.from(segmenter.segment(value), item => item.segment) : Array.from(value);
let frame;
let revision = 0;
let rendering = false;
let exporting = false;
let current = null;

function toFontKeyboardText(text) {
  // Run conversion only on Kannada spans so already-encoded keyboard input stays intact.
  return text.replace(/[\u0c80-\u0cff]+(?:[\u200c\u200d]+[\u0c80-\u0cff]+)*[\u200c\u200d]*/gu,
    kannada => convertKannadaToASCII(kannada.normalize('NFC')));
}

function readSettings() {
  const size = Number(byId('size').value);
  const weight = Number(byId('weight').value);
  const family = byId('family').value;
  const usesKeyboardMapping = uploadedFonts.includes(family);
  return {
    text: usesKeyboardMapping ? toFontKeyboardText(editor.value) : editor.value,
    usesKeyboardMapping,
    size,
    font: `${weight} ${size}px ${fontStacks[family]}`,
    family,
    weight,
    ink: byId('ink').value,
    background: byId('background').value,
    transparent: byId('transparent').checked,
    alignment: settings.elements.alignment.value,
    line: Number(byId('line').value),
  };
}

async function loadFonts(state) {
  const families = new Set();
  if (state.family === 'Open Sans' || scriptFonts.has(state.family)) families.add('Open Sans');
  if (scriptFonts.has(state.family)) families.add(state.family);
  if (/[\u0c80-\u0cff]/u.test(state.text)) families.add('Noto Sans Kannada');
  await Promise.all([...families].map(family => document.fonts.load(`${state.weight} ${state.size}px "${family}"`)));
}

function configure(context, state) {
  context.font = state.font;
  context.textAlign = 'left';
  context.textBaseline = 'alphabetic';
}

function lineDirection(text) {
  const firstLetter = text.match(/\p{Letter}/u)?.[0] || '';
  return /[\p{Script=Arabic}\p{Script=Hebrew}\p{Script=Syriac}\p{Script=Thaana}\p{Script=Nko}]/u.test(firstLetter) ? 'rtl' : 'ltr';
}

function makeLayout(state) {
  configure(measure, state);
  const lines = [];
  let width = 0;
  let top = Infinity;
  let bottom = -Infinity;
  const leading = state.size * state.line;
  const reference = measure.measureText('Mg');
  const ascent = reference.fontBoundingBoxAscent || state.size * .85;
  const descent = reference.fontBoundingBoxDescent || state.size * .25;
  state.text.replace(/\t/g, '    ').split(/\r\n?|\n|\u2028|\u2029/).forEach((text, index) => {
    const direction = lineDirection(text);
    measure.direction = direction;
    const metrics = measure.measureText(text);
    const left = Math.min(0, -metrics.actualBoundingBoxLeft);
    const right = Math.max(0, metrics.width, metrics.actualBoundingBoxRight);
    const above = metrics.actualBoundingBoxAscent;
    const below = metrics.actualBoundingBoxDescent;
    const baseline = index * leading;
    top = Math.min(top, baseline - Math.max(ascent, above));
    bottom = Math.max(bottom, baseline + Math.max(descent, below));
    const span = right - left;
    width = Math.max(width, span);
    lines.push({text, direction, left, span, baseline});
  });
  const padding = Math.max(10, Math.ceil(state.size * .18));
  const imageWidth = Math.ceil(width + 2 * padding);
  const imageHeight = Math.ceil(bottom - top + 2 * padding);
  const maxSide = touchDevice ? 4096 : 16384;
  const maxPixels = touchDevice ? 8_000_000 : 16_000_000;
  const limit = Math.min(3, maxSide / imageWidth, maxSide / imageHeight,
    Math.sqrt(maxPixels / (imageWidth * imageHeight)));
  const scale = touchDevice ? limit : Math.floor(limit);
  return {lines, width, top, padding, imageWidth, imageHeight, scale};
}

function draw(canvas, state, layout) {
  const {lines, width, top, padding, imageWidth, imageHeight, scale} = layout;
  canvas.width = Math.max(1, Math.floor(imageWidth * scale));
  canvas.height = Math.max(1, Math.floor(imageHeight * scale));
  const ctx = canvas.getContext('2d');
  ctx.scale(scale, scale);
  if (!state.transparent) {
    ctx.fillStyle = state.background;
    ctx.fillRect(0, 0, imageWidth, imageHeight);
  }
  configure(ctx, state);
  ctx.fillStyle = state.ink;
  const alignment = {left: 0, center: .5, right: 1}[state.alignment];
  for (const line of lines) {
    ctx.direction = line.direction;
    const x = padding - line.left + (width - line.span) * alignment;
    const y = padding + line.baseline - top;
    ctx.fillText(line.text, x, y);
  }
}

function fitPreview() {
  if (!current) return;
  const {imageWidth, imageHeight} = current;
  const factor = Math.min((stage.clientWidth - 24) / imageWidth, (stage.clientHeight - 24) / imageHeight);
  preview.style.width = `${Math.max(1, imageWidth * factor)}px`;
  preview.style.height = `${Math.max(1, imageHeight * factor)}px`;
}

function syncControls(state) {
  byId('font-conversion').hidden = !state.usesKeyboardMapping;
  byId('converted-text').value = state.usesKeyboardMapping ? state.text : '';
  const count = graphemes(editor.value).length;
  byId('count').textContent = `${count} ${count === 1 ? 'character' : 'characters'}`;
  byId('size-value').textContent = `${state.size} px`;
  byId('line-value').textContent = `${state.line.toFixed(2)}×`;
  byId('ink-value').textContent = state.ink.toUpperCase();
  byId('background-value').textContent = state.background.toUpperCase();
  const background = byId('background');
  background.disabled = state.transparent;
  background.parentElement.classList.toggle('is-disabled', state.transparent);
  byId('clear').disabled = !state.text;
  for (const range of settings.querySelectorAll('input[type=range]')) {
    const progress = (range.value - range.min) / (range.max - range.min);
    range.style.setProperty('--progress', `${progress * 100}%`);
  }
  stage.classList.toggle('checker', state.transparent);
  stage.style.backgroundColor = state.transparent ? '' : state.background;
  byId('mode').textContent = state.transparent ? 'Transparent background' : 'Solid background';
}

function updateDownload() {
  download.disabled = !current || rendering || exporting;
}

function showLayout(state, layout) {
  current = layout?.scale > 0 ? layout : null;
  preview.hidden = !current;
  byId('empty').hidden = !!current;
  byId('empty').querySelector('p').textContent = layout && !current ? 'Image is too large. Reduce the text or font size.' : 'Your preview appears here';
  if (current) {
    draw(preview, state, current);
    preview.setAttribute('aria-label', `Text image preview: ${editor.value}`);
    fitPreview();
  } else {
    preview.width = preview.height = 1;
  }
  byId('dimensions').textContent = current ? `${preview.width.toLocaleString()} × ${preview.height.toLocaleString()} px` : '—';
  status.textContent = current ? `PNG export · ${Number(current.scale.toFixed(2))}× resolution` : 'High-resolution PNG';
  updateDownload();
}

function clearMobileExport() {
  if (mobileUrl) {
    const previousUrl = mobileUrl;
    setTimeout(() => URL.revokeObjectURL(previousUrl), 30_000);
  }
  mobileUrl = mobileFile = undefined;
  openPng.removeAttribute('href');
  byId('mobile-save').hidden = true;
}

function queuePreview() {
  clearMobileExport();
  const id = ++revision;
  const state = readSettings();
  syncControls(state);
  rendering = !!state.text.trim();
  updateDownload();
  cancelAnimationFrame(frame);
  if (!rendering) {
    showLayout(state, null);
    return;
  }
  frame = requestAnimationFrame(async () => {
    let fontFailed = false;
    try {
      await loadFonts(state);
    } catch {
      fontFailed = true;
    }
    if (id !== revision) return;
    rendering = false;
    showLayout(state, makeLayout(state));
    if (fontFailed) status.textContent = 'A font could not load. The preview uses a fallback.';
  });
}

function filename(text) {
  let name = text.normalize().trim().replace(/[<>:"/\\|?*\u0000-\u001f\u007f]/g, ' ').replace(/\s+/gu, ' ');
  name = Array.from(name).slice(0, 60).join('').trim().replace(/^[. ]+|[. ]+$/g, '');
  if (/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(name)) name = `_${name}`;
  return `${name || 'text'}.png`;
}

editor.addEventListener('input', queuePreview);
editor.addEventListener('compositionend', queuePreview);
settings.addEventListener('change', queuePreview);
settings.addEventListener('input', queuePreview);
settings.addEventListener('submit', event => event.preventDefault());
settings.addEventListener('reset', () => {
  rendering = true;
  updateDownload();
  setTimeout(queuePreview, 0);
});
byId('clear').addEventListener('click', () => {
  editor.value = '';
  queuePreview();
  editor.focus();
});
shareButton.addEventListener('click', async () => {
  if (!mobileFile) return;
  const file = mobileFile;
  try {
    await navigator.share({files: [file]});
  } catch (error) {
    if (error.name !== 'AbortError' && mobileFile === file) status.textContent = 'Tap Open PNG to save the image.';
  }
});
download.addEventListener('click', () => {
  if (!current || rendering || exporting) return;
  const id = revision;
  const name = filename(editor.value);
  exporting = true;
  updateDownload();
  const done = blob => {
    exporting = false;
    updateDownload();
    if (!blob) {
      if (id === revision) status.textContent = 'PNG export failed. Try a smaller font size.';
      return;
    }
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    document.body.append(link);
    link.click();
    link.remove();
    if (id === revision && touchDevice) {
      clearMobileExport();
      mobileUrl = url;
      openPng.href = url;
      mobileFile = typeof File === 'function' ? new File([blob], name, {type: 'image/png'}) : undefined;
      shareButton.hidden = !(mobileFile && navigator.canShare?.({files: [mobileFile]}));
      byId('mobile-save').hidden = false;
      status.textContent = 'PNG ready. Use Open PNG if the download did not start.';
    } else {
      setTimeout(() => URL.revokeObjectURL(url), 30_000);
      if (id === revision) status.textContent = 'PNG download started';
    }
  };
  try {
    preview.toBlob(done, 'image/png');
  } catch {
    done(null);
  }
});
if (typeof ResizeObserver === 'function') new ResizeObserver(fitPreview).observe(stage);
else window.addEventListener('resize', fitPreview);
queuePreview();
