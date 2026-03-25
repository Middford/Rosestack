'use client';

import { Card, CardContent, CardHeader, CardTitle, Badge, SimpleStatCard } from '@/shared/ui';
import { cn } from '@/shared/ui/utils';
import { clubPartnerships } from '../data';
import { Building2, Phone, Mail, Calendar, Users, Handshake } from 'lucide-react';

function statusVariant(status: string): 'default' | 'success' | 'warning' | 'info' | 'rose' {
  switch (status) {
    case 'active': return 'success';
    case 'agreed': return 'info';
    case 'in-discussion': return 'warning';
    case 'initial-contact': return 'default';
    case 'inactive': return 'default';
    default: return 'default';
  }
}

function clubTypeIcon(type: string): string {
  switch (type) {
    case 'cricket': return 'Cricket';
    case 'bowling': return 'Bowls';
    case 'rugby': return 'Rugby';
    case 'football': return 'Football';
    case 'golf': return 'Golf';
    default: return type;
  }
}

export function ClubPartnerships() {
  const activePartners = clubPartnerships.filter(c => c.status === 'active' || c.status === 'agreed').length;
  const totalSponsorship = clubPartnerships.reduce((s, c) => s + (c.sponsorshipAmount || 0), 0);
  const totalPipelineReferrals = clubPartnerships.reduce((s, c) => s + c.referralsPipeline, 0);
  const totalConvertedReferrals = clubPartnerships.reduce((s, c) => s + c.referralsConverted, 0);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-text-primary">Club & Partnership CRM</h2>
        <p className="text-sm text-text-secondary">Cricket, bowling, rugby, and golf club relationships</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SimpleStatCard label="Active Partners" value={activePartners.toString()} subtitle={`${clubPartnerships.length} total`} />
        <SimpleStatCard label="Sponsorship Spend" value={`£${totalSponsorship.toLocaleString()}`} subtitle="annual" />
        <SimpleStatCard label="Pipeline Referrals" value={totalPipelineReferrals.toString()} subtitle={`${totalConvertedReferrals} converted`} trend="up" />
        <SimpleStatCard label="Cost per Referral" value={totalPipelineReferrals > 0 ? `£${Math.round(totalSponsorship / totalPipelineReferrals)}` : 'N/A'} />
      </div>

      {/* Club Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {clubPartnerships.map(club => (
          <Card key={club.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] bg-bg-tertiary">
                    <Building2 className="h-5 w-5 text-text-secondary" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{club.clubName}</CardTitle>
                    <p className="text-xs text-text-tertiary">{clubTypeIcon(club.clubType)}</p>
                  </div>
                </div>
                <Badge variant={statusVariant(club.status)}>
                  {club.status.replace(/-/g, ' ')}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="rounded-[var(--radius-sm)] bg-bg-primary p-2">
                  <p className="text-lg font-bold text-text-primary">{club.referralsPipeline}</p>
                  <p className="text-[10px] text-text-tertiary">Pipeline</p>
                </div>
                <div className="rounded-[var(--radius-sm)] bg-bg-primary p-2">
                  <p className="text-lg font-bold text-emerald-400">{club.referralsConverted}</p>
                  <p className="text-[10px] text-text-tertiary">Converted</p>
                </div>
                <div className="rounded-[var(--radius-sm)] bg-bg-primary p-2">
                  <p className="text-lg font-bold text-rose-light">{club.sponsorshipAmount ? `£${club.sponsorshipAmount}` : '-'}</p>
                  <p className="text-[10px] text-text-tertiary">Sponsorship</p>
                </div>
              </div>

              <div className="space-y-1.5 text-sm text-text-secondary">
                <p className="flex items-center gap-2">
                  <Users className="h-3.5 w-3.5 text-text-tertiary" />
                  {club.contactName}
                </p>
                {club.contactPhone && (
                  <p className="flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5 text-text-tertiary" />
                    {club.contactPhone}
                  </p>
                )}
                {club.contactEmail && (
                  <p className="flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5 text-text-tertiary" />
                    {club.contactEmail}
                  </p>
                )}
                <p className="flex items-center gap-2">
                  <Calendar className="h-3.5 w-3.5 text-text-tertiary" />
                  Last contact: {club.lastContact.toLocaleDateString('en-GB')}
                </p>
              </div>

              {club.notes && (
                <p className="text-xs text-text-tertiary border-t border-border pt-2">{club.notes}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
