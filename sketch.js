// =============================================================================
// ANGRY SEBASTIANS - Physics Destruction Game
// Built with p5.js and Matter.js
// =============================================================================

// Matter.js Module Aliases
const { Engine, World, Bodies, Body, Vector, Composite, Events } = Matter;

// =============================================================================
// PROCEDURAL AUDIO SYNTHESIZER (Web Audio API)
// =============================================================================
class SoundEngine {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.rawSebAttackBuffer = null;
    this.nesSebAttackBuffer = null;
    this.sebAttackArrayBuffer = null;

    // Looping background music
    this.bgm = new Audio("Sound%20effects/Dun%20Dun%20Dun.mp3");
    this.bgm.loop = true;
    this.bgm.volume = 0.35;
    this.bgmStarted = false;

    this.loadSebAttack();
  }

  startBgm() {
    if (this.muted || !this.bgm) return;
    if (this.bgm.paused) {
      this.bgm.play().then(() => {
        this.bgmStarted = true;
      }).catch((e) => {
        // Will retry on user gesture
      });
    }
  }

  async loadSebAttack() {
    try {
      const response = await fetch("Sound%20effects/SebAttack.mp3");
      if (!response.ok) {
        console.warn("Could not fetch SebAttack.mp3:", response.status);
        return;
      }
      this.sebAttackArrayBuffer = await response.arrayBuffer();
      if (this.ctx) {
        this.processNesAudio();
      }
    } catch (e) {
      console.warn("Error loading SebAttack:", e);
    }
  }

  init() {
    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.ctx = new AudioContext();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
    if (this.ctx && this.sebAttackArrayBuffer && !this.nesSebAttackBuffer) {
      this.processNesAudio();
    }
    this.startBgm();
  }

  processNesAudio() {
    if (!this.ctx || !this.sebAttackArrayBuffer || this.nesSebAttackBuffer) return;
    const copy = this.sebAttackArrayBuffer.slice(0);
    this.ctx.decodeAudioData(copy, (decoded) => {
      this.rawSebAttackBuffer = decoded;
      this.nesSebAttackBuffer = this.createNesAudioBuffer(decoded);
      console.log("NES Bad Quality SebAttack sound ready!");
    }, (err) => {
      console.warn("Error decoding SebAttack.mp3:", err);
    });
  }

  createNesAudioBuffer(raw) {
    const channels = raw.numberOfChannels;
    const sampleRate = raw.sampleRate;
    const length = raw.length;

    // NES DPCM emulation:
    // 1. Decimate / downsample to ~7200Hz (sample-and-hold step reduction)
    const targetRate = 7200;
    const step = Math.max(1, Math.round(sampleRate / targetRate));

    // 2. 4-bit quantization (16 discrete amplitude levels)
    const levels = 16;
    const halfLevels = levels / 2;

    const nes = this.ctx.createBuffer(channels, length, sampleRate);

    for (let c = 0; c < channels; c++) {
      const src = raw.getChannelData(c);
      const dst = nes.getChannelData(c);

      let heldVal = 0;
      for (let i = 0; i < length; i++) {
        if (i % step === 0) {
          // Slight saturation/overdrive typical of crunchy NES voice lines
          let s = src[i] * 1.45;
          s = Math.max(-1.0, Math.min(1.0, s));

          // Quantize to 4-bit discrete steps
          heldVal = Math.round(s * halfLevels) / halfLevels;
        }
        dst[i] = heldVal;
      }
    }
    return nes;
  }

  playSebAttack(playbackRate = 1.0) {
    if (this.muted) return;
    this.init();

    if (!this.ctx || !this.nesSebAttackBuffer) {
      return;
    }

    try {
      const source = this.ctx.createBufferSource();
      source.buffer = this.nesSebAttackBuffer;
      source.playbackRate.value = playbackRate;

      // Filter chain to replicate NES Ricoh 2A03 hardware & old CRT speaker
      const highpass = this.ctx.createBiquadFilter();
      highpass.type = "highpass";
      highpass.frequency.value = 140; // cut low-end sub-bass

      const lowpass = this.ctx.createBiquadFilter();
      lowpass.type = "lowpass";
      lowpass.frequency.value = 3300; // roll off treble
      lowpass.Q.value = 2.0; // resonant peak characteristic of small lo-fi speakers

      const gain = this.ctx.createGain();
      gain.gain.value = 0.65;

      source.connect(highpass);
      highpass.connect(lowpass);
      lowpass.connect(gain);
      gain.connect(this.ctx.destination);

      source.start(0);
    } catch (e) {
      console.warn("Failed to play SebAttack:", e);
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.muted) {
      if (this.bgm) this.bgm.pause();
    } else {
      if (this.bgm) this.bgm.play().catch((e) => {});
    }
    return !this.muted;
  }

  playSlingshotStretch(pitch = 1) {
    if (this.muted || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(140 * pitch, now);
      osc.frequency.linearRampToValueAtTime(220 * pitch, now + 0.12);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.12);
    } catch (e) {}
  }

  playSlingshotRelease() {
    if (this.muted || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      // Twang snap
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(80, now + 0.18);
      gain.gain.setValueAtTime(0.22, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.18);

      // Launch Whoosh
      const oscW = this.ctx.createOscillator();
      const gainW = this.ctx.createGain();
      oscW.type = "sine";
      oscW.frequency.setValueAtTime(260, now);
      oscW.frequency.exponentialRampToValueAtTime(600, now + 0.22);
      gainW.gain.setValueAtTime(0.18, now);
      gainW.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      oscW.connect(gainW);
      gainW.connect(this.ctx.destination);
      oscW.start(now);
      oscW.stop(now + 0.22);
    } catch (e) {}
  }

  playBoost() {
    if (this.muted || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(450, now);
      osc.frequency.exponentialRampToValueAtTime(950, now + 0.28);
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.28);
    } catch (e) {}
  }

  playWoodHit() {
    if (this.muted || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "square";
      osc.frequency.setValueAtTime(160, now);
      osc.frequency.exponentialRampToValueAtTime(70, now + 0.09);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.09);
    } catch (e) {}
  }

  playIceHit() {
    if (this.muted || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(900 + Math.random() * 400, now);
      osc.frequency.exponentialRampToValueAtTime(300, now + 0.12);
      gain.gain.setValueAtTime(0.16, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.12);
    } catch (e) {}
  }

  playStoneHit() {
    if (this.muted || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(110, now);
      osc.frequency.exponentialRampToValueAtTime(45, now + 0.14);
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.14);
    } catch (e) {}
  }

  playExplosion() {
    if (this.muted || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      // White noise buffer for detonation blast
      const bufferSize = this.ctx.sampleRate * 0.45;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(320, now);
      filter.frequency.exponentialRampToValueAtTime(50, now + 0.45);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      noise.start(now);

      // Sub-bass boom
      const osc = this.ctx.createOscillator();
      const oscGain = this.ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(120, now);
      osc.frequency.exponentialRampToValueAtTime(30, now + 0.4);
      oscGain.gain.setValueAtTime(0.35, now);
      oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      osc.connect(oscGain);
      oscGain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.4);
    } catch (e) {}
  }

  playTargetPop() {
    if (this.muted || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(380, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.12);
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.12);
    } catch (e) {}
  }

  playFanfare() {
    if (this.muted || !this.ctx) return;
    try {
      const notes = [261.63, 329.63, 392.00, 523.25]; // C - E - G - C
      notes.forEach((freq, index) => {
        const time = this.ctx.currentTime + index * 0.11;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, time);
        gain.gain.setValueAtTime(0.2, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.28);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(time);
        osc.stop(time + 0.28);
      });
    } catch (e) {}
  }

  playFail() {
    if (this.muted || !this.ctx) return;
    try {
      const notes = [349.23, 311.13, 277.18, 261.63];
      notes.forEach((freq, index) => {
        const time = this.ctx.currentTime + index * 0.16;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(freq, time);
        gain.gain.setValueAtTime(0.16, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.24);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(time);
        osc.stop(time + 0.24);
      });
    } catch (e) {}
  }
}

// =============================================================================
// PARTICLE & FLOATING TEXT SYSTEMS
// =============================================================================
class Particle {
  constructor(x, y, vx, vy, color, size, life = 45, type = "circle") {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.color = color;
    this.size = size;
    this.initialSize = size;
    this.life = life;
    this.maxLife = life;
    this.type = type;
    this.rot = random(TWO_PI);
    this.vRot = random(-0.2, 0.2);
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vy += 0.22; // gravity
    this.vx *= 0.96; // air drag
    this.rot += this.vRot;
    this.life--;
  }

  draw() {
    let alpha = map(this.life, 0, this.maxLife, 0, 255);
    push();
    translate(this.x, this.y);
    rotate(this.rot);
    noStroke();
    let col = color(this.color);
    col.setAlpha(alpha);
    fill(col);

    if (this.type === "rect") {
      rectMode(CENTER);
      rect(0, 0, this.size, this.size * 0.6);
    } else if (this.type === "star") {
      drawStar(0, 0, this.size * 0.4, this.size, 5);
    } else {
      circle(0, 0, this.size * (this.life / this.maxLife));
    }
    pop();
  }
}

function drawStar(x, y, radius1, radius2, npoints) {
  let angle = TWO_PI / npoints;
  let halfAngle = angle / 2.0;
  beginShape();
  for (let a = 0; a < TWO_PI; a += angle) {
    let sx = x + cos(a) * radius2;
    let sy = y + sin(a) * radius2;
    vertex(sx, sy);
    sx = x + cos(a + halfAngle) * radius1;
    sy = y + sin(a + halfAngle) * radius1;
    vertex(sx, sy);
  }
  endShape(CLOSE);
}

class FloatingText {
  constructor(text, x, y, col = "#ffd700", size = 20) {
    this.text = text;
    this.x = x;
    this.y = y;
    this.col = col;
    this.size = size;
    this.life = 50;
    this.maxLife = 50;
  }

  update() {
    this.y -= 1.2;
    this.life--;
  }

  draw() {
    let alpha = map(this.life, 0, this.maxLife, 0, 255);
    push();
    textAlign(CENTER, CENTER);
    textFont("Lilita One");
    textSize(this.size);
    stroke(0, alpha);
    strokeWeight(4);
    let c = color(this.col);
    c.setAlpha(alpha);
    fill(c);
    text(this.text, this.x, this.y);
    pop();
  }
}

// =============================================================================
// SEBASTIAN PROJECTILE (Player Bird)
// =============================================================================
class Sebastian {
  constructor(x, y, radius = 22) {
    this.x = x;
    this.y = y;
    this.r = radius;
    this.body = null;
    this.state = "IDLE"; // IDLE, SLING, FLYING, RESTING
    this.hasBoosted = false;
    this.trail = [];
    this.restTimer = 0;
  }

  // Bind to Matter.js world when launched
  launch(vx, vy) {
    this.body = Bodies.circle(this.x, this.y, this.r, {
      density: 0.0042,
      friction: 0.45,
      frictionAir: 0.008,
      restitution: 0.42,
      label: "sebastian"
    });
    this.body.gameRef = this;
    Body.setVelocity(this.body, { x: vx, y: vy });
    Body.setAngularVelocity(this.body, vx * 0.02);
    World.add(game.world, this.body);
    this.state = "FLYING";
    this.hasBoosted = false;
  }

  // Screech dash speed boost in flight
  boost() {
    if (this.state === "FLYING" && !this.hasBoosted && this.body) {
      this.hasBoosted = true;
      let vx = this.body.velocity.x;
      let vy = this.body.velocity.y;
      Body.setVelocity(this.body, {
        x: vx * 1.7 + (vx >= 0 ? 8 : -8),
        y: vy * 0.45 - 1.5
      });
      game.sound.playBoost();
      game.sound.playSebAttack(1.25);
      game.screenShake = 10;
      game.floatingTexts.push(new FloatingText("SCREECH BOOST!", this.body.position.x, this.body.position.y - 28, "#ff4d4d", 22));

      // Speed particles
      for (let i = 0; i < 20; i++) {
        game.particles.push(
          new Particle(
            this.body.position.x - vx * 1.5,
            this.body.position.y + random(-12, 12),
            random(-8, -2),
            random(-3, 3),
            "#feca1d",
            random(6, 12),
            30,
            "circle"
          )
        );
      }
    }
  }

  update() {
    if (this.state === "FLYING" && this.body) {
      this.x = this.body.position.x;
      this.y = this.body.position.y;

      // Add flight trail dot every few frames
      if (frameCount % 4 === 0) {
        this.trail.push({ x: this.x, y: this.y, size: 5 });
        if (this.trail.length > 50) this.trail.shift();
      }

      // Check if Sebastian came to rest or flew off arena
      let speed = this.body.speed;
      if (speed < 0.35 && this.y > 450) {
        this.restTimer++;
      } else {
        this.restTimer = 0;
      }

      if (this.restTimer > 65 || this.x > width + 100 || this.x < -80 || this.y > height + 80) {
        this.state = "RESTING";
        // Smoke puff on disappear
        for (let i = 0; i < 16; i++) {
          game.particles.push(
            new Particle(
              this.x + random(-10, 10),
              this.y + random(-10, 10),
              random(-2.5, 2.5),
              random(-3, 1),
              "#ffffff",
              random(8, 18),
              40,
              "circle"
            )
          );
        }
        // Save trail as ghost trail for next shot
        game.ghostTrail = [...this.trail];
        World.remove(game.world, this.body);
        this.body = null;
      }
    }
  }

  draw() {
    // Draw flight trail
    noStroke();
    fill(255, 255, 255, 140);
    for (let pt of this.trail) {
      circle(pt.x, pt.y, pt.size);
    }

    if (this.state === "RESTING") return;

    push();
    let drawX = this.body ? this.body.position.x : this.x;
    let drawY = this.body ? this.body.position.y : this.y;
    let angle = 0;

    if (this.body) {
      // Rotate facing velocity
      let vx = this.body.velocity.x;
      let vy = this.body.velocity.y;
      if (this.state === "FLYING" && abs(vx) > 0.5) {
        angle = atan2(vy, vx);
      } else {
        angle = this.body.angle;
      }
    }

    translate(drawX, drawY);
    rotate(angle);
    imageMode(CENTER);

    // Pick avatar: sebDefault when on slingshot or idle; sebAttack when flying!
    let img = (this.state === "FLYING") ? game.assets.sebAttackAvatar : game.assets.sebDefaultAvatar;

    // Render Sebastian head directly without any circle or border
    image(img, 0, 0, this.r * 2.3, this.r * 2.3);
    pop();
  }
}

// =============================================================================
// DESTRUCTIBLE BLOCK CLASS (Wood, Ice, Stone, Crate, TNT)
// =============================================================================
class Block {
  constructor(x, y, w, h, material = "wood") {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    this.material = material;
    this.exploded = false;
    this.dead = false;

    // Material characteristics (upgraded for realistic structural stability)
    let density = 0.0025;
    let friction = 0.85;
    let restitution = 0.08;

    if (material === "glass") {
      this.maxHp = 50;
      density = 0.0018;
      friction = 0.6;
      restitution = 0.12;
      this.points = 500;
    } else if (material === "wood") {
      this.maxHp = 95;
      density = 0.003;
      friction = 0.85;
      restitution = 0.08;
      this.points = 800;
    } else if (material === "stone") {
      this.maxHp = 220;
      density = 0.006;
      friction = 0.9;
      restitution = 0.04;
      this.points = 1200;
    } else if (material === "crate") {
      this.maxHp = 75;
      density = 0.0028;
      friction = 0.85;
      restitution = 0.1;
      this.points = 700;
    } else if (material === "tnt") {
      this.maxHp = 60;
      density = 0.003;
      friction = 0.85;
      restitution = 0.1;
      this.points = 2500;
    }

    this.hp = this.maxHp;

    this.body = Bodies.rectangle(x, y, w, h, {
      density: density,
      friction: friction,
      restitution: restitution,
      label: "block_" + material
    });
    this.body.gameRef = this;
    World.add(game.world, this.body);
  }

  takeDamage(amount) {
    if (this.dead || (game && game.settleGraceFrames > 0)) return;
    this.hp -= amount;

    // Sound effect based on material
    if (this.material === "glass") game.sound.playIceHit();
    else if (this.material === "wood" || this.material === "crate") game.sound.playWoodHit();
    else if (this.material === "stone") game.sound.playStoneHit();

    // Damage particles
    let count = Math.min(6, Math.floor(amount / 12) + 1);
    this.spawnHitParticles(count);

    if (this.material === "tnt" && (this.hp <= 0 || amount >= 25) && !this.exploded) {
      this.detonate();
    } else if (this.hp <= 0) {
      this.destroy();
    }
  }

  spawnHitParticles(count) {
    let col = "#c49a45";
    let pType = "rect";
    if (this.material === "glass") { col = "#cceeff"; pType = "rect"; }
    else if (this.material === "stone") { col = "#888899"; pType = "rect"; }
    else if (this.material === "tnt") { col = "#ff3b30"; pType = "circle"; }

    for (let i = 0; i < count; i++) {
      game.particles.push(
        new Particle(
          this.body.position.x + random(-this.w / 2, this.w / 2),
          this.body.position.y + random(-this.h / 2, this.h / 2),
          random(-3, 3),
          random(-4, 1),
          col,
          random(4, 9),
          25,
          pType
        )
      );
    }
  }

  detonate() {
    if (this.exploded || this.dead) return;
    this.exploded = true;
    this.dead = true;

    game.sound.playExplosion();
    game.screenShake = 18;
    game.addScore(this.points, this.body.position.x, this.body.position.y);
    game.floatingTexts.push(new FloatingText("KABOOM!", this.body.position.x, this.body.position.y - 35, "#ff3b30", 24));

    // Shockwave radial explosion on surrounding bodies
    let blastRadius = 190;
    let blastX = this.body.position.x;
    let blastY = this.body.position.y;

    const allBodies = Composite.allBodies(game.world);
    for (let b of allBodies) {
      if (b.isStatic || b === this.body) continue;
      let d = dist(blastX, blastY, b.position.x, b.position.y);
      if (d < blastRadius && d > 2) {
        let factor = (1 - d / blastRadius);
        let forceMag = factor * 0.14 * b.mass;
        let angle = atan2(b.position.y - blastY, b.position.x - blastX);
        Body.applyForce(b, b.position, {
          x: cos(angle) * forceMag,
          y: sin(angle) * forceMag - factor * 0.06 * b.mass // upward lift
        });

        if (b.gameRef && b.gameRef.takeDamage) {
          b.gameRef.takeDamage(factor * 160);
        }
      }
    }

    // Explosion fireball and smoke particles
    for (let i = 0; i < 35; i++) {
      let ang = random(TWO_PI);
      let spd = random(2, 9);
      let colors = ["#ffcc00", "#ff4400", "#ff1100", "#555555", "#ffffff"];
      let c = random(colors);
      game.particles.push(
        new Particle(
          blastX,
          blastY,
          cos(ang) * spd,
          sin(ang) * spd,
          c,
          random(8, 22),
          random(30, 55),
          "circle"
        )
      );
    }

    World.remove(game.world, this.body);
  }

  destroy() {
    if (this.dead) return;
    this.dead = true;

    game.addScore(this.points, this.body.position.x, this.body.position.y);

    // Destruction particle burst
    this.spawnHitParticles(14);

    World.remove(game.world, this.body);
  }

  draw() {
    if (this.dead) return;

    push();
    translate(this.body.position.x, this.body.position.y);
    rotate(this.body.angle);
    rectMode(CENTER);

    let damageRatio = 1 - (this.hp / this.maxHp);

    if (this.material === "wood") {
      // Beveled wood plank
      fill(186, 126, 68);
      stroke(110, 68, 30);
      strokeWeight(2);
      rect(0, 0, this.w, this.h, 3);

      // Wood grain lines
      stroke(145, 95, 48, 140);
      strokeWeight(1.5);
      line(-this.w / 2 + 4, -this.h / 4, this.w / 2 - 4, -this.h / 4);
      line(-this.w / 2 + 6, this.h / 4, this.w / 2 - 6, this.h / 4);

    } else if (this.material === "glass") {
      // Translucent ice
      fill(175, 230, 255, 190);
      stroke(240, 255, 255, 230);
      strokeWeight(2);
      rect(0, 0, this.w, this.h, 2);

      // Gloss reflection
      noStroke();
      fill(255, 255, 255, 120);
      rect(-this.w * 0.2, -this.h * 0.2, this.w * 0.4, this.h * 0.25);

    } else if (this.material === "stone") {
      // Sturdy chiseled stone
      fill(140, 145, 155);
      stroke(75, 80, 90);
      strokeWeight(2.5);
      rect(0, 0, this.w, this.h, 4);

      // Stone texture bevel
      stroke(180, 185, 195, 150);
      strokeWeight(1.5);
      line(-this.w / 2 + 3, -this.h / 2 + 3, this.w / 2 - 3, -this.h / 2 + 3);

    } else if (this.material === "crate") {
      // Wood Crate with X-brace
      fill(195, 142, 85);
      stroke(105, 68, 35);
      strokeWeight(2.5);
      rect(0, 0, this.w, this.h, 3);

      // X brace
      stroke(120, 80, 42);
      strokeWeight(2);
      line(-this.w / 2 + 4, -this.h / 2 + 4, this.w / 2 - 4, this.h / 2 - 4);
      line(-this.w / 2 + 4, this.h / 2 - 4, this.w / 2 - 4, -this.h / 2 + 4);

    } else if (this.material === "tnt") {
      // Red TNT Box
      fill(210, 45, 35);
      stroke(120, 20, 15);
      strokeWeight(2.5);
      rect(0, 0, this.w, this.h, 4);

      // Yellow warning banner
      fill(250, 204, 21);
      noStroke();
      rect(0, 0, this.w - 6, this.h * 0.45);

      // Bold TNT text
      fill(20, 20, 20);
      textAlign(CENTER, CENTER);
      textFont("Lilita One");
      textSize(Math.min(this.w, this.h) * 0.38);
      text("TNT", 0, 1);

      // Fuse sparking on top
      stroke(100, 70, 40);
      strokeWeight(2);
      line(0, -this.h / 2, 4, -this.h / 2 - 6);
      fill(255, 200, 0);
      noStroke();
      circle(4, -this.h / 2 - 6, 4 + sin(frameCount * 0.5) * 2);
    }

    // Render cracks if damaged
    if (damageRatio > 0.25) {
      stroke(40, 40, 40, map(damageRatio, 0.25, 1, 90, 240));
      strokeWeight(1.8);
      line(-this.w * 0.3, -this.h * 0.2, 0, 0);
      line(0, 0, this.w * 0.25, this.h * 0.3);
      if (damageRatio > 0.6) {
        line(0, 0, this.w * 0.3, -this.h * 0.25);
        line(-this.w * 0.2, this.h * 0.2, 0, 0);
      }
    }

    pop();
  }
}

// =============================================================================
// TARGET CLASS (The Enemies / Pigs)
// =============================================================================
class Target {
  constructor(x, y, radius = 20, isKing = false) {
    this.x = x;
    this.y = y;
    this.r = radius;
    this.isKing = isKing;
    this.maxHp = isKing ? 90 : 40;
    this.hp = this.maxHp;
    this.dead = false;

    this.body = Bodies.circle(x, y, radius, {
      density: 0.0035,
      friction: 0.55,
      restitution: 0.25,
      label: "target"
    });
    this.body.gameRef = this;
    World.add(game.world, this.body);
  }

  takeDamage(amount) {
    if (this.dead || (game && game.settleGraceFrames > 0)) return;
    this.hp -= amount;

    if (this.hp <= 0) {
      this.pop();
    }
  }

  pop() {
    if (this.dead) return;
    this.dead = true;

    game.sound.playTargetPop();
    let pts = this.isKing ? 10000 : 5000;
    game.addScore(pts, this.body.position.x, this.body.position.y);
    game.floatingTexts.push(new FloatingText("+" + pts, this.body.position.x, this.body.position.y - 28, "#69db7c", 22));

    // Pop particles (feathers, stars, smoke)
    for (let i = 0; i < 24; i++) {
      let ang = random(TWO_PI);
      let spd = random(2, 7);
      game.particles.push(
        new Particle(
          this.body.position.x,
          this.body.position.y,
          cos(ang) * spd,
          sin(ang) * spd,
          random(["#70e000", "#38b000", "#ffff3f", "#ffffff"]),
          random(6, 14),
          38,
          random(["circle", "star"])
        )
      );
    }

    World.remove(game.world, this.body);
    game.checkLevelClear();
  }

  draw() {
    if (this.dead) return;

    push();
    translate(this.body.position.x, this.body.position.y);
    rotate(this.body.angle);

    // Body base
    fill(120, 205, 45);
    stroke(70, 140, 25);
    strokeWeight(2.5);
    circle(0, 0, this.r * 2);

    // Big Pig Snout
    fill(145, 225, 60);
    stroke(70, 140, 25);
    strokeWeight(2);
    ellipse(0, this.r * 0.15, this.r * 1.1, this.r * 0.75);

    // Nostrils
    fill(45, 95, 18);
    noStroke();
    ellipse(-this.r * 0.22, this.r * 0.15, this.r * 0.22, this.r * 0.32);
    ellipse(this.r * 0.22, this.r * 0.15, this.r * 0.22, this.r * 0.32);

    // Eyes tracking Sebastian!
    let eyeOffsetX = 0;
    let eyeOffsetY = 0;
    if (game.activeSebastian) {
      let dx = game.activeSebastian.x - this.body.position.x;
      let dy = game.activeSebastian.y - this.body.position.y;
      let distToSeb = sqrt(dx * dx + dy * dy);
      if (distToSeb > 1) {
        eyeOffsetX = (dx / distToSeb) * (this.r * 0.18);
        eyeOffsetY = (dy / distToSeb) * (this.r * 0.18);
      }
    }

    // White eye sockets
    fill(255);
    stroke(60, 120, 20);
    strokeWeight(1.8);
    circle(-this.r * 0.38, -this.r * 0.28, this.r * 0.65);
    circle(this.r * 0.38, -this.r * 0.28, this.r * 0.65);

    // Pupils
    fill(25, 25, 25);
    noStroke();
    circle(-this.r * 0.38 + eyeOffsetX, -this.r * 0.28 + eyeOffsetY, this.r * 0.28);
    circle(this.r * 0.38 + eyeOffsetX, -this.r * 0.28 + eyeOffsetY, this.r * 0.28);

    // Eye highlights
    fill(255);
    circle(-this.r * 0.38 + eyeOffsetX - 1, -this.r * 0.28 + eyeOffsetY - 1, this.r * 0.1);
    circle(this.r * 0.38 + eyeOffsetX - 1, -this.r * 0.28 + eyeOffsetY - 1, this.r * 0.1);

    // Ears
    fill(100, 180, 35);
    stroke(60, 120, 20);
    strokeWeight(1.8);
    ellipse(-this.r * 0.85, -this.r * 0.65, this.r * 0.45, this.r * 0.65);
    ellipse(this.r * 0.85, -this.r * 0.65, this.r * 0.45, this.r * 0.65);

    // Golden Crown if King
    if (this.isKing) {
      push();
      translate(0, -this.r * 0.95);
      fill(255, 215, 0);
      stroke(180, 130, 0);
      strokeWeight(2);
      beginShape();
      vertex(-this.r * 0.65, 0);
      vertex(-this.r * 0.75, -this.r * 0.75);
      vertex(-this.r * 0.3, -this.r * 0.4);
      vertex(0, -this.r * 0.9);
      vertex(this.r * 0.3, -this.r * 0.4);
      vertex(this.r * 0.75, -this.r * 0.75);
      vertex(this.r * 0.65, 0);
      endShape(CLOSE);

      // Ruby in center
      fill(220, 20, 60);
      noStroke();
      circle(0, -this.r * 0.35, 5);
      pop();
    }

    pop();
  }
}

// =============================================================================
// SLINGSHOT CONTROLLER
// =============================================================================
class Slingshot {
  constructor(x = 145, y = 494) {
    this.x = x;
    this.y = y;
    this.scale = 0.60;

    // Piece 1 (Front: right branch + trunk, 37x199)
    this.frontW = 37 * this.scale;
    this.frontH = 199 * this.scale;
    this.frontX = this.x - 18 * this.scale;
    this.frontY = this.y - this.frontH;

    // Piece 2 (Back: left branch, 43x124)
    // Offset relative to Piece 1: dx = -31, dy = -10
    this.backW = 43 * this.scale;
    this.backH = 124 * this.scale;
    this.backX = this.frontX - 31 * this.scale;
    this.backY = this.frontY - 10 * this.scale;

    // Elastic band attachment points on leather collars
    // Left fork (on back branch, x=11, y=10)
    this.leftFork = {
      x: this.backX + 11 * this.scale,
      y: this.backY + 10 * this.scale
    };
    // Right fork (on front branch, x=23, y=12)
    this.rightFork = {
      x: this.frontX + 23 * this.scale,
      y: this.frontY + 12 * this.scale
    };

    // Rest pouch centered between the two forks
    this.restPouch = {
      x: (this.leftFork.x + this.rightFork.x) / 2,
      y: (this.leftFork.y + this.rightFork.y) / 2 + 5
    };
    this.pouch = { x: this.restPouch.x, y: this.restPouch.y };
    this.isDragging = false;
    this.maxPull = 88;
  }

  startAim(mx, my) {
    let d = dist(mx, my, this.restPouch.x, this.restPouch.y);
    if (d < 45 && game.activeSebastian && game.activeSebastian.state === "SLING") {
      this.isDragging = true;
      game.sound.init();
      return true;
    }
    return false;
  }

  updateAim(mx, my) {
    if (!this.isDragging) return;

    let dx = mx - this.restPouch.x;
    let dy = my - this.restPouch.y;
    let d = sqrt(dx * dx + dy * dy);

    if (d > this.maxPull) {
      dx = (dx / d) * this.maxPull;
      dy = (dy / d) * this.maxPull;
    }

    this.pouch.x = this.restPouch.x + dx;
    this.pouch.y = this.restPouch.y + dy;

    if (game.activeSebastian) {
      game.activeSebastian.x = this.pouch.x;
      game.activeSebastian.y = this.pouch.y;
    }

    if (frameCount % 6 === 0) {
      game.sound.playSlingshotStretch(map(d, 0, this.maxPull, 0.8, 1.4));
    }
  }

  release(mx, my) {
    if (!this.isDragging) return false;
    this.isDragging = false;

    let dx = this.pouch.x - this.restPouch.x;
    let dy = this.pouch.y - this.restPouch.y;
    let d = sqrt(dx * dx + dy * dy);

    if (d > 16 && game.activeSebastian) {
      let vx = -dx * 0.22;
      let vy = -dy * 0.22;
      game.settleGraceFrames = 0;
      game.shotsFired++;
      game.activeSebastian.launch(vx, vy);
      game.sound.playSlingshotRelease();
      game.sound.playSebAttack(1.0);

      this.pouch.x = this.restPouch.x;
      this.pouch.y = this.restPouch.y;
      return true;
    } else {
      // Snap back without launch
      this.pouch.x = this.restPouch.x;
      this.pouch.y = this.restPouch.y;
      if (game.activeSebastian) {
        game.activeSebastian.x = this.restPouch.x;
        game.activeSebastian.y = this.restPouch.y;
      }
      return false;
    }
  }

  drawBackFork() {
    // Back branch rendered behind rubber bands and Sebastian
    push();
    imageMode(CORNER);
    if (game.assets.slingBack) {
      image(game.assets.slingBack, this.backX, this.backY, this.backW, this.backH);
    } else {
      stroke(100, 50, 20);
      strokeWeight(6);
      line(this.x, this.y - 12, this.leftFork.x, this.leftFork.y);
    }
    pop();
  }

  drawBandsBack() {
    // Back rubber band (drawn behind Sebastian, connected to left fork)
    stroke(55, 22, 12);
    strokeWeight(5.5);
    line(this.leftFork.x, this.leftFork.y, this.pouch.x, this.pouch.y);
  }

  drawBandsFront() {
    // Front rubber band (drawn over Sebastian, connected to right fork)
    stroke(80, 32, 18);
    strokeWeight(5.0);
    line(this.rightFork.x, this.rightFork.y, this.pouch.x, this.pouch.y);

    // Leather pouch
    if (this.isDragging) {
      push();
      translate(this.pouch.x, this.pouch.y);
      let ang = atan2(this.pouch.y - this.restPouch.y, this.pouch.x - this.restPouch.x);
      rotate(ang + HALF_PI);
      fill(45, 18, 10);
      stroke(25, 8, 4);
      strokeWeight(1.5);
      rectMode(CENTER);
      rect(0, 0, 14, 26, 4);
      pop();
    }
  }

  drawFrontFork() {
    // Front branch & trunk rendered OVER front rubber band for true depth
    push();
    imageMode(CORNER);
    if (game.assets.slingFront) {
      image(game.assets.slingFront, this.frontX, this.frontY, this.frontW, this.frontH);
    } else {
      stroke(100, 50, 20);
      strokeWeight(8);
      line(this.x, this.y, this.x, this.y - 40);
      line(this.x, this.y - 40, this.rightFork.x, this.rightFork.y);
    }
    pop();
  }

  drawTrajectoryPreview() {
    if (!this.isDragging) return;

    let dx = this.pouch.x - this.restPouch.x;
    let dy = this.pouch.y - this.restPouch.y;
    let vx = -dx * 0.22;
    let vy = -dy * 0.22;

    let simX = this.pouch.x;
    let simY = this.pouch.y;
    let gravity = 1.0 * (1000 / 60) * 0.001 * 34;

    fill(255, 220, 0, 210);
    noStroke();

    for (let i = 0; i < 24; i++) {
      vy += gravity;
      simX += vx;
      simY += vy;
      let dotSize = map(i, 0, 24, 6.5, 2.5);
      circle(simX, simY, dotSize);
    }
  }

  drawFrame() {
    this.drawFrontFork();
  }
}

// =============================================================================
// MAIN GAME CONTROLLER & LEVEL BUILDER
// =============================================================================
class Game {
  constructor() {
    this.engine = Engine.create({ enableSleeping: false });
    this.world = this.engine.world;
    this.world.gravity.y = 1.0;

    this.sound = new SoundEngine();
    this.assets = {};
    this.slingshot = new Slingshot(145, 494);

    this.level = 1;
    this.score = 0;
    this.levelScore = 0;
    this.highScore = 0;
    this.state = "MENU"; // MENU, PLAY, LEVEL_CLEAR, LEVEL_FAIL, GAME_OVER

    this.sebQueue = [];
    this.activeSebastian = null;
    this.blocks = [];
    this.targets = [];
    this.particles = [];
    this.floatingTexts = [];
    this.ghostTrail = [];

    this.screenShake = 0;
    this.turnSettleTimer = 0;
    this.cloudOffset = 0;
    this.settleGraceFrames = 0;
    this.shotsFired = 0;

    // Dynamic Camera Tracking & Zoom
    this.camX = 450;
    this.camY = 280;
    this.camZoom = 1.0;
    this.targetCamX = 450;
    this.targetCamY = 280;
    this.targetCamZoom = 1.0;

    this.loadHighScores();
    this.initPhysicsBounds();
    this.initCollisionHandlers();
    this.initUI();
  }

  screenToWorld(sx, sy) {
    let wx = (sx - width / 2) / this.camZoom + this.camX;
    let wy = (sy - height / 2) / this.camZoom + this.camY;
    return { x: wx, y: wy };
  }

  initPhysicsBounds() {
    // Static ground flush with grass layer at y = 495
    const ground = Bodies.rectangle(width / 2, 525, width + 1600, 60, {
      isStatic: true,
      friction: 0.9,
      restitution: 0.05,
      label: "ground"
    });
    // Arena borders
    const leftWall = Bodies.rectangle(-160, height / 2, 60, height * 2, { isStatic: true });
    const rightWall = Bodies.rectangle(width + 360, height / 2, 60, height * 2, { isStatic: true });
    World.add(this.world, [ground, leftWall, rightWall]);
  }

  initCollisionHandlers() {
    Events.on(this.engine, "collisionStart", (event) => {
      // During initial settling, ignore collision damage so structures stand rock-solid
      if (this.settleGraceFrames > 0) return;

      const pairs = event.pairs;
      for (let pair of pairs) {
        const bodyA = pair.bodyA;
        const bodyB = pair.bodyB;

        // Relative impact velocity
        let vAx = bodyA.velocity.x;
        let vAy = bodyA.velocity.y;
        let vBx = bodyB.velocity.x;
        let vBy = bodyB.velocity.y;
        let relSpeed = dist(vAx, vAy, vBx, vBy);

        const isSeb = (bodyA.label === "sebastian" || bodyB.label === "sebastian");
        let threshold = isSeb ? 1.8 : 5.0;

        if (relSpeed > threshold) {
          let dmg = (relSpeed - (isSeb ? 1.4 : 4.2)) * (isSeb ? 18 : 12);

          // Damage to blocks
          if (bodyA.gameRef && bodyA.gameRef.takeDamage) {
            bodyA.gameRef.takeDamage(dmg);
          }
          if (bodyB.gameRef && bodyB.gameRef.takeDamage) {
            bodyB.gameRef.takeDamage(dmg);
          }

          // Screen shake on heavy impacts
          if (relSpeed > 7.0) {
            this.screenShake = Math.min(14, this.screenShake + relSpeed * 0.7);
          }
        }
      }
    });
  }

  initUI() {
    const bindClick = (id, fn) => {
      const el = document.getElementById(id);
      if (el) el.addEventListener("click", () => {
        this.sound.init();
        fn();
      });
    };

    bindClick("btn-play", () => this.startLevel(1));
    bindClick("btn-restart", () => this.startLevel(this.level));
    bindClick("btn-menu", () => this.showScreen("menu"));
    bindClick("btn-next-level", () => {
      if (this.level < 5) this.startLevel(this.level + 1);
      else this.showScreen("game_over");
    });
    bindClick("btn-clear-retry", () => this.startLevel(this.level));
    bindClick("btn-clear-menu", () => this.showScreen("menu"));
    bindClick("btn-fail-retry", () => this.startLevel(this.level));
    bindClick("btn-fail-menu", () => this.showScreen("menu"));
    bindClick("btn-play-again", () => this.startLevel(1));
    bindClick("btn-victory-menu", () => this.showScreen("menu"));

    // Audio / Music mute toggle
    bindClick("btn-sound", () => {
      let active = this.sound.toggleMute();
      const sfxBtn = document.getElementById("btn-sound");
      if (sfxBtn) sfxBtn.textContent = active ? "MUSIC & SFX: ON" : "MUSIC & SFX: OFF";
    });

    // Level selector buttons
    document.querySelectorAll(".btn-level-card").forEach((button) => {
      button.addEventListener("click", () => {
        this.sound.init();
        let lvl = Number(button.dataset.level);
        this.startLevel(lvl);
      });
    });

    this.updateMenuStars();
  }

  showScreen(name) {
    this.state = name.toUpperCase();
    const setHidden = (id, hide) => document.getElementById(id)?.classList.toggle("hidden", hide);

    setHidden("menu-screen", name !== "menu");
    setHidden("hud", name !== "play");
    setHidden("instructions-bar", name !== "play");
    setHidden("level-clear-modal", name !== "level_clear");
    setHidden("level-fail-modal", name !== "level_fail");
    setHidden("game-over-modal", name !== "game_over");

    if (name === "menu") {
      this.updateMenuStars();
    }
  }

  addScore(pts, x, y) {
    this.score += pts;
    this.levelScore += pts;
    if (this.score > this.highScore) {
      this.highScore = this.score;
      localStorage.setItem("angry_seb_highscore", this.highScore);
    }
    this.updateHUD();
  }

  updateHUD() {
    const lvlEl = document.getElementById("hud-level");
    if (lvlEl) lvlEl.textContent = `LEVEL ${this.level}`;
    const scoreEl = document.getElementById("hud-score");
    if (scoreEl) scoreEl.textContent = this.score.toLocaleString();
    const highEl = document.getElementById("hud-high");
    if (highEl) highEl.textContent = this.highScore.toLocaleString();
  }

  loadHighScores() {
    let saved = localStorage.getItem("angry_seb_highscore");
    if (saved) this.highScore = parseInt(saved) || 0;
  }

  updateMenuStars() {
    for (let l = 1; l <= 5; l++) {
      let stars = localStorage.getItem(`angry_seb_stars_${l}`) || 0;
      let el = document.getElementById(`menu-stars-${l}`);
      if (el) {
        el.textContent = "★".repeat(stars) + "☆".repeat(Math.max(0, 3 - stars));
      }
    }
  }

  clearWorldEntities() {
    for (let b of this.blocks) {
      if (b.body) World.remove(this.world, b.body);
    }
    for (let t of this.targets) {
      if (t.body) World.remove(this.world, t.body);
    }
    for (let s of this.sebQueue) {
      if (s.body) World.remove(this.world, s.body);
    }
    if (this.activeSebastian && this.activeSebastian.body) {
      World.remove(this.world, this.activeSebastian.body);
    }

    this.blocks = [];
    this.targets = [];
    this.sebQueue = [];
    this.activeSebastian = null;
    this.particles = [];
    this.floatingTexts = [];
    this.turnSettleTimer = 0;
  }

  startLevel(lvl) {
    this.clearWorldEntities();
    this.level = constrain(lvl, 1, 5);
    this.levelScore = 0;
    this.settleGraceFrames = 90;
    this.shotsFired = 0;
    this.camX = width / 2;
    this.camY = height / 2;
    this.camZoom = 1.0;
    this.targetCamX = width / 2;
    this.targetCamY = height / 2;
    this.targetCamZoom = 1.0;
    this.showScreen("play");
    this.updateHUD();

    // Prepare 3 Sebastians for the level
    this.sebQueue = [
      new Sebastian(55, 478),
      new Sebastian(95, 478)
    ];
    this.loadNextSebastian();

    // Build the Handcrafted Level Fortresses
    this.buildLevel(this.level);
  }

  loadNextSebastian() {
    if (this.sebQueue.length > 0 || !this.activeSebastian) {
      this.activeSebastian = new Sebastian(this.slingshot.restPouch.x, this.slingshot.restPouch.y);
      this.activeSebastian.state = "SLING";
      this.slingshot.pouch.x = this.slingshot.restPouch.x;
      this.slingshot.pouch.y = this.slingshot.restPouch.y;
    }
  }

  // ===========================================================================
  // 5 CRAFTED LEVELS - ROCK SOLID ON SPAWN, EXPLOSIVELY DESTRUCTIBLE ON IMPACT
  // ===========================================================================
  buildLevel(lvl) {
    const G_Y = 495; // Exact top of grass physics ground

    if (lvl === 1) {
      // LEVEL 1: "Rookie Roost" - Starter wooden shed
      // Two vertical wood pillars (18x90) flush on ground
      this.blocks.push(new Block(600, G_Y - 45, 18, 90, "wood"));
      this.blocks.push(new Block(710, G_Y - 45, 18, 90, "wood"));

      // Target inside shed
      this.targets.push(new Target(655, G_Y - 20, 20));

      // Roof plank resting flush on the two pillars (top of pillars is G_Y - 90 = 405)
      this.blocks.push(new Block(655, G_Y - 97, 140, 14, "wood"));

      // Upper crate (34x34) resting flush on roof (roof top is 391)
      this.blocks.push(new Block(655, G_Y - 121, 34, 34, "crate"));
      // Target 2 atop crate
      this.targets.push(new Target(655, G_Y - 156, 19));

      // Flanking crate on ground
      this.blocks.push(new Block(540, G_Y - 16, 32, 32, "crate"));

    } else if (lvl === 2) {
      // LEVEL 2: "Glass Menagerie" - Fragile crystalline ice towers & bridge
      // Left ice tower: two ice pillars (16x90)
      this.blocks.push(new Block(560, G_Y - 45, 16, 90, "glass"));
      this.blocks.push(new Block(620, G_Y - 45, 16, 90, "glass"));
      // Left ice roof slab (80x12) flush on pillars (top: 393)
      this.blocks.push(new Block(590, G_Y - 96, 80, 12, "glass"));
      this.targets.push(new Target(590, G_Y - 19, 19));

      // Right ice tower: two ice pillars (16x90)
      this.blocks.push(new Block(700, G_Y - 45, 16, 90, "glass"));
      this.blocks.push(new Block(760, G_Y - 45, 16, 90, "glass"));
      // Right ice roof slab (80x12) flush on pillars (top: 393)
      this.blocks.push(new Block(730, G_Y - 96, 80, 12, "glass"));
      this.targets.push(new Target(730, G_Y - 19, 19));

      // Connecting wooden bridge (180x14) resting across both towers
      this.blocks.push(new Block(660, G_Y - 109, 180, 14, "wood"));

      // Target 3 perched in middle of bridge
      this.targets.push(new Target(660, G_Y - 136, 20));
      // Flanking ice blocks on bridge
      this.blocks.push(new Block(625, G_Y - 129, 26, 26, "glass"));
      this.blocks.push(new Block(695, G_Y - 129, 26, 26, "glass"));

    } else if (lvl === 3) {
      // LEVEL 3: "The Powder Keg" - Demolition fort with protected TNT bays
      // 3 solid stone foundation blocks (36x36) flush on ground (top: 459)
      this.blocks.push(new Block(585, G_Y - 18, 36, 36, "stone"));
      this.blocks.push(new Block(655, G_Y - 18, 36, 36, "stone"));
      this.blocks.push(new Block(725, G_Y - 18, 36, 36, "stone"));

      // 2 TNT kegs (32x32) resting in foundation bays between the stone blocks
      this.blocks.push(new Block(620, G_Y - 16, 32, 32, "tnt"));
      this.blocks.push(new Block(690, G_Y - 16, 32, 32, "tnt"));

      // Heavy stone deck (175x16) resting flush on the 3 stone bases (top: 443)
      this.blocks.push(new Block(655, G_Y - 44, 175, 16, "stone"));

      // Targets on first stone deck
      this.targets.push(new Target(620, G_Y - 71, 19));
      this.targets.push(new Target(690, G_Y - 71, 19));

      // Middle support wood columns (16x80) (top: 363)
      this.blocks.push(new Block(620, G_Y - 92, 16, 80, "wood"));
      this.blocks.push(new Block(690, G_Y - 92, 16, 80, "wood"));

      // Upper wood deck (120x14) (top: 349)
      this.blocks.push(new Block(655, G_Y - 139, 120, 14, "wood"));

      // Top tier TNT keg (32x32) & lookout target
      this.blocks.push(new Block(655, G_Y - 162, 32, 32, "tnt"));
      this.targets.push(new Target(655, G_Y - 198, 20));

    } else if (lvl === 4) {
      // LEVEL 4: "Stone Stronghold" - Armored fortress
      // 3 heavy stone pillars (22x110) flush on ground (top: 385)
      this.blocks.push(new Block(560, G_Y - 55, 22, 110, "stone"));
      this.blocks.push(new Block(660, G_Y - 55, 22, 110, "stone"));
      this.blocks.push(new Block(760, G_Y - 55, 22, 110, "stone"));

      // Targets sheltered inside bunkers
      this.targets.push(new Target(610, G_Y - 20, 20));
      this.targets.push(new Target(710, G_Y - 20, 20));

      // Protective crates inside bunker
      this.blocks.push(new Block(610, G_Y - 55, 30, 30, "crate"));
      this.blocks.push(new Block(710, G_Y - 55, 30, 30, "crate"));

      // Heavy stone roof slabs (115x18) flush on pillars (top: 367)
      this.blocks.push(new Block(610, G_Y - 119, 115, 18, "stone"));
      this.blocks.push(new Block(710, G_Y - 119, 115, 18, "stone"));

      // Rooftop battlements (28x28 stone blocks)
      this.blocks.push(new Block(560, G_Y - 142, 28, 28, "stone"));
      this.blocks.push(new Block(660, G_Y - 142, 28, 28, "stone"));
      this.blocks.push(new Block(760, G_Y - 142, 28, 28, "stone"));

      // Center watchtower with third target
      this.blocks.push(new Block(660, G_Y - 186, 16, 60, "wood"));
      this.targets.push(new Target(660, G_Y - 227, 21));

    } else if (lvl === 5) {
      // LEVEL 5: "Sebastian's Nemesis Citadel" - Grand palace with King Pig!
      // Foundation: 4 solid stone blocks (36x36) flush on ground (top: 459)
      this.blocks.push(new Block(535, G_Y - 18, 36, 36, "stone"));
      this.blocks.push(new Block(615, G_Y - 18, 36, 36, "stone"));
      this.blocks.push(new Block(695, G_Y - 18, 36, 36, "stone"));
      this.blocks.push(new Block(775, G_Y - 18, 36, 36, "stone"));

      // Cellar dungeon TNT kegs (32x32) nested safely in the bays
      this.blocks.push(new Block(575, G_Y - 16, 32, 32, "tnt"));
      this.blocks.push(new Block(735, G_Y - 16, 32, 32, "tnt"));

      // Heavy foundation stone slab (280x16) resting on the 4 stone blocks (top: 443)
      this.blocks.push(new Block(655, G_Y - 44, 280, 16, "stone"));

      // Left wing: glass tower with Target 1 (top: 353)
      this.blocks.push(new Block(535, G_Y - 97, 14, 90, "glass"));
      this.blocks.push(new Block(575, G_Y - 97, 14, 90, "glass"));
      this.blocks.push(new Block(555, G_Y - 148, 65, 12, "glass"));
      this.targets.push(new Target(555, G_Y - 65, 19));

      // Right wing: wood tower with Target 2 (top: 353)
      this.blocks.push(new Block(735, G_Y - 97, 16, 90, "wood"));
      this.blocks.push(new Block(775, G_Y - 97, 16, 90, "wood"));
      this.blocks.push(new Block(755, G_Y - 148, 65, 12, "wood"));
      this.targets.push(new Target(755, G_Y - 65, 19));

      // Central Grand Throne Room
      this.blocks.push(new Block(625, G_Y - 97, 20, 90, "stone"));
      this.blocks.push(new Block(685, G_Y - 97, 20, 90, "stone"));

      // King Pig on throne!
      this.targets.push(new Target(655, G_Y - 70, 24, true)); // KING!

      // Grand Throne Roof Slab (top: 337)
      this.blocks.push(new Block(655, G_Y - 150, 140, 16, "stone"));

      // Top Parapet Tower with King's Guard
      this.blocks.push(new Block(635, G_Y - 185, 16, 55, "wood"));
      this.blocks.push(new Block(675, G_Y - 185, 16, 55, "wood"));
      this.blocks.push(new Block(655, G_Y - 218, 75, 12, "wood"));
      this.targets.push(new Target(655, G_Y - 240, 19));
    }
  }

  checkLevelClear() {
    if (this.state !== "PLAY" || this.shotsFired === 0) return;
    let alive = this.targets.filter(t => !t.dead).length;
    if (alive === 0) {
      setTimeout(() => this.triggerLevelClear(), 1100);
    }
  }

  triggerLevelClear() {
    if (this.state !== "PLAY") return;

    this.sound.playFanfare();

    // Bonus for unused Sebastians
    let remainingSebs = this.sebQueue.length + (this.activeSebastian && this.activeSebastian.state === "SLING" ? 1 : 0);
    let bonus = remainingSebs * 10000;
    this.score += bonus;
    if (this.score > this.highScore) {
      this.highScore = this.score;
      localStorage.setItem("angry_seb_highscore", this.highScore);
    }
    this.updateHUD();

    // Calculate stars (1, 2, or 3)
    let stars = 1;
    if (remainingSebs >= 2) stars = 3;
    else if (remainingSebs >= 1 || this.levelScore > 12000) stars = 2;

    let savedStars = parseInt(localStorage.getItem(`angry_seb_stars_${this.level}`) || "0");
    if (stars > savedStars) {
      localStorage.setItem(`angry_seb_stars_${this.level}`, stars);
    }

    // Populate modal
    const starsEl = document.getElementById("clear-stars");
    if (starsEl) starsEl.textContent = "★".repeat(stars) + "☆".repeat(3 - stars);
    const destEl = document.getElementById("clear-dest-score");
    if (destEl) destEl.textContent = this.levelScore.toLocaleString();
    const bonusEl = document.getElementById("clear-bonus-score");
    if (bonusEl) bonusEl.textContent = bonus.toLocaleString();
    const totalEl = document.getElementById("clear-total-score");
    if (totalEl) totalEl.textContent = this.score.toLocaleString();

    if (this.level >= 5) {
      const victoryStars = document.getElementById("victory-stars");
      if (victoryStars) victoryStars.textContent = "★★★★★";
      const victoryTotal = document.getElementById("victory-total-score");
      if (victoryTotal) victoryTotal.textContent = this.score.toLocaleString();
      this.showScreen("game_over");
    } else {
      this.showScreen("level_clear");
    }
  }

  triggerLevelFail() {
    if (this.state !== "PLAY") return;
    this.sound.playFail();
    this.showScreen("level_fail");
  }

  update() {
    if (this.state !== "PLAY") return;

    if (this.settleGraceFrames > 0) {
      this.settleGraceFrames--;
    }

    // Fixed step physics update
    Engine.update(this.engine, 1000 / 60);

    // Update active Sebastian
    if (this.activeSebastian) {
      this.activeSebastian.update();

      // If active Sebastian is resting, advance turn
      if (this.activeSebastian.state === "RESTING") {
        this.turnSettleTimer++;
        if (this.turnSettleTimer > 40) {
          this.turnSettleTimer = 0;
          this.activeSebastian = null;

          let aliveTargets = this.targets.filter(t => !t.dead).length;
          if (aliveTargets > 0) {
            if (this.sebQueue.length > 0) {
              this.activeSebastian = this.sebQueue.shift();
              this.activeSebastian.x = this.slingshot.restPouch.x;
              this.activeSebastian.y = this.slingshot.restPouch.y;
              this.activeSebastian.state = "SLING";
              this.slingshot.pouch.x = this.slingshot.restPouch.x;
              this.slingshot.pouch.y = this.slingshot.restPouch.y;
            } else {
              // Wait for physics to settle then fail
              setTimeout(() => {
                let stillAlive = this.targets.filter(t => !t.dead).length;
                if (stillAlive > 0 && this.state === "PLAY") {
                  this.triggerLevelFail();
                }
              }, 1800);
            }
          }
        }
      }
    }

    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      this.particles[i].update();
      if (this.particles[i].life <= 0) {
        this.particles.splice(i, 1);
      }
    }

    // Update floating score texts
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      this.floatingTexts[i].update();
      if (this.floatingTexts[i].life <= 0) {
        this.floatingTexts.splice(i, 1);
      }
    }

    // Shake dampening
    if (this.screenShake > 0) {
      this.screenShake *= 0.88;
      if (this.screenShake < 0.2) this.screenShake = 0;
    }

    // Drift clouds
    this.cloudOffset += 0.25;

    // Dynamic Camera Tracking & Zoom Follow
    if (this.activeSebastian && this.activeSebastian.state === "FLYING" && this.activeSebastian.body) {
      let sebPos = this.activeSebastian.body.position;
      let sebVel = this.activeSebastian.body.velocity;

      // Close-up cinematic zoom
      this.targetCamZoom = 1.35;

      // Lead ahead along velocity vector so player sees upcoming targets and impacts
      let leadX = sebPos.x + constrain(sebVel.x * 6.5, -40, 140);
      let leadY = sebPos.y + constrain(sebVel.y * 2.5, -70, 50);

      // Half-viewports at target zoom
      let halfW = (width / 2) / this.targetCamZoom;
      let halfH = (height / 2) / this.targetCamZoom;

      // Keep camera within comfortable world bounds
      this.targetCamX = constrain(leadX, halfW - 20, width + 200 - halfW);
      this.targetCamY = constrain(leadY, halfH - 60, height - halfH);
    } else {
      // Return smoothly to full overview when on slingshot or between shots
      this.targetCamZoom = 1.0;
      this.targetCamX = width / 2;
      this.targetCamY = height / 2;
    }

    // Smooth camera interpolation
    let posLerp = 0.085;
    let zoomLerp = 0.055;
    this.camX = lerp(this.camX, this.targetCamX, posLerp);
    this.camY = lerp(this.camY, this.targetCamY, posLerp);
    this.camZoom = lerp(this.camZoom, this.targetCamZoom, zoomLerp);
  }

  draw() {
    // 1. Draw static screen-space sky backdrop and clouds
    this.drawSky();

    // 2. Apply Camera Zoom and Follow in world space
    push();
    translate(width / 2, height / 2);
    scale(this.camZoom);
    translate(-this.camX, -this.camY);

    // Screen shake offset (applied in world coordinates)
    if (this.screenShake > 0) {
      translate(random(-this.screenShake, this.screenShake), random(-this.screenShake, this.screenShake));
    }

    // 3. Draw continuous landscape (hills, ground, grass, mound)
    this.drawLandscape();

    // 4. Draw ghost trajectory trail from previous shot
    if (this.ghostTrail.length > 0) {
      noStroke();
      fill(255, 255, 255, 55);
      for (let pt of this.ghostTrail) {
        circle(pt.x, pt.y, 4);
      }
    }

    // 5. Draw slingshot back branch (BEHIND back band)
    this.slingshot.drawBackFork();

    // 6. Draw slingshot back band
    this.slingshot.drawBandsBack();

    // 7. Draw queued Sebastians waiting their turn
    for (let i = 0; i < this.sebQueue.length; i++) {
      let s = this.sebQueue[i];
      let waitX = 55 + i * 36;
      let waitY = 485;
      push();
      translate(waitX, waitY);
      imageMode(CENTER);
      image(this.assets.sebDefaultAvatar, 0, 0, 36, 36);
      pop();
    }

    // 8. Draw active Sebastian if seated or aiming
    if (this.activeSebastian && (this.activeSebastian.state === "SLING" || this.activeSebastian.state === "IDLE")) {
      this.activeSebastian.draw();
    }

    // 9. Draw slingshot front band
    this.slingshot.drawBandsFront();

    // 10. Draw slingshot front branch & trunk (IN FRONT of front band)
    this.slingshot.drawFrontFork();

    // 11. Trajectory prediction dots when pulling
    this.slingshot.drawTrajectoryPreview();

    // 12. Draw active Sebastian when airborne
    if (this.activeSebastian && this.activeSebastian.state === "FLYING") {
      this.activeSebastian.draw();
    }

    // 13. Draw blocks
    for (let b of this.blocks) {
      b.draw();
    }

    // 14. Draw targets (enemies)
    for (let t of this.targets) {
      t.draw();
    }

    // 15. Draw particles & debris
    for (let p of this.particles) {
      p.draw();
    }

    // 16. Draw floating score popups
    for (let ft of this.floatingTexts) {
      ft.draw();
    }

    pop();
  }

  drawSky() {
    // Gradient Sky across full screen
    for (let y = 0; y < height; y += 4) {
      let inter = map(y, 0, height, 0, 1);
      let c = lerpColor(color(70, 175, 255), color(170, 230, 255), inter);
      stroke(c);
      strokeWeight(4);
      line(0, y, width, y);
    }

    // Fluffy Cartoon Clouds with subtle parallax
    noStroke();
    fill(255, 255, 255, 180);
    let parallaxX = (this.camX - width / 2) * 0.18;
    this.drawFluffyCloud((120 + this.cloudOffset - parallaxX) % (width + 300) - 100, 90, 70);
    this.drawFluffyCloud((450 + this.cloudOffset * 0.7 - parallaxX * 0.7) % (width + 300) - 100, 130, 85);
    this.drawFluffyCloud((780 + this.cloudOffset * 0.5 - parallaxX * 0.5) % (width + 300) - 100, 70, 60);
  }

  drawLandscape() {
    // Distant Rolling Green Hills with wide world span
    fill(95, 185, 95);
    noStroke();
    ellipse(-80, 530, 850, 190);
    ellipse(380, 520, 850, 180);
    ellipse(850, 530, 800, 170);
    ellipse(1300, 535, 800, 180);

    fill(72, 160, 72);
    ellipse(150, 540, 850, 150);
    ellipse(620, 540, 900, 150);
    ellipse(1080, 545, 850, 150);

    // Continuous Ground Platform extending past camera bounds
    fill(139, 85, 45); // Soil
    stroke(85, 45, 20);
    strokeWeight(2);
    rect(-600, height - 60, width + 1800, 140);

    // Top lush grass layer
    fill(85, 185, 45);
    stroke(55, 135, 25);
    strokeWeight(2.5);
    rect(-600, height - 65, width + 1800, 14, 4);

    // Grass tufts
    noStroke();
    fill(105, 205, 55);
    for (let x = -400; x < width + 800; x += 45) {
      triangle(x, height - 65, x + 6, height - 73, x + 12, height - 65);
    }

    // Slingshot Mound
    fill(115, 75, 38);
    stroke(70, 40, 18);
    strokeWeight(2);
    ellipse(145, height - 52, 130, 36);
    fill(75, 165, 38);
    stroke(45, 115, 20);
    ellipse(145, height - 56, 115, 24);
  }

  drawFluffyCloud(cx, cy, r) {
    circle(cx, cy, r);
    circle(cx - r * 0.45, cy + r * 0.1, r * 0.75);
    circle(cx + r * 0.45, cy + r * 0.1, r * 0.75);
    circle(cx - r * 0.25, cy - r * 0.25, r * 0.7);
    circle(cx + r * 0.25, cy - r * 0.25, r * 0.7);
  }
}

// =============================================================================
// P5.JS LIFECYCLE HOOKS
// =============================================================================
let game;
let rawSlingFront, rawSlingBack, rawSlingshot2, rawSebDefault, rawSebAttack, rawSpriteSheet;

function preload() {
  rawSlingFront = loadImage("assets/sling_front.png");
  rawSlingBack = loadImage("assets/sling_back.png");
  rawSlingshot2 = loadImage("assets/slingshot2.png");
  rawSebDefault = loadImage("assets/sebDefault.png");
  rawSebAttack = loadImage("assets/sebAttack.png");
  rawSpriteSheet = loadImage("assets/objectsSpriteSheet.jpeg");
}

function setup() {
  createCanvas(900, 560).parent("canvas-container");

  game = new Game();

  // Assign upgraded slingshot sprites and natural transparent avatars
  game.assets.slingFront = rawSlingFront;
  game.assets.slingBack = rawSlingBack;
  game.assets.slingshot2 = rawSlingshot2;
  game.assets.sebDefaultAvatar = rawSebDefault;
  game.assets.sebAttackAvatar = rawSebAttack;
}

function draw() {
  game.update();
  game.draw();
}

function mousePressed() {
  game.sound.init();

  if (game.state === "PLAY") {
    // If Sebastian is airborne, mouse click triggers Sebastian Screech Boost!
    if (game.activeSebastian && game.activeSebastian.state === "FLYING") {
      game.activeSebastian.boost();
      return;
    }

    // Otherwise test if dragging slingshot in world coordinates
    let w = game.screenToWorld(mouseX, mouseY);
    game.slingshot.startAim(w.x, w.y);
  }
}

function mouseDragged() {
  if (game.state === "PLAY") {
    let w = game.screenToWorld(mouseX, mouseY);
    game.slingshot.updateAim(w.x, w.y);
  }
}

function mouseReleased() {
  if (game.state === "PLAY") {
    let w = game.screenToWorld(mouseX, mouseY);
    game.slingshot.release(w.x, w.y);
  }
}

function keyPressed() {
  game.sound.init();

  if (key === "r" || key === "R") {
    if (game.state === "PLAY") game.startLevel(game.level);
  } else if (key === " " || keyCode === 32) {
    // Spacebar triggers Screech Boost if flying!
    if (game.state === "PLAY" && game.activeSebastian && game.activeSebastian.state === "FLYING") {
      game.activeSebastian.boost();
    }
  }
}

// Global user interaction listener to start BGM and audio context seamlessly
["pointerdown", "touchstart", "keydown"].forEach((event) => {
  window.addEventListener(event, () => {
    if (typeof game !== "undefined" && game && game.sound) {
      game.sound.init();
    }
  });
});
