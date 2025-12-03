# Interactive Features Architecture

## Executive Summary
Comprehensive architecture for 3D/AR product visualization, mini-games expansion, and kiosk mode implementation.

---

## 1. Current State Analysis

### Existing Components
- **Mini-Games**: MemoryMatch, IngredientQuiz, BlendMaker
- **Game Infrastructure**: gameEngine (scoring, high scores), audioManager (sound effects)
- **Kiosk Utilities**: kiosk-mode util with idle detection, fullscreen, Wake Lock API
- **UI Components**: AttractMode (carousel slideshow for kiosk attract screen)

### Missing Capabilities
- No 3D/AR visualization
- Limited game variety
- No kiosk UI automation/lifecycle management

---

## 2. Component Architecture Design

### 3D/AR System

```
components/explore/3d/
├── ModelViewer.jsx          # @google/model-viewer wrapper (Phase 1)
├── ARViewer.jsx             # AR-enabled ModelViewer with instructions
└── r3f/                     # Phase 2 (optional advanced)
    ├── ProductShowcase3D.jsx
    └── IngredientOrbital.jsx
```

**Phase 1: model-viewer** (Recommended)
- Library: `@google/model-viewer` web component
- Features: 3D viewer + AR (Android Scene Viewer, iOS Quick Look)
- Props: modelUrl (GLB), ar, autoRotate, cameraControls, hotspots
- Bundle Impact: Minimal (web component, lazy-loaded)

**Phase 2: React Three Fiber** (Advanced, optional)
- Libraries: `three`, `@react-three/fiber`, `@react-three/drei`
- Use Cases: Custom scenes (ingredient orbits, exploded views, physics)
- Trade-off: Larger bundle, React 19 compatibility concerns

### Mini-Games Expansion

```
components/explore/games/
├── [existing]
│   ├── MemoryMatch.jsx
│   ├── IngredientQuiz.jsx
│   └── BlendMaker.jsx
└── [new]
    ├── BenefitSort.jsx      # Drag-and-drop ingredient matching
    └── IngredientRush.jsx   # Timed tap accuracy game
```

**BenefitSort** (Drag-and-Drop)
- Mechanics: Drag ingredient chips into benefit bins
- Scoring: +10 correct, -5 wrong, +combo streaks
- Duration: 60s timer
- State: Local component + gameEngine

**IngredientRush** (Timed Taps)
- Mechanics: Tap ingredients matching target benefit
- Scoring: +5 correct, -3 wrong, speed bonus
- Difficulty: Increasing spawn rate every 10s
- State: Local component + gameEngine

### Kiosk Mode System

```
components/explore/kiosk/
├── AttractMode.jsx          # Existing carousel
├── KioskProvider.jsx        # NEW: Idle detection & lifecycle
└── KioskLayout.jsx          # NEW: Full-screen touch UI wrapper
```

**KioskProvider** Responsibilities
- Idle detection (default 180s timeout)
- Auto-reset to /explore route
- Clear transient game state
- Stop audio on idle
- Handle Wake Lock + fullscreen

**KioskLayout** Features
- Large touch targets (min 64px height)
- High contrast UI
- Suppress text selection & context menu
- AttractMode overlay on idle

---

## 3. Feature-by-Feature Implementation Roadmap

### Phase 0: Dependencies (S, <1h)
```bash
npm i @google/model-viewer
```

### Phase 1: 3D/AR Foundation (M, 1-3h)
- [ ] Create ModelViewer.jsx wrapper
- [ ] Create ARViewer.jsx with AR instructions
- [ ] Create /app/explore/showcase/page.jsx
- [ ] Add sample GLB/USDZ assets to /public/models/

### Phase 2: Kiosk Automation (M, 1-3h)
- [ ] Build KioskProvider.jsx
- [ ] Build KioskLayout.jsx
- [ ] Wire into /app/explore/layout.js
- [ ] Test fullscreen + wake-lock

### Phase 3: Mini-Games Expansion (L, 1-2d)
- [ ] Create /app/explore/games/page.jsx (index)
- [ ] Implement BenefitSort.jsx
- [ ] Implement IngredientRush.jsx
- [ ] Unify scoring badges across all games

### Phase 4: Polish & Assets (M, 1-3h)
- [ ] Preload sounds in ExploreLayout
- [ ] Standardize audio feedback
- [ ] Optimize GLB assets (Draco compression)

### Phase 5: Advanced 3D (Optional, L-XL, 2-5d)
- [ ] Add @react-three/fiber dependencies
- [ ] Build ProductShowcase3D.jsx
- [ ] Implement IngredientOrbital.jsx

---

## 4. 3D/AR Integration Strategy

### Tech Stack Decision Matrix

| Feature | model-viewer | React Three Fiber |
|---------|-------------|-------------------|
| AR Support | ✅ Built-in | ⚠️ Manual |
| Bundle Size | ✅ Small | ❌ Large |
| Setup Time | ✅ Minutes | ❌ Hours |
| Custom Scenes | ❌ Limited | ✅ Full control |
| Mobile Performance | ✅ Excellent | ⚠️ Variable |
| **Recommendation** | **Phase 1** | **Phase 2** |

