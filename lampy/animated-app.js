/**
 * LAMPY - ANIMATED VIEWER
 * Animation playback for lamp components
 * Absurd Industries | Open-Source Hardware Guild
 */

// ============================================
// EASING FUNCTIONS (Native Implementation)
// ============================================
const Easings = {
  linear: (t) => t,

  easeInOutCubic: (t) => {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  },

  easeOutCubic: (t) => {
    return 1 - Math.pow(1 - t, 3);
  },

  easeInCubic: (t) => {
    return t * t * t;
  },

  easeInOutQuad: (t) => {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  },

  easeOutElastic: (t) => {
    const c4 = (2 * Math.PI) / 3;
    return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
  },
};

// ============================================
// CONFIGURATION
// ============================================
const PARTS_TO_LOAD = [
  {
    file: "../3d-files/base.obj",
    name: "Base",
    components: {
      node: { material: "plastic", color: "off-white" },
    },
  },
  {
    file: "../3d-files/lampy-mag-bottom-wider.obj",
    name: "Mag Bottom",
    components: {
      node: { material: "plastic", color: "off-white" },
    },
  },
  {
    file: "../3d-files/lampy-mag-insert-fillet.obj",
    name: "Mag Insert",
    components: {
      node: { material: "plastic", color: "off-white" },
    },
  },
  {
    file: "../3d-files/lampy.obj",
    name: "Lampy Main",
    components: {
      node: { material: "paper", color: "off-white" },
    },
  },
  {
    file: "../3d-files/connector.obj",
    name: "Connector",
    components: {
      housing: { material: "plastic", color: "dark-gray" },
      magnet: { material: "metal", color: "steel" },
      pin: { material: "metal", color: "gold" },
    },
  },
  {
    file: "../3d-files/connector-pins.obj",
    name: "Connector Pins",
    components: {
      housing: { material: "plastic", color: "dark-gray" },
      magnet: { material: "metal", color: "steel" },
      pin: { material: "metal", color: "gold" },
    },
  },
  { file: "../3d-files/XIAO-ESP32C3.obj", name: "XIAO ESP32C3" },
];

const SPACING = 15; // Default spacing (will be overridden by animation config)

// ============================================
// STATE MANAGEMENT
// ============================================
const AppState = {
  scene: null,
  camera: null,
  renderer: null,
  clock: null,
  partsGroup: null,
  loadedParts: [],

  // Animation State
  animationConfig: null,
  isPlaying: false,
  isPaused: false,
  animationProgress: 0, // 0 to 1
  animationStartTime: null,

  // Start and End States
  startState: null,
  endState: null,
};

// ============================================
// DOM ELEMENTS
// ============================================
const DOM = {
  loadingScreen: null,
  loadingMessage: null,
  loadingBar: null,
  loadingPercentage: null,
  canvasContainer: null,
  animationControls: null,
  playPauseBtn: null,
  progressBar: null,
  progressText: null,
  footerCredit: null,
};

// ============================================
// INITIALIZATION
// ============================================
function init() {
  console.log("🚀 Lampy Animated Viewer");
  cacheDOMElements();

  // Load animation config
  loadAnimationConfig()
    .then((config) => {
      if (!config) {
        showError("No animation config found! Please create one in the editor first.");
        return;
      }

      AppState.animationConfig = config;
      AppState.startState = config.states.start;
      AppState.endState = config.states.end;

      console.log("✓ Animation config loaded:", config);

      initThreeJS();
      loadAllParts();
      setupEventListeners();
      animate();
    })
    .catch((error) => {
      console.error("❌ Error during initialization:", error);
      showError("Failed to load animation config. Check console for details.");
    });
}

// ============================================
// DOM ELEMENT CACHING
// ============================================
function cacheDOMElements() {
  DOM.loadingScreen = document.getElementById("loading-screen");
  DOM.loadingMessage = document.getElementById("loading-message");
  DOM.loadingBar = document.getElementById("loading-bar");
  DOM.loadingPercentage = document.getElementById("loading-percentage");
  DOM.canvasContainer = document.getElementById("canvas-container");
  DOM.animationControls = document.getElementById("animation-controls");
  DOM.playPauseBtn = document.getElementById("play-pause-btn");
  DOM.progressBar = document.getElementById("progress-bar");
  DOM.progressText = document.getElementById("progress-text");
  DOM.footerCredit = document.getElementById("footer-credit");
}

