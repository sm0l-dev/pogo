/**
 * POGO PIN - THE HUMBLE CONNECTOR
 * Pure Vanilla JavaScript Edition
 * 
 * Absurd Industries | Open-Source Hardware Guild
 * No frameworks, no dependencies, just raw JavaScript power
 * (and Three.js because we're not COMPLETE masochists)
 */

// ============================================
// STATE MANAGEMENT (The Old-School Way™)
// ============================================
const AppState = {
    // Three.js Core
    scene: null,
    camera: null,
    renderer: null,
    clock: null,
    
    // Models
    connectorModel: null,
    pinsModel: null,
    currentModelObject: null,
    connectorGroup: null, // Group containing both halves
    
    // Control State
    rotationSpeed: 0.5,
    autoRotate: false,
    currentModel: 'connector',
    
    // Mouse/Touch Interaction
    isDragging: false,
    previousMousePosition: { x: 0, y: 0 },
    
    // Loading State
    loadingProgress: 0,
    
    // Animation State
    snapAnimation: {
        isPlaying: false,
        startTime: 0,
        duration: 2.0, // 2 seconds for the full snap
        playCount: 0
    }
};

// ============================================
// DOM ELEMENTS (Cache 'em all!)
// ============================================
const DOM = {
    loadingScreen: null,
    loadingMessage: null,
    loadingBar: null,
    loadingPercentage: null,
    controlsPanel: null,
    specsPanel: null,
    footerCredit: null,
    modelStatus: null,
    rotationSpeedInput: null,
    speedDisplay: null,
    autoRotateCheckbox: null,
    modelRadios: null,
    canvasContainer: null
};

// ============================================
// INITIALIZATION
// ============================================
function init() {
    console.log('🚀 Pogo Pin Viewer - Pure Vanilla Edition');
    
    // Cache DOM elements
    cacheDOMElements();
    
    // Initialize Three.js
    initThreeJS();
    
    // Load models
    loadModels();
    
    // Setup controls
    setupEventListeners();
    
    // Start animation loop
    animate();
}

// ============================================
// DOM ELEMENT CACHING
// ============================================
function cacheDOMElements() {
    DOM.loadingScreen = document.getElementById('loading-screen');
    DOM.loadingMessage = document.getElementById('loading-message');
    DOM.loadingBar = document.getElementById('loading-bar');
    DOM.loadingPercentage = document.getElementById('loading-percentage');
    DOM.controlsPanel = document.getElementById('controls-panel');
    DOM.specsPanel = document.getElementById('specs-panel');
    DOM.footerCredit = document.getElementById('footer-credit');
    DOM.modelStatus = document.getElementById('model-status');
    DOM.rotationSpeedInput = document.getElementById('rotation-speed');
    DOM.speedDisplay = document.getElementById('speed-display');
    DOM.autoRotateCheckbox = document.getElementById('auto-rotate');
    DOM.modelRadios = document.querySelectorAll('input[name="model-view"]');
    DOM.canvasContainer = document.getElementById('canvas-container');
}

// ============================================
// LOADING UI HELPERS
// ============================================
function updateLoadingProgress(progress, message) {
    AppState.loadingProgress = progress;
    DOM.loadingBar.style.width = progress + '%';
    DOM.loadingPercentage.textContent = progress + '%';
    if (message) {
        DOM.loadingMessage.textContent = message;
    }
}

function hideLoadingScreen() {
    DOM.loadingScreen.classList.add('hidden');
    DOM.controlsPanel.classList.remove('hidden');
    DOM.specsPanel.classList.remove('hidden');
    DOM.footerCredit.classList.remove('hidden');
    DOM.modelStatus.classList.remove('hidden');
}

