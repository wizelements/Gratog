# 🗺️ IMPLEMENTATION ROADMAP - Phase-by-Phase Build Plan

**Project:** Taste of Gratitude Interactive Hub  
**Timeline:** Systematic, tested rollout  
**Approach:** Build → Test → Integrate → Repeat

---

## PHASE 1: FOUNDATION & INFRASTRUCTURE (Days 1-2)

### **1.1 Dependencies Installation**
```bash
yarn add @react-three/fiber @react-three/drei three
yarn add @google/model-viewer
yarn add howler
yarn add lottie-react
yarn add react-use-gesture
yarn add @types/three --dev
```

**Verification:**
- ✅ All packages install without conflicts
- ✅ No peer dependency warnings
- ✅ TypeScript types available

---

### **1.2 Create Directory Structure**
```
/app/(explore)/
/components/explore/
/lib/explore/
/public/models/
/public/audio/
/public/animations/
```

**Files to Create:**
1. Route group: `app/(explore)/layout.js`
2. Hub homepage: `app/(explore)/page.js`
3. Utilities folder: `lib/explore/`
4. Components folder: `components/explore/`

**No Conflicts:** New directories, won't affect existing code

---

### **1.3 Audio Manager Setup**

**File:** `/lib/explore/audio-manager.js`

**Features:**
- Howler.js integration
- Preload sound effects
- Volume control
- Mute toggle
- Cross-fade capability

**Sounds to Add:**
```
/public/audio/ui/
  - tap.mp3 (button click)
  - success.mp3 (action complete)
  - error.mp3 (validation fail)
  - transition.mp3 (page change)

/public/audio/effects/
  - blend-pour.mp3
  - blend-mix.mp3
  - particle-pop.mp3
  - sparkle.mp3

/public/audio/ambient/
  - background-loop.mp3 (soft, 2-3 min loop)
```

**Testing:**
- Volume slider works
- Mute persists in localStorage
- No audio autoplay (user-triggered only)
- Mobile compatibility

---

### **1.4 3D Loader Utility**

**File:** `/lib/explore/3d-loader.js`

**Features:**
- GLTFLoader wrapper
- DRACOLoader for compression
- Cache management
- Progress callbacks
- Error handling

**Testing:**
- Load sample model
- Verify compression works
- Check cache storage
- Test error fallbacks

---

### **1.5 Kiosk Mode Utility**

**File:** `/lib/explore/kiosk-mode.js`

**Features:**
- Idle detection (3 min)
- Auto-reset mechanism
- Fullscreen API
- Wake lock (prevent sleep)
- Event tracking

**Testing:**
- Idle timer triggers
- Reset works correctly
- Fullscreen activates
- Wake lock prevents sleep

---

**Phase 1 Deliverables:**
- ✅ All dependencies installed
- ✅ Directory structure created
- ✅ Audio manager functional
- ✅ 3D loader working
- ✅ Kiosk utilities ready

**Status Check:** Can play sound, load 3D model, detect idle

---

## PHASE 2: EXPLORE HUB FOUNDATION (Days 3-4)

### **2.1 Explore Layout**

**File:** `/app/(explore)/layout.js`

**Features:**
- Ambient particle background
- Navigation header
- Footer with mode toggle
- Background audio control
- Responsive container

**Components Used:**
- ParticleSystem (to build)
- Navigation component
- Audio toggle button

**Styling:**
- Dark gradient background
- Floating particles (ingredients)
- Smooth transitions

**Testing:**
- Particles render smoothly
- Navigation works
- Audio toggle persists
- Mobile responsive

---

### **2.2 Explore Homepage**

**File:** `/app/(explore)/page.js`

**Features:**
- Hero section with CTA
- Featured ingredients grid
- Game previews
- Product showcase link
- Interactive elements

**Sections:**
1. **Hero:**
   - Animated title
   - "Explore Our Ingredients" CTA
   - Scroll indicator

2. **Ingredient Preview:**
   - 6 featured ingredients
   - Hover effects
   - Click to detail

3. **Games Showcase:**
   - 3 game cards
   - "Play Now" buttons

4. **Product 3D Preview:**
   - Rotating product model
   - "View in AR" CTA

