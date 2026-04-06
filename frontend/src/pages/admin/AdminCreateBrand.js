import { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import axios from '@/utils/api';
import { API } from '@/utils/api';
import { Plus, Copy } from '@phosphor-icons/react';

export default function AdminCreateBrand() {
  const [showDialog, setShowDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    company_name: '',
    website: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const response = await axios.post(`${API}/admin/users/create-brand`, formData);
      toast.success('Brand account created successfully!');
      setCreatedCredentials(response.data.credentials);
      setFormData({
        email: '',
        password: '',
        company_name: '',
        website: ''
      });
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create brand account');
    } finally {
      setSubmitting(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  const handleCloseDialog = () => {
    setShowDialog(false);
    setCreatedCredentials(null);
  };

  return (
    <DashboardLayout role="admin">
      <div className="p-8 bg-muted min-h-screen" data-testid="admin-create-brand-page">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="font-heading text-4xl font-bold text-foreground">Create Brand Account</h1>
            <p className="text-muted-foreground mt-2">Manually create brand accounts with credentials</p>
          </div>
          <Dialog open={showDialog} onOpenChange={setShowDialog}>
            <DialogTrigger asChild>
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90" data-testid="create-brand-button">
                <Plus size={20} className="mr-2" weight="bold" />
                Create Brand Account
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Brand Account</DialogTitle>
              </DialogHeader>

              {!createdCredentials ? (
                <form onSubmit={handleSubmit} className="space-y-4" data-testid="create-brand-form">
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                      className="mt-1"
                      placeholder="brand@example.com"
                    />
                  </div>

                  <div>
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="text"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      required
                      className="mt-1"
                      placeholder="Create a secure password"
                    />
                    <p className="text-xs text-muted-foreground mt-1">This password will be shown once after creation</p>
                  </div>

                  <div>
                    <Label htmlFor="company_name">Company Name</Label>
                    <Input
                      id="company_name"
                      value={formData.company_name}
                      onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                      className="mt-1"
                      placeholder="Brand Company Inc."
                    />
                  </div>

                  <div>
                    <Label htmlFor="website">Website (optional)</Label>
                    <Input
                      id="website"
                      type="url"
                      value={formData.website}
                      onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                      className="mt-1"
                      placeholder="https://brand.com"
                    />
                  </div>

                  <div className="flex gap-4">
                    <Button type="submit" disabled={submitting} className="bg-primary text-primary-foreground">
                      {submitting ? 'Creating...' : 'Create Account'}
                    </Button>
                    <Button type="button" variant="outline" onClick={handleCloseDialog}>
                      Cancel
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="space-y-4" data-testid="credentials-display">
                  <div className="bg-accent/10 border border-primary rounded-lg p-4">
                    <p className="font-semibold text-foreground mb-4">✓ Brand Account Created Successfully!</p>
                    <p className="text-sm text-muted-foreground mb-4">Share these credentials with the brand. They won't be shown again.</p>
                    
                    <div className="space-y-3">
                      <div className="bg-white rounded p-3">
                        <div className="text-xs text-muted-foreground mb-1">Email</div>
                        <div className="flex items-center justify-between">
                          <code className="text-sm font-mono">{createdCredentials.email}</code>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => copyToClipboard(createdCredentials.email)}
                          >
                            <Copy size={16} />
                          </Button>
                        </div>
                      </div>

                      <div className="bg-white rounded p-3">
                        <div className="text-xs text-muted-foreground mb-1">Password</div>
                        <div className="flex items-center justify-between">
                          <code className="text-sm font-mono">{createdCredentials.password}</code>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => copyToClipboard(createdCredentials.password)}
                          >
                            <Copy size={16} />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <Button onClick={handleCloseDialog} className="w-full bg-primary text-primary-foreground">
                    Done
                  </Button>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>

        <div className="bg-white rounded-lg border p-8">
          <h2 className="font-heading text-2xl font-bold mb-4 text-foreground">How It Works</h2>
          <div className="space-y-4 text-muted-foreground">
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">1</div>
              <div>
                <p className="font-semibold text-foreground">Create Account</p>
                <p className="text-sm">Click the button above to create a new brand account with email and password.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">2</div>
              <div>
                <p className="font-semibold text-foreground">Copy Credentials</p>
                <p className="text-sm">After creation, copy the email and password to share with the brand.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">3</div>
              <div>
                <p className="font-semibold text-foreground">Brand Access</p>
                <p className="text-sm">The brand can now login immediately - no approval needed!</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