// ============================================
// THREE.JS INITIALIZATION
// ============================================
function initThreeJS() {
    updateLoadingProgress(10, 'Setting up 3D scene...');
    
    // Scene
    AppState.scene = new THREE.Scene();
    AppState.scene.background = new THREE.Color(0xffffff);
    
    // Camera
    AppState.camera = new THREE.PerspectiveCamera(
        60,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
    );
    AppState.camera.position.set(0, 8, 25);
    AppState.camera.lookAt(0, 0, 0);
    
    updateLoadingProgress(20, 'Configuring renderer...');
    
    // Renderer with proper color management
    AppState.renderer = new THREE.WebGLRenderer({ 
        antialias: true,
        alpha: false
    });
    AppState.renderer.setSize(window.innerWidth, window.innerHeight);
    AppState.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    AppState.renderer.shadowMap.enabled = true;
    AppState.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    
    // COLOR MAGIC - This is what makes colors actually look like colors
    AppState.renderer.outputEncoding = THREE.sRGBEncoding;
    AppState.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    AppState.renderer.toneMappingExposure = 0.85; // Slightly reduce exposure for better balance
    
    DOM.canvasContainer.appendChild(AppState.renderer.domElement);
    
    updateLoadingProgress(30, 'Adding lights...');
    
    // Lighting - Three-point studio setup (REBALANCED for sRGB)
    // All values reduced ~50% to compensate for gamma correction brightness boost
    
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.0);
    AppState.scene.add(ambientLight);
    
    const keyLight = new THREE.DirectionalLight(0xffffff, 0.85);
    keyLight.position.set(0, 10, 10);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 50;
    keyLight.shadow.camera.left = -20;
    keyLight.shadow.camera.right = 20;
    keyLight.shadow.camera.top = 20;
    keyLight.shadow.camera.bottom = -20;
    keyLight.shadow.bias = -0.0001; // Reduce shadow artifacts
    AppState.scene.add(keyLight);
    
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.65);
    fillLight.position.set(-15, 10, -10);
    AppState.scene.add(fillLight);
    
    
    const rimLight = new THREE.DirectionalLight(0xffffff, 0.9);
    rimLight.position.set(0, -5, -15);
    AppState.scene.add(rimLight);
    
    const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0xfff, 0.2);
    AppState.scene.add(hemisphereLight);
    
    updateLoadingProgress(40, 'Creating ground plane...');
    
    // Ground plane for shadows
    const groundGeometry = new THREE.PlaneGeometry(100, 100);
    const groundMaterial = new THREE.ShadowMaterial({ 
        opacity: 0.15, // Slightly reduced for softer shadows in sRGB
        color: 0xfff
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -8;
    ground.receiveShadow = true;
    AppState.scene.add(ground);
    
    // Clock for animations
    AppState.clock = new THREE.Clock();
    
    updateLoadingProgress(50, 'Three.js ready!');
    console.log('✓ Three.js scene initialized with sRGB color management');
    console.log('✓ Lighting rebalanced for gamma correction');
}

// ============================================
// OBJ MODEL LOADING
// ============================================
async function loadModels() {
    updateLoadingProgress(60, 'Loading OBJ models...');
    
    // Check if OBJLoader exists
    if (typeof THREE.OBJLoader === 'undefined') {
        console.warn('⚠️ OBJLoader not found - using fallback');
        updateLoadingProgress(70, 'Creating fallback geometry...');
        await createFallbackModel();
        finishLoading();
        return;
    }
    
    const loader = new THREE.OBJLoader();
    
    try {
        // Load connector.obj
        updateLoadingProgress(65, 'Loading full connector assembly...');
        AppState.connectorModel = await loadOBJ(loader, './connector.obj');
        console.log('✓ Connector OBJ loaded');
        
        // Load connector-pins.obj (optional)
        try {
            updateLoadingProgress(80, 'Loading pogo pins...');
            AppState.pinsModel = await loadOBJ(loader, './connector-pins.obj');
            console.log('✓ Pins OBJ loaded');
        } catch (pinsError) {
            console.log('ℹ️ Pins model not found, using connector only');
            AppState.pinsModel = null;
        }
        
        // Apply materials to both models
        applyMaterialsToModel(AppState.connectorModel);
        setupModel(AppState.connectorModel);
        
        if (AppState.pinsModel) {
            applyMaterialsToModel(AppState.pinsModel);
            setupModel(AppState.pinsModel);
        }
        
        // Setup both connectors for snap animation
        if (AppState.connectorModel && AppState.pinsModel) {
            setupBothConnectors();
        } else {
            // Fallback to single model
            AppState.scene.add(AppState.connectorModel);
            AppState.currentModelObject = AppState.connectorModel;
        }
        
        updateLoadingProgress(100, 'Models loaded!');
        console.log('✓ All models ready');
        
        setTimeout(finishLoading, 500);
        
    } catch (error) {
        console.error('❌ Error loading OBJ files:', error);
        updateLoadingProgress(75, 'Error loading OBJ - using fallback');
        await createFallbackModel();
        setTimeout(finishLoading, 1000);
    }
}

function loadOBJ(loader, path) {
    return new Promise((resolve, reject) => {
        loader.load(
            path,
            (object) => {
                console.log(`✓ Loaded ${path}`);
                resolve(object);
            },
            (progress) => {
                if (progress.lengthComputable) {
                    const percent = (progress.loaded / progress.total) * 100;
                    console.log(`Loading ${path}: ${percent.toFixed(2)}%`);
                }
            },
            (error) => {
                console.error(`Error loading ${path}:`, error);
                reject(error);
            }
        );
    });
}

// ============================================
// MATERIAL APPLICATION WITH UPGRADED MATERIALS
// ============================================
function applyMaterialsToModel(model) {
    const materials = {
        gold: new THREE.MeshStandardMaterial({
            color: 0xEFBF04,
            metalness: 0.65,
            roughness: 0.0,
            name: 'gold'
        }),
        silver: new THREE.MeshStandardMaterial({
            color: 0xd4d4d4, // Brighter silver for neodymium
            metalness: 0.9,
            roughness: 0.1,
            name: 'silver'
        }),
        black_abs: new THREE.MeshStandardMaterial({
            color: 0x1a1a1a,
            roughness: 0.9, // Matte finish
            metalness: 0.0, // No metalness for plastic
            name: 'black_abs'
        }),
        magnet: new THREE.MeshStandardMaterial({
            color: 0xc0c0c0, // Silver for neodymium
            metalness: 0.9,
            roughness: 0.1,
            name: 'magnet'
        }),
        default: new THREE.MeshStandardMaterial({
            color: 0xcccccc,
            metalness: 0.5,
            roughness: 0.5,
            name: 'default'
        })
    };
    
    model.traverse((child) => {
        if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            
            const name = child.name.toLowerCase();
            
            // Gold for pin heads/contacts
            if (name.includes('plunger') || name.includes('pin') || name.includes('contact') || name.includes('head')) {
                child.material = materials.gold;
                console.log(`✓ Applied GOLD to: ${child.name}`);
            } 
            // Silver for magnets (neodymium)
            else if (name.includes('magnet') || name.includes('neo')) {
                child.material = materials.magnet;
                console.log(`✓ Applied SILVER (magnet) to: ${child.name}`);
            }
            // Black ABS matte for housing/body/plastic
            else if (name.includes('housing') || name.includes('base') || name.includes('body') || name.includes('plastic') || name.includes('case')) {
                child.material = materials.black_abs;
                console.log(`✓ Applied BLACK ABS to: ${child.name}`);
            }
            // Silver for tubes/springs
            else if (name.includes('tube') || name.includes('spring') || name.includes('barrel')) {
                child.material = materials.silver;
                console.log(`✓ Applied SILVER to: ${child.name}`);
            }
            else {
                child.material = materials.default;
                console.log(`ℹ️ Applied DEFAULT to: ${child.name}`);
            }
        }
    });
}