**Psychology:**
- Curiosity: "What's inside?" framing
- Choice: Multiple entry points
- Anticipation: Animated elements

**Testing:**
- All links work
- Animations smooth
- Mobile layout correct
- Load time < 2s

---

### **2.3 Particle System**

**File:** `/components/explore/interactive/ParticleSystem.jsx`

**Types:**
1. **Floating Ingredients:**
   - Emoji particles (🌊🍍🍋)
   - Slow upward drift
   - Occasional rotation
   - Fade in/out

2. **Sparkles:**
   - Star shapes
   - Quick fade
   - On hover/click

3. **Confetti:**
   - Multicolor rectangles
   - Physics fall
   - On achievement

**Implementation:**
- Canvas rendering
- requestAnimationFrame loop
- Particle pool (reuse objects)
- Mobile throttling (30fps vs 60fps)

**Performance:**
- Max 50 particles (mobile)
- Max 100 particles (desktop)
- Pause when off-screen
- Memory: < 10MB

**Testing:**
- Smooth 60fps (desktop)
- Smooth 30fps (mobile)
- No memory leaks
- Pauses when hidden

---

**Phase 2 Deliverables:**
- ✅ Explore hub accessible at `/explore`
- ✅ Particle system working
- ✅ Hero section engaging
- ✅ Navigation functional

**Status Check:** Hub loads, particles float, audio plays

---

## PHASE 3: INGREDIENT EXPLORER (Days 5-7)

### **3.1 Ingredient Data Extension**

**File:** `/lib/ingredient-taxonomy.js` (EXTEND)

**Add Fields:**
```javascript
export const INGREDIENT_DATABASE = {
  'sea moss': {
    // Existing fields...
    
    // NEW:
    slug: 'sea-moss',
    description: 'Wildcrafted Irish sea moss...',
    longDescription: '...',
    origin: 'Atlantic Ocean',
    scientificName: 'Chondrus crispus',
    story: [
      {
        title: 'Ocean\'s Gift',
        content: '...',
        media: { type: 'image', url: '...' }
      }
    ],
    facts: [
      '92 of 102 essential minerals',
      'Used for centuries in Ireland'
    ],
    relatedIngredients: ['kelp', 'dulse'],
    images: ['/images/ingredients/sea-moss-1.jpg'],
    rarity: 'legendary',
    discoveryPoints: 100
  }
  // ... repeat for all 46 ingredients
};
```

**Strategy:**
- Copy existing data structure
- Add new fields gradually
- Don't break existing code
- Use defaults for missing data

---

### **3.2 Ingredient Explorer Component**

**File:** `/components/explore/interactive/IngredientExplorer.jsx`

**Layout:**
```
┌─────────────────────────────────────┐
│  Search [________] 🔍  [Grid] [List]│
│                                      │
│  Filters: [All] [Fruits] [Herbs]... │
│                                      │
│  ┌──────┐ ┌──────┐ ┌──────┐        │
│  │ 🌊   │ │ 🍍   │ │ 🍋   │        │
│  │      │ │      │ │      │        │
│  └──────┘ └──────┘ └──────┘        │
│  ┌──────┐ ┌──────┐ ┌──────┐        │
│  │ 🫚   │ │ 🌟   │ │ 🌿   │        │
│  └──────┘ └──────┘ └──────┘        │
└─────────────────────────────────────┘
```

**Features:**
- Masonry grid (react-masonry-css)
- Search autocomplete
- Category filters
- Sort options (A-Z, Rarity, Popular)
- View mode toggle

**Interactions:**
- Hover: Preview card
- Click: Open modal
- Double-click: Quick add to favorites

**Animation:**
- Staggered fade-in
- Filter transition (smooth reorder)
- Search debounce (300ms)

**Testing:**
- Search works
- Filters accurate
- Sorting correct
- Mobile responsive

---

### **3.3 Ingredient Card**

**File:** `/components/explore/interactive/IngredientCard.jsx`

**Design:**
```
┌──────────────────────┐
│                      │
│        🌊           │ ← Emoji (3rem)
│                      │
│     Sea Moss         │ ← Name
│                      │
│  • 92 minerals       │ ← Benefits (2)
│  • Immune boost      │
│                      │
│  [Learn More →]      │ ← CTA
│                      │
└──────────────────────┘
```

