// Game state
let scene, camera, renderer, vault3D, spotLight, vaultDoor, alarmLight, leftWall, rightWall, backWall;
let currentWord = '';
let playerInput = '';
let attemptsLeft = 2;
let gameWords = ['MONEY', 'STEAL', 'HEIST', 'VAULT', 'CRACK', 'GOLD', 'JEWEL', 'SAFE', 'THIEF', 'ALARM'];
let currentWordIndex = 0;

// Audio context and sounds
let audioContext;
let sounds = {
    keyPress: null,
    vaultOpen: null,
    alarm: null,
    success: null,
    background: null
};

// QWERTY keyboard layout
const qwertyKeys = [
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
    ['Z', 'X', 'C', 'V', 'B', 'N', 'M']
];

// Initialize the game
document.addEventListener('DOMContentLoaded', function() {
    initAudio();
    initThreeJS();
    initUI();
    createKeyboard();
    setupEventListeners();
});

function initAudio() {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    // Create sound effects
    createSounds();
}

function createSounds() {
    // Key press sound
    sounds.keyPress = createTone(800, 0.1, 'square');
    
    // Vault opening sound
    sounds.vaultOpen = createTone(200, 2, 'sawtooth');
    
    // Alarm sound
    sounds.alarm = createAlarmSound();
    
    // Success sound
    sounds.success = createSuccessSound();
}

function createTone(frequency, duration, type = 'sine') {
    return function() {
        if (audioContext.state === 'suspended') {
            audioContext.resume();
        }
        
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = frequency;
        oscillator.type = type;
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + duration);
    };
}

function createAlarmSound() {
    return function() {
        if (audioContext.state === 'suspended') {
            audioContext.resume();
        }
        
        const oscillator1 = audioContext.createOscillator();
        const oscillator2 = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator1.connect(gainNode);
        oscillator2.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator1.frequency.value = 800;
        oscillator2.frequency.value = 1000;
        oscillator1.type = 'square';
        oscillator2.type = 'square';
        
        gainNode.gain.setValueAtTime(0.4, audioContext.currentTime);
        
        const duration = 3;
        for (let i = 0; i < 10; i++) {
            const time = audioContext.currentTime + (i * 0.3);
            oscillator1.frequency.setValueAtTime(800 + (i % 2) * 200, time);
            oscillator2.frequency.setValueAtTime(1000 + (i % 2) * 200, time);
        }
        
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
        
        oscillator1.start(audioContext.currentTime);
        oscillator2.start(audioContext.currentTime);
        oscillator1.stop(audioContext.currentTime + duration);
        oscillator2.stop(audioContext.currentTime + duration);
    };
}

function createSuccessSound() {
    return function() {
        if (audioContext.state === 'suspended') {
            audioContext.resume();
        }
        
        const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
        
        notes.forEach((frequency, index) => {
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.value = frequency;
            oscillator.type = 'sine';
            
            const startTime = audioContext.currentTime + (index * 0.3);
            gainNode.gain.setValueAtTime(0.3, startTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.5);
            
            oscillator.start(startTime);
            oscillator.stop(startTime + 0.5);
        });
    };
}

function initThreeJS() {
    // Scene setup
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a1a); // Even darker background for more contrast

    // Camera setup - better positioned for UI overlay
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 7, 18); // Lowered camera from y=8 to y=7
    
    // Renderer setup
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    
    // Create canvas element with ID for styling
    renderer.domElement.id = 'gameCanvas';
    renderer.domElement.style.display = 'none'; // Hide initially
    document.body.appendChild(renderer.domElement);

    // Much more balanced lighting system
    const ambientLight = new THREE.AmbientLight(0x404040, 0.8); // Increased ambient light for better visibility
    scene.add(ambientLight);

    // Main spotlight on the vault - more intense for clarity
    spotLight = new THREE.SpotLight(0xffffff, 2.5, 100, Math.PI / 4, 0.3);
    spotLight.position.set(0, 15, 15);
    spotLight.castShadow = true;
    spotLight.shadow.mapSize.width = 2048;
    spotLight.shadow.mapSize.height = 2048;
    scene.add(spotLight);

    // Softer front light for better detail visibility
    const frontLight = new THREE.DirectionalLight(0xffffff, 1.2);
    frontLight.position.set(0, 10, 20);
    scene.add(frontLight);

    // Create 3D vault
    create3DVault();

    // Create environment
    createEnvironment();

    // Start animation loop
    animate();
    
    // Point camera at vault center
    camera.lookAt(new THREE.Vector3(0, 5, 0));
}