// ============================================
// MODEL SETUP WITH SNAP ANIMATION
// ============================================
function setupModel(model) {
    const box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    model.position.sub(center);
    
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const scale = 10 / maxDim;
    model.scale.multiplyScalar(scale);
    
    console.log(`Model bounds: ${size.x.toFixed(2)} x ${size.y.toFixed(2)} x ${size.z.toFixed(2)}`);
    console.log(`Applied scale: ${scale.toFixed(2)}`);
}

function setupBothConnectors() {
    // Create a group to hold both connector halves
    AppState.connectorGroup = new THREE.Group();
    
    // Position connectorModel on the left
    if (AppState.connectorModel) {
        AppState.connectorModel.position.set(0, 0, 0);
        AppState.connectorModel.rotation.y = Math.PI; // Flip it to face the connector
        AppState.connectorGroup.add(AppState.connectorModel);
    }
    
    // Position pinsModel on the right
    if (AppState.pinsModel) {
        AppState.pinsModel.position.set(0, 0, 8);
        AppState.connectorGroup.add(AppState.pinsModel);
    }
    
    AppState.scene.add(AppState.connectorGroup);
    AppState.currentModelObject = AppState.connectorGroup;
    
    // Start the snap animation after a brief delay
    setTimeout(() => {
        startSnapAnimation();
    }, 1000);
    
    console.log('✓ Both connectors positioned for SNAP animation');
}

