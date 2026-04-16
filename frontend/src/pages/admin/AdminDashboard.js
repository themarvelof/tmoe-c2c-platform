import { useState, useEffect, useMemo } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import axios from '@/utils/api';
import { API } from '@/utils/api';
import { toast } from 'sonner';
import {
  ChartBar,
  CurrencyDollar,
  CursorClick,
  FunnelSimple,
  MagicWand,
  MagnifyingGlass,
  Target,
  TrendDown,
  TrendUp,
  Eye,
  DownloadSimple,
  ArrowsClockwise,
  WarningCircle,
} from '@phosphor-icons/react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

const PAGE_SIZE = 8;
const DONUT_COLORS = ['#f91445', '#7c3aed', '#0ea5e9', '#22c55e', '#f59e0b', '#64748b'];
const CHART_AXIS_TICK = { fill: 'var(--adm-muted)', fontSize: 12 };
const CHART_TOOLTIP_STYLE = {
  background: 'var(--adm-surface-alt)',
  border: '1px solid var(--adm-border)',
  borderRadius: '12px',
  color: 'var(--adm-text)',
};

function defaultDateRange() {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 30);
  return {
    start_date: start.toISOString().slice(0, 10),
    end_date: end.toISOString().slice(0, 10),
  };
}

function formatPercent(value) {
  const isPositive = value >= 0;
  return `${isPositive ? '+' : ''}${value.toFixed(1)}%`;
}

