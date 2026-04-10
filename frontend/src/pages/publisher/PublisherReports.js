import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import axios from '@/utils/api';
import { API } from '@/utils/api';
import { toast } from 'sonner';
import { ChartBar, CaretDown, CaretUp } from '@phosphor-icons/react';
import { CSVReportCard, LegacyReportsTable } from '@/components/ReportCard';

export default function PublisherReports() {
  const [brandReports, setBrandReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedBrand, setExpandedBrand] = useState(null);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const res = await axios.get(`${API}/publisher/brand-reports`);
      setBrandReports(res.data);
      if (res.data.length > 0) setExpandedBrand(res.data[0].brand.id);
    } catch (error) {
      toast.error('Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <DashboardLayout role="publisher"><div className="p-8">Loading...</div></DashboardLayout>;
  }

  return (
    <DashboardLayout role="publisher">
      <div className="p-8 bg-muted min-h-screen" data-testid="publisher-reports-page">
        <div className="mb-8">
          <h1 className="font-heading text-4xl font-bold text-foreground">Brand Reports</h1>
          <p className="text-muted-foreground mt-2">Performance reports from brands you work with</p>
        </div>

        {brandReports.length === 0 ? (
          <div className="bg-white rounded-lg border p-12 text-center" data-testid="no-reports">
            <ChartBar size={48} className="mx-auto mb-4 text-muted-foreground" />
            <h3 className="font-heading text-xl font-bold text-foreground mb-2">No Reports Available</h3>
            <p className="text-muted-foreground">Reports from your brand partners will appear here.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {brandReports.map((br) => {
              const isExpanded = expandedBrand === br.brand.id;
              const csvReports = br.reports.filter(r => r.csv_columns?.length > 0);
              const legacyReports = br.reports.filter(r => !r.csv_columns?.length);

              return (
                <div key={br.brand.id} className="bg-white rounded-lg border" data-testid={`brand-report-${br.brand.id}`}>
                  <button
                    onClick={() => setExpandedBrand(isExpanded ? null : br.brand.id)}
                    className="w-full flex items-center justify-between p-5 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <ChartBar size={20} className="text-primary" />
                      </div>
                      <div className="text-left">
                        <h3 className="font-heading text-lg font-bold text-foreground">{br.brand.company_name || br.brand.email}</h3>
                        <p className="text-sm text-muted-foreground">{br.brand.email} &middot; {br.report_count} reports</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      {br.summary.total_revenue > 0 && (
                        <div className="text-right">
                          <div className="font-mono text-lg font-bold text-foreground">${br.summary.total_revenue.toLocaleString()}</div>
                          <div className="text-xs text-muted-foreground">Total Revenue</div>
                        </div>
                      )}
                      {isExpanded ? <CaretUp size={20} /> : <CaretDown size={20} />}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="border-t p-5 space-y-5">
                      {csvReports.map((report) => (
                        <CSVReportCard key={report.id} report={report} />
                      ))}
                      {legacyReports.length > 0 && <LegacyReportsTable reports={legacyReports} />}
                      {br.reports.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-4">No reports uploaded yet.</p>
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