**States:**
- Default: Subtle shadow
- Hover: Scale 1.05, glow
- Active: Scale 0.95
- Discovered: Gold border

**Animation:**
- Entry: Fade-in-up + stagger
- Hover: Smooth transform
- Emoji: Bounce on hover

**Psychology:**
- Visual: Large emoji attracts attention
- Curiosity: "Learn More" CTA
- Progress: "Discovered" state

---

### **3.4 Ingredient Detail Modal**

**File:** `/components/explore/interactive/IngredientDetailModal.jsx`

**Structure:**
```
┌─────────────────────────────────────┐
│  [X]                          [🔊]  │ ← Close + Audio
│                                      │
│          🌊 (Large)                 │ ← Hero
│         Sea Moss                     │
│   "Ocean's Superfood"               │
│                                      │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━     │ ← Tabs
│                                      │
│  [Benefits] [Story] [Science]       │
│                                      │
│  ✓ 92 Essential Minerals            │
│    Supports thyroid health...       │
│                                      │
│  ✓ Immune System Support            │
│    Natural antiviral properties...  │
│                                      │
│  [...more benefits]                 │
│                                      │
│  ┌──────────────────────────────┐  │
│  │  Products with Sea Moss →    │  │ ← CTA
│  └──────────────────────────────┘  │
│                                      │
│  Related: 🥬 🌱 🍃                  │
└─────────────────────────────────────┘
```

**Tabs:**
1. **Benefits:** Animated list
2. **Story:** Scroll-triggered paragraphs
3. **Science:** Expandable cards
4. **Products:** Grid of products

**Animations:**
- Open: Scale + fade
- Tab switch: Slide
- Benefit items: Stagger reveal
- Close: Fade + scale down

**Sound Effects:**
- Open: "whoosh"
- Tab switch: "tap"
- Benefit reveal: "sparkle"

**Testing:**
- Modal opens/closes
- Tabs work
- Animations smooth
- Products load

---

### **3.5 Ingredient API Routes**

**Files:**
```
/app/api/ingredients/route.js          (GET all)
/app/api/ingredients/[slug]/route.js   (GET one)
```

**Endpoints:**

**GET /api/ingredients**
```javascript
Response: {
  success: true,
  ingredients: Ingredient[],
  count: number,
  categories: string[]
}
```

**GET /api/ingredients/[slug]**
```javascript
Response: {
  success: true,
  ingredient: Ingredient,
  relatedProducts: Product[],
  relatedIngredients: Ingredient[]
}
```

**Implementation:**
- Read from INGREDIENT_DATABASE
- Enrich with product data
- Cache responses (SWR)

---

**Phase 3 Deliverables:**
- ✅ All 46 ingredients have full data
- ✅ Explorer grid works
- ✅ Search/filter functional
- ✅ Detail modal complete
- ✅ API endpoints live

**Status Check:** Can browse ingredients, see details, find products

---

## PHASE 4: 3D & AR SHOWCASE (Days 8-10)

### **4.1 Model Viewer Component**

**File:** `/components/explore/3d/ModelViewer.jsx`

**Implementation:**
```jsx
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Environment } from '@react-three/drei'
import { Suspense } from 'react'

export default function ModelViewer({ modelUrl, autoRotate }) {
  return (
    <Canvas camera={{ position: [0, 0, 5] }}>
      <Suspense fallback={<LoadingSpinner />}>
        <ambientLight intensity={0.5} />
        <spotLight position={[10, 10, 10]} angle={0.15} />
        <Model url={modelUrl} />
        <OrbitControls 
          autoRotate={autoRotate}
          enablePan={false}
          minDistance={3}
          maxDistance={10}
        />
        <Environment preset="studio" />
      </Suspense>
    </Canvas>
  )
}
```

**Features:**
- Drag to rotate
- Scroll to zoom
- Auto-rotate toggle
- Lighting presets
- Fullscreen mode
- Loading state

**Controls:**
- Touch: One finger rotate, pinch zoom
- Mouse: Click-drag rotate, scroll zoom
- Keyboard: Arrow keys rotate

**Performance:**
- Lazy load (React.lazy)
- LOD on mobile
- Compressed textures

