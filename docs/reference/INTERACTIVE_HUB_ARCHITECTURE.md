# 🎨 INTERACTIVE HUB - DETAILED COMPONENT ARCHITECTURE

**Project:** Taste of Gratitude - Interactive Info Hub  
**Version:** 1.0.0  
**Design Philosophy:** Playful, Magical, Psychologically Optimized

---

## 1. SYSTEM ARCHITECTURE OVERVIEW

```
┌─────────────────────────────────────────────────────────┐
│                   Interactive Hub                        │
│                                                          │
│  ┌────────────┐  ┌──────────────┐  ┌─────────────┐    │
│  │  Explore   │  │    Games     │  │   Showcase  │    │
│  │   Pages    │  │   Module     │  │   (3D/AR)   │    │
│  └────────────┘  └──────────────┘  └─────────────┘    │
│                                                          │
│  ┌────────────┐  ┌──────────────┐  ┌─────────────┐    │
│  │Ingredient  │  │  Education   │  │    Kiosk    │    │
│  │ Explorer   │  │   Stories    │  │     Mode    │    │
│  └────────────┘  └──────────────┘  └─────────────┘    │
│                                                          │
│         ↓              ↓                ↓               │
│    ┌─────────────────────────────────────────┐         │
│    │      Core Services & Utilities          │         │
│    │  Audio • 3D Loader • Game Engine       │         │
│    │  Animation • Particles • Gestures      │         │
│    └─────────────────────────────────────────┘         │
└─────────────────────────────────────────────────────────┘
```

---

## 2. COMPONENT HIERARCHY

### **A) Layout Components**

#### **ExploreLayout** (`/components/explore/ExploreLayout.jsx`)
```javascript
Purpose: Root layout for explore section
Features:
  - Ambient background animations
  - Floating ingredient particles
  - Background music toggle
  - Navigation overlay
  - Mode switcher (normal/kiosk)
Props:
  - children: ReactNode
  - kioskMode?: boolean
  - showParticles?: boolean
State:
  - audioEnabled: boolean
  - particlesVisible: boolean
  - attractModeActive: boolean
```

#### **KioskLayout** (`/components/explore/kiosk/KioskLayout.jsx`)
```javascript
Purpose: Event mode layout with large touch targets
Features:
  - Auto-reset timer (3 min idle)
  - Attract mode loop
  - Large buttons (min 80px)
  - High contrast colors
  - Screen timeout prevention
Props:
  - children: ReactNode
  - resetTimeout?: number (default 180000ms)
  - attractModeContent?: ReactNode
State:
  - idleTime: number
  - attractMode: boolean
  - lastInteraction: timestamp
```

---

### **B) Interactive Components**

#### **IngredientExplorer** (`/components/explore/interactive/IngredientExplorer.jsx`)
```javascript
Purpose: Main ingredient discovery interface
Features:
  - Grid/carousel view toggle
  - Filter by category/benefit
  - Search with autocomplete
  - Hover preview cards
  - Click for full detail modal
Props:
  - ingredients: Ingredient[]
  - defaultView?: 'grid' | 'carousel'
  - onIngredientSelect?: (ingredient) => void
State:
  - viewMode: 'grid' | 'carousel'
  - filters: string[]
  - searchQuery: string
  - hoveredIngredient: Ingredient | null
Design:
  - Masonry grid layout
  - Smooth transitions (0.3s ease)
  - Emoji icons (3rem size)
  - Color-coded by ingredient.color
Psychology:
  - Dopamine loop: Satisfying hover feedback
  - Curiosity triggers: Hidden benefits on click
```

#### **IngredientCard** (`/components/explore/interactive/IngredientCard.jsx`)
```javascript
Purpose: Individual ingredient display card
Features:
  - Animated emoji icon (bounce on hover)
  - Gradient background (ingredient.color)
  - Benefit preview (first 2 benefits)
  - "Learn More" CTA with arrow
  - 3D flip animation on tap
Props:
  - ingredient: Ingredient
  - onClick?: () => void
  - interactive?: boolean
  - size?: 'sm' | 'md' | 'lg'
Animations:
  - Hover: scale(1.05) + shadow lift
  - Tap: flip animation (180deg Y-axis)
  - Entry: fade-in-up staggered
```

