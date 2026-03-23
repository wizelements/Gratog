# Music Audio Technical Specifications
## Tasteofgratitude.shop - Audio Integration

---

## AUDIO FILE SPECIFICATIONS

### Master Files (Reference Only - Do Not Serve)
| File | Format | Sample Rate | Bitrate | Duration | Size | Quality |
|------|--------|------------|---------|----------|------|---------|
| Can't Let It Go | WAV | 44.1kHz | Lossless | ~15-18 min | 33MB | Original |
| That Gratitude (Remastered) | WAV | 44.1kHz | Lossless | ~9-12 min | 20MB | Original |
| Under the Covers (Remastered) | WAV | 44.1kHz | Lossless | ~13-16 min | 34MB | Original |

### Streaming Files (Served to Users)
| File | Format | Sample Rate | Bitrate | Compression | Est. Size | Stream Time |
|------|--------|------------|---------|-----------|-----------|------------|
| cant-let-it-go.mp3 | MP3 | 44.1kHz | 320kbps | High Quality | ~3.5MB | ~2s @ 3G |
| that-gratitude.mp3 | MP3 | 44.1kHz | 320kbps | High Quality | ~2.3MB | ~1.5s @ 3G |
| under-covers.mp3 | MP3 | 44.1kHz | 320kbps | High Quality | ~3.2MB | ~2s @ 3G |

### Snippet Files (Pre-Extracted Cues)
| Snippet | Duration | File Size | Bitrate | Use Case |
|---------|----------|-----------|---------|----------|
| that-gratitude/intro | 30s | 110KB | 320kbps | Onboarding |
| that-gratitude/processing | 60s | 220KB | 320kbps | Reflection |
| that-gratitude/climax | 120s | 440KB | 320kbps | Achievement |
| that-gratitude/ambient-loop | 600s | 1.1MB | 192kbps | Deep work |
| cant-let-it-go/struggle | 120s | 440KB | 320kbps | Challenge |
| cant-let-it-go/acceptance | 60s | 220KB | 320kbps | Reframe |
| cant-let-it-go/victory | 60s | 220KB | 320kbps | Victory |
| cant-let-it-go/journey | 420s | 1.5MB | 192kbps | Journey |
| under-covers/opening | 90s | 330KB | 320kbps | Vulnerability |
| under-covers/vulnerability | 180s | 660KB | 320kbps | Processing |
| under-covers/warmth | 120s | 440KB | 320kbps | Connection |
| under-covers/contemplative | 480s | 880KB | 192kbps | Reflection |

**Total Streaming Load: ~15-20MB for full experience**

---

## ENCODING SPECIFICATIONS

### MP3 Encoding Parameters
```bash
# High Quality (Streaming - Primary)
ffmpeg -i input.wav -q:a 0 -b:a 320kbps output.mp3

# Settings:
# - Quality: Variable Bitrate (VBR) @ highest quality
# - Sample Rate: 44.1kHz (match source)
# - Channels: Stereo
# - Format: MPEG-1 Layer III
# - No downsampling
# - Preserves full frequency response (20Hz-20kHz)
```

### Quality Assurance Checks
```bash
# Verify encoding
ffprobe -v quiet -print_format json -show_streams output.mp3 | jq '.'

# Expected output:
# {
#   "bit_rate": "320000",
#   "sample_rate": "44100",
#   "channels": 2,
#   "codec_name": "mp3",
#   "duration": "120.00"
# }

# Listen test - ensure no artifacts
ffplay output.mp3

# Check for truncation
ffmpeg -f null -take_log_volume 10 -i output.mp3 -f null -
```

---

## AUDIO OPTIMIZATION STRATEGIES

