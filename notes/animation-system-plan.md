# Animation System Plan

## Goal

Enable animation of the lamp parts from an initial state to a final state, with options for:
- Autoplay (time-based animation)
- Scroll-linked animation (user controls progress by scrolling)

## Key Questions

### Architecture Decision: Single Page vs Separate Pages?

#### Option A: Separate Editor + Animation Pages ⭐ **RECOMMENDED**

**Structure:**
- `lampy/index.html` - **Editor mode** (current page)
  - Interactive controls to position parts
  - Export configs for both start and end states
  - No animation logic

- `lampy/animated.html` - **Animation/Viewer mode** (new page)
  - Loads start and end state configs
  - Plays animation (autoplay or scroll-linked)
  - Minimal/no UI controls (maybe just play/pause)
  - Clean viewing experience

**Pros:**
- Clear separation of concerns (editing vs viewing)
- Editor remains fast and simple
- Animation page can be optimized for performance
- Can have multiple animation pages with different styles/behaviors
- Editor doesn't need animation library bloat

**Cons:**
- Need to maintain two HTML files
- Switching between editor and preview requires page navigation

---

#### Option B: Single Page with Mode Toggle

**Structure:**
- One `lampy/index.html` with mode switcher
- "Edit Mode" - current functionality
- "Animation Mode" - plays animation, hides controls

**Pros:**
- Single file to maintain
- Quick switching between modes
- Easier to iterate on positioning

**Cons:**
- More complex state management
- Heavier page load (includes animation logic even in edit mode)
- UI becomes more cluttered

---

## Configuration Structure

### Option 1: Two Separate Config Files

**Files:**
- `transforms-config-start.json` - Initial state
- `transforms-config-end.json` - Final state
- `animation-config.json` - Animation settings (optional)

**Format:**
```json
// transforms-config-start.json
{
  "version": "1.0",
  "lastUpdated": "...",
  "partsGroupRotation": { "x": 0, "y": 0, "z": 0 },
  "transforms": {
    "Base": { ... },
    ...
  }
}

// transforms-config-end.json
{
  "version": "1.0",
  "lastUpdated": "...",
  "partsGroupRotation": { "x": 0, "y": 0, "z": 0 },
  "transforms": {
    "Base": { ... },
    ...
  }
}

// animation-config.json (optional)
{
  "duration": 3000,
  "easing": "easeInOutCubic",
  "mode": "autoplay", // or "scroll"
  "loop": true,
  "scrollTrigger": {
    "start": "top center",
    "end": "bottom center"
  }
}
```

**Pros:**
- Simple, clear structure
- Easy to understand which file is which
- Can edit states independently

**Cons:**
- More files to manage
- Need to export twice (start, then end)

---

### Option 2: Single Config with Multiple States ⭐ **RECOMMENDED**

**File:**
- `transforms-animation-config.json`

**Format:**
```json
{
  "version": "1.0",
  "lastUpdated": "...",
  "animation": {
    "duration": 3000,
    "easing": "easeInOutCubic",
    "mode": "autoplay", // or "scroll"
    "loop": true
  },
  "states": {
    "start": {
      "partsGroupRotation": { "x": 0, "y": 0, "z": 0 },
      "transforms": {
        "Base": { ... },
        ...
      }
    },
    "end": {
      "partsGroupRotation": { "x": 0, "y": 0, "z": 0 },
      "transforms": {
        "Base": { ... },
        ...
      }
    }
  }
}
```

**Pros:**
- Single source of truth
- Animation settings live with the states they affect
- Easier to version control (one file to track)
- Can add more states later (intermediate keyframes)

**Cons:**
- Larger file size
- Need UI to switch between "editing start state" vs "editing end state"

---

## Workflow for Creating Animations

### Recommended Workflow (Option A Architecture + Option 2 Config)

1. **Setup Start State**
   - Open `lampy/index.html` (editor)
   - Position all parts for initial state
   - Click "Export Start State" → saves to memory/localStorage

2. **Setup End State**
   - Adjust parts to final positions
   - Click "Export End State" → saves to memory/localStorage

3. **Export Animation Config**
   - Click "Export Animation Config"
   - Downloads `transforms-animation-config.json` with both states
   - Replace file in repo

4. **Preview Animation**
   - Open `lampy/animated.html`
   - Animation loads the config and plays