function startSnapAnimation() {
    AppState.snapAnimation.isPlaying = true;
    AppState.snapAnimation.startTime = AppState.clock.getElapsedTime();
    AppState.snapAnimation.playCount++;
    console.log(`🎬 Starting SNAP animation #${AppState.snapAnimation.playCount}`);
}

// ============================================
// FALLBACK MODEL CREATION
// ============================================
async function createFallbackModel() {
    console.log('Creating fallback geometric model...');
    
    const group = new THREE.Group();
    
    const materials = {
        gold: new THREE.MeshStandardMaterial({
            color: 0xffd700,
            metalness: 0.95,
            roughness: 0.05
        }),
        silver: new THREE.MeshStandardMaterial({
            color: 0xc0c0c0,
            metalness: 0.85,
            roughness: 0.15
        }),
        black: new THREE.MeshStandardMaterial({
            color: 0x1a1a1a,
            roughness: 0.4,
            metalness: 0.1
        }),
        magnet: new THREE.MeshStandardMaterial({
            color: 0x505050,
            metalness: 0.9,
            roughness: 0.1
        })
    };
    
    // Housing
    const housingGeo = new THREE.BoxGeometry(15, 4, 0.8);
    const housing = new THREE.Mesh(housingGeo, materials.black);
    housing.castShadow = true;
    housing.receiveShadow = true;
    group.add(housing);
    
    // Three pins
    const pinPositions = [-2.54, 0, 2.54];
    
    pinPositions.forEach(xPos => {
        // Plunger
        const plungerGeo = new THREE.CylinderGeometry(0.35, 0.4, 2.5, 16);
        const plunger = new THREE.Mesh(plungerGeo, materials.gold);
        plunger.position.set(xPos, 3.5, 0);
        plunger.castShadow = true;
        group.add(plunger);
        
        // Body
        const bodyGeo = new THREE.CylinderGeometry(0.5, 0.5, 4, 16);
        const body = new THREE.Mesh(bodyGeo, materials.silver);
        body.position.set(xPos, 0, 0);
        body.castShadow = true;
        group.add(body);
        
        // Spring coils
        for (let i = 0; i < 6; i++) {
            const coilGeo = new THREE.TorusGeometry(0.28, 0.06, 8, 16);
            const coil = new THREE.Mesh(coilGeo, materials.silver);
            coil.position.set(xPos, 0.4 + i * 0.3, 0);
            coil.rotation.x = Math.PI / 2;
            group.add(coil);
        }
        
        // Bottom contact
        const contactGeo = new THREE.CylinderGeometry(0.4, 0.35, 1.2, 16);
        const contact = new THREE.Mesh(contactGeo, materials.gold);
        contact.position.set(xPos, -2.6, 0);
        contact.castShadow = true;
        group.add(contact);
    });
    
    // Magnets
    const magnetGeo = new THREE.CylinderGeometry(0.8, 0.8, 0.6, 16);
    [-6, 6].forEach(xPos => {
        const magnet = new THREE.Mesh(magnetGeo, materials.magnet);
        magnet.position.set(xPos, 0, 0);
        magnet.rotation.z = Math.PI / 2;
        magnet.castShadow = true;
        group.add(magnet);
    });
    
    AppState.scene.add(group);
    AppState.currentModelObject = group;
    AppState.connectorModel = group;
    
    console.log('✓ Fallback model created');
    return new Promise(resolve => setTimeout(resolve, 500));
}

