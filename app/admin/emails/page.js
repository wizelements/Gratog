'use client';

export const dynamic = 'force-dynamic';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { adminFetch } from '@/lib/admin-fetch';
import { logger } from '@/lib/logger';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, Mail, RefreshCw, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

function statusBadge(status) {
  const palette = {
    delivered: 'bg-emerald-100 text-emerald-800',
    sent: 'bg-blue-100 text-blue-800',
    delayed: 'bg-amber-100 text-amber-800',
    bounced: 'bg-red-100 text-red-800',
    complained: 'bg-red-100 text-red-800',
    failed: 'bg-red-100 text-red-800',
    skipped: 'bg-slate-100 text-slate-700',
    mock_not_sent: 'bg-slate-100 text-slate-700',
  };
  return <Badge className={palette[status] || 'bg-slate-100 text-slate-700'}>{status || 'unknown'}</Badge>;
}

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function AdminEmailsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');

  const loadEmails = useCallback(async () => {
    setRefreshing(true);
    try {
      const params = new URLSearchParams({ days: '14', limit: '75' });
      if (statusFilter) params.set('status', statusFilter);
      const response = await adminFetch(`/api/admin/emails?${params.toString()}`, { skipCsrf: true });
      if (!response.success) throw new Error(response.error || 'Failed to load email health');
      setData(response.data);
    } catch (error) {
      logger.error('Admin', 'Failed to load email health', error);
      toast.error('Failed to load email health');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    loadEmails();
  }, [loadEmails]);

  const statuses = useMemo(() => data?.statuses || [], [data]);
  const emails = data?.emails || [];
  const summary = data?.summary || {};

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-emerald-700">Email Operations</p>
          <h1 className="text-3xl font-bold">Email Health</h1>
          <p className="text-muted-foreground">
            Track customer confirmations, campaign sends, bounces, complaints, and webhook reliability.
          </p>
        </div>
        <Button onClick={loadEmails} disabled={refreshing} variant="outline">
          <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Recent Sends</CardTitle>
            <Mail className="h-5 w-5 text-emerald-700" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{summary.total || 0}</div>
            <p className="text-sm text-muted-foreground">Last {data?.range?.days || 14} days</p>
          </CardContent>
        </Card>

        <Card className="border-emerald-200 bg-emerald-50/60">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-emerald-900">Delivered</CardTitle>
            <ShieldCheck className="h-5 w-5 text-emerald-700" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-emerald-950">{summary.delivered || 0}</div>
            <p className="text-sm text-emerald-900/75">Provider-confirmed delivery events</p>
          </CardContent>
        </Card>

        <Card className={summary.failed ? 'border-red-200 bg-red-50/60' : ''}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Failures</CardTitle>
            <AlertTriangle className="h-5 w-5 text-red-700" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{summary.failed || 0}</div>
            <p className="text-sm text-muted-foreground">Send attempts that need review</p>
          </CardContent>
        </Card>

        <Card className={summary.bounceRate > 2 ? 'border-amber-200 bg-amber-50/60' : ''}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Bounce / Complaint Rate</CardTitle>
            <AlertTriangle className="h-5 w-5 text-amber-700" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{summary.bounceRate || 0}%</div>
            <p className="text-sm text-muted-foreground">{summary.activeSuppressions || 0} active suppressions</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>Delivery Ledger</CardTitle>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant={!statusFilter ? 'default' : 'outline'} onClick={() => setStatusFilter('')}>All</Button>
            {statuses.slice(0, 8).map((row) => (
              <Button
                key={row._id || 'unknown'}
                size="sm"
                variant={statusFilter === row._id ? 'default' : 'outline'}
                onClick={() => setStatusFilter(row._id || '')}
              >
                {row._id || 'unknown'} ({row.count})
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-12 text-center text-muted-foreground">Loading email health…</div>
          ) : emails.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">No email sends found for this filter.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-3 pr-4 font-medium">Status</th>
                    <th className="py-3 pr-4 font-medium">Recipient</th>
                    <th className="py-3 pr-4 font-medium">Subject</th>
                    <th className="py-3 pr-4 font-medium">Type</th>
                    <th className="py-3 pr-4 font-medium">Last Event</th>
                    <th className="py-3 pr-4 font-medium">Sent</th>
                    <th className="py-3 pr-4 font-medium">Context</th>
                  </tr>
                </thead>
                <tbody>
                  {emails.map((email) => (
                    <tr key={email._id || email.id || email.messageId} className="border-b align-top last:border-0">
                      <td className="py-3 pr-4">{statusBadge(email.status || email.deliveryStatus)}</td>
                      <td className="py-3 pr-4 font-medium">{email.recipient || '—'}</td>
                      <td className="max-w-[320px] py-3 pr-4">
                        <div className="font-medium text-slate-900">{email.subject || 'No subject'}</div>
                        {email.error && <div className="mt-1 text-xs text-red-700">{email.error}</div>}
                        {email.reason && <div className="mt-1 text-xs text-muted-foreground">{email.reason}</div>}
                      </td>
                      <td className="py-3 pr-4">{email.emailType || email.template || '—'}</td>
                      <td className="py-3 pr-4">
                        <div>{email.lastEventType || email.deliveryStatus || '—'}</div>
                        <div className="text-xs text-muted-foreground">{formatDate(email.lastEventAt)}</div>
                      </td>
                      <td className="py-3 pr-4">{formatDate(email.sentAt || email.createdAt)}</td>
                      <td className="py-3 pr-4 text-xs text-muted-foreground">
                        {email.orderId && <div>Order {String(email.orderId).slice(0, 8)}</div>}
                        {email.campaignId && <div>Campaign {String(email.campaignId).slice(0, 18)}</div>}
                        {email.provider && <div>{email.provider}</div>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {data?.webhookFailures?.length > 0 && (
        <Card className="border-red-200 bg-red-50/60">
          <CardHeader>
            <CardTitle className="text-red-900">Recent Webhook Failures</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-red-900">
            {data.webhookFailures.map((failure) => (
              <div key={failure._id || failure.svixId} className="rounded-lg bg-white/70 p-3">
                <div className="font-medium">{failure.type || 'Resend webhook'} · {formatDate(failure.failedAt)}</div>
                <div className="text-red-800/80">{failure.error || 'No error message recorded'}</div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