**Testing:**
- Model loads
- Controls work
- Mobile gestures
- Performance check

---

### **4.2 AR Viewer Component**

**File:** `/components/explore/3d/ARViewer.jsx`

**Implementation:**
```jsx
import { useEffect, useRef } from 'react'
import '@google/model-viewer'

export default function ARViewer({ modelUrl, iosUrl }) {
  return (
    <model-viewer
      src={modelUrl}
      ios-src={iosUrl}
      ar
      ar-modes="webxr scene-viewer quick-look"
      camera-controls
      auto-rotate
      shadow-intensity="1"
      style={{ width: '100%', height: '500px' }}
    />
  )
}
```

**Features:**
- WebXR (Android Chrome)
- Quick Look (iOS Safari)
- Scene Viewer (Android)
- Fallback to 3D viewer
- Tutorial overlay

**File Formats:**
- Android: .glb
- iOS: .usdz
- Fallback: .gltf

**Testing:**
- AR works on iOS
- AR works on Android
- Fallback on desktop
- Tutorial clear

---

### **4.3 Product Showcase 3D**

**File:** `/components/explore/3d/ProductShowcase3D.jsx`

**Concept:**
- Central product model
- Ingredients orbit around it
- Click ingredient to highlight
- Exploded view animation
- Info tooltips

**Animation:**
- Ingredients: Circular orbit
- Hover: Zoom + glow
- Click: Spotlight effect
- Particles on interaction

**Implementation:**
- Three.js custom scene
- React Three Fiber
- Spring physics (react-spring)

**Testing:**
- Orbiting smooth
- Click interactions
- Performance OK
- Mobile works

---

### **4.4 3D Assets Preparation**

**Models Needed:**
- 5-10 product models (sea moss jars, bottles)
- 5-10 ingredient models (fruits, herbs)
- Placeholder models (simple shapes)

**Format:**
- Primary: .glb (compressed)
- iOS AR: .usdz
- Max size: 2MB per model

**Optimization:**
- Draco compression
- Texture atlasing
- Simplified geometry
- LOD levels

**Sources:**
- Sketchfab (free models)
- Poly Pizza (simple shapes)
- Blender (custom creation)

---

### **4.5 3D Showcase Page**

**File:** `/app/(explore)/showcase/page.js`

**Layout:**
```
┌─────────────────────────────────────┐
│  Product 3D Showcase                 │
│                                      │
│  [Model Viewer - Full Height]       │
│                                      │
│  ┌──────────────────────────────┐  │
│  │  🌊 Sea Moss    ✓ Selected   │  │
│  │  🍍 Pineapple                 │  │
│  │  🍋 Lemon                     │  │
│  └──────────────────────────────┘  │
│                                      │
│  [View in AR]  [Add to Cart]        │
└─────────────────────────────────────┘
```

**Features:**
- Product selector
- Ingredient highlights
- AR launcher
- Quick add to cart
- Share button

---

**Phase 4 Deliverables:**
- ✅ 3D viewer working
- ✅ AR functional on mobile
- ✅ Product showcase live
- ✅ 5+ models available

**Status Check:** Can view 3D models, launch AR, see products in space

---

## PHASE 5: MINI-GAMES (Days 11-14)

### **5.1 Game Engine Utility**

**File:** `/lib/explore/game-engine.js`

**Features:**
- Score calculation
- Timer management
- High score storage
- Leaderboard sync
- Achievement system

**API:**
```javascript
GameEngine.startGame(gameId)
GameEngine.updateScore(points)
GameEngine.endGame()
GameEngine.getHighScore(gameId)
GameEngine.unlockAchievement(id)
```

**Storage:**
- LocalStorage: User high scores
- API: Global leaderboard
- Offline support

---

### **5.2 Blend Maker Game**

**File:** `/components/explore/games/BlendMaker.jsx`

**Mechanics:**
1. Ingredient palette (left sidebar)
2. Blender (center)
3. Drag ingredients into blender
4. Blend animation
5. See combined benefits
6. Get recommendations
7. Save/share blend

**Scoring:**
- 10 points per ingredient
- Synergy bonus (+50%)
- Completeness bonus (+25%)
- Time bonus (fast blends)

**Animations:**
- Drag: Follow cursor
- Drop: Splash into blender
- Blend: Spinning + particles
- Result: Confetti

