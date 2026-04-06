import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import axios from '@/utils/api';
import { API } from '@/utils/api';
import { toast } from 'sonner';

export default function PublisherEarnings() {
  const [earnings, setEarnings] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEarnings();
  }, []);

  const fetchEarnings = async () => {
    try {
      const response = await axios.get(`${API}/publisher/earnings`);
      setEarnings(response.data);
    } catch (error) {
      toast.error('Failed to load earnings');
    } finally {
      setLoading(false);
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
      <DashboardLayout role="publisher">
        <div className="p-8">Loading...</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="publisher">
      <div className="p-8" data-testid="publisher-earnings-page">
        <h1 className="font-heading text-4xl font-bold mb-8">Earnings & Payouts</h1>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="border border-foreground p-6" data-testid="total-earnings-card">
            <div className="text-sm font-medium text-muted-foreground mb-2">Total Earnings</div>
            <div className="font-mono text-3xl font-bold">
              ${earnings?.total_earnings?.toLocaleString() || 0}
            </div>
          </div>

          <div className="border border-foreground p-6" data-testid="pending-payout-card">
            <div className="text-sm font-medium text-muted-foreground mb-2">Pending Payout</div>
            <div className="font-mono text-3xl font-bold">
              ${earnings?.pending_payout?.toLocaleString() || 0}
            </div>
          </div>

          <div className="border border-foreground p-6" data-testid="paid-out-card">
            <div className="text-sm font-medium text-muted-foreground mb-2">Paid Out</div>
            <div className="font-mono text-3xl font-bold">
              ${earnings?.paid_out?.toLocaleString() || 0}
            </div>
          </div>
        </div>

        <div className="border border-foreground">
          <div className="border-b border-foreground p-6">
            <h2 className="font-heading text-2xl font-bold">Settlement History</h2>
          </div>
          <div className="p-6">
            {!earnings?.settlements || earnings.settlements.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p>No settlements yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-foreground text-left bg-muted">
                      <th className="p-4 font-medium">Campaign ID</th>
                      <th className="p-4 font-medium">GMV</th>
                      <th className="p-4 font-medium">Rate Model</th>
                      <th className="p-4 font-medium">Amount Owed</th>
                      <th className="p-4 font-medium">Platform Fee</th>
                      <th className="p-4 font-medium">Status</th>
                      <th className="p-4 font-medium">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {earnings.settlements.map((settlement) => (
                      <tr
                        key={settlement.id}
                        className="border-b border-border"
                        data-testid={`settlement-${settlement.id}`}
                      >
                        <td className="p-4 font-mono text-sm">{settlement.campaign_id.slice(0, 8)}</td>
                        <td className="p-4 font-mono">${settlement.gmv.toLocaleString()}</td>
                        <td className="p-4">{settlement.rate_model}</td>
                        <td className="p-4 font-mono font-bold">${settlement.amount_owed.toLocaleString()}</td>
                        <td className="p-4 font-mono">${settlement.platform_fee.toLocaleString()}</td>
                        <td className="p-4">
                          <span className={`px-3 py-1 text-xs font-medium border ${getPayoutStatusColor(settlement.payout_status)}`}>
                            {settlement.payout_status.toUpperCase()}
                          </span>
                        </td>
                        <td className="p-4 text-sm">
                          {new Date(settlement.created_at).toLocaleDateString()}
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
