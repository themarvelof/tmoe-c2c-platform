import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import axios from '@/utils/api';
import { API } from '@/utils/api';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Plus, Pencil } from '@phosphor-icons/react';

export default function AdminBenchmarks() {
  const [benchmarks, setBenchmarks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingBenchmark, setEditingBenchmark] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [benchmarkForm, setBenchmarkForm] = useState({
    category: '',
    cvr: '',
    aov: '',
    traffic_multiplier: '',
    ctr: ''
  });

  useEffect(() => {
    fetchBenchmarks();
  }, []);

  const fetchBenchmarks = async () => {
    try {
      const response = await axios.get(`${API}/roi-benchmarks`);
      setBenchmarks(response.data);
    } catch (error) {
      toast.error('Failed to load benchmarks');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const payload = {
        category: benchmarkForm.category,
        cvr: parseFloat(benchmarkForm.cvr),
        aov: parseFloat(benchmarkForm.aov),
        traffic_multiplier: parseFloat(benchmarkForm.traffic_multiplier),
        ctr: parseFloat(benchmarkForm.ctr)
      };

      await axios.post(`${API}/roi-benchmarks`, payload);
      toast.success(editingBenchmark ? 'Benchmark updated successfully' : 'Benchmark created successfully');
      setShowDialog(false);
      setEditingBenchmark(null);
      setBenchmarkForm({
        category: '',
        cvr: '',
        aov: '',
        traffic_multiplier: '',
        ctr: ''
      });
      fetchBenchmarks();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save benchmark');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (benchmark) => {
    setEditingBenchmark(benchmark);
    setBenchmarkForm({
      category: benchmark.category,
      cvr: benchmark.cvr.toString(),
      aov: benchmark.aov.toString(),
      traffic_multiplier: benchmark.traffic_multiplier.toString(),
      ctr: benchmark.ctr.toString()
    });
    setShowDialog(true);
  };

  const handleCloseDialog = () => {
    setShowDialog(false);
    setEditingBenchmark(null);
    setBenchmarkForm({
      category: '',
      cvr: '',
      aov: '',
      traffic_multiplier: '',
      ctr: ''
    });
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
      <div className="p-8" data-testid="admin-benchmarks-page">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="font-heading text-4xl font-bold">ROI Benchmarks</h1>
            <p className="text-muted-foreground mt-2">Configure benchmark values for ROI estimation</p>
          </div>
          <Dialog open={showDialog} onOpenChange={setShowDialog}>
            <DialogTrigger asChild>
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90" data-testid="add-benchmark-button">
                <Plus size={20} className="mr-2" weight="bold" />
                Add Benchmark
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingBenchmark ? 'Edit Benchmark' : 'Add New Benchmark'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4" data-testid="benchmark-form">
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Input
                    id="category"
                    value={benchmarkForm.category}
                    onChange={(e) => setBenchmarkForm({ ...benchmarkForm, category: e.target.value })}
                    required
                    disabled={editingBenchmark}
                    className="mt-1"
                    placeholder="Technology, Fashion, etc."
                  />
                </div>

                <div>
                  <Label htmlFor="cvr">Conversion Rate (CVR) - decimal</Label>
                  <Input
                    id="cvr"
                    type="number"
                    step="0.001"
                    value={benchmarkForm.cvr}
                    onChange={(e) => setBenchmarkForm({ ...benchmarkForm, cvr: e.target.value })}
                    required
                    className="mt-1"
                    placeholder="0.02 (2%)"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Example: 0.02 = 2%</p>
                </div>

                <div>
                  <Label htmlFor="aov">Average Order Value (AOV) - $</Label>
                  <Input
                    id="aov"
                    type="number"
                    step="0.01"
                    value={benchmarkForm.aov}
                    onChange={(e) => setBenchmarkForm({ ...benchmarkForm, aov: e.target.value })}
                    required
                    className="mt-1"
                    placeholder="150.00"
                  />
                </div>

                <div>
                  <Label htmlFor="traffic_multiplier">Traffic Multiplier</Label>
                  <Input
                    id="traffic_multiplier"
                    type="number"
                    step="0.1"
                    value={benchmarkForm.traffic_multiplier}
                    onChange={(e) => setBenchmarkForm({ ...benchmarkForm, traffic_multiplier: e.target.value })}
                    required
                    className="mt-1"
                    placeholder="10"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Traffic generated per dollar spent</p>
                </div>

                <div>
                  <Label htmlFor="ctr">Click-Through Rate (CTR) - decimal</Label>
                  <Input
                    id="ctr"
                    type="number"
                    step="0.001"
                    value={benchmarkForm.ctr}
                    onChange={(e) => setBenchmarkForm({ ...benchmarkForm, ctr: e.target.value })}
                    required
                    className="mt-1"
                    placeholder="0.05 (5%)"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Example: 0.05 = 5%</p>
                </div>

                <div className="flex gap-4">
                  <Button type="submit" disabled={submitting} className="bg-primary text-primary-foreground">
                    {submitting ? 'Saving...' : editingBenchmark ? 'Update' : 'Create'}
                  </Button>
                  <Button type="button" variant="outline" onClick={handleCloseDialog}>
                    Cancel
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {benchmarks.length === 0 ? (
          <div className="border border-foreground p-12 text-center">
            <p className="text-muted-foreground">No benchmarks configured yet.</p>
          </div>
        ) : (
          <div className="border border-foreground">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-foreground text-left bg-muted">
                    <th className="p-4 font-medium">Category</th>
                    <th className="p-4 font-medium">CVR</th>
                    <th className="p-4 font-medium">AOV</th>
                    <th className="p-4 font-medium">Traffic Multiplier</th>
                    <th className="p-4 font-medium">CTR</th>
                    <th className="p-4 font-medium">Last Updated</th>
                    <th className="p-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {benchmarks.map((benchmark) => (
                    <tr key={benchmark.id} className="border-b border-border hover:bg-muted/50" data-testid={`benchmark-${benchmark.id}`}>
                      <td className="p-4 font-medium">{benchmark.category}</td>
                      <td className="p-4 font-mono">{(benchmark.cvr * 100).toFixed(1)}%</td>
                      <td className="p-4 font-mono">${benchmark.aov.toFixed(2)}</td>
                      <td className="p-4 font-mono">{benchmark.traffic_multiplier}</td>
                      <td className="p-4 font-mono">{(benchmark.ctr * 100).toFixed(1)}%</td>
                      <td className="p-4 text-sm">
                        {new Date(benchmark.updated_at).toLocaleDateString()}
                      </td>
                      <td className="p-4">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(benchmark)}
                          className="border-foreground hover:bg-muted"
                          data-testid={`edit-benchmark-${benchmark.id}`}
                        >
                          <Pencil size={16} weight="regular" className="mr-1" />
                          Edit
                        </Button>
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
