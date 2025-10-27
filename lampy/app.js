/**
 * LAMPY - MODULAR PARTS VIEWER
 * Simplified viewer for lamp components
 * Absurd Industries | Open-Source Hardware Guild
 */

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
  }, // plastic
  {
    file: "../3d-files/lampy-mag-bottom-wider.obj",
    name: "Mag Bottom",
    components: {
      node: { material: "plastic", color: "off-white" },
    },
  }, // plastic
  {
    file: "../3d-files/lampy-mag-insert-fillet.obj",
    name: "Mag Insert",
    components: {
      node: { material: "plastic", color: "off-white" },
    },
  }, // plastic
  {
    file: "../3d-files/lampy.obj",
    name: "Lampy Main",
    components: {
      node: { material: "paper", color: "off-white" },
    },
  }, // paper
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

const SPACING = 15; // Distance between parts along x-axis

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

  // Control State
  currentZoom: 50,
  minZoom: 20,
  maxZoom: 100,

  // Mouse Interaction
  isDragging: false,
  previousMousePosition: { x: 0, y: 0 },

  // Loading State
  loadingProgress: 0,
};

// ============================================
// DOM ELEMENTS
// ============================================
const DOM = {
  loadingScreen: null,
  loadingMessage: null,
  loadingBar: null,
  loadingPercentage: null,
  controlsPanel: null,
  footerCredit: null,
  modelStatus: null,
  partsCount: null,
  zoomSlider: null,
  canvasContainer: null,
  camX: null,
  camY: null,
  camZ: null,
  resetCamera: null,
  objectSelector: null,
  transformControls: null,
  posX: null,
  posY: null,
  posZ: null,
  rotX: null,
  rotY: null,
  rotZ: null,
  scale: null,
  visibilityToggle: null,
  resetTransform: null,
};

// ============================================
// INITIALIZATION
// ============================================
function init() {
  console.log("🚀 Lampy Parts Viewer");
  cacheDOMElements();
  initThreeJS();

  // Load and apply saved camera settings
  const cameraSettings = loadCameraSettings();
  if (cameraSettings) {
    applyCameraSettings(cameraSettings);
    console.log("✓ Applied saved camera settings");
  } else {
    updateCameraUI(); // Initialize UI with default camera position
  }

  loadAllParts();
  setupEventListeners();
  animate();
}

// ============================================
// DOM ELEMENT CACHING
// ============================================
function cacheDOMElements() {
  DOM.loadingScreen = document.getElementById("loading-screen");
  DOM.loadingMessage = document.getElementById("loading-message");
  DOM.loadingBar = document.getElementById("loading-bar");
  DOM.loadingPercentage = document.getElementById("loading-percentage");
  DOM.controlsPanel = document.getElementById("controls-panel");
  DOM.footerCredit = document.getElementById("footer-credit");
  DOM.modelStatus = document.getElementById("model-status");
  DOM.partsCount = document.getElementById("parts-count");
  DOM.zoomSlider = document.getElementById("zoom-slider");
  DOM.canvasContainer = document.getElementById("canvas-container");
  DOM.camX = document.getElementById("cam-x");
  DOM.camY = document.getElementById("cam-y");
  DOM.camZ = document.getElementById("cam-z");
  DOM.resetCamera = document.getElementById("reset-camera");
  DOM.objectSelector = document.getElementById("object-selector");
  DOM.transformControls = document.getElementById("transform-controls");
  DOM.posX = document.getElementById("pos-x");
  DOM.posY = document.getElementById("pos-y");
  DOM.posZ = document.getElementById("pos-z");
  DOM.rotX = document.getElementById("rot-x");
  DOM.rotY = document.getElementById("rot-y");
  DOM.rotZ = document.getElementById("rot-z");
  DOM.scale = document.getElementById("scale");
  DOM.visibilityToggle = document.getElementById("visibility-toggle");
  DOM.resetTransform = document.getElementById("reset-transform");
}

// ============================================
// LOADING UI HELPERS
// ============================================
function updateLoadingProgress(progress, message) {
  AppState.loadingProgress = progress;
  DOM.loadingBar.style.width = progress + "%";
  DOM.loadingPercentage.textContent = progress + "%";
  if (message) {
    DOM.loadingMessage.textContent = message;
  }
}

