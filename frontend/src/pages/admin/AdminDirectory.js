import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import axios from '@/utils/api';
import { API } from '@/utils/api';
import { toast } from 'sonner';
import { Buildings, Users, Copy } from '@phosphor-icons/react';

export default function AdminDirectory() {
  const [publishers, setPublishers] = useState([]);
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [pubsRes, brandsRes] = await Promise.all([
        axios.get(`${API}/admin/publishers-list`),
        axios.get(`${API}/admin/brands-list`)
      ]);
      setPublishers(pubsRes.data);
      setBrands(brandsRes.data);
    } catch (error) {
      toast.error('Failed to load directory');
    } finally {
      setLoading(false);
    }
  };

  const copyId = (id, type) => {
    navigator.clipboard.writeText(id);
    toast.success(`${type} ID copied to clipboard!`);
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
      <div className="min-h-screen bg-[var(--adm-bg)] p-8 text-[var(--adm-text)]" data-testid="admin-directory-page">
        <h1 className="mb-8 font-heading text-4xl font-bold text-[var(--adm-text)]">Directory</h1>

        <Tabs defaultValue="publishers" className="w-full">
          <TabsList className="mb-6 border border-[var(--adm-border)] bg-[var(--adm-surface-alt)]">
            <TabsTrigger
              value="publishers"
              className="text-[var(--adm-muted)] data-[state=active]:bg-[var(--adm-surface)] data-[state=active]:text-[var(--adm-text)]"
            >
              Publishers ({publishers.length})
            </TabsTrigger>
            <TabsTrigger
              value="brands"
              className="text-[var(--adm-muted)] data-[state=active]:bg-[var(--adm-surface)] data-[state=active]:text-[var(--adm-text)]"
            >
              Brands ({brands.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="publishers">
            {publishers.length === 0 ? (
              <div className="rounded-lg border border-[var(--adm-border)] bg-[var(--adm-surface)] p-12 text-center">
                <p className="text-[var(--adm-muted)]">No publishers yet</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {publishers.map((pubData) => (
                  <div
                    key={pubData.user.id}
                    className="rounded-lg border border-[var(--adm-border)] bg-[var(--adm-surface)] p-6 transition-shadow hover:shadow-lg"
                    data-testid={`publisher-${pubData.user.id}`}
                  >
                    {pubData.profile?.logo_url ? (
                      <img
                        src={pubData.profile.logo_url}
                        alt={pubData.profile.name}
                        className="h-16 w-16 object-contain rounded mb-4"
                      />
                    ) : (
                      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded bg-[var(--adm-surface-alt)]">
                        <Users size={32} className="text-primary" />
                      </div>
                    )}

                    <h3 className="mb-2 font-heading text-xl font-bold text-[var(--adm-text)]">
                      {pubData.profile?.name || pubData.user.email}
                    </h3>

                    <div className="mb-4">
                      <div className="mb-1 text-xs text-[var(--adm-muted)]">Publisher ID</div>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 truncate rounded border border-[var(--adm-border)] bg-[var(--adm-surface-alt)] px-2 py-1 font-mono text-xs text-[var(--adm-text)]">
                          {pubData.user.id}
                        </code>
                        <button
                          onClick={() => copyId(pubData.user.id, 'Publisher')}
                          className="rounded p-1 text-[var(--adm-muted)] transition-colors hover:bg-[var(--adm-hover)] hover:text-[var(--adm-text)]"
                        >
                          <Copy size={16} />
                        </button>
                      </div>
                    </div>

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

                    <div className="space-y-2 border-t border-[var(--adm-border)] pt-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-[var(--adm-muted)]">Status</span>
                        <span className={`font-medium ${pubData.user.status === 'approved' ? 'text-primary' : 'text-[var(--adm-muted)]'}`}>
                          {pubData.user.status.toUpperCase()}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-[var(--adm-muted)]">Campaigns</span>
                        <span className="font-mono font-bold">{pubData.campaigns_count}</span>
                      </div>
                      {pubData.profile && (
                        <div className="flex justify-between text-sm">
                          <span className="text-[var(--adm-muted)]">Monthly Traffic</span>
                          <span className="font-mono">{pubData.profile.monthly_sessions.toLocaleString()}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="brands">
            {brands.length === 0 ? (
              <div className="rounded-lg border border-[var(--adm-border)] bg-[var(--adm-surface)] p-12 text-center">
                <p className="text-[var(--adm-muted)]">No brands yet</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {brands.map((brandData) => (
                  <div
                    key={brandData.user.id}
                    className="rounded-lg border border-[var(--adm-border)] bg-[var(--adm-surface)] p-6 transition-shadow hover:shadow-lg"
                    data-testid={`brand-${brandData.user.id}`}
                  >
                    {brandData.profile?.logo_url ? (
                      <img
                        src={brandData.profile.logo_url}
                        alt={brandData.profile.company_name}
                        className="h-16 w-16 object-contain rounded mb-4"
                      />
                    ) : (
                      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded bg-[var(--adm-surface-alt)]">
                        <Buildings size={32} className="text-primary" />
                      </div>
                    )}

                    <h3 className="mb-2 font-heading text-xl font-bold text-[var(--adm-text)]">
                      {brandData.profile?.company_name || brandData.user.email}
                    </h3>

                    <div className="mb-4">
                      <div className="mb-1 text-xs text-[var(--adm-muted)]">Brand ID</div>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 truncate rounded border border-[var(--adm-border)] bg-[var(--adm-surface-alt)] px-2 py-1 font-mono text-xs text-[var(--adm-text)]">
                          {brandData.user.id}
                        </code>
                        <button
                          onClick={() => copyId(brandData.user.id, 'Brand')}
                          className="rounded p-1 text-[var(--adm-muted)] transition-colors hover:bg-[var(--adm-hover)] hover:text-[var(--adm-text)]"
                        >
                          <Copy size={16} />
                        </button>
                      </div>
                    </div>

                    {brandData.profile?.industry && (
                      <p className="mb-4 text-sm text-[var(--adm-muted)]">{brandData.profile.industry}</p>
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

                    <div className="space-y-2 border-t border-[var(--adm-border)] pt-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-[var(--adm-muted)]">Status</span>
                        <span className={`font-medium ${brandData.user.status === 'approved' ? 'text-primary' : 'text-[var(--adm-muted)]'}`}>
                          {brandData.user.status.toUpperCase()}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-[var(--adm-muted)]">Campaigns</span>
                        <span className="font-mono font-bold">{brandData.campaigns_count}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
