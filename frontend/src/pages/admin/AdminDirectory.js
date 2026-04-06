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
      <div className="p-8 bg-muted min-h-screen" data-testid="admin-directory-page">
        <h1 className="font-heading text-4xl font-bold text-foreground mb-8">Directory</h1>

        <Tabs defaultValue="publishers" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="publishers">Publishers ({publishers.length})</TabsTrigger>
            <TabsTrigger value="brands">Brands ({brands.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="publishers">
            {publishers.length === 0 ? (
              <div className="bg-white rounded-lg border p-12 text-center">
                <p className="text-muted-foreground">No publishers yet</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {publishers.map((pubData) => (
                  <div
                    key={pubData.user.id}
                    className="bg-white rounded-lg border p-6 hover:shadow-lg transition-shadow"
                    data-testid={`publisher-${pubData.user.id}`}
                  >
                    {pubData.profile?.logo_url ? (
                      <img
                        src={pubData.profile.logo_url}
                        alt={pubData.profile.name}
                        className="h-16 w-16 object-contain rounded mb-4"
                      />
                    ) : (
                      <div className="h-16 w-16 rounded bg-muted flex items-center justify-center mb-4">
                        <Users size={32} className="text-primary" />
                      </div>
                    )}

                    <h3 className="font-heading text-xl font-bold text-foreground mb-2">
                      {pubData.profile?.name || pubData.user.email}
                    </h3>

                    <div className="mb-4">
                      <div className="text-xs text-muted-foreground mb-1">Publisher ID</div>
                      <div className="flex items-center gap-2">
                        <code className="text-xs bg-muted px-2 py-1 rounded flex-1 truncate">
                          {pubData.user.id}
                        </code>
                        <button
                          onClick={() => copyId(pubData.user.id, 'Publisher')}
                          className="p-1 hover:bg-muted rounded"
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

                    <div className="pt-4 border-t space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Status</span>
                        <span className={`font-medium ${pubData.user.status === 'approved' ? 'text-primary' : 'text-muted-foreground'}`}>
                          {pubData.user.status.toUpperCase()}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Campaigns</span>
                        <span className="font-mono font-bold">{pubData.campaigns_count}</span>
                      </div>
                      {pubData.profile && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Monthly Traffic</span>
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
              <div className="bg-white rounded-lg border p-12 text-center">
                <p className="text-muted-foreground">No brands yet</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {brands.map((brandData) => (
                  <div
                    key={brandData.user.id}
                    className="bg-white rounded-lg border p-6 hover:shadow-lg transition-shadow"
                    data-testid={`brand-${brandData.user.id}`}
                  >
                    {brandData.profile?.logo_url ? (
                      <img
                        src={brandData.profile.logo_url}
                        alt={brandData.profile.company_name}
                        className="h-16 w-16 object-contain rounded mb-4"
                      />
                    ) : (
                      <div className="h-16 w-16 rounded bg-muted flex items-center justify-center mb-4">
                        <Buildings size={32} className="text-primary" />
                      </div>
                    )}

                    <h3 className="font-heading text-xl font-bold text-foreground mb-2">
                      {brandData.profile?.company_name || brandData.user.email}
                    </h3>

                    <div className="mb-4">
                      <div className="text-xs text-muted-foreground mb-1">Brand ID</div>
                      <div className="flex items-center gap-2">
                        <code className="text-xs bg-muted px-2 py-1 rounded flex-1 truncate">
                          {brandData.user.id}
                        </code>
                        <button
                          onClick={() => copyId(brandData.user.id, 'Brand')}
                          className="p-1 hover:bg-muted rounded"
                        >
                          <Copy size={16} />
                        </button>
                      </div>
                    </div>

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

                    <div className="pt-4 border-t space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Status</span>
                        <span className={`font-medium ${brandData.user.status === 'approved' ? 'text-primary' : 'text-muted-foreground'}`}>
                          {brandData.user.status.toUpperCase()}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Campaigns</span>
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
