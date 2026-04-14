import { useState, useEffect, useRef, useCallback } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import axios from '@/utils/api';
import { API } from '@/utils/api';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import {
  UploadSimple, ChartBar, Trash, FileText, EnvelopeSimple, Calendar, Table
} from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { LegacyReportsTable } from '@/components/ReportCard';

const CHART_COLORS = ['#DC120F', '#000000', '#666666', '#999999', '#DC120F80', '#00000080'];

export default function BrandReporting() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);
  const { user } = useAuth();
  const reportEmail = user?.email || '';

  useEffect(() => { fetchData(); }, []);

  const fetchData = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/brand/reports`);
      setReports(res.data);
    } catch (error) {
      toast.error('Failed to load reports');
    } finally {
      setLoading(false);
    }
  }, []);

  const processFile = useCallback(async (file) => {
    const allowed = ['.csv', '.xls', '.xlsx'];
    if (!allowed.some(ext => file.name.toLowerCase().endsWith(ext))) {
      toast.error('Please upload a CSV or XLS/XLSX file');
      return;
    }
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await axios.post(`${API}/brand/reports/upload-csv`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success(res.data.message);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to upload');
    } finally {
      setUploading(false);
    }
  }, [fetchData]);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) processFile(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  }, [processFile]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) processFile(e.dataTransfer.files[0]);
  }, []);

  const handleClearReports = async () => {
    if (!window.confirm('Are you sure you want to clear all reports?')) return;
    try {
      await axios.delete(`${API}/brand/reports`);
      toast.success('All reports cleared');
      fetchData();
    } catch (error) {
      toast.error('Failed to clear reports');
    }
  };

  if (loading) {
    return <DashboardLayout role="brand"><div className="p-8">Loading...</div></DashboardLayout>;
  }

  const csvReports = reports.filter(r => r.csv_columns?.length > 0);
  const legacyReports = reports.filter(r => !r.csv_columns?.length);

  return (
    <DashboardLayout role="brand">
      <div className="p-8 bg-muted min-h-screen" data-testid="brand-reporting-page">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
          <div>
            <h1 className="font-heading text-4xl font-bold text-foreground">Performance Reports</h1>
            <p className="text-muted-foreground mt-2">Upload CSV or XLS reports to track campaign performance</p>
          </div>
          <div className="flex items-center gap-3">
            <input type="file" accept=".csv,.xls,.xlsx" ref={fileInputRef} onChange={handleFileUpload} className="hidden" data-testid="file-upload-input" />
            <Button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="bg-primary text-primary-foreground hover:bg-primary/90" data-testid="upload-report-btn">
              <UploadSimple size={18} className="mr-2" />
              {uploading ? 'Uploading...' : 'Upload CSV / XLS'}
            </Button>
            {reports.length > 0 && (
              <Button variant="outline" onClick={handleClearReports} className="text-destructive border-destructive hover:bg-destructive hover:text-white" data-testid="clear-reports-btn">
                <Trash size={18} className="mr-2" />Clear All
              </Button>
            )}
          </div>
        </div>

        {/* Email Card */}
        <div className="bg-white rounded-lg border p-5 mb-6 flex items-start gap-4" data-testid="email-config-card">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <EnvelopeSimple size={22} className="text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="font-heading text-base font-bold text-foreground mb-1">Report Email Address</h3>
            <p className="text-sm text-muted-foreground mb-2">CSV/XLS reports sent to this email will populate your dashboard automatically.</p>
            <div className="inline-flex items-center gap-2 bg-muted rounded-lg px-4 py-2">
              <span className="font-mono text-sm font-medium text-foreground" data-testid="report-email-address">{reportEmail}</span>
              <button onClick={() => { navigator.clipboard.writeText(reportEmail); toast.success('Email copied'); }} className="text-xs text-primary hover:underline font-medium">Copy</button>
            </div>
          </div>
        </div>

        {/* Drop Zone */}
        <div
          className={`mb-8 border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer ${dragActive ? 'border-primary bg-primary/5' : 'border-border bg-white hover:border-primary/50'}`}
          onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()} data-testid="file-drop-zone"
        >
          <UploadSimple size={32} className={`mx-auto mb-2 ${dragActive ? 'text-primary' : 'text-muted-foreground'}`} />
          <p className="text-sm font-medium text-foreground">
            {uploading ? 'Uploading...' : dragActive ? 'Drop your file here' : 'Drag & drop a CSV or XLS/XLSX file here, or click to browse'}
          </p>
          <p className="text-xs text-muted-foreground mt-1">Supported formats: .csv, .xls, .xlsx</p>
        </div>

        {reports.length === 0 ? (
          <EmptyState onClick={() => fileInputRef.current?.click()} />
        ) : (
          <div className="space-y-8">
            {csvReports.map((report) => (
              <ReportCard key={report.id} report={report} />
            ))}
            {legacyReports.length > 0 && <LegacyReportsTable reports={legacyReports} />}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

function EmptyState({ onClick }) {
  return (
    <div className="bg-white rounded-lg border p-12 text-center" data-testid="empty-reports">
      <ChartBar size={48} className="mx-auto mb-4 text-muted-foreground" />
      <h3 className="font-heading text-xl font-bold text-foreground mb-2">No Reports Yet</h3>
      <p className="text-muted-foreground mb-6">Upload your first report (CSV or XLS) to see charts and data.</p>
      <Button onClick={onClick} className="bg-primary text-primary-foreground">
        <UploadSimple size={18} className="mr-2" />Upload Your First Report
      </Button>
    </div>
  );
}

function ReportCard({ report }) {
  return (
    <div className="bg-white rounded-lg border" data-testid={`report-card-${report.id}`}>
      <ReportHeader report={report} />
      <ReportChart report={report} />
      <ReportTable report={report} />
    </div>
  );
}

function ReportHeader({ report }) {
  const rows = report.csv_rows || [];
  const columns = report.csv_columns || [];
  return (
    <div className="border-b p-5 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
          <FileText size={18} className="text-primary" />
        </div>
        <div>
          <h3 className="font-heading text-base font-bold text-foreground">{report.filename || 'Report'}</h3>
          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
            <span className="flex items-center gap-1"><Calendar size={12} /> {new Date(report.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
            <span>{rows.length} {rows.length === 1 ? 'row' : 'rows'} &middot; {columns.length} columns</span>
          </div>
        </div>
      </div>
      {(report.metrics.clicks > 0 || report.metrics.revenue > 0) && (
        <div className="flex items-center gap-5 text-sm">
          {report.metrics.clicks > 0 && <span><strong className="font-mono">{report.metrics.clicks.toLocaleString()}</strong> <span className="text-muted-foreground text-xs">Clicks</span></span>}
          {report.metrics.conversions > 0 && <span><strong className="font-mono">{report.metrics.conversions.toLocaleString()}</strong> <span className="text-muted-foreground text-xs">Conversions</span></span>}
          {report.metrics.revenue > 0 && <span><strong className="font-mono text-primary">${report.metrics.revenue.toLocaleString()}</strong> <span className="text-muted-foreground text-xs">Revenue</span></span>}
        </div>
      )}
    </div>
  );
}

function ReportChart({ report }) {
  const columns = report.csv_columns || [];
  const rows = report.csv_rows || [];
  if (rows.length === 0) return null;

  // Find numeric columns for charting
  const numericCols = columns.filter(col => {
    return rows.some(row => {
      const val = parseFloat(String(row[col] || '').replace(/,/g, ''));
      return !isNaN(val) && val > 0;
    });
  });

  // Find a good label column (first text-based column)
  const labelCol = columns.find(col => {
    return rows.some(row => {
      const val = String(row[col] || '');
      return val && isNaN(parseFloat(val.replace(/,/g, '')));
    });
  }) || columns[0];

  // Pick up to 4 numeric columns for the chart
  const chartCols = numericCols.filter(c => c !== labelCol).slice(0, 4);
  if (chartCols.length === 0) return null;

  const chartData = rows.map((row, idx) => {
    const item = { name: String(row[labelCol] || `Row ${idx + 1}`).substring(0, 25) };
    chartCols.forEach(col => {
      item[col] = parseFloat(String(row[col] || '0').replace(/,/g, '')) || 0;
    });
    return item;
  });

  return (
    <div className="border-b p-5" data-testid="report-chart">
      <h4 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
        <ChartBar size={16} className="text-primary" /> Performance Overview
      </h4>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} barGap={2}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="#999" interval={0} angle={rows.length > 5 ? -30 : 0} textAnchor={rows.length > 5 ? "end" : "middle"} height={rows.length > 5 ? 60 : 30} />
            <YAxis tick={{ fontSize: 10 }} stroke="#999" />
            <Tooltip
              contentStyle={{ borderRadius: 8, border: '1px solid #e5e5e5', fontSize: 12 }}
              formatter={(value, name) => [typeof value === 'number' ? value.toLocaleString(undefined, { maximumFractionDigits: 2 }) : value, name]}
            />
            {chartCols.map((col, i) => (
              <Bar key={col} dataKey={col} name={col} fill={CHART_COLORS[i % CHART_COLORS.length]} radius={[3, 3, 0, 0]} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="flex items-center gap-4 mt-3 justify-center">
        {chartCols.map((col, i) => (
          <span key={col} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
            {col}
          </span>
        ))}
      </div>
    </div>
  );
}

function formatCellValue(value) {
  if (!value || value === '' || value === 'None') return '-';
  const num = parseFloat(String(value).replace(/,/g, ''));
  if (isNaN(num)) return value;
  if (num > 0 && num < 1 && String(value).length > 4) return (num * 100).toFixed(2) + '%';
  if (num >= 1000) return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
  if (Number.isInteger(num)) return num.toLocaleString();
  return parseFloat(num.toFixed(4)).toString();
}

function ReportTable({ report }) {
  const columns = report.csv_columns || [];
  const rows = report.csv_rows || [];

  return (
    <div className="overflow-x-auto" data-testid="report-table">
      <table className="w-full">
        <thead>
          <tr className="bg-muted/50">
            {columns.map((col) => (
              <th key={col} className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap border-b">{col}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr key={idx} className="border-b border-border hover:bg-muted/20 transition-colors" data-testid={`report-row-${idx}`}>
              {columns.map((col) => (
                <td key={col} className="px-5 py-3.5 text-sm font-mono text-foreground whitespace-nowrap">{formatCellValue(row[col])}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