// ============================================
// MODEL SWITCHING
// ============================================
function switchModel(modelType) {
    if (AppState.currentModelObject) {
        AppState.scene.remove(AppState.currentModelObject);
    }
    
    if (modelType === 'connector' && AppState.connectorModel) {
        AppState.scene.add(AppState.connectorModel);
        AppState.currentModelObject = AppState.connectorModel;
        console.log('Switched to full connector');
    } else if (modelType === 'pins' && AppState.pinsModel) {
        AppState.scene.add(AppState.pinsModel);
        AppState.currentModelObject = AppState.pinsModel;
        console.log('Switched to pins only');
    } else {
        AppState.scene.add(AppState.connectorModel);
        AppState.currentModelObject = AppState.connectorModel;
        console.log('Fallback to connector');
    }
}

// ============================================
// EVENT LISTENERS
// ============================================
function setupEventListeners() {
    // Rotation speed slider
    DOM.rotationSpeedInput.addEventListener('input', (e) => {
        AppState.rotationSpeed = parseFloat(e.target.value);
        DOM.speedDisplay.textContent = AppState.rotationSpeed + 'x';
    });
    
    // Auto rotate checkbox
    DOM.autoRotateCheckbox.addEventListener('change', (e) => {
        AppState.autoRotate = e.target.checked;
    });
    
    // Model radio buttons
    DOM.modelRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            if (e.target.checked) {
                AppState.currentModel = e.target.value;
                switchModel(e.target.value);
            }
        });
    });
    
    // Mouse controls
    setupMouseControls();
    
    // Window resize
    window.addEventListener('resize', onWindowResize);
    
    console.log('✓ Event listeners initialized');
}

// ============================================
// MOUSE/TOUCH CONTROLS
// ============================================
function setupMouseControls() {
    const canvas = AppState.renderer.domElement;
    
    // Mouse down
    canvas.addEventListener('mousedown', (e) => {
        AppState.isDragging = true;
        AppState.previousMousePosition = { x: e.clientX, y: e.clientY };
    });
    
    // Mouse move
    canvas.addEventListener('mousemove', (e) => {
        if (!AppState.isDragging || !AppState.currentModelObject) return;
        
        const deltaX = e.clientX - AppState.previousMousePosition.x;
        const deltaY = e.clientY - AppState.previousMousePosition.y;
        
        AppState.currentModelObject.rotation.y += deltaX * 0.01;
        AppState.currentModelObject.rotation.x += deltaY * 0.01;
        
        AppState.previousMousePosition = { x: e.clientX, y: e.clientY };
    });
    
    // Mouse up
    canvas.addEventListener('mouseup', () => {
        AppState.isDragging = false;
    });
    
    // Mouse leave
    canvas.addEventListener('mouseleave', () => {
        AppState.isDragging = false;
    });
    
    // Touch start
    canvas.addEventListener('touchstart', (e) => {
        if (e.touches.length === 1) {
            AppState.isDragging = true;
            AppState.previousMousePosition = {
                x: e.touches[0].clientX,
                y: e.touches[0].clientY
            };
        }
    });
    
    // Touch move
    canvas.addEventListener('touchmove', (e) => {
        if (!AppState.isDragging || !AppState.currentModelObject || e.touches.length !== 1) return;
        
        e.preventDefault();
        
        const deltaX = e.touches[0].clientX - AppState.previousMousePosition.x;
        const deltaY = e.touches[0].clientY - AppState.previousMousePosition.y;
        
        AppState.currentModelObject.rotation.y += deltaX * 0.01;
        AppState.currentModelObject.rotation.x += deltaY * 0.01;
        
        AppState.previousMousePosition = {
            x: e.touches[0].clientX,
            y: e.touches[0].clientY
        };
    }, { passive: false });
    
    // Touch end
    canvas.addEventListener('touchend', () => {
        AppState.isDragging = false;
    });
    
    console.log('✓ Mouse controls initialized');
}