function toShortDate(dateValue) {
  if (!dateValue) return '-';
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return dateValue;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function computeTrend(series, key) {
  if (!series.length) return 0;
  const midpoint = Math.max(1, Math.floor(series.length / 2));
  const previous = series.slice(0, midpoint).reduce((sum, row) => sum + Number(row[key] || 0), 0);
  const current = series.slice(midpoint).reduce((sum, row) => sum + Number(row[key] || 0), 0);
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [reportData, setReportData] = useState({ daily: [], summary: [], table: [] });
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [dateRange, setDateRange] = useState(defaultDateRange);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);

  const fetchDashboardData = async (range = dateRange, withSuccessToast = false) => {
    setFetching(true);
    try {
      const [statsResult, reportsResult] = await Promise.allSettled([
        axios.get(`${API}/admin/dashboard/stats`),
        axios.get(`${API}/reports`, {
          params: {
            start_date: range.start_date,
            end_date: range.end_date,
          },
        }),
      ]);

      if (statsResult.status === 'fulfilled') {
        setStats(statsResult.value.data || null);
      }

      if (reportsResult.status === 'fulfilled') {
        setReportData({
          daily: reportsResult.value.data?.daily || [],
          summary: reportsResult.value.data?.summary || [],
          table: reportsResult.value.data?.table || [],
        });
      } else {
        setReportData({ daily: [], summary: [], table: [] });
        toast.warning(reportsResult.reason?.response?.data?.detail || 'Could not load report data.');
      }

      if (statsResult.status !== 'fulfilled' && reportsResult.status !== 'fulfilled') {
        throw new Error('No dashboard data available.');
      }

      if (withSuccessToast) toast.success('Dashboard updated');
    } catch (error) {
      toast.error('Failed to load dashboard stats');
    } finally {
      setFetching(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData(defaultDateRange(), false);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const filteredRows = useMemo(() => {
    const rows = reportData.table || [];
    return rows
      .map((row) => {
        const conversionRate = Number(row.clicks) > 0 ? (Number(row.conversions) / Number(row.clicks)) * 100 : 0;
        const status = conversionRate >= 2 ? 'healthy' : 'watch';
        return { ...row, status };
      })
      .filter((row) => {
        const campaignMatches = row.campaign?.toLowerCase().includes(searchTerm.trim().toLowerCase());
        const statusMatches = statusFilter === 'all' || row.status === statusFilter;
        return campaignMatches && statusMatches;
      });
  }, [reportData.table, searchTerm, statusFilter]);

  const paginatedRows = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredRows.slice(start, start + PAGE_SIZE);
  }, [filteredRows, page]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));

  useEffect(() => {
    setPage(1);
  }, [searchTerm, statusFilter]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const totals = useMemo(() => {
    const tableRows = reportData.table || [];
    const revenue = tableRows.reduce((sum, row) => sum + Number(row.revenue || 0), 0);
    const clicks = tableRows.reduce((sum, row) => sum + Number(row.clicks || 0), 0);
    const conversions = tableRows.reduce((sum, row) => sum + Number(row.conversions || 0), 0);
    const impressions = tableRows.reduce((sum, row) => sum + Number(row.impressions || 0), 0);
    return {
      revenue: revenue || Number(stats?.total_gmv || 0),
      clicks,
      conversions,
      impressions,
    };
  }, [reportData.table, stats?.total_gmv]);

  const trends = useMemo(() => {
    const daily = reportData.daily || [];
    return {
      revenue: computeTrend(daily, 'revenue'),
      clicks: computeTrend(daily, 'clicks'),
      conversions: computeTrend(daily, 'actions'),
      impressions: computeTrend(daily, 'impressions'),
    };
  }, [reportData.daily]);

  const chartSeries = useMemo(
    () =>
      (reportData.daily || []).map((item) => ({
        date: toShortDate(item.date),
        revenue: Number(item.revenue || 0),
        clicks: Number(item.clicks || 0),
        impressions: Number(item.impressions || 0),
      })),
    [reportData.daily]
  );

  const donutData = useMemo(
    () =>
      (reportData.summary || [])
        .slice(0, 6)
        .map((item) => ({
          name: item.campaign,
          value: Number(item.revenue || 0),
        }))
        .filter((item) => item.value > 0),
    [reportData.summary]
  );

  const kpiCards = [
    {
      title: 'Revenue',
      value: `QAR ${totals.revenue.toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
      trend: trends.revenue,
      icon: CurrencyDollar,
      glow: 'from-[#f91445]/30 to-[#f91445]/0',
    },
    {
      title: 'Clicks',
      value: totals.clicks.toLocaleString(),
      trend: trends.clicks,
      icon: CursorClick,
      glow: 'from-[#0ea5e9]/25 to-[#0ea5e9]/0',
    },
    {
      title: 'Conversions',
      value: totals.conversions.toLocaleString(),
      trend: trends.conversions,
      icon: Target,
      glow: 'from-[#22c55e]/25 to-[#22c55e]/0',
    },
    {
      title: 'Impressions',
      value: totals.impressions.toLocaleString(),
      trend: trends.impressions,
      icon: Eye,
      glow: 'from-[#7c3aed]/25 to-[#7c3aed]/0',
    },
  ];

  const exportTable = () => {
    if (!filteredRows.length) {
      toast.warning('No rows to export');
      return;
    }
    const csvLines = [
      ['Date', 'Campaign / Brand', 'Impressions', 'Clicks', 'Conversions', 'Revenue', 'Status'].join(','),
      ...filteredRows.map((row) =>
        [
          row.date,
          `"${String(row.campaign || '').replace(/"/g, '""')}"`,
          Number(row.impressions || 0),
          Number(row.clicks || 0),
          Number(row.conversions || 0),
          Number(row.revenue || 0).toFixed(2),
          row.status,
        ].join(',')
      ),
    ];
    const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `admin-dashboard-${dateRange.start_date}-to-${dateRange.end_date}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <DashboardLayout role="admin">
        <div className="min-h-screen bg-[var(--adm-bg)] p-6 md:p-8" data-testid="admin-dashboard">
          <div className="animate-pulse space-y-6">
            <div className="h-20 rounded-2xl bg-[var(--adm-surface)]" />
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 4 }).map((_, idx) => (
                <div key={idx} className="h-32 rounded-2xl bg-[var(--adm-surface)]" />
              ))}
            </div>
            <div className="grid gap-6 xl:grid-cols-3">
              <div className="h-72 rounded-2xl bg-[var(--adm-surface)] xl:col-span-2" />
              <div className="h-72 rounded-2xl bg-[var(--adm-surface)]" />
            </div>
            <div className="h-80 rounded-2xl bg-[var(--adm-surface)]" />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="admin">
      <div
        className="min-h-screen bg-[radial-gradient(circle_at_top_right,_rgba(249,20,69,0.14),_var(--adm-bg)_38%)] p-6 text-[var(--adm-text)] md:p-8 xl:p-10 transition-colors duration-300"
        data-testid="admin-dashboard"
      >
        <section className="mb-8 rounded-2xl border border-[var(--adm-border)] bg-[var(--adm-surface)]/95 p-5 shadow-[0_14px_28px_rgba(0,0,0,0.12)]">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-1 items-center gap-3 rounded-xl border border-[var(--adm-border)] bg-[var(--adm-surface-alt)] px-4 py-3">
              <MagnifyingGlass size={18} className="text-[var(--adm-muted)]" />
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search campaign, brand or report..."
                className="w-full bg-transparent text-sm text-[var(--adm-text)] outline-none placeholder:text-[var(--adm-muted-soft)]"
              />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:flex">
              <input
                type="date"
                value={dateRange.start_date}
                onChange={(event) => setDateRange((previous) => ({ ...previous, start_date: event.target.value }))}
                className="h-11 rounded-xl border border-[var(--adm-border)] bg-[var(--adm-surface-alt)] px-3 text-sm text-[var(--adm-text)] outline-none"
              />
              <input
                type="date"
                value={dateRange.end_date}
                onChange={(event) => setDateRange((previous) => ({ ...previous, end_date: event.target.value }))}
                className="h-11 rounded-xl border border-[var(--adm-border)] bg-[var(--adm-surface-alt)] px-3 text-sm text-[var(--adm-text)] outline-none"
              />
              <button
                type="button"
                onClick={() => fetchDashboardData(dateRange, true)}
                disabled={fetching}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#f91445] px-4 text-sm font-semibold text-white transition-transform duration-300 hover:-translate-y-0.5 hover:bg-[#ff2958] disabled:cursor-not-allowed disabled:opacity-70"
              >
                <ArrowsClockwise size={16} className={fetching ? 'animate-spin' : ''} />
                {fetching ? 'Fetching...' : 'Fetch Data'}
              </button>
              <button
                type="button"
                onClick={exportTable}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[var(--adm-border)] bg-[var(--adm-surface-alt)] px-4 text-sm font-semibold text-[var(--adm-text)] transition-all duration-300 hover:border-[#f91445]/45"
              >
                <DownloadSimple size={16} />
                Export
              </button>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-[var(--adm-muted)]">
            <span className="rounded-full bg-[var(--adm-chip)] px-3 py-1.5" data-testid="stat-active-campaigns">
              Active Campaigns: <span className="ml-1 text-[var(--adm-text)]">{stats?.active_campaigns || 0}</span>
            </span>
            <span className="rounded-full bg-[var(--adm-chip)] px-3 py-1.5" data-testid="stat-pending-verifications">
              Pending Verifications: <span className="ml-1 text-[var(--adm-text)]">{stats?.pending_verifications || 0}</span>
            </span>
            <span className="rounded-full bg-[var(--adm-chip)] px-3 py-1.5" data-testid="stat-total-publishers">
              Total Publishers: <span className="ml-1 text-[var(--adm-text)]">{stats?.total_publishers || 0}</span>
            </span>
            <span className="rounded-full bg-[var(--adm-chip)] px-3 py-1.5" data-testid="stat-total-brands">
              Total Brands: <span className="ml-1 text-[var(--adm-text)]">{stats?.total_brands || 0}</span>
            </span>
          </div>
        </section>

        <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {kpiCards.map((card) => {
            const Icon = card.icon;
            const trendPositive = card.trend >= 0;
            return (
              <article
                key={card.title}
                className="group relative overflow-hidden rounded-2xl border border-[var(--adm-border)] bg-[var(--adm-surface)] p-5 transition-transform duration-300 hover:-translate-y-1 hover:shadow-[0_16px_30px_rgba(0,0,0,0.16)]"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${card.glow} opacity-70`} />
                <div className="relative">
                  <div className="mb-5 flex items-start justify-between">
                    <div className="rounded-xl bg-[#f91445]/15 p-2.5 text-[#f91445]">
                      <Icon size={20} />
                    </div>
                    <span className="inline-flex items-center gap-1 rounded-full bg-[var(--adm-chip)] px-2.5 py-1 text-xs text-[var(--adm-muted)]">
                      {trendPositive ? <TrendUp size={14} className="text-[#22c55e]" /> : <TrendDown size={14} className="text-[#ef4444]" />}
                      <span className={trendPositive ? 'text-[#22c55e]' : 'text-[#ef4444]'}>{formatPercent(card.trend)}</span>
                    </span>
                  </div>
                  <p className="text-sm text-[var(--adm-muted)]">{card.title}</p>
                  <p className="mt-2 text-2xl font-semibold text-[var(--adm-text)]">{card.value}</p>
                </div>
              </article>
            );
          })}
        </section>

        <section className="mt-8 grid gap-6 xl:grid-cols-3">
          <div className="rounded-2xl border border-[var(--adm-border)] bg-[var(--adm-surface)] p-5 xl:col-span-2">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[var(--adm-text)]">Revenue Trend</h2>
              <span className="text-xs text-[var(--adm-muted)]">Date vs Revenue</span>
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartSeries}>
                  <CartesianGrid stroke="var(--adm-border)" vertical={false} />
                  <XAxis dataKey="date" tick={CHART_AXIS_TICK} axisLine={false} tickLine={false} />
                  <YAxis tick={CHART_AXIS_TICK} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={CHART_TOOLTIP_STYLE}
                    labelStyle={{ color: 'var(--adm-muted)' }}
                  />
                  <Line type="monotone" dataKey="revenue" stroke="#f91445" strokeWidth={3} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--adm-border)] bg-[var(--adm-surface)] p-5">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[var(--adm-text)]">Campaign Share</h2>
              <ChartBar size={18} className="text-[var(--adm-muted)]" />
            </div>
            <div className="h-72">
              {donutData.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={donutData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={58}
                      outerRadius={88}
                      paddingAngle={3}
                    >
                      {donutData.map((entry, index) => (
                        <Cell key={entry.name} fill={DONUT_COLORS[index % DONUT_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={CHART_TOOLTIP_STYLE}
                      formatter={(value) => [`QAR ${Number(value).toLocaleString()}`, 'Revenue']}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full flex-col items-center justify-center rounded-xl border border-dashed border-[var(--adm-border-strong)] text-center text-sm text-[var(--adm-muted)]">
                  <WarningCircle size={22} className="mb-2 text-[#f59e0b]" />
                  No campaign distribution in selected range.
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-[var(--adm-border)] bg-[var(--adm-surface)] p-5">
          <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <h2 className="text-lg font-semibold text-[var(--adm-text)]">Clicks vs Impressions</h2>
            <div className="flex items-center gap-2">
              <FunnelSimple size={16} className="text-[var(--adm-muted)]" />
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="h-9 rounded-lg border border-[var(--adm-border)] bg-[var(--adm-surface-alt)] px-3 text-sm text-[var(--adm-text)] outline-none"
              >
                <option value="all">All Statuses</option>
                <option value="healthy">Healthy</option>
                <option value="watch">Watch</option>
              </select>
            </div>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartSeries}>
                <CartesianGrid stroke="var(--adm-border)" vertical={false} />
                <XAxis dataKey="date" tick={CHART_AXIS_TICK} axisLine={false} tickLine={false} />
                <YAxis tick={CHART_AXIS_TICK} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                <Bar dataKey="clicks" fill="#f91445" radius={[7, 7, 0, 0]} />
                <Bar dataKey="impressions" fill="#4f46e5" radius={[7, 7, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="mt-8 rounded-2xl border border-[var(--adm-border)] bg-[var(--adm-surface)] p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-[var(--adm-text)]">Report Data</h2>
              <p className="text-sm text-[var(--adm-muted)]">Clean report list with sticky header and smart statuses.</p>
            </div>
            <div className="rounded-lg border border-[var(--adm-border)] bg-[var(--adm-chip)] px-3 py-2 text-xs text-[var(--adm-muted)]">
              Showing {filteredRows.length ? (page - 1) * PAGE_SIZE + 1 : 0}-{Math.min(page * PAGE_SIZE, filteredRows.length)} of {filteredRows.length}
            </div>
          </div>

          {paginatedRows.length === 0 ? (
            <div className="flex min-h-56 flex-col items-center justify-center rounded-xl border border-dashed border-[var(--adm-border-strong)] bg-[var(--adm-surface-alt)] text-center">
              <MagicWand size={24} className="mb-2 text-[#f91445]" />
              <p className="font-medium text-[var(--adm-text)]">No report rows match your filters.</p>
              <p className="mt-1 text-sm text-[var(--adm-muted)]">Try another date range, search term, or status filter.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-[var(--adm-border)]">
              <table className="w-full min-w-[760px] text-sm">
                <thead className="sticky top-0 z-10 bg-[var(--adm-surface-alt)]">
                  <tr className="border-b border-[var(--adm-border)] text-left text-xs uppercase tracking-wide text-[var(--adm-muted-soft)]">
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Campaign / Brand</th>
                    <th className="px-4 py-3 text-right">Impressions</th>
                    <th className="px-4 py-3 text-right">Clicks</th>
                    <th className="px-4 py-3 text-right">Conversions</th>
                    <th className="px-4 py-3 text-right">Revenue</th>
                    <th className="px-4 py-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedRows.map((row, index) => {
                    const isHealthy = row.status === 'healthy';
                    return (
                      <tr
                        key={`${row.date}-${row.campaign}-${index}`}
                        className={`border-b border-[var(--adm-border)]/70 transition-colors duration-200 hover:bg-[var(--adm-hover)] ${
                          index % 2 === 0 ? 'bg-[var(--adm-surface)]' : 'bg-[var(--adm-surface-alt)]'
                        }`}
                      >
                        <td className="px-4 py-3 text-[var(--adm-muted)]">{toShortDate(row.date)}</td>
                        <td className="px-4 py-3 text-[var(--adm-text)]">{row.campaign}</td>
                        <td className="px-4 py-3 text-right text-[var(--adm-text)]">{Number(row.impressions || 0).toLocaleString()}</td>
                        <td className="px-4 py-3 text-right text-[var(--adm-text)]">{Number(row.clicks || 0).toLocaleString()}</td>
                        <td className="px-4 py-3 text-right text-[var(--adm-text)]">{Number(row.conversions || 0).toLocaleString()}</td>
                        <td className="px-4 py-3 text-right font-medium text-[var(--adm-text)]">QAR {Number(row.revenue || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                        <td className="px-4 py-3 text-right">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
                              isHealthy ? 'bg-[#22c55e]/20 text-[#22c55e]' : 'bg-[#ef4444]/20 text-[#ef4444]'
                            }`}
                          >
                            {isHealthy ? 'Healthy' : 'Watch'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-[var(--adm-muted)]">Tip: Higher conversion campaigns appear with green status.</p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="rounded-lg border border-[var(--adm-border-strong)] bg-[var(--adm-surface-alt)] px-3 py-1.5 text-sm text-[var(--adm-text)] transition-colors hover:bg-[var(--adm-hover)] disabled:cursor-not-allowed disabled:opacity-50"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={page <= 1}
              >
                Prev
              </button>
              <span className="rounded-lg bg-[var(--adm-surface-alt)] px-3 py-1.5 text-sm text-[var(--adm-text)]">
                {page} / {totalPages}
              </span>
              <button
                type="button"
                className="rounded-lg border border-[var(--adm-border-strong)] bg-[var(--adm-surface-alt)] px-3 py-1.5 text-sm text-[var(--adm-text)] transition-colors hover:bg-[var(--adm-hover)] disabled:cursor-not-allowed disabled:opacity-50"
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                disabled={page >= totalPages}
              >
                Next
              </button>
            </div>
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
}
