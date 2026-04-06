import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import axios from '@/utils/api';
import { API } from '@/utils/api';
import { toast } from 'sonner';
import { ChartBar, Users, Briefcase, CurrencyDollar } from '@phosphor-icons/react';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API}/admin/dashboard/stats`);
      setStats(response.data);
    } catch (error) {
      toast.error('Failed to load dashboard stats');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout role="admin">
        <div className="p-8">Loading...</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="admin">
      <div className="p-8" data-testid="admin-dashboard">
        <h1 className="font-heading text-4xl font-bold mb-8">Admin Dashboard</h1>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="border border-foreground p-6" data-testid="stat-active-campaigns">
            <div className="flex items-center justify-between mb-4">
              <Briefcase size={32} weight="regular" />
              <div className="font-mono text-3xl font-bold">{stats?.active_campaigns || 0}</div>
            </div>
            <div className="text-sm font-medium">Active Campaigns</div>
          </div>

          <div className="border border-foreground p-6" data-testid="stat-pending-verifications">
            <div className="flex items-center justify-between mb-4">
              <Users size={32} weight="regular" />
              <div className="font-mono text-3xl font-bold">{stats?.pending_verifications || 0}</div>
            </div>
            <div className="text-sm font-medium">Pending Verifications</div>
          </div>

          <div className="border border-foreground p-6" data-testid="stat-total-publishers">
            <div className="flex items-center justify-between mb-4">
              <ChartBar size={32} weight="regular" />
              <div className="font-mono text-3xl font-bold">{stats?.total_publishers || 0}</div>
            </div>
            <div className="text-sm font-medium">Total Publishers</div>
          </div>

          <div className="border border-foreground p-6" data-testid="stat-total-brands">
            <div className="flex items-center justify-between mb-4">
              <ChartBar size={32} weight="regular" />
              <div className="font-mono text-3xl font-bold">{stats?.total_brands || 0}</div>
            </div>
            <div className="text-sm font-medium">Total Brands</div>
          </div>
        </div>

        <div className="mt-8 border border-foreground p-8">
          <h2 className="font-heading text-2xl font-bold mb-4">Platform GMV</h2>
          <div className="font-mono text-5xl font-bold">
            ${stats?.total_gmv?.toLocaleString() || 0}
          </div>
          <p className="text-sm text-muted-foreground mt-2">Total Gross Merchandise Value</p>
        </div>
      </div>
    </DashboardLayout>
  );
}