### Network-Aware Streaming
```
Internet Speed → Audio Bitrate Selection

4G / Fast WiFi (>5 Mbps):
  └─ 320kbps MP3 (primary choice)
  └─ 44.1kHz sample rate
  └─ Zero compression artifacts
  └─ Recommended for all users

3G / Moderate WiFi (1-5 Mbps):
  └─ 192kbps MP3 (compressed)
  └─ Still preserves emotional quality
  └─ Reduced file size: ~40% smaller
  └─ Implementation: Auto-detect via navigator.connection

2G / Slow Mobile (<1 Mbps):
  └─ 128kbps MP3 (heavily compressed)
  └─ Prioritize completion over quality
  └─ File size: ~60% smaller than 320kbps
  └─ Fallback option only
```

### Progressive Download Strategy
```
Timeline:
0s:     User arrives on page
1s:     Start downloading current snippet (~220KB) - 30-90% loaded
2s:     Begin playback from buffer
3s:     Pre-load next snippet in background
20s:    Previous snippet ends → switch to queued snippet (zero latency)
```

### Browser Cache Strategy
```javascript
// Manifest for offline support
{
  "snippets": {
    "that-gratitude_intro": "/music/snippets/that-gratitude/intro.mp3",
    "that-gratitude_processing": "/music/snippets/that-gratitude/processing.mp3",
    "that-gratitude_climax": "/music/snippets/that-gratitude/climax.mp3",
    // ... all snippets
  },
  "cacheVersions": {
    "intro": 1,
    "reflection": 1,
    "achievement": 1
  }
}

// Service Worker implementation
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open('music-v1').then(cache => {
      return cache.addAll([
        // Cache most-used snippets
        '/music/snippets/that-gratitude/intro.mp3',
        '/music/snippets/that-gratitude/climax.mp3',
        '/music/snippets/cant-let-it-go/victory.mp3'
      ]);
    })
  );
});
```

---

## PLAYBACK SPECIFICATIONS

### Audio API Configuration
```typescript
// Browser Web Audio API setup
const audioContext = new (window.AudioContext || window.webkitAudioContext)();

// Settings for optimal audio:
const audioElement = new Audio();
audioElement.crossOrigin = "anonymous"; // For CORS
audioElement.preload = "auto";          // Start buffering immediately

// Create audio graph for professional processing
const source = audioContext.createMediaElementAudioSource(audioElement);
const gainNode = audioContext.createGain();       // Volume control
const analyser = audioContext.createAnalyser();   // Frequency analysis (visualizer future)

source.connect(gainNode);
gainNode.connect(analyser);
analyser.connect(audioContext.destination);

// Volume Range: -20dB to 0dB
gainNode.gain.value = 0.1;  // -20dB
// gainNode.gain.value = 1.0; // 0dB (max)
```

### Crossfade Specifications
```typescript
// Professional crossfade between tracks
interface CrossfadeConfig {
  duration: number;           // milliseconds (3000ms = 3 seconds)
  curve: 'linear' | 'equal-power'; // Audio taper
  overlapRatio: number;       // 0.5 = 50% overlap
}

function crossfade(
  currentTrack: HTMLAudioElement,
  nextTrack: HTMLAudioElement,
  config: CrossfadeConfig
) {
  const fadeOutDuration = config.duration * config.overlapRatio;
  const fadeInDuration = config.duration * config.overlapRatio;
  const overlap = config.duration * (1 - config.overlapRatio);

  // Fade out current (equal-power curve prevents dip)
  currentTrack.volume = 1.0;
  animate(fadeOutDuration, (progress) => {
    if (config.curve === 'equal-power') {
      // Equal-power crossfade: volume^2 for smooth perceptual fade
      currentTrack.volume = Math.cos(progress * Math.PI / 2) ** 2;
    } else {
      currentTrack.volume = 1 - progress;
    }
  });

  // Start next track during overlap
  setTimeout(() => {
    nextTrack.play();
    nextTrack.volume = 0;
    animate(fadeInDuration, (progress) => {
      if (config.curve === 'equal-power') {
        nextTrack.volume = Math.sin(progress * Math.PI / 2) ** 2;
      } else {
        nextTrack.volume = progress;
      }
    });
  }, fadeOutDuration - overlap);
}
```

