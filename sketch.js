// =============================================================================
// ORB HUNTER - GAME CONFIGURATION
// =============================================================================
const LEVELS = [
  { size: 36, speed: 2.0, color: [0, 220, 255] },  // Level 1: Large & slow
  { size: 30, speed: 3.2, color: [50, 255, 100] }, // Level 2
  { size: 24, speed: 4.5, color: [255, 180, 0] },  // Level 3
  { size: 19, speed: 6.0, color: [255, 60, 150] }, // Level 4
  { size: 15, speed: 7.5, color: [180, 70, 255] }  // Level 5: Small & fast
];

// =============================================================================
// BALL CLASS (Player & Slingshot)
// =============================================================================
class Ball {
  constructor(startX = 160, startY = 480, radius = 15) {
    this.startX = startX;
    this.startY = startY;
    this.r = radius;
    this.reset();
  }

  // Put ball back on the slingshot pedestal
  reset() {
    this.x = this.startX;
    this.y = this.startY;
    this.vx = 0;
    this.vy = 0;
    this.isFlying = false;
    this.isAiming = false;
  }

  // Start aiming when clicking near the slingshot
  startAim(mx, my) {
    if (!this.isFlying && dist(mx, my, this.startX, this.startY) < 40) {
      this.isAiming = true;
    }
  }

  // Launch the ball when mouse is released
  release(mx, my) {
    if (!this.isAiming) return false;
    this.isAiming = false;

    // Only fire if pulled back far enough
    if (dist(mx, my, this.startX, this.startY) > 15) {
      this.vx = (this.startX - mx) * 0.14;
      this.vy = (this.startY - my) * 0.14;
      this.isFlying = true;
      return true;
    }
    return false;
  }

  // Physics: gravity, velocity, wall bounces, and floor friction
  update() {
    if (!this.isFlying) return;

    this.vy += 0.38; // Gravity
    this.x += this.vx;
    this.y += this.vy;

    // Bounce off left/right arena walls
    if (this.x < this.r || this.x > width - this.r) {
      this.vx *= -0.75;
      this.x = constrain(this.x, this.r, width - this.r);
    }
    // Bounce off ceiling
    if (this.y < this.r + 50) {
      this.vy *= -0.75;
      this.y = this.r + 50;
    }
    // Bounce off floor with friction
    if (this.y > height - this.r - 20) {
      this.y = height - this.r - 20;
      this.vy *= -0.65;
      this.vx *= 0.94;
    }
    // Reset when the ball comes to a stop
    if (abs(this.vx) < 0.2 && abs(this.vy) < 0.5 && this.y >= height - this.r - 25) {
      this.reset();
    }
  }

  // Render slingshot base, aiming line, trajectory preview, and the ball
  draw() {
    // Slingshot base
    stroke(0, 200, 255, 120);
    line(this.startX - 12, this.startY + 10, this.startX - 12, this.startY - 5);
    line(this.startX + 12, this.startY + 10, this.startX + 12, this.startY - 5);

    // Aiming line and trajectory dot preview
    if (this.isAiming) {
      stroke(0, 220, 255, 180);
      strokeWeight(2);
      line(this.startX, this.startY, mouseX, mouseY);

      let pullX = (this.startX - mouseX) * 0.14;
      let pullY = (this.startY - mouseY) * 0.14;
      let dotX = this.startX;
      let dotY = this.startY;

      fill(255, 220, 0);
      noStroke();
      for (let i = 0; i < 16; i++) {
        pullY += 0.38;
        dotX += pullX;
        dotY += pullY;
        circle(dotX, dotY, 4);
      }
    }

    // Player ball
    fill(0, 220, 255);
    stroke(255);
    strokeWeight(2);
    let drawX = this.isAiming ? mouseX : this.x;
    let drawY = this.isAiming ? mouseY : this.y;
    circle(drawX, drawY, this.r * 2);
  }
}

// =============================================================================
// TARGET CLASS (Floating Moving Orb)
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

  // Spawn target with level settings and a random flight angle
  init(level) {
    this.r = level.size;
    this.color = level.color;
    this.x = random(450, width - 60);
    this.y = random(80, height - 80);

    let angle = random(TWO_PI);
    this.vx = cos(angle) * level.speed;
    this.vy = sin(angle) * level.speed;
  }

  // Move target and bounce inside the right half of the arena
  update() {
    this.x += this.vx;
    this.y += this.vy;

    if (this.x < 350 || this.x > width - this.r) this.vx *= -1;
    if (this.y < this.r + 50 || this.y > height - this.r - 20) this.vy *= -1;
  }

  draw() {
    fill(this.color);
    stroke(255, 180);
    strokeWeight(2);
    circle(this.x, this.y, this.r * 2);
  }
}

