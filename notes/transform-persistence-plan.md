# Transform Persistence Plan

## Current Situation

The lampy viewer currently saves object transforms (position, rotation, scale, visibility) to localStorage. This works well but has limitations:

- Data is lost when localStorage is cleared
- Data is browser-specific (not shared across devices/browsers)
- No version control or history of changes

## Goal

Create a persistent storage solution that preserves transform configurations even when localStorage is cleared.

---

## Approach Options

### Option 1: Static JSON Configuration File ⭐ **RECOMMENDED**

**Description**: Export current transforms to a JSON config file that gets committed to the repo and loaded as the default state.

**Implementation**:

1. Create `lampy/transforms-config.json` to store the default transforms
2. Add an "Export Config" button in the UI to save current state to this file
3. Modify loading logic to:
   - First, load from `transforms-config.json` (default/baseline)
   - Then, overlay any localStorage values (user overrides)
4. User can reset to baseline by clearing localStorage

**Pros**:

- Simple to implement
- Version controlled (can track changes via git)
- Portable across browsers/devices
- Clear separation between "official" config and user tweaks
- No backend needed

**Cons**:

- Requires manual export step to update baseline
- Users need to download/copy JSON to save their config permanently

**File Structure**:

```json
{
  "version": "1.0",
  "lastUpdated": "2025-10-30T...",
  "transforms": {
    "Base": {
      "position": { "x": 0, "y": 0, "z": 0 },
      "rotation": { "x": 0, "y": 0, "z": 0 },
      "scale": 0.3,
      "visible": true
    },
    "Mag Bottom": { ... },
    ...
  }
}
```

---

### Option 2: URL Hash Parameters

**Description**: Encode transform state in the URL hash for easy sharing.

**Implementation**:

1. Serialize transforms to a compact base64-encoded string
2. Update URL hash whenever transforms change
3. Parse hash on page load to restore state

**Pros**:

- Easy sharing via URL
- No files needed
- Works across browsers when URL is shared

**Cons**:

- URL becomes very long with many objects
- Not as human-readable
- No version control
- Still loses data if URL is not saved

---

### Option 3: Downloadable/Uploadable Configuration

**Description**: Allow users to download their config as a JSON file and upload it later.

**Implementation**:

1. Add "Download Config" button → downloads JSON file
2. Add "Upload Config" button → loads JSON file and applies transforms
3. Keep localStorage for quick persistence between sessions

**Pros**:

- User has full control over their configs
- Can maintain multiple configuration files
- Portable across devices

**Cons**:

- Requires manual file management
- Extra UI complexity
- Users might lose downloaded files

---

### Option 4: Hybrid Approach (Config File + localStorage)

**Description**: Combine Option 1 with localStorage for best of both worlds.

**Implementation**:

1. Ship with `transforms-config.json` as the baseline
2. Use localStorage for session overrides
3. Add UI controls:
   - "Reset to Baseline" → loads from config file
   - "Export as New Baseline" → saves to config file (requires download)
   - Current behavior → saves to localStorage automatically

**Pros**:

- Best user experience
- Clear baseline vs. custom states
- Flexible for both development and user customization

**Cons**:

- Most complex to implement
- Requires UI for file download/upload if users want to update baseline

---

## Recommended Implementation Plan

**Phase 1: Static Config File (Option 1)**

1. Create `lampy/transforms-config.json`
2. Modify `loadAllParts()` to fetch and parse this file
3. Change loading priority: config file → localStorage overlay
4. Add "Export Current State" button that generates JSON (shown in UI or downloaded)

**Phase 2: Optional Enhancements**

- Add "Reset to Baseline" button
- Add URL hash support for quick sharing
- Add download/upload config features

---

## Questions for Review

1. **Which option do you prefer?** (I recommend Option 1 or Option 4) let's go with 4
2. **Export mechanism**: Should "Export Config" download a file, or copy JSON to clipboard, or display it in a modal? download a file
3. **File location**: Should `transforms-config.json` live in `lampy/` or in a separate `config/` folder? lampy folder
4. **Reset behavior**: Should "Reset" clear localStorage and reload from baseline, or reset each object individually? reload from baseline
5. **Git tracking**: Should we commit the config file to git, or add it to `.gitignore` and provide a template? yes, commit to git

---

## Next Steps

Once you review and answer the questions above, I'll implement the chosen approach.