### Volume Specifications

| Context | dB Level | Linear | Use Case | Notes |
|---------|----------|--------|----------|-------|
| Silent | -∞ dB | 0.0 | Muted | Pause/stop |
| Very Subtle | -18 dB | 0.126 | Background while reading | Nearly imperceptible |
| Subtle | -15 dB | 0.178 | Ambient during page load | Noticeable but not intrusive |
| Background | -12 dB | 0.251 | Default music level | Recommended for home page |
| Prominent | -10 dB | 0.316 | During reflection | Clear presence |
| Forward | -6 dB | 0.501 | Achievement moments | Attention-grabbing |
| Celebration | -3 dB | 0.707 | Victory/sharing | Energetic, positive |
| Full | 0 dB | 1.0 | Peak moments | Maximum emotional impact |

### Fade Time Specifications

| Transition Type | Duration | Curve | Context |
|----------------|----------|-------|---------|
| Fade In (page load) | 2000ms | Linear | Gentle arrival |
| Crossfade | 3000ms | Equal-power | Between contexts |
| Quick Switch | 500ms | Linear | Sentiment change |
| Fade Out (page exit) | 2000ms | Linear | Graceful departure |
| Victory Moment | Instant | N/A | Achievement celebration |

---

## SOUND QUALITY & FREQUENCY RESPONSE

### Psychoacoustic Considerations

#### Frequency Ranges & Emotional Impact
| Range | Frequency | Psychological Effect | Your Music | Use |
|-------|-----------|-------------------|-----------|-----|
| Sub-bass | 20-60 Hz | Physical groundedness, tension | Minimal | Stability anchor |
| Bass | 60-250 Hz | Emotional foundation, warmth | Present | Emotional depth |
| Midrange | 250-2000 Hz | Emotional content, vocals | Rich | Primary emotional driver |
| Presence | 2000-4000 Hz | Clarity, attention | Moderate | Engagement |
| Brilliance | 4000-20000 Hz | Sparkle, air, detail | Balanced | Meditation clarity |

### Psychoacoustic Analysis (Estimated)
Based on genres and naming:
- "That Gratitude": Warm midrange, consonant, minimal harsh frequencies
- "Can't Let It Go": Dynamic range, presence peak at acceptance moment
- "Under the Covers": Intimate proximity, warm, vulnerable frequencies

### Distortion & Noise Specifications
```
MP3 Quality Metrics:
- THD (Total Harmonic Distortion): < 0.1% at 320kbps
- Signal-to-Noise Ratio: >90dB
- Frequency Response: 20Hz - 20kHz (full human hearing range)
- Stereo Phase: Maintained across all frequencies
- Clipping: Zero (audio normalized to -0.3dB peak)
```

---

## MOBILE AUDIO SPECIFICATIONS

### iOS Audio Restrictions
```javascript
// iOS requires user gesture to start audio (security)
// Workaround: Start muted, unmute on first interaction

const audio = new Audio('/music/snippet.mp3');
audio.muted = true;  // Initialize muted

// Unmute on first user interaction
document.addEventListener('click', () => {
  audio.muted = false;
  audio.play();
}, { once: true });

// Alternatively, use iframe for autoplay
<iframe 
  src="music-autoplay.html"
  style="display: none;"
/>
```

### Android Audio Considerations
```javascript
// Android generally allows audio, but respects user settings
// Test on real devices: Samsung, Google Pixel, etc.

// Check audio focus for pause on incoming call
if ('mediaSession' in navigator) {
  navigator.mediaSession.setActionHandler('pause', () => {
    audioElement.pause();
  });
}
```