---

## Animation Implementation

### Approach Comparison

#### Option 1: Three.js Native (No External Library) ⭐ **RECOMMENDED**

**What we already have:**
- `requestAnimationFrame` loop running (in animate() function)
- Three.js `Clock` for timing
- Three.js built-in interpolation: `Vector3.lerp()`, `Quaternion.slerp()`
- Object3D position, rotation, scale properties

**What we need to add:**
- Simple easing functions (copy/paste standard easing equations)
- Scroll event listener (for scroll-linked mode)
- Progress calculation (0 to 1)

**Implementation:**
```javascript
// Autoplay - in existing animate() loop
const progress = Math.min(elapsedTime / duration, 1);
const easedProgress = easeInOutCubic(progress);

// Interpolate each part
part.position.lerpVectors(startPos, endPos, easedProgress);
part.rotation.setFromRotationMatrix(/* slerp between start/end */);
part.scale.lerpVectors(startScale, endScale, easedProgress);

// Scroll-linked
window.addEventListener('scroll', () => {
  const progress = window.scrollY / maxScroll;
  interpolateStates(startState, endState, progress);
});
```

**Pros:**
- ✅ Zero additional dependencies
- ✅ Smallest bundle size (0KB added)
- ✅ Already familiar with Three.js API
- ✅ Direct control over animation
- ✅ Perfect performance (native Three.js)
- ✅ Simple for basic state A → B animation

**Cons:**
- ❌ Need to implement easing functions manually (~50 lines)
- ❌ Scroll-linked animations need manual scroll handling
- ❌ Complex animation sequences harder to manage

**Best for:** Simple two-state interpolation (your use case!)

---

#### Option 2: GSAP (GreenSock)

**What it adds:**
- Pre-built easing functions
- ScrollTrigger plugin (amazing scroll animations)
- Timeline management
- Advanced animation sequencing

**Pros:**
- ✅ ScrollTrigger is incredibly smooth
- ✅ Complex animation sequences are easier
- ✅ Lots of documentation and examples
- ✅ Industry standard

**Cons:**
- ❌ ~90KB additional bundle size
- ❌ External dependency to manage
- ❌ Overkill for simple A → B interpolation
- ❌ Another API to learn

**Best for:** Complex multi-step animations, professional scroll experiences

---

#### Option 3: Tween.js (Three.js compatible)

**What it adds:**
- Lightweight tweening library (~6KB)
- Simple API
- Good for Three.js objects

**Pros:**
- ✅ Lightweight (~6KB)
- ✅ Simple API
- ✅ Works well with Three.js

**Cons:**
- ❌ Still an external dependency
- ❌ No scroll-linking built-in
- ❌ Less features than GSAP

**Best for:** If you want simple tweening without writing easing functions yourself

---

### Recommended Approach: Three.js Native

For your use case (simple two-state interpolation), I recommend **Three.js native** approach because:

1. **You're animating Three.js objects** - their properties are made to be animated
2. **Simple A → B animation** - don't need complex sequencing
3. **Already have animation loop** - requestAnimationFrame is running
4. **Keep it light** - no extra dependencies
5. **Full control** - understand every line of code

**Easing functions are simple to add:**
```javascript
// Just copy these standard easing equations (~50 lines total)
const easings = {
  linear: (t) => t,
  easeInOutCubic: (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
  easeOutElastic: (t) => /* ... */,
  // etc.
};
```

**Only use GSAP if:**
- You want ultra-smooth scroll-linked animations with minimal code
- You plan to create complex multi-step animation sequences
- You're comfortable with 90KB extra bundle size
- You want professional scroll effects (parallax, pin, etc.)

---

## Animation Types

### 1. Autoplay Animation

**Behavior:**
- Animation plays automatically on page load
- Can loop or play once
- Optional play/pause controls

**Implementation:**
```javascript
// Pseudo-code
function animateToEnd(duration) {
  GSAP.to(part.position, {
    x: endState.position.x,
    y: endState.position.y,
    z: endState.position.z,
    duration: duration / 1000,
    ease: "power2.inOut"
  });
}
```

---

### 2. Scroll-Linked Animation

**Behavior:**
- User scrolls page to control animation progress
- Scroll down → animation progresses forward
- Scroll up → animation reverses
- 0% scroll = start state, 100% scroll = end state

