'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Leaf, Gift, History, Users, ChevronRight, Sparkles, Crown } from 'lucide-react';
import { TIERS } from '@/lib/gratitude/core';

export default function GratitudeDashboard() {
  const [account, setAccount] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // TODO: Get actual customer ID from auth context
    const customerId = 'temp-customer-id';
    
    fetchAccount(customerId);
    fetchTransactions(customerId);
  }, []);

  const fetchAccount = async (customerId) => {
    try {
      const res = await fetch(`/api/gratitude/account?customerId=${customerId}`);
      const data = await res.json();
      if (data.success) {
        setAccount(data.account);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to load account');
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = async (customerId) => {
    try {
      const res = await fetch(`/api/gratitude/transactions?customerId=${customerId}&limit=10`);
      const data = await res.json();
      if (data.success) {
        setTransactions(data.transactions);
      }
    } catch (err) {
      console.error('Failed to load transactions');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white py-12 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full mx-auto" />
          <p className="mt-4 text-gray-600">Loading your Gratitude Credits...</p>
        </div>
      </div>
    );
  }

  if (error || !account) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white py-12 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <Leaf className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Welcome to Gratitude Credits</h1>
          <p className="text-gray-600 mb-6">Start earning rewards on every purchase!</p>
          <Link 
            href="/register"
            className="inline-flex items-center px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition"
          >
            Create Account
            <ChevronRight className="w-4 h-4 ml-2" />
          </Link>
        </div>
      </div>
    );
  }

  const tier = TIERS[account.tier.current];
  const progressToNext = account.nextTier ? 
    Math.round((account.tier.progress.purchases / account.nextTier.requirements.purchases) * 100) : 100;

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full mb-4"
               style={{ backgroundColor: `${tier.color}20` }}>
            <span className="text-4xl">{tier.emoji}</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">
            {account.tier.name} Member
          </h1>
          <p className="text-gray-600 mt-1">
            {tier.benefits.multiplier}x credits on every purchase
          </p>
        </div>

        {/* Credits Card */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-6 border border-emerald-100">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-sm text-gray-500 uppercase tracking-wide">Available Credits</p>
              <p className="text-5xl font-bold text-emerald-600">
                {account.credits.balance.toLocaleString()}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                ≈ ${(account.credits.balance / 50).toFixed(2)} value
              </p>
            </div>
            <Link
              href="/gratitude/rewards"
              className="inline-flex items-center px-6 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition shadow-md"
            >
              <Gift className="w-5 h-5 mr-2" />
              Redeem Rewards
            </Link>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-3 gap-4 pt-6 border-t border-gray-100">
            <div className="text-center">
              <p className="text-2xl font-semibold text-gray-900">
                {account.credits.lifetimeEarned.toLocaleString()}
              </p>
              <p className="text-sm text-gray-500">Lifetime Earned</p>
            </div>
            <div className="text-center border-x border-gray-100">
              <p className="text-2xl font-semibold text-gray-900">
                {account.credits.lifetimeRedeemed.toLocaleString()}
              </p>
              <p className="text-sm text-gray-500">Redeemed</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-semibold text-gray-900">
                {account.referrals?.referredCount || 0}
              </p>
              <p className="text-sm text-gray-500">Friends Referred</p>
            </div>
          </div>
        </div>

        {/* Tier Progress */}
        {account.nextTier && (
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-6 border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{account.nextTier.emoji}</span>
                <div>
                  <p className="font-semibold text-gray-900">
                    {progressToNext}% to {account.nextTier.name}
                  </p>
                  <p className="text-sm text-gray-500">
                    {account.nextTier.requirements.purchases - account.tier.progress.purchases} more purchases
                  </p>
                </div>
              </div>
              <Sparkles className="w-5 h-5 text-amber-500" />
            </div>
            <div className="w-full bg-gray-100 rounded-full h-3">
              <div 
                className="bg-gradient-to-r from-emerald-500 to-emerald-400 h-3 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(progressToNext, 100)}%` }}
              />
            </div>
            <div className="mt-4 p-4 bg-amber-50 rounded-xl border border-amber-100">
              <p className="text-sm text-amber-800">
                <Crown className="w-4 h-4 inline mr-1" />
                <strong>Next tier perks:</strong> {account.nextTier.benefits.perks.join(', ')}
              </p>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <Link
            href="/gratitude/rewards"
            className="bg-white rounded-xl p-6 border border-gray-100 hover:border-emerald-300 hover:shadow-md transition group"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center group-hover:bg-emerald-200 transition">
                <Gift className="w-6 h-6 text-emerald-600" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-900">Browse Rewards</p>
                <p className="text-sm text-gray-500">Redeem credits for discounts</p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </div>
          </Link>

          <div className="bg-white rounded-xl p-6 border border-gray-100 hover:border-emerald-300 hover:shadow-md transition cursor-pointer group">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center group-hover:bg-purple-200 transition">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-900">Refer Friends</p>
                <p className="text-sm text-gray-500">Earn 200 credits per referral</p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <History className="w-5 h-5 text-gray-400" />
              Recent Activity
            </h2>
          </div>

          {transactions.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              No activity yet. Make your first purchase to start earning!
            </p>
          ) : (
            <div className="space-y-3">
              {transactions.slice(0, 5).map((t) => (
                <div key={t.id} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      t.type === 'earn' ? 'bg-emerald-100 text-emerald-600' :
                      t.type === 'redeem' ? 'bg-purple-100 text-purple-600' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {t.type === 'earn' ? '+' : t.type === 'redeem' ? '−' : '•'}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{t.description}</p>
                      <p className="text-sm text-gray-500">
                        {new Date(t.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <span className={`font-semibold ${
                    t.credits > 0 ? 'text-emerald-600' : 'text-gray-600'
                  }`}>
                    {t.credits > 0 ? '+' : ''}{t.credits}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
