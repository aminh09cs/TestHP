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


    // Smooth candle with high resolution
    const candleGeometry = new THREE.CylinderGeometry(0.12, 0.12, 1.5, 32); // Increased from 16 to 32
    const candleMaterial = new THREE.MeshLambertMaterial({ 
      color: 0xff6b9d,
      flatShading: false
    });
    const candle = new THREE.Mesh(candleGeometry, candleMaterial);
    candle.position.y = 2.45;
    candle.castShadow = true;
    candle.receiveShadow = true;
    cakeGroup.add(candle);

    // Smooth flame with higher resolution
    const flameGeometry = new THREE.SphereGeometry(0.18, 16, 12); // Increased resolution
    const flameMaterial = new THREE.MeshBasicMaterial({ 
      color: 0xffeb3b,
      transparent: true,
      opacity: 0
    });
    const flame = new THREE.Mesh(flameGeometry, flameMaterial);
    flame.position.y = 3.4;
    flame.scale.y = 1.5;
    cakeGroup.add(flame);

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