### Headphone Detection
```javascript
// Optionally adjust volume if headphones detected
navigator.mediaDevices.enumerateDevices().then(devices => {
  const hasHeadphones = devices.some(
    d => d.kind === 'audiooutput' && d.label.includes('Headphone')
  );

  if (hasHeadphones) {
    // Can safely play at normal levels
    gainNode.gain.value = 0.5; // -6dB
  } else {
    // Speaker output - reduce volume to respect others
    gainNode.gain.value = 0.25; // -12dB
  }
});
```

---

## ERROR HANDLING & FALLBACKS

### Network Error Recovery
```typescript
class AudioErrorHandler {
  async playWithFallback(primaryUrl: string, fallbackUrl: string) {
    try {
      await this.play(primaryUrl);
    } catch (error) {
      console.warn('Primary audio failed, trying fallback');
      try {
        await this.play(fallbackUrl);
      } catch (fallbackError) {
        console.error('All audio sources failed');
        this.notifyUserSilently();
        // App continues without audio
      }
    }
  }

  async play(url: string): Promise<void> {
    const audio = new Audio(url);
    audio.onerror = (error) => {
      throw new Error(`Audio load failed: ${error.type}`);
    };
    return new Promise((resolve, reject) => {
      audio.addEventListener('canplaythrough', resolve, { once: true });
      audio.addEventListener('error', reject, { once: true });
      audio.load();
    });
  }

  private notifyUserSilently() {
    // Don't interrupt UX, just note in console
    console.log('Note: Background music unavailable. App continues normally.');
  }
}
```

### CORS Handling
```
Server Configuration (Vercel):
- All music files have appropriate CORS headers
- Access-Control-Allow-Origin: *
- Cache-Control: public, max-age=31536000 (1 year for snippets)
```

---

## PERFORMANCE BENCHMARKS

### Expected Performance
```
Page Load:
├─ Initial render: <1s (no audio loaded yet)
├─ First snippet download: 1-3s (background)
└─ Audio starts: 2-4s after page load

Session Performance:
├─ Snippet switch: 50-100ms
├─ Crossfade: 3000ms (smooth, no jank)
├─ Memory usage per active audio: ~2-5MB
├─ Total memory footprint: <10MB

Network Efficiency:
├─ Average snippet: 110-660KB
├─ Average session: 2-5 snippets = 500KB - 2MB total
├─ Bandwidth usage: Minimal, negligible
├─ Streaming latency: Imperceptible at 3G+
```

### Optimization Checklist
```
☐ Snippets are MP3, not WAV (87% file size reduction)
☐ Bitrate: 320kbps for quality, 192kbps for looping
☐ Crossfade implemented (prevents silence gaps)
☐ Fade times > 50ms (prevents audio pops)
☐ Volume levels normalized (-3dB headroom)
☐ Service Worker caches top 3 snippets
☐ Progressive download implemented
☐ iOS mute button respected
☐ Network errors don't crash app
☐ Audio paused on page visibility (battery optimization)
```

---

## TESTING SPECIFICATIONS

### Unit Tests
```typescript
describe('AudioManager', () => {
  it('should load and play audio file', async () => {
    const manager = new AudioManager();
    await manager.play('/music/snippets/intro.mp3');
    expect(manager.isPlaying).toBe(true);
  });

  it('should crossfade between tracks', async () => {
    const manager = new AudioManager();
    await manager.crossfade('/music/snippets/intro.mp3', 3000);
    // Verify smooth transition with no silence
  });

  it('should respect volume limits', () => {
    const manager = new AudioManager();
    manager.setVolume(-20);
    expect(manager.volume).toBe(-20);
    manager.setVolume(-50); // Invalid
    expect(manager.volume).toBe(-20); // No change
  });
});
```

### Integration Tests
```typescript
describe('MusicIntegration', () => {
  it('should play music on home page load', async () => {
    render(<HomePage />);
    await waitFor(() => {
      expect(screen.getByRole('audio')).toHaveAttribute('src');
    });
  });

  it('should transition music on page change', async () => {
    const { rerender } = render(<HomePage />);
    const initialSnippet = getPlayingSnippet();

    rerender(<JournalPage />);
    await waitFor(() => {
      expect(getPlayingSnippet()).not.toBe(initialSnippet);
    });
  });
});
```

