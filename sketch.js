// =============================================================================
// SHOOT THE MOVING TARGET (SIMPLIFIED VERSION)
// 1 Player Ball • 1 Floating Target • 5 Levels • Main Menu with Buttons
// =============================================================================

// Game state & Level data
let gameState = "MENU"; // "MENU", "PLAY", "LEVEL_CLEAR", "GAME_OVER"
let currentLevel = 1;
let shots = 0;

// 5 Levels: target size, speed, and color
const levels = [
  { size: 36, speed: 2.0, color: [0, 220, 255] },  // Level 1: Big & slow
  { size: 30, speed: 3.2, color: [50, 255, 100] }, // Level 2
  { size: 24, speed: 4.5, color: [255, 180, 0] },  // Level 3
  { size: 19, speed: 6.0, color: [255, 60, 150] }, // Level 4
  { size: 15, speed: 7.5, color: [180, 70, 255] }  // Level 5: Tiny & fast
];

// Single Player Ball
let ball = {
  startX: 160,
  startY: 480,
  x: 160,
  y: 480,
  vx: 0,
  vy: 0,
  r: 15,
  isFlying: false,
  isAiming: false
};

// Single Floating Target Ball
let target = {
  x: 550,
  y: 250,
  vx: 2,
  vy: 2,
  r: 30
};

// Hit explosion particles
let particles = [];

// =============================================================================
// SETUP & DRAW
// =============================================================================
function setup() {
  let canvas = createCanvas(900, 560);
  canvas.parent("canvas-container");
  textAlign(CENTER, CENTER);
  resetBall();
}

function draw() {
  background(22, 24, 34);

  if (gameState === "MENU") {
    drawMenu();
  } else if (gameState === "PLAY") {
    updateGame();
    drawGame();
  } else if (gameState === "LEVEL_CLEAR") {
    drawLevelClear();
  } else if (gameState === "GAME_OVER") {
    drawGameOver();
  }

  // Draw any hit particles
  for (let i = particles.length - 1; i >= 0; i--) {
    particles[i].x += particles[i].vx;
    particles[i].y += particles[i].vy;
    particles[i].alpha -= 8;
    fill(particles[i].c[0], particles[i].c[1], particles[i].c[2], particles[i].alpha);
    noStroke();
    circle(particles[i].x, particles[i].y, particles[i].size);
    if (particles[i].alpha <= 0) particles.splice(i, 1);
  }
}

// =============================================================================
// LEVEL & BALL MANAGEMENT
// =============================================================================
function startLevel(lvlNum) {
  currentLevel = constrain(lvlNum, 1, 5);
  let lvl = levels[currentLevel - 1];
  target.r = lvl.size;
  target.x = random(450, width - 60);
  target.y = random(80, height - 80);

  // Set random direction with level speed
  let angle = random(TWO_PI);
  target.vx = cos(angle) * lvl.speed;
  target.vy = sin(angle) * lvl.speed;

  shots = 0;
  resetBall();
  gameState = "PLAY";
}

function resetBall() {
  ball.x = ball.startX;
  ball.y = ball.startY;
  ball.vx = 0;
  ball.vy = 0;
  ball.isFlying = false;
  ball.isAiming = false;
}

// =============================================================================
// GAMEPLAY LOGIC
// =============================================================================
function updateGame() {
  // 1. Move target (bounces in the right half of arena)
  target.x += target.vx;
  target.y += target.vy;
  if (target.x < 350 || target.x > width - target.r) target.vx *= -1;
  if (target.y < target.r + 50 || target.y > height - target.r - 20) target.vy *= -1;

  // 2. Move player ball if in flight
  if (ball.isFlying) {
    ball.vy += 0.38; // Gravity
    ball.x += ball.vx;
    ball.y += ball.vy;

    // Bounce off walls
    if (ball.x < ball.r || ball.x > width - ball.r) {
      ball.vx *= -0.75;
      ball.x = constrain(ball.x, ball.r, width - ball.r);
      playBeep(200);
    }
    // Bounce off ceiling
    if (ball.y < ball.r + 50) {
      ball.vy *= -0.75;
      ball.y = ball.r + 50;
      playBeep(200);
    }
    // Bounce off floor & friction
    if (ball.y > height - ball.r - 20) {
      ball.y = height - ball.r - 20;
      ball.vy *= -0.65;
      ball.vx *= 0.94;
      if (abs(ball.vy) > 1) playBeep(200);
    }

    // Auto-reset if ball stopped moving
    if (abs(ball.vx) < 0.2 && abs(ball.vy) < 0.5 && ball.y >= height - ball.r - 25) {
      resetBall();
    }

    // 3. Collision check: ball hits target!
    let d = dist(ball.x, ball.y, target.x, target.y);
    if (d < ball.r + target.r) {
      playBeep(800, 0.25);
      createExplosion(target.x, target.y, levels[currentLevel - 1].color);

      if (currentLevel >= 5) {
        gameState = "GAME_OVER";
      } else {
        gameState = "LEVEL_CLEAR";
      }
    }
  }
}