#### **IngredientDetailModal** (`/components/explore/interactive/IngredientDetailModal.jsx`)
```javascript
Purpose: Full-screen ingredient deep dive
Features:
  - Hero image/3D model
  - Benefit timeline (scroll-triggered)
  - Scientific facts
  - "Find products with this" CTA
  - Related ingredients
  - Sound effects on reveal
Props:
  - ingredient: Ingredient
  - isOpen: boolean
  - onClose: () => void
Sections:
  1. Hero (emoji + name + tagline)
  2. Benefits (animated list)
  3. Story (scroll-triggered paragraphs)
  4. Science (expandable cards)
  5. Products (grid)
  6. Related (carousel)
Psychology:
  - Zeigarnik effect: "Did you know?" cliffhangers
  - Story-based learning: Origin narrative
  - Social proof: "92% of customers love this"
```

---

### **C) 3D & AR Components**

#### **ModelViewer** (`/components/explore/3d/ModelViewer.jsx`)
```javascript
Purpose: WebGL 3D model viewer using Three.js
Features:
  - Orbit controls (drag to rotate)
  - Zoom (pinch/scroll)
  - Auto-rotate toggle
  - Lighting presets (studio/natural)
  - Fullscreen mode
  - AR mode button (mobile only)
Props:
  - modelUrl: string (GLTF/GLB format)
  - textureUrl?: string
  - autoRotate?: boolean
  - cameraPosition?: [x, y, z]
  - enableAR?: boolean
Technologies:
  - @react-three/fiber (React renderer for Three.js)
  - @react-three/drei (helpers)
Performance:
  - Lazy load (React.lazy + Suspense)
  - LOD (Level of Detail) for mobile
  - Compressed textures (Draco)
```

#### **ARViewer** (`/components/explore/3d/ARViewer.jsx`)
```javascript
Purpose: Augmented reality viewer (mobile)
Features:
  - Camera access
  - Surface detection
  - Model placement
  - Scale adjustment
  - Screenshot capture
  - "Place in your space" tutorial
Props:
  - modelUrl: string
  - onPlaced?: () => void
  - onScreenshot?: (imageData) => void
Technologies:
  - @google/model-viewer (WebXR)
  - iOS: Quick Look (USDZ)
  - Android: Scene Viewer (GLB)
Fallback:
  - 3D viewer if AR not supported
  - User education overlay
```

#### **ProductShowcase3D** (`/components/explore/3d/ProductShowcase3D.jsx`)
```javascript
Purpose: Interactive 3D product presentation
Features:
  - Product model with ingredients floating around
  - Click ingredient to highlight
  - Ingredient info tooltips
  - "Exploded view" animation
  - Color variant switcher
  - Add to cart from 3D view
Props:
  - product: Product
  - ingredients: Ingredient[]
  - onAddToCart?: () => void
Animations:
  - Ingredients orbit around product
  - Hover: ingredient zooms in
  - Click: ingredient spotlight effect
  - Particles: sparkles on interaction
Psychology:
  - Visual representation of benefits
  - "See what's inside" transparency
  - IKEA effect: Interactive assembly feel
```

---

### **D) Game Components**

#### **BlendMaker** (`/components/explore/games/BlendMaker.jsx`)
```javascript
Purpose: Drag-and-drop blend creation game
Mechanics:
  - Drag ingredients from palette
  - Drop into blender
  - Watch blend animation
  - See combined benefits
  - Get product recommendations
  - Score based on synergy
Features:
  - Physics-based drag (react-use-gesture)
  - Liquid blend animation (Lottie)
  - Sound effects (pour, blend, success)
  - Haptic feedback (mobile)
  - Save custom blend
  - Share as image
Props:
  - availableIngredients: Ingredient[]
  - onBlendComplete?: (blend) => void
State:
  - selectedIngredients: Ingredient[]
  - blendAnimation: boolean
  - synergy: number (0-100)
  - recommendations: Product[]
Scoring:
  - Base: 10 points per ingredient
  - Synergy bonus: complementary benefits (+50%)
  - Completeness: 5+ ingredients (+25%)
Psychology:
  - IKEA effect: Creating own blend
  - Dopamine: Satisfying blend animation
  - Reward: Personalized recommendations
```

#### **IngredientQuiz** (`/components/explore/games/IngredientQuiz.jsx`)
```javascript
Purpose: Educational quiz about ingredients
Mechanics:
  - Multiple choice questions
  - 10 questions per round
  - Timed (30s per question)
  - Visual feedback (green/red)
  - Streak counter
  - Points & leaderboard
Features:
  - Question types:
    * Match ingredient to benefit
    * Identify by icon
    * True/false facts
    * "Which product has..." 
  - Progress bar
  - Encouraging messages
  - Confetti on completion
  - Shareable score card
Props:
  - difficulty?: 'easy' | 'medium' | 'hard'
  - onComplete?: (score) => void
State:
  - currentQuestion: number
  - score: number
  - streak: number
  - timeRemaining: number
Data Source:
  - Questions generated from INGREDIENT_DATABASE
  - Dynamic based on available products
Psychology:
  - Challenge: Time pressure
  - Progress: Visual completion bar
  - Achievement: Streak system
  - Social proof: Leaderboard
```

