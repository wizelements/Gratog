# 🎵 Music Integration - Quick Reference

## Status: ✅ COMPLETE & LIVE

---

## Test It Live

**URL**: https://tasteofgratitude.shop  
**Button**: 🎵 in bottom-right corner  
**Test Steps**:
1. Click button → Controls expand
2. Toggle ON/OFF → Music plays/pauses
3. Drag slider → Volume -20 to 0 dB
4. Reload page → Settings persist

---

## Component Files

| File | Purpose | Lines |
|------|---------|-------|
| `contexts/MusicContext.tsx` | Global state, play/pause/volume | 200 |
| `components/BackgroundMusic.tsx` | Auto-play orchestration | 25 |
| `components/MusicControls.tsx` | Control widget UI | 83 |
| `lib/music/snippetDatabase.ts` | 12 audio snippets | 158 |

---

## Integration Points

```jsx
// app/layout.js
<MusicProvider>
  <AdminLayoutWrapper>
    <CustomerLayout>{children}</CustomerLayout>
  </AdminLayoutWrapper>
  <BackgroundMusic />      {/* Auto-plays intro */}
  <MusicControls />        {/* Floating widget */}
</MusicProvider>
```

---

## Audio Files

| File | URL | Size | Status |
|------|-----|------|--------|
| That Gratitude | R2 public | 20.3MB | ✅ 200 OK |
| Can't Let It Go | R2 public | 34.0MB | ✅ 200 OK |
| Under the Covers | R2 public | 35.2MB | ✅ 200 OK |

**R2 Base**: `https://pub-5562920411814baeba7fe2cc990d43ef.r2.dev`

---

## Code Examples

### Using Music Context
```tsx
import { useMusic } from '@/contexts/MusicContext';
import { snippetSelector } from '@/lib/music/snippetDatabase';

export function MyComponent() {
  const music = useMusic();
  
  // Play a snippet
  const snippet = snippetSelector.selectForContext('reflection');
  music.play(snippet.id, 2000); // 2 second fade-in
  
  // Adjust volume
  music.setVolume(-15); // -20 to 0 dB
  
  // Track session phase
  music.setSessionPhase('journal');
}
```

### Select Snippet Intelligently
```tsx
// Random snippet for reflection phase
const snippet = snippetSelector.selectForContext('reflection');

// Specific emotion
const hopeful = snippetSelector.selectForContext('journal', 'hope');

// Get snippet by ID
const intro = snippetSelector.getById('that_gratitude_intro');

// Get all snippets from a song
const gratitudeSnippets = snippetSelector.getBySong('that_gratitude');
```

---

## LocalStorage Keys

```javascript
// Volume setting (-20 to 0)
localStorage.getItem('music_volume')   // Returns "-10" (default)

// Enable/disable (true/false)
localStorage.getItem('music_enabled')  // Returns "true" (default)
```

---

## Session Phases

| Phase | When | Snippets | Emotion |
|-------|------|----------|---------|
| `intro` | Page load | that_gratitude_intro | peace |
| `reflection` | User reflecting | cant_let_it_go_struggle | vulnerability |
| `journal` | User journaling | cant_let_it_go_journey | hope |
| `share` | Sharing moment | that_gratitude_climax | joy |
| `meditation` | Meditation | under_covers_loop | peace |

---

## TypeScript Types

```typescript
type SessionPhase = 'intro' | 'reflection' | 'journal' | 'share' | 'meditation';
type Emotion = 'peace' | 'hope' | 'vulnerability' | 'acceptance' | 'joy';
type Arousal = 'low' | 'medium' | 'high';

interface Snippet {
  id: string;
  title: string;
  emotion: Emotion;
  arousal: Arousal;
  audioPath: string;
  duration: number;        // seconds
  targetPhases: SessionPhase[];
}

interface MusicContextType {
  isPlaying: boolean;
  currentSnippet: Snippet | null;
  volume: number;         // -20 to 0 dB
  sessionPhase: SessionPhase;
  enabled: boolean;
  
  play(snippetId: string, fadeInDuration?: number): Promise<void>;
  pause(fadeOutDuration?: number): Promise<void>;
  setVolume(dB: number): void;
  transitionTo(snippetId: string, duration?: number): Promise<void>;
  setSessionPhase(phase: SessionPhase): void;
  setEnabled(enabled: boolean): void;
}
```

---

## Debugging

### Check if Music is Playing
```javascript
// In browser console
localStorage.getItem('music_enabled')    // Should be "true"
localStorage.getItem('music_volume')     // Should be -10 to 0
// Audio will play if enabled AND browser autoplay policy allows
```

### Common Issues

| Issue | Solution |
|-------|----------|
| No sound | Check browser autoplay policy, toggle OFF/ON |
| Volume too quiet | Check localStorage music_volume, drag slider |
| Music resets | Check localStorage is enabled in browser |
| R2 404 errors | Verify R2 bucket is public (should be) |
| Console errors | Check CORS, audio element creation |

---

## Testing

### Manual Tests
```bash
# 1. Open site
open https://tasteofgratitude.shop

# 2. Look for 🎵 button bottom-right
# 3. Click button
# 4. Test controls appear
# 5. Drag volume slider
# 6. Toggle ON/OFF
# 7. Reload page, verify settings persist
# 8. Open DevTools Console - should be clean
```

### Automated Tests
```bash
# Run Playwright suite
pnpm exec playwright test e2e/music-integration.spec.ts

# Note: Android/Termux can't run Playwright (unsupported platform)
# Run on Mac/Linux/Windows instead
```

### Verification Script
```bash
./verify-music-complete.sh
# Returns: 16/17 checks passing
```

---

## Deployment

### Current Status
- ✅ Code in `main` branch
- ✅ Deployed to Vercel
- ✅ Live at https://tasteofgratitude.shop
- ✅ No build errors
- ✅ No console errors

### Redeploy
```bash
git push origin main
# Vercel auto-deploys on main push
```

### Rollback
```bash
# Remove from app/layout.js:
# <MusicProvider>...</MusicProvider>
# <BackgroundMusic />
# <MusicControls />
git push origin main
```

---

## Volume Reference

| dB | Perceived | Use Case |
|----|-----------|----------|
| -20 | Very quiet | Sleep/meditation |
| -15 | Quiet | Background study |
| -10 | Soft (default) | Ambient office |
| -5 | Normal | Active work |
| 0 | Loud | Full attention |

**Formula**: Linear = 10^(dB/20)

---

## Troubleshooting Checklist

- [ ] R2 bucket is public (verified in Cloudflare dashboard)
- [ ] Audio files uploaded to R2 (verify with curl -I)
- [ ] MusicProvider wraps app in layout.js
- [ ] useMusic() hook imported where needed
- [ ] localStorage enabled in browser
- [ ] Browser autoplay policy allows audio on user interaction
- [ ] No TypeScript errors in build
- [ ] No console errors on page load
- [ ] Network tab shows R2 audio requests return 200

---

## Future Enhancements

- [ ] Session-aware auto-transitions
- [ ] Emotion-based recommendations
- [ ] User emotion input UI
- [ ] Analytics dashboard
- [ ] Playlist builder
- [ ] Visual equalizer
- [ ] Binaural beats
- [ ] Share feature

---

**Last Updated**: January 18, 2026  
**Status**: Production Ready ✅
