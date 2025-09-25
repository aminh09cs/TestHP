(function(){
  // Starry background canvas
  const starCanvas = document.getElementById('bgStars');
  if(starCanvas){
    const ctx = starCanvas.getContext('2d');
    const DPR = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    let w = 0, h = 0, stars = [];
    function resize(){
      w = window.innerWidth; h = window.innerHeight;
      starCanvas.width = w * DPR; starCanvas.height = h * DPR; starCanvas.style.width = w + 'px'; starCanvas.style.height = h + 'px';
      ctx.setTransform(DPR,0,0,DPR,0,0);
      makeStars();
    }
    function makeStars(){
      const count = Math.round((w*h)/9000); // density
      stars = new Array(count).fill(0).map(() => ({
        x: Math.random()*w,
        y: Math.random()*h,
        r: Math.random()*1.4 + 0.3,
        a: Math.random()*0.6 + 0.2,
        t: Math.random()*Math.PI*2,
        s: 0.008 + Math.random()*0.018,
      }));
    }
    function tick(){
      ctx.clearRect(0,0,w,h);
      for(const s of stars){
        s.t += s.s;
        const alpha = s.a * (0.6 + 0.4*Math.sin(s.t));
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI*2);
        ctx.fillStyle = 'rgba(255, 182, 206,'+alpha.toFixed(3)+')';
        ctx.fill();
      }
      requestAnimationFrame(tick);
    }
    window.addEventListener('resize', resize);
    resize();
    tick();
  }
  const lights = document.getElementById('lights');
  const banner = document.getElementById('banner');
  const balloons = document.getElementById('balloons');
  const cake = document.getElementById('cake');
  const message = document.getElementById('message');
  const bgm = document.getElementById('bgm');

  const btnAction = document.getElementById('btnAction');
  const btnReplay = document.getElementById('btnReplay');
  const confettiCanvas = document.getElementById('confetti');
  let stopConfettiFn = null;
  let confettiActive = false;
  let confettiTimerId = 0;
  let confettiRepeat = false;

  const steps = [
    { label: '1. Phát nhạc', run: () => { playMusicWithFallback(); } },
    { label: '2. Thả banner', run: () => { banner.classList.add('show'); } },
    { label: '3. Thả bóng bay', run: () => { spawnBalloons(); balloons.classList.add('fly'); } },
    { label: '4. Mang bánh', run: () => { cake.classList.add('show'); setTimeout(() => cake.classList.add('lit'), 500); } },
    { label: '5. Thổi nến', run: () => { cake.classList.add('blow'); setTimeout(() => cake.classList.remove('lit'), 50); } },
    { label: '6. Lời chúc', run: () => { message.classList.add('show'); triggerConfetti(); hideButtonsAfterFinal(); } },
  ];
  let currentStepIndex = 0;

  function updateActionLabel(){
    btnAction.textContent = steps[currentStepIndex].label;
  }

  function safePlay(audio){
    if(!audio) return;
    audio.currentTime = 0;
    const playPromise = audio.play();
    if(playPromise && typeof playPromise.catch === 'function'){
      playPromise.catch(() => {/* autoplay blocked, ignore */});
    }
  }

  function playMusicWithFallback(){
    if(!bgm){ return; }
    bgm.loop = true;
    bgm.volume = 1;
    const p = bgm.play();
    if(p && typeof p.catch === 'function'){
      p.catch(() => synthFallback());
    }
    // If audio element fires error, also fallback
    bgm.addEventListener('error', synthFallback, { once:true });
    // If no duration after a short wait, likely missing file
    setTimeout(() => {
      if(isNaN(bgm.duration) || bgm.duration === 0){ synthFallback(); }
    }, 800);
  }

  function synthFallback(){
    try{
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioCtx();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.type = 'sine';
      o.frequency.value = 523.25; // C5
      g.gain.setValueAtTime(0, ctx.currentTime);
      g.gain.linearRampToValueAtTime(0.05, ctx.currentTime + 0.05);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 2.0);
      o.start();
      o.stop(ctx.currentTime + 2.1);
    }catch(_){ /* ignore */ }
  }

  function reset(){
    lights.classList.remove('on');
    banner.classList.remove('show');
    balloons.classList.remove('fly');
    // remove generated balloons
    balloons.querySelectorAll('.balloon').forEach(el => el.remove());
    cake.classList.remove('show','lit','blow');
    message.classList.remove('show');
    if(bgm){ bgm.pause(); bgm.currentTime = 0; }
    // lights always on by default now
    lights.classList.add('on');
    // ensure confetti stops when resetting
    if(typeof stopConfettiFn === 'function'){ try{ stopConfettiFn(); }catch(_){} stopConfettiFn = null; }
  }

  function spawnBalloons(){
    const colors = ['red','yellow','green','blue','pink','orange'];
    const count = 24;
    const fragment = document.createDocumentFragment();
    for(let i=0;i<count;i++){
      const el = document.createElement('div');
      el.className = 'balloon ' + colors[i % colors.length];
      // random horizontal offset and size/animation duration
      const x = (-45 + Math.random()*90) + 'vw';
      const scale = 0.8 + Math.random()*0.8;
      const dur = (7 + Math.random()*6) + 's';
      const delay = (Math.random()*2) + 's';
      el.style.setProperty('--x', x);
      el.style.setProperty('--s', scale.toString());
      el.style.setProperty('--dur', dur);
      el.style.animationDelay = delay;
      el.addEventListener('animationend', () => el.remove());
      fragment.appendChild(el);
    }
    balloons.appendChild(fragment);
  }

  btnAction.addEventListener('click', () => {
    const step = steps[currentStepIndex];
    step.run();
    currentStepIndex = Math.min(currentStepIndex + 1, steps.length - 1);
    updateActionLabel();
  });

  btnReplay.addEventListener('click', () => {
    reset();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    currentStepIndex = 0;
    updateActionLabel();
  });

  reset();
  updateActionLabel();

  function hideButtonsAfterFinal(){
    // hide the action button when the final message is shown
    btnAction.classList.add('hidden');
  }

  // Confetti renderer
  function triggerConfetti(){
    if(!confettiCanvas) return;
    if(confettiActive) return; // prevent multiple concurrent runs
    // if previously running, stop
    if(typeof stopConfettiFn === 'function'){ try{ stopConfettiFn(); }catch(_){} }
    confettiRepeat = true; // enable continuous cycles

    const ctx = confettiCanvas.getContext('2d');
    const DPR = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    let w = 0, h = 0, particles = [], running = false, raf = 0;
    function resize(){
      w = window.innerWidth; h = window.innerHeight;
      confettiCanvas.width = w * DPR; confettiCanvas.height = h * DPR; confettiCanvas.style.width = w + 'px'; confettiCanvas.style.height = h + 'px';
      ctx.setTransform(DPR,0,0,DPR,0,0);
    }
    function make(){
      const count = Math.round(w/14);
      const colors = ['#ff6fa5','#9bd8ff','#ffd59e','#7be3b0','#ffb3d9'];
      particles = new Array(count).fill(0).map(() => ({
        x: Math.random()*w,
        y: -20 - Math.random()*h*0.5,
        vx: -1 + Math.random()*2,
        vy: 2 + Math.random()*3.5,
        size: 6 + Math.random()*6,
        rot: Math.random()*Math.PI*2,
        vr: (-0.1 + Math.random()*0.2),
        color: colors[Math.floor(Math.random()*colors.length)],
        shape: Math.random()<0.5 ? 'rect' : 'circle',
        alive: true
      }));
    }
    function draw(now, endAt){
      ctx.clearRect(0,0,w,h);
      for(const p of particles){
        if(!p.alive) continue;
        p.x += p.vx; p.y += p.vy; p.rot += p.vr; p.vy *= 0.995;
        if(p.y > h + 30){
          if(now < endAt){
            // recycle during cycle to keep density
            p.y = -20; p.x = Math.random()*w; p.vy = 2 + Math.random()*3.5; p.vx = -1 + Math.random()*2; p.rot = Math.random()*Math.PI*2; p.vr = (-0.1 + Math.random()*0.2);
          } else {
            p.alive = false;
            continue;
          }
        }
        ctx.save();
        ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        if(p.shape==='rect') ctx.fillRect(-p.size/2, -p.size/2, p.size, p.size*0.6);
        else { ctx.beginPath(); ctx.arc(0, 0, p.size*0.35, 0, Math.PI*2); ctx.fill(); }
        ctx.restore();
      }
    }
    function runCycle(){
      if(!confettiRepeat) return; // stopped externally
      const start = performance.now();
      const duration = 3200; // ms
      const endAt = start + duration;
      running = true; confettiActive = true; confettiCanvas.style.display = 'block';
      resize(); make();
      function loop(now){
        if(!running) return;
        const t = now || performance.now();
        if(t >= endAt){ stopCycle(); return; }
        draw(t, endAt);
        raf = requestAnimationFrame(loop);
      }
      function stopCycle(){
        running = false;
        if(raf){ cancelAnimationFrame(raf); raf = 0; }
        ctx.clearRect(0,0,w,h);
        particles = [];
        confettiCanvas.style.display = 'none';
        confettiActive = false;
        // schedule next cycle if repeat still enabled
        if(confettiRepeat){
          confettiTimerId = setTimeout(runCycle, 200); // small pause between cycles
        }
      }
      raf = requestAnimationFrame(loop);
      // hard stop fallback
      confettiTimerId = setTimeout(stopCycle, duration + 150);
    }
    stopConfettiFn = function stopAll(){
      confettiRepeat = false;
      running = false;
      if(raf){ cancelAnimationFrame(raf); raf = 0; }
      if(confettiTimerId){ clearTimeout(confettiTimerId); confettiTimerId = 0; }
      ctx.clearRect(0,0,w,h);
      particles = [];
      confettiCanvas.style.display = 'none';
      confettiActive = false;
    };
    // start first cycle
    runCycle();
  }
})();


