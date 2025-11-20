'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Flame, Award, Calendar, TrendingUp, CheckCircle } from 'lucide-react';

export default function ChallengePage() {
  const [challenge, setChallenge] = useState({
    streakDays: 0,
    lastCheckIn: null,
    totalCheckIns: 0,
    canCheckIn: true
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchChallenge = async () => {
      try {
        // TODO: Implement API call to fetch user challenge
        setChallenge({
          streakDays: 0,
          lastCheckIn: null,
          totalCheckIns: 0,
          canCheckIn: true
        });
      } catch (error) {
        console.error('Failed to fetch challenge:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchChallenge();
  }, []);

  const handleCheckIn = async () => {
    try {
      // TODO: Implement check-in API call
      console.log('Checking in...');
    } catch (error) {
      console.error('Failed to check in:', error);
    }
  };

  const milestones = [
    { days: 3, reward: '10 bonus points', completed: challenge.streakDays >= 3 },
    { days: 7, reward: '50 bonus points', completed: challenge.streakDays >= 7 },
    { days: 14, reward: 'Free 2oz shot', completed: challenge.streakDays >= 14 },
    { days: 30, reward: '$10 off coupon', completed: challenge.streakDays >= 30 }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-emerald-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-emerald-900 mb-2">Wellness Challenge</h1>
        <p className="text-emerald-600">Build your daily gratitude streak and earn rewards</p>
      </div>

      {/* Current Streak */}
      <Card className="border-emerald-200 shadow-lg bg-gradient-to-br from-orange-500 to-red-600 text-white">
        <CardContent className="p-8">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100 mb-2 text-lg">Current Streak</p>
              <div className="flex items-center gap-3">
                <Flame className="h-16 w-16 text-orange-200" />
                <span className="text-6xl font-bold">{challenge.streakDays}</span>
                <span className="text-2xl text-orange-100">days</span>
              </div>
            </div>
            {challenge.canCheckIn && (
              <Button
                onClick={handleCheckIn}
                size="lg"
                className="bg-white text-orange-600 hover:bg-orange-50 text-lg px-8 py-6"
              >
                <CheckCircle className="h-5 w-5 mr-2" />
                Check In Today
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-emerald-200 shadow-md">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-emerald-600 mb-1">Total Check-ins</p>
                <p className="text-3xl font-bold text-emerald-900">{challenge.totalCheckIns}</p>
              </div>
              <Calendar className="h-10 w-10 text-emerald-300" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-emerald-200 shadow-md">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-emerald-600 mb-1">Last Check-in</p>
                <p className="text-xl font-semibold text-emerald-900">
                  {challenge.lastCheckIn
                    ? new Date(challenge.lastCheckIn).toLocaleDateString()
                    : 'Never'}
                </p>
              </div>
              <TrendingUp className="h-10 w-10 text-emerald-300" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Milestones */}
      <Card className="border-emerald-200 shadow-lg">
        <CardHeader>
          <CardTitle className="text-emerald-900 flex items-center gap-2">
            <Award className="h-5 w-5 text-emerald-600" />
            Streak Milestones
          </CardTitle>
          <CardDescription>Keep checking in to unlock these rewards</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {milestones.map((milestone) => (
              <div
                key={milestone.days}
                className={`p-4 rounded-lg border-2 ${
                  milestone.completed
                    ? 'border-emerald-500 bg-emerald-50'
                    : 'border-gray-200 bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {milestone.completed ? (
                      <CheckCircle className="h-6 w-6 text-emerald-600" />
                    ) : (
                      <div className="h-6 w-6 rounded-full border-2 border-gray-300" />
                    )}
                    <div>
                      <p className="font-semibold text-emerald-900">
                        {milestone.days} Day Streak
                      </p>
                      <p className="text-sm text-emerald-600">{milestone.reward}</p>
                    </div>
                  </div>
                  {milestone.completed && (
                    <Badge className="bg-emerald-600 text-white">Completed</Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* How it Works */}
      <Card className="border-emerald-200 shadow-lg">
        <CardHeader>
          <CardTitle className="text-emerald-900">How it Works</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold flex-shrink-0">
                1
              </div>
              <div>
                <p className="font-medium text-emerald-900">Check in daily</p>
                <p className="text-sm text-emerald-600">
                  Click the "Check In Today" button once per day
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold flex-shrink-0">
                2
              </div>
              <div>
                <p className="font-medium text-emerald-900">Build your streak</p>
                <p className="text-sm text-emerald-600">
                  Check in consecutive days to grow your streak
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold flex-shrink-0">
                3
              </div>
              <div>
                <p className="font-medium text-emerald-900">Earn rewards</p>
                <p className="text-sm text-emerald-600">
                  Unlock bonus points and exclusive rewards at milestones
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
