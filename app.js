// --- Global Audio Architecture ---
let audioCtx = null;
let isAutoTesting = false;
let autoTestTimeout = null;

// Music Player State
let musicSourceNode = null;
let musicAudioBuffer = null;
let isMusicPlaying = false;
let currentMusicChannel = 'all';

// 5.1 Speaker Configurations
const CHANNELS = [
  { id: 'btn-fl', mode: 'left-only', en: 'Front Left', ml: 'മുന്നിലെ ഇടത്' },
  { id: 'btn-c', mode: 'both', en: 'Center', ml: 'സെന്റർ ചാനൽ' },
  { id: 'btn-fr', mode: 'right-only', en: 'Front Right', ml: 'മുന്നിലെ വലത്' },
  { id: 'btn-sub', mode: 'sub-bass', en: 'Subwoofer Bass', ml: 'സബ് വൂഫർ ബേസ്' },
  { id: 'btn-sl', mode: 'left-only', en: 'Surround Left', ml: 'പിന്നിലെ ഇടത്' },
  { id: 'btn-sr', mode: 'right-only', en: 'Surround Right', ml: 'പിന്നിലെ വലത്' }
];

// DOM Elements
const statusBox = document.getElementById('statusBox');
const languageSelect = document.getElementById('languageSelect');
const signalType = document.getElementById('signalType');
const autoTestBtn = document.getElementById('autoTestBtn');
const stopBtn = document.getElementById('stopBtn');
const songPlayBtn = document.getElementById('songPlayBtn');
const songTitle = document.getElementById('songTitle');
const songStatus = document.getElementById('songStatus');
const audioFileInput = document.getElementById('audioFileInput');
const pillBtns = document.querySelectorAll('.pill-btn');

function initAudio() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

// 🔊 വോയ്സ് ഗൈഡ്
function speakChannel(text, lang) {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang === 'ml' ? 'ml-IN' : 'en-US';
  utterance.rate = 0.9;
  window.speechSynthesis.speak(utterance);
}

// 🔔 സോഫ്റ്റ് സിനിമാറ്റിക് ബെൽ / ചിം ടോൺ (തലവേദനയില്ലാത്ത സ്മൂത്ത് സൗണ്ട്)
function playToneBuffer(mode, duration = 1.6) {
  initAudio();
  const sampleRate = audioCtx.sampleRate;
  const numFrames = sampleRate * duration;
  const buffer = audioCtx.createBuffer(2, numFrames, sampleRate);
  const leftData = buffer.getChannelData(0);
  const rightData = buffer.getChannelData(1);

  for (let i = 0; i < numFrames; i++) {
    const t = i / sampleRate;
    let sampleVal = 0;

    if (mode === 'sub-bass') {
      // 📻 സബ്‌വൂഫറിന് തനി ഡീപ് ബേസ് തമ്പ്
      const currentFreq = 85 - (t / duration) * 45;
      sampleVal = Math.sin(2 * Math.PI * currentFreq * t) * Math.exp(-t * 2.5);
    } else {
      // 🔔 തിയേറ്റർ മോഡൽ ഹാർമോണിക് ചിം ബെൽ (528Hz + 264Hz)
      const tone1 = Math.sin(2 * Math.PI * 528 * t);
      const tone2 = Math.sin(2 * Math.PI * 264 * t) * 0.5;
      const tone3 = Math.sin(2 * Math.PI * 1056 * t) * 0.15;
      const decay = Math.exp(-t * 2.2);
      sampleVal = (tone1 + tone2 + tone3) * 0.35 * decay;
    }

    if (mode === 'left-only') {
      leftData[i] = sampleVal;
      rightData[i] = 0; // 🛑 വലത് സ്പീക്കർ 100% നിശബ്ദം
    } else if (mode === 'right-only') {
      leftData[i] = 0; // 🛑 ഇടത് സ്പീക്കർ 100% നിശബ്ദം
      rightData[i] = sampleVal;
    } else {
      leftData[i] = sampleVal;
      rightData[i] = sampleVal;
    }
  }

  const src = audioCtx.createBufferSource();
  src.buffer = buffer;
  src.connect(audioCtx.destination);
  src.start();
}