// ============================================
// LOADING UI HELPERS
// ============================================
function updateLoadingProgress(progress, message) {
  DOM.loadingBar.style.width = progress + "%";
  DOM.loadingPercentage.textContent = progress + "%";
  if (message) {
    DOM.loadingMessage.textContent = message;
  }
}

function hideLoadingScreen() {
  DOM.loadingScreen.classList.add("hidden");
  DOM.animationControls.classList.remove("hidden");
  DOM.footerCredit.classList.remove("hidden");
}

function showError(message) {
  DOM.loadingMessage.textContent = "⚠️ " + message;
  DOM.loadingBar.style.backgroundColor = "#dc2626";
  console.error("❌ " + message);
}

// ============================================
// ANIMATION CONFIG LOADING
// ============================================
async function loadAnimationConfig() {
  // Try to load from file first
  try {
    const response = await fetch("./transforms-animation-config.json");
    if (response.ok) {
      const config = await response.json();
      console.log("✓ Loaded animation config from file");
      return config;
    }
  } catch (e) {
    console.warn("⚠️ Could not load animation config from file, trying localStorage...");
  }

  // Fallback to localStorage
  const savedConfig = localStorage.getItem("lampy_anim_config");
  if (savedConfig) {
    try {
      const config = JSON.parse(savedConfig);
      console.log("✓ Loaded animation config from localStorage");
      return config;
    } catch (e) {
      console.error("❌ Error parsing localStorage animation config:", e);
    }
  }

  return null;
}

// ============================================
// THREE.JS INITIALIZATION
// ============================================
function initThreeJS() {
  updateLoadingProgress(10, "Setting up 3D scene...");

  // Scene
  AppState.scene = new THREE.Scene();
  AppState.scene.background = new THREE.Color(0x333333);

  // Camera - use settings from config if available, otherwise use defaults
  const cameraFov = AppState.animationConfig?.camera?.fov || 60;
  AppState.camera = new THREE.PerspectiveCamera(cameraFov, window.innerWidth / window.innerHeight, 0.1, 1000);

  // Apply camera position from config
  if (AppState.animationConfig?.camera?.position) {
    const camPos = AppState.animationConfig.camera.position;
    AppState.camera.position.set(camPos.x, camPos.y, camPos.z);
    console.log(`✓ Applied camera position from config: (${camPos.x}, ${camPos.y}, ${camPos.z})`);
  } else {
    AppState.camera.position.set(0, 20, 50);
  }

  AppState.camera.lookAt(0, 0, 0);

  updateLoadingProgress(20, "Configuring renderer...");

  // Renderer
  AppState.renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false,
  });
  AppState.renderer.setSize(window.innerWidth, window.innerHeight);
  AppState.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  AppState.renderer.shadowMap.enabled = true;
  AppState.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  AppState.renderer.outputEncoding = THREE.sRGBEncoding;
  AppState.renderer.toneMapping = THREE.ACESFilmicToneMapping;
  AppState.renderer.toneMappingExposure = 0.85;

  DOM.canvasContainer.appendChild(AppState.renderer.domElement);

  updateLoadingProgress(30, "Adding lights...");

  // Load HDR environment
  loadHDREnvironment();

  // Lighting
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
  AppState.scene.add(ambientLight);

  const keyLight = new THREE.DirectionalLight(0xffffff, 0.8);
  keyLight.position.set(20, 30, 20);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.width = 2048;
  keyLight.shadow.mapSize.height = 2048;
  keyLight.shadow.camera.near = 0.5;
  keyLight.shadow.camera.far = 100;
  keyLight.shadow.camera.left = -50;
  keyLight.shadow.camera.right = 50;
  keyLight.shadow.camera.top = 50;
  keyLight.shadow.camera.bottom = -50;
  AppState.scene.add(keyLight);

  const fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
  fillLight.position.set(-20, 15, -15);
  AppState.scene.add(fillLight);

  updateLoadingProgress(40, "Creating ground plane...");

  // Ground plane
  const groundGeometry = new THREE.PlaneGeometry(200, 200);
  const groundMaterial = new THREE.ShadowMaterial({
    opacity: 0.15,
    color: 0x000000,
  });
  const ground = new THREE.Mesh(groundGeometry, groundMaterial);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -10;
  ground.receiveShadow = true;
  AppState.scene.add(ground);

  // Clock
  AppState.clock = new THREE.Clock();

  // Create group for all parts
  AppState.partsGroup = new THREE.Group();
  AppState.scene.add(AppState.partsGroup);

  updateLoadingProgress(50, "Scene ready!");
  console.log("✓ Three.js scene initialized");
}

