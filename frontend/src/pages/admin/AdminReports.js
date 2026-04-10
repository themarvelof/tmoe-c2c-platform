import { useState, useEffect, useRef } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import axios from '@/utils/api';
import { API } from '@/utils/api';
import { toast } from 'sonner';
import { ChartBar, CaretDown, CaretUp, UploadSimple, EnvelopeSimple } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { CSVReportCard, LegacyReportsTable } from '@/components/ReportCard';

export default function AdminReports() {
  const [brandReports, setBrandReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedBrand, setExpandedBrand] = useState(null);
  const [uploadingFor, setUploadingFor] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const res = await axios.get(`${API}/admin/all-brand-reports`);
      setBrandReports(res.data);
    } catch (error) {
      toast.error('Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  const handleUploadForBrand = (brandId) => {
    setUploadingFor(brandId);
    fileInputRef.current?.click();
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !uploadingFor) return;
    const allowed = ['.csv', '.xls', '.xlsx'];
    if (!allowed.some(ext => file.name.toLowerCase().endsWith(ext))) {
      toast.error('Please upload a CSV or XLS/XLSX file'); return;
    }
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await axios.post(`${API}/admin/brand-reports/${uploadingFor}/upload-csv`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success(res.data.message);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to upload');
    } finally {
      setUploadingFor(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  if (loading) {
    return <DashboardLayout role="admin"><div className="p-8">Loading...</div></DashboardLayout>;
  }

  return (
    <DashboardLayout role="admin">
      <div className="p-8 bg-muted min-h-screen" data-testid="admin-reports-page">
        <input type="file" accept=".csv,.xls,.xlsx" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />

        <div className="mb-8">
          <h1 className="font-heading text-4xl font-bold text-foreground">All Brand Reports</h1>
          <p className="text-muted-foreground mt-2">
            Performance reports across all brands &middot; {brandReports.length} brands &middot; {brandReports.reduce((a, b) => a + b.report_count, 0)} reports
          </p>
        </div>

        {brandReports.length === 0 ? (
          <div className="bg-white rounded-lg border p-12 text-center" data-testid="no-reports">
            <ChartBar size={48} className="mx-auto mb-4 text-muted-foreground" />
            <h3 className="font-heading text-xl font-bold text-foreground mb-2">No Reports Yet</h3>
            <p className="text-muted-foreground">Brand reports will appear here once uploaded.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {brandReports.map((br) => {
              const isExpanded = expandedBrand === br.brand.id;
              const csvReports = br.reports.filter(r => r.csv_columns?.length > 0);
              const legacyReports = br.reports.filter(r => !r.csv_columns?.length);

              return (
                <div key={br.brand.id} className="bg-white rounded-lg border" data-testid={`admin-brand-report-${br.brand.id}`}>
                  <div className="flex items-center justify-between p-5">
                    <button onClick={() => setExpandedBrand(isExpanded ? null : br.brand.id)} className="flex items-center gap-4 flex-1 text-left">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <ChartBar size={20} className="text-primary" />
                      </div>
                      <div>
                        <h3 className="font-heading text-lg font-bold text-foreground">{br.brand.company_name || br.brand.email}</h3>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1"><EnvelopeSimple size={14} /> {br.brand.email}</span>
                          <span>&middot; {br.report_count} reports</span>
                        </div>
                      </div>
                    </button>
                    <div className="flex items-center gap-4">
                      {br.summary.total_revenue > 0 && (
                        <div className="text-right mr-4">
                          <div className="font-mono text-lg font-bold text-foreground">${br.summary.total_revenue.toLocaleString()}</div>
                          <div className="text-xs text-muted-foreground">Revenue</div>
                        </div>
                      )}
                      <Button variant="outline" size="sm" onClick={() => handleUploadForBrand(br.brand.id)} data-testid={`upload-report-${br.brand.id}`}>
                        <UploadSimple size={16} className="mr-1" /> Upload CSV / XLS
                      </Button>
                      <button onClick={() => setExpandedBrand(isExpanded ? null : br.brand.id)}>
                        {isExpanded ? <CaretUp size={20} /> : <CaretDown size={20} />}
                      </button>
                    </div>
                  </div>

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
