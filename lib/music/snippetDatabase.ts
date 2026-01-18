import { Snippet, SessionPhase, Emotion } from '@/contexts/MusicContext';

export const SNIPPETS: Snippet[] = [
  // ===== THAT GRATITUDE =====
  {
    id: 'that_gratitude_intro',
    title: 'Introspective Invitation',
    emotion: 'peace',
    arousal: 'low',
    audioPath: 'https://2e2a437c61510403bd8e35c3be42dab7.r2.cloudflarestorage.com/gratog-music/snippets/that-gratitude/intro_0-30s.mp3',
    duration: 30,
    targetPhases: ['intro', 'meditation'],
  },
  {
    id: 'that_gratitude_processing',
    title: 'Emotional Processing',
    emotion: 'acceptance',
    arousal: 'medium',
    audioPath: 'https://2e2a437c61510403bd8e35c3be42dab7.r2.cloudflarestorage.com/gratog-music/snippets/that-gratitude/processing_3-4min.mp3',
    duration: 60,
    targetPhases: ['reflection', 'journal'],
  },
  {
    id: 'that_gratitude_climax',
    title: 'Gratitude Resolution',
    emotion: 'joy',
    arousal: 'high',
    audioPath: 'https://2e2a437c61510403bd8e35c3be42dab7.r2.cloudflarestorage.com/gratog-music/snippets/that-gratitude/climax_8-10min.mp3',
    duration: 120,
    targetPhases: ['share'],
  },
  {
    id: 'that_gratitude_loop',
    title: 'Ambient Loop',
    emotion: 'peace',
    arousal: 'low',
    audioPath: 'https://2e2a437c61510403bd8e35c3be42dab7.r2.cloudflarestorage.com/gratog-music/snippets/that-gratitude/ambient_loop_10min.mp3',
    duration: 600,
    targetPhases: ['meditation', 'journal'],
  },

  // ===== CAN'T LET IT GO =====
  {
    id: 'cant_let_it_go_struggle',
    title: 'The Struggle',
    emotion: 'vulnerability',
    arousal: 'medium',
    audioPath: 'https://2e2a437c61510403bd8e35c3be42dab7.r2.cloudflarestorage.com/gratog-music/snippets/cant-let-it-go/struggle_0-2min.mp3',
    duration: 120,
    targetPhases: ['reflection'],
  },
  {
    id: 'cant_let_it_go_acceptance',
    title: 'Acceptance Shift',
    emotion: 'acceptance',
    arousal: 'medium',
    audioPath: 'https://2e2a437c61510403bd8e35c3be42dab7.r2.cloudflarestorage.com/gratog-music/snippets/cant-let-it-go/acceptance_7-8min.mp3',
    duration: 60,
    targetPhases: ['reflection'],
  },
  {
    id: 'cant_let_it_go_victory',
    title: 'Victory Moment',
    emotion: 'joy',
    arousal: 'high',
    audioPath: 'https://2e2a437c61510403bd8e35c3be42dab7.r2.cloudflarestorage.com/gratog-music/snippets/cant-let-it-go/victory_10-11min.mp3',
    duration: 60,
    targetPhases: ['share'],
  },
  {
    id: 'cant_let_it_go_journey',
    title: 'Journey Loop',
    emotion: 'hope',
    arousal: 'medium',
    audioPath: 'https://2e2a437c61510403bd8e35c3be42dab7.r2.cloudflarestorage.com/gratog-music/snippets/cant-let-it-go/journey_4-11min.mp3',
    duration: 420,
    targetPhases: ['journal'],
  },

  // ===== UNDER THE COVERS =====
  {
    id: 'under_covers_opening',
    title: 'Vulnerable Opening',
    emotion: 'vulnerability',
    arousal: 'low',
    audioPath: 'https://2e2a437c61510403bd8e35c3be42dab7.r2.cloudflarestorage.com/gratog-music/snippets/under-covers/opening_0-1m.mp3',
    duration: 90,
    targetPhases: ['reflection'],
  },
  {
    id: 'under_covers_vulnerability',
    title: 'Raw Emotion',
    emotion: 'vulnerability',
    arousal: 'medium',
    audioPath: 'https://2e2a437c61510403bd8e35c3be42dab7.r2.cloudflarestorage.com/gratog-music/snippets/under-covers/vulnerability_2-5min.mp3',
    duration: 180,
    targetPhases: ['journal'],
  },
  {
    id: 'under_covers_warmth',
    title: 'Warmth & Connection',
    emotion: 'joy',
    arousal: 'high',
    audioPath: 'https://2e2a437c61510403bd8e35c3be42dab7.r2.cloudflarestorage.com/gratog-music/snippets/under-covers/warmth_6-8min.mp3',
    duration: 120,
    targetPhases: ['share'],
  },
  {
    id: 'under_covers_loop',
    title: 'Contemplative Loop',
    emotion: 'peace',
    arousal: 'medium',
    audioPath: 'https://2e2a437c61510403bd8e35c3be42dab7.r2.cloudflarestorage.com/gratog-music/snippets/under-covers/contemplative_loop_8min.mp3',
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