function drawGame() {
  let lvlColor = levels[currentLevel - 1].color;

  // Top header bar
  fill(30, 33, 46);
  noStroke();
  rect(0, 0, width, 50);
  fill(lvlColor[0], lvlColor[1], lvlColor[2]);
  textSize(18);
  textStyle(BOLD);
  text(`LEVEL ${currentLevel} / 5`, 80, 25);

  fill(220);
  textStyle(NORMAL);
  text(`Shots: ${shots}`, 220, 25);

  // Top Buttons
  drawButton(width - 200, 10, 90, 30, "RESET (R)", "#3b4055");
  drawButton(width - 95, 10, 80, 30, "MENU", "#3b4055");

  // Arena separator line
  stroke(255, 255, 255, 25);
  line(330, 50, 330, height - 20);
  line(20, height - 20, width - 20, height - 20);

  // Slingshot base pedestal
  noStroke();
  fill(0, 200, 255, 40);
  ellipse(ball.startX, ball.startY + ball.r + 5, 40, 10);
  stroke(0, 200, 255, 120);
  line(ball.startX - 12, ball.startY + 10, ball.startX - 12, ball.startY - 5);
  line(ball.startX + 12, ball.startY + 10, ball.startX + 12, ball.startY - 5);

  // Aiming slingshot line
  if (ball.isAiming) {
    stroke(0, 220, 255, 180);
    strokeWeight(2);
    line(ball.startX, ball.startY, mouseX, mouseY);

    // Trajectory dots preview
    let pullX = (ball.startX - mouseX) * 0.14;
    let pullY = (ball.startY - mouseY) * 0.14;
    let dotX = ball.startX;
    let dotY = ball.startY;
    fill(255, 220, 0, 180);
    noStroke();
    for (let i = 0; i < 18; i++) {
      pullY += 0.38;
      dotX += pullX;
      dotY += pullY;
      circle(dotX, dotY, 4);
    }
  }

  // Draw Floating Target Ball
  fill(lvlColor[0], lvlColor[1], lvlColor[2]);
  stroke(255, 180);
  strokeWeight(2);
  circle(target.x, target.y, target.r * 2);
  // Shiny dot
  fill(255, 200);
  noStroke();
  circle(target.x - target.r * 0.3, target.y - target.r * 0.3, target.r * 0.5);

  // Draw Player Ball
  let bx = ball.isAiming ? mouseX : ball.x;
  let by = ball.isAiming ? mouseY : ball.y;
  fill(0, 220, 255);
  stroke(255);
  strokeWeight(2);
  circle(bx, by, ball.r * 2);

  // Bottom prompt
  noStroke();
  fill(160);
  textSize(13);
  text("Click & drag the blue ball backward to shoot • Press 'R' to reset ball", width / 2, height - 8);
}

// =============================================================================
// MENUS & SCREENS
// =============================================================================
function drawMenu() {
  fill(0, 220, 255);
  textSize(44);
  textStyle(BOLD);
  text("TARGET SHOOTER", width / 2, 110);

  fill(180);
  textSize(16);
  textStyle(NORMAL);
  text("Shoot the moving floating target • 5 Levels of increasing speed", width / 2, 160);

  // Big Play button
  drawButton(width / 2 - 100, 200, 200, 50, "PLAY GAME", "#00bcd4");

  // 5 Level Buttons
  fill(220);
  textSize(14);
  text("OR CHOOSE LEVEL:", width / 2, 290);
  for (let i = 1; i <= 5; i++) {
    drawButton(width / 2 - 210 + (i - 1) * 85, 315, 75, 40, `LVL ${i}`, "#34394f");
  }

  fill(130);
  textSize(13);
  text("Controls: Drag from the blue ball like a slingshot and release to fire!", width / 2, 420);
}

function drawLevelClear() {
  fill(0, 0, 0, 180);
  rect(0, 0, width, height);

  fill(30, 34, 48);
  stroke(0, 220, 255);
  strokeWeight(2);
  rect(width / 2 - 180, height / 2 - 120, 360, 240, 10);

  noStroke();
  fill(0, 220, 255);
  textSize(28);
  textStyle(BOLD);
  text("LEVEL CLEARED!", width / 2, height / 2 - 70);

  fill(220);
  textSize(16);
  textStyle(NORMAL);
  text(`Shots taken: ${shots}`, width / 2, height / 2 - 25);

  drawButton(width / 2 - 140, height / 2 + 25, 130, 42, "NEXT LEVEL", "#00bcd4");
  drawButton(width / 2 + 10, height / 2 + 25, 130, 42, "MAIN MENU", "#34394f");
}

