import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import axios from '@/utils/api';
import { API } from '@/utils/api';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { Plus } from '@phosphor-icons/react';

export default function BrandCampaigns() {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState([]);
  const [briefs, setBriefs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showBriefDialog, setShowBriefDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [briefForm, setBriefForm] = useState({
    name: '',
    category: '',
    target_markets: '',
    product_skus: '',
    budget_range: '',
    gmv_target: '',
    roi_target: '',
    commerce_links: ''
  });

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
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitBrief = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const payload = {
        ...briefForm,
        target_markets: briefForm.target_markets.split(',').map(c => c.trim()),
        product_skus: briefForm.product_skus.split(',').map(c => c.trim()),
        commerce_links: briefForm.commerce_links.split(',').map(c => c.trim()).filter(c => c),
        gmv_target: briefForm.gmv_target ? parseFloat(briefForm.gmv_target) : null,
        roi_target: briefForm.roi_target ? parseFloat(briefForm.roi_target) : null
      };

      await axios.post(`${API}/brand/briefs`, payload);
      toast.success('Campaign brief submitted successfully! Awaiting admin review.');
      setShowBriefDialog(false);
      setBriefForm({
        name: '',
        category: '',
        target_markets: '',
        product_skus: '',
        budget_range: '',
        gmv_target: '',
        roi_target: '',
        commerce_links: ''
      });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to submit brief');
    } finally {
      setSubmitting(false);
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
      <DashboardLayout role="brand">
        <div className="p-8">Loading...</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="brand">
      <div className="p-8" data-testid="brand-campaigns-page">
        <div className="flex justify-between items-center mb-8">
          <h1 className="font-heading text-4xl font-bold">Campaigns</h1>
          <Dialog open={showBriefDialog} onOpenChange={setShowBriefDialog}>
            <DialogTrigger asChild>
              <Button
                className="bg-primary text-primary-foreground hover:bg-primary/90"
                data-testid="submit-brief-button"
              >
                <Plus size={20} className="mr-2" weight="bold" />
                Submit Campaign Brief
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Submit Campaign Brief</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmitBrief} className="space-y-4" data-testid="brief-form">
                <div>
                  <Label htmlFor="name">Campaign Name</Label>
                  <Input
                    id="name"
                    value={briefForm.name}
                    onChange={(e) => setBriefForm({ ...briefForm, name: e.target.value })}
                    required
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Input
                    id="category"
                    value={briefForm.category}
                    onChange={(e) => setBriefForm({ ...briefForm, category: e.target.value })}
                    required
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="target_markets">Target Markets (comma-separated)</Label>
                  <Input
                    id="target_markets"
                    value={briefForm.target_markets}
                    onChange={(e) => setBriefForm({ ...briefForm, target_markets: e.target.value })}
                    placeholder="US, UK, India"
                    required
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="product_skus">Product SKUs (comma-separated)</Label>
                  <Input
                    id="product_skus"
                    value={briefForm.product_skus}
                    onChange={(e) => setBriefForm({ ...briefForm, product_skus: e.target.value })}
                    required
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="budget_range">Budget Range</Label>
                  <Input
                    id="budget_range"
                    value={briefForm.budget_range}
                    onChange={(e) => setBriefForm({ ...briefForm, budget_range: e.target.value })}
                    placeholder="$5,000 - $10,000"
                    required
                    className="mt-1"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="gmv_target">GMV Target ($)</Label>
                    <Input
                      id="gmv_target"
                      type="number"
                      value={briefForm.gmv_target}
                      onChange={(e) => setBriefForm({ ...briefForm, gmv_target: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="roi_target">ROI Target (%)</Label>
                    <Input
                      id="roi_target"
                      type="number"
                      step="0.01"
                      value={briefForm.roi_target}
                      onChange={(e) => setBriefForm({ ...briefForm, roi_target: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="commerce_links">Commerce Links (comma-separated)</Label>
                  <Textarea
                    id="commerce_links"
                    value={briefForm.commerce_links}
                    onChange={(e) => setBriefForm({ ...briefForm, commerce_links: e.target.value })}
                    rows={3}
                    className="mt-1"
                  />
                </div>
                <div className="flex gap-4">
                  <Button type="submit" disabled={submitting} className="bg-primary text-primary-foreground">
                    {submitting ? 'Submitting...' : 'Submit Brief'}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setShowBriefDialog(false)}>
                    Cancel
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {campaigns.length === 0 ? (
          <div className="border border-foreground p-12 text-center">
            <p className="text-muted-foreground mb-4">No campaigns yet.</p>
            <Button onClick={() => setShowBriefDialog(true)} className="bg-primary text-primary-foreground">
              Submit Your First Brief
            </Button>
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
                    <tr key={campaign.id} className="border-b border-border hover:bg-muted/50">
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
                        <button
                          onClick={() => navigate(`/campaigns/${campaign.id}`)}
                          className="text-primary hover:underline"
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
