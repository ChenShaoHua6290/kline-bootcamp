import { StatCard } from '@/components/ui/StatCard';

export type AdminSummary = {
  totalUsers: number;
  bannedUsers: number;
  activeInvitationCodes: number;
  totalInvitationUsed: number;
};

export function AdminSummaryCards({ summary }: { summary?: AdminSummary }) {
  const val = (n?: number) => (typeof n === 'number' ? n.toLocaleString() : '--');
  return (
    <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
      <StatCard label="总用户数" value={val(summary?.totalUsers)} />
      <StatCard label="封禁用户数" value={val(summary?.bannedUsers)} tone="rose" />
      <StatCard label="有效邀请码" value={val(summary?.activeInvitationCodes)} tone="cyan" />
      <StatCard label="邀请码总使用" value={val(summary?.totalInvitationUsed)} tone="green" />
    </div>
  );
}
