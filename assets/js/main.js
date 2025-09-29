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
    { label: 'Happy Birthday', run: () => { 
      message.classList.add('show'); 
      // Show photo frames with slight delay for better effect
      setTimeout(() => {
        const photoFrames = document.getElementById('photoFrames');
        if (photoFrames) photoFrames.classList.add('show');
      }, 500);
      triggerConfetti(); 
      hideButtonsAfterFinal(); 
    } },
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
    
    // Clean up 3D balloons
    if (balloonMeshes && balloonMeshes.length > 0) {
      balloonMeshes.forEach(balloon => {
        if (balloonScene) {
          balloonScene.remove(balloon.group);
        }
      });
      balloonMeshes = [];
    }
    
    // Stop 3D balloon animation
    if (balloonAnimationId) {
      cancelAnimationFrame(balloonAnimationId);
      balloonAnimationId = null;
    }
  }

  // 3D Balloons System
  let balloonScene, balloonCamera, balloonRenderer, balloonContainer;
  let balloonMeshes = [];
  let balloonAnimationId;

  function init3DBalloons() {
    if (!window.THREE) return;

    // Create container for 3D balloons
    balloonContainer = document.createElement('div');
    balloonContainer.style.position = 'fixed';
    balloonContainer.style.top = '0';
    balloonContainer.style.left = '0';
    balloonContainer.style.width = '100%';
    balloonContainer.style.height = '100%';
    balloonContainer.style.pointerEvents = 'none';
    balloonContainer.style.zIndex = '35'; // Below cake, above background
    document.body.appendChild(balloonContainer);

    // Scene setup
    balloonScene = new THREE.Scene();
    balloonCamera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    balloonRenderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    balloonRenderer.setSize(window.innerWidth, window.innerHeight);
    balloonRenderer.setClearColor(0x000000, 0);
    balloonContainer.appendChild(balloonRenderer.domElement);

    // Enhanced lighting for realistic balloons
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    balloonScene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.9);
    directionalLight.position.set(5, 10, 5);
    directionalLight.castShadow = true;
    balloonScene.add(directionalLight);

    // Soft fill light
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
    fillLight.position.set(-3, 5, -2);
    balloonScene.add(fillLight);

    // Camera position
    balloonCamera.position.z = 6;
    balloonCamera.position.y = 1;
  }

  function create3DBalloon(color, x, scale, delay) {
    if (!balloonScene) return null;

    const balloonGroup = new THREE.Group();

    // Balloon body - realistic teardrop shape
    const balloonGeometry = new THREE.SphereGeometry(0.3, 32, 32);
    balloonGeometry.scale(1, 1.5, 1); // More teardrop-like
    
    // Enhanced balloon material
    const balloonMaterial = new THREE.MeshPhongMaterial({
      color: color,
      shininess: 150,
      specular: 0x666666,
      transparent: true,
      opacity: 0.95
    });

    const balloonMesh = new THREE.Mesh(balloonGeometry, balloonMaterial);
    balloonMesh.castShadow = true;
    balloonMesh.receiveShadow = true;
    balloonGroup.add(balloonMesh);

    // Balloon neck - more realistic
    const neckGeometry = new THREE.CylinderGeometry(0.04, 0.06, 0.1, 16);
    const neckMaterial = new THREE.MeshPhongMaterial({
      color: color,
      shininess: 80
    });
    const neckMesh = new THREE.Mesh(neckGeometry, neckMaterial);
    neckMesh.position.y = -0.4;
    neckMesh.castShadow = true;
    balloonGroup.add(neckMesh);

    // Balloon string - attached to balloon base
    const stringGeometry = new THREE.CylinderGeometry(0.003, 0.003, 1.2, 8);
    const stringMaterial = new THREE.MeshLambertMaterial({
      color: 0xcccccc,
      transparent: true,
      opacity: 0.8
    });
    const stringMesh = new THREE.Mesh(stringGeometry, stringMaterial);
    stringMesh.position.y = -0.5; // Attached to balloon base
    stringMesh.rotation.z = Math.random() * 0.4 - 0.2;
    balloonGroup.add(stringMesh);

    // Position and scale
    balloonGroup.position.x = x;
    balloonGroup.position.y = -3;
    balloonGroup.position.z = (Math.random() - 0.5) * 3;
    balloonGroup.scale.setScalar(scale);

    // Add to scene
    balloonScene.add(balloonGroup);
    balloonMeshes.push({
      group: balloonGroup,
      startTime: Date.now() + delay * 1000,
      duration: (8 + Math.random() * 4) * 1000,
      originalX: x,
      originalZ: balloonGroup.position.z,
      originalScale: scale,
      stringMesh: stringMesh
    });

    return balloonGroup;
  }

  function animate3DBalloons() {
    if (!balloonRenderer || !balloonScene || !balloonCamera) return;

    const currentTime = Date.now();

    // Update each balloon
    for (let i = balloonMeshes.length - 1; i >= 0; i--) {
      const balloon = balloonMeshes[i];
      const elapsed = currentTime - balloon.startTime;

      if (elapsed < 0) continue;

      const progress = Math.min(elapsed / balloon.duration, 1);
      
      if (progress >= 1) {
        balloonScene.remove(balloon.group);
        balloonMeshes.splice(i, 1);
        continue;
      }

      // Smooth easing
      const easeProgress = 1 - Math.pow(1 - progress, 2);

      // Rise up
      balloon.group.position.y = -3 + easeProgress * 10;

      // Wind effect
      const windOffset = Math.sin(progress * Math.PI * 3) * 0.3;
      balloon.group.position.x = balloon.originalX + windOffset;
      
      // Depth movement
      balloon.group.position.z = balloon.originalZ + Math.sin(progress * Math.PI * 2) * 0.2;

      // Gentle rotation
      balloon.group.rotation.z = Math.sin(progress * Math.PI * 2) * 0.05;

      // String sway
      balloon.stringMesh.rotation.z = Math.sin(currentTime * 0.003 + i) * 0.3;

      // Fade out
      if (progress > 0.85) {
        const fadeProgress = (progress - 0.85) / 0.15;
        balloon.group.children.forEach(child => {
          if (child.material) {
            child.material.opacity = 0.95 * (1 - fadeProgress);
          }
        });
      }
    }

    balloonRenderer.render(balloonScene, balloonCamera);
    balloonAnimationId = requestAnimationFrame(animate3DBalloons);
  }

  function spawnBalloons(){
    // Initialize 3D balloons if not already done
    if (!balloonScene) {
      init3DBalloons();
    }

    const colors = [
      0xef476f, // red
      0xffd166, // yellow  
      0x06d6a0, // green
      0x4cc9f0, // blue
      0xff99c8, // pink
      0xf9c74f  // orange
    ];
    
    // Perfect number for beautiful frame composition
    const count = 12;
    
    // Create balloons with strategic positioning
    for(let i = 0; i < count; i++){
      // Even distribution across screen width
      const x = (-4 + (i / (count - 1)) * 8) + (Math.random() - 0.5) * 0.8;
      const scale = 0.8 + Math.random() * 0.4;
      const delay = 0; // All balloons launch simultaneously
      const color = colors[i % colors.length];
      
      create3DBalloon(color, x, scale, delay);
    }

    // Start animation
    if (!balloonAnimationId) {
      animate3DBalloons();
    }
  }

  // Handle window resize
  window.addEventListener('resize', () => {
    if (balloonCamera && balloonRenderer) {
      balloonCamera.aspect = window.innerWidth / window.innerHeight;
      balloonCamera.updateProjectionMatrix();
      balloonRenderer.setSize(window.innerWidth, window.innerHeight);
    }
  });


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

    // Cake layers - Warm cohesive palette to match golden candles
    const layers = [
      { radius: 4, height: 1.6, color: 0xffd1b3, y: -1.3 }, // Warm peach bottom
      { radius: 3.2, height: 1.4, color: 0xffe0b3, y: 0.1 },  // Soft cream middle  
      { radius: 2.5, height: 1.2, color: 0xfff2d1, y: 1.3 }  // Light vanilla top
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


    // Function to create seamless number candle shapes using simple BoxGeometry
    function createNumberCandle(number, color) {
      const candleGroup = new THREE.Group();
      const material = new THREE.MeshLambertMaterial({ 
        color: color,
        flatShading: false
      });
      
      if (number === 2) {
        // Create number "2" with correct shape (no back connection)
        const thickness = 0.15;
        
        // Top horizontal bar
        const topGeometry = new THREE.BoxGeometry(0.5, 0.15, thickness);
        const top = new THREE.Mesh(topGeometry, material);
        top.position.set(0, 0.5, 0);
        top.castShadow = true;
        top.receiveShadow = true;
        candleGroup.add(top);
        
        // Right vertical bar (from top to middle only)
        const rightGeometry = new THREE.BoxGeometry(0.15, 0.4, thickness);
        const right = new THREE.Mesh(rightGeometry, material);
        right.position.set(0.25, 0.2, 0);
        right.castShadow = true;
        right.receiveShadow = true;
        candleGroup.add(right);
        
        // Middle horizontal bar
        const middleGeometry = new THREE.BoxGeometry(0.5, 0.15, thickness);
        const middle = new THREE.Mesh(middleGeometry, material);
        middle.position.set(0, 0, 0);
        middle.castShadow = true;
        middle.receiveShadow = true;
        candleGroup.add(middle);
        
        // Left vertical bar (from middle to bottom only)
        const leftGeometry = new THREE.BoxGeometry(0.15, 0.4, thickness);
        const left = new THREE.Mesh(leftGeometry, material);
        left.position.set(-0.25, -0.3, 0);
        left.castShadow = true;
        left.receiveShadow = true;
        candleGroup.add(left);
        
        // Bottom horizontal bar
        const bottomGeometry = new THREE.BoxGeometry(0.5, 0.15, thickness);
        const bottom = new THREE.Mesh(bottomGeometry, material);
        bottom.position.set(0, -0.5, 0);
        bottom.castShadow = true;
        bottom.receiveShadow = true;
        candleGroup.add(bottom);
        
      } else if (number === 5) {
        // Create number "5" with perfect joints
        const thickness = 0.15;
        
        // Top horizontal bar
        const topGeometry = new THREE.BoxGeometry(0.5, 0.15, thickness);
        const top = new THREE.Mesh(topGeometry, material);
        top.position.set(0, 0.5, 0);
        top.castShadow = true;
        top.receiveShadow = true;
        candleGroup.add(top);
        
        // Left vertical bar (from top to middle, overlaps top)
        const leftTopGeometry = new THREE.BoxGeometry(0.15, 0.4, thickness);
        const leftTop = new THREE.Mesh(leftTopGeometry, material);
        leftTop.position.set(-0.25, 0.2, 0);
        leftTop.castShadow = true;
        leftTop.receiveShadow = true;
        candleGroup.add(leftTop);
        
        // Middle horizontal bar (overlaps left)
        const middleGeometry = new THREE.BoxGeometry(0.5, 0.15, thickness);
        const middle = new THREE.Mesh(middleGeometry, material);
        middle.position.set(0, 0.15, 0);
        middle.castShadow = true;
        middle.receiveShadow = true;
        candleGroup.add(middle);
        
        // Right vertical bar (from middle to bottom, overlaps middle)
        const rightGeometry = new THREE.BoxGeometry(0.15, 0.5, thickness);
        const right = new THREE.Mesh(rightGeometry, material);
        right.position.set(0.25, -0.125, 0);
        right.castShadow = true;
        right.receiveShadow = true;
        candleGroup.add(right);
        
        // Bottom horizontal bar
        const bottomGeometry = new THREE.BoxGeometry(0.5, 0.15, thickness);
        const bottom = new THREE.Mesh(bottomGeometry, material);
        bottom.position.set(0, -0.5, 0);
        bottom.castShadow = true;
        bottom.receiveShadow = true;
        candleGroup.add(bottom);
      }
      
      return candleGroup;
    }

    // Create number candles for "25" with yellow body and red border like reference image
    const candle2 = createNumberCandle(2, 0xffd700); // Bright yellow like reference
    candle2.position.set(-0.5, 2.6, 0); // A bit higher for perfect visibility
    candle2.scale.set(1.0, 1.0, 2.0); // Make it taller/thicker for better visibility
    candle2.castShadow = true;
    candle2.receiveShadow = true;
    cakeGroup.add(candle2);
    
    // Add deep pink border for number 2
    const candle2Border = createNumberCandle(2, 0xd91e77); // Deep pink border
    candle2Border.position.set(-0.5, 2.6, 0);
    candle2Border.scale.set(1.1, 1.1, 0.9); // Slightly larger for border effect
    candle2Border.castShadow = true;
    candle2Border.receiveShadow = true;
    cakeGroup.add(candle2Border);
    
    // Move yellow candle in front of deep pink border
    cakeGroup.remove(candle2);
    cakeGroup.add(candle2);
    
    const candle5 = createNumberCandle(5, 0xffd700); // Bright yellow like reference
    candle5.position.set(0.5, 2.6, 0); // A bit higher for perfect visibility
    candle5.scale.set(1.0, 1.0, 2.0); // Make it taller/thicker for better visibility
    candle5.castShadow = true;
    candle5.receiveShadow = true;
    cakeGroup.add(candle5);
    
    // Add deep pink border for number 5
    const candle5Border = createNumberCandle(5, 0xd91e77); // Deep pink border
    candle5Border.position.set(0.5, 2.6, 0);
    candle5Border.scale.set(1.1, 1.1, 0.9); // Slightly larger for border effect
    candle5Border.castShadow = true;
    candle5Border.receiveShadow = true;
    cakeGroup.add(candle5Border);
    
    // Move yellow candle in front of red border
    cakeGroup.remove(candle5);
    cakeGroup.add(candle5);
    
    // Wicks for number candles
    const wick2Geometry = new THREE.CylinderGeometry(0.02, 0.02, 0.18, 8);
    const wickMaterial = new THREE.MeshLambertMaterial({ 
      color: 0x000000,
      flatShading: false
    });
    const wick2 = new THREE.Mesh(wick2Geometry, wickMaterial);
    wick2.position.set(-0.5, 3.3, 0); // Lowered a bit to be closer to numbers
    wick2.castShadow = true;
    wick2.receiveShadow = true;
    cakeGroup.add(wick2);
    
    const wick5 = new THREE.Mesh(wick2Geometry.clone(), wickMaterial);
    wick5.position.set(0.5, 3.3, 0); // Lowered a bit to be closer to numbers
    wick5.castShadow = true;
    wick5.receiveShadow = true;
    cakeGroup.add(wick5);

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

    // Create flames for number candles
    const flameGeometry = new THREE.SphereGeometry(0.12, 32, 32);
    flameGeometry.translate(0, 0.1, 0); // Flame starts from wick base
    
    // Flame for number 2 candle
    const flameMaterial2Front = getFlameMaterial(true);
    const flame2Front = new THREE.Mesh(flameGeometry.clone(), flameMaterial2Front);
    flame2Front.position.set(-0.5, 3.5, 0); // Lowered to match wick position
    cakeGroup.add(flame2Front);
    
    const flameMaterial2Back = getFlameMaterial(false);
    const flame2Back = new THREE.Mesh(flameGeometry.clone(), flameMaterial2Back);
    flame2Back.position.set(-0.5, 3.5, 0); // Same position as front flame
    cakeGroup.add(flame2Back);
    
    // Flame for number 5 candle
    const flameMaterial5Front = getFlameMaterial(true);
    const flame5Front = new THREE.Mesh(flameGeometry.clone(), flameMaterial5Front);
    flame5Front.position.set(0.5, 3.5, 0); // Lowered to match wick position
    cakeGroup.add(flame5Front);
    
    const flameMaterial5Back = getFlameMaterial(false);
    const flame5Back = new THREE.Mesh(flameGeometry.clone(), flameMaterial5Back);
    flame5Back.position.set(0.5, 3.5, 0); // Same position as front flame
    cakeGroup.add(flame5Back);
    
    // Store flame references for control
    const flames = {
      flame2Front, flame2Back, flame5Front, flame5Back
    };

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

    // Function to create a cute 3D gift box with customizable colors
    function createColoredGiftBox(colors) {
      const giftGroup = new THREE.Group();
      
      // Gift box body - customizable color
      const boxGeometry = new THREE.BoxGeometry(0.4, 0.4, 0.4);
      const boxMaterial = new THREE.MeshPhongMaterial({ 
        color: colors.box,
        shininess: 20,
        specular: 0x333333
      });
      const box = new THREE.Mesh(boxGeometry, boxMaterial);
      box.castShadow = true;
      box.receiveShadow = true;
      giftGroup.add(box);
      
      // Ribbon - horizontal
      const ribbonHGeometry = new THREE.BoxGeometry(0.45, 0.08, 0.45);
      const ribbonMaterial = new THREE.MeshPhongMaterial({ 
        color: colors.ribbon,
        shininess: 60
      });
      const ribbonH = new THREE.Mesh(ribbonHGeometry, ribbonMaterial);
      ribbonH.position.y = 0.05;
      ribbonH.castShadow = true;
      ribbonH.receiveShadow = true;
      giftGroup.add(ribbonH);
      
      // Ribbon - vertical
      const ribbonVGeometry = new THREE.BoxGeometry(0.08, 0.45, 0.45);
      const ribbonV = new THREE.Mesh(ribbonVGeometry, ribbonMaterial);
      ribbonV.position.y = 0.05;
      ribbonV.castShadow = true;
      ribbonV.receiveShadow = true;
      giftGroup.add(ribbonV);
      
      // Bow - left wing
      const bowGeometry = new THREE.SphereGeometry(0.12, 16, 16);
      bowGeometry.scale(1.5, 0.6, 0.8);
      const bowMaterial = new THREE.MeshPhongMaterial({ 
        color: colors.bow,
        shininess: 40
      });
      const bowLeft = new THREE.Mesh(bowGeometry, bowMaterial);
      bowLeft.position.set(-0.15, 0.25, 0);
      bowLeft.rotation.z = -0.3;
      bowLeft.castShadow = true;
      bowLeft.receiveShadow = true;
      giftGroup.add(bowLeft);
      
      // Bow - right wing
      const bowRight = new THREE.Mesh(bowGeometry.clone(), bowMaterial);
      bowRight.position.set(0.15, 0.25, 0);
      bowRight.rotation.z = 0.3;
      bowRight.castShadow = true;
      bowRight.receiveShadow = true;
      giftGroup.add(bowRight);
      
      // Bow center knot
      const knotGeometry = new THREE.SphereGeometry(0.06, 12, 12);
      const knot = new THREE.Mesh(knotGeometry, bowMaterial);
      knot.position.y = 0.25;
      knot.castShadow = true;
      knot.receiveShadow = true;
      giftGroup.add(knot);
      
      return giftGroup;
    }

    // Function to create a cute 3D gift box with pink ribbon (legacy function for compatibility)
    function createGiftBox() {
      return createColoredGiftBox({ 
        box: 0xffb6c1, 
        ribbon: 0xff69b4, 
        bow: 0xff1493 
      });
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
        frosting.position.y = -0.35; // Lower position, closer to middle tier surface
        
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
        frosting.position.y = -1.55; // Lower position, closer to bottom tier surface
        
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

    // Add "Trang & Trinh" text on bottom tier of the cake
    const textGeometry = new THREE.PlaneGeometry(3.5, 0.8);
    const textMaterial = new THREE.MeshBasicMaterial({ 
      color: 0xffffff,
      transparent: true,
      opacity: 1.0,
      side: THREE.DoubleSide
    });
    const textMesh = new THREE.Mesh(textGeometry, textMaterial);
    textMesh.position.y = -0.7; // Lower position on bottom tier
    textMesh.position.z = 4.0; // Slightly closer
    textMesh.rotation.x = 0; // No tilt for better readability
    cakeGroup.add(textMesh);

    // Create high-resolution text texture with "Trang & Trinh"
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = 800; // Smaller resolution for smaller card
    canvas.height = 200; // Smaller height
    
    // Set white background for better visibility
    context.fillStyle = 'rgba(255, 255, 255, 0.95)';
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    // Add pink border
    context.strokeStyle = 'rgba(255, 107, 157, 1.0)';
    context.lineWidth = 6;
    context.strokeRect(15, 15, canvas.width - 30, canvas.height - 30);
    
    // Set text style with maximum sharpness
    context.fillStyle = '#FF6B9D'; // Pink text for contrast
    context.font = 'bold 80px Arial, sans-serif'; // Smaller font for smaller card
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    
    // Add dark shadow for pink text on white background
    context.shadowColor = 'rgba(0, 0, 0, 0.3)';
    context.shadowBlur = 4;
    context.shadowOffsetX = 3;
    context.shadowOffsetY = 3;
    
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

    // Add decorations for tier 3 (top tier) - cherries and frosting
    const tier3Cherries = [];
    const tier3Frosting = [];
    const tier3TotalCount = 16; // Total decorations (8 cherries + 8 frosting) - appropriate for smaller top tier
    
    for (let i = 0; i < tier3TotalCount; i++) {
      const angle = (i / tier3TotalCount) * Math.PI * 2; // Evenly spaced around the circle
      const radius = 2.5 + 0.2; // Slightly outside the top tier radius
      
      if (i % 2 === 0) {
        // Add cherry every other position
        const cherry = createCherry();
        cherry.position.x = Math.cos(angle) * radius;
        cherry.position.z = Math.sin(angle) * radius;
        cherry.position.y = 1.2; // Lower position, closer to top tier surface
        
        // Add slight random variation for natural look
        cherry.position.x += (Math.random() - 0.5) * 0.1;
        cherry.position.z += (Math.random() - 0.5) * 0.1;
        cherry.position.y += (Math.random() - 0.5) * 0.05;
        
        // Random rotation for variety
        cherry.rotation.y = Math.random() * Math.PI * 2;
        
        tier3Cherries.push(cherry);
        cakeGroup.add(cherry);
      } else {
        // Add frosting every other position
        const frosting = createFrostingSwirl();
        frosting.position.x = Math.cos(angle) * radius;
        frosting.position.z = Math.sin(angle) * radius;
        frosting.position.y = 1; // Much lower position, very close to top tier surface
        
        // Add slight random variation
        frosting.position.x += (Math.random() - 0.5) * 0.08;
        frosting.position.z += (Math.random() - 0.5) * 0.08;
        frosting.position.y += (Math.random() - 0.5) * 0.03;
        
        frosting.castShadow = true;
        frosting.receiveShadow = true;
        tier3Frosting.push(frosting);
        cakeGroup.add(frosting);
      }
    }

    // Add 4 cute gift boxes on top tier near number "25"
    const topTierGifts = [];
    const giftPositions = [
      { x: -0.8, z: 0.6 },   // Near number "2"
      { x: 0.8, z: 0.6 },    // Near number "5" 
      { x: -0.6, z: -0.8 },  // Back left
      { x: 0.6, z: -0.8 }    // Back right
    ];
    
    // Define cute color palette for gift boxes (UI/UX optimized)
    const giftColors = [
      { box: 0xffb6c1, ribbon: 0xff69b4, bow: 0xff1493 }, // Soft pink set
      { box: 0xfff8dc, ribbon: 0xffd700, bow: 0xffa500 }, // Sunny yellow set  
      { box: 0xffd1dc, ribbon: 0xffc0cb, bow: 0xff91a4 }, // Pastel pink set
      { box: 0xe0e6ff, ribbon: 0xb6c1ff, bow: 0x9370db }  // Soft lavender set
    ];
    
    for (let i = 0; i < 4; i++) {
      const gift = createColoredGiftBox(giftColors[i]);
      gift.position.x = giftPositions[i].x;
      gift.position.z = giftPositions[i].z;
      gift.position.y = 2.25; // A bit higher above top tier surface
      
      // Scale for nice visibility
      gift.scale.set(1.2, 1.2, 1.2);
      
      // Add slight random variation for natural look
      gift.position.x += (Math.random() - 0.5) * 0.1;
      gift.position.z += (Math.random() - 0.5) * 0.1;
      gift.position.y += (Math.random() - 0.5) * 0.05;
      
      // Random rotation for variety
      gift.rotation.y = Math.random() * Math.PI * 2;
      
      topTierGifts.push(gift);
      cakeGroup.add(gift);
    }

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
        frosting.position.y = -0.35 + Math.sin(Date.now() * 0.0008 + i * 0.4) * 0.015; // Gentle bobbing
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
        frosting.position.y = -1.55 + Math.sin(Date.now() * 0.0006 + i * 0.3) * 0.02; // Gentle bobbing
        frosting.rotation.y += 0.0008; // Very slow rotation
      });

      // Animate tier 3 cherries with individual gentle motions
      tier3Cherries.forEach((cherry, i) => {
        cherry.rotation.y += 0.0018 + (i * 0.0002); // Slightly different rotation speeds
        cherry.position.y = 1.2 + Math.sin(Date.now() * 0.0009 + i * 0.5) * 0.02; // Gentle up-down motion
        cherry.rotation.z = Math.sin(Date.now() * 0.0011 + i * 0.3) * 0.035; // Gentle swaying
      });

      // Animate tier 3 frosting with gentle bobbing motion
      tier3Frosting.forEach((frosting, i) => {
        frosting.position.y = 1 + Math.sin(Date.now() * 0.0007 + i * 0.4) * 0.018; // Gentle bobbing
        frosting.rotation.y += 0.0009; // Very slow rotation
      });

      // Animate top tier gift boxes with individual gentle motions
      topTierGifts.forEach((gift, i) => {
        gift.rotation.y += 0.001 + (i * 0.0001); // Slightly different rotation speeds
        gift.position.y = 2.25 + Math.sin(Date.now() * 0.0007 + i * 0.6) * 0.02; // Gentle up-down motion
        gift.rotation.z = Math.sin(Date.now() * 0.0009 + i * 0.4) * 0.025; // Gentle swaying
      });

      // Shader flame animation for number candles
      const time = Date.now() * 0.001;
      if (flame2Front.material.uniforms) {
        flame2Front.material.uniforms.time.value = time;
      }
      if (flame2Back.material.uniforms) {
        flame2Back.material.uniforms.time.value = time;
      }
      if (flame5Front.material.uniforms) {
        flame5Front.material.uniforms.time.value = time;
      }
      if (flame5Back.material.uniforms) {
        flame5Back.material.uniforms.time.value = time;
      }

      renderer.render(scene, camera);
    }
    animate();

    // Enhanced smoke effect for blown candles
    function createSmokeEffect() {
      const smokeGeometry = new THREE.SphereGeometry(0.05, 8, 8);
      const smokeMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x888888,
        transparent: true,
        opacity: 0.6
      });
      
      const smokeParticles = [];
      
      // Create smoke for candle 2 (left)
      for (let i = 0; i < 6; i++) {
        const smoke = new THREE.Mesh(smokeGeometry, smokeMaterial.clone());
        smoke.position.set(
          -0.5 + (Math.random() - 0.5) * 0.1, // Updated position
          3.3 + Math.random() * 0.2, // Lower position
          (Math.random() - 0.5) * 0.1
        );
        smoke.scale.setScalar(0.4 + Math.random() * 0.4);
        smokeParticles.push(smoke);
        cakeGroup.add(smoke);
      }
      
      // Create smoke for candle 5 (right)
      for (let i = 0; i < 6; i++) {
        const smoke = new THREE.Mesh(smokeGeometry, smokeMaterial.clone());
        smoke.position.set(
          0.5 + (Math.random() - 0.5) * 0.1, // Updated position
          3.3 + Math.random() * 0.2, // Lower position
          (Math.random() - 0.5) * 0.1
        );
        smoke.scale.setScalar(0.4 + Math.random() * 0.4);
        smokeParticles.push(smoke);
        cakeGroup.add(smoke);
      }
      
      return smokeParticles;
    }

    // Return control functions
    return {
      showFlame: () => {
        flame2Front.visible = true;
        flame2Back.visible = true;
        flame5Front.visible = true;
        flame5Back.visible = true;
      },
      hideFlame: () => {
        flame2Front.visible = false;
        flame2Back.visible = false;
        flame5Front.visible = false;
        flame5Back.visible = false;
      },
      createSmoke: createSmokeEffect,
      group: cakeGroup,
      flames: flames
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
    { label: 'Happy Birthday', run: () => { 
      message.classList.add('show'); 
      // Show photo frames with slight delay for better effect
      setTimeout(() => {
        const photoFrames = document.getElementById('photoFrames');
        if (photoFrames) photoFrames.classList.add('show');
      }, 500);
      triggerConfetti(); 
      hideButtonsAfterFinal(); 
    } },
  ];

  // Update steps array
  steps.length = 0;
  steps.push(...originalSteps);

})();