**Sound:**
- Drag: "pick up"
- Drop: "splash"
- Blend: "whirr"
- Success: "ding"

**Testing:**
- Drag works (mouse + touch)
- Blender animation smooth
- Scoring accurate
- Recommendations relevant

---

### **5.3 Ingredient Quiz**

**File:** `/components/explore/games/IngredientQuiz.jsx`

**Question Types:**
1. **Match Benefit:**
   - "Which ingredient supports immunity?"
   - Options: 4 ingredients

2. **Identify Icon:**
   - Show emoji
   - "What is this?"
   - Options: 4 names

3. **True/False:**
   - "Sea moss has 92 minerals"
   - Options: True/False

4. **Product Match:**
   - "Which product contains turmeric?"
   - Options: 4 products

**Format:**
- 10 questions per round
- 30 seconds per question
- Multiple choice
- Visual feedback
- Progress bar

**Scoring:**
- Correct: 10 points
- Fast: +5 bonus (< 10s)
- Streak: 2× multiplier (3+)

**Animations:**
- Question: Slide in
- Answer: Pulse selected
- Correct: Green glow
- Wrong: Shake

**Sound:**
- Correct: "ding"
- Wrong: "buzz"
- Timer: "tick" (last 5s)
- Complete: "fanfare"

---

### **5.4 Memory Match Game**

**File:** `/components/explore/games/MemoryMatch.jsx`

**Mechanics:**
1. Grid of face-down cards
2. Click to flip
3. Match two same cards
4. Keep matched cards face-up
5. Complete all pairs to win

**Difficulty:**
- Easy: 8 cards (4 pairs)
- Medium: 16 cards (8 pairs)
- Hard: 24 cards (12 pairs)

**Scoring:**
- Moves: Track attempts
- Time: Track seconds
- Stars: 1-3 based on performance
  - 3 stars: < 20 moves
  - 2 stars: 20-30 moves
  - 1 star: 30+ moves

**Animations:**
- Flip: rotateY(180deg)
- Match: Scale + pulse
- Mismatch: Shake + flip back
- Win: Confetti burst

**Sound:**
- Flip: "card"
- Match: "success"
- Mismatch: "error"
- Win: "victory"

---

### **5.5 Games Hub Page**

**File:** `/app/(explore)/games/page.js`

**Layout:**
```
┌─────────────────────────────────────┐
│  Wellness Games 🎮                   │
│                                      │
│  ┌──────────┐ ┌──────────┐         │
│  │ 🧪       │ │ 🧠       │         │
│  │ Blend    │ │ Quiz     │         │
│  │ Maker    │ │ Time!    │         │
│  │          │ │          │         │
│  │ [Play]   │ │ [Play]   │         │
│  └──────────┘ └──────────┘         │
│                                      │
│  ┌──────────┐ ┌──────────┐         │
│  │ 🃏       │ │ 🎯       │         │
│  │ Memory   │ │ Coming   │         │
│  │ Match    │ │ Soon     │         │
│  │          │ │          │         │
│  │ [Play]   │ │ [Locked] │         │
│  └──────────┘ └──────────┘         │
│                                      │
│  Leaderboard:                        │
│  1. Player123 - 9,850 pts           │
│  2. Wellness - 8,500 pts            │
│  3. You - 7,200 pts                 │
└─────────────────────────────────────┘
```

**Features:**
- Game cards with preview
- Play buttons
- High scores
- Leaderboard (top 10)
- Achievement showcase

---

### **5.6 Game API Routes**

**Files:**
```
/app/api/games/route.js
/app/api/games/[gameId]/score/route.js
/app/api/games/[gameId]/leaderboard/route.js
```

**Endpoints:**

**POST /api/games/[gameId]/score**
```javascript
Body: {
  score: number,
  moves?: number,
  time?: number,
  metadata?: object
}
Response: {
  success: true,
  isHighScore: boolean,
  rank: number
}
```

**GET /api/games/[gameId]/leaderboard**
```javascript
Response: {
  success: true,
  leaderboard: [
    { rank: 1, name: string, score: number }
  ],
  userRank?: number
}
```

---

