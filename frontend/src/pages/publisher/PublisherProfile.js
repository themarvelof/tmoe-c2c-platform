import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/DashboardLayout';
import axios from '@/utils/api';
import { API } from '@/utils/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

export default function PublisherProfile() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    website: '',
    categories: '',
    description: '',
    monthly_sessions: 0,
    monthly_pageviews: 0
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await axios.get(`${API}/publisher/profile`);
      setProfile(response.data);
      setFormData({
        name: response.data.name,
        website: response.data.website,
        categories: response.data.categories.join(', '),
        description: response.data.description,
        monthly_sessions: response.data.monthly_sessions,
        monthly_pageviews: response.data.monthly_pageviews
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
        categories: formData.categories.split(',').map(c => c.trim()),
        monthly_sessions: parseInt(formData.monthly_sessions),
        monthly_pageviews: parseInt(formData.monthly_pageviews)
      };

      if (profile) {
        await axios.put(`${API}/publisher/profile`, payload);
        toast.success('Profile updated successfully');
      } else {
        await axios.post(`${API}/publisher/profile`, payload);
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
      <DashboardLayout role="publisher">
        <div className="p-8">Loading...</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="publisher">
      <div className="p-8" data-testid="publisher-profile-page">
        <h1 className="font-heading text-4xl font-bold mb-8">Publisher Profile</h1>

        <div className="max-w-3xl">
          <form onSubmit={handleSubmit} className="space-y-6" data-testid="publisher-profile-form">
            <div>
              <Label htmlFor="name">Publisher Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                className="mt-1 border-foreground"
                data-testid="profile-name-input"
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
              <Label htmlFor="categories">Content Categories (comma-separated)</Label>
              <Input
                id="categories"
                value={formData.categories}
                onChange={(e) => setFormData({ ...formData, categories: e.target.value })}
                placeholder="Technology, Fashion, Lifestyle"
                required
                className="mt-1 border-foreground"
                data-testid="profile-categories-input"
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
                  data-testid="profile-sessions-input"
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
                  data-testid="profile-pageviews-input"
                />
              </div>
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
