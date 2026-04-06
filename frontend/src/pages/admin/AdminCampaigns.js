import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import axios from '@/utils/api';
import { API } from '@/utils/api';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { Plus } from '@phosphor-icons/react';

export default function AdminCampaigns() {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState([]);
  const [users, setUsers] = useState([]);
  const [benchmarks, setBenchmarks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [campaignForm, setCampaignForm] = useState({
    name: '',
    category: '',
    target_markets: '',
    assigned_publishers: '',
    assigned_brand: '',
    content_type: '',
    content_budget: '',
    distribution_budget: '',
    commerce_links: '',
    start_date: '',
    end_date: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [campaignsRes, usersRes, benchmarksRes] = await Promise.all([
        axios.get(`${API}/campaigns`),
        axios.get(`${API}/admin/users`),
        axios.get(`${API}/roi-benchmarks`)
      ]);
      setCampaigns(campaignsRes.data);
      setUsers(usersRes.data);
      setBenchmarks(benchmarksRes.data);
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCampaign = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const payload = {
        ...campaignForm,
        target_markets: campaignForm.target_markets.split(',').map(c => c.trim()),
        assigned_publishers: campaignForm.assigned_publishers.split(',').map(c => c.trim()).filter(c => c),
        commerce_links: campaignForm.commerce_links.split(',').map(c => c.trim()).filter(c => c),
        content_budget: parseFloat(campaignForm.content_budget),
        distribution_budget: parseFloat(campaignForm.distribution_budget)
      };

      await axios.post(`${API}/campaigns`, payload);
      toast.success('Campaign created successfully!');
      setShowCreateDialog(false);
      setCampaignForm({
        name: '',
        category: '',
        target_markets: '',
        assigned_publishers: '',
        assigned_brand: '',
        content_type: '',
        content_budget: '',
        distribution_budget: '',
        commerce_links: '',
        start_date: '',
        end_date: ''
      });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create campaign');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (campaignId, newStatus) => {
    try {
      await axios.put(`${API}/campaigns/${campaignId}`, { status: newStatus });
      toast.success('Campaign status updated');
      fetchData();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-accent border-foreground';
      case 'completed': return 'bg-muted border-foreground';
      case 'paused': return 'bg-background border-foreground';
      case 'draft': return 'bg-background border-foreground';
      default: return 'border-foreground';
    }
  };

  const brands = users.filter(u => u.role === 'brand' && u.status === 'approved');

  if (loading) {
    return (
      <DashboardLayout role="admin">
        <div className="p-8">Loading...</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="admin">
      <div className="p-8" data-testid="admin-campaigns-page">
        <div className="flex justify-between items-center mb-8">
          <h1 className="font-heading text-4xl font-bold">Campaign Management</h1>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90" data-testid="create-campaign-button">
                <Plus size={20} className="mr-2" weight="bold" />
                Create Campaign
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Campaign</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateCampaign} className="space-y-4" data-testid="campaign-form">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Campaign Name</Label>
                    <Input
                      id="name"
                      value={campaignForm.name}
                      onChange={(e) => setCampaignForm({ ...campaignForm, name: e.target.value })}
                      required
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="category">Category</Label>
                    <Select
                      value={campaignForm.category}
                      onValueChange={(value) => setCampaignForm({ ...campaignForm, category: value })}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {benchmarks.map(b => (
                          <SelectItem key={b.category} value={b.category}>{b.category}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="assigned_brand">Assigned Brand</Label>
                  <Select
                    value={campaignForm.assigned_brand}
                    onValueChange={(value) => setCampaignForm({ ...campaignForm, assigned_brand: value })}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select brand" />
                    </SelectTrigger>
                    <SelectContent>
                      {brands.map(b => (
                        <SelectItem key={b.id} value={b.id}>{b.email} - {b.company_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="target_markets">Target Markets (comma-separated)</Label>
                  <Input
                    id="target_markets"
                    value={campaignForm.target_markets}
                    onChange={(e) => setCampaignForm({ ...campaignForm, target_markets: e.target.value })}
                    placeholder="US, UK, India"
                    required
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="assigned_publishers">Assigned Publisher IDs (comma-separated)</Label>
                  <Input
                    id="assigned_publishers"
                    value={campaignForm.assigned_publishers}
                    onChange={(e) => setCampaignForm({ ...campaignForm, assigned_publishers: e.target.value })}
                    placeholder="Publisher user IDs"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="content_type">Content Type</Label>
                  <Input
                    id="content_type"
                    value={campaignForm.content_type}
                    onChange={(e) => setCampaignForm({ ...campaignForm, content_type: e.target.value })}
                    placeholder="Blog Post, Video, Sponsored Article"
                    required
                    className="mt-1"
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="content_budget">Content Budget ($)</Label>
                    <Input
                      id="content_budget"
                      type="number"
                      value={campaignForm.content_budget}
                      onChange={(e) => setCampaignForm({ ...campaignForm, content_budget: e.target.value })}
                      required
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="distribution_budget">Distribution Budget ($)</Label>
                    <Input
                      id="distribution_budget"
                      type="number"
                      value={campaignForm.distribution_budget}
                      onChange={(e) => setCampaignForm({ ...campaignForm, distribution_budget: e.target.value })}
                      required
                      className="mt-1"
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="start_date">Start Date</Label>
                    <Input
                      id="start_date"
                      type="date"
                      value={campaignForm.start_date}
                      onChange={(e) => setCampaignForm({ ...campaignForm, start_date: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="end_date">End Date</Label>
                    <Input
                      id="end_date"
                      type="date"
                      value={campaignForm.end_date}
                      onChange={(e) => setCampaignForm({ ...campaignForm, end_date: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="commerce_links">Commerce Links (comma-separated)</Label>
                  <Input
                    id="commerce_links"
                    value={campaignForm.commerce_links}
                    onChange={(e) => setCampaignForm({ ...campaignForm, commerce_links: e.target.value })}
                    className="mt-1"
                  />
                </div>

                <div className="flex gap-4">
                  <Button type="submit" disabled={submitting} className="bg-primary text-primary-foreground">
                    {submitting ? 'Creating...' : 'Create Campaign'}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)}>
                    Cancel
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {campaigns.length === 0 ? (
          <div className="border border-foreground p-12 text-center">
            <p className="text-muted-foreground">No campaigns yet. Create your first campaign.</p>
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
                    <th className="p-4 font-medium">Est. ROI</th>
                    <th className="p-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {campaigns.map((campaign) => (
                    <tr key={campaign.id} className="border-b border-border hover:bg-muted/50" data-testid={`campaign-${campaign.id}`}>
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
                      <td className="p-4 font-mono">
                        {campaign.estimated_outcomes?.roi ? 
                          `${(campaign.estimated_outcomes.roi * 100).toFixed(1)}%` : '-'}
                      </td>
                      <td className="p-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => navigate(`/campaigns/${campaign.id}`)}
                            className="text-primary hover:underline text-sm"
                          >
                            View
                          </button>
                          {campaign.status === 'draft' && (
                            <button
                              onClick={() => handleUpdateStatus(campaign.id, 'active')}
                              className="text-accent hover:underline text-sm"
                            >
                              Activate
                            </button>
                          )}
                          {campaign.status === 'active' && (
                            <button
                              onClick={() => handleUpdateStatus(campaign.id, 'paused')}
                              className="text-muted-foreground hover:underline text-sm"
                            >
                              Pause
                            </button>
                          )}
                        </div>
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