#### **MemoryMatch** (`/components/explore/games/MemoryMatch.jsx`)
```javascript
Purpose: Memory card matching game
Mechanics:
  - Grid of face-down cards
  - Click to flip (emoji + name)
  - Match two cards to keep face-up
  - Complete all pairs to win
  - Track moves & time
  - Star rating (1-3 stars)
Features:
  - Difficulty levels:
    * Easy: 8 cards (4 pairs)
    * Medium: 16 cards (8 pairs)
    * Hard: 24 cards (12 pairs)
  - Shuffle on restart
  - Particle effects on match
  - Sound effects (flip, match, win)
  - High score tracking
Props:
  - difficulty?: 'easy' | 'medium' | 'hard'
  - onWin?: (stats) => void
State:
  - flippedCards: number[]
  - matchedCards: number[]
  - moves: number
  - timeElapsed: number
  - gameStatus: 'playing' | 'won'
Animation:
  - Card flip: rotateY(180deg)
  - Match: pulse + scale
  - Mismatch: shake + fade back
Psychology:
  - Reward: Satisfying match effects
  - Challenge: Beat your best time
  - Learning: Ingredient recognition
```

---

### **E) Educational Components**

#### **ScrollStory** (`/components/explore/interactive/ScrollStory.jsx`)
```javascript
Purpose: Scroll-triggered ingredient journey
Features:
  - Sticky background
  - Text overlays (fade in/out)
  - Image/video reveals
  - Progress indicator
  - Chapter navigation
  - Auto-scroll option (kiosk)
Props:
  - story: StoryChapter[]
  - autoScroll?: boolean
  - autoScrollSpeed?: number
Structure:
  - Hero chapter (full screen)
  - Content chapters (scrollable)
  - Conclusion chapter (CTA)
Animations:
  - Parallax: Background moves slower
  - Fade: Text opacity based on scroll
  - Scale: Images zoom in/out
  - Slide: Elements from sides
Technologies:
  - Intersection Observer
  - Scroll position tracking
  - requestAnimationFrame
Psychology:
  - Engagement: Story narrative
  - Pacing: Controlled information flow
  - Immersion: Full-screen experience
```

#### **BenefitTimeline** (`/components/explore/interactive/BenefitTimeline.jsx`)
```javascript
Purpose: Animated timeline of health benefits
Features:
  - Vertical timeline
  - Icon + title + description
  - Scroll-triggered animations
  - "Learn more" expand
  - Citations/sources
Props:
  - benefits: Benefit[]
  - animated?: boolean
Structure:
  - Timeline item:
    * Icon (emoji or lucide)
    * Title (benefit name)
    * Description (short)
    * Expandable detail
    * Source link (optional)
Animations:
  - Entry: Slide from left/right alternating
  - Line draw: SVG stroke animation
  - Icon: Pop + bounce
  - Expansion: Smooth height transition
```

---

### **F) Particle & Animation Components**

#### **ParticleSystem** (`/components/explore/interactive/ParticleSystem.jsx`)
```javascript
Purpose: Canvas-based particle effects
Types:
  1. Floating Ingredients:
     - Emoji particles
     - Slow drift
     - Occasional twirl
  2. Sparkles:
     - Star shapes
     - Fast fade
     - On interaction
  3. Confetti:
     - Multicolor rectangles
     - Physics-based fall
     - On achievement
Features:
  - Canvas rendering (requestAnimationFrame)
  - Particle pool (object reuse)
  - Performance throttling (mobile)
  - Pause when off-screen
Props:
  - type: 'ingredients' | 'sparkles' | 'confetti'
  - count?: number
  - speed?: number
  - colors?: string[]
  - paused?: boolean
Performance:
  - Max 100 particles on desktop
  - Max 50 particles on mobile
  - Cull off-screen particles
```

#### **MagicButton** (`/components/explore/interactive/MagicButton.jsx`)
```javascript
Purpose: Button with delightful micro-interactions
Features:
  - Hover: Glow pulse
  - Click: Ripple effect
  - Success: Checkmark morph
  - Loading: Spinner
  - Sound on tap (optional)
  - Haptic feedback (mobile)
Props:
  - children: ReactNode
  - variant?: 'primary' | 'secondary' | 'magic'
  - loading?: boolean
  - success?: boolean
  - sound?: boolean
  - onClick?: () => void
Animations:
  - Idle: Gentle pulse glow
  - Hover: Scale 1.05 + brighter glow
  - Active: Scale 0.95
  - Success: Checkmark draw animation
Psychology:
  - Feedback: Immediate visual response
  - Reward: Satisfying click feel
  - Anticipation: Loading states
```