**Phase 5 Deliverables:**
- ✅ 3 playable games
- ✅ Game engine working
- ✅ Leaderboard functional
- ✅ Achievements unlockable

**Status Check:** Can play games, compete on leaderboard, earn achievements

---

## PHASE 6: EDUCATIONAL STORIES (Days 15-16)

### **6.1 Scroll Story Component**

**File:** `/components/explore/interactive/ScrollStory.jsx`

**Implementation:**
- Intersection Observer
- Scroll position tracking
- Sticky sections
- Parallax backgrounds
- Fade transitions

**Chapters:**
1. Hero (full screen)
2. Origin story
3. Journey/process
4. Benefits reveal
5. Science/research
6. CTA (products/learn more)

**Animations:**
- Fade in/out based on scroll
- Parallax: Background slower
- Scale: Zoom in on scroll
- Slide: Side elements

**Testing:**
- Smooth scrolling
- Animations trigger correctly
- Mobile performance
- Accessibility (keyboard)

---

### **6.2 Benefit Timeline**

**File:** `/components/explore/interactive/BenefitTimeline.jsx`

**Design:**
```
    ━━━━━━━━━━━━━━━━━━━━━
    │
  ● │  Immune Support
    │  Natural antiviral...
    │  [Expand]
    │
    ━━━━━━━━━━━━━━━━━━━━━
    │
  ● │  Thyroid Health
    │  Iodine-rich...
    │  [Expand]
    │
    ━━━━━━━━━━━━━━━━━━━━━
```

**Features:**
- SVG timeline line
- Animated line draw
- Scroll-triggered items
- Expandable details
- Source citations

**Animation:**
- Line: Stroke draw on scroll
- Items: Slide from alternating sides
- Icons: Pop + bounce
- Expand: Smooth height

---

### **6.3 Ingredient Story Pages**

**File:** `/app/(explore)/ingredients/[slug]/page.js`

**Structure:**
1. **Hero:**
   - Large emoji
   - Name + tagline
   - CTA scroll indicator

2. **Scroll Story:**
   - Origin narrative
   - Journey to product
   - Benefits timeline
   - Science section
   - Product showcase

3. **Interactive Elements:**
   - 3D model (if available)
   - Benefit cards
   - Related ingredients
   - Products grid

**Psychology:**
- Story arc: Beginning → Middle → End
- Emotional connection: Origin story
- Education: Science facts
- Action: Product recommendations

---

**Phase 6 Deliverables:**
- ✅ Scroll story component
- ✅ Timeline component
- ✅ 5+ ingredient story pages
- ✅ Smooth animations

**Status Check:** Can read ingredient stories, see timelines, feel engaged

---

## PHASE 7: KIOSK MODE (Days 17-18)

### **7.1 Kiosk Layout**

**File:** `/components/explore/kiosk/KioskLayout.jsx`

**Features:**
- Large touch targets (min 80px)
- High contrast UI
- Auto-reset (3 min idle)
- Fullscreen mode
- Wake lock
- Attract mode

**Design:**
- Simplified navigation (4 sections)
- No small text (min 1.5rem)
- Clear CTAs
- Progress indicators
- "Tap anywhere" prompts

---

### **7.2 Attract Mode**

**File:** `/components/explore/kiosk/AttractMode.jsx`

**Loop Content:**
1. Brand splash (5s)
2. Ingredient carousel (10s)
3. Product highlights (10s)
4. Benefits overview (10s)
5. CTA: "Tap to explore" (5s)

**Implementation:**
- Video/Lottie animation
- Auto-play
- Loop on idle
- Exit on any interaction

**Testing:**
- Loops correctly
- Exits on tap
- Resumes after idle
- Mobile compatible

---

### **7.3 Large Touch Buttons**

**File:** `/components/explore/kiosk/LargeTouchButton.jsx`

**Specs:**
- Size: 120px × 120px (minimum)
- Text: 1.5rem (minimum)
- Icon: 2.5rem
- Border: 4px solid
- Padding: 1.5rem
- Border-radius: 1rem

**States:**
- Default: High contrast
- Hover: Glow
- Active: Scale 0.95
- Disabled: 50% opacity

---

### **7.4 Kiosk Navigation**

**File:** `/components/explore/kiosk/KioskNavigation.jsx`

