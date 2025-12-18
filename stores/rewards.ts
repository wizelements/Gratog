/**
 * Rewards Store - Zustand store for loyalty/rewards program state management
 */

import { create } from 'zustand';

export type RewardsTier = 'bronze' | 'silver' | 'gold' | 'platinum';

export interface PointsHistoryEntry {
  id: string;
  type: 'earned' | 'redeemed' | 'referral' | 'bonus';
  amount: number;
  description: string;
  timestamp: string;
  orderId?: string;
}

export interface AvailableReward {
  id: string;
  name: string;
  pointsCost: number;
  description: string;
  type: 'discount' | 'product' | 'shipping';
  value: number;
}

export interface RewardsState {
  points: number;
  tier: RewardsTier;
  pointsHistory: PointsHistoryEntry[];
  referralCode: string;
  referralCount: number;
  lifetimePoints: number;
  
  // Methods
  addPoints: (amount: number, description: string, type?: PointsHistoryEntry['type'], orderId?: string) => void;
  redeemPoints: (amount: number, rewardName: string) => boolean;
  generateReferralCode: () => string;
  applyReferral: (referrerCode: string) => boolean;
  getTier: () => RewardsTier;
  getPointsToNextTier: () => { nextTier: RewardsTier | null; pointsNeeded: number; progress: number };
  getTierMultiplier: () => number;
  getAvailableRewards: () => AvailableReward[];
  reset: () => void;
}

const TIER_THRESHOLDS = {
  bronze: { min: 0, max: 500 },
  silver: { min: 501, max: 1500 },
  gold: { min: 1501, max: 3000 },
  platinum: { min: 3001, max: Infinity }
};

const TIER_MULTIPLIERS = {
  bronze: 1,
  silver: 1.25,
  gold: 1.5,
  platinum: 2
};

const AVAILABLE_REWARDS: AvailableReward[] = [
  { id: 'reward_5off', name: '$5 Off', pointsCost: 500, description: '$5 off your next order', type: 'discount', value: 5 },
  { id: 'reward_10off', name: '$10 Off', pointsCost: 1000, description: '$10 off your next order', type: 'discount', value: 10 },
  { id: 'reward_15off', name: '$15 Off', pointsCost: 1500, description: '$15 off your next order', type: 'discount', value: 15 },
  { id: 'reward_freeship', name: 'Free Shipping', pointsCost: 300, description: 'Free shipping on your next order', type: 'shipping', value: 0 },
  { id: 'reward_freeproduct', name: 'Free Product', pointsCost: 3000, description: 'Choose a free product (up to $25 value)', type: 'product', value: 25 },
  { id: 'reward_premium', name: 'Premium Gift Box', pointsCost: 5000, description: 'Exclusive premium gift box', type: 'product', value: 50 }
];

const STORAGE_KEY = 'rewards_v1';

function generateUniqueCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'TOG-';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function calculateTier(points: number): RewardsTier {
  if (points >= TIER_THRESHOLDS.platinum.min) return 'platinum';
  if (points >= TIER_THRESHOLDS.gold.min) return 'gold';
  if (points >= TIER_THRESHOLDS.silver.min) return 'silver';
  return 'bronze';
}

function loadPersistedState(): Partial<RewardsState> {
  if (typeof window === 'undefined') return {};
  
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return {};
    const parsed = JSON.parse(saved);
    return {
      points: parsed.points || 0,
      tier: parsed.tier || 'bronze',
      pointsHistory: parsed.pointsHistory || [],
      referralCode: parsed.referralCode || '',
      referralCount: parsed.referralCount || 0,
      lifetimePoints: parsed.lifetimePoints || 0
    };
  } catch (e) {
    console.error('Failed to load persisted rewards state:', e);
    return {};
  }
}

function persistState(state: Partial<RewardsState>) {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      points: state.points,
      tier: state.tier,
      pointsHistory: state.pointsHistory,
      referralCode: state.referralCode,
      referralCount: state.referralCount,
      lifetimePoints: state.lifetimePoints
    }));
  } catch (e) {
    console.error('Failed to persist rewards state:', e);
  }
}

