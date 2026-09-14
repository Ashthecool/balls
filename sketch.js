// =============================================================================
// ORB HUNTER - SHOOT THE MOVING TARGET
// Canvas strictly renders: Ball, Target, and Explosion Particles.
// All UI (Menus, HUD, Modals, Text) is rendered in HTML & CSS.
// =============================================================================

// 5 Levels: target size, speed, and color
const LEVELS = [
  { size: 36, speed: 2.0, color: [0, 220, 255] },  // Level 1: Big & slow
  { size: 30, speed: 3.2, color: [50, 255, 100] }, // Level 2
  { size: 24, speed: 4.5, color: [255, 180, 0] },  // Level 3
  { size: 19, speed: 6.0, color: [255, 60, 150] }, // Level 4
  { size: 15, speed: 7.5, color: [180, 70, 255] }  // Level 5: Tiny & fast
];

// =============================================================================
// SOUND EFFECTS
// =============================================================================
class Sound {
  /**
   * Synthesize a simple Web Audio beep
   * @param {number} freq - Frequency in Hertz
   * @param {number} dur - Duration in seconds
   */
  static playBeep(freq, dur = 0.08) {
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
      osc.start();
      osc.stop(ctx.currentTime + dur);
    } catch (e) {
      // Audio context might fail before user interaction or in unsupported environments
    }
  }
}

// =============================================================================
// PARTICLE CLASS (Hit Explosion)
// =============================================================================
class Particle {
  constructor(x, y, color) {
    this.x = x;
    this.y = y;
    const angle = random(TWO_PI);
    const speed = random(2, 7);
    this.vx = cos(angle) * speed;
    this.vy = sin(angle) * speed;
    this.color = color;
    this.size = random(3, 7);
    this.alpha = 255;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.alpha -= 8;
    return this.alpha > 0;
  }

  draw() {
    fill(this.color[0], this.color[1], this.color[2], this.alpha);
    noStroke();
    circle(this.x, this.y, this.size);
  }
}

// =============================================================================
// FLOATING TARGET CLASS
// =============================================================================
class Target {
  constructor() {
    this.x = 550;
    this.y = 250;
    this.vx = 2;
    this.vy = 2;
    this.r = 30;
    this.color = [0, 220, 255];
  }

  init(levelConfig) {
    this.r = levelConfig.size;
    this.color = levelConfig.color;
    this.x = random(450, width - 60);
    this.y = random(80, height - 80);

    const angle = random(TWO_PI);
    this.vx = cos(angle) * levelConfig.speed;
    this.vy = sin(angle) * levelConfig.speed;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;

    // Bounce inside the right half of the arena
    if (this.x < 350 || this.x > width - this.r) {
      this.vx *= -1;
    }
    if (this.y < this.r + 50 || this.y > height - this.r - 20) {
      this.vy *= -1;
    }
  }

  draw() {
    // Target sphere
    fill(this.color[0], this.color[1], this.color[2]);
    stroke(255, 180);
    strokeWeight(2);
    circle(this.x, this.y, this.r * 2);

    // Specular highlight dot
    fill(255, 200);
    noStroke();
    circle(this.x - this.r * 0.3, this.y - this.r * 0.3, this.r * 0.5);
  }
}

// =============================================================================
// PLAYER BALL & SLINGSHOT CLASS
// =============================================================================
class Ball {
  constructor(startX = 160, startY = 480, radius = 15) {
    this.startX = startX;
    this.startY = startY;
    this.r = radius;
    this.reset();
  }

  reset() {
    this.x = this.startX;
    this.y = this.startY;
    this.vx = 0;
    this.vy = 0;
    this.isFlying = false;
    this.isAiming = false;
  }

  startAiming(mx, my) {
    if (!this.isFlying && dist(mx, my, this.startX, this.startY) < 40) {
      this.isAiming = true;
      return true;
    }
    return false;
  }

  release(mx, my) {
    if (!this.isAiming) return false;
    this.isAiming = false;

    const pullDist = dist(mx, my, this.startX, this.startY);
    if (pullDist > 15) {
      const pullX = this.startX - mx;
      const pullY = this.startY - my;
      this.vx = pullX * 0.14;
      this.vy = pullY * 0.14;
      this.isFlying = true;
      Sound.playBeep(500, 0.1);
      return true; // Indicates ball was fired
    }
    return false;
  }