**Implementation (with GSAP ScrollTrigger):**
```javascript
// Pseudo-code
ScrollTrigger.create({
  trigger: ".animation-container",
  start: "top top",
  end: "bottom bottom",
  scrub: true, // smooth scrubbing
  onUpdate: (self) => {
    const progress = self.progress; // 0 to 1
    interpolateStates(startState, endState, progress);
  }
});
```

---

## Editor UI Updates Needed

### New Controls for Animation Editor

If using Option 2 Config (single file with multiple states):

1. **State Selector**
   - Radio buttons or dropdown: "Editing: Start State | End State"
   - Load/save current state independently

2. **Export Options**
   - "Export Animation Config" - exports both states + animation settings
   - Keep current "Export Config" for static configs

3. **Animation Settings Panel**
   - Duration (ms)
   - Easing function dropdown
   - Mode: Autoplay / Scroll
   - Loop: Yes / No
   - Preview button (opens animated.html in new tab)

---

## File Structure

```
lampy/
├── index.html                      # Editor (current page)
├── animated.html                   # Animation viewer (new)
├── app.js                          # Editor logic (current)
├── animated-app.js                 # Animation logic (new)
├── transforms-config.json          # Static config (current)
└── transforms-animation-config.json # Animation config (new)
```

---

## Animation Page Features

### Minimal UI for `animated.html`:

1. **No position/rotation controls**
   - Read-only view

2. **Optional Controls:**
   - Play/Pause button (for autoplay mode)
   - Progress bar (shows animation progress)
   - Speed control (0.5x, 1x, 2x)
   - Mode toggle (autoplay ↔ scroll)

3. **Clean Design:**
   - Larger viewport (no sidebar)
   - Centered animation
   - Optional minimal overlay with credits

---

## Implementation Phases

### Phase 1: Basic Setup
1. Create animation config format (single file with start/end states)
2. Update editor to allow saving start/end states separately
3. Add "Export Animation Config" button to editor

### Phase 2: Animation Page - Autoplay
1. Create `animated.html` with basic layout
2. Implement config loading
3. Implement autoplay animation with GSAP
4. Add play/pause controls

### Phase 3: Scroll-Linked Animation
1. Integrate GSAP ScrollTrigger
2. Add scroll indicator/progress
3. Test smooth scrubbing

### Phase 4: Polish
1. Add easing options
2. Add UI for animation settings in editor
3. Add preview button in editor
4. Optimize performance

---

## Questions for Discussion

1. **Architecture**: Do you prefer separate editor/animation pages (Option A) or single page with mode toggle (Option B)?

2. **Config Structure**: Two files (start.json, end.json) or single file with multiple states?

3. **Animation Library**: GSAP (full-featured but heavier) vs Tween.js (lighter) vs custom?

4. **Primary Use Case**: Will you mainly use autoplay, scroll-linked, or both equally?

5. **Editor Workflow**: Should the editor have explicit "Start State" and "End State" buttons, or just "Export Animation Config" that captures current state?

6. **Animation Page Complexity**: Do you want a simple player (just animation), or a full viewer with playback controls, speed adjustments, etc.?

7. **Scroll Animation Details**: If scroll-linked, should the animation container be:
   - Full viewport height (animation happens as page scrolls)
   - Tall scrollable page (animation synced to scroll position)
   - Fixed viewport with virtual scroll progress bar

8. **Additional States**: Do you need support for more than 2 states (e.g., start → middle → end)?

---

## Recommendations Summary

**My Recommendation:**
- ✅ Option A: Separate editor and animation pages
- ✅ Single config file with multiple states (`transforms-animation-config.json`)
- ✅ Three.js native animation (no external library needed!)
- ✅ Editor has simple "Capture Start State" / "Capture End State" / "Export Animation Config" buttons
- ✅ Animation page starts simple (autoplay only), add scroll-linking in Phase 3
- ✅ Keep current static config system for non-animated views

This approach:
- Keeps editor clean and focused
- Zero additional dependencies
- Leverages Three.js capabilities you already have
- Lightweight and performant
- Clear separation of concerns

**Note:** If you later want advanced scroll effects with smooth scrubbing, parallax, etc., we can always add GSAP ScrollTrigger at that point. But for basic state A → B animation, Three.js native is perfect.
