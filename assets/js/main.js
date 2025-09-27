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


  btnAction.addEventListener('click', () => {
    const step = steps[currentStepIndex];
    step.run();
    currentStepIndex = Math.min(currentStepIndex + 1, steps.length - 1);
    updateActionLabel();
  });


  reset();
  updateActionLabel();
  
  
  // Auto-play music on page load
  let musicPlaying = false;
  
  function startMusic() {
    if (!musicPlaying && bgm) {
      // Wait for audio to be ready if it's not already
      if (bgm.readyState >= 2) { // HAVE_CURRENT_DATA or better
        bgm.loop = true;
        bgm.volume = 0.7;
        bgm.muted = false;
        
        const playPromise = bgm.play();
        if (playPromise && typeof playPromise.catch === 'function') {
          playPromise.then(() => {
            console.log('Auto-play music started successfully');
            musicPlaying = true;
          }).catch((error) => {
            console.log('Auto-play blocked, will try again on user interaction:', error);
          });
        } else {
          musicPlaying = true;
        }
      } else {
        // Audio not ready yet, wait a bit and try again
        console.log('Audio not ready, waiting...');
        setTimeout(() => startMusic(), 200);
      }
    }
  }
  
  // Try to auto play music immediately
  setTimeout(() => {
    startMusic();
  }, 500);
  
  // Add click listener to entire document to start music if not already playing
  document.addEventListener('click', () => {
    if (!musicPlaying && bgm) {
      // Reset and try to play the original audio file
      bgm.currentTime = 0;
      bgm.loop = true;
      bgm.volume = 0.7;
      bgm.muted = false;
      
      const playPromise = bgm.play();
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.then(() => {
          console.log('Music started successfully');
          musicPlaying = true;
        }).catch((error) => {
          console.log('Failed to play audio file, trying fallback:', error);
          // Only use fallback if the original audio completely fails
          playMusicWithFallback();
          musicPlaying = true;
        });
      } else {
        musicPlaying = true;
      }
    }
  }, { once: false });

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
    renderer.shadowMap.autoUpdate = true;
    renderer.antialias = true;
    renderer.outputEncoding = THREE.sRGBEncoding;
    container.appendChild(renderer.domElement);

    // Natural lighting setup
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6); // Increased for softer look
    scene.add(ambientLight);
    
    // Main directional light with proper shadow settings
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 5);
    directionalLight.castShadow = true;
    
    // Optimized shadow settings for natural look
    directionalLight.shadow.mapSize.width = 1024; // Reduced for better performance
    directionalLight.shadow.mapSize.height = 1024;
    directionalLight.shadow.camera.near = 0.1;
    directionalLight.shadow.camera.far = 25;
    directionalLight.shadow.camera.left = -10;
    directionalLight.shadow.camera.right = 10;
    directionalLight.shadow.camera.top = 10;
    directionalLight.shadow.camera.bottom = -10;
    directionalLight.shadow.radius = 4; // Reduced for sharper shadows
    directionalLight.shadow.blurSamples = 8; // Reduced for performance
    scene.add(directionalLight);
    
    // Soft fill light
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.4);
    fillLight.position.set(-3, 5, -2);
    scene.add(fillLight);

    // Cake group
    const cakeGroup = new THREE.Group();

    // Enhanced smooth plate
    const plateGeometry = new THREE.CylinderGeometry(4.8, 4.8, 0.3, 64); // High-res
    const plateMaterial = new THREE.MeshLambertMaterial({ 
      color: 0xffffff,
      flatShading: false
    });
    const plate = new THREE.Mesh(plateGeometry, plateMaterial);
    plate.position.y = -1.8;
    plate.receiveShadow = true;
    plate.castShadow = true; // Plate should cast shadow
    cakeGroup.add(plate);

    // Cake layers - Enhanced smooth geometry
    const layers = [
      { radius: 4, height: 1.6, color: 0xffb3e6, y: -1.3 }, // Pink bottom
      { radius: 3.2, height: 1.4, color: 0x81d4fa, y: 0.1 },  // Blue middle  
      { radius: 2.5, height: 1.2, color: 0xa5d6a7, y: 1.3 }  // Green top
    ];

    layers.forEach((layer, index) => {
      // High-resolution geometry for smooth circles
      const geometry = new THREE.CylinderGeometry(
        layer.radius, layer.radius, layer.height, 
        64, // Increased radial segments from 32 to 64 for smoother curves
        1,  // Height segments
        false // Open ended
      );
      
      // Enhanced material with better lighting
      const material = new THREE.MeshLambertMaterial({ 
        color: layer.color,
        flatShading: false, // Smooth shading instead of flat
      });
      
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.y = layer.y;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      // Enable shadow casting for all cake layers
      mesh.userData = { isCakeLayer: true };
      cakeGroup.add(mesh);

      // Smooth white cream borders with high resolution
      const topBorderGeometry = new THREE.CylinderGeometry(
        layer.radius + 0.08, layer.radius + 0.08, 0.12, 
        64, // High resolution for smooth borders
        1,
        false
      );
      const topBorderMaterial = new THREE.MeshLambertMaterial({ 
        color: 0xffffff,
        flatShading: false,
      });
      const topBorder = new THREE.Mesh(topBorderGeometry, topBorderMaterial);
      topBorder.position.y = layer.y + (layer.height/2 + 0.06);
      topBorder.castShadow = true;
      topBorder.receiveShadow = true;
      // Cream borders should cast subtle shadows
      topBorder.userData = { isCreamBorder: true };
      cakeGroup.add(topBorder);
    });


    // Realistic candle with melted wax base
    const candleGeometry = new THREE.CylinderGeometry(0.12, 0.12, 1.5, 32);
    const candleMaterial = new THREE.MeshLambertMaterial({ 
      color: 0xff6b9d, // Pink candle (back to original)
      flatShading: false
    });
    const candle = new THREE.Mesh(candleGeometry, candleMaterial);
    candle.position.y = 2.45;
    candle.castShadow = true;
    candle.receiveShadow = true;
    cakeGroup.add(candle);
    
    // Melted wax pool at base of candle - curved like real wax
    const waxGeometry = new THREE.CylinderGeometry(0.15, 0.18, 0.3, 32);
    const waxMaterial = new THREE.MeshLambertMaterial({ 
      color: 0xffeb3b, // Yellow wax (back to original)
      flatShading: false
    });
    const wax = new THREE.Mesh(waxGeometry, waxMaterial);
    wax.position.y = 1.8;
    wax.castShadow = true;
    wax.receiveShadow = true;
    cakeGroup.add(wax);
    
    // Candle wick (râu nến) - connecting candle to flame
    const wickGeometry = new THREE.CylinderGeometry(0.015, 0.015, 0.2, 8);
    const wickMaterial = new THREE.MeshLambertMaterial({ 
      color: 0x000000, // Pure black
      flatShading: false
    });
    const wick = new THREE.Mesh(wickGeometry, wickMaterial);
    wick.position.y = 3.25; // Back to original position
    wick.castShadow = true;
    wick.receiveShadow = true;
    cakeGroup.add(wick);

    // Shader-based realistic flame
    function getFlameMaterial(isFrontSide) {
      let side = isFrontSide ? THREE.FrontSide : THREE.BackSide;
      return new THREE.ShaderMaterial({
        uniforms: {
          time: { value: 0 }
        },
        vertexShader: `
          uniform float time;
          varying vec2 vUv;
          varying float hValue;

          // 2D Random
          float random (in vec2 st) {
              return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
          }

          // 2D Noise
          float noise (in vec2 st) {
              vec2 i = floor(st);
              vec2 f = fract(st);
              float a = random(i);
              float b = random(i + vec2(1.0, 0.0));
              float c = random(i + vec2(0.0, 1.0));
              float d = random(i + vec2(1.0, 1.0));
              vec2 u = f*f*(3.0-2.0*f);
              return mix(a, b, u.x) + (c - a)* u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
          }

          void main() {
            vUv = uv;
            vec3 pos = position;
            pos *= vec3(0.8, 2, 0.725);
            hValue = position.y;
            float posXZlen = length(position.xz);
            pos.y *= 1. + (cos((posXZlen + 0.25) * 3.1415926) * 0.25 + noise(vec2(0, time)) * 0.125 + noise(vec2(position.x + time, position.z + time)) * 0.5) * position.y;
            pos.x += noise(vec2(time * 2., (position.y - time) * 4.0)) * hValue * 0.0312;
            pos.z += noise(vec2((position.y - time) * 4.0, time * 2.)) * hValue * 0.0312;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(pos,1.0);
          }
        `,
        fragmentShader: `
          varying float hValue;
          varying vec2 vUv;

          vec3 heatmapGradient(float t) {
            // Brick red flame gradient: deep brick red to bright brick orange
            return clamp(vec3(
              smoothstep(0.0, 0.4, t) + t * 0.9,  // Red: strong brick red
              smoothstep(0.1, 0.5, t) + t * 0.4,  // Green: minimal for brick color
              max(0.0, t * 0.1)                    // Blue: minimal blue
            ), 0.0, 1.0);
          }

          void main() {
            float v = abs(smoothstep(0.0, 0.4, hValue) - 1.);
            float alpha = (1. - v) * 0.99;
            alpha -= 1. - smoothstep(1.0, 0.97, hValue);
            
            // Brick red flame colors: deep brick red to bright brick orange
            gl_FragColor = vec4(heatmapGradient(smoothstep(0.0, 0.3, hValue)) * vec3(2.0, 0.8, 0.2), alpha);
            gl_FragColor.rgb = mix(vec3(0.8, 0.1, 0.0), gl_FragColor.rgb, smoothstep(0.0, 0.3, hValue));
            gl_FragColor.rgb += vec3(2.0, 0.8, 0.2) * (1.25 - vUv.y);
            gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(1.2, 0.4, 0.1), smoothstep(0.95, 1., hValue));
          }
        `,
        transparent: true,
        side: side
      });
    }

    // Create flame with shader - positioned right on top of wick
    const flameGeometry = new THREE.SphereGeometry(0.12, 32, 32);
    flameGeometry.translate(0, 0.1, 0); // Flame starts from wick base
    
    const flameMaterial = getFlameMaterial(true);
    const flame = new THREE.Mesh(flameGeometry, flameMaterial);
    flame.position.set(0, 3.25, 0); // Lower to meet wick top
    flame.rotation.y = 0; // No rotation for centered flame
    cakeGroup.add(flame);
    
    // Add second flame for double-sided effect
    const flameMaterial2 = getFlameMaterial(false);
    const flame2 = new THREE.Mesh(flameGeometry, flameMaterial2);
    flame2.position.set(0, 3.25, 0); // Same position as first flame
    flame2.rotation.y = 0; // No rotation for centered flame
    cakeGroup.add(flame2);

    // Function to create a realistic frosting swirl
    function createFrostingSwirl() {
      const frostingGroup = new THREE.Group();
      
      // Create a more complex swirl using multiple layers - SAME SIZE AS CHERRY
      // Base layer - wider bottom (same size as cherry)
      const baseGeometry = new THREE.CylinderGeometry(0.20, 0.25, 0.10, 12);
      const baseMaterial = new THREE.MeshPhongMaterial({ 
        color: 0xffffff,
        shininess: 80,
        specular: 0x888888
      });
      const base = new THREE.Mesh(baseGeometry, baseMaterial);
      base.position.y = 0.05;
      base.castShadow = true;
      base.receiveShadow = true;
      frostingGroup.add(base);
      
      // Middle layer - tapered
      const middleGeometry = new THREE.CylinderGeometry(0.18, 0.22, 0.12, 12);
      const middleMaterial = new THREE.MeshPhongMaterial({ 
        color: 0xffffff,
        shininess: 85,
        specular: 0x999999
      });
      const middle = new THREE.Mesh(middleGeometry, middleMaterial);
      middle.position.y = 0.16;
      middle.castShadow = true;
      middle.receiveShadow = true;
      frostingGroup.add(middle);
      
      // Top swirl - cone with spiral effect - SAME SIZE AS CHERRY
      const topGeometry = new THREE.ConeGeometry(0.15, 0.20, 8); // Same size as cherry
      const topMaterial = new THREE.MeshPhongMaterial({ 
        color: 0xffffff,
        shininess: 90,
        specular: 0xaaaaaa
      });
      const top = new THREE.Mesh(topGeometry, topMaterial);
      top.position.y = 0.30; // Same height as cherry
      top.castShadow = true;
      top.receiveShadow = true;
      frostingGroup.add(top);
      
      // Add spiral ridges for more realistic swirl effect - SAME SIZE AS CHERRY
      for (let j = 0; j < 8; j++) {
        const ridgeGeometry = new THREE.CylinderGeometry(0.025, 0.035, 0.15, 6); // Larger ridges
        const ridgeMaterial = new THREE.MeshPhongMaterial({ 
          color: 0xffffff,
          shininess: 75
        });
        const ridge = new THREE.Mesh(ridgeGeometry, ridgeMaterial);
        const angle = (j / 8) * Math.PI * 2;
        const radius = 0.18 + (j * 0.005); // Slightly increasing radius
        ridge.position.x = Math.cos(angle) * radius;
        ridge.position.z = Math.sin(angle) * radius;
        ridge.position.y = 0.08 + (j * 0.02); // Adjusted spiral upward
        ridge.rotation.z = angle + (j * 0.3); // Spiral rotation
        ridge.castShadow = true;
        ridge.receiveShadow = true;
        frostingGroup.add(ridge);
      }
      
      // Move the entire frosting group down so the base touches the cake surface
      frostingGroup.position.y = -0.35; // Much larger offset to make base truly touch cake surface
      
      return frostingGroup;
    }

    // Function to create a realistic 3D cherry
    function createCherry() {
      const cherryGroup = new THREE.Group();
      
      // Cherry body - realistic red sphere with slight oval shape
      const cherryGeometry = new THREE.SphereGeometry(0.25, 32, 32);
      cherryGeometry.scale(1, 1.1, 1); // Slightly oval for more realistic look
      const cherryMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x8b0000, // Dark red cherry color like real cherries
        shininess: 30, // Natural shine
        specular: 0x222222 // Subtle specular reflection
      });
      const cherry = new THREE.Mesh(cherryGeometry, cherryMaterial);
      cherry.castShadow = true; // Enable soft shadow casting
      cherry.receiveShadow = true;
      cherryGroup.add(cherry);
      
      // Cherry stem - green curved stem
      const stemGeometry = new THREE.CylinderGeometry(0.02, 0.02, 0.4, 8);
      const stemMaterial = new THREE.MeshLambertMaterial({ 
        color: 0x228b22, // Forest green
        flatShading: false
      });
      const stem = new THREE.Mesh(stemGeometry, stemMaterial);
      stem.position.y = 0.25; // Relative to cherry
      stem.rotation.z = Math.PI / 6; // Slight curve
      stem.rotation.x = Math.PI / 8;
      stem.castShadow = true; // Enable shadow for stem
      stem.receiveShadow = true;
      cherryGroup.add(stem);
      
      // Cherry leaf - small green leaf
      const leafGeometry = new THREE.SphereGeometry(0.08, 8, 8);
      leafGeometry.scale(1.5, 0.3, 1); // Flatten to leaf shape
      const leafMaterial = new THREE.MeshLambertMaterial({ 
        color: 0x32cd32, // Lime green
        flatShading: false
      });
      const leaf = new THREE.Mesh(leafGeometry, leafMaterial);
      leaf.position.set(0.05, 0.45, 0.05); // Relative to cherry
      leaf.rotation.z = Math.PI / 4; // Angled leaf
      leaf.rotation.x = Math.PI / 6;
      leaf.castShadow = false; // Disable shadow casting
      leaf.receiveShadow = true;
      cherryGroup.add(leaf);
      
      return cherryGroup;
    }

    // Add many cherries and frosting around tier 2 (middle blue tier) to fill it up
    const tier2Cherries = [];
    const tier2Frosting = [];
    const totalCount = 24; // Total decorations (12 cherries + 12 frosting)
    
    for (let i = 0; i < totalCount; i++) {
      const angle = (i / totalCount) * Math.PI * 2; // Evenly spaced around the circle
      const radius = 3.2 + 0.25; // Slightly outside the middle tier radius
      
      if (i % 2 === 0) {
        // Add cherry every other position
        const cherry = createCherry();
        cherry.position.x = Math.cos(angle) * radius;
        cherry.position.z = Math.sin(angle) * radius;
        cherry.position.y = -0.2; // Lower position, closer to tier 2 surface
        
        // Add slight random variation for natural look
        cherry.position.x += (Math.random() - 0.5) * 0.15;
        cherry.position.z += (Math.random() - 0.5) * 0.15;
        cherry.position.y += (Math.random() - 0.5) * 0.05;
        
        // Random rotation for variety
        cherry.rotation.y = Math.random() * Math.PI * 2;
        
        tier2Cherries.push(cherry);
        cakeGroup.add(cherry);
      } else {
        // Add frosting every other position
        const frosting = createFrostingSwirl();
        frosting.position.x = Math.cos(angle) * radius;
        frosting.position.z = Math.sin(angle) * radius;
        frosting.position.y = -0.5; // Much lower position, very close to cake surface
        
        // Add slight random variation
        frosting.position.x += (Math.random() - 0.5) * 0.1;
        frosting.position.z += (Math.random() - 0.5) * 0.1;
        frosting.position.y += (Math.random() - 0.5) * 0.03;
        
        frosting.castShadow = true;
        frosting.receiveShadow = true;
        tier2Frosting.push(frosting);
        cakeGroup.add(frosting);
      }
    }

    // Add decorations for tier 1 (bottom pink tier)
    const tier1Cherries = [];
    const tier1Frosting = [];
    const tier1TotalCount = 32; // Total decorations (16 cherries + 16 frosting) - more dense
    
    for (let i = 0; i < tier1TotalCount; i++) {
      const angle = (i / tier1TotalCount) * Math.PI * 2; // Evenly spaced around the circle
      const radius = 4.0 + 0.3; // Slightly outside the bottom tier radius
      
      if (i % 2 === 0) {
        // Add cherry every other position
        const cherry = createCherry();
        cherry.position.x = Math.cos(angle) * radius;
        cherry.position.z = Math.sin(angle) * radius;
        cherry.position.y = -1.3; // On the bottom tier surface
        
        // Add slight random variation for natural look
        cherry.position.x += (Math.random() - 0.5) * 0.2;
        cherry.position.z += (Math.random() - 0.5) * 0.2;
        cherry.position.y += (Math.random() - 0.5) * 0.08;
        
        // Random rotation for variety
        cherry.rotation.y = Math.random() * Math.PI * 2;
        
        tier1Cherries.push(cherry);
        cakeGroup.add(cherry);
      } else {
        // Add frosting every other position
        const frosting = createFrostingSwirl();
        frosting.position.x = Math.cos(angle) * radius;
        frosting.position.z = Math.sin(angle) * radius;
        frosting.position.y = -1.3; // Same position as cherry
        
        // Add slight random variation
        frosting.position.x += (Math.random() - 0.5) * 0.15;
        frosting.position.z += (Math.random() - 0.5) * 0.15;
        frosting.position.y += (Math.random() - 0.5) * 0.05;
        
        frosting.castShadow = true;
        frosting.receiveShadow = true;
        tier1Frosting.push(frosting);
        cakeGroup.add(frosting);
      }
    }

    // Add "Trang & Trinh" text on top of the cake
    const textGeometry = new THREE.PlaneGeometry(3, 0.8);
    const textMaterial = new THREE.MeshBasicMaterial({ 
      color: 0xff6b9d,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide
    });
    const textMesh = new THREE.Mesh(textGeometry, textMaterial);
    textMesh.position.y = 2.3; // Position
    textMesh.position.z = 0.5; // Slightly in front
    textMesh.rotation.x = -Math.PI / 6; // Slight tilt for better visibility
    cakeGroup.add(textMesh);

    // Create high-resolution text texture with "Trang & Trinh"
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = 1024; // Higher resolution
    canvas.height = 256;
    
    // Set pink background
    context.fillStyle = 'rgba(255, 107, 157, 0.9)';
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    // Set text style with maximum sharpness
    context.fillStyle = '#000000'; // Black text for contrast
    context.font = 'bold 96px Arial, sans-serif'; // Larger font
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    
    // Add white text shadow for black text on pink background
    context.shadowColor = 'rgba(255, 255, 255, 0.8)';
    context.shadowBlur = 6;
    context.shadowOffsetX = 2;
    context.shadowOffsetY = 2;
    
    // Draw text
    context.fillText('Trang & Trinh', canvas.width / 2, canvas.height / 2);
    
    // Create texture from canvas with better filtering
    const textTexture = new THREE.CanvasTexture(canvas);
    textTexture.needsUpdate = true;
    textTexture.minFilter = THREE.LinearFilter;
    textTexture.magFilter = THREE.LinearFilter;
    
    // Update text material with texture
    textMaterial.map = textTexture;
    textMaterial.transparent = true;
    textMaterial.opacity = 0.95;

    // Smooth decorative elements
    const decorations = [];
    for(let i = 0; i < 16; i++) {
      const angle = (i / 16) * Math.PI * 2;
      const radius = 3.2;
      
      const decorGeometry = new THREE.SphereGeometry(0.12, 16, 12); // Higher resolution spheres
      const decorMaterial = new THREE.MeshLambertMaterial({ 
        color: i % 3 === 0 ? 0xff69b4 : i % 3 === 1 ? 0xffd700 : 0x00ff88,
        flatShading: false
      });
      const decor = new THREE.Mesh(decorGeometry, decorMaterial);
      decor.position.x = Math.cos(angle) * radius;
      decor.position.z = Math.sin(angle) * radius;
      decor.position.y = -0.6;
      decor.castShadow = true;
      decor.receiveShadow = true;
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

      // Animate tier 2 cherries with individual gentle motions
      tier2Cherries.forEach((cherry, i) => {
        cherry.rotation.y += 0.002 + (i * 0.0003); // Slightly different rotation speeds
        cherry.position.y = -0.2 + Math.sin(Date.now() * 0.001 + i * 0.5) * 0.02; // Gentle up-down motion around new base position
        cherry.rotation.z = Math.sin(Date.now() * 0.0012 + i * 0.3) * 0.04; // Gentle swaying
      });

      // Animate frosting dots with gentle bobbing motion
      tier2Frosting.forEach((frosting, i) => {
        frosting.position.y = -0.15 + Math.sin(Date.now() * 0.0008 + i * 0.4) * 0.015; // Gentle bobbing
        frosting.rotation.y += 0.001; // Very slow rotation
      });

      // Animate tier 1 cherries with individual gentle motions
      tier1Cherries.forEach((cherry, i) => {
        cherry.rotation.y += 0.0015 + (i * 0.0002); // Slightly different rotation speeds
        cherry.position.y = -1.3 + Math.sin(Date.now() * 0.0008 + i * 0.4) * 0.025; // Gentle up-down motion
        cherry.rotation.z = Math.sin(Date.now() * 0.001 + i * 0.25) * 0.03; // Gentle swaying
      });

      // Animate tier 1 frosting with gentle bobbing motion
      tier1Frosting.forEach((frosting, i) => {
        frosting.position.y = -1.3 + Math.sin(Date.now() * 0.0006 + i * 0.3) * 0.02; // Gentle bobbing
        frosting.rotation.y += 0.0008; // Very slow rotation
      });

      // Shader flame animation
      const time = Date.now() * 0.001;
      if (flame.material.uniforms) {
        flame.material.uniforms.time.value = time;
      }
      if (flame2.material.uniforms) {
        flame2.material.uniforms.time.value = time;
      }

      renderer.render(scene, camera);
    }
    animate();

    // Enhanced smoke effect for blown candle
    function createSmokeEffect() {
      const smokeGeometry = new THREE.SphereGeometry(0.05, 8, 8);
      const smokeMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x888888,
        transparent: true,
        opacity: 0.6
      });
      
      const smokeParticles = [];
      for (let i = 0; i < 8; i++) {
        const smoke = new THREE.Mesh(smokeGeometry, smokeMaterial);
        smoke.position.set(
          (Math.random() - 0.5) * 0.1,
          3.3 + Math.random() * 0.2,
          (Math.random() - 0.5) * 0.1
        );
        smoke.scale.setScalar(0.5 + Math.random() * 0.5);
        smokeParticles.push(smoke);
        cakeGroup.add(smoke);
      }
      
      return smokeParticles;
    }

    // Return control functions
    return {
      showFlame: () => {
        flame.visible = true;
        flame2.visible = true;
      },
      hideFlame: () => {
        flame.visible = false;
        flame2.visible = false;
      },
      createSmoke: createSmokeEffect,
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
      if (cake3D) {
        cake3D.hideFlame();
        // Create smoke effect
        const smokeParticles = cake3D.createSmoke();
        // Animate smoke particles
        smokeParticles.forEach((smoke, i) => {
          const startY = smoke.position.y;
          const targetY = startY + 0.5 + Math.random() * 0.3;
          const duration = 2000 + Math.random() * 1000;
          const startTime = Date.now();
          
          function animateSmoke() {
            const elapsed = Date.now() - startTime;
            const progress = elapsed / duration;
            
            if (progress < 1) {
              smoke.position.y = startY + (targetY - startY) * progress;
              smoke.material.opacity = 0.6 * (1 - progress);
              smoke.scale.setScalar((0.5 + Math.random() * 0.5) * (1 + progress * 2));
              requestAnimationFrame(animateSmoke);
            } else {
              cakeGroup.remove(smoke);
            }
          }
          setTimeout(animateSmoke, i * 100);
        });
      }
      setTimeout(() => cake.classList.remove('lit'), 50); 
    }},
    { label: 'Happy Birthday', run: () => { message.classList.add('show'); triggerConfetti(); hideButtonsAfterFinal(); } },
  ];

  // Update steps array
  steps.length = 0;
  steps.push(...originalSteps);

})();