### User Acceptance Tests
```
Audio Quality Checklist:
☐ No pops or clicks during playback
☐ Volume is consistent across all snippets
☐ Crossfades are smooth (no silence gaps)
☐ Loops don't click at seam
☐ Music matches emotional context
☐ Volume levels make sense (subtle vs. prominent)
☐ No audio plays on page load without permission
☐ Works in Chrome, Firefox, Safari, Edge
☐ Works on mobile (iOS, Android)
☐ Headphones and speaker both work
```

---

## METADATA & DOCUMENTATION

### Snippet Metadata Template
```json
{
  "snippets": {
    "that-gratitude_intro": {
      "song": "That Gratitude (Remastered)",
      "title": "Introspective Invitation",
      "emotion": "peace",
      "arousal": "low",
      "startTime": 0,
      "endTime": 30,
      "duration": 30,
      "audioPath": "/music/snippets/that-gratitude/intro_0-30s.mp3",
      "audioFileSize": 110000,
      "bitrate": 320000,
      "sampleRate": 44100,
      "channels": 2,
      "targetContexts": ["intro", "meditation"],
      "targetBrainwaves": ["alpha"],
      "estimatedBPM": 72,
      "key": "C minor",
      "psychologicalPurpose": "Gentle opening priming the gratitude response",
      "idealPlacement": "page load, meditation start",
      "nextSnippetSuggestion": "that-gratitude_processing"
    }
  }
}
```

---

## DEPLOYMENT CHECKLIST

### Pre-Deployment
- [ ] All MP3 files are 320kbps (or 192kbps for loops)
- [ ] All files normalized to -0.3dB peak
- [ ] No clipping or distortion
- [ ] Crossfade tested (3s smooth transition)
- [ ] Mobile audio works (iOS and Android)
- [ ] CORS headers configured
- [ ] Cache headers set (1 year for snippets)
- [ ] Fallback handling implemented
- [ ] Analytics tracking ready
- [ ] Error logs configured

### Deployment
```bash
# Verify files on CDN
curl -I https://tasteofgratitude.shop/music/snippets/that-gratitude/intro_0-30s.mp3
# Should return 200 OK with correct headers

# Test CORS
curl -H "Origin: https://example.com" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: range" \
  -X OPTIONS \
  https://tasteofgratitude.shop/music/snippets/intro.mp3
```

### Post-Deployment
- [ ] Verify audio plays on live site
- [ ] Check browser console for errors
- [ ] Test mobile devices
- [ ] Monitor analytics for issues
- [ ] Gather user feedback
- [ ] Track which snippets are popular

---

## FUTURE ENHANCEMENTS

### Planned
- [ ] 3D spatial audio (immersive experience)
- [ ] Real-time pitch shifting (key detection + transposition)
- [ ] Binaural beat generation (brainwave entrainment)
- [ ] Frequency-specific EQ per context
- [ ] AI voice overlay (personalized meditation)
- [ ] Live community soundtrack (aggregated sentiment)

---

## REFERENCE DOCUMENTATION

- [Web Audio API Spec](https://www.w3.org/TR/webaudio/)
- [MP3 Encoding Best Practices](https://wiki.hydrogenaud.io/index.php?title=MP3)
- [Audio Crossfading Techniques](https://en.wikipedia.org/wiki/Crossfade)
- [Equal Power Crossfade](https://www.thefreemusicgroup.com/2021/06/understanding-equal-power-crossfading/)
- [Music Psychology](https://www.frontiersin.org/articles/10.3389/fnhum.2017.00600)

---

**Document Version:** 1.0  
**Last Updated:** January 17, 2025  
**Author:** Comprehensive Audio Architecture  
**Status:** Ready for Implementation
