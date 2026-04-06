import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/DashboardLayout';
import axios from '@/utils/api';
import { API } from '@/utils/api';
import { toast } from 'sonner';
import { Buildings, Briefcase } from '@phosphor-icons/react';

export default function PublisherMyBrands() {
  const navigate = useNavigate();
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBrands();
  }, []);

  const fetchBrands = async () => {
    try {
      const response = await axios.get(`${API}/publisher/my-brands`);
      setBrands(response.data);
    } catch (error) {
      toast.error('Failed to load brands');
    } finally {
      setLoading(false);
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
      <div className="p-8 bg-muted min-h-screen" data-testid="publisher-my-brands-page">
        <div className="mb-8">
          <h1 className="font-heading text-4xl font-bold text-foreground">My Brands</h1>
          <p className="text-muted-foreground mt-2">Brands you're creating content for</p>
        </div>

        {brands.length === 0 ? (
          <div className="bg-white rounded-lg border p-12 text-center">
            <p className="text-muted-foreground">No brands assigned yet. Wait for admin to assign you to campaigns.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {brands.map((brandData) => (
              <div
                key={brandData.user.id}
                className="bg-white rounded-lg border p-6 hover:shadow-lg transition-shadow"
                data-testid={`brand-card-${brandData.user.id}`}
              >
                {/* Brand Logo */}
                {brandData.profile?.logo_url ? (
                  <div className="mb-4">
                    <img
                      src={brandData.profile.logo_url}
                      alt={brandData.profile.company_name}
                      className="h-16 w-16 object-contain rounded"
                    />
                  </div>
                ) : (
                  <div className="mb-4">
                    <div className="h-16 w-16 rounded bg-muted flex items-center justify-center">
                      <Buildings size={32} weight="regular" className="text-primary" />
                    </div>
                  </div>
                )}

                {/* Brand Info */}
                <h3 className="font-heading text-xl font-bold text-foreground mb-2">
                  {brandData.profile?.company_name || brandData.user.email}
                </h3>
                
                {brandData.profile?.industry && (
                  <p className="text-sm text-muted-foreground mb-4">{brandData.profile.industry}</p>
                )}

                {brandData.profile?.website && (
                  <a
                    href={brandData.profile.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline block mb-4"
                  >
                    Visit Website →
                  </a>
                )}

                {/* Stats */}
                <div className="pt-4 border-t space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Total Campaigns</span>
                    <span className="font-mono font-bold text-foreground">{brandData.campaigns_count}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Active</span>
                    <span className="font-mono font-bold text-primary">{brandData.active_campaigns}</span>
                  </div>
                </div>

                {/* Actions */}
                <button
                  onClick={() => navigate('/publisher/campaigns')}
                  className="mt-4 w-full py-2 px-4 rounded-lg border border-primary text-primary hover:bg-primary hover:text-primary-foreground transition-colors flex items-center justify-center gap-2"
                >
                  <Briefcase size={20} />
                  View Campaigns
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