---

### **G) Kiosk Mode Components**

#### **AttractMode** (`/components/explore/kiosk/AttractMode.jsx`)
```javascript
Purpose: Looping attract screen for events
Features:
  - Auto-playing video/animation
  - Ingredient carousel
  - Product highlights
  - "Tap to explore" CTA
  - Auto-restart timer
Content Loop:
  1. Brand intro (5s)
  2. Ingredient showcase (10s)
  3. Product highlights (10s)
  4. Benefits overview (10s)
  5. CTA screen (5s)
  6. Repeat
Props:
  - loopDuration?: number (default 40000ms)
  - onInteraction?: () => void
Interactions:
  - Any tap/click exits attract mode
  - Reset after 3 min idle
```

#### **LargeTouchButton** (`/components/explore/kiosk/LargeTouchButton.jsx`)
```javascript
Purpose: Accessible button for kiosk
Features:
  - Minimum 80px × 80px
  - High contrast (4.5:1 ratio)
  - Large text (1.5rem)
  - Icon + label
  - Press animation
  - Sound feedback
Props:
  - icon: ReactNode
  - label: string
  - onClick: () => void
  - variant?: 'primary' | 'secondary'
  - size?: 'large' | 'xlarge'
Styling:
  - Border: 4px solid
  - Padding: 1.5rem
  - Border-radius: 1rem
  - Shadow: Large elevation
```

#### **KioskNavigation** (`/components/explore/kiosk/KioskNavigation.jsx`)
```javascript
Purpose: Simple navigation for events
Features:
  - 3-4 main sections only
  - Icon-first design
  - Fixed bottom position
  - Always visible
  - Large touch targets
Sections:
  - Explore (🌿)
  - Games (🎮)
  - Products (🛍️)
  - Learn (📚)
Props:
  - currentSection: string
  - onNavigate: (section) => void
```

---

## 3. UTILITY LIBRARIES

### **AudioManager** (`/lib/explore/audio-manager.js`)
```javascript
Purpose: Centralized audio control
Features:
  - Preload sounds
  - Play with volume control
  - Global mute toggle
  - Cross-fade background music
  - Spatial audio (3D)
API:
  - AudioManager.preload(soundId, url)
  - AudioManager.play(soundId, options)
  - AudioManager.stop(soundId)
  - AudioManager.setMute(boolean)
  - AudioManager.setVolume(soundId, volume)
Sounds:
  - ui-tap.mp3
  - ui-success.mp3
  - blend-pour.mp3
  - blend-mix.mp3
  - particle-pop.mp3
  - ambient-background.mp3
Technology:
  - Howler.js
Implementation:
  - Singleton pattern
  - Lazy loading
  - Memory management
```

### **3DLoader** (`/lib/explore/3d-loader.js`)
```javascript
Purpose: Optimized 3D model loading
Features:
  - GLTF/GLB loader
  - Texture compression
  - LOD generation
  - Cache management
  - Progress tracking
API:
  - 3DLoader.load(url, onProgress)
  - 3DLoader.preload(urls)
  - 3DLoader.getFromCache(url)
  - 3DLoader.clearCache()
Optimizations:
  - Draco compression
  - Texture atlasing
  - Geometry merging
  - Progressive loading
Technology:
  - Three.js loaders
  - DRACOLoader
  - GLTFLoader
```

### **GameEngine** (`/lib/explore/game-engine.js`)
```javascript
Purpose: Shared game logic
Features:
  - Score calculation
  - Timer management
  - High score persistence
  - Achievement tracking
  - Leaderboard sync
API:
  - GameEngine.startGame(gameId)
  - GameEngine.endGame(gameId, score)
  - GameEngine.getHighScore(gameId)
  - GameEngine.saveScore(gameId, score)
  - GameEngine.getLeaderboard(gameId, limit)
Storage:
  - localStorage for local scores
  - API for global leaderboard
  - Offline support
```

### **KioskMode** (`/lib/explore/kiosk-mode.js`)
```javascript
Purpose: Event mode utilities
Features:
  - Idle detection
  - Auto-reset trigger
  - Fullscreen control
  - Wake lock (prevent sleep)
  - Analytics tracking
API:
  - KioskMode.enable()
  - KioskMode.disable()
  - KioskMode.resetTimer()
  - KioskMode.onIdle(callback)
  - KioskMode.preventSleep()
Browser APIs:
  - Screen Wake Lock API
  - Fullscreen API
  - Pointer Lock API (optional)
```