// =============================================================================
// GAME CLASS (Manager & UI Controller)
// =============================================================================
class Game {
  constructor() {
    this.ball = new Ball();
    this.target = new Target();
    this.level = 1;
    this.shots = 0;
    this.state = "MENU";

    this.initUI();
    this.showScreen("menu");
  }

  // Hook up click listeners to HTML buttons
  initUI() {
    const bindClick = (id, action) => document.getElementById(id)?.addEventListener("click", action);

    bindClick("btn-play", () => this.startLevel(1));
    bindClick("btn-reset", () => this.ball.reset());
    bindClick("btn-next-level", () => this.startLevel(this.level + 1));
    bindClick("btn-play-again", () => this.startLevel(1));

    // Return to menu buttons
    ["btn-menu", "btn-clear-menu", "btn-over-menu"].forEach((id) => {
      bindClick(id, () => this.showScreen("menu"));
    });

    // Level select buttons (LVL 1 - 5)
    document.querySelectorAll(".btn-level").forEach((button) => {
      button.addEventListener("click", () => {
        let selectedLevel = Number(button.dataset.level);
        this.startLevel(selectedLevel);
      });
    });
  }

  // Show/hide HTML screens and modals
  showScreen(name) {
    this.state = name.toUpperCase();
    const setHidden = (id, hide) => document.getElementById(id)?.classList.toggle("hidden", hide);

    setHidden("menu-screen", name !== "menu");
    setHidden("hud", name !== "play");
    setHidden("instructions-bar", name !== "play");
    setHidden("level-clear-modal", name !== "level_clear");
    setHidden("game-over-modal", name !== "game_over");
  }

  // Start or restart a specific level
  startLevel(lvl) {
    this.level = constrain(lvl, 1, LEVELS.length);
    this.shots = 0;
    this.target.init(LEVELS[this.level - 1]);
    this.ball.reset();

    this.updateHUD();
    this.showScreen("play");
  }

  // Update HTML text for level badge and shots count
  updateHUD() {
    const levelBadge = document.getElementById("hud-level");
    if (levelBadge) {
      levelBadge.textContent = `LEVEL ${this.level} / 5`;
      levelBadge.style.color = `rgb(${LEVELS[this.level - 1].color})`;
    }

    const shotsText = document.getElementById("hud-shots");
    if (shotsText) {
      shotsText.textContent = `Shots: ${this.shots}`;
    }
  }

  // Main game update loop
  update() {
    if (this.state !== "PLAY") return;

    this.target.update();
    this.ball.update();

    // Check if the ball hit the target orb
    let hitDistance = this.ball.r + this.target.r;
    if (this.ball.isFlying && dist(this.ball.x, this.ball.y, this.target.x, this.target.y) < hitDistance) {
      if (this.level >= LEVELS.length) {
        this.showScreen("game_over");
      } else {
        const shotsEl = document.getElementById("clear-shots-text");
        if (shotsEl) shotsEl.textContent = `Shots taken: ${this.shots}`;
        this.showScreen("level_clear");
      }
    }
  }

  // Render canvas background, arena line, target, and ball
  draw() {
    background(22, 24, 34);

    // Arena boundary divider lines
    stroke(255, 25);
    line(330, 50, 330, height - 20);
    line(20, height - 20, width - 20, height - 20);

    // Draw ball and target if game is active
    if (this.state !== "MENU") {
      this.target.draw();
      this.ball.draw();
    }
  }
}

// =============================================================================
// P5.JS LIFECYCLE HOOKS
// =============================================================================
let game;

function setup() {
  createCanvas(900, 560).parent("canvas-container");
  game = new Game();
}

function draw() {
  game.update();
  game.draw();
}

function mousePressed() {
  if (game.state === "PLAY") {
    game.ball.startAim(mouseX, mouseY);
  }
}

function mouseReleased() {
  if (game.state === "PLAY" && game.ball.release(mouseX, mouseY)) {
    game.shots++;
    game.updateHUD();
  }
}

function keyPressed() {
  if (game.state === "PLAY" && (key === "r" || key === "R" || key === " ")) {
    game.ball.reset();
  }
}
