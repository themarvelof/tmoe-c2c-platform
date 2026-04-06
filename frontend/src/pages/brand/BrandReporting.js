import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import axios from '@/utils/api';
import { API } from '@/utils/api';
import { toast } from 'sonner';
import { Eye, TrendingUp, CurrencyDollar, ShoppingCart, ChartLineUp } from '@phosphor-icons/react';

export default function BrandReporting() {
  const [summary, setSummary] = useState(null);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [summaryRes, reportsRes] = await Promise.all([
        axios.get(`${API}/brand/reports/summary`),
        axios.get(`${API}/brand/reports`)
      ]);
      setSummary(summaryRes.data);
      setReports(reportsRes.data);
    } catch (error) {
      toast.error('Failed to load reporting data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout role="brand">
        <div className="p-8">Loading...</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="brand">
      <div className="p-8 bg-muted min-h-screen" data-testid="brand-reporting-page">
        <div className="mb-8">
          <h1 className="font-heading text-4xl font-bold text-foreground">Performance Reports</h1>
          <p className="text-muted-foreground mt-2">Track your campaign performance metrics</p>
        </div>

        {/* Summary Stats */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg border p-6 hover:shadow-lg transition-shadow" data-testid="stat-impressions">
            <div className="flex items-center justify-between mb-4">
              <Eye size={32} weight="regular" className="text-primary" />
              <div className="font-mono text-3xl font-bold text-foreground">
                {summary?.total_impressions?.toLocaleString() || 0}
              </div>
            </div>
            <div className="text-sm font-medium text-muted-foreground">Total Impressions</div>
          </div>

          <div className="bg-white rounded-lg border p-6 hover:shadow-lg transition-shadow" data-testid="stat-clicks">
            <div className="flex items-center justify-between mb-4">
              <ChartLineUp size={32} weight="regular" className="text-primary" />
              <div className="font-mono text-3xl font-bold text-foreground">
                {summary?.total_clicks?.toLocaleString() || 0}
              </div>
            </div>
            <div className="text-sm font-medium text-muted-foreground">Total Clicks</div>
            <div className="text-xs text-muted-foreground mt-1">CTR: {summary?.avg_ctr || 0}%</div>
          </div>

          <div className="bg-white rounded-lg border p-6 hover:shadow-lg transition-shadow" data-testid="stat-conversions">
            <div className="flex items-center justify-between mb-4">
              <ShoppingCart size={32} weight="regular" className="text-primary" />
              <div className="font-mono text-3xl font-bold text-foreground">
                {summary?.total_conversions?.toLocaleString() || 0}
              </div>
            </div>
            <div className="text-sm font-medium text-muted-foreground">Conversions</div>
            <div className="text-xs text-muted-foreground mt-1">Rate: {summary?.avg_conversion_rate || 0}%</div>
          </div>

          <div className="bg-white rounded-lg border p-6 hover:shadow-lg transition-shadow" data-testid="stat-revenue">
            <div className="flex items-center justify-between mb-4">
              <CurrencyDollar size={32} weight="regular" className="text-primary" />
              <div className="font-mono text-3xl font-bold text-foreground">
                ${summary?.total_revenue?.toLocaleString() || 0}
              </div>
            </div>
            <div className="text-sm font-medium text-muted-foreground">Total Revenue</div>
            <div className="text-xs text-muted-foreground mt-1">ROAS: {summary?.avg_roas || 0}x</div>
          </div>
        </div>

        {/* Reports Table */}
        <div className="bg-white rounded-lg border" data-testid="reports-section">
          <div className="border-b p-6">
            <h2 className="font-heading text-2xl font-bold text-foreground">Recent Reports</h2>
          </div>
          <div className="p-6">
            {reports.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-4">No reports yet.</p>
                <div className="bg-muted rounded-lg p-4 max-w-2xl mx-auto">
                  <p className="text-sm text-foreground font-semibold mb-2">How to send reports:</p>
                  <p className="text-sm text-muted-foreground">Reports can be sent via API webhook. Contact your admin for integration details.</p>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="pb-3 font-medium text-foreground">Date</th>
                      <th className="pb-3 font-medium text-foreground">Period</th>
                      <th className="pb-3 font-medium text-foreground">Impressions</th>
                      <th className="pb-3 font-medium text-foreground">Clicks</th>
                      <th className="pb-3 font-medium text-foreground">Conversions</th>
                      <th className="pb-3 font-medium text-foreground">Revenue</th>
                      <th className="pb-3 font-medium text-foreground">ROAS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reports.map((report) => (
                      <tr key={report.id} className="border-b border-border" data-testid={`report-${report.id}`}>
                        <td className="py-4">{new Date(report.report_date).toLocaleDateString()}</td>
                        <td className="py-4">
                          <span className="px-3 py-1 text-xs font-medium rounded-full bg-muted text-foreground">
                            {report.period.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-4 font-mono text-foreground">
                          {report.metrics.impressions.toLocaleString()}
                        </td>
                        <td className="py-4 font-mono text-foreground">
                          {report.metrics.clicks.toLocaleString()}
                        </td>
                        <td className="py-4 font-mono text-foreground">
                          {report.metrics.conversions.toLocaleString()}
                        </td>
                        <td className="py-4 font-mono text-foreground">
                          ${report.metrics.revenue.toLocaleString()}
                        </td>
                        <td className="py-4 font-mono font-bold text-primary">
                          {report.metrics.roas.toFixed(2)}x
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* API Integration Info */}
        <div className="mt-8 bg-white rounded-lg border p-6">
          <h3 className="font-heading text-xl font-bold mb-4 text-foreground">API Integration</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Your reporting data can be automatically sent to this dashboard using our API webhook.
          </p>
          <div className="bg-muted rounded-lg p-4 font-mono text-sm">
            <div className="text-xs text-muted-foreground mb-2">Endpoint:</div>
            <div className="text-foreground">POST /api/api-webhook/brand-reports</div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
