'use client';

import { Card, CardContent, CardHeader, CardTitle, Badge, SimpleStatCard } from '@/shared/ui';
import { cn } from '@/shared/ui/utils';
import { referrals, getReferrerProfiles, calculateReferralReward } from '../data';
import { Gift, Link2, Trophy, TrendingUp, Users, CheckCircle, Clock } from 'lucide-react';

export function ReferralDashboard() {
  const profiles = getReferrerProfiles();
  const totalReferrals = referrals.length;
  const convertedReferrals = referrals.filter(r => r.status === 'converted').length;
  const conversionRate = totalReferrals > 0 ? Math.round((convertedReferrals / totalReferrals) * 100) : 0;
  const totalRewardsPaid = referrals.filter(r => r.rewardPaid).reduce((s, r) => s + r.rewardAmount, 0);
  const totalRewardsEarned = referrals.reduce((s, r) => s + r.rewardAmount, 0);
  const pendingRewards = totalRewardsEarned - totalRewardsPaid;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-text-primary">Referral Dashboard</h2>
        <p className="text-sm text-text-secondary">Track referrals, rewards, and top referrers</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SimpleStatCard label="Total Referrals" value={totalReferrals.toString()} subtitle={`${convertedReferrals} converted`} trend="up" />
        <SimpleStatCard label="Conversion Rate" value={`${conversionRate}%`} subtitle="referral to contracted" />
        <SimpleStatCard label="Rewards Paid" value={`£${totalRewardsPaid.toLocaleString()}`} subtitle={`£${pendingRewards} pending`} trend="up" />
        <SimpleStatCard label="Top Referrer" value={profiles[0]?.name ?? 'N/A'} subtitle={`${profiles[0]?.totalReferrals ?? 0} referrals`} />
      </div>

      {/* Reward Structure */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="h-4 w-4" />
            Stacking Reward Structure
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map(n => (
              <div key={n} className="rounded-[var(--radius-md)] border border-border bg-bg-primary p-4 text-center">
                <p className="text-xs text-text-tertiary mb-1">{n === 1 ? '1st' : n === 2 ? '2nd' : '3rd+'} Referral</p>
                <p className="text-2xl font-bold text-rose-light">£{calculateReferralReward(n)}</p>
                <p className="text-xs text-text-tertiary mt-1">per conversion</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-text-tertiary mt-3">
            Referee also receives £100 credit on their first monthly payment. Rewards paid upon contracted status.
          </p>
        </CardContent>
      </Card>

      {/* Leaderboard */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-4 w-4" />
            Referrer Leaderboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {profiles.map((profile, i) => (
              <div key={profile.leadId} className="flex items-center gap-4 rounded-[var(--radius-md)] border border-border bg-bg-primary p-4">
                <div className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full font-bold text-sm',
                  i === 0 ? 'bg-amber-500/20 text-amber-400' : 'bg-bg-tertiary text-text-secondary',
                )}>
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-primary">{profile.name}</p>
                  <p className="text-xs text-text-tertiary flex items-center gap-1">
                    <Link2 className="h-3 w-3" />
                    rosestack.co.uk/refer/{profile.code}
                  </p>
                </div>
                <div className="flex items-center gap-6 text-sm">
                  <div className="text-center">
                    <p className="font-medium text-text-primary">{profile.totalReferrals}</p>
                    <p className="text-[10px] text-text-tertiary">Referrals</p>
                  </div>
                  <div className="text-center">
                    <p className="font-medium text-emerald-400">{profile.convertedReferrals}</p>
                    <p className="text-[10px] text-text-tertiary">Converted</p>
                  </div>
                  <div className="text-center">
                    <p className="font-medium text-rose-light">£{profile.totalRewardsEarned}</p>
                    <p className="text-[10px] text-text-tertiary">Earned</p>
                  </div>
                  <div className="text-center">
                    <p className="font-medium text-text-primary">£{profile.totalRewardsPaid}</p>
                    <p className="text-[10px] text-text-tertiary">Paid</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* All Referrals */}
      <Card>
        <CardHeader>
          <CardTitle>All Referrals</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-3 text-text-secondary font-medium">Referrer</th>
                  <th className="text-left py-2 px-3 text-text-secondary font-medium">Referee</th>
                  <th className="text-left py-2 px-3 text-text-secondary font-medium">Status</th>
                  <th className="text-right py-2 px-3 text-text-secondary font-medium">Reward</th>
                  <th className="text-left py-2 px-3 text-text-secondary font-medium">Paid</th>
                  <th className="text-left py-2 px-3 text-text-secondary font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {referrals.map(ref => (
                  <tr key={ref.id} className="border-b border-border hover:bg-bg-hover transition-colors">
                    <td className="py-2 px-3 text-text-primary">{ref.referrerName}</td>
                    <td className="py-2 px-3 text-text-primary">{ref.refereeName}</td>
                    <td className="py-2 px-3">
                      <Badge variant={ref.status === 'converted' ? 'success' : ref.status === 'lost' ? 'danger' : 'warning'}>
                        {ref.status}
                      </Badge>
                    </td>
                    <td className="py-2 px-3 text-right font-medium text-text-primary">£{ref.rewardAmount}</td>
                    <td className="py-2 px-3">
                      {ref.rewardPaid ? (
                        <CheckCircle className="h-4 w-4 text-emerald-400" />
                      ) : (
                        <Clock className="h-4 w-4 text-text-tertiary" />
                      )}
                    </td>
                    <td className="py-2 px-3 text-text-secondary">{ref.createdAt.toLocaleDateString('en-GB')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
