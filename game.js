const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const scoreEl = document.getElementById('score');
const targetEl = document.getElementById('target');
const soundStatusEl = document.getElementById('soundStatus');

const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');
const restartBtn = document.getElementById('restartBtn');
const soundBtn = document.getElementById('soundBtn');
const birthdayMusic = document.getElementById('birthdayMusic');

const W = canvas.width;
const H = canvas.height;
const groundY = H - 58;
const TARGET_SCORE = 5;

let score = 0;
let speed = 4;
let frame = 0;
let running = false;
let paused = false;
let gameOver = false;
let victory = false;
let soundEnabled = true;

let chimneys = [];
let children = [];
let confetti = [];
let audioContext = null;

const player = {
  x: 145,
  y: 215,
  w: 56,
  h: 72,
  vy: 0,
};

targetEl.textContent = TARGET_SCORE;

function getAudioContext() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioContext.state === 'suspended') audioContext.resume();
  return audioContext;
}

function beep(frequency, duration = 0.08, type = 'sine', volume = 0.08) {
  if (!soundEnabled) return;

  const audio = getAudioContext();
  const osc = audio.createOscillator();
  const gain = audio.createGain();

  osc.type = type;
  osc.frequency.value = frequency;

  gain.gain.setValueAtTime(volume, audio.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + duration);

  osc.connect(gain);
  gain.connect(audio.destination);

  osc.start();
  osc.stop(audio.currentTime + duration);
}

function playRescueSound() {
  beep(660, 0.07, 'triangle', 0.07);
  setTimeout(() => beep(880, 0.09, 'triangle', 0.06), 70);
}

function playCrashSound() {
  beep(120, 0.18, 'sawtooth', 0.08);
}

function playVictorySound() {
  beep(523, 0.10, 'triangle', 0.07);
  setTimeout(() => beep(659, 0.10, 'triangle', 0.07), 120);
  setTimeout(() => beep(784, 0.14, 'triangle', 0.07), 240);
}

function playBirthdayMusic() {
  if (!soundEnabled) return;

  birthdayMusic.currentTime = 0;
  birthdayMusic.volume = 0.85;

  birthdayMusic.play().catch(() => {
    console.log("La musique d'anniversaire n'a pas pu se lancer.");
  });
}

function stopBirthdayMusic() {
  birthdayMusic.pause();
  birthdayMusic.currentTime = 0;
}

function resetGame() {
  score = 0;
  speed = 4;
  frame = 0;

  chimneys = [];
  children = [];
  confetti = [];

  player.y = 215;
  player.vy = 0;

  gameOver = false;
  victory = false;
  paused = false;
  running = true;

  scoreEl.textContent = score;
  stopBirthdayMusic();

  document.body.classList.remove('big-birthday-boom');
}

function startGame() {
  getAudioContext();

  if (!running || gameOver || victory) {
    resetGame();
  }

  running = true;
  paused = false;

  beep(440, 0.07, 'sine', 0.04);
}

function togglePause() {
  if (!running || gameOver || victory) return;

  paused = !paused;
  beep(paused ? 260 : 520, 0.07, 'sine', 0.04);
}

function toggleSound() {
  soundEnabled = !soundEnabled;
  birthdayMusic.muted = !soundEnabled;

  soundStatusEl.textContent = soundEnabled ? 'activé' : 'coupé';
  soundBtn.textContent = soundEnabled ? 'Couper le son' : 'Remettre le son';

  if (!soundEnabled) {
    stopBirthdayMusic();
  } else {
    beep(640, 0.08, 'sine', 0.05);
  }
}

function addChimney() {
  const h = 80 + Math.random() * 115;

  chimneys.push({
    x: W + 20,
    y: groundY - h,
    w: 52,
    h,
  });
}

function addChild() {
  children.push({
    x: W + 45,
    y: 76 + Math.random() * 255,
    r: 18,
    taken: false,
    bob: Math.random() * Math.PI * 2,
  });
}

function update() {
  if (!running || paused || gameOver || victory) return;

  frame++;
  speed += 0.0018;

  player.vy += 0.26;
  player.vy = Math.max(-7.2, Math.min(6.4, player.vy));
  player.y += player.vy;

  if (player.y < 25) {
    player.y = 25;
    player.vy = 0;
  }

  if (player.y + player.h > groundY) {
    endGame();
  }

  if (frame % 92 === 0) addChimney();
  if (frame % 118 === 0) addChild();

  chimneys.forEach(c => c.x -= speed);

  children.forEach(k => {
    k.x -= speed * 1.04;
    k.y += Math.sin(frame * 0.06 + k.bob) * 0.35;
  });

  chimneys = chimneys.filter(c => c.x + c.w > -10);
  children = children.filter(k => k.x + k.r > -10 && !k.taken);

  chimneys.forEach(c => {
    if (
      rectsOverlap(
        player.x + 8,
        player.y + 10,
        player.w - 16,
        player.h - 8,
        c.x,
        c.y,
        c.w,
        c.h
      )
    ) {
      endGame();
    }
  });

  children.forEach(k => {
    const px = player.x + player.w / 2;
    const py = player.y + player.h / 2;

    if (Math.hypot(px - k.x, py - k.y) < 44) {
      k.taken = true;
      score += 1;
      playRescueSound();
      updateScore();
    }
  });
}