function hideLoadingScreen() {
  DOM.loadingScreen.classList.add("hidden");
  DOM.controlsPanel.classList.remove("hidden");
  DOM.footerCredit.classList.remove("hidden");
  DOM.modelStatus.classList.remove("hidden");
}

// ============================================
// LOCAL STORAGE MANAGEMENT
// ============================================
const STORAGE_KEY = "lampy_part_transforms";
const CAMERA_STORAGE_KEY = "lampy_camera_settings";

function saveTransforms() {
  const transforms = {};
  AppState.loadedParts.forEach((partData, index) => {
    const part = partData.model;
    transforms[partData.info.name] = {
      position: {
        x: part.position.x,
        y: part.position.y,
        z: part.position.z,
      },
      rotation: {
        x: part.rotation.x,
        y: part.rotation.y,
        z: part.rotation.z,
      },
      scale: part.scale.x, // Uniform scale, so we only need one value
      visible: part.visible,
    };
  });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(transforms));
  console.log("✓ Saved transforms to localStorage");
}

function loadTransforms() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      console.error("❌ Error parsing saved transforms:", e);
      return {};
    }
  }
  return {};
}

function applyTransform(part, transform) {
  if (transform) {
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
}

function saveCameraSettings() {
  const settings = {
    position: {
      x: AppState.camera.position.x,
      y: AppState.camera.position.y,
      z: AppState.camera.position.z,
    },
    zoom: AppState.currentZoom,
  };
  localStorage.setItem(CAMERA_STORAGE_KEY, JSON.stringify(settings));
  console.log("✓ Saved camera settings to localStorage");
}

function loadCameraSettings() {
  const saved = localStorage.getItem(CAMERA_STORAGE_KEY);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      console.error("❌ Error parsing saved camera settings:", e);
      return null;
    }
  }
  return null;
}

function applyCameraSettings(settings) {
  if (settings) {
    if (settings.position) {
      AppState.camera.position.set(settings.position.x, settings.position.y, settings.position.z);
    }
    if (settings.zoom !== undefined) {
      AppState.currentZoom = settings.zoom;
      AppState.camera.position.z = settings.zoom;
    }
    updateCameraUI();
  }
}

function updateCameraUI() {
  DOM.camX.value = AppState.camera.position.x.toFixed(1);
  DOM.camY.value = AppState.camera.position.y.toFixed(1);
  DOM.camZ.value = AppState.camera.position.z.toFixed(1);
  DOM.zoomSlider.value = AppState.currentZoom;
}

// ============================================
// THREE.JS INITIALIZATION
// ============================================
function initThreeJS() {
  updateLoadingProgress(10, "Setting up 3D scene...");

  // Scene
  AppState.scene = new THREE.Scene();
  AppState.scene.background = new THREE.Color(0x333333);

  // Camera
  AppState.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
  AppState.camera.position.set(0, 20, 50);
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

  // Load saved transforms
  const savedTransforms = loadTransforms();

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

      // Apply saved transform if exists
      if (savedTransforms[partInfo.name]) {
        applyTransform(part, savedTransforms[partInfo.name]);
        console.log(`✓ Applied saved transform for ${partInfo.name}`);
      }

      AppState.partsGroup.add(part);
      AppState.loadedParts.push({ model: part, info: partInfo, index: i });

      loadedCount++;
      console.log(`✓ Loaded ${partInfo.name} at x=${xPosition}`);
    } catch (error) {
      console.error(`❌ Error loading ${partInfo.name}:`, error);
    }
  }

  updateLoadingProgress(100, "All parts loaded!");
  DOM.partsCount.textContent = `${loadedCount} parts loaded`;

  // Populate object selector
  populateObjectSelector();

  setTimeout(hideLoadingScreen, 500);
  console.log(`✓ Loaded ${loadedCount}/${totalParts} parts`);
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
  // console.log(JSON.stringify(Object.keys(part)));
  // console.log(JSON.stringify(part));
  // console.log(partName);

  const box = new THREE.Box3().setFromObject(part);
  const center = box.getCenter(new THREE.Vector3());

  // Center the part but only along X axis
  // Keep Y and Z at 0 to align all parts
  part.position.set(-center.x, -center.y, -center.z);

  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z);

  // const scale = 10 / maxDim;
  const scale = 0.3;

  console.log(partName, maxDim, scale);

  part.scale.multiplyScalar(scale);

  // Reset Y and Z to 0 after scaling to ensure alignment
  part.position.y = 0;
  part.position.z = 0;
}