function create3DVault() {
    const vaultGroup = new THREE.Group();

    // Main vault body (better sized and positioned)
    const vaultGeometry = new THREE.BoxGeometry(8, 10, 6); // More reasonable size
    const vaultMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x4a5568,
        shininess: 200,
        emissive: 0x0a0a0f, // Subtle glow
        metalness: 0.9,
        roughness: 0.1
    });
    const vaultBody = new THREE.Mesh(vaultGeometry, vaultMaterial);
    vaultBody.position.y = 5; // Lower position
    vaultBody.castShadow = true;
    vaultBody.receiveShadow = true;
    
    // Add vault texture/details with rivets
    const edgeGeometry = new THREE.BoxGeometry(8.3, 10.3, 6.3);
    const edgeMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x2d3748,
        shininess: 150,
        emissive: 0x050508,
        metalness: 0.8,
        roughness: 0.2
    });
    const vaultEdge = new THREE.Mesh(edgeGeometry, edgeMaterial);
    vaultEdge.position.y = 5;
    vaultGroup.add(vaultEdge);
    vaultGroup.add(vaultBody);

    // Add decorative rivets around the vault
    for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 6; j++) {
            const rivetGeometry = new THREE.CylinderGeometry(0.08, 0.08, 0.1, 8);
            const rivetMaterial = new THREE.MeshPhongMaterial({ 
                color: 0x707070,
                shininess: 200 
            });
            const rivet = new THREE.Mesh(rivetGeometry, rivetMaterial);
            rivet.position.set(
                (i - 3.5) * 1,
                (j - 2.5) * 1.5 + 5,
                3.2
            );
            rivet.rotation.x = Math.PI / 2;
            vaultGroup.add(rivet);
        }
    }

    // Vault door (better sized and detailed)
    const doorGeometry = new THREE.BoxGeometry(6, 8, 1.2);
    const doorMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x2d3748,
        shininess: 300,
        emissive: 0x0a0a0f,
        metalness: 0.95,
        roughness: 0.05
    });
    vaultDoor = new THREE.Mesh(doorGeometry, doorMaterial);
    vaultDoor.position.set(0, 5, 3.7);
    vaultDoor.castShadow = true;
    
    // Door frame with better detail
    const frameGeometry = new THREE.BoxGeometry(6.8, 8.8, 0.6);
    const frameMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x1a202c,
        emissive: 0x050508,
        shininess: 200,
        metalness: 0.9,
        roughness: 0.1
    });
    const doorFrame = new THREE.Mesh(frameGeometry, frameMaterial);
    doorFrame.position.set(0, 5, 3.9);
    vaultGroup.add(doorFrame);
    vaultGroup.add(vaultDoor);

    // Remove the visible lock completely - make it invisible
    // Just add a tiny invisible placeholder if needed for animations
    const lockGeometry = new THREE.BoxGeometry(0.1, 0.1, 0.1);
    const lockMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x2d3748, // Same color as vault door
        shininess: 0,
        emissive: 0x000000,
        metalness: 0,
        transparent: true,
        opacity: 0 // Completely invisible
    });
    const mainLock = new THREE.Mesh(lockGeometry, lockMaterial);
    mainLock.position.set(-1.5, 5, 3.8); // Flush with door
    vaultDoor.add(mainLock);

    // Vault handle (professional wheel style)
    const handleGeometry = new THREE.TorusGeometry(0.9, 0.18, 8, 16);
    const handleMaterial = new THREE.MeshPhongMaterial({ 
        color: 0xffd700,
        shininess: 400,
        emissive: 0x221100,
        metalness: 0.85
    });
    const handle = new THREE.Mesh(handleGeometry, handleMaterial);
    handle.position.set(2.2, 4.3, 0.5); // RIGHT side of vault door, flush with surface
    handle.rotation.x = Math.PI / 2;
    vaultDoor.add(handle);

    // Handle spokes (more detailed)
    for (let i = 0; i < 6; i++) {
        const spokeGeometry = new THREE.BoxGeometry(0.12, 0.7, 0.12);
        const spoke = new THREE.Mesh(spokeGeometry, handleMaterial);
        const angle = (i / 6) * Math.PI * 2;
        spoke.position.set(Math.cos(angle) * 0.45, Math.sin(angle) * 0.45, 0);
        handle.add(spoke);
    }


    // Multiple smaller locks (much more subtle)
    for (let i = 0; i < 4; i++) {
        const smallLockGeometry = new THREE.CylinderGeometry(0.25, 0.25, 0.15, 12);
        const smallLockMaterial = new THREE.MeshPhongMaterial({ 
            color: 0x3a3a3a, // Darker color
            shininess: 50, // Reduced shininess
            emissive: 0x000000, // No emission
            metalness: 0.3 // Reduced metalness
        });
        const smallLock = new THREE.Mesh(smallLockGeometry, smallLockMaterial);
        smallLock.position.set((i - 1.5) * 0.8, 1, 1); // Reduced spacing from 1.2 to 0.8 (more centered)
        smallLock.rotation.x = Math.PI / 2;
        vaultDoor.add(smallLock);
        
        // Add very subtle small dial to each lock
        const smallDialGeometry = new THREE.CylinderGeometry(0.18, 0.18, 0.03, 12);
        const smallDialMaterial = new THREE.MeshPhongMaterial({ 
            color: 0x4a4a4a, // Much darker instead of gold
            shininess: 30 
        });
        const smallDial = new THREE.Mesh(smallDialGeometry, smallDialMaterial);
        smallDial.position.z = 0.1;
        smallLock.add(smallDial);
    }

    // Vault hinges (more realistic)
    for (let i = 0; i < 3; i++) {
        const hingeGeometry = new THREE.CylinderGeometry(0.25, 0.25, 1.2, 8);
        const hingeMaterial = new THREE.MeshPhongMaterial({ 
            color: 0x8a8a8a,
            emissive: 0x0a0a0a,
            shininess: 150,
            metalness: 0.8
        });
        const hinge = new THREE.Mesh(hingeGeometry, hingeMaterial);
        hinge.position.set(-3.5, 5 + (i - 1) * 2.5, 3.7);
        hinge.rotation.z = Math.PI / 2;
        vaultGroup.add(hinge);
        
        // Add hinge pin details
        const pinGeometry = new THREE.CylinderGeometry(0.1, 0.1, 1.4, 8);
        const pinMaterial = new THREE.MeshPhongMaterial({ color: 0x606060 });
        const pin = new THREE.Mesh(pinGeometry, pinMaterial);
        pin.position.copy(hinge.position);
        pin.rotation.z = Math.PI / 2;
        vaultGroup.add(pin);
    }

    // Alarm light (more prominent)
    const alarmGeometry = new THREE.SphereGeometry(0.35, 16, 16);
    const alarmMaterial = new THREE.MeshPhongMaterial({ 
        color: 0xff3333,
        emissive: 0x441111,
        transparent: true,
        opacity: 0.9,
        shininess: 300
    });
    alarmLight = new THREE.Mesh(alarmGeometry, alarmMaterial);
    alarmLight.position.set(0, 9.5, 4.2);
    vaultGroup.add(alarmLight);

    // Add alarm housing
    const alarmHousingGeometry = new THREE.CylinderGeometry(0.5, 0.5, 0.3, 8);
    const alarmHousingMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x333333,
        shininess: 100 
    });
    const alarmHousing = new THREE.Mesh(alarmHousingGeometry, alarmHousingMaterial);
    alarmHousing.position.set(0, 9.5, 4);
    alarmHousing.rotation.x = Math.PI / 2;
    vaultGroup.add(alarmHousing);

    vault3D = vaultGroup;
    scene.add(vault3D);
}