### Asset Requirements
- **GLB Format**: Draco-compressed, <2MB per file
- **USDZ Format**: iOS Quick Look support (export from Blender/Reality Converter)
- **Textures**: KTX2, max 1024px
- **Asset Map**: /public/models/index.json

```json
{
  "sea-moss-gel": {
    "glb": "/models/products/sea-moss-gel.glb",
    "usdz": "/models/products/sea-moss-gel.usdz",
    "poster": "/models/products/sea-moss-gel-poster.jpg"
  }
}
```

---

## 5. Mini-Games Specifications

### Unified Game Engine Integration

```javascript
// All games follow this pattern
gameEngine.startGame('game-id');
// ... gameplay ...
gameEngine.endGame('game-id', finalScore);
const highScore = gameEngine.getHighScore('game-id');
```

### BenefitSort (Drag-and-Drop)

**State Management**
```javascript
{
  timer: 60,
  score: 0,
  streak: 0,
  currentRound: 1,
  bins: [/* benefit categories */],
  items: [/* ingredient chips */]
}
```

**Scoring Rules**
- Correct match: +10 points
- Wrong match: -5 points
- Streak bonus: +(streak * 2)
- Time bonus: +(remainingSeconds * 1)

### IngredientRush (Timed Taps)

**State Management**
```javascript
{
  timeLeft: 60,
  lives: 3,
  score: 0,
  targetBenefit: 'immunity',
  spawnRate: 1000, // decreases over time
  ingredients: [/* active grid items */]
}
```

**Scoring Rules**
- Correct tap: +5 points
- Wrong tap: -3 points, -1 life
- Accuracy bonus: +(hits / total * 20)
- Speed bonus: +((60 - completionTime) * 2)

---

## 6. Kiosk Mode Blueprint

### Behavioral Specifications

#### On kioskMode.enable()
1. Request fullscreen
2. Acquire Wake Lock
3. Start idle timer (default 180s)
4. Suppress context menu, text selection

#### On Idle Timeout
1. Show AttractMode overlay
2. Navigate to /explore (reset state)
3. Stop background audio
4. Clear active game session

#### On User Interaction
1. Hide AttractMode
2. Reset idle timer
3. Resume normal UI flow

### UI Requirements

**Touch Targets**
- Minimum height: 64px
- Minimum tap area: 48x48px
- Clear visual feedback on press

**Visual Design**
- High contrast (WCAG AAA for kiosk lighting)
- Large fonts (min 18px body, 24px headings)
- Bold CTAs with gradients

### Analytics Events (Optional)
```javascript
track('kiosk_session_start', { location, timestamp });
track('kiosk_idle_triggered', { sessionDuration });
track('kiosk_session_end', { sessionDuration, interactions });
```

---

## 7. File Structure & Paths

### New Files to Create

```
/app/
├── components/explore/
│   ├── 3d/
│   │   ├── ModelViewer.jsx
│   │   └── ARViewer.jsx
│   ├── kiosk/
│   │   ├── AttractMode.jsx (exists)
│   │   ├── KioskProvider.jsx (new)
│   │   └── KioskLayout.jsx (new)
│   └── games/
│       ├── BenefitSort.jsx (new)
│       └── IngredientRush.jsx (new)
├── app/explore/
│   ├── showcase/
│   │   └── page.jsx (new)
│   └── games/
│       └── page.jsx (new - index)
└── public/
    └── models/
        ├── index.json
        └── products/
            ├── {product-id}.glb
            └── {product-id}.usdz
```

---

## 8. Dependencies & Bundle Impact

### Phase 1 (Immediate)
```json
{
  "@google/model-viewer": "^3.5.0"
}
```
**Bundle Impact**: ~150KB gzipped (lazy-loaded)

### Phase 2 (Advanced, Optional)
```json
{
  "three": "^0.160.0",
  "@react-three/fiber": "^8.15.0",
  "@react-three/drei": "^9.92.0"
}
```
**Bundle Impact**: ~400-600KB additional

---

## 9. Performance Targets

- **3D Model Load**: <2s on 3G
- **AR Activation**: <1s
- **Game FPS**: 60fps on mobile
- **Kiosk Idle Detection**: ±2s accuracy
- **Wake Lock**: 100% retention during session

---

## 10. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| React 19 compatibility | High | Start with web component (model-viewer) |
| Large asset sizes | High | Draco compression, KTX2 textures, CDN |
| AR iOS limitations | Medium | Provide USDZ fallback for Quick Look |
| Wake Lock permission denial | Low | Graceful degradation, periodic attract mode |
| Touch accuracy on kiosk | Medium | Large targets, clear feedback, testing |

---

## 11. Success Metrics

- **3D/AR Adoption**: 25% of product page views use 3D viewer
- **Game Engagement**: Avg 2.5 games per explore session
- **Kiosk Uptime**: 95% session completion without manual reset
- **Performance**: P75 load time <3s on 4G

---

## Next Steps

1. Install @google/model-viewer
2. Create ModelViewer component
3. Build showcase/page.jsx
4. Test AR on iOS/Android devices
5. Implement KioskProvider
6. Build and test two new mini-games
7. Collect user feedback and iterate

---

**Document Version**: 1.0  
**Last Updated**: Nov 26, 2025  
**Owner**: Interactive Features Team