---

## 4. DATA STRUCTURES

### **Ingredient (Extended)**
```typescript
interface Ingredient {
  // Existing fields (from ingredient-taxonomy.js)
  name: string;
  benefits: string[];
  icon: string;  // emoji
  color: string;
  category: string;
  weight: number;
  
  // NEW: Interactive hub fields
  slug: string;
  description: string;
  longDescription: string;
  scientificName?: string;
  origin: string;
  story: StoryChapter[];
  facts: string[];
  relatedIngredients: string[];
  productIds: string[];
  
  // 3D/AR assets
  model3D?: {
    url: string;
    format: 'gltf' | 'glb';
    size: number;  // bytes
    thumbnail: string;
  };
  
  // Media
  images: string[];
  videos?: string[];
  
  // Gamification
  rarity: 'common' | 'rare' | 'legendary';
  discoveryPoints: number;
}
```

### **StoryChapter**
```typescript
interface StoryChapter {
  id: string;
  title: string;
  content: string;
  media?: {
    type: 'image' | 'video';
    url: string;
    alt?: string;
  };
  animation?: {
    type: 'fade' | 'slide' | 'scale';
    direction?: 'left' | 'right' | 'up' | 'down';
    duration: number;
  };
}
```

### **Game**
```typescript
interface Game {
  id: string;
  name: string;
  description: string;
  icon: string;
  difficulty: 'easy' | 'medium' | 'hard';
  estimatedTime: number;  // minutes
  category: 'learning' | 'memory' | 'creativity';
  unlocked: boolean;
  highScore?: number;
  lastPlayed?: Date;
}
```

### **Achievement**
```typescript
interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: 'common' | 'rare' | 'legendary';
  points: number;
  unlocked: boolean;
  unlockedAt?: Date;
  progress?: {
    current: number;
    total: number;
  };
}
```

---

## 5. API ENDPOINTS

### **Ingredients API**
```
GET  /api/ingredients
GET  /api/ingredients/[slug]
GET  /api/ingredients/[slug]/products
GET  /api/ingredients/[slug]/related
POST /api/ingredients/[slug]/view  (analytics)
```

### **Games API**
```
GET  /api/games
GET  /api/games/[gameId]/highscores
POST /api/games/[gameId]/score
GET  /api/games/[gameId]/leaderboard
POST /api/games/[gameId]/achievement
```

### **Kiosk API**
```
POST /api/kiosk/session/start
POST /api/kiosk/session/end
POST /api/kiosk/analytics/event
GET  /api/kiosk/content  (attract mode content)
```

### **3D Assets API**
```
GET  /api/models/[productId]
GET  /api/models/ingredient/[slug]
GET  /api/textures/[assetId]
```

---

## 6. PERFORMANCE BUDGETS

### **Component Load Times**
```
IngredientExplorer:     < 500ms
ModelViewer:            < 1500ms (with model)
BlendMaker:             < 800ms
MemoryMatch:            < 400ms
ScrollStory:            < 600ms
```

### **Asset Sizes**
```
3D Models:              < 2MB each (compressed)
Textures:               < 512KB each
Audio (effects):        < 100KB each
Audio (background):     < 2MB (streaming)
Images:                 < 200KB each (WebP)
```

### **Bundle Sizes**
```
Explore page:           < 300KB (JS)
Games module:           < 200KB (JS, lazy)
3D module:              < 400KB (JS, lazy)
Total added:            < 1MB (including dependencies)
```

---

## 7. ACCESSIBILITY

### **WCAG 2.1 AA Compliance**
- Color contrast: Minimum 4.5:1
- Focus indicators: 2px solid outline
- Keyboard navigation: Full support
- Screen reader: ARIA labels everywhere
- Touch targets: Minimum 44×44px
- Alternative text: All images
- Captions: All videos

### **Motion Preferences**
```css
@media (prefers-reduced-motion: reduce) {
  /* Disable animations */
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 8. TESTING STRATEGY

### **Unit Tests** (Vitest)
- Component rendering
- State management
- Utility functions
- Game logic

### **Integration Tests** (Playwright)
- User flows
- Game completion
- 3D interactions
- Kiosk mode

### **Performance Tests**
- Lighthouse CI
- Bundle analysis
- 3D render FPS
- Memory leaks

---

## ARCHITECTURE STATUS: ✅ COMPLETE
**Next:** Feature-by-feature implementation roadmap