**Sections:**
- 🌿 Explore
- 🎮 Games
- 🛍️ Products
- 📚 Learn

**Design:**
- Fixed bottom bar
- Large buttons (25% width each)
- Active state clear
- Icons + labels

---

### **7.5 Kiosk Toggle**

**File:** `/app/(explore)/layout.js` (MODIFY)

**Feature:**
- Admin button to enable kiosk mode
- Persists in localStorage
- Changes layout globally
- Easy exit (hidden button)

**Implementation:**
```javascript
const [kioskMode, setKioskMode] = useState(false)

useEffect(() => {
  const mode = localStorage.getItem('kioskMode')
  setKioskMode(mode === 'true')
}, [])

const toggleKiosk = () => {
  localStorage.setItem('kioskMode', !kioskMode)
  setKioskMode(!kioskMode)
}
```

---

**Phase 7 Deliverables:**
- ✅ Kiosk layout functional
- ✅ Attract mode looping
- ✅ Large buttons working
- ✅ Auto-reset triggers
- ✅ Easy mode toggle

**Status Check:** Kiosk mode works at events, attracts attention, resets automatically

---

## PHASE 8: POLISH & OPTIMIZATION (Days 19-20)

### **8.1 Performance Optimization**

**Tasks:**
- Lazy load all games
- Lazy load 3D components
- Code splitting
- Image optimization
- Bundle analysis
- Lighthouse audit

**Targets:**
- First Contentful Paint: < 1.5s
- Time to Interactive: < 3.5s
- Largest Contentful Paint: < 2.5s
- Cumulative Layout Shift: < 0.1

---

### **8.2 Micro-Interactions**

**Add:**
- Button hover glows
- Card lift effects
- Smooth page transitions
- Loading skeletons
- Success animations
- Error shakes

**Guidelines:**
- Duration: 150-300ms
- Easing: ease-out
- Reduced motion support
- Consistent across site

---

### **8.3 Sound Effects Polish**

**Audit:**
- All buttons have tap sound
- Games have full audio
- Success celebrations
- Error feedback
- Mute works everywhere
- Volume persists

---

### **8.4 Mobile Optimization**

**Test:**
- Touch gestures
- Viewport sizes
- Performance
- Input lag
- Network conditions
- Battery usage

**Fix:**
- Reduce particles on mobile
- Lower 3D quality
- Compress assets
- Debounce interactions

---

### **8.5 Accessibility Audit**

**Check:**
- Keyboard navigation
- Screen reader support
- Focus indicators
- Color contrast (4.5:1)
- Touch target sizes (44×44px)
- Alt text
- ARIA labels

**Fix:**
- Add missing labels
- Improve focus order
- Test with screen reader
- Add skip links

---

### **8.6 Cross-Browser Testing**

**Browsers:**
- Chrome (desktop/mobile)
- Safari (desktop/mobile)
- Firefox (desktop)
- Edge (desktop)
- Samsung Internet (mobile)

**Features to Test:**
- 3D viewer
- AR mode
- Audio playback
- Animations
- Gestures
- LocalStorage

---

**Phase 8 Deliverables:**
- ✅ Lighthouse score > 90
- ✅ No accessibility violations
- ✅ All browsers work
- ✅ Mobile optimized
- ✅ Sound effects complete

**Status Check:** Site is fast, accessible, polished, production-ready

---

## PHASE 9: INTEGRATION & TESTING (Days 21-22)

### **9.1 Integration Testing**

**Flows to Test:**
1. **Explore → Ingredient → Product:**
   - Browse ingredients
   - Open detail
   - Click "Products with this"
   - Add to cart

2. **Games → Leaderboard → Achievements:**
   - Play game
   - Submit score
   - Check leaderboard
   - Unlock achievement

3. **3D → AR → Cart:**
   - View 3D model
   - Launch AR
   - Add from AR view
   - Complete checkout

4. **Kiosk → Idle → Reset:**
   - Enable kiosk mode
   - Wait 3 min idle
   - Verify reset
   - Check attract mode

---

### **9.2 End-to-End Tests (Playwright)**

