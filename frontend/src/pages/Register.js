import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';

export default function Register() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    role: '',
    company_name: '',
    website: '',
    industry: '',
    description: '',
    target_categories: '',
    target_markets: '',
    commerce_links: '',
    name: '',
    categories: '',
    monthly_sessions: 0,
    monthly_pageviews: 0
  });
  const [loading, setLoading] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        email: formData.email,
        role: formData.role,
        website: formData.website
      };

      if (formData.role === 'brand') {
        payload.company_name = formData.company_name;
        payload.industry = formData.industry;
        payload.description = formData.description;
        payload.target_categories = formData.target_categories.split(',').map((c) => c.trim()).filter(Boolean);
        payload.target_markets = formData.target_markets.split(',').map((m) => m.trim()).filter(Boolean);
        payload.commerce_links = formData.commerce_links.split(',').map((l) => l.trim()).filter(Boolean);
      }

      if (formData.role === 'publisher') {
        payload.name = formData.name;
        payload.description = formData.description;
        payload.categories = formData.categories.split(',').map((c) => c.trim()).filter(Boolean);
        payload.monthly_sessions = parseInt(formData.monthly_sessions, 10) || 0;
        payload.monthly_pageviews = parseInt(formData.monthly_pageviews, 10) || 0;
      }

      await register(payload);
      toast.success('Registration successful! Awaiting admin approval.');
      setShowSuccessPopup(true);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <Dialog
        open={showSuccessPopup}
        onOpenChange={(open) => {
          setShowSuccessPopup(open);
          if (!open) {
            navigate('/login');
          }
        }}
      >
        <DialogContent className="max-w-md text-center">
          <DialogHeader>
            <DialogTitle className="text-2xl">Successfully Registered</DialogTitle>
            <DialogDescription>
              Your account has been created. We have triggered a confirmation email to your registered address.
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>

      {/* Left - Form */}
      <div className="flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <h1 className="font-heading text-4xl font-bold mb-2">Get Started</h1>
            <p className="text-muted-foreground">Create your TMOE account</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6" data-testid="register-form">
            <div>
              <Label htmlFor="role">I am a</Label>
              <Select
                value={formData.role}
                onValueChange={(value) => setFormData({ ...formData, role: value })}
                required
              >
                <SelectTrigger className="mt-1 border-foreground" data-testid="role-select">
                  <SelectValue placeholder="Select your role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="publisher" data-testid="role-publisher">Publisher</SelectItem>
                  <SelectItem value="brand" data-testid="role-brand">Brand</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                data-testid="register-email-input"
                className="mt-1 border-foreground"
              />
            </div>

            <div>
              <Label htmlFor="company_name">Company Name</Label>
              <Input
                id="company_name"
                value={formData.company_name}
                onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                required={formData.role === 'brand'}
                data-testid="register-company-input"
                className="mt-1 border-foreground"
              />
            </div>

            <div>
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                type="url"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                required={formData.role === 'brand' || formData.role === 'publisher'}
                placeholder="https://"
                data-testid="register-website-input"
                className="mt-1 border-foreground"
              />
            </div>

            {formData.role === 'brand' && (
              <>
                <div>
                  <Label htmlFor="industry">Industry</Label>
                  <Input
                    id="industry"
                    value={formData.industry}
                    onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                    required
                    className="mt-1 border-foreground"
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    required
                    rows={4}
                    className="mt-1 border-foreground"
                  />
                </div>

                <div>
                  <Label htmlFor="target_categories">Target Categories (comma-separated)</Label>
                  <Input
                    id="target_categories"
                    value={formData.target_categories}
                    onChange={(e) => setFormData({ ...formData, target_categories: e.target.value })}
                    placeholder="Technology, Fashion, Lifestyle"
                    required
                    className="mt-1 border-foreground"
                  />
                </div>

                <div>
                  <Label htmlFor="target_markets">Target Markets (comma-separated)</Label>
                  <Input
                    id="target_markets"
                    value={formData.target_markets}
                    onChange={(e) => setFormData({ ...formData, target_markets: e.target.value })}
                    placeholder="US, UK, India"
                    required
                    className="mt-1 border-foreground"
                  />
                </div>

                <div>
                  <Label htmlFor="commerce_links">Commerce Links (comma-separated)</Label>
                  <Input
                    id="commerce_links"
                    value={formData.commerce_links}
                    onChange={(e) => setFormData({ ...formData, commerce_links: e.target.value })}
                    placeholder="https://shop.example.com, https://amazon.com/brand"
                    className="mt-1 border-foreground"
                  />
                </div>
              </>
            )}

            {formData.role === 'publisher' && (
              <>
                <div>
                  <Label htmlFor="name">Publisher Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    className="mt-1 border-foreground"
                  />
                </div>

                <div>
                  <Label htmlFor="categories">Content Categories (comma-separated)</Label>
                  <Input
                    id="categories"
                    value={formData.categories}
                    onChange={(e) => setFormData({ ...formData, categories: e.target.value })}
                    placeholder="Technology, Fashion, Lifestyle"
                    required
                    className="mt-1 border-foreground"
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    required
                    rows={4}
                    className="mt-1 border-foreground"
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="monthly_sessions">Monthly Sessions</Label>
                    <Input
                      id="monthly_sessions"
                      type="number"
                      value={formData.monthly_sessions}
                      onChange={(e) => setFormData({ ...formData, monthly_sessions: e.target.value })}
                      required
                      className="mt-1 border-foreground"
                    />
                  </div>

                  <div>
                    <Label htmlFor="monthly_pageviews">Monthly Pageviews</Label>
                    <Input
                      id="monthly_pageviews"
                      type="number"
                      value={formData.monthly_pageviews}
                      onChange={(e) => setFormData({ ...formData, monthly_pageviews: e.target.value })}
                      required
                      className="mt-1 border-foreground"
                    />
                  </div>
                </div>
              </>
            )}

            <Button
              type="submit"
              disabled={loading || !formData.role}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
              data-testid="register-submit-button"
            >
              {loading ? 'Creating account...' : 'Create Account'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Already have an account?{' '}
              <button
                onClick={() => navigate('/login')}
                className="text-primary hover:underline"
                data-testid="go-to-login-link"
              >
                Sign in
              </button>
            </p>
          </div>
        </div>
      </div>

      {/* Right - Image */}
      <div
        className="hidden lg:block bg-cover bg-center border-l border-foreground"
        style={{
          backgroundImage: 'url(https://images.pexels.com/photos/62693/pexels-photo-62693.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940)'
        }}
      />
    </div>
  );
}