function createEnvironment() {
    // Floor (better texture)
    const floorGeometry = new THREE.PlaneGeometry(50, 50);
    const floorMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x404040,
        shininess: 80,
        transparent: true,
        opacity: 0.9
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // Walls (darker for better contrast)
    const wallMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x2a2a2a,
        shininess: 30 
    });
    
    // Back wall
    const backWallGeometry = new THREE.PlaneGeometry(50, 20);
    backWall = new THREE.Mesh(backWallGeometry, wallMaterial);
    backWall.position.set(0, 10, -10);
    scene.add(backWall);

    // Side walls
    const sideWallGeometry = new THREE.PlaneGeometry(20, 20);
    leftWall = new THREE.Mesh(sideWallGeometry, wallMaterial);
    leftWall.position.set(-15, 10, 0);
    leftWall.rotation.y = Math.PI / 2;
    scene.add(leftWall);

    rightWall = new THREE.Mesh(sideWallGeometry, wallMaterial);
    rightWall.position.set(15, 10, 0);
    rightWall.rotation.y = -Math.PI / 2;
    scene.add(rightWall);

    // Add some decorative elements
    createDecorativeElements();
}

function createDecorativeElements() {
    // Security cameras
    for (let i = 0; i < 2; i++) {
        const cameraGroup = new THREE.Group();
        
        const cameraGeometry = new THREE.BoxGeometry(0.5, 0.3, 0.8);
        const cameraMaterial = new THREE.MeshPhongMaterial({ color: 0x2c3e50 });
        const camera = new THREE.Mesh(cameraGeometry, cameraMaterial);
        cameraGroup.add(camera);
        
        const lensGeometry = new THREE.CylinderGeometry(0.1, 0.1, 0.2, 8);
        const lensMaterial = new THREE.MeshPhongMaterial({ color: 0x000000 });
        const lens = new THREE.Mesh(lensGeometry, lensMaterial);
        lens.position.z = 0.5;
        lens.rotation.x = Math.PI / 2;
        cameraGroup.add(lens);
        
        cameraGroup.position.set(i === 0 ? -8 : 8, 15, -8);
        cameraGroup.rotation.y = i === 0 ? Math.PI / 4 : -Math.PI / 4;
        scene.add(cameraGroup);
    }

    // Money bags (if vault is opened)
    const bagGeometry = new THREE.SphereGeometry(0.8, 8, 6);
    const bagMaterial = new THREE.MeshPhongMaterial({ color: 0x8b4513 });
    
    for (let i = 0; i < 3; i++) {
        const bag = new THREE.Mesh(bagGeometry, bagMaterial);
        bag.position.set((i - 1) * 2, 1, -3);
        bag.scale.y = 1.2;
        bag.visible = false; // Hidden until vault opens
        bag.userData = { type: 'money' };
        scene.add(bag);
    }
}