  update() {
    if (!this.isFlying) return;

    this.vy += 0.38; // Gravity
    this.x += this.vx;
    this.y += this.vy;

    // Bounce off left/right walls
    if (this.x < this.r || this.x > width - this.r) {
      this.vx *= -0.75;
      this.x = constrain(this.x, this.r, width - this.r);
      Sound.playBeep(200);
    }

    // Bounce off ceiling
    if (this.y < this.r + 50) {
      this.vy *= -0.75;
      this.y = this.r + 50;
      Sound.playBeep(200);
    }

    // Bounce off floor & apply ground friction
    if (this.y > height - this.r - 20) {
      this.y = height - this.r - 20;
      this.vy *= -0.65;
      this.vx *= 0.94;
      if (abs(this.vy) > 1) {
        Sound.playBeep(200);
      }
    }

    // Auto-reset when ball comes to rest
    if (abs(this.vx) < 0.2 && abs(this.vy) < 0.5 && this.y >= height - this.r - 25) {
      this.reset();
    }
  }

  checkCollision(target) {
    if (!this.isFlying) return false;
    return dist(this.x, this.y, target.x, target.y) < this.r + target.r;
  }

  drawSlingshot() {
    // Slingshot base pedestal
    noStroke();
    fill(0, 200, 255, 40);
    ellipse(this.startX, this.startY + this.r + 5, 40, 10);
    stroke(0, 200, 255, 120);
    line(this.startX - 12, this.startY + 10, this.startX - 12, this.startY - 5);
    line(this.startX + 12, this.startY + 10, this.startX + 12, this.startY - 5);

    // Aiming slingshot line & trajectory preview
    if (this.isAiming) {
      stroke(0, 220, 255, 180);
      strokeWeight(2);
      line(this.startX, this.startY, mouseX, mouseY);

      // Trajectory dots preview
      let pullX = (this.startX - mouseX) * 0.14;
      let pullY = (this.startY - mouseY) * 0.14;
      let dotX = this.startX;
      let dotY = this.startY;
      fill(255, 220, 0, 180);
      noStroke();
      for (let i = 0; i < 18; i++) {
        pullY += 0.38;
        dotX += pullX;
        dotY += pullY;
        circle(dotX, dotY, 4);
      }
    }
  }

  draw() {
    const bx = this.isAiming ? mouseX : this.x;
    const by = this.isAiming ? mouseY : this.y;
    fill(0, 220, 255);
    stroke(255);
    strokeWeight(2);
    circle(bx, by, this.r * 2);
  }
}

// =============================================================================
// HTML / DOM UI MANAGER
// =============================================================================
class UIManager {
  constructor(game) {
    this.game = game;

    // Screens and overlays
    this.hud = document.getElementById("hud");
    this.hudLevel = document.getElementById("hud-level");
    this.hudShots = document.getElementById("hud-shots");
    this.instructionsBar = document.getElementById("instructions-bar");
    this.menuScreen = document.getElementById("menu-screen");
    this.levelClearModal = document.getElementById("level-clear-modal");
    this.clearShotsText = document.getElementById("clear-shots-text");
    this.gameOverModal = document.getElementById("game-over-modal");

    // Interactive buttons
    this.btnPlay = document.getElementById("btn-play");
    this.btnReset = document.getElementById("btn-reset");
    this.btnMenu = document.getElementById("btn-menu");
    this.btnNextLevel = document.getElementById("btn-next-level");
    this.btnClearMenu = document.getElementById("btn-clear-menu");
    this.btnPlayAgain = document.getElementById("btn-play-again");
    this.btnOverMenu = document.getElementById("btn-over-menu");
    this.levelButtons = document.querySelectorAll(".btn-level");

    this.bindEvents();
  }

  bindEvents() {
    if (this.btnPlay) {
      this.btnPlay.addEventListener("click", () => this.game.startLevel(1));
    }
    if (this.btnReset) {
      this.btnReset.addEventListener("click", () => this.game.ball.reset());
    }
    if (this.btnMenu) {
      this.btnMenu.addEventListener("click", () => this.game.goToMenu());
    }
    if (this.btnNextLevel) {
      this.btnNextLevel.addEventListener("click", () => this.game.nextLevel());
    }
    if (this.btnClearMenu) {
      this.btnClearMenu.addEventListener("click", () => this.game.goToMenu());
    }
    if (this.btnPlayAgain) {
      this.btnPlayAgain.addEventListener("click", () => this.game.startLevel(1));
    }
    if (this.btnOverMenu) {
      this.btnOverMenu.addEventListener("click", () => this.game.goToMenu());
    }

    if (this.levelButtons) {
      this.levelButtons.forEach((btn) => {
        btn.addEventListener("click", () => {
          const lvl = parseInt(btn.getAttribute("data-level"), 10) || 1;
          this.game.startLevel(lvl);
        });
      });
    }
  }

  showMenu() {
    this.menuScreen?.classList.remove("hidden");
    this.hud?.classList.add("hidden");
    this.instructionsBar?.classList.add("hidden");
    this.levelClearModal?.classList.add("hidden");
    this.gameOverModal?.classList.add("hidden");
  }