// ============================================
// OBJECT SELECTOR & TRANSFORM UI
// ============================================
function populateObjectSelector() {
  DOM.objectSelector.innerHTML = '<option value="">-- Select Part --</option>';
  AppState.loadedParts.forEach((partData, index) => {
    const option = document.createElement("option");
    option.value = index;
    option.textContent = partData.info.name;
    DOM.objectSelector.appendChild(option);
  });
}

function updateTransformUI(partData) {
  const part = partData.model;

  // Update position inputs
  DOM.posX.value = part.position.x.toFixed(2);
  DOM.posY.value = part.position.y.toFixed(2);
  DOM.posZ.value = part.position.z.toFixed(2);

  // Update rotation inputs (convert radians to degrees)
  DOM.rotX.value = ((part.rotation.x * 180) / Math.PI).toFixed(1);
  DOM.rotY.value = ((part.rotation.y * 180) / Math.PI).toFixed(1);
  DOM.rotZ.value = ((part.rotation.z * 180) / Math.PI).toFixed(1);

  // Update scale input
  DOM.scale.value = part.scale.x.toFixed(2);

  // Update visibility toggle
  DOM.visibilityToggle.checked = part.visible;

  // Show transform controls
  DOM.transformControls.classList.remove("hidden");
}

function getSelectedPart() {
  const index = parseInt(DOM.objectSelector.value);
  if (isNaN(index)) return null;
  return AppState.loadedParts[index];
}

function updatePartTransform() {
  const partData = getSelectedPart();
  if (!partData) return;

  const part = partData.model;

  // Update position
  part.position.x = parseFloat(DOM.posX.value) || 0;
  part.position.y = parseFloat(DOM.posY.value) || 0;
  part.position.z = parseFloat(DOM.posZ.value) || 0;

  // Update rotation (convert degrees to radians)
  part.rotation.x = ((parseFloat(DOM.rotX.value) || 0) * Math.PI) / 180;
  part.rotation.y = ((parseFloat(DOM.rotY.value) || 0) * Math.PI) / 180;
  part.rotation.z = ((parseFloat(DOM.rotZ.value) || 0) * Math.PI) / 180;

  // Update scale (uniform)
  const scaleValue = parseFloat(DOM.scale.value) || 1;
  part.scale.set(scaleValue, scaleValue, scaleValue);

  // Save to localStorage
  saveTransforms();
}

function togglePartVisibility() {
  const partData = getSelectedPart();
  if (!partData) return;

  const part = partData.model;
  part.visible = DOM.visibilityToggle.checked;

  // Save to localStorage
  saveTransforms();

  console.log(`✓ ${partData.info.name} visibility: ${part.visible}`);
}

function resetPartTransform() {
  const partData = getSelectedPart();
  if (!partData) return;

  const part = partData.model;
  const index = partData.index;

  // Reset to default position
  const xPosition = (index - (PARTS_TO_LOAD.length - 1) / 2) * SPACING;
  part.position.set(xPosition, 0, 0);
  part.rotation.set(0, 0, 0);
  part.scale.set(0.3, 0.3, 0.3); // Reset to default scale
  part.visible = true; // Reset visibility to visible

  // Update UI
  updateTransformUI(partData);

  // Save to localStorage
  saveTransforms();

  console.log(`✓ Reset ${partData.info.name} to default`);
}