function animate() {
    requestAnimationFrame(animate);
    
    // Keep vault stationary and imposing
    // (removed rotation for stable view)
    
    // Update spotlight for subtle lighting
    const time = Date.now() * 0.001;
    spotLight.intensity = 2.3 + Math.sin(time * 2) * 0.3; // Brighter pulsing light for better visibility
    
    renderer.render(scene, camera);
}

function initUI() {
    selectRandomWord();
    updateWordDisplay();
    updateAttemptsDisplay();
}

function selectRandomWord() {
    currentWordIndex = Math.floor(Math.random() * gameWords.length);
    currentWord = gameWords[currentWordIndex];
    playerInput = '';
    updateWordInput();
}

function createKeyboard() {
    const keyboard = document.getElementById('keyboard');
    keyboard.innerHTML = '';
    
    qwertyKeys.forEach(row => {
        row.forEach(letter => {
            const key = document.createElement('button');
            key.className = 'key';
            key.textContent = letter;
            key.dataset.letter = letter;
            key.addEventListener('click', () => handleKeyPress(letter));
            keyboard.appendChild(key);
        });
    });
}

function setupEventListeners() {
    // Start button
    document.getElementById('startBtn').addEventListener('click', startGame);
    
    // Sound button
    document.getElementById('soundBtn').addEventListener('click', speakWord);
    
    // Submit button
    document.getElementById('submitBtn').addEventListener('click', submitGuess);
    
    // Clear button
    document.getElementById('clearBtn').addEventListener('click', clearInput);
    
    // Play again buttons
    document.getElementById('playAgainBtn').addEventListener('click', resetGame);
    document.getElementById('tryAgainBtn').addEventListener('click', resetGame);
    
    // Keyboard input
    document.addEventListener('keydown', (e) => {
        const letter = e.key.toUpperCase();
        if (letter.match(/[A-Z]/) && letter.length === 1) {
            handleKeyPress(letter);
        } else if (e.key === 'Enter') {
            submitGuess();
        } else if (e.key === 'Backspace') {
            clearInput();
        }
    });
    
    // Window resize
    window.addEventListener('resize', onWindowResize);
}

function startGame() {
    document.getElementById('startScreen').classList.add('hidden');
    document.getElementById('videoScreen').classList.remove('hidden');
    
    // Play the intro video
    playIntroVideo();
}

function playIntroVideo() {
    const video = document.getElementById('introVideo');
    const videoScreen = document.getElementById('videoScreen');
    const skipBtn = document.getElementById('skipVideoBtn');
    
    // Initialize audio context on user interaction
    if (audioContext && audioContext.state === 'suspended') {
        audioContext.resume();
    }
    
    // Ensure video is unmuted and volume is set
    video.muted = false;
    video.volume = 0.8; // Set to 80% volume
    
    // Try to play the video with sound
    const playPromise = video.play();
    
    if (playPromise !== undefined) {
        playPromise.then(() => {
            // Video started playing successfully
            console.log('Video playing with audio');
        }).catch(error => {
            // Auto-play with sound was prevented, try muted fallback
            console.log('Auto-play with sound prevented, trying muted:', error);
            video.muted = true;
            video.play().then(() => {
                console.log('Video playing muted');
                // Show message to user that they can unmute
                showUnmuteMessage();
            }).catch(err => {
                console.log('Video failed to play:', err);
            });
        });
    }
    
    // Handle video end
    video.addEventListener('ended', () => {
        startActualGame();
    });
    
    // Skip button event listener
    skipBtn.addEventListener('click', startActualGame);
    
    // Fallback: if video fails to load or play, start game after 5 seconds
    setTimeout(() => {
        if (video.paused || video.ended) {
            startActualGame();
        }
    }, 5000);
    
    // Allow user to skip video by clicking anywhere or unmute if muted
    videoScreen.addEventListener('click', function(e) {
        if (video.muted) {
            // First click unmutes the video
            video.muted = false;
            video.volume = 0.8;
            hideUnmuteMessage();
        } else {
            // Second click or if already unmuted, skip to game
            startActualGame();
        }
    });
    
    document.addEventListener('keydown', function skipVideo(e) {
        if (e.key === 'Enter' || e.key === ' ') {
            document.removeEventListener('keydown', skipVideo);
            startActualGame();
        }
    });
}

function showUnmuteMessage() {
    const overlay = document.querySelector('.video-overlay');
    const unmuteMsg = document.createElement('p');
    unmuteMsg.className = 'unmute-message';
    unmuteMsg.textContent = 'Click to unmute and hear audio';
    unmuteMsg.style.cssText = `
        color: #f1c40f;
        font-family: 'Bangers', cursive;
        font-size: 1.2rem;
        margin-top: 10px;
        text-shadow: 2px 2px 4px rgba(0,0,0,0.8);
        animation: pulse 1.5s infinite;
    `;
    overlay.appendChild(unmuteMsg);
}

function hideUnmuteMessage() {
    const unmuteMsg = document.querySelector('.unmute-message');
    if (unmuteMsg) {
        unmuteMsg.remove();
    }
}

function startActualGame() {
    // Hide video screen and show game screen
    document.getElementById('videoScreen').classList.add('hidden');
    document.getElementById('gameScreen').classList.remove('hidden');
    
    // Show the 3D canvas when game starts
    const gameCanvas = document.getElementById('gameCanvas');
    if (gameCanvas) {
        gameCanvas.style.display = 'block';
    }
    
    // Play ambient background sound
    playBackgroundMusic();
    
    // Camera animation to focus on vault
    animateCamera();
}

function playBackgroundMusic() {
    // Create subtle ambient background sound
    if (audioContext && audioContext.state === 'running') {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        const filter = audioContext.createBiquadFilter();
        
        oscillator.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 60; // Low frequency hum
        oscillator.type = 'sine';
        filter.type = 'lowpass';
        filter.frequency.value = 200;
        
        gainNode.gain.setValueAtTime(0.05, audioContext.currentTime); // Very quiet
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 300); // 5 minutes
    }
}

function animateCamera() {
    // Fixed camera position for better UI alignment
    camera.position.set(0, 8, 18); // Better positioning for clarity
    camera.lookAt(new THREE.Vector3(0, 5, 0)); // Fixed look target
}