// ============================================
// HDR ENVIRONMENT LOADING
// ============================================
function loadHDREnvironment() {
  if (typeof THREE.RGBELoader === "undefined") {
    console.warn("⚠️ RGBELoader not found - skipping HDR environment");
    return;
  }

  const rgbeLoader = new THREE.RGBELoader();
  rgbeLoader.load(
    "https://threejs.org/examples/textures/equirectangular/royal_esplanade_1k.hdr",
    (texture) => {
      texture.mapping = THREE.EquirectangularReflectionMapping;
      AppState.scene.environment = texture;
      console.log("✓ HDR environment loaded");
    },
    undefined,
    (error) => {
      console.warn("⚠️ Could not load HDR environment:", error);
    }
  );
}

// ============================================
// PARTS LOADING
// ============================================
async function loadAllParts() {
  updateLoadingProgress(55, "Loading parts...");

  if (typeof THREE.OBJLoader === "undefined") {
    console.error("❌ OBJLoader not found");
    return;
  }

  const loader = new THREE.OBJLoader();
  const totalParts = PARTS_TO_LOAD.length;
  let loadedCount = 0;

  for (let i = 0; i < totalParts; i++) {
    const partInfo = PARTS_TO_LOAD[i];
    const progressStart = 55;
    const progressEnd = 95;
    const progress = progressStart + (i / totalParts) * (progressEnd - progressStart);

    updateLoadingProgress(Math.round(progress), `Loading ${partInfo.name}... (${i + 1}/${totalParts})`);

    try {
      const part = await loadOBJ(loader, partInfo.file);

      // Apply materials
      applyMaterialsToPart(part, partInfo);

      // Setup and position part
      setupPart(part, partInfo.name);

      // Position along x-axis (default position)
      const xPosition = (i - (totalParts - 1) / 2) * SPACING;
      part.position.x = xPosition;

      AppState.partsGroup.add(part);
      AppState.loadedParts.push({ model: part, info: partInfo, index: i });

      loadedCount++;
      console.log(`✓ Loaded ${partInfo.name}`);
    } catch (error) {
      console.error(`❌ Error loading ${partInfo.name}:`, error);
    }
  }

  updateLoadingProgress(100, "All parts loaded!");

  // Apply START state to all parts (without applying group rotation)
  applyStateToScene(AppState.startState, false);

  // Apply initial scene rotation from config AFTER start state (so it doesn't get overwritten)
  if (AppState.animationConfig?.scene?.initialRotation) {
    const rot = AppState.animationConfig.scene.initialRotation;
    AppState.partsGroup.rotation.set(rot.x, rot.y, rot.z);
    console.log(`✓ Applied initial scene rotation from config: (${rot.x.toFixed(2)}, ${rot.y.toFixed(2)}, ${rot.z.toFixed(2)})`);
  }

  setTimeout(hideLoadingScreen, 500);
  console.log(`✓ Loaded ${loadedCount}/${totalParts} parts`);

  // Auto-start animation if mode is autoplay
  if (AppState.animationConfig.animation.mode === "autoplay") {
    setTimeout(() => startAnimation(), 1000);
  }
}

function loadOBJ(loader, path) {
  return new Promise((resolve, reject) => {
    loader.load(
      path,
      (object) => resolve(object),
      undefined,
      (error) => reject(error)
    );
  });
}