// ============================================
// ANIMATION LOOP WITH SNAP ANIMATION
// ============================================
function animate() {
    requestAnimationFrame(animate);
    
    const delta = AppState.clock.getDelta();
    const elapsedTime = AppState.clock.getElapsedTime();
    
    // Handle snap animation
    if (AppState.snapAnimation.isPlaying && AppState.connectorModel && AppState.pinsModel) {
        const animTime = elapsedTime - AppState.snapAnimation.startTime;
        const progress = Math.min(animTime / AppState.snapAnimation.duration, 1);
        
        // Easing function for smooth snap (ease-in-out)
        const easeInOutCubic = (t) => {
            return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
        };
        
        const easedProgress = easeInOutCubic(progress);
        
        // Animation positions
        const start = 8;      // Starting position (far away)
        const approach = 5.3; // Final snapped position
        
        // ANIMATION PHASES:
        // 0.0 - 0.6: APPROACH (connector moves in)
        // 0.6 - 0.7: HOLD (dramatic pause at connection)
        // 0.7 - 1.0: DISCONNECT (connector pulls away)
        
        if (progress < 0.6) {
            // Phase 1: APPROACH (60% of animation)
            const approachProgress = progress / 0.6;
            AppState.pinsModel.position.z = start - (start - approach) * easeInOutCubic(approachProgress);
        } else if (progress < 0.7) {
            // Phase 2: HOLD at connected position (10% of animation)
            AppState.pinsModel.position.z = approach;
        } else {
            // Phase 3: DISCONNECT (30% of animation)
            const disconnectProgress = (progress - 0.7) / 0.3;
            AppState.pinsModel.position.z = approach + (start - approach) * easeInOutCubic(disconnectProgress);
        }
        
        // End animation and loop it
        if (progress >= 1) {
            AppState.snapAnimation.isPlaying = false;
            console.log('✓ SNAP cycle complete! Disconnected. Looping in 2 seconds...');
            
            // Reset and restart after delay
            setTimeout(() => {
                AppState.pinsModel.position.z = start;
                startSnapAnimation();
            }, 2000);
        }
    }
    
    // Auto-rotate (disabled during snap animation for better view)
    if (AppState.autoRotate && AppState.currentModelObject && !AppState.isDragging && !AppState.snapAnimation.isPlaying) {
        AppState.currentModelObject.rotation.y += delta * AppState.rotationSpeed;
    }
    
    // Subtle floating animation
    if (AppState.currentModelObject && !AppState.isDragging) {
        const time = AppState.clock.getElapsedTime();
        AppState.currentModelObject.position.y = Math.sin(time * 0.5) * 0.3;
    }
    
    // Render
    AppState.renderer.render(AppState.scene, AppState.camera);
}

// ============================================
// WINDOW RESIZE
// ============================================
function onWindowResize() {
    AppState.camera.aspect = window.innerWidth / window.innerHeight;
    AppState.camera.updateProjectionMatrix();
    AppState.renderer.setSize(window.innerWidth, window.innerHeight);
}

// ============================================
// FINISH LOADING
// ============================================
function finishLoading() {
    hideLoadingScreen();
    console.log('🎉 Pogo Pin Viewer ready! (Pure Vanilla Edition)');
}

// ============================================
// START THE SHOW
// ============================================
// Wait for DOM to be ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}