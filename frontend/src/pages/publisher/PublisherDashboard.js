import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import axios from '@/utils/api';
import { API } from '@/utils/api';
import { toast } from 'sonner';
import { ChartLineUp, Briefcase, CurrencyDollar } from '@phosphor-icons/react';

export default function PublisherDashboard() {
  const [campaigns, setCampaigns] = useState([]);
  const [earnings, setEarnings] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [campaignsRes, earningsRes] = await Promise.all([
        axios.get(`${API}/publisher/campaigns`),
        axios.get(`${API}/publisher/earnings`)
      ]);
      setCampaigns(campaignsRes.data);
      setEarnings(earningsRes.data);
    } catch (error) {
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout role="publisher">
        <div className="p-8">Loading...</div>
      </DashboardLayout>
    );
  }

  const activeCampaigns = campaigns.filter(c => c.status === 'active').length;

  return (
    <DashboardLayout role="publisher">
      <div className="p-8 bg-muted min-h-screen" data-testid="publisher-dashboard">
        <h1 className="font-heading text-4xl font-bold mb-8 text-foreground">Dashboard</h1>

        {/* Stats Grid */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg border p-6 hover:shadow-lg transition-shadow" data-testid="stat-active-campaigns">
            <div className="flex items-center justify-between mb-4">
              <Briefcase size={32} weight="regular" className="text-primary" />
              <div className="font-mono text-3xl font-bold text-foreground">{activeCampaigns}</div>
            </div>
            <div className="text-sm font-medium text-muted-foreground">Active Campaigns</div>
          </div>

          <div className="bg-white rounded-lg border p-6 hover:shadow-lg transition-shadow" data-testid="stat-total-earnings">
            <div className="flex items-center justify-between mb-4">
              <CurrencyDollar size={32} weight="regular" className="text-primary" />
              <div className="font-mono text-3xl font-bold text-foreground">
                ${earnings?.total_earnings?.toLocaleString() || 0}
              </div>
            </div>
            <div className="text-sm font-medium text-muted-foreground">Total Earnings</div>
          </div>

          <div className="bg-white rounded-lg border p-6 hover:shadow-lg transition-shadow" data-testid="stat-pending-payout">
            <div className="flex items-center justify-between mb-4">
              <ChartLineUp size={32} weight="regular" className="text-primary" />
              <div className="font-mono text-3xl font-bold text-foreground">
                ${earnings?.pending_payout?.toLocaleString() || 0}
              </div>
            </div>
            <div className="text-sm font-medium text-muted-foreground">Pending Payout</div>
          </div>
        </div>

        {/* Recent Campaigns */}
        <div className="bg-white rounded-lg border" data-testid="recent-campaigns-section">
          <div className="border-b p-6">
            <h2 className="font-heading text-2xl font-bold text-foreground">Recent Campaigns</h2>
          </div>
          <div className="p-6">
            {campaigns.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p>No campaigns yet. Wait for admin to assign campaigns to you.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="pb-3 font-medium text-foreground">Campaign</th>
                      <th className="pb-3 font-medium text-foreground">Category</th>
                      <th className="pb-3 font-medium text-foreground">Status</th>
                      <th className="pb-3 font-medium text-foreground">Budget</th>
                    </tr>
                  </thead>
                  <tbody>
                    {campaigns.slice(0, 5).map((campaign) => (
                      <tr key={campaign.id} className="border-b border-border" data-testid={`campaign-row-${campaign.id}`}>
                        <td className="py-4">{campaign.name}</td>
                        <td className="py-4 text-muted-foreground">{campaign.category}</td>
                        <td className="py-4">
                          <span className={
                            `px-3 py-1 text-xs font-medium rounded-full ${
                              campaign.status === 'active' ? 'bg-accent text-accent-foreground' :
                              campaign.status === 'completed' ? 'bg-muted text-muted-foreground' :
                              'bg-muted text-muted-foreground'
                            }`
                          }>
                            {campaign.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-4 font-mono text-foreground">
                          ${(campaign.content_budget + campaign.distribution_budget).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