// ============================================
// MATERIAL APPLICATION
// ============================================
function applyMaterialsToPart(part, partInfo) {
  // Color definitions
  const colors = {
    "off-white": 0xf5f5f0,
    "dark-gray": 0x2a2a2a,
    steel: 0xb0b0b8,
    gold: 0xffd700,
    copper: 0xb87333,
  };

  // Material factory based on type and color
  function createMaterial(materialType, colorName) {
    const color = colors[colorName] || 0xcccccc;

    switch (materialType) {
      case "plastic":
        return new THREE.MeshStandardMaterial({
          color: color,
          roughness: 0.8,
          metalness: 0.0,
          envMapIntensity: 0.2,
        });

      case "metal":
        return new THREE.MeshStandardMaterial({
          color: color,
          metalness: 0.9,
          roughness: 0.2,
          envMapIntensity: 1.0,
        });

      case "paper":
        return new THREE.MeshStandardMaterial({
          color: color,
          roughness: 1.0,
          metalness: 0.0,
          envMapIntensity: 0.05,
        });

      default:
        return new THREE.MeshStandardMaterial({
          color: color,
          metalness: 0.5,
          roughness: 0.5,
        });
    }
  }

  // Default material for parts without component specifications
  const defaultMaterial = new THREE.MeshStandardMaterial({
    color: 0xcccccc,
    metalness: 0.5,
    roughness: 0.5,
  });

  part.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;

      // If part has component specifications, try to match by name
      if (partInfo.components) {
        const childName = child.name.toLowerCase();
        let materialApplied = false;

        // Check each component specification
        for (const [componentName, spec] of Object.entries(partInfo.components)) {
          if (childName.includes(componentName.toLowerCase())) {
            child.material = createMaterial(spec.material, spec.color);
            materialApplied = true;
            break;
          }
        }

        // If no specific component matched, use the "node" component if it exists
        if (!materialApplied && partInfo.components.node) {
          const spec = partInfo.components.node;
          child.material = createMaterial(spec.material, spec.color);
        } else if (!materialApplied) {
          child.material = defaultMaterial;
        }
      } else {
        // No component specifications, use default
        child.material = defaultMaterial;
      }
    }
  });
}

// ============================================
// PART SETUP
// ============================================
function setupPart(part, partName) {
  const box = new THREE.Box3().setFromObject(part);
  const center = box.getCenter(new THREE.Vector3());

  // Center the part
  part.position.set(-center.x, -center.y, -center.z);

  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z);
  const scale = 0.3;

  part.scale.multiplyScalar(scale);

  // Reset Y and Z to 0 after scaling to ensure alignment
  part.position.y = 0;
  part.position.z = 0;
}

// ============================================
// ANIMATION STATE APPLICATION
// ============================================
function applyStateToScene(state, applyGroupRotation = false) {
  if (!state) return;

  // Apply scene/parts group rotation (only if explicitly requested, otherwise use config.scene.initialRotation)
  if (applyGroupRotation && state.partsGroupRotation) {
    AppState.partsGroup.rotation.x = state.partsGroupRotation.x;
    AppState.partsGroup.rotation.y = state.partsGroupRotation.y;
    AppState.partsGroup.rotation.z = state.partsGroupRotation.z;
  }

  // Apply transforms to each part
  if (state.transforms) {
    AppState.loadedParts.forEach((partData) => {
      const partName = partData.info.name;
      const transform = state.transforms[partName];

      if (transform) {
        const part = partData.model;

        if (transform.position) {
          part.position.x = transform.position.x;
          part.position.y = transform.position.y;
          part.position.z = transform.position.z;
        }

        if (transform.rotation) {
          part.rotation.x = transform.rotation.x;
          part.rotation.y = transform.rotation.y;
          part.rotation.z = transform.rotation.z;
        }

        if (transform.scale !== undefined) {
          part.scale.set(transform.scale, transform.scale, transform.scale);
        }

        if (transform.visible !== undefined) {
          part.visible = transform.visible;
        }
      }
    });
  }
}

