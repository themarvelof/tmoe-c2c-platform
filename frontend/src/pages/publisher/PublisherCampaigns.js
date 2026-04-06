import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import axios from '@/utils/api';
import { API } from '@/utils/api';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

export default function PublisherCampaigns() {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    try {
      const response = await axios.get(`${API}/publisher/campaigns`);
      setCampaigns(response.data);
    } catch (error) {
      toast.error('Failed to load campaigns');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-accent border-foreground';
      case 'completed': return 'bg-muted border-foreground';
      case 'paused': return 'bg-background border-foreground';
      default: return 'border-foreground';
    }
  };

  if (loading) {
    return (
      <DashboardLayout role="publisher">
        <div className="p-8">Loading...</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="publisher">
      <div className="p-8" data-testid="publisher-campaigns-page">
        <h1 className="font-heading text-4xl font-bold mb-8">My Campaigns</h1>

        {campaigns.length === 0 ? (
          <div className="border border-foreground p-12 text-center">
            <p className="text-muted-foreground">No campaigns assigned yet. Admin will assign campaigns to you.</p>
          </div>
        ) : (
          <div className="border border-foreground">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-foreground text-left bg-muted">
                    <th className="p-4 font-medium">Campaign Name</th>
                    <th className="p-4 font-medium">Category</th>
                    <th className="p-4 font-medium">Status</th>
                    <th className="p-4 font-medium">Budget</th>
                    <th className="p-4 font-medium">Start Date</th>
                    <th className="p-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {campaigns.map((campaign) => (
                    <tr
                      key={campaign.id}
                      className="border-b border-border hover:bg-muted/50"
                      data-testid={`campaign-${campaign.id}`}
                    >
                      <td className="p-4 font-medium">{campaign.name}</td>
                      <td className="p-4">{campaign.category}</td>
                      <td className="p-4">
                        <span className={`px-3 py-1 text-xs font-medium border ${getStatusColor(campaign.status)}`}>
                          {campaign.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="p-4 font-mono">
                        ${(campaign.content_budget + campaign.distribution_budget).toLocaleString()}
                      </td>
                      <td className="p-4">
                        {campaign.start_date ? new Date(campaign.start_date).toLocaleDateString() : '-'}
                      </td>
                      <td className="p-4">
                        <button
                          onClick={() => navigate(`/campaigns/${campaign.id}`)}
                          className="text-primary hover:underline"
                          data-testid={`view-campaign-${campaign.id}`}
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
