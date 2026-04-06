import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/DashboardLayout';
import axios from '@/utils/api';
import { API } from '@/utils/api';
import { toast } from 'sonner';
import { Users, Briefcase, Article } from '@phosphor-icons/react';

export default function BrandMyPublishers() {
  const navigate = useNavigate();
  const [publishers, setPublishers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPublishers();
  }, []);

  const fetchPublishers = async () => {
    try {
      const response = await axios.get(`${API}/brand/my-publishers`);
      setPublishers(response.data);
    } catch (error) {
      toast.error('Failed to load publishers');
    } finally {
      setLoading(false);
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
      <div className="p-8 bg-muted min-h-screen" data-testid="brand-my-publishers-page">
        <div className="mb-8">
          <h1 className="font-heading text-4xl font-bold text-foreground">My Publishers</h1>
          <p className="text-muted-foreground mt-2">Publishers creating content about your brand</p>
        </div>

        {publishers.length === 0 ? (
          <div className="bg-white rounded-lg border p-12 text-center">
            <p className="text-muted-foreground">No publishers assigned yet. Submit a campaign brief to get started.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {publishers.map((pubData) => (
              <div
                key={pubData.user.id}
                className="bg-white rounded-lg border p-6 hover:shadow-lg transition-shadow"
                data-testid={`publisher-card-${pubData.user.id}`}
              >
                {/* Publisher Logo */}
                {pubData.profile?.logo_url ? (
                  <div className="mb-4">
                    <img
                      src={pubData.profile.logo_url}
                      alt={pubData.profile.name}
                      className="h-16 w-16 object-contain rounded"
                    />
                  </div>
                ) : (
                  <div className="mb-4">
                    <div className="h-16 w-16 rounded bg-muted flex items-center justify-center">
                      <Users size={32} weight="regular" className="text-primary" />
                    </div>
                  </div>
                )}

                {/* Publisher Info */}
                <h3 className="font-heading text-xl font-bold text-foreground mb-2">
                  {pubData.profile?.name || pubData.user.company_name || pubData.user.email}
                </h3>
                
                {pubData.profile?.website && (
                  <a
                    href={pubData.profile.website}
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
                    <span className="text-muted-foreground">Campaigns</span>
                    <span className="font-mono font-bold text-foreground">{pubData.campaigns_count}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Active</span>
                    <span className="font-mono font-bold text-primary">{pubData.active_campaigns}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Content Pieces</span>
                    <span className="font-mono font-bold text-primary">{pubData.content_pieces_count}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-4 space-y-2">
                  <button
                    onClick={() => navigate(`/brand/publisher-content/${pubData.user.id}`)}
                    className="w-full py-2 px-4 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
                  >
                    <Article size={20} />
                    View Content ({pubData.content_pieces_count})
                  </button>
                  <button
                    onClick={() => navigate('/brand/campaigns')}
                    className="w-full py-2 px-4 rounded-lg border border-primary text-primary hover:bg-primary hover:text-primary-foreground transition-colors flex items-center justify-center gap-2"
                  >
                    <Briefcase size={20} />
                    View Campaigns
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
