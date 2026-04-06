import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/DashboardLayout';
import axios from '@/utils/api';
import { API } from '@/utils/api';
import { toast } from 'sonner';
import { ArrowLeft, Article, Calendar, Link as LinkIcon } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';

export default function BrandPublisherContent() {
  const { publisherId } = useParams();
  const navigate = useNavigate();
  const [content, setContent] = useState([]);
  const [publisherInfo, setPublisherInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchContent();
  }, [publisherId]);

  const fetchContent = async () => {
    try {
      const response = await axios.get(`${API}/brand/publishers/${publisherId}/content`);
      setContent(response.data);
      
      // Try to get publisher info from my-publishers
      const pubsResponse = await axios.get(`${API}/brand/my-publishers`);
      const publisher = pubsResponse.data.find(p => p.user.id === publisherId);
      setPublisherInfo(publisher);
    } catch (error) {
      toast.error('Failed to load content');
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
      <div className="p-8 bg-muted min-h-screen" data-testid="publisher-content-page">
        <Button
          variant="outline"
          onClick={() => navigate('/brand/my-publishers')}
          className="mb-6"
        >
          <ArrowLeft size={20} className="mr-2" />
          Back to Publishers
        </Button>

        <div className="bg-white rounded-lg border p-6 mb-8">
          <div className="flex items-start gap-4">
            {publisherInfo?.profile?.logo_url ? (
              <img
                src={publisherInfo.profile.logo_url}
                alt={publisherInfo.profile.name}
                className="h-20 w-20 object-contain rounded"
              />
            ) : (
              <div className="h-20 w-20 rounded bg-muted flex items-center justify-center">
                <Article size={40} className="text-primary" />
              </div>
            )}
            <div className="flex-1">
              <h1 className="font-heading text-3xl font-bold text-foreground mb-2">
                {publisherInfo?.profile?.name || publisherInfo?.user?.company_name || 'Publisher'} - Content
              </h1>
              <p className="text-muted-foreground">
                All content pieces about your brand from this publisher
              </p>
              {publisherInfo?.profile?.website && (
                <a
                  href={publisherInfo.profile.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline inline-block mt-2"
                >
                  Visit Publisher Website →
                </a>
              )}
            </div>
          </div>
        </div>

        {content.length === 0 ? (
          <div className="bg-white rounded-lg border p-12 text-center">
            <Article size={48} className="mx-auto mb-4 text-muted-foreground" />
            <h3 className="font-heading text-xl font-bold text-foreground mb-2">No Content Yet</h3>
            <p className="text-muted-foreground mb-4">
              Content from this publisher will appear here once published.
            </p>
            {publisherInfo?.profile?.rss_feed_url && (
              <div className="bg-muted rounded-lg p-4 max-w-md mx-auto">
                <p className="text-sm text-foreground font-semibold mb-2">RSS Feed Connected</p>
                <p className="text-xs text-muted-foreground">Content will be automatically tracked from their RSS feed</p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-10" data-testid="content-date-groups">
            {Object.entries(
              content.reduce((groups, piece) => {
                const dateKey = new Date(piece.published_date).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                });
                if (!groups[dateKey]) groups[dateKey] = [];
                groups[dateKey].push(piece);
                return groups;
              }, {})
            ).map(([date, articles]) => (
              <div key={date} data-testid={`date-group-${date}`}>
                <div className="flex items-center gap-3 mb-5">
                  <Calendar size={20} className="text-primary" />
                  <h2 className="font-heading text-xl font-bold text-foreground">{date}</h2>
                  <span className="text-xs font-medium text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
                    {articles.length} {articles.length === 1 ? 'article' : 'articles'}
                  </span>
                  <div className="flex-1 h-px bg-border ml-2" />
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {articles.map((piece) => (
                    <div
                      key={piece.id}
                      className="bg-white rounded-lg border overflow-hidden hover:shadow-lg transition-shadow"
                      data-testid={`content-${piece.id}`}
                    >
                      {piece.image_url && (
                        <img
                          src={piece.image_url}
                          alt={piece.title}
                          className="w-full h-48 object-cover"
                        />
                      )}
                      
                      <div className="p-6">
                        <h3 className="font-heading text-lg font-bold text-foreground mb-2 line-clamp-2">
                          {piece.title}
                        </h3>
                        
                        {piece.description && (
                          <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
                            {piece.description}
                          </p>
                        )}

                        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
                          <Calendar size={14} />
                          <span>{new Date(piece.published_date).toLocaleDateString()}</span>
                        </div>

                        {piece.author && (
                          <div className="text-xs text-muted-foreground mb-4">
                            By {piece.author}
                          </div>
                        )}

                        <a
                          href={piece.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-primary hover:underline text-sm font-medium"
                        >
                          <LinkIcon size={16} />
                          Read Article
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