function speakWord() {
    if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(currentWord);
        utterance.rate = 0.7;
        utterance.pitch = 1.2;
        utterance.volume = 0.8;
        
        // Add some robotic effect
        utterance.voice = speechSynthesis.getVoices().find(voice => 
            voice.name.includes('Microsoft') || voice.name.includes('Google')
        ) || speechSynthesis.getVoices()[0];
        
        speechSynthesis.speak(utterance);
        
        // Visual feedback
        const soundBtn = document.getElementById('soundBtn');
        soundBtn.style.transform = 'scale(0.95)';
        setTimeout(() => {
            soundBtn.style.transform = 'scale(1)';
        }, 200);
    } else {
        alert(`The word is: ${currentWord}`);
    }
}

function handleKeyPress(letter) {
    if (playerInput.length < currentWord.length) {
        playerInput += letter;
        updateWordInput();
        
        // Play key press sound
        if (sounds.keyPress) sounds.keyPress();
        
        // Visual feedback for key press
        const key = document.querySelector(`[data-letter="${letter}"]`);
        key.style.transform = 'scale(0.9)';
        setTimeout(() => {
            key.style.transform = 'scale(1)';
        }, 100);
    }
}

function clearInput() {
    playerInput = '';
    updateWordInput();
    resetKeyboardColors();
}

function updateWordInput() {
    const wordInputDiv = document.getElementById('wordInput');
    wordInputDiv.innerHTML = '';
    
    for (let i = 0; i < currentWord.length; i++) {
        const letterSlot = document.createElement('div');
        letterSlot.className = 'letter-slot';
        letterSlot.textContent = playerInput[i] || '';
        wordInputDiv.appendChild(letterSlot);
    }
}

function updateWordDisplay() {
    document.getElementById('currentWord').textContent = '?'.repeat(currentWord.length);
}

function updateAttemptsDisplay() {
    document.getElementById('attemptsLeft').textContent = attemptsLeft;
}

function submitGuess() {
    if (playerInput.length !== currentWord.length) {
        shakeVault();
        return;
    }
    
    const result = checkWord(playerInput, currentWord);
    updateKeyboardColors(result);
    
    if (playerInput === currentWord) {
        // Success!
        vaultSuccess();
    } else {
        attemptsLeft--;
        updateAttemptsDisplay();
        
        if (attemptsLeft <= 0) {
            // Game over
            gameOver();
        } else {
            // Try again
            shakeVault();
            setTimeout(() => {
                clearInput();
            }, 1000);
        }
    }
}

function checkWord(guess, target) {
    const result = [];
    const targetLetters = target.split('');
    const guessLetters = guess.split('');
    
    // First pass: mark correct positions
    for (let i = 0; i < guessLetters.length; i++) {
        if (guessLetters[i] === targetLetters[i]) {
            result[i] = 'correct';
            targetLetters[i] = null; // Mark as used
            guessLetters[i] = null;
        }
    }
    
    // Second pass: mark wrong positions and incorrect
    for (let i = 0; i < guessLetters.length; i++) {
        if (guessLetters[i] !== null) {
            const targetIndex = targetLetters.indexOf(guessLetters[i]);
            if (targetIndex !== -1) {
                result[i] = 'wrong-position';
                targetLetters[targetIndex] = null;
            } else {
                result[i] = 'incorrect';
            }
        }
    }
    
    return result;
}

function updateKeyboardColors(result) {
    for (let i = 0; i < playerInput.length; i++) {
        const letter = playerInput[i];
        const key = document.querySelector(`[data-letter="${letter}"]`);
        
        // Only update if the key doesn't already have a better status
        if (!key.classList.contains('correct')) {
            key.classList.remove('wrong-position', 'incorrect');
            key.classList.add(result[i]);
        }
    }
}

function resetKeyboardColors() {
    document.querySelectorAll('.key').forEach(key => {
        key.classList.remove('correct', 'wrong-position', 'incorrect');
    });
}

function shakeVault() {
    const vault = document.getElementById('vault');
    vault.style.animation = 'none';
    vault.offsetHeight; // Trigger reflow
    vault.style.animation = 'incorrectShake 0.5s ease';
    
    // Play error sound
    const errorSound = createTone(300, 0.5, 'sawtooth');
    errorSound();
    
    // Also shake 3D vault
    if (vault3D) {
        const originalPosition = vault3D.position.clone();
        const originalRotation = vault3D.rotation.clone();
        let shakeCount = 0;
        
        const shakeInterval = setInterval(() => {
            vault3D.position.x = originalPosition.x + (Math.random() - 0.5) * 0.3;
            vault3D.position.z = originalPosition.z + (Math.random() - 0.5) * 0.3;
            vault3D.rotation.z = originalRotation.z + (Math.random() - 0.5) * 0.1;
            shakeCount++;
            
            if (shakeCount > 15) {
                clearInterval(shakeInterval);
                vault3D.position.copy(originalPosition);
                vault3D.rotation.copy(originalRotation);
            }
        }, 50);
    }
}