// 🌊 സോഫ്റ്റ് പിങ്ക് നോയ്സ്
function playPinkNoiseBuffer(mode, duration = 2.0) {
  initAudio();
  const sampleRate = audioCtx.sampleRate;
  const numFrames = sampleRate * duration;
  const buffer = audioCtx.createBuffer(2, numFrames, sampleRate);
  const leftData = buffer.getChannelData(0);
  const rightData = buffer.getChannelData(1);

  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
  for (let i = 0; i < numFrames; i++) {
    const white = Math.random() * 2 - 1;
    b0 = 0.99886 * b0 + white * 0.0555179;
    b1 = 0.99332 * b1 + white * 0.0750759;
    b2 = 0.96900 * b2 + white * 0.1538520;
    b3 = 0.86650 * b3 + white * 0.3104856;
    b4 = 0.55000 * b4 + white * 0.5329522;
    b5 = -0.7616 * b5 - white * 0.0168980;
    const pink = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
    b6 = white * 0.115926;

    if (mode === 'left-only') {
      leftData[i] = pink;
      rightData[i] = 0;
    } else if (mode === 'right-only') {
      leftData[i] = 0;
      rightData[i] = pink;
    } else {
      leftData[i] = pink;
      rightData[i] = pink;
    }
  }

  const src = audioCtx.createBufferSource();
  src.buffer = buffer;
  src.connect(audioCtx.destination);
  src.start();
}

// 📉 ബേസ് സ്വീപ്പ്
function playBassSweepBuffer(mode, duration = 3.0) {
  initAudio();
  const sampleRate = audioCtx.sampleRate;
  const numFrames = sampleRate * duration;
  const buffer = audioCtx.createBuffer(2, numFrames, sampleRate);
  const leftData = buffer.getChannelData(0);
  const rightData = buffer.getChannelData(1);

  for (let i = 0; i < numFrames; i++) {
    const t = i / sampleRate;
    const freq = 25 + (t / duration) * 115;
    const env = Math.min(t / 0.1, 1) * Math.min((duration - t) / 0.1, 1);
    const sampleVal = Math.sin(2 * Math.PI * freq * t) * env;

    if (mode === 'left-only') {
      leftData[i] = sampleVal;
      rightData[i] = 0;
    } else if (mode === 'right-only') {
      leftData[i] = 0;
      rightData[i] = sampleVal;
    } else {
      leftData[i] = sampleVal;
      rightData[i] = sampleVal;
    }
  }

  const src = audioCtx.createBufferSource();
  src.buffer = buffer;
  src.connect(audioCtx.destination);
  src.start();
}

// 🎯 സ്പീക്കർ ട്രിഗർ
function triggerChannel(channelObj) {
  document.querySelectorAll('.speaker-tile').forEach(btn => btn.classList.remove('active'));
  const btnElement = document.getElementById(channelObj.id);
  if (btnElement) btnElement.classList.add('active');

  const lang = languageSelect.value;
  const mode = signalType.value;
  const channelName = lang === 'ml' ? channelObj.ml : channelObj.en;

  statusBox.innerHTML = `ടെസ്റ്റിംഗ്: <strong>${channelName}</strong>`;

  if (mode === 'voice') {
    speakChannel(channelName, lang);
    playToneBuffer(channelObj.mode, 1.8);
  } else if (mode === 'pinkNoise') {
    playPinkNoiseBuffer(channelObj.mode, 2.0);
  } else if (mode === 'bassSweep') {
    playBassSweepBuffer(channelObj.mode, 3.0);
  }

  setTimeout(() => {
    if (btnElement && !isAutoTesting) btnElement.classList.remove('active');
  }, 2000);
}

// ⚡ ഓട്ടോ സീക്വൻസ്
function runAutoTest(step = 0) {
  if (!isAutoTesting) return;

  if (step >= CHANNELS.length) {
    stopAll();
    statusBox.innerHTML = `സ്റ്റാറ്റസ്: <strong>ഓട്ടോ ടെസ്റ്റ് പൂർത്തിയായി! ✅</strong>`;
    return;
  }

  const currentChannel = CHANNELS[step];
  triggerChannel(currentChannel);

  const delay = signalType.value === 'bassSweep' ? 3500 : 2300;
  autoTestTimeout = setTimeout(() => {
    runAutoTest(step + 1);
  }, delay);
}

// 🎵 ഡെമോ മ്യൂസിക്
function generateDemoMusicBuffer() {
  const sampleRate = audioCtx.sampleRate;
  const length = sampleRate * 8;
  const buffer = audioCtx.createBuffer(2, length, sampleRate);
  const left = buffer.getChannelData(0);
  const right = buffer.getChannelData(1);

  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
    const melody = Math.sin(2 * Math.PI * 440 * (1 + (Math.floor(t * 3) % 4) * 0.25) * t) * 0.2;
    const kick = Math.sin(2 * Math.PI * (110 - (t % 0.5) * 130) * (t % 0.5)) * Math.exp(-(t % 0.5) * 9) * 0.5;
    left[i] = melody + kick;
    right[i] = melody + kick;
  }
  return buffer;
}

// 🎶 സീറോ ലീക്കേജ് മ്യൂസിക് റൂട്ടിംഗ്
function routeMusicToChannel(ch) {
  if (!musicSourceNode || !audioCtx) return;

  try { musicSourceNode.disconnect(); } catch (e) {}

  const splitter = audioCtx.createChannelSplitter(2);
  const merger = audioCtx.createChannelMerger(2);
  const leftGain = audioCtx.createGain();
  const rightGain = audioCtx.createGain();

  musicSourceNode.connect(splitter);

  if (ch === '0' || ch === '4') {
    // Left Only
    leftGain.gain.setValueAtTime(1.0, audioCtx.currentTime);
    rightGain.gain.setValueAtTime(0.0, audioCtx.currentTime);
    splitter.connect(leftGain, 0);
    leftGain.connect(merger, 0, 0);
    merger.connect(audioCtx.destination);
  } else if (ch === '1' || ch === '5') {
    // Right Only
    leftGain.gain.setValueAtTime(0.0, audioCtx.currentTime);
    rightGain.gain.setValueAtTime(1.0, audioCtx.currentTime);
    splitter.connect(rightGain, 1);
    rightGain.connect(merger, 0, 1);
    merger.connect(audioCtx.destination);
  } else if (ch === '3') {
    // Subwoofer Bass Only
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(100, audioCtx.currentTime);
    const boost = audioCtx.createGain();
    boost.gain.setValueAtTime(2.2, audioCtx.currentTime);

    musicSourceNode.connect(filter);
    filter.connect(boost);
    boost.connect(audioCtx.destination);
  } else {
    musicSourceNode.connect(audioCtx.destination);
  }
}

function startMusicPlayback() {
  initAudio();
  if (isMusicPlaying) {
    stopMusic();
    return;
  }

  if (!musicAudioBuffer) {
    musicAudioBuffer = generateDemoMusicBuffer();
  }

  musicSourceNode = audioCtx.createBufferSource();
  musicSourceNode.buffer = musicAudioBuffer;
  musicSourceNode.loop = true;

  routeMusicToChannel(currentMusicChannel);

  musicSourceNode.start(0);
  isMusicPlaying = true;
  songPlayBtn.innerText = '⏹ പാട്ട് നിർത്തുക';
  songPlayBtn.classList.add('playing');
  songStatus.innerText = 'പ്ലേ ചെയ്യുന്നു...';
}

function stopMusic() {
  if (musicSourceNode) {
    try { musicSourceNode.stop(); } catch (e) {}
    musicSourceNode = null;
  }
  isMusicPlaying = false;
  songPlayBtn.innerText = '▶ പാട്ട് പ്ലേ ചെയ്യുക';
  songPlayBtn.classList.remove('playing');
  songStatus.innerText = 'പ്ലേ ചെയ്യാൻ തയ്യാറാണ്';
}

function stopAll() {
  isAutoTesting = false;
  clearTimeout(autoTestTimeout);
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  stopMusic();

  document.querySelectorAll('.speaker-tile').forEach(btn => btn.classList.remove('active'));
  statusBox.innerHTML = `സ്റ്റാറ്റസ്: <strong>റെഡി (Ready)</strong>`;
}

// --- Event Handlers ---
document.querySelectorAll('.speaker-tile').forEach(btn => {
  btn.addEventListener('click', () => {
    stopAll();
    const btnId = btn.id;
    const channelObj = CHANNELS.find(c => c.id === btnId);
    if (channelObj) triggerChannel(channelObj);
  });
});

pillBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    pillBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentMusicChannel = btn.dataset.musicCh;

    document.querySelectorAll('.speaker-tile').forEach(t => t.classList.remove('active'));
    if (currentMusicChannel === '0') document.getElementById('btn-fl')?.classList.add('active');
    else if (currentMusicChannel === '1') document.getElementById('btn-fr')?.classList.add('active');
    else if (currentMusicChannel === '2') document.getElementById('btn-c')?.classList.add('active');
    else if (currentMusicChannel === '3') document.getElementById('btn-sub')?.classList.add('active');
    else if (currentMusicChannel === '4') document.getElementById('btn-sl')?.classList.add('active');
    else if (currentMusicChannel === '5') document.getElementById('btn-sr')?.classList.add('active');

    if (isMusicPlaying) {
      routeMusicToChannel(currentMusicChannel);
    }
  });
});

audioFileInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;

  initAudio();
  songTitle.innerText = file.name;
  songStatus.innerText = 'ഓഡിയോ ലോഡ് ചെയ്യുന്നു...';

  const reader = new FileReader();
  reader.onload = function (ev) {
    audioCtx.decodeAudioData(ev.target.result, (buffer) => {
      musicAudioBuffer = buffer;
      songStatus.innerText = 'ലോഡ് ആയി! പ്ലേ ചെയ്യാൻ തയ്യാറാണ്';
      if (isMusicPlaying) {
        stopMusic();
        startMusicPlayback();
      }
    });
  };
  reader.readAsArrayBuffer(file);
});

songPlayBtn.addEventListener('click', startMusicPlayback);
autoTestBtn.addEventListener('click', () => {
  stopAll();
  isAutoTesting = true;
  runAutoTest(0);
});
stopBtn.addEventListener('click', stopAll);