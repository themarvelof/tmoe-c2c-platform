import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import axios from '@/utils/api';
import { API } from '@/utils/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

export default function BrandProfile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    company_name: '',
    website: '',
    industry: '',
    description: '',
    target_categories: '',
    target_markets: '',
    commerce_links: ''
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await axios.get(`${API}/brand/profile`);
      setProfile(response.data);
      setFormData({
        company_name: response.data.company_name,
        website: response.data.website,
        industry: response.data.industry,
        description: response.data.description,
        target_categories: response.data.target_categories.join(', '),
        target_markets: response.data.target_markets.join(', '),
        commerce_links: response.data.commerce_links.join(', ')
      });
    } catch (error) {
      if (error.response?.status === 404) {
        setProfile(null);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const payload = {
        ...formData,
        target_categories: formData.target_categories.split(',').map(c => c.trim()),
        target_markets: formData.target_markets.split(',').map(c => c.trim()),
        commerce_links: formData.commerce_links.split(',').map(c => c.trim()).filter(c => c)
      };

      if (profile) {
        await axios.put(`${API}/brand/profile`, payload);
        toast.success('Profile updated successfully');
      } else {
        await axios.post(`${API}/brand/profile`, payload);
        toast.success('Profile created successfully');
      }
      fetchProfile();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save profile');
    } finally {
      setSaving(false);
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
      <div className="p-8" data-testid="brand-profile-page">
        <h1 className="font-heading text-4xl font-bold mb-8">Brand Profile</h1>

        <div className="max-w-3xl">
          <form onSubmit={handleSubmit} className="space-y-6" data-testid="brand-profile-form">
            <div>
              <Label htmlFor="company_name">Company Name</Label>
              <Input
                id="company_name"
                value={formData.company_name}
                onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                required
                className="mt-1 border-foreground"
                data-testid="profile-company-input"
              />
            </div>

            <div>
              <Label htmlFor="website">Website URL</Label>
              <Input
                id="website"
                type="url"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                required
                className="mt-1 border-foreground"
                data-testid="profile-website-input"
              />
            </div>

            <div>
              <Label htmlFor="industry">Industry</Label>
              <Input
                id="industry"
                value={formData.industry}
                onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                required
                className="mt-1 border-foreground"
                data-testid="profile-industry-input"
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={4}
                required
                className="mt-1 border-foreground"
                data-testid="profile-description-input"
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
                data-testid="profile-categories-input"
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
                data-testid="profile-markets-input"
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
                data-testid="profile-links-input"
              />
            </div>

            <Button
              type="submit"
              disabled={saving}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              data-testid="save-profile-button"
            >
              {saving ? 'Saving...' : profile ? 'Update Profile' : 'Create Profile'}
            </Button>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
}