function updateScore() {
  scoreEl.textContent = score;

  if (score >= TARGET_SCORE && !victory) {
    winGame();
  }
}

function winGame() {
  victory = true;
  running = false;

  playVictorySound();
  playBirthdayMusic();
  launchConfetti();
  bigBirthdayBoom();
}

function endGame() {
  if (gameOver || victory) return;

  gameOver = true;
  running = false;

  playCrashSound();
}

function rectsOverlap(x1, y1, w1, h1, x2, y2, w2, h2) {
  return x1 < x2 + w2 &&
         x1 + w1 > x2 &&
         y1 < y2 + h2 &&
         y1 + h1 > y2;
}

function drawSky() {
  const grad = ctx.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, '#ff8ec7');
  grad.addColorStop(0.35, '#ffd166');
  grad.addColorStop(0.7, '#7bdff2');
  grad.addColorStop(1, '#b2f7ef');

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  drawCloud(130, 82, 1.1);
  drawCloud(435, 115, 0.85);
  drawCloud(735, 74, 1.0);

  ctx.fillStyle = '#6b432d';
  ctx.fillRect(0, groundY, W, H - groundY);

  ctx.fillStyle = '#8b5a39';
  for (let x = -20; x < W + 40; x += 80) {
    ctx.fillRect(x, groundY + 10, 54, 12);
  }
}

function drawCloud(x, y, scale) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.78)';
  ctx.beginPath();
  ctx.arc(0, 16, 24, 0, Math.PI * 2);
  ctx.arc(28, 0, 32, 0, Math.PI * 2);
  ctx.arc(64, 16, 25, 0, Math.PI * 2);
  ctx.fillRect(-8, 16, 88, 24);
  ctx.fill();

  ctx.restore();
}

