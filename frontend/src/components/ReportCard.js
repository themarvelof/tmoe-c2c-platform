import {
  FileText, Calendar, ChartBar, Table
} from '@phosphor-icons/react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
const CHART_COLORS = ['#DC120F', '#000000', '#666666', '#999999', '#DC120F80', '#00000080'];

function formatCellValue(value) {
  if (!value || value === '' || value === 'None') return '-';
  const num = parseFloat(String(value).replace(/,/g, ''));
  if (isNaN(num)) return value;
  if (num > 0 && num < 1 && String(value).length > 4) return (num * 100).toFixed(2) + '%';
  if (num >= 1000) return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
  if (Number.isInteger(num)) return num.toLocaleString();
  return parseFloat(num.toFixed(4)).toString();
}

export function CSVReportCard({ report }) {
  const columns = report.csv_columns || [];
  const rows = report.csv_rows || [];

  // Find numeric columns for charting
  const numericCols = columns.filter(col =>
    rows.some(row => {
      const val = parseFloat(String(row[col] || '').replace(/,/g, ''));
      return !isNaN(val) && val > 0;
    })
  );

  const labelCol = columns.find(col =>
    rows.some(row => {
      const val = String(row[col] || '');
      return val && isNaN(parseFloat(val.replace(/,/g, '')));
    })
  ) || columns[0];

  const chartCols = numericCols.filter(c => c !== labelCol).slice(0, 4);

  const chartData = rows.map((row, idx) => {
    const item = { name: String(row[labelCol] || `Row ${idx + 1}`).substring(0, 25) };
    chartCols.forEach(col => {
      item[col] = parseFloat(String(row[col] || '0').replace(/,/g, '')) || 0;
    });
    return item;
  });

  return (
    <div className="rounded-lg border" data-testid={`csv-report-${report.id}`}>
      {/* Header */}
      <div className="border-b p-4 flex items-center justify-between bg-muted/30">
        <div className="flex items-center gap-3">
          <FileText size={18} className="text-primary" />
          <div>
            <h4 className="text-sm font-bold text-foreground">{report.filename || 'Report'}</h4>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Calendar size={12} /> {new Date(report.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
              &middot; {rows.length} rows &middot; {columns.length} columns
            </span>
          </div>
        </div>
        {(report.metrics?.clicks > 0 || report.metrics?.revenue > 0) && (
          <div className="flex items-center gap-4 text-sm">
            {report.metrics.clicks > 0 && <span><strong className="font-mono">{report.metrics.clicks.toLocaleString()}</strong> <span className="text-muted-foreground text-xs">Clicks</span></span>}
            {report.metrics.conversions > 0 && <span><strong className="font-mono">{report.metrics.conversions.toLocaleString()}</strong> <span className="text-muted-foreground text-xs">Conv.</span></span>}
            {report.metrics.revenue > 0 && <span><strong className="font-mono text-primary">${report.metrics.revenue.toLocaleString()}</strong> <span className="text-muted-foreground text-xs">Revenue</span></span>}
          </div>
        )}
      </div>

      {/* Chart */}
      {chartCols.length > 0 && (
        <div className="border-b p-4" data-testid="report-chart">
          <h4 className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-2">
            <ChartBar size={14} className="text-primary" /> Performance Overview
          </h4>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 9 }} stroke="#999" interval={0} angle={rows.length > 5 ? -30 : 0} textAnchor={rows.length > 5 ? "end" : "middle"} height={rows.length > 5 ? 60 : 30} />
                <YAxis tick={{ fontSize: 9 }} stroke="#999" />
                <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e5e5e5', fontSize: 11 }} formatter={(v, n) => [typeof v === 'number' ? v.toLocaleString(undefined, { maximumFractionDigits: 2 }) : v, n]} />
                {chartCols.map((col, i) => (
                  <Bar key={col} dataKey={col} name={col} fill={CHART_COLORS[i % CHART_COLORS.length]} radius={[3, 3, 0, 0]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center gap-3 mt-2 justify-center">
            {chartCols.map((col, i) => (
              <span key={col} className="flex items-center gap-1 text-xs text-muted-foreground">
                <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />{col}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-muted/50">
              {columns.map((col) => (
                <th key={col} className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap border-b">{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={idx} className="border-b hover:bg-muted/20">
                {columns.map((col) => (
                  <td key={col} className="px-4 py-2.5 text-sm font-mono text-foreground whitespace-nowrap">{formatCellValue(row[col])}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function LegacyReportsTable({ reports }) {
  // Build chart data from legacy reports - aggregate by date
  const chartData = reports
    .reduce((acc, r) => {
      const dateLabel = new Date(r.report_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const existing = acc.find(d => d.name === dateLabel);
      if (existing) {
        existing.Impressions += r.metrics.impressions;
        existing.Clicks += r.metrics.clicks;
        existing.Conversions += r.metrics.conversions;
        existing.Revenue += r.metrics.revenue;
      } else {
        acc.push({
          date: r.report_date,
          name: dateLabel,
          Impressions: r.metrics.impressions,
          Clicks: r.metrics.clicks,
          Conversions: r.metrics.conversions,
          Revenue: r.metrics.revenue,
        });
      }
      return acc;
    }, [])
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-15);

  return (
    <div className="rounded-lg border">
      <div className="border-b p-4 bg-muted/30">
        <h4 className="text-sm font-bold text-foreground">Performance Reports ({reports.length})</h4>
      </div>

      {/* Chart for legacy reports */}
      {chartData.length > 1 && (
        <div className="border-b p-4" data-testid="legacy-report-chart">
          <h4 className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-2">
            <ChartBar size={14} className="text-primary" /> Performance Overview
          </h4>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 9 }} stroke="#999" />
                <YAxis tick={{ fontSize: 9 }} stroke="#999" />
                <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e5e5e5', fontSize: 11 }} formatter={(v, n) => [typeof v === 'number' ? v.toLocaleString(undefined, { maximumFractionDigits: 2 }) : v, n]} />
                <Bar dataKey="Impressions" fill="#000000" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Clicks" fill="#DC120F" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center gap-3 mt-2 justify-center">
            <span className="flex items-center gap-1 text-xs text-muted-foreground"><span className="w-2 h-2 rounded-sm bg-black" />Impressions</span>
            <span className="flex items-center gap-1 text-xs text-muted-foreground"><span className="w-2 h-2 rounded-sm bg-primary" />Clicks</span>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50 border-b">
              <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">Date</th>
              <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">Campaign</th>
              <th className="px-4 py-2 text-right text-xs font-semibold text-muted-foreground">Impressions</th>
              <th className="px-4 py-2 text-right text-xs font-semibold text-muted-foreground">Clicks</th>
              <th className="px-4 py-2 text-right text-xs font-semibold text-muted-foreground">Conversions</th>
              <th className="px-4 py-2 text-right text-xs font-semibold text-muted-foreground">Revenue</th>
            </tr>
          </thead>
          <tbody>
            {reports.map((r) => (
              <tr key={r.id} className="border-b hover:bg-muted/20">
                <td className="px-4 py-2">{new Date(r.report_date + 'T00:00:00').toLocaleDateString()}</td>
                <td className="px-4 py-2">{r.campaign_breakdown?.[0]?.campaign || '-'}</td>
                <td className="px-4 py-2 text-right font-mono">{r.metrics.impressions.toLocaleString()}</td>
                <td className="px-4 py-2 text-right font-mono">{r.metrics.clicks.toLocaleString()}</td>
                <td className="px-4 py-2 text-right font-mono">{r.metrics.conversions.toLocaleString()}</td>
                <td className="px-4 py-2 text-right font-mono">${r.metrics.revenue.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