  showPlay() {
    this.menuScreen?.classList.add("hidden");
    this.hud?.classList.remove("hidden");
    this.instructionsBar?.classList.remove("hidden");
    this.levelClearModal?.classList.add("hidden");
    this.gameOverModal?.classList.add("hidden");
  }

  updateHUD(level, shots, color) {
    if (this.hudLevel) {
      this.hudLevel.textContent = `LEVEL ${level} / 5`;
      if (color) {
        this.hudLevel.style.color = `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
      }
    }
    if (this.hudShots) {
      this.hudShots.textContent = `Shots: ${shots}`;
    }
  }

  showLevelClear(shots) {
    if (this.clearShotsText) {
      this.clearShotsText.textContent = `Shots taken: ${shots}`;
    }
    this.levelClearModal?.classList.remove("hidden");
  }

  showGameOver() {
    this.gameOverModal?.classList.remove("hidden");
  }
}

// =============================================================================
// GAME ORCHESTRATOR CLASS
// =============================================================================
class Game {
  constructor() {
    this.state = "MENU"; // "MENU", "PLAY", "LEVEL_CLEAR", "GAME_OVER"
    this.currentLevel = 1;
    this.shots = 0;
    this.ball = new Ball(160, 480, 15);
    this.target = new Target();
    this.particles = [];
    this.ui = new UIManager(this);
    this.ui.showMenu();
  }

  startLevel(lvlNum) {
    this.currentLevel = constrain(lvlNum, 1, LEVELS.length);
    const lvlConfig = LEVELS[this.currentLevel - 1];
    this.target.init(lvlConfig);
    this.shots = 0;
    this.ball.reset();
    this.state = "PLAY";
    this.ui.updateHUD(this.currentLevel, this.shots, lvlConfig.color);
    this.ui.showPlay();
  }

  goToMenu() {
    this.state = "MENU";
    this.ball.reset();
    this.ui.showMenu();
  }

  nextLevel() {
    this.startLevel(this.currentLevel + 1);
  }

  createExplosion(x, y, color) {
    for (let i = 0; i < 30; i++) {
      this.particles.push(new Particle(x, y, color));
    }
  }

  update() {
    // Update active hit explosion particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      if (!this.particles[i].update()) {
        this.particles.splice(i, 1);
      }
    }

    if (this.state !== "PLAY") return;

    this.target.update();
    this.ball.update();

    // Check collision between player ball and floating target
    if (this.ball.checkCollision(this.target)) {
      Sound.playBeep(800, 0.25);
      this.createExplosion(this.target.x, this.target.y, this.target.color);

      if (this.currentLevel >= LEVELS.length) {
        this.state = "GAME_OVER";
        this.ui.showGameOver();
      } else {
        this.state = "LEVEL_CLEAR";
        this.ui.showLevelClear(this.shots);
      }
    }
  }

  draw() {
    background(22, 24, 34);

    // Arena boundary lines
    stroke(255, 255, 255, 25);
    line(330, 50, 330, height - 20);
    line(20, height - 20, width - 20, height - 20);

    // Canvas only renders game entities
    if (this.state === "PLAY" || this.state === "LEVEL_CLEAR" || this.state === "GAME_OVER") {
      this.ball.drawSlingshot();
      this.target.draw();
      this.ball.draw();
    }

    // Explosion particles
    for (const particle of this.particles) {
      particle.draw();
    }
  }

  handleMousePressed() {
    if (this.state === "PLAY") {
      this.ball.startAiming(mouseX, mouseY);
    }
  }

  handleMouseReleased() {
    if (this.state === "PLAY" && this.ball.isAiming) {
      const fired = this.ball.release(mouseX, mouseY);
      if (fired) {
        this.shots++;
        const lvlConfig = LEVELS[this.currentLevel - 1];
        this.ui.updateHUD(this.currentLevel, this.shots, lvlConfig.color);
      }
    }
  }

  handleKeyPressed(key) {
    if (key === 'r' || key === 'R' || key === ' ') {
      if (this.state === "PLAY") {
        this.ball.reset();
      }
    }
  }
}

// =============================================================================
// P5.JS LIFECYCLE HOOKS
// =============================================================================
let game;

function setup() {
  const canvas = createCanvas(900, 560);
  canvas.parent("canvas-container");
  game = new Game();
}

function draw() {
  game.update();
  game.draw();
}

function mousePressed() {
  game.handleMousePressed();
}

function mouseReleased() {
  game.handleMouseReleased();
}

function keyPressed() {
  game.handleKeyPressed(key);
}
