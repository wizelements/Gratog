'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Gift, ShoppingBag, Truck, Sparkles, Check, Copy } from 'lucide-react';

const REWARD_ICONS = {
  discount_fixed: Gift,
  discount_percent: Gift,
  free_shipping: Truck,
  free_product: ShoppingBag,
  experience: Sparkles
};

const REWARD_COLORS = {
  discount_fixed: 'bg-emerald-100 text-emerald-600',
  discount_percent: 'bg-emerald-100 text-emerald-600',
  free_shipping: 'bg-blue-100 text-blue-600',
  free_product: 'bg-purple-100 text-purple-600',
  experience: 'bg-amber-100 text-amber-600'
};

export default function RewardsCatalog() {
  const [rewards, setRewards] = useState({ affordable: [], upcoming: [], all: [] });
  const [account, setAccount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [redeeming, setRedeeming] = useState(null);
  const [redeemedCode, setRedeemedCode] = useState(null);

  useEffect(() => {
    const customerId = 'temp-customer-id'; // TODO: Get from auth
    fetchRewards(customerId);
    fetchAccount(customerId);
  }, []);

  const fetchRewards = async (customerId) => {
    try {
      const res = await fetch(`/api/gratitude/rewards?customerId=${customerId}`);
      const data = await res.json();
      if (data.success) {
        setRewards({
          affordable: data.rewards.filter(r => r.affordable),
          upcoming: data.rewards.filter(r => !r.affordable).slice(0, 3),
          all: data.rewards
        });
      }
    } catch (err) {
      console.error('Failed to load rewards');
    }
  };

  const fetchAccount = async (customerId) => {
    try {
      const res = await fetch(`/api/gratitude/account?customerId=${customerId}`);
      const data = await res.json();
      if (data.success) {
        setAccount(data.account);
      }
    } catch (err) {
      console.error('Failed to load account');
    } finally {
      setLoading(false);
    }
  };

  const redeemReward = async (rewardId) => {
    setRedeeming(rewardId);
    try {
      const customerId = 'temp-customer-id';
      const res = await fetch('/api/gratitude/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId, rewardId })
      });
      const data = await res.json();
      if (data.success) {
        setRedeemedCode(data.redemption);
        fetchAccount(customerId);
      }
    } catch (err) {
      console.error('Redemption failed');
    } finally {
      setRedeeming(null);
    }
  };

  const copyToClipboard = (code) => {
    navigator.clipboard.writeText(code);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white py-12 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link href="/gratitude" className="p-2 hover:bg-white rounded-full transition">
            <ArrowLeft className="w-6 h-6 text-gray-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Rewards Catalog</h1>
            {account && (
              <p className="text-gray-600">
                You have <span className="font-semibold text-emerald-600">{account.credits.balance}</span> credits
              </p>
            )}
          </div>
        </div>

        {/* Redeemed Code Modal */}
        {redeemedCode && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-8 max-w-md w-full">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check className="w-8 h-8 text-emerald-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">Reward Redeemed!</h2>
                <p className="text-gray-600">{redeemedCode.rewardName}</p>
              </div>

              <div className="bg-gray-100 rounded-xl p-4 mb-6">
                <p className="text-sm text-gray-500 mb-2">Your coupon code:</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-white px-4 py-3 rounded-lg font-mono text-lg text-center">
                    {redeemedCode.couponCode}
                  </code>
                  <button
                    onClick={() => copyToClipboard(redeemedCode.couponCode)}
                    className="p-3 bg-white rounded-lg hover:bg-gray-50 transition"
                  >
                    <Copy className="w-5 h-5 text-gray-600" />
                  </button>
                </div>
              </div>

              <p className="text-sm text-gray-500 mb-6">
                Code expires {new Date(redeemedCode.expiresAt).toLocaleDateString()}
              </p>

              <div className="flex gap-3">
                <Link
                  href="/cart"
                  className="flex-1 bg-emerald-600 text-white text-center py-3 rounded-xl font-semibold hover:bg-emerald-700 transition"
                >
                  Apply to Cart
                </Link>
                <button
                  onClick={() => setRedeemedCode(null)}
                  className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-200 transition"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Affordable Rewards */}
        {rewards.affordable.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Gift className="w-5 h-5 text-emerald-500" />
              Available Now
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {rewards.affordable.map((reward) => {
                const Icon = REWARD_ICONS[reward.rewardType];
                return (
                  <div
                    key={reward.id}
                    className="bg-white rounded-xl p-6 border-2 border-emerald-100 shadow-sm hover:shadow-md transition"
                  >
                    <div className="flex items-start gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${REWARD_COLORS[reward.rewardType]}`}>
                        <Icon className="w-6 h-6" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">{reward.name}</h3>
                        <p className="text-sm text-gray-600 mb-2">{reward.description}</p>
                        
                        {reward.minimumOrder > 0 && (
                          <p className="text-xs text-gray-500">
                            Min. order: ${(reward.minimumOrder / 100).toFixed(2)}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-emerald-600">{reward.creditsCost}</p>
                        <p className="text-xs text-gray-500">credits</p>
                        <button
                          onClick={() => redeemReward(reward.id)}
                          disabled={redeeming === reward.id}
                          className="mt-2 px-4 py-2 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition"
                        >
                          {redeeming === reward.id ? '...' : 'Redeem'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Upcoming Rewards */}
        {rewards.upcoming.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              Save Up For
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {rewards.upcoming.map((reward) => {
                const Icon = REWARD_ICONS[reward.rewardType];
                const progress = account ? (account.credits.balance / reward.creditsCost) * 100 : 0;
                return (
                  <div
                    key={reward.id}
                    className="bg-white/50 rounded-xl p-6 border border-gray-200 opacity-75"
                  >
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${REWARD_COLORS[reward.rewardType]}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <h3 className="font-semibold text-gray-700">{reward.name}</h3>
                    <p className="text-sm text-gray-500 mb-3">{reward.description}</p>
                    
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-gray-700">{reward.creditsCost} credits</p>
                      <p className="text-sm text-emerald-600">{Math.round(progress)}%</p>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                      <div 
                        className="bg-emerald-400 h-2 rounded-full"
                        style={{ width: `${Math.min(progress, 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* All Rewards */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">All Rewards</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {rewards.all.map((reward) => (
              <div key={reward.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">
                    {reward.rewardType === 'discount_fixed' && '💰'}
                    {reward.rewardType === 'free_shipping' && '🚚'}
                    {reward.rewardType === 'free_product' && '🎁'}
                    {reward.rewardType === 'experience' && '✨'}
                  </span>
                  <div>
                    <p className="font-medium text-gray-900">{reward.name}</p>
                    <p className="text-sm text-gray-500">{reward.creditsCost} credits</p>
                  </div>
                </div>
                <span className={`text-sm px-3 py-1 rounded-full ${
                  reward.affordable 
                    ? 'bg-emerald-100 text-emerald-700' 
                    : 'bg-gray-100 text-gray-500'
                }`}>
                  {reward.affordable ? 'Available' : `Need ${reward.creditsNeeded} more`}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