// ============================================
// EVENT LISTENERS
// ============================================
function setupEventListeners() {
  // Zoom control
  DOM.zoomSlider.addEventListener("input", (e) => {
    AppState.currentZoom = parseFloat(e.target.value) || 50;
    AppState.camera.position.z = AppState.currentZoom;
    saveCameraSettings();
  });

  // Camera position controls
  DOM.camX.addEventListener("input", (e) => {
    AppState.camera.position.x = parseFloat(e.target.value) || 0;
    saveCameraSettings();
  });

  DOM.camY.addEventListener("input", (e) => {
    AppState.camera.position.y = parseFloat(e.target.value) || 0;
    saveCameraSettings();
  });

  DOM.camZ.addEventListener("input", (e) => {
    AppState.camera.position.z = parseFloat(e.target.value) || 0;
    AppState.currentZoom = AppState.camera.position.z;
    DOM.zoomSlider.value = AppState.currentZoom;
    saveCameraSettings();
  });

  // Reset camera button
  DOM.resetCamera.addEventListener("click", () => {
    AppState.camera.position.set(0, 20, 50);
    AppState.currentZoom = 50;
    updateCameraUI();
    saveCameraSettings();
    console.log("✓ Reset camera to default");
  });

  // Object selector
  DOM.objectSelector.addEventListener("change", (e) => {
    const partData = getSelectedPart();
    if (partData) {
      updateTransformUI(partData);
    } else {
      DOM.transformControls.classList.add("hidden");
    }
  });

  // Position controls
  DOM.posX.addEventListener("input", updatePartTransform);
  DOM.posY.addEventListener("input", updatePartTransform);
  DOM.posZ.addEventListener("input", updatePartTransform);

  // Rotation controls
  DOM.rotX.addEventListener("input", updatePartTransform);
  DOM.rotY.addEventListener("input", updatePartTransform);
  DOM.rotZ.addEventListener("input", updatePartTransform);

  // Scale control
  DOM.scale.addEventListener("input", updatePartTransform);

  // Visibility toggle
  DOM.visibilityToggle.addEventListener("change", togglePartVisibility);

  // Reset button
  DOM.resetTransform.addEventListener("click", resetPartTransform);

  // Mouse controls
  setupMouseControls();

  // Zoom controls
  setupZoomControls();

  // Window resize
  window.addEventListener("resize", onWindowResize);

  console.log("✓ Event listeners initialized");
}

// ============================================
// MOUSE CONTROLS
// ============================================
function setupMouseControls() {
  const canvas = AppState.renderer.domElement;

  canvas.addEventListener("mousedown", (e) => {
    AppState.isDragging = true;
    AppState.previousMousePosition = { x: e.clientX, y: e.clientY };
  });

  canvas.addEventListener("mousemove", (e) => {
    if (!AppState.isDragging || !AppState.partsGroup) return;

    const deltaX = e.clientX - AppState.previousMousePosition.x;
    const deltaY = e.clientY - AppState.previousMousePosition.y;

    AppState.partsGroup.rotation.y += deltaX * 0.01;
    AppState.partsGroup.rotation.x += deltaY * 0.01;

    AppState.previousMousePosition = { x: e.clientX, y: e.clientY };
  });

  canvas.addEventListener("mouseup", () => {
    AppState.isDragging = false;
  });

  canvas.addEventListener("mouseleave", () => {
    AppState.isDragging = false;
  });

  // Touch controls
  canvas.addEventListener("touchstart", (e) => {
    if (e.touches.length === 1) {
      AppState.isDragging = true;
      AppState.previousMousePosition = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
      };
    }
  });

  canvas.addEventListener(
    "touchmove",
    (e) => {
      if (!AppState.isDragging || !AppState.partsGroup || e.touches.length !== 1) return;

      e.preventDefault();

      const deltaX = e.touches[0].clientX - AppState.previousMousePosition.x;
      const deltaY = e.touches[0].clientY - AppState.previousMousePosition.y;

      AppState.partsGroup.rotation.y += deltaX * 0.01;
      AppState.partsGroup.rotation.x += deltaY * 0.01;

      AppState.previousMousePosition = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
      };
    },
    { passive: false }
  );

  canvas.addEventListener("touchend", () => {
    AppState.isDragging = false;
  });
}

// ============================================
// ZOOM CONTROLS
// ============================================
function setupZoomControls() {
  const canvas = AppState.renderer.domElement;

  canvas.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();

      const delta = e.deltaY > 0 ? 1 : -1;
      AppState.currentZoom += delta * 2;
      AppState.currentZoom = Math.max(AppState.minZoom, Math.min(AppState.maxZoom, AppState.currentZoom));

      AppState.camera.position.z = AppState.currentZoom;

      if (DOM.zoomSlider) {
        DOM.zoomSlider.value = AppState.currentZoom;
      }

      if (DOM.camZ) {
        DOM.camZ.value = AppState.currentZoom.toFixed(1);
      }

      saveCameraSettings();
    },
    { passive: false }
  );
}

// ============================================
// ANIMATION LOOP
// ============================================
function animate() {
  requestAnimationFrame(animate);

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
