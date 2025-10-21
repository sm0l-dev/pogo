# 3D Lighting Setup Documentation

## Overview
This document explains the lighting configuration used in the three.js scenes for the glasses visualization project.

---

## Scene 1: Main Homepage Scene (`TW` component)

**Location in code:** Lines 54826-54896

### Lighting Components:

#### 1. **Environment Map (HDR)**
```javascript
Gt(UP, {
  files: "https://glassescode.netlify.app/skidpan_1k.exr",
  environmentIntensity: 0.1
})
```
- **Type:** HDR Environment Map
- **File:** `skidpan_1k.exr` (1k resolution)
- **Intensity:** 0.1 (10% - very subtle)
- **Purpose:** Provides realistic reflections and subtle ambient lighting from the environment
- **Background:** Not visible (background property not set to true)

#### 2. **Ambient Light**
```javascript
Gt("ambientLight", { intensity: 0.15 })
```
- **Type:** Ambient Light
- **Intensity:** 0.15 (15%)
- **Purpose:** Provides non-directional base illumination to prevent completely dark areas
- **Effect:** Adds a gentle fill light across all surfaces uniformly

### Total Illumination
- Very subtle, moody lighting setup
- Emphasizes reflections and material properties
- Combined intensity is quite low for dramatic effect

---

## Scene 2: Glasses Configurator (`BW` component)

**Location in code:** Lines 55040-55179

### Lighting Components:

#### 1. **Environment Map (HDR)**
```javascript
Gt(UP, {
  files: "https://glassescode.netlify.app/skidpan_1k.exr",
  background: false,
  environmentIntensity: 0.1,
  environmentRotation: [0, Math.PI, 0],
})
```
- **Type:** HDR Environment Map
- **File:** Same `skidpan_1k.exr` file
- **Intensity:** 0.1 (10%)
- **Rotation:** `[0, π, 0]` - rotated 180° around Y-axis
  - This changes which part of the HDR map illuminates the scene
  - Useful for finding the best reflection angles
- **Background:** `false` - environment not visible, only affects lighting
- **Purpose:** Realistic reflections on glass lenses and frames

#### 2. **Ambient Light**
```javascript
Gt("ambientLight", { intensity: 0.15 })
```
- **Type:** Ambient Light
- **Intensity:** 0.15 (15%)
- **Purpose:** Base fill light for visibility

---

## Scene 3: Hero Glasses Model (`JV` component)

**Location in code:** Lines 54000-54187

### Lighting Components:

#### 1. **Directional Light (Sun)**
```javascript
Gt("directionalLight", {
  name: "Sun",
  intensity: 0.683,
  decay: 2,
  position: [-0.002, 0.083, -0.036],
  rotation: [-Math.PI / 2, 0, 0],
})
```
- **Type:** Directional Light (simulates sunlight)
- **Intensity:** 0.683 (68.3%)
- **Decay:** 2 (physically accurate light falloff)
- **Position:** Slightly above and in front of the model
- **Rotation:** `-90°` around X-axis (pointing downward)
- **Purpose:** Main key light creating shadows and definition
- **Effect:** Creates strong directional shadows (since shadows are enabled)

#### 2. **Point Light**
```javascript
Gt("pointLight", {
  name: "Point",
  intensity: 0.243514,
  decay: 2,
  position: [0, -0.042, 0.015],
  rotation: [-Math.PI / 2, 0, 0],
})
```
- **Type:** Point Light (omnidirectional)
- **Intensity:** 0.243514 (~24%)
- **Decay:** 2 (physically accurate falloff)
- **Position:** Below the model, slightly forward
- **Purpose:** Fill light from below, reduces harsh shadows
- **Effect:** Softens shadows created by the directional light

### Shadow Configuration
- The scene likely has `shadows: true` enabled
- `castShadow: true` on meshes means they create shadows
- `receiveShadow: true` on meshes means they receive shadows

---

## Additional Lighting in Configurator Model (`bW`)

**Location in code:** Lines 54899-55036

### Lighting Components:

#### 1. **Directional Light**
```javascript
Gt("directionalLight", {
  intensity: 0.683,
  decay: 2,
  position: [-0.002, 0.083, -0.036],
  rotation: [-Math.PI / 2, 0, 0],
})
```
- Same configuration as the hero scene's directional light

#### 2. **Point Light**
```javascript
Gt("pointLight", {
  intensity: 0.243514,
  decay: 2,
  position: [0, -0.042, 0.015],
  rotation: [-Math.PI / 2, 0, 0],
})
```
- Same configuration as the hero scene's point light

---

## Lighting Strategy Summary

### Philosophy
The lighting setup uses a **three-point lighting** approach with environment enhancement:

1. **Key Light:** Directional light (main light source)
2. **Fill Light:** Point light (softens shadows)
3. **Ambient/Environment:** HDR + Ambient light (subtle base illumination + reflections)

### Why This Setup Works

#### For Product Visualization:
- **HDR Environment:** Provides realistic reflections on glass and glossy surfaces
- **Low Intensities:** Creates a premium, moody aesthetic
- **Directional + Point Lights:** Ensures the product is well-defined but not overexposed

#### Material Enhancement:
- Glass materials benefit greatly from environment reflections
- Metallic/glossy frames catch highlights from the HDR
- Shadows add depth and realism

### Intensity Breakdown
```
Total Light Budget:
├── Directional Light: 68.3%  (Key)
├── Point Light:       24.4%  (Fill)
├── Ambient Light:     15.0%  (Base)
└── Environment:       10.0%  (Reflections)
```

---

## Common Adjustments

### To Make Brighter:
- Increase `ambientLight.intensity` to 0.3-0.5
- Increase `environmentIntensity` to 0.3-0.5
- Increase `directionalLight.intensity` to 1.0-1.5

### To Make More Dramatic:
- Decrease `ambientLight.intensity` to 0.05
- Increase contrast between key and fill lights
- Adjust `environmentRotation` to change reflection highlights

### To Change Mood:
- Add colored lights (e.g., `color: "#ff6b00"` for warm)
- Adjust HDR file to different environment
- Change light positions for different shadow angles

---

## Technical Notes

### HDR Environment Map
- **Format:** `.exr` (OpenEXR - high dynamic range)
- **Resolution:** 1k (1024x512 typical for equirectangular)
- **Source:** Skidpan environment (likely an outdoor/studio setup)
- **Performance:** Low resolution for faster loading

### Light Decay
- `decay: 2` is physically accurate (inverse square law)
- Light intensity decreases with distance squared
- More realistic than linear decay

### Rotation Values
- `Math.PI` = 180°
- `Math.PI / 2` = 90°
- `-Math.PI / 2` = -90°

---

## Files Referenced
- **HDR Environment:** `https://glassescode.netlify.app/skidpan_1k.exr`
- **3D Model:** `https://glassescode.netlify.app/OakleyConfigV20.glb`