function vaultSuccess() {
    // Play success sound
    if (sounds.success) sounds.success();
    
    // Open vault animation - realistic door opening
    if (vaultDoor) {
        const originalPosition = new THREE.Vector3(0, 5, 3.7); // Correct original position
        const targetPosition = new THREE.Vector3(-3.5, 5, 5.2); // Swing open to the left
        let progress = 0;
        
        const openAnimation = () => {
            progress += 0.015; // Slower opening animation
            
            // Door swings open
            vaultDoor.position.lerpVectors(originalPosition, targetPosition, progress);
            vaultDoor.rotation.y = -progress * Math.PI / 2; // 90-degree rotation
            
            // Handle rotates (only during opening animation)
            const handle = vaultDoor.children.find(child => 
                child.geometry instanceof THREE.TorusGeometry
            );
            if (handle && progress < 1) {
                handle.rotation.z += 0.08;
            }
            
            // Small lock rotates slightly
            const smallLock = vaultDoor.children.find(child => 
                child.geometry instanceof THREE.BoxGeometry && child.geometry.parameters.width === 0.8
            );
            if (smallLock && progress < 1) {
                smallLock.rotation.z += 0.05;
            }
            
            if (progress < 1) {
                requestAnimationFrame(openAnimation);
            } else {
                // Play vault opening sound
                if (sounds.vaultOpen) sounds.vaultOpen();
                
                // Show treasure
                showTreasure();
                
                // Wait longer before showing success screen
                setTimeout(() => {
                    document.getElementById('gameScreen').classList.add('hidden');
                    document.getElementById('successScreen').classList.remove('hidden');
                }, 100); // Wait 1 more second after vault opens
            }
        };
        openAnimation();
    }
}

function showTreasure() {
    // Create and show treasure inside vault
    const treasureGroup = new THREE.Group();

    // Gold bars
    const goldBarGeometry = new THREE.BoxGeometry(1, 0.5, 0.5);
    const goldBarMaterial = new THREE.MeshPhongMaterial({
        color: 0xffd700,
        shininess: 100,
        metalness: 0.8
    });

    for (let i = 0; i < 10; i++) {
        const goldBar = new THREE.Mesh(goldBarGeometry, goldBarMaterial);
        goldBar.position.set(
            (Math.random() - 0.5) * 2,
            (Math.random() * 2) + 0.25,
            (Math.random() - 0.5) * 2 - 1
        );
        goldBar.rotation.y = Math.random() * Math.PI;
        goldBar.castShadow = true;
        treasureGroup.add(goldBar);
    }

    // Piles of gold coins
    const coinGeometry = new THREE.CylinderGeometry(0.2, 0.2, 0.05, 12);
    const coinMaterial = new THREE.MeshPhongMaterial({
        color: 0xfec500,
        shininess: 150,
        metalness: 0.7
    });

    for (let i = 0; i < 50; i++) {
        const coin = new THREE.Mesh(coinGeometry, coinMaterial);
        coin.position.set(
            (Math.random() - 0.5) * 3,
            0.025,
            (Math.random() - 0.5) * 3
        );
        coin.rotation.y = Math.random() * Math.PI;
        coin.castShadow = true;
        treasureGroup.add(coin);
    }
    
    treasureGroup.position.y = 1; // Lift treasure slightly off floor
    treasureGroup.userData = { type: 'treasure' }; // Mark for easy removal
    scene.add(treasureGroup);

    // Add a light inside the vault to illuminate the treasure
    const treasureLight = new THREE.PointLight(0xffd700, 2, 10);
    treasureLight.position.set(0, 2, 0);
    treasureLight.castShadow = true;
    treasureGroup.add(treasureLight);
}

