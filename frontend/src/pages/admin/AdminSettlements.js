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
import { Plus } from '@phosphor-icons/react';

export default function AdminSettlements() {
  const [settlements, setSettlements] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [publishers, setPublishers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [settlementForm, setSettlementForm] = useState({
    campaign_id: '',
    publisher_id: '',
    gmv: '',
    rate_model: '',
    amount_owed: '',
    platform_fee: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [settlementsRes, campaignsRes, usersRes] = await Promise.all([
        axios.get(`${API}/settlements`),
        axios.get(`${API}/campaigns`),
        axios.get(`${API}/admin/users`)
      ]);
      setSettlements(settlementsRes.data);
      setCampaigns(campaignsRes.data.filter(c => c.status === 'completed'));
      setPublishers(usersRes.data.filter(u => u.role === 'publisher' && u.status === 'approved'));
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSettlement = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const payload = {
        campaign_id: settlementForm.campaign_id,
        publisher_id: settlementForm.publisher_id,
        gmv: parseFloat(settlementForm.gmv),
        rate_model: settlementForm.rate_model,
        amount_owed: parseFloat(settlementForm.amount_owed),
        platform_fee: parseFloat(settlementForm.platform_fee)
      };

      await axios.post(`${API}/settlements`, payload);
      toast.success('Settlement created successfully');
      setShowDialog(false);
      setSettlementForm({
        campaign_id: '',
        publisher_id: '',
        gmv: '',
        rate_model: '',
        amount_owed: '',
        platform_fee: ''
      });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create settlement');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdatePayoutStatus = async (settlementId, newStatus) => {
    try {
      await axios.put(`${API}/settlements/${settlementId}`, { payout_status: newStatus });
      toast.success('Payout status updated');
      fetchData();
    } catch (error) {
      toast.error('Failed to update payout status');
    }
  };

  const getPayoutStatusColor = (status) => {
    switch (status) {
      case 'paid': return 'bg-accent border-foreground';
      case 'approved': return 'bg-primary/20 border-foreground';
      default: return 'bg-muted border-foreground';
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
      <div className="p-8" data-testid="admin-settlements-page">
        <div className="flex justify-between items-center mb-8">
          <h1 className="font-heading text-4xl font-bold">Settlement & Payouts</h1>
          <Dialog open={showDialog} onOpenChange={setShowDialog}>
            <DialogTrigger asChild>
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90" data-testid="create-settlement-button">
                <Plus size={20} className="mr-2" weight="bold" />
                Create Settlement
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Settlement Record</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateSettlement} className="space-y-4" data-testid="settlement-form">
                <div>
                  <Label htmlFor="campaign_id">Campaign</Label>
                  <Select
                    value={settlementForm.campaign_id}
                    onValueChange={(value) => setSettlementForm({ ...settlementForm, campaign_id: value })}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select completed campaign" />
                    </SelectTrigger>
                    <SelectContent>
                      {campaigns.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="publisher_id">Publisher</Label>
                  <Select
                    value={settlementForm.publisher_id}
                    onValueChange={(value) => setSettlementForm({ ...settlementForm, publisher_id: value })}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select publisher" />
                    </SelectTrigger>
                    <SelectContent>
                      {publishers.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.email} - {p.company_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="gmv">GMV ($)</Label>
                  <Input
                    id="gmv"
                    type="number"
                    step="0.01"
                    value={settlementForm.gmv}
                    onChange={(e) => setSettlementForm({ ...settlementForm, gmv: e.target.value })}
                    required
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="rate_model">Rate Model</Label>
                  <Input
                    id="rate_model"
                    value={settlementForm.rate_model}
                    onChange={(e) => setSettlementForm({ ...settlementForm, rate_model: e.target.value })}
                    placeholder="CPA, Revenue Share, Fixed"
                    required
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="amount_owed">Amount Owed to Publisher ($)</Label>
                  <Input
                    id="amount_owed"
                    type="number"
                    step="0.01"
                    value={settlementForm.amount_owed}
                    onChange={(e) => setSettlementForm({ ...settlementForm, amount_owed: e.target.value })}
                    required
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="platform_fee">Platform Fee ($)</Label>
                  <Input
                    id="platform_fee"
                    type="number"
                    step="0.01"
                    value={settlementForm.platform_fee}
                    onChange={(e) => setSettlementForm({ ...settlementForm, platform_fee: e.target.value })}
                    required
                    className="mt-1"
                  />
                </div>

                <div className="flex gap-4">
                  <Button type="submit" disabled={submitting} className="bg-primary text-primary-foreground">
                    {submitting ? 'Creating...' : 'Create Settlement'}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>
                    Cancel
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {settlements.length === 0 ? (
          <div className="border border-foreground p-12 text-center">
            <p className="text-muted-foreground">No settlements yet.</p>
          </div>
        ) : (
          <div className="border border-foreground">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-foreground text-left bg-muted">
                    <th className="p-4 font-medium">Campaign ID</th>
                    <th className="p-4 font-medium">Publisher ID</th>
                    <th className="p-4 font-medium">GMV</th>
                    <th className="p-4 font-medium">Rate Model</th>
                    <th className="p-4 font-medium">Amount Owed</th>
                    <th className="p-4 font-medium">Platform Fee</th>
                    <th className="p-4 font-medium">Status</th>
                    <th className="p-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {settlements.map((settlement) => (
                    <tr key={settlement.id} className="border-b border-border hover:bg-muted/50" data-testid={`settlement-${settlement.id}`}>
                      <td className="p-4 font-mono text-sm">{settlement.campaign_id.slice(0, 8)}</td>
                      <td className="p-4 font-mono text-sm">{settlement.publisher_id.slice(0, 8)}</td>
                      <td className="p-4 font-mono">${settlement.gmv.toLocaleString()}</td>
                      <td className="p-4">{settlement.rate_model}</td>
                      <td className="p-4 font-mono font-bold">${settlement.amount_owed.toLocaleString()}</td>
                      <td className="p-4 font-mono">${settlement.platform_fee.toLocaleString()}</td>
                      <td className="p-4">
                        <span className={`px-3 py-1 text-xs font-medium border ${getPayoutStatusColor(settlement.payout_status)}`}>
                          {settlement.payout_status.toUpperCase()}
                        </span>
                      </td>
                      <td className="p-4">
                        {settlement.payout_status === 'pending' && (
                          <Button
                            size="sm"
                            onClick={() => handleUpdatePayoutStatus(settlement.id, 'approved')}
                            className="bg-primary text-primary-foreground"
                          >
                            Approve
                          </Button>
                        )}
                        {settlement.payout_status === 'approved' && (
                          <Button
                            size="sm"
                            onClick={() => handleUpdatePayoutStatus(settlement.id, 'paid')}
                            className="bg-accent text-foreground"
                          >
                            Mark Paid
                          </Button>
                        )}
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