function drawGameOver() {
  fill(0, 0, 0, 190);
  rect(0, 0, width, height);

  fill(30, 34, 48);
  stroke(255, 215, 0);
  strokeWeight(2);
  rect(width / 2 - 200, height / 2 - 120, 400, 240, 10);

  noStroke();
  fill(255, 215, 0);
  textSize(30);
  textStyle(BOLD);
  text("YOU WON!", width / 2, height / 2 - 65);

  fill(220);
  textSize(16);
  textStyle(NORMAL);
  text("All 5 moving targets eliminated!", width / 2, height / 2 - 20);

  drawButton(width / 2 - 150, height / 2 + 25, 140, 42, "PLAY AGAIN", "#00bcd4");
  drawButton(width / 2 + 10, height / 2 + 25, 140, 42, "MAIN MENU", "#34394f");
}

// =============================================================================
// REUSABLE BUTTON & INPUTS
// =============================================================================
function drawButton(x, y, w, h, label, bgColor) {
  let isHover = mouseX >= x && mouseX <= x + w && mouseY >= y && mouseY <= y + h;
  stroke(isHover ? 255 : 100);
  strokeWeight(1.5);
  fill(isHover ? lerpColor(color(bgColor), color(255), 0.25) : bgColor);
  rect(x, y, w, h, 6);

  noStroke();
  fill(255);
  textSize(14);
  textStyle(BOLD);
  text(label, x + w / 2, y + h / 2);
}

function isInside(x, y, w, h) {
  return mouseX >= x && mouseX <= x + w && mouseY >= y && mouseY <= y + h;
}

function mousePressed() {
  // Menu Buttons
  if (gameState === "MENU") {
    if (isInside(width / 2 - 100, 200, 200, 50)) startLevel(1);
    for (let i = 1; i <= 5; i++) {
      if (isInside(width / 2 - 210 + (i - 1) * 85, 315, 75, 40)) startLevel(i);
    }
    return;
  }

  // Level Clear Buttons
  if (gameState === "LEVEL_CLEAR") {
    if (isInside(width / 2 - 140, height / 2 + 25, 130, 42)) startLevel(currentLevel + 1);
    if (isInside(width / 2 + 10, height / 2 + 25, 130, 42)) gameState = "MENU";
    return;
  }

  // Game Over Buttons
  if (gameState === "GAME_OVER") {
    if (isInside(width / 2 - 150, height / 2 + 25, 140, 42)) startLevel(1);
    if (isInside(width / 2 + 10, height / 2 + 25, 140, 42)) gameState = "MENU";
    return;
  }

  // Gameplay in-game buttons & aiming
  if (gameState === "PLAY") {
    if (isInside(width - 200, 10, 90, 30)) { resetBall(); return; }
    if (isInside(width - 95, 10, 80, 30)) { gameState = "MENU"; return; }

    // Click near ball or launch base to start aiming
    if (!ball.isFlying && dist(mouseX, mouseY, ball.startX, ball.startY) < 40) {
      ball.isAiming = true;
    }
  }
}

function mouseReleased() {
  if (gameState === "PLAY" && ball.isAiming) {
    let pullX = ball.startX - mouseX;
    let pullY = ball.startY - mouseY;
    let pullDist = dist(mouseX, mouseY, ball.startX, ball.startY);

    // Only launch if pulled back enough
    if (pullDist > 15) {
      ball.vx = pullX * 0.14;
      ball.vy = pullY * 0.14;
      ball.isFlying = true;
      shots++;
      playBeep(500, 0.1);
    }
    ball.isAiming = false;
  }
}

function keyPressed() {
  if (key === 'r' || key === 'R' || key === ' ') {
    if (gameState === "PLAY") resetBall();
  }
}

// Particle explosion helper
function createExplosion(x, y, col) {
  for (let i = 0; i < 30; i++) {
    let a = random(TWO_PI);
    let s = random(2, 7);
    particles.push({
      x: x, y: y,
      vx: cos(a) * s, vy: sin(a) * s,
      c: col, size: random(3, 7), alpha: 255
    });
  }
}

// Simple Web Audio beep (no files needed)
function playBeep(freq, dur = 0.08) {
  try {
    let ctx = new (window.AudioContext || window.webkitAudioContext)();
    let osc = ctx.createOscillator();
    let gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    osc.start();
    osc.stop(ctx.currentTime + dur);
  } catch (e) {}
}