function gameOver() {
    // Play alarm sound
    if (sounds.alarm) sounds.alarm();
    
    // Alarm light animation
    let flashCount = 0;
    const alarmInterval = setInterval(() => {
        if (alarmLight) {
            alarmLight.material.emissive.setHex(flashCount % 2 === 0 ? 0xff0000 : 0x330000);
            alarmLight.material.emissiveIntensity = flashCount % 2 === 0 ? 1 : 0.2;
        }
        
        // Scene color flash
        scene.background = flashCount % 2 === 0 ? 
            new THREE.Color(0x330000) : new THREE.Color(0x1a1a2e);
        
        // Wall color flash
        if(leftWall && rightWall && backWall) {
            leftWall.material.color.set(flashCount % 2 === 0 ? 0xff0000 : 0x0000ff);
            rightWall.material.color.set(flashCount % 2 === 0 ? 0x0000ff : 0xff0000);
            backWall.material.color.set(flashCount % 2 === 0 ? 0xff0000 : 0x0000ff);
        }

        flashCount++;
        
        if (flashCount > 20) {
            clearInterval(alarmInterval);
            scene.background = new THREE.Color(0x1a1a2e);
            if (alarmLight) {
                alarmLight.material.emissive.setHex(0x330000);
                alarmLight.material.emissiveIntensity = 0.2;
            }
            if(leftWall && rightWall && backWall) {
                leftWall.material.color.set(0x2a2a2a);
                rightWall.material.color.set(0x2a2a2a);
                backWall.material.color.set(0x2a2a2a);
            }
            
            // Show failure screen
            document.getElementById('gameScreen').classList.add('hidden');
            document.getElementById('failureScreen').classList.remove('hidden');
        }
    }, 200);
    
    // Vault shaking animation
    if (vault3D) {
        const originalPosition = vault3D.position.clone();
        let shakeCount = 0;
        
        const shakeInterval = setInterval(() => {
            vault3D.position.x = originalPosition.x + (Math.random() - 0.5) * 0.3;
            vault3D.position.z = originalPosition.z + (Math.random() - 0.5) * 0.3;
            shakeCount++;
            
            if (shakeCount > 30) {
                clearInterval(shakeInterval);
                vault3D.position.copy(originalPosition);
            }
        }, 50);
    }
}

function resetGame() {
    // Reset game state
    attemptsLeft = 2;
    playerInput = '';
    
    // Remove treasure and treasure light from scene (not vault3D)
    const objectsToRemove = [];
    scene.traverse((child) => {
        if (child.userData && child.userData.type === 'treasure') {
            objectsToRemove.push(child);
        }
        // Also remove any treasure lights
        if (child instanceof THREE.PointLight && child.color && child.color.getHex() === 0xffd700) {
            objectsToRemove.push(child);
        }
    });
    
    objectsToRemove.forEach(obj => {
        if (obj.parent) {
            obj.parent.remove(obj);
        }
    });
    
    // Also ensure vaultDoor is visible and in correct position
    if (vaultDoor) {
        vaultDoor.visible = true;
        vaultDoor.position.set(0, 5, 3.7); // Correct original position
        vaultDoor.rotation.y = 0;
        
        // Reset handle rotation
        const handle = vaultDoor.children.find(child => 
            child.geometry instanceof THREE.TorusGeometry
        );
        if (handle) {
            handle.rotation.z = 0;
        }
    }
    
    // Reset alarm light
    if (alarmLight) {
        alarmLight.material.emissive.setHex(0x330000);
        alarmLight.material.emissiveIntensity = 0.2;
    }
    
    // Reset scene background to original color
    scene.background = new THREE.Color(0x0a0a1a);
    
    // Reset wall colors to original
    if (leftWall && rightWall && backWall) {
        leftWall.material.color.set(0x2a2a2a);
        rightWall.material.color.set(0x2a2a2a);
        backWall.material.color.set(0x2a2a2a);
    }
    
    // Select new word
    selectRandomWord();
    updateWordDisplay();
    updateAttemptsDisplay();
    resetKeyboardColors();
    
    // Reset camera to fixed position
    camera.position.set(0, 8, 18); // Better positioning
    camera.lookAt(new THREE.Vector3(0, 5, 0));
    
    // Reset input display
    document.getElementById('wordInput').textContent = '';
    
    // Hide success/failure screens and stay in game
    document.getElementById('successScreen').classList.add('hidden');
    document.getElementById('failureScreen').classList.add('hidden');
    document.getElementById('gameScreen').classList.remove('hidden');
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Preload speech synthesis voices
window.addEventListener('load', () => {
    if ('speechSynthesis' in window) {
        speechSynthesis.getVoices();
    }
});