// ============================================
// ANIMATION INTERPOLATION
// ============================================
function interpolateStates(startState, endState, progress) {
  if (!startState || !endState) return;

  // Get easing function
  const easingName = AppState.animationConfig.animation.easing || "easeInOutCubic";
  const easingFunc = Easings[easingName] || Easings.easeInOutCubic;
  const easedProgress = easingFunc(progress);

  // Note: We do NOT interpolate scene/parts group rotation here
  // The scene rotation is set once from config.scene.initialRotation and stays fixed
  // Only individual part transforms are animated

  // Interpolate each part's transforms
  AppState.loadedParts.forEach((partData) => {
    const partName = partData.info.name;
    const startTransform = startState.transforms?.[partName];
    const endTransform = endState.transforms?.[partName];

    if (!startTransform || !endTransform) return;

    const part = partData.model;

    // Interpolate position
    if (startTransform.position && endTransform.position) {
      part.position.x = THREE.MathUtils.lerp(startTransform.position.x, endTransform.position.x, easedProgress);
      part.position.y = THREE.MathUtils.lerp(startTransform.position.y, endTransform.position.y, easedProgress);
      part.position.z = THREE.MathUtils.lerp(startTransform.position.z, endTransform.position.z, easedProgress);
    }

    // Interpolate rotation using quaternions for smooth rotation
    if (startTransform.rotation && endTransform.rotation) {
      const startQuat = new THREE.Quaternion().setFromEuler(
        new THREE.Euler(startTransform.rotation.x, startTransform.rotation.y, startTransform.rotation.z)
      );
      const endQuat = new THREE.Quaternion().setFromEuler(
        new THREE.Euler(endTransform.rotation.x, endTransform.rotation.y, endTransform.rotation.z)
      );

      const currentQuat = new THREE.Quaternion();
      currentQuat.slerpQuaternions(startQuat, endQuat, easedProgress);
      part.rotation.setFromQuaternion(currentQuat);
    }

    // Interpolate scale
    if (startTransform.scale !== undefined && endTransform.scale !== undefined) {
      const scale = THREE.MathUtils.lerp(startTransform.scale, endTransform.scale, easedProgress);
      part.scale.set(scale, scale, scale);
    }

    // Handle visibility (switch at 50% progress)
    if (startTransform.visible !== undefined && endTransform.visible !== undefined) {
      part.visible = easedProgress < 0.5 ? startTransform.visible : endTransform.visible;
    }
  });
}

// ============================================
// ANIMATION CONTROL
// ============================================
function startAnimation() {
  AppState.isPlaying = true;
  AppState.isPaused = false;
  AppState.animationStartTime = Date.now();
  DOM.playPauseBtn.textContent = "PAUSE";
  console.log("▶️ Animation started");
}

function pauseAnimation() {
  AppState.isPaused = true;
  AppState.isPlaying = false;
  DOM.playPauseBtn.textContent = "PLAY";
  console.log("⏸️ Animation paused");
}

function togglePlayPause() {
  if (AppState.isPlaying && !AppState.isPaused) {
    pauseAnimation();
  } else {
    // Resume or restart
    if (AppState.animationProgress >= 1) {
      // Restart from beginning
      AppState.animationProgress = 0;
    }
    AppState.animationStartTime = Date.now() - (AppState.animationProgress * AppState.animationConfig.animation.duration);
    startAnimation();
  }
}

function updateAnimation() {
  if (!AppState.isPlaying || AppState.isPaused) return;

  const duration = AppState.animationConfig.animation.duration;
  const elapsed = Date.now() - AppState.animationStartTime;

  AppState.animationProgress = Math.min(elapsed / duration, 1);

  // Interpolate between states
  interpolateStates(AppState.startState, AppState.endState, AppState.animationProgress);

  // Update UI
  const progressPercent = Math.round(AppState.animationProgress * 100);
  DOM.progressBar.style.width = progressPercent + "%";
  DOM.progressText.textContent = progressPercent + "%";

  // Check if animation is complete
  if (AppState.animationProgress >= 1) {
    if (AppState.animationConfig.animation.loop) {
      // Loop: restart from beginning
      AppState.animationProgress = 0;
      AppState.animationStartTime = Date.now();
      console.log("🔄 Animation looping");
    } else {
      // Stop at end
      pauseAnimation();
      console.log("✓ Animation complete");
    }
  }
}

// ============================================
// EVENT LISTENERS
// ============================================
function setupEventListeners() {
  // Play/Pause button
  DOM.playPauseBtn.addEventListener("click", togglePlayPause);

  // Window resize
  window.addEventListener("resize", onWindowResize);

  console.log("✓ Event listeners initialized");
}

// ============================================
// ANIMATION LOOP
// ============================================
function animate() {
  requestAnimationFrame(animate);

  // Update animation
  updateAnimation();

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
// START
// ============================================
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