function drawPlayer() {
  const x = player.x;
  const y = player.y;

  ctx.fillStyle = '#7a2440';
  ctx.beginPath();
  ctx.arc(x + 31, y + 12, 42, Math.PI, 0);
  ctx.lineTo(x - 11, y + 12);
  ctx.fill();

  ctx.strokeStyle = '#3d1d25';
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(x + 31, y + 12);
  ctx.lineTo(x + 31, y + 74);
  ctx.stroke();

  ctx.fillStyle = '#f5c79a';
  ctx.beginPath();
  ctx.arc(x + 30, y + 34, 13, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#3c2319';
  ctx.fillRect(x + 18, y + 22, 25, 9);

  ctx.fillStyle = '#263d6b';
  ctx.beginPath();
  ctx.moveTo(x + 16, y + 49);
  ctx.lineTo(x + 44, y + 49);
  ctx.lineTo(x + 54, y + 86);
  ctx.lineTo(x + 7, y + 86);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#d9b45f';
  ctx.fillRect(x + 18, y + 47, 25, 6);

  ctx.fillStyle = '#2a1d18';
  ctx.fillRect(x + 8, y + 86, 14, 6);
  ctx.fillRect(x + 40, y + 86, 14, 6);
}

function drawChimneys() {
  chimneys.forEach(c => {
    ctx.fillStyle = '#7d3f2d';
    ctx.fillRect(c.x, c.y, c.w, c.h);

    ctx.fillStyle = '#5a2a20';
    ctx.fillRect(c.x - 7, c.y - 12, c.w + 14, 15);

    ctx.fillStyle = 'rgba(50, 45, 45, 0.2)';
    ctx.beginPath();
    ctx.arc(c.x + 18, c.y - 26, 12, 0, Math.PI * 2);
    ctx.arc(c.x + 33, c.y - 44, 17, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawChildren() {
  children.forEach(k => drawChild(k.x, k.y));
}

function drawChild(x, y) {
  ctx.save();
  ctx.translate(x, y);

  ctx.fillStyle = '#ffe5b8';
  ctx.beginPath();
  ctx.arc(0, -15, 12, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#6b3c20';
  ctx.beginPath();
  ctx.arc(-4, -22, 8, Math.PI, Math.PI * 2);
  ctx.arc(5, -22, 8, Math.PI, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#2f75b5';
  ctx.beginPath();
  ctx.roundRect(-12, -2, 24, 27, 6);
  ctx.fill();

  ctx.strokeStyle = '#3a271a';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-12, 5);
  ctx.lineTo(-25, -4);
  ctx.moveTo(12, 5);
  ctx.lineTo(25, -4);
  ctx.moveTo(-7, 24);
  ctx.lineTo(-14, 37);
  ctx.moveTo(7, 24);
  ctx.lineTo(14, 37);
  ctx.stroke();

  ctx.fillStyle = '#3a271a';
  ctx.beginPath();
  ctx.arc(-4, -16, 1.7, 0, Math.PI * 2);
  ctx.arc(5, -16, 1.7, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#8a3d24';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(0, -11, 4, 0, Math.PI);
  ctx.stroke();

  ctx.restore();
}

function launchConfetti() {
  confetti = [];

  for (let i = 0; i < 220; i++) {
    confetti.push({
      x: W / 2,
      y: H / 2,
      vx: (Math.random() - 0.5) * 14,
      vy: (Math.random() - 0.8) * 14,
      size: 5 + Math.random() * 9,
      color: ['#ff69b4', '#ffd166', '#06d6a0', '#118ab2', '#ef476f', '#ffffff'][Math.floor(Math.random() * 6)],
      rotation: Math.random() * Math.PI,
      spin: (Math.random() - 0.5) * 0.25,
    });
  }
}

function updateConfetti() {
  confetti.forEach(p => {
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.18;
    p.rotation += p.spin;
  });

  confetti = confetti.filter(p => p.y < H + 30);
}

function drawConfetti() {
  confetti.forEach(p => {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rotation);
    ctx.fillStyle = p.color;
    ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
    ctx.restore();
  });
}

function bigBirthdayBoom() {
  document.body.classList.remove('big-birthday-boom');
  void document.body.offsetWidth;
  document.body.classList.add('big-birthday-boom');

  setTimeout(() => {
    document.body.classList.remove('big-birthday-boom');
  }, 2500);
}

function drawMessage() {
  if (running && !paused) return;

  ctx.save();

  ctx.fillStyle = 'rgba(60, 35, 20, 0.72)';
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = '#fff8dc';
  ctx.textAlign = 'center';

  if (victory) {
    ctx.font = 'bold 40px Georgia';
    ctx.fillText('Bravo Clem !', W / 2, H / 2 - 102);

    ctx.font = 'bold 25px Georgia';
    ctx.fillText(`Tu as sauvé les ${TARGET_SCORE} enfants perdus.`, W / 2, H / 2 - 58);
    ctx.fillText('Tu es officiellement digne de Marry Poppins.', W / 2, H / 2 - 24);

    ctx.font = 'bold 35px Georgia';
    ctx.fillText('Bon anniversaire ! 🎂', W / 2, H / 2 + 34);

    ctx.font = '20px Georgia';
    ctx.fillText('La musique d’anniversaire devrait se lancer maintenant.', W / 2, H / 2 + 76);
    ctx.fillText('Clique sur Recommencer pour refaire voler Clem.', W / 2, H / 2 + 108);
  } else if (gameOver) {
    ctx.font = 'bold 44px Georgia';
    ctx.fillText('Oh non Clem !', W / 2, H / 2 - 48);

    ctx.font = '24px Georgia';
    ctx.fillText('Les cheminées ont gagné cette manche.', W / 2, H / 2 - 6);
    ctx.fillText('Recommence et sauve plus d’enfants pour prouver ta valeur.', W / 2, H / 2 + 34);
  } else if (paused) {
    ctx.font = 'bold 44px Georgia';
    ctx.fillText('Pause', W / 2, H / 2);
  } else {
    ctx.font = 'bold 38px Georgia';
    ctx.fillText('Clem, prête pour ton défi ?', W / 2, H / 2 - 34);

    ctx.font = '24px Georgia';
    ctx.fillText('Sauve les enfants : eux seuls donnent des points.', W / 2, H / 2 + 8);
    ctx.fillText('Tape l’écran ou clique pour voler.', W / 2, H / 2 + 46);
  }

  ctx.restore();
}

function draw() {
  drawSky();
  drawChildren();
  drawChimneys();
  drawPlayer();

  if (victory) {
    updateConfetti();
    drawConfetti();
  }

  drawMessage();
}

function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

function flap() {
  getAudioContext();

  player.vy = -6.8;
  beep(520, 0.04, 'sine', 0.03);

  if (!running && !gameOver && !victory) {
    startGame();
  }
}

window.addEventListener('keydown', e => {
  if (e.code === 'Space' || e.code === 'ArrowUp') {
    e.preventDefault();
    flap();
  }
});

canvas.addEventListener('pointerdown', e => {
  e.preventDefault();
  flap();
});

canvas.addEventListener('touchstart', e => {
  e.preventDefault();
  flap();
}, { passive: false });

startBtn.addEventListener('click', startGame);
pauseBtn.addEventListener('click', togglePause);
restartBtn.addEventListener('click', resetGame);
soundBtn.addEventListener('click', toggleSound);

loop();

const introScreen = document.getElementById('introScreen');
const enterGameBtn = document.getElementById('enterGameBtn');

enterGameBtn.addEventListener('click', () => {
  introScreen.classList.add('hidden');
  startGame();
});
