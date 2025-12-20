(() => {
  const section = document.querySelector('[data-section="hero"]');
  const canvas = section.querySelector('.cosmic-canvas');
  const overlay = section.querySelector('.cosmic-overlay');
  const title = section.querySelector('.cosmic-title');
  const subtitle = section.querySelector('.cosmic-subtitle');
  const whisper = section.querySelector('.cosmic-whisper');

  const ctx = canvas.getContext('2d');
  let width = canvas.width = window.innerWidth;
  let height = canvas.height = window.innerHeight;

  const quantumFoam = [];
  const darkMatterWeb = [];
  const stars = [];
  const nebulae = [];
  const blackHoles = [];
  const consciousnessParticles = [];
  const fillerStars = [];

  const lastMouse = { x: 0.5, y: 0.5 };

  class QuantumFluctuation {
    constructor() {
      this.x = Math.random() * width;
      this.y = Math.random() * height;
      this.phase = Math.random() * Math.PI * 2;
      this.frequency = 0.02 + Math.random() * 0.03;
      this.amplitude = 0.5 + Math.random() * 1.5;
      this.existence = Math.random();
    }
    update(mouse) {
      this.phase += this.frequency;
      this.existence = (Math.sin(this.phase) + 1) / 2;
      const dx = this.x - mouse.x * width;
      const dy = this.y - mouse.y * height;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 200) {
        this.existence = Math.min(1, this.existence + (200 - dist) / 400);
      }
    }
    draw(ctx) {
      const alpha = this.existence * 0.15;
      const size = this.amplitude * this.existence;
      ctx.beginPath();
      ctx.arc(this.x, this.y, size, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${260 + this.existence * 60}, 100%, 80%, ${alpha})`;
      ctx.fill();
    }
  }

  class DarkMatterFilament {
    constructor() {
      this.nodes = [];
      const nodeCount = 3 + Math.floor(Math.random() * 4);
      let x = Math.random() * width;
      let y = Math.random() * height;
      for (let i = 0; i < nodeCount; i++) {
        this.nodes.push({ x, y, vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.3 });
        x += (Math.random() - 0.5) * 300;
        y += (Math.random() - 0.5) * 300;
      }
      this.hue = 240 + Math.random() * 40;
      this.pulsePhase = Math.random() * Math.PI * 2;
    }
    update() {
      this.pulsePhase += 0.01;
      this.nodes.forEach(node => {
        node.x += node.vx;
        node.y += node.vy;
        if (node.x < 0 || node.x > width) node.vx *= -1;
        if (node.y < 0 || node.y > height) node.vy *= -1;
      });
    }
    draw(ctx) {
      if (this.nodes.length < 2) return;
      const pulse = (Math.sin(this.pulsePhase) + 1) / 2;
      ctx.beginPath();
      ctx.moveTo(this.nodes[0].x, this.nodes[0].y);
      for (let i = 1; i < this.nodes.length - 1; i++) {
        const xc = (this.nodes[i].x + this.nodes[i + 1].x) / 2;
        const yc = (this.nodes[i].y + this.nodes[i + 1].y) / 2;
        ctx.quadraticCurveTo(this.nodes[i].x, this.nodes[i].y, xc, yc);
      }
      ctx.strokeStyle = `hsla(${this.hue}, 60%, 40%, ${0.1 + pulse * 0.15})`;
      ctx.lineWidth = 1 + pulse * 2;
      ctx.stroke();
      ctx.strokeStyle = `hsla(${this.hue}, 80%, 60%, ${0.05 + pulse * 0.05})`;
      ctx.lineWidth = 4 + pulse * 4;
      ctx.stroke();
    }
  }

  class Star {
    constructor() {
      this.x = Math.random() * width;
      this.y = Math.random() * height;
      this.z = Math.random();
      this.baseSize = 0.5 + Math.random() * 2;
      this.twinklePhase = Math.random() * Math.PI * 2;
      this.twinkleSpeed = 0.02 + Math.random() * 0.04;
      this.hue = Math.random() > 0.7 ? (Math.random() > 0.5 ? 20 + Math.random() * 30 : 200 + Math.random() * 60) : 50 + Math.random() * 20;
      this.saturation = 20 + Math.random() * 60;
      this.displayX = this.x;
      this.displayY = this.y;
    }
    update(mouse) {
      this.twinklePhase += this.twinkleSpeed;
      const parallax = (1 - this.z) * 0.02;
      this.displayX = this.x + (mouse.x - 0.5) * width * parallax;
      this.displayY = this.y + (mouse.y - 0.5) * height * parallax;
    }
    draw(ctx) {
      const twinkle = (Math.sin(this.twinklePhase) + 1) / 2;
      const size = this.baseSize * (0.6 + twinkle * 0.4) * (0.5 + this.z * 0.5);
      const alpha = (0.4 + twinkle * 0.6) * (0.3 + this.z * 0.7);
      ctx.beginPath();
      ctx.arc(this.displayX, this.displayY, size, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${this.hue}, ${this.saturation}%, 95%, ${alpha})`;
      ctx.fill();
      const gradient = ctx.createRadialGradient(this.displayX, this.displayY, 0, this.displayX, this.displayY, size * 4);
      gradient.addColorStop(0, `hsla(${this.hue}, ${this.saturation}%, 80%, ${alpha * 0.5})`);
      gradient.addColorStop(1, 'transparent');
      ctx.beginPath();
      ctx.arc(this.displayX, this.displayY, size * 4, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();
    }
  }

  class Nebula {
    constructor() {
      this.x = Math.random() * width;
      this.y = Math.random() * height;
      this.radius = 100 + Math.random() * 200;
      this.hue = Math.random() * 360;
      this.rotation = Math.random() * Math.PI * 2;
      this.rotationSpeed = (Math.random() - 0.5) * 0.002;
      this.layers = [];
      for (let i = 0; i < 5; i++) {
        this.layers.push({ offset: Math.random() * 50 - 25, scale: 0.6 + Math.random() * 0.8, hueShift: Math.random() * 60 - 30, alpha: 0.02 + Math.random() * 0.03 });
      }
    }
    update(mouse) {
      this.rotation += this.rotationSpeed;
      const dx = mouse.x * width - this.x;
      const dy = mouse.y * height - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 400) {
        this.x += dx * 0.001;
        this.y += dy * 0.001;
      }
    }
    draw(ctx) {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.rotation);
      this.layers.forEach(layer => {
        const gradient = ctx.createRadialGradient(layer.offset, layer.offset, 0, 0, 0, this.radius * layer.scale);
        const h = (this.hue + layer.hueShift + 360) % 360;
        gradient.addColorStop(0, `hsla(${h}, 80%, 60%, ${layer.alpha * 2})`);
        gradient.addColorStop(0.3, `hsla(${h}, 70%, 50%, ${layer.alpha})`);
        gradient.addColorStop(0.7, `hsla(${(h + 30) % 360}, 60%, 40%, ${layer.alpha * 0.5})`);
        gradient.addColorStop(1, 'transparent');
        ctx.beginPath();
        ctx.ellipse(0, 0, this.radius * layer.scale, this.radius * layer.scale * 0.6, 0, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
      });
      ctx.restore();
    }
  }

  class BlackHole {
    constructor(x, y) {
      this.x = x || Math.random() * width;
      this.y = y || Math.random() * height;
      this.mass = 30 + Math.random() * 50;
      this.accretionParticles = [];
      for (let i = 0; i < 100; i++) {
        this.accretionParticles.push({ angle: Math.random() * Math.PI * 2, dist: this.mass * 1.5 + Math.random() * this.mass * 2, speed: 0.02 + Math.random() * 0.03, size: 1 + Math.random() * 2, hue: 30 + Math.random() * 30 });
      }
    }
    update() {
      this.accretionParticles.forEach(p => {
        p.angle += p.speed * (this.mass * 2 / p.dist);
        p.dist -= 0.1;
        if (p.dist < this.mass * 0.8) {
          p.dist = this.mass * 1.5 + Math.random() * this.mass * 2;
          p.angle = Math.random() * Math.PI * 2;
        }
      });
    }
    draw(ctx) {
      const lensGradient = ctx.createRadialGradient(this.x, this.y, this.mass * 0.5, this.x, this.y, this.mass * 3);
      lensGradient.addColorStop(0, 'rgba(0, 0, 0, 0.9)');
      lensGradient.addColorStop(0.3, 'rgba(20, 0, 40, 0.5)');
      lensGradient.addColorStop(0.7, 'rgba(40, 20, 80, 0.2)');
      lensGradient.addColorStop(1, 'transparent');
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.mass * 3, 0, Math.PI * 2);
      ctx.fillStyle = lensGradient;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.mass * 0.8, 0, Math.PI * 2);
      ctx.fillStyle = '#000000';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.mass, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255, 200, 100, 0.3)';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.save();
      ctx.translate(this.x, this.y);
      this.accretionParticles.forEach(p => {
        const x = Math.cos(p.angle) * p.dist;
        const y = Math.sin(p.angle) * p.dist * 0.3;
        const temp = 1 - (p.dist - this.mass * 0.8) / (this.mass * 2.5);
        const alpha = Math.min(1, temp * 0.8);
        ctx.beginPath();
        ctx.arc(x, y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue - temp * 30}, 100%, ${50 + temp * 40}%, ${alpha})`;
        ctx.fill();
      });
      ctx.restore();
    }
  }

  class ConsciousnessParticle {
    constructor(mouse) {
      this.x = mouse.x * width;
      this.y = mouse.y * height;
      this.vx = (Math.random() - 0.5) * 4;
      this.vy = (Math.random() - 0.5) * 4;
      this.life = 1;
      this.decay = 0.01 + Math.random() * 0.02;
      this.hue = 180 + Math.random() * 60;
      this.size = 2 + Math.random() * 4;
    }
    update() {
      this.x += this.vx;
      this.y += this.vy;
      this.vx *= 0.98;
      this.vy *= 0.98;
      this.life -= this.decay;
    }
    draw(ctx) {
      if (this.life <= 0) return;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size * this.life, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${this.hue}, 80%, 70%, ${this.life * 0.6})`;
      ctx.fill();
    }
  }

  const populateFillerStars = () => {
    fillerStars.length = 0;
    const count = Math.max(600, Math.floor((width * height) / 2500));
    for (let i = 0; i < count; i++) {
      fillerStars.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.random() * 1.2 + 0.2,
        alpha: 0.06 + Math.random() * 0.12,
        hue: 210 + Math.random() * 80,
      });
    }
  };

  for (let i = 0; i < 500; i++) quantumFoam.push(new QuantumFluctuation());
  for (let i = 0; i < 15; i++) darkMatterWeb.push(new DarkMatterFilament());
  for (let i = 0; i < 400; i++) stars.push(new Star());
  for (let i = 0; i < 6; i++) nebulae.push(new Nebula());
  blackHoles.push(new BlackHole(width * 0.7, height * 0.4));
  populateFillerStars();

  let awakened = false;
  setTimeout(() => {
    awakened = true;
    title.classList.add('is-awakened');
    subtitle.classList.add('is-awakened');
    whisper.classList.add('is-awakened');
  }, 2000);

  const animate = () => {
    const bgGradient = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, Math.max(width, height));
    bgGradient.addColorStop(0, '#080814');
    bgGradient.addColorStop(0.55, '#04040c');
    bgGradient.addColorStop(1, '#010109');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, width, height);

    fillerStars.forEach(fs => {
      ctx.beginPath();
      ctx.arc(fs.x, fs.y, fs.size, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${fs.hue}, 40%, 85%, ${fs.alpha})`;
      ctx.fill();
    });

    const mouse = { x: lastMouse.x, y: lastMouse.y };

    quantumFoam.forEach(qf => { qf.update(mouse); qf.draw(ctx); });
    darkMatterWeb.forEach(dm => { dm.update(); dm.draw(ctx); });
    nebulae.forEach(n => { n.update(mouse); n.draw(ctx); });
    stars.forEach(s => { s.update(mouse); s.draw(ctx); });
    blackHoles.forEach(bh => { bh.update(); bh.draw(ctx); });
    consciousnessParticles.forEach(cp => { cp.update(); cp.draw(ctx); });

    for (let i = consciousnessParticles.length - 1; i >= 0; i--) {
      if (consciousnessParticles[i].life <= 0) consciousnessParticles.splice(i, 1);
    }

    if (Math.abs(mouse.x - 0.5) > 0.01 || Math.abs(mouse.y - 0.5) > 0.01) {
      if (Math.random() > 0.7) consciousnessParticles.push(new ConsciousnessParticle(mouse));
    }

    overlay.style.background = `radial-gradient(ellipse at ${mouse.x * 100}% ${mouse.y * 100}%, transparent 0%, rgba(0,0,0,0.2) 50%, rgba(0,0,0,0.4) 100%)`;

    requestAnimationFrame(animate);
  };

  const handleMouseMove = (e) => {
    const rect = canvas.getBoundingClientRect();
    lastMouse.x = (e.clientX - rect.left) / width;
    lastMouse.y = (e.clientY - rect.top) / height;
  };

  const handleResize = () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
    populateFillerStars();
  };

  window.addEventListener('mousemove', handleMouseMove);
  window.addEventListener('resize', handleResize);

  animate();
})();
