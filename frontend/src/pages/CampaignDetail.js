import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/hooks/useAuth';
import axios from '@/utils/api';
import { API } from '@/utils/api';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { ArrowLeft } from '@phosphor-icons/react';

export default function CampaignDetail() {
  const { campaignId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [campaign, setCampaign] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchCampaign = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/campaigns/${campaignId}`);
      setCampaign(response.data);
    } catch (error) {
      toast.error('Failed to load campaign details');
      navigate(-1);
    } finally {
      setLoading(false);
    }
  }, [campaignId, navigate]);

  useEffect(() => {
    fetchCampaign();
  }, [fetchCampaign]);

  if (loading) {
    return (
      <DashboardLayout role={user?.role}>
        <div className="p-8">Loading...</div>
      </DashboardLayout>
    );
  }

  if (!campaign) {
    return (
      <DashboardLayout role={user?.role}>
        <div className="p-8">Campaign not found</div>
      </DashboardLayout>
    );
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-accent border-foreground';
      case 'completed': return 'bg-muted border-foreground';
      case 'paused': return 'bg-background border-foreground';
      case 'draft': return 'bg-background border-foreground';
      default: return 'border-foreground';
    }
  };

  return (
    <DashboardLayout role={user?.role}>
      <div className="p-8" data-testid="campaign-detail-page">
        <Button
          variant="outline"
          onClick={() => navigate(-1)}
          className="mb-6 border-foreground hover:bg-muted"
          data-testid="back-button"
        >
          <ArrowLeft size={20} className="mr-2" />
          Back
        </Button>

        <div className="border border-foreground p-8 mb-6">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="font-heading text-4xl font-bold mb-2">{campaign.name}</h1>
              <p className="text-muted-foreground">{campaign.category}</p>
            </div>
            <span className={`px-4 py-2 text-sm font-medium border ${getStatusColor(campaign.status)}`}>
              {campaign.status.toUpperCase()}
            </span>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="font-heading text-xl font-bold mb-4">Campaign Details</h3>
              <div className="space-y-3">
                <div>
                  <div className="text-sm text-muted-foreground">Content Type</div>
                  <div className="font-medium">{campaign.content_type}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Target Markets</div>
                  <div className="font-medium">{campaign.target_markets.join(', ')}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Start Date</div>
                  <div className="font-medium">
                    {campaign.start_date ? new Date(campaign.start_date).toLocaleDateString() : 'Not set'}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">End Date</div>
                  <div className="font-medium">
                    {campaign.end_date ? new Date(campaign.end_date).toLocaleDateString() : 'Not set'}
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-heading text-xl font-bold mb-4">Budget Breakdown</h3>
              <div className="space-y-3">
                <div>
                  <div className="text-sm text-muted-foreground">Content Budget</div>
                  <div className="font-mono font-medium">${campaign.content_budget.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Distribution Budget</div>
                  <div className="font-mono font-medium">${campaign.distribution_budget.toLocaleString()}</div>
                </div>
                <div className="pt-3 border-t border-border">
                  <div className="text-sm text-muted-foreground">Total Budget</div>
                  <div className="font-mono font-bold text-2xl">
                    ${(campaign.content_budget + campaign.distribution_budget).toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {campaign.estimated_outcomes && (
          <div className="border border-foreground p-8 mb-6" data-testid="estimated-outcomes-section">
            <h2 className="font-heading text-2xl font-bold mb-6">Estimated Outcomes</h2>
            <div className="grid md:grid-cols-5 gap-6">
              <div>
                <div className="text-sm text-muted-foreground mb-2">Traffic</div>
                <div className="font-mono text-2xl font-bold">{campaign.estimated_outcomes.traffic.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-2">Clicks</div>
                <div className="font-mono text-2xl font-bold">{campaign.estimated_outcomes.clicks.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-2">Orders</div>
                <div className="font-mono text-2xl font-bold">{campaign.estimated_outcomes.orders.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-2">GMV</div>
                <div className="font-mono text-2xl font-bold">${campaign.estimated_outcomes.gmv.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-2">ROI</div>
                <div className="font-mono text-2xl font-bold">{(campaign.estimated_outcomes.roi * 100).toFixed(1)}%</div>
              </div>
            </div>
          </div>
        )}

        {campaign.performance_data && (
          <div className="border border-foreground p-8 mb-6" data-testid="performance-data-section">
            <h2 className="font-heading text-2xl font-bold mb-6">Actual Performance</h2>
            <div className="grid md:grid-cols-4 gap-6">
              <div>
                <div className="text-sm text-muted-foreground mb-2">Traffic</div>
                <div className="font-mono text-2xl font-bold">
                  {campaign.performance_data.traffic?.toLocaleString() || 0}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-2">Clicks</div>
                <div className="font-mono text-2xl font-bold">
                  {campaign.performance_data.clicks?.toLocaleString() || 0}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-2">Orders</div>
                <div className="font-mono text-2xl font-bold">
                  {campaign.performance_data.orders?.toLocaleString() || 0}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-2">GMV</div>
                <div className="font-mono text-2xl font-bold">
                  ${campaign.performance_data.gmv?.toLocaleString() || 0}
                </div>
              </div>
            </div>
          </div>
        )}

        {campaign.commerce_links.length > 0 && (
          <div className="border border-foreground p-8">
            <h2 className="font-heading text-2xl font-bold mb-4">Commerce Links</h2>
            <div className="space-y-2">
              {campaign.commerce_links.map((link, idx) => (
                <a
                  key={idx}
                  href={link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-primary hover:underline"
                >
                  {link}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
