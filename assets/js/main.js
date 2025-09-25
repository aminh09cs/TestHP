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
  const btnMusic = document.getElementById('btnMusic');
  const confettiCanvas = document.getElementById('confetti');
  let stopConfettiFn = null;
  let confettiActive = false;
  let confettiTimerId = 0;
  let confettiRepeat = false;

  const steps = [
    { label: 'Happy', run: () => { banner.classList.add('show'); } },
    { label: 'Balloons', run: () => { spawnBalloons(); balloons.classList.add('fly'); } },
    { label: 'Bring cake', run: () => { cake.classList.add('show'); setTimeout(() => cake.classList.add('lit'), 500); } },
    { label: 'Blow candle', run: () => { cake.classList.add('blow'); setTimeout(() => cake.classList.remove('lit'), 50); } },
    { label: 'Happy Birthday', run: () => { message.classList.add('show'); triggerConfetti(); hideButtonsAfterFinal(); } },
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
    bgm.volume = 0.7;
    bgm.muted = false;
    
    // Try to play immediately
    const playPromise = bgm.play();
    if(playPromise && typeof playPromise.catch === 'function'){
      playPromise.catch(() => {
        console.log('Audio autoplay blocked, trying fallback');
        synthFallback();
      });
    }
    
    // If audio element fires error, also fallback
    bgm.addEventListener('error', () => {
      console.log('Audio error, using fallback');
      synthFallback();
    }, { once:true });
    
    // If no duration after a short wait, likely missing file
    setTimeout(() => {
      if(isNaN(bgm.duration) || bgm.duration === 0){ 
        console.log('Audio file not loaded, using fallback');
        synthFallback(); 
      }
    }, 1000);
  }

  function synthFallback(){
    try{
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioCtx();
      
      // Create a simple melody loop
      function playNote(frequency, startTime, duration) {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.connect(g);
        g.connect(ctx.destination);
        o.type = 'sine';
        o.frequency.value = frequency;
        g.gain.setValueAtTime(0, startTime);
        g.gain.linearRampToValueAtTime(0.1, startTime + 0.1);
        g.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
        o.start(startTime);
        o.stop(startTime + duration);
      }
      
      // Play a simple birthday melody
      const now = ctx.currentTime;
      playNote(523.25, now, 0.5);      // C5
      playNote(523.25, now + 0.5, 0.5); // C5
      playNote(587.33, now + 1.0, 0.5); // D5
      playNote(523.25, now + 1.5, 0.5); // C5
      playNote(698.46, now + 2.0, 0.5); // F5
      playNote(659.25, now + 2.5, 1.0); // E5
      
      // Loop the melody
      setTimeout(() => synthFallback(), 4000);
    }catch(e){ 
      console.log('Fallback audio failed:', e);
    }
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

  btnMusic.addEventListener('click', () => {
    playMusicWithFallback();
    btnMusic.style.display = 'none';
  });

  btnAction.addEventListener('click', () => {
    const step = steps[currentStepIndex];
    step.run();
    currentStepIndex = Math.min(currentStepIndex + 1, steps.length - 1);
    updateActionLabel();
  });


  reset();
  updateActionLabel();
  
  // Try to auto play music, but show button if blocked
  setTimeout(() => {
    const playPromise = bgm.play();
    if(playPromise && typeof playPromise.catch === 'function'){
      playPromise.catch(() => {
        console.log('Autoplay blocked, showing music button');
        btnMusic.style.display = 'inline-block';
      });
    }
  }, 100);

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

  // 3D Cake with Three.js
  function create3DCake() {
    const container = document.getElementById('cake3d');
    if (!container || !window.THREE) return;

    // Get responsive size
    const containerRect = container.getBoundingClientRect();
    const size = Math.min(450, containerRect.width, window.innerWidth * 0.9);

    // Scene setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    
    renderer.setSize(size, size);
    renderer.setClearColor(0x000000, 0);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 10, 5);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    // Cake group
    const cakeGroup = new THREE.Group();

    // Plate - bigger to match cake
    const plateGeometry = new THREE.CylinderGeometry(4.8, 4.8, 0.3, 32);
    const plateMaterial = new THREE.MeshPhongMaterial({ 
      color: 0xffffff,
      shininess: 100
    });
    const plate = new THREE.Mesh(plateGeometry, plateMaterial);
    plate.position.y = -1.8;
    plate.receiveShadow = true;
    cakeGroup.add(plate);

    // Cake layers - repositioned higher
    const layers = [
      { radius: 4, height: 1.6, color: 0xffb3e6, y: -1.3 }, // Pink bottom
      { radius: 3.2, height: 1.4, color: 0x81d4fa, y: 0.1 },  // Blue middle  
      { radius: 2.5, height: 1.2, color: 0xa5d6a7, y: 1.3 }  // Green top
    ];

    layers.forEach((layer, index) => {
      const geometry = new THREE.CylinderGeometry(layer.radius, layer.radius, layer.height, 32);
      const material = new THREE.MeshPhongMaterial({ 
        color: layer.color,
        shininess: 50
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.y = layer.y;
      mesh.castShadow = true;
      cakeGroup.add(mesh);

      // Add white cream top border for all layers
      const topBorderGeometry = new THREE.CylinderGeometry(layer.radius + 0.08, layer.radius + 0.08, 0.12, 32);
      const topBorderMaterial = new THREE.MeshPhongMaterial({ 
        color: 0xffffff,
        shininess: 100
      });
      const topBorder = new THREE.Mesh(topBorderGeometry, topBorderMaterial);
      topBorder.position.y = layer.y + (layer.height/2 + 0.06);
      topBorder.castShadow = true;
      cakeGroup.add(topBorder);
    });

    // Add "Vân Trang" text on the middle layer (blue layer)
    const loader = new THREE.FontLoader();
    // Create text using built-in font since we can't load external fonts easily
    const textMaterial = new THREE.MeshPhongMaterial({ 
      color: 0xffffff,
      shininess: 80
    });

    // Create text using basic shapes (since FontLoader needs external font files)
    // We'll create simple text using box geometries arranged as letters
    const createTextOnCake = () => {
      const textGroup = new THREE.Group();
      
      // Simple text representation using small cubes
      const letterHeight = 0.15;
      const letterWidth = 0.08;
      const letterDepth = 0.05;
      const spacing = 0.2;
      
      // Create "VAN TRANG" in a simple block style
      const letterGeometry = new THREE.BoxGeometry(letterWidth, letterHeight, letterDepth);
      
      // V
      const v1 = new THREE.Mesh(letterGeometry, textMaterial);
      v1.position.set(-1.2, 0, 0);
      v1.rotation.z = 0.3;
      textGroup.add(v1);
      
      const v2 = new THREE.Mesh(letterGeometry, textMaterial);
      v2.position.set(-1.0, 0, 0);
      v2.rotation.z = -0.3;
      textGroup.add(v2);
      
      // A
      const a1 = new THREE.Mesh(letterGeometry, textMaterial);
      a1.position.set(-0.7, 0, 0);
      a1.rotation.z = 0.2;
      textGroup.add(a1);
      
      const a2 = new THREE.Mesh(letterGeometry, textMaterial);
      a2.position.set(-0.5, 0, 0);
      a2.rotation.z = -0.2;
      textGroup.add(a2);
      
      const a3 = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.05, letterDepth), textMaterial);
      a3.position.set(-0.6, -0.03, 0);
      textGroup.add(a3);
      
      // N
      const n1 = new THREE.Mesh(letterGeometry, textMaterial);
      n1.position.set(-0.2, 0, 0);
      textGroup.add(n1);
      
      const n2 = new THREE.Mesh(letterGeometry, textMaterial);
      n2.position.set(0.0, 0, 0);
      textGroup.add(n2);
      
      const n3 = new THREE.Mesh(new THREE.BoxGeometry(0.05, letterHeight, letterDepth), textMaterial);
      n3.position.set(-0.1, 0, 0);
      n3.rotation.z = 0.5;
      textGroup.add(n3);
      
      // T
      const t1 = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.05, letterDepth), textMaterial);
      t1.position.set(0.5, 0.05, 0);
      textGroup.add(t1);
      
      const t2 = new THREE.Mesh(letterGeometry, textMaterial);
      t2.position.set(0.5, -0.03, 0);
      textGroup.add(t2);
      
      // R
      const r1 = new THREE.Mesh(letterGeometry, textMaterial);
      r1.position.set(0.8, 0, 0);
      textGroup.add(r1);
      
      const r2 = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.05, letterDepth), textMaterial);
      r2.position.set(0.9, 0.05, 0);
      textGroup.add(r2);
      
      const r3 = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.05, letterDepth), textMaterial);
      r3.position.set(0.9, 0, 0);
      textGroup.add(r3);
      
      const r4 = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.08, letterDepth), textMaterial);
      r4.position.set(0.95, -0.05, 0);
      r4.rotation.z = 0.3;
      textGroup.add(r4);
      
      // A
      const a4 = new THREE.Mesh(letterGeometry, textMaterial);
      a4.position.set(1.2, 0, 0);
      a4.rotation.z = 0.2;
      textGroup.add(a4);
      
      const a5 = new THREE.Mesh(letterGeometry, textMaterial);
      a5.position.set(1.4, 0, 0);
      a5.rotation.z = -0.2;
      textGroup.add(a5);
      
      const a6 = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.05, letterDepth), textMaterial);
      a6.position.set(1.3, -0.03, 0);
      textGroup.add(a6);
      
      // N
      const n4 = new THREE.Mesh(letterGeometry, textMaterial);
      n4.position.set(1.7, 0, 0);
      textGroup.add(n4);
      
      const n5 = new THREE.Mesh(letterGeometry, textMaterial);
      n5.position.set(1.9, 0, 0);
      textGroup.add(n5);
      
      const n6 = new THREE.Mesh(new THREE.BoxGeometry(0.05, letterHeight, letterDepth), textMaterial);
      n6.position.set(1.8, 0, 0);
      n6.rotation.z = 0.5;
      textGroup.add(n6);
      
      // G
      const g1 = new THREE.Mesh(letterGeometry, textMaterial);
      g1.position.set(2.2, 0, 0);
      textGroup.add(g1);
      
      const g2 = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.05, letterDepth), textMaterial);
      g2.position.set(2.3, 0.05, 0);
      textGroup.add(g2);
      
      const g3 = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.05, letterDepth), textMaterial);
      g3.position.set(2.3, -0.05, 0);
      textGroup.add(g3);
      
      const g4 = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, letterDepth), textMaterial);
      g4.position.set(2.35, 0, 0);
      textGroup.add(g4);
      
      textGroup.position.y = 0.8; // Position on middle layer (blue layer)
      textGroup.scale.set(0.3, 0.3, 0.3); // Scale down to fit on cake
      
      return textGroup;
    };

    const textOnCake = createTextOnCake();
    cakeGroup.add(textOnCake);

    // Candle - repositioned higher
    const candleGeometry = new THREE.CylinderGeometry(0.12, 0.12, 1.5, 16);
    const candleMaterial = new THREE.MeshPhongMaterial({ 
      color: 0xff6b9d,
      shininess: 30
    });
    const candle = new THREE.Mesh(candleGeometry, candleMaterial);
    candle.position.y = 2.45;
    candle.castShadow = true;
    cakeGroup.add(candle);

    // Flame (will be shown/hidden) - repositioned higher
    const flameGeometry = new THREE.SphereGeometry(0.18, 8, 8);
    const flameMaterial = new THREE.MeshBasicMaterial({ 
      color: 0xffeb3b,
      transparent: true,
      opacity: 0
    });
    const flame = new THREE.Mesh(flameGeometry, flameMaterial);
    flame.position.y = 3.4;
    flame.scale.y = 1.5;
    cakeGroup.add(flame);

    // Add decorative elements - bigger and more
    const decorations = [];
    for(let i = 0; i < 16; i++) {
      const angle = (i / 16) * Math.PI * 2;
      const radius = 3.2;
      
      const decorGeometry = new THREE.SphereGeometry(0.12, 8, 8);
      const decorMaterial = new THREE.MeshPhongMaterial({ 
        color: i % 3 === 0 ? 0xff69b4 : i % 3 === 1 ? 0xffd700 : 0x00ff88
      });
      const decor = new THREE.Mesh(decorGeometry, decorMaterial);
      decor.position.x = Math.cos(angle) * radius;
      decor.position.z = Math.sin(angle) * radius;
      decor.position.y = -0.6;
      decorations.push(decor);
      cakeGroup.add(decor);
    }

    scene.add(cakeGroup);
    camera.position.z = 9;
    camera.position.y = 3;
    camera.position.x = 1.5;
    camera.lookAt(0, 0, 0);

    // Resize handler for responsive
    function handleResize() {
      const containerRect = container.getBoundingClientRect();
      const newSize = Math.min(450, containerRect.width, window.innerWidth * 0.9);
      renderer.setSize(newSize, newSize);
      camera.updateProjectionMatrix();
    }
    
    window.addEventListener('resize', handleResize);

    // Animation
    function animate() {
      requestAnimationFrame(animate);
      
      // Rotate cake slowly
      cakeGroup.rotation.y += 0.005;
      
      // Animate decorations
      decorations.forEach((decor, i) => {
        decor.rotation.y += 0.02;
        decor.position.y = -0.6 + Math.sin(Date.now() * 0.003 + i) * 0.1;
      });

      // Flame flicker
      if (flame.material.opacity > 0) {
        flame.scale.x = 1 + Math.sin(Date.now() * 0.01) * 0.1;
        flame.scale.z = 1 + Math.cos(Date.now() * 0.015) * 0.1;
      }

      renderer.render(scene, camera);
    }
    animate();

    // Return control functions
    return {
      showFlame: () => {
        flame.material.opacity = 0.9;
      },
      hideFlame: () => {
        flame.material.opacity = 0;
      },
      group: cakeGroup
    };
  }

  // Initialize 3D cake when page loads
  let cake3D = null;
  setTimeout(() => {
    cake3D = create3DCake();
  }, 500);

  // Update cake show/lit/blow logic to work with 3D cake
  const originalSteps = [
    { label: 'Happy', run: () => { banner.classList.add('show'); } },
    { label: 'Balloons', run: () => { spawnBalloons(); balloons.classList.add('fly'); } },
    { label: 'Bring cake', run: () => { 
      cake.classList.add('show'); 
      setTimeout(() => {
        cake.classList.add('lit');
        if (cake3D) cake3D.showFlame();
      }, 500); 
    }},
    { label: 'Blow candle', run: () => { 
      cake.classList.add('blow'); 
      if (cake3D) cake3D.hideFlame();
      setTimeout(() => cake.classList.remove('lit'), 50); 
    }},
    { label: 'Happy Birthday', run: () => { message.classList.add('show'); triggerConfetti(); hideButtonsAfterFinal(); } },
  ];

  // Update steps array
  steps.length = 0;
  steps.push(...originalSteps);

})();


