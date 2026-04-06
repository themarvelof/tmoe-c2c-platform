import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import axios from '@/utils/api';
import { API } from '@/utils/api';
import { toast } from 'sonner';
import { ChartLineUp, Briefcase, CurrencyDollar } from '@phosphor-icons/react';

export default function BrandDashboard() {
  const [campaigns, setCampaigns] = useState([]);
  const [briefs, setBriefs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [campaignsRes, briefsRes] = await Promise.all([
        axios.get(`${API}/brand/campaigns`),
        axios.get(`${API}/brand/briefs`)
      ]);
      setCampaigns(campaignsRes.data);
      setBriefs(briefsRes.data);
    } catch (error) {
      toast.error('Failed to load dashboard data');
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

  const activeCampaigns = campaigns.filter(c => c.status === 'active').length;
  const totalSpend = campaigns.reduce((sum, c) => sum + c.content_budget + c.distribution_budget, 0);
  const totalGMV = campaigns.reduce((sum, c) => sum + (c.performance_data?.gmv || 0), 0);

  return (
    <DashboardLayout role="brand">
      <div className="p-8" data-testid="brand-dashboard">
        <h1 className="font-heading text-4xl font-bold mb-8">Dashboard</h1>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="border border-foreground p-6" data-testid="stat-active-campaigns">
            <div className="flex items-center justify-between mb-4">
              <Briefcase size={32} weight="regular" />
              <div className="font-mono text-3xl font-bold">{activeCampaigns}</div>
            </div>
            <div className="text-sm font-medium">Active Campaigns</div>
          </div>

          <div className="border border-foreground p-6" data-testid="stat-total-spend">
            <div className="flex items-center justify-between mb-4">
              <CurrencyDollar size={32} weight="regular" />
              <div className="font-mono text-3xl font-bold">
                ${totalSpend.toLocaleString()}
              </div>
            </div>
            <div className="text-sm font-medium">Total Spend</div>
          </div>

          <div className="border border-foreground p-6" data-testid="stat-total-gmv">
            <div className="flex items-center justify-between mb-4">
              <ChartLineUp size={32} weight="regular" />
              <div className="font-mono text-3xl font-bold">
                ${totalGMV.toLocaleString()}
              </div>
            </div>
            <div className="text-sm font-medium">Total GMV</div>
          </div>
        </div>

        <div className="border border-foreground" data-testid="recent-campaigns-section">
          <div className="border-b border-foreground p-6">
            <h2 className="font-heading text-2xl font-bold">Recent Campaigns</h2>
          </div>
          <div className="p-6">
            {campaigns.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p>No campaigns yet. Submit a brief to get started.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-foreground text-left">
                      <th className="pb-3 font-medium">Campaign</th>
                      <th className="pb-3 font-medium">Category</th>
                      <th className="pb-3 font-medium">Status</th>
                      <th className="pb-3 font-medium">Budget</th>
                      <th className="pb-3 font-medium">Estimated ROI</th>
                    </tr>
                  </thead>
                  <tbody>
                    {campaigns.slice(0, 5).map((campaign) => (
                      <tr key={campaign.id} className="border-b border-border" data-testid={`campaign-row-${campaign.id}`}>
                        <td className="py-4">{campaign.name}</td>
                        <td className="py-4">{campaign.category}</td>
                        <td className="py-4">
                          <span className={
                            `px-3 py-1 text-xs font-medium border ${
                              campaign.status === 'active' ? 'bg-accent border-foreground' :
                              campaign.status === 'completed' ? 'bg-muted border-foreground' :
                              'border-foreground'
                            }`
                          }>
                            {campaign.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-4 font-mono">
                          ${(campaign.content_budget + campaign.distribution_budget).toLocaleString()}
                        </td>
                        <td className="py-4 font-mono">
                          {campaign.estimated_outcomes?.roi ? 
                            `${(campaign.estimated_outcomes.roi * 100).toFixed(1)}%` : '-'}
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