export const useRewardsStore = create<RewardsState>((set, get) => {
  const initial = loadPersistedState();
  
  return {
    points: initial.points || 0,
    tier: initial.tier || 'bronze',
    pointsHistory: initial.pointsHistory || [],
    referralCode: initial.referralCode || '',
    referralCount: initial.referralCount || 0,
    lifetimePoints: initial.lifetimePoints || 0,
    
    addPoints: (amount: number, description: string, type: PointsHistoryEntry['type'] = 'earned', orderId?: string) => {
      const state = get();
      const multiplier = TIER_MULTIPLIERS[state.tier];
      const bonusAmount = Math.floor(amount * multiplier);
      
      const entry: PointsHistoryEntry = {
        id: `ph_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type,
        amount: bonusAmount,
        description: multiplier > 1 ? `${description} (${multiplier}x bonus!)` : description,
        timestamp: new Date().toISOString(),
        orderId
      };
      
      const newPoints = state.points + bonusAmount;
      const newLifetimePoints = state.lifetimePoints + bonusAmount;
      const newTier = calculateTier(newLifetimePoints);
      const newHistory = [entry, ...state.pointsHistory].slice(0, 50);
      
      set({
        points: newPoints,
        lifetimePoints: newLifetimePoints,
        tier: newTier,
        pointsHistory: newHistory
      });
      
      persistState({
        points: newPoints,
        lifetimePoints: newLifetimePoints,
        tier: newTier,
        pointsHistory: newHistory,
        referralCode: state.referralCode,
        referralCount: state.referralCount
      });
      
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('rewardsUpdate', {
          detail: { points: newPoints, tier: newTier, action: 'add', amount: bonusAmount }
        }));
      }
    },
    
    redeemPoints: (amount: number, rewardName: string) => {
      const state = get();
      
      if (state.points < amount) {
        return false;
      }
      
      const entry: PointsHistoryEntry = {
        id: `ph_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'redeemed',
        amount: -amount,
        description: `Redeemed: ${rewardName}`,
        timestamp: new Date().toISOString()
      };
      
      const newPoints = state.points - amount;
      const newHistory = [entry, ...state.pointsHistory].slice(0, 50);
      
      set({
        points: newPoints,
        pointsHistory: newHistory
      });
      
      persistState({
        points: newPoints,
        lifetimePoints: state.lifetimePoints,
        tier: state.tier,
        pointsHistory: newHistory,
        referralCode: state.referralCode,
        referralCount: state.referralCount
      });
      
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('rewardsUpdate', {
          detail: { points: newPoints, tier: state.tier, action: 'redeem', amount }
        }));
      }
      
      return true;
    },
    
    generateReferralCode: () => {
      const state = get();
      
      if (state.referralCode) {
        return state.referralCode;
      }
      
      const code = generateUniqueCode();
      
      set({ referralCode: code });
      
      persistState({
        ...state,
        referralCode: code
      });
      
      return code;
    },
    
    applyReferral: (referrerCode: string) => {
      const state = get();
      
      if (referrerCode === state.referralCode) {
        return false;
      }
      
      const bonusPoints = 100;
      const entry: PointsHistoryEntry = {
        id: `ph_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'referral',
        amount: bonusPoints,
        description: `Referral bonus from code: ${referrerCode}`,
        timestamp: new Date().toISOString()
      };
      
      const newPoints = state.points + bonusPoints;
      const newLifetimePoints = state.lifetimePoints + bonusPoints;
      const newHistory = [entry, ...state.pointsHistory].slice(0, 50);
      
      set({
        points: newPoints,
        lifetimePoints: newLifetimePoints,
        pointsHistory: newHistory
      });
      
      persistState({
        points: newPoints,
        lifetimePoints: newLifetimePoints,
        tier: state.tier,
        pointsHistory: newHistory,
        referralCode: state.referralCode,
        referralCount: state.referralCount
      });
      
      return true;
    },
    
    getTier: () => {
      return get().tier;
    },
    
    getPointsToNextTier: () => {
      const state = get();
      const currentTier = state.tier;
      const lifetimePoints = state.lifetimePoints;
      
      const tierOrder: RewardsTier[] = ['bronze', 'silver', 'gold', 'platinum'];
      const currentIndex = tierOrder.indexOf(currentTier);
      
      if (currentIndex === tierOrder.length - 1) {
        return { nextTier: null, pointsNeeded: 0, progress: 100 };
      }
      
      const nextTier = tierOrder[currentIndex + 1];
      const nextThreshold = TIER_THRESHOLDS[nextTier].min;
      const currentThreshold = TIER_THRESHOLDS[currentTier].min;
      const pointsNeeded = nextThreshold - lifetimePoints;
      const progress = Math.min(100, ((lifetimePoints - currentThreshold) / (nextThreshold - currentThreshold)) * 100);
      
      return { nextTier, pointsNeeded: Math.max(0, pointsNeeded), progress };
    },
    
    getTierMultiplier: () => {
      return TIER_MULTIPLIERS[get().tier];
    },
    
    getAvailableRewards: () => {
      return AVAILABLE_REWARDS.filter(r => r.pointsCost <= get().points);
    },
    
    reset: () => {
      set({
        points: 0,
        tier: 'bronze',
        pointsHistory: [],
        referralCode: '',
        referralCount: 0,
        lifetimePoints: 0
      });
      
      if (typeof window !== 'undefined') {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  };
});

export { TIER_THRESHOLDS, TIER_MULTIPLIERS, AVAILABLE_REWARDS };
