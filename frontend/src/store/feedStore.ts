import { create } from 'zustand';
import { Message, getFeed } from '../services/api';

interface FeedState {
  messages: Message[];
  isLoading: boolean;
  isRefreshing: boolean;
  nextCursor: string | null;
  error: string | null;
  
  // Actions
  loadFeed: () => Promise<void>;
  refreshFeed: () => Promise<void>;
  loadMore: () => Promise<void>;
  addMessage: (message: Message) => void;
}

export const useFeedStore = create<FeedState>((set, get) => ({
  messages: [],
  isLoading: false,
  isRefreshing: false,
  nextCursor: null,
  error: null,
  
  loadFeed: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await getFeed();
      set({ 
        messages: response.items,
        nextCursor: response.nextCursor,
        isLoading: false
      });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to load feed',
        isLoading: false
      });
    }
  },
  
  refreshFeed: async () => {
    set({ isRefreshing: true, error: null });
    try {
      const response = await getFeed();
      set({ 
        messages: response.items,
        nextCursor: response.nextCursor,
        isRefreshing: false
      });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to refresh feed',
        isRefreshing: false
      });
    }
  },
  
  loadMore: async () => {
    const { nextCursor, isLoading } = get();
    if (!nextCursor || isLoading) return;
    
    set({ isLoading: true, error: null });
    try {
      const response = await getFeed(nextCursor);
      set(state => ({ 
        messages: [...state.messages, ...response.items],
        nextCursor: response.nextCursor,
        isLoading: false
      }));
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to load more',
        isLoading: false
      });
    }
  },
  
  addMessage: (message: Message) => {
    set(state => ({
      messages: [message, ...state.messages]
    }));
  }
}));
