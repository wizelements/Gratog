import { Snippet, SessionPhase, Emotion } from '@/contexts/MusicContext';

const R2_BASE = 'https://pub-5562920411814baeba7fe2cc990d43ef.r2.dev';

export const SNIPPETS: Snippet[] = [
  // ===== THAT GRATITUDE =====
  {
    id: 'that_gratitude_intro',
    title: 'Introspective Invitation',
    emotion: 'peace',
    arousal: 'low',
    audioPath: `${R2_BASE}/That%20Gratitude%20%28Remastered%29.wav`,
    duration: 30,
    targetPhases: ['intro', 'meditation'],
  },
  {
    id: 'that_gratitude_processing',
    title: 'Emotional Processing',
    emotion: 'acceptance',
    arousal: 'medium',
    audioPath: `${R2_BASE}/That%20Gratitude%20%28Remastered%29.wav`,
    duration: 60,
    targetPhases: ['reflection', 'journal'],
  },
  {
    id: 'that_gratitude_climax',
    title: 'Gratitude Resolution',
    emotion: 'joy',
    arousal: 'high',
    audioPath: `${R2_BASE}/That%20Gratitude%20%28Remastered%29.wav`,
    duration: 120,
    targetPhases: ['share'],
  },
  {
    id: 'that_gratitude_loop',
    title: 'Ambient Loop',
    emotion: 'peace',
    arousal: 'low',
    audioPath: `${R2_BASE}/That%20Gratitude%20%28Remastered%29.wav`,
    duration: 600,
    targetPhases: ['meditation', 'journal'],
  },

  // ===== CAN'T LET IT GO =====
  {
    id: 'cant_let_it_go_struggle',
    title: 'The Struggle',
    emotion: 'vulnerability',
    arousal: 'medium',
    audioPath: `${R2_BASE}/Can't%20Let%20It%20Go.wav`,
    duration: 120,
    targetPhases: ['reflection'],
  },
  {
    id: 'cant_let_it_go_acceptance',
    title: 'Acceptance Shift',
    emotion: 'acceptance',
    arousal: 'medium',
    audioPath: `${R2_BASE}/Can't%20Let%20It%20Go.wav`,
    duration: 60,
    targetPhases: ['reflection'],
  },
  {
    id: 'cant_let_it_go_victory',
    title: 'Victory Moment',
    emotion: 'joy',
    arousal: 'high',
    audioPath: `${R2_BASE}/Can't%20Let%20It%20Go.wav`,
    duration: 60,
    targetPhases: ['share'],
  },
  {
    id: 'cant_let_it_go_journey',
    title: 'Journey Loop',
    emotion: 'hope',
    arousal: 'medium',
    audioPath: `${R2_BASE}/Can't%20Let%20It%20Go.wav`,
    duration: 420,
    targetPhases: ['journal'],
  },

  // ===== UNDER THE COVERS =====
  {
    id: 'under_covers_opening',
    title: 'Vulnerable Opening',
    emotion: 'vulnerability',
    arousal: 'low',
    audioPath: `${R2_BASE}/Under%20the%20Covers%20%28Remastered%29.wav`,
    duration: 90,
    targetPhases: ['reflection'],
  },
  {
    id: 'under_covers_vulnerability',
    title: 'Raw Emotion',
    emotion: 'vulnerability',
    arousal: 'medium',
    audioPath: `${R2_BASE}/Under%20the%20Covers%20%28Remastered%29.wav`,
    duration: 180,
    targetPhases: ['journal'],
  },
  {
    id: 'under_covers_warmth',
    title: 'Warmth & Connection',
    emotion: 'joy',
    arousal: 'high',
    audioPath: `${R2_BASE}/Under%20the%20Covers%20%28Remastered%29.wav`,
    duration: 120,
    targetPhases: ['share'],
  },
  {
    id: 'under_covers_loop',
    title: 'Contemplative Loop',
    emotion: 'peace',
    arousal: 'medium',
    audioPath: `${R2_BASE}/Under%20the%20Covers%20%28Remastered%29.wav`,
    duration: 480,
    targetPhases: ['meditation', 'journal'],
  },
];

export class SnippetSelector {
  private recentSnippets: string[] = [];

  selectForContext(
    phase: SessionPhase,
    userEmotion?: Emotion,
    preventRepeat: boolean = true
  ): Snippet {
    const candidates = SNIPPETS.filter(s => {
      if (!s.targetPhases.includes(phase)) return false;
      if (preventRepeat && this.recentSnippets.includes(s.id)) return false;
      if (userEmotion && s.emotion !== userEmotion) return false;
      return true;
    });

    if (candidates.length === 0) {
      this.recentSnippets = [];
      return this.selectForContext(phase, userEmotion, false);
    }

    const selected = candidates[Math.floor(Math.random() * candidates.length)];

    this.recentSnippets.push(selected.id);
    if (this.recentSnippets.length > 3) {
      this.recentSnippets.shift();
    }

    return selected;
  }

  getById(id: string): Snippet | undefined {
    return SNIPPETS.find(s => s.id === id);
  }

  getBySong(song: 'that_gratitude' | 'cant_let_it_go' | 'under_covers'): Snippet[] {
    return SNIPPETS.filter(s => s.id.startsWith(song));
  }
}

export const snippetSelector = new SnippetSelector();