**Write Tests:**
```
tests/explore/
  - ingredient-explorer.spec.js
  - ingredient-detail.spec.js
  - blend-maker.spec.js
  - quiz.spec.js
  - memory-match.spec.js
  - 3d-viewer.spec.js
  - kiosk-mode.spec.js
```

**Coverage:**
- Happy paths
- Error cases
- Edge cases
- Mobile flows

---

### **9.3 Performance Testing**

**Tools:**
- Lighthouse CI
- WebPageTest
- Bundle Analyzer
- Chrome DevTools

**Metrics:**
- Page load time
- JavaScript size
- Asset sizes
- 3D render FPS
- Memory usage
- Network requests

---

### **9.4 User Testing**

**Scenarios:**
1. New user explores ingredients
2. User plays all games
3. User views 3D models
4. User in kiosk mode
5. Mobile user experience

**Feedback:**
- Ease of use
- Clarity
- Engagement
- Performance
- Fun factor

---

**Phase 9 Deliverables:**
- ✅ All integration tests pass
- ✅ E2E tests written
- ✅ Performance meets targets
- ✅ User feedback positive

**Status Check:** Everything works together, no bugs, users love it

---

## PHASE 10: DEPLOYMENT & DOCUMENTATION (Day 23)

### **10.1 Documentation**

**Create:**
1. **User Guide:**
   - How to explore ingredients
   - How to play games
   - How to use 3D/AR
   - Kiosk mode setup

2. **Developer Docs:**
   - Component API
   - Adding new games
   - Adding 3D models
   - Customizing kiosk

3. **Admin Guide:**
   - Content management
   - Kiosk mode setup
   - Analytics dashboard
   - Troubleshooting

---

### **10.2 Deployment Checklist**

**Pre-Deploy:**
- [ ] All tests pass
- [ ] Lighthouse > 90
- [ ] No console errors
- [ ] Assets optimized
- [ ] ENV vars set
- [ ] Database backed up

**Deploy:**
- [ ] Build production
- [ ] Deploy to staging
- [ ] QA on staging
- [ ] Deploy to production
- [ ] Verify production
- [ ] Monitor errors

**Post-Deploy:**
- [ ] Smoke tests
- [ ] Analytics check
- [ ] User feedback
- [ ] Bug triage
- [ ] Hotfix if needed

---

### **10.3 Analytics Setup**

**Track:**
- Page views (explore pages)
- Ingredient views
- Game plays
- 3D model views
- AR launches
- Kiosk sessions
- Time on site
- Engagement metrics

**Tools:**
- PostHog (existing)
- Custom events
- Google Analytics
- Heatmaps (optional)

---

### **10.4 Handoff**

**Deliverables:**
- Complete codebase
- All documentation
- Test results
- Performance report
- User guide
- Training video
- Support plan

---

**Phase 10 Deliverables:**
- ✅ Documentation complete
- ✅ Deployed to production
- ✅ Analytics tracking
- ✅ Handoff successful

**Status Check:** Live, documented, tracked, supported

---

## TIMELINE SUMMARY

| Phase | Focus | Duration | Status |
|-------|-------|----------|--------|
| 1 | Foundation | 2 days | Pending |
| 2 | Explore Hub | 2 days | Pending |
| 3 | Ingredients | 3 days | Pending |
| 4 | 3D/AR | 3 days | Pending |
| 5 | Games | 4 days | Pending |
| 6 | Stories | 2 days | Pending |
| 7 | Kiosk | 2 days | Pending |
| 8 | Polish | 2 days | Pending |
| 9 | Testing | 2 days | Pending |
| 10 | Deploy | 1 day | Pending |

**Total:** 23 days (systematic build)

---

## SUCCESS CRITERIA

**Technical:**
- ✅ No breaking changes to existing code
- ✅ Lighthouse score > 90
- ✅ All tests pass
- ✅ Cross-browser compatible
- ✅ Mobile optimized

**User Experience:**
- ✅ Intuitive navigation
- ✅ Engaging interactions
- ✅ Smooth animations
- ✅ Fast load times
- ✅ Fun games

**Business:**
- ✅ Increased dwell time
- ✅ Higher engagement
- ✅ Product discovery
- ✅ Event-ready kiosk
- ✅ Positive feedback

---

**ROADMAP STATUS: ✅ COMPLETE**  
**Next:** Start Phase 1 implementation!
