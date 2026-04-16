import { useState, useEffect, useMemo, useCallback } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import axios from '@/utils/api';
import { API } from '@/utils/api';
import { toast } from 'sonner';
import { ChartBar, CaretDown, CaretUp, EnvelopeSimple, CloudArrowDown } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

function defaultDateRange(days = 30) {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - days);
  return {
    start_date: start.toISOString().slice(0, 10),
    end_date: end.toISOString().slice(0, 10),
  };
}

export default function AdminReports() {
  const [reportData, setReportData] = useState({ summary: [], daily: [], table: [], records: [] });
  const [dateRange, setDateRange] = useState(defaultDateRange(30));
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [expandedBrand, setExpandedBrand] = useState(null);

  const fetchData = useCallback(async (range) => {
    const params = {
      start_date: range.start_date,
      end_date: range.end_date,
    };
    try {
      const res = await axios.get(`${API}/reports`, { params });
      setReportData({
        summary: res.data?.summary || [],
        daily: res.data?.daily || [],
        table: res.data?.table || [],
        records: res.data?.records || [],
      });
      setErrorMessage('');
      return true;
    } catch (error) {
      const msg = error.response?.data?.detail || 'Failed to fetch Impact reports';
      setErrorMessage(msg);
      toast.error(msg);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(dateRange);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const brandReports = useMemo(() => {
    const grouped = new Map();
    const records = reportData.records || [];
    for (const row of records) {
      const campaign = row.Campaign || row.campaign || 'Unknown';
      if (!grouped.has(campaign)) grouped.set(campaign, []);
      grouped.get(campaign).push(row);
    }

    return (reportData.summary || []).map((s) => {
      const campaignRows = grouped.get(s.campaign) || [];
      const reports = campaignRows.map((row, idx) => ({
        id: `${s.campaign}-${row.date}-${idx}`,
        campaign: row.Campaign || s.campaign,
        clicks: Number(row.Clicks ?? row.clicks ?? 0),
        conversions: Number(row.Actions ?? row.conversions ?? row.actions ?? 0),
        revenue: Number(row.Sale_Amount ?? row.revenue ?? 0),
      }));
      const tableRows = reports.map((row, idx) => ({
        id: `${s.campaign}-${idx}`,
        report_date: dateRange.end_date,
        campaign_breakdown: [{ campaign: s.campaign }],
        metrics: {
          impressions: 0,
          clicks: Number(row.clicks || 0),
          conversions: Number(row.conversions || 0),
          revenue: Number(row.revenue || 0),
        },
      }));
      return {
        brand: {
          id: s.campaign,
          company_name: s.campaign,
          email: `${s.campaign.toLowerCase().replace(/\s+/g, '')}@impact`,
        },
        report_count: reports.length,
        summary: {
          total_impressions: 0,
          total_clicks: reports.reduce((a, r) => a + r.clicks, 0),
          total_conversions: reports.reduce((a, r) => a + r.conversions, 0),
          total_revenue: Number(s.revenue || 0),
        },
        records: reports,
        reports: tableRows,
      };
    });
  }, [reportData, dateRange.end_date]);

  const fetchImpactData = async () => {
    setFetching(true);
    try {
      const ok = await fetchData(dateRange);
      if (ok) toast.success('Impact data updated');
    } finally {
      setFetching(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout role="admin">
        <div className="p-8 flex items-center gap-3 text-[var(--adm-text)]">
          <div className="h-5 w-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <span>Loading Impact reports...</span>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="admin">
      <div className="p-8 bg-[var(--adm-bg)] text-[var(--adm-text)] min-h-screen" data-testid="admin-reports-page">
        <div className="mb-8">
          <h1 className="font-heading text-4xl font-bold text-[var(--adm-text)]">All Brand Reports</h1>
          <p className="text-[var(--adm-muted)] mt-2">
            Performance reports across all brands &middot; {brandReports.length} brands &middot; {brandReports.reduce((a, b) => a + b.report_count, 0)} reports
          </p>
          <div className="mt-4 flex items-end gap-3 flex-wrap">
            <div className="space-y-1">
              <Label htmlFor="start-date" className="text-[var(--adm-muted)]">Start date</Label>
              <Input
                id="start-date"
                type="date"
                value={dateRange.start_date}
                onChange={(e) => setDateRange((d) => ({ ...d, start_date: e.target.value }))}
                className="admin-date-input bg-[var(--adm-surface-alt)] border-[var(--adm-border)] text-[var(--adm-text)]"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="end-date" className="text-[var(--adm-muted)]">End date</Label>
              <Input
                id="end-date"
                type="date"
                value={dateRange.end_date}
                onChange={(e) => setDateRange((d) => ({ ...d, end_date: e.target.value }))}
                className="admin-date-input bg-[var(--adm-surface-alt)] border-[var(--adm-border)] text-[var(--adm-text)]"
              />
            </div>
            <Button onClick={fetchImpactData} disabled={fetching} className="bg-[#f91445] text-white hover:bg-[#ff2958]">
              <CloudArrowDown size={16} className="mr-1" />
              {fetching ? 'Fetching...' : 'Fetch Impact Data'}
            </Button>
          </div>
        </div>
        {errorMessage && (
          <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {errorMessage}
          </div>
        )}

        {brandReports.length === 0 ? (
          <div className="bg-[var(--adm-surface)] rounded-lg border border-[var(--adm-border)] p-12 text-center" data-testid="no-reports">
            <ChartBar size={48} className="mx-auto mb-4 text-[var(--adm-muted)]" />
            <h3 className="font-heading text-xl font-bold text-[var(--adm-text)] mb-2">No Reports Yet</h3>
            <p className="text-[var(--adm-muted)]">Brand reports will appear here once uploaded.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {brandReports.map((br) => {
              const isExpanded = expandedBrand === br.brand.id;
              const hasRecords = br.records && br.records.length > 0;

              return (
                <div key={br.brand.id} className="bg-[var(--adm-surface)] rounded-lg border border-[var(--adm-border)]" data-testid={`admin-brand-report-${br.brand.id}`}>
                  <div className="flex items-center justify-between p-5">
                    <button onClick={() => setExpandedBrand(isExpanded ? null : br.brand.id)} className="flex items-center gap-4 flex-1 text-left">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <ChartBar size={20} className="text-primary" />
                      </div>
                      <div>
                        <h3 className="font-heading text-lg font-bold text-[var(--adm-text)]">{br.brand.company_name || br.brand.email}</h3>
                        <div className="flex items-center gap-3 text-sm text-[var(--adm-muted)]">
                          <span className="flex items-center gap-1"><EnvelopeSimple size={14} /> {br.brand.email}</span>
                          <span>&middot; {br.report_count} reports</span>
                        </div>
                      </div>
                    </button>
                    <div className="flex items-center gap-4">
                      {br.summary.total_revenue > 0 && (
                        <div className="text-right mr-4">
                          <div className="font-mono text-lg font-bold text-[var(--adm-text)]">${br.summary.total_revenue.toLocaleString()}</div>
                          <div className="text-xs text-[var(--adm-muted)]">Revenue</div>
                        </div>
                      )}
                      <div className="flex items-center gap-2 flex-wrap justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={fetchImpactData}
                          className="border-[var(--adm-border)] bg-[var(--adm-surface-alt)] text-[var(--adm-text)] hover:bg-[var(--adm-hover)]"
                          data-testid={`impact-import-${br.brand.id}`}
                        >
                          <CloudArrowDown size={16} className="mr-1" /> Fetch Impact Data
                        </Button>
                      </div>
                      <button onClick={() => setExpandedBrand(isExpanded ? null : br.brand.id)}>
                        {isExpanded ? <CaretUp size={20} /> : <CaretDown size={20} />}
                      </button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-[var(--adm-border)] p-5 space-y-5">
                      {hasRecords && (
                        <div className="overflow-x-auto rounded-lg border border-[var(--adm-border)]">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="bg-[var(--adm-surface-alt)] border-b border-[var(--adm-border)]">
                                <th className="px-4 py-2 text-left text-xs font-semibold text-[var(--adm-muted)]">Campaign</th>
                                <th className="px-4 py-2 text-right text-xs font-semibold text-[var(--adm-muted)]">Clicks</th>
                                <th className="px-4 py-2 text-right text-xs font-semibold text-[var(--adm-muted)]">Conversions</th>
                                <th className="px-4 py-2 text-right text-xs font-semibold text-[var(--adm-muted)]">Revenue</th>
                              </tr>
                            </thead>
                            <tbody>
                              {br.records.map((row, idx) => (
                                <tr key={idx} className="border-b border-[var(--adm-border)] hover:bg-[var(--adm-hover)]">
                                  <td className="px-4 py-2 text-[var(--adm-text)]">{row.campaign}</td>
                                  <td className="px-4 py-2 text-right font-mono text-[var(--adm-text)]">{Number(row.clicks || 0).toLocaleString()}</td>
                                  <td className="px-4 py-2 text-right font-mono text-[var(--adm-text)]">{Number(row.conversions || 0).toLocaleString()}</td>
                                  <td className="px-4 py-2 text-right font-mono text-[var(--adm-text)]">${Number(row.revenue || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                      {!hasRecords && (
                        <p className="text-sm text-[var(--adm-muted)] text-center py-4">No Impact data in selected date range.</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
