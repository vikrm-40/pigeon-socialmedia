import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Loader2, Heart, Bookmark, Share2, ExternalLink, Settings } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { NewsPreferences } from './NewsPreferences';

interface Article {
  id: string;
  title: string;
  summary: string;
  url: string;
  published_at: string;
  media_type: string;
  media_url: string;
  thumbnail_url: string;
  ai_topics: string[];
  author: string;
  news_sources: {
    name: string;
    category: string;
  };
}

interface AINewsFeedProps {
  userId: string;
}

export const AINewsFeed = ({ userId }: AINewsFeedProps) => {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [sortBy, setSortBy] = useState<'relevance' | 'chronological'>('relevance');
  const [showPreferences, setShowPreferences] = useState(false);
  const { toast } = useToast();
  const observerRef = useRef<IntersectionObserver>();
  const lastArticleRef = useRef<HTMLDivElement>(null);

  const loadArticles = useCallback(async (offset = 0, append = false) => {
    try {
      if (offset === 0) setLoading(true);
      else setLoadingMore(true);

      const { data, error } = await supabase.functions.invoke('personalize-feed', {
        body: { limit: 20, offset, sortBy }
      });

      if (error) throw error;

      if (append) {
        setArticles(prev => [...prev, ...(data.articles || [])]);
      } else {
        setArticles(data.articles || []);
      }
      
      setHasMore(data.hasMore);
    } catch (error) {
      console.error('Error loading articles:', error);
      toast({
        title: 'Error',
        description: 'Failed to load news articles',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [sortBy, toast]);

  useEffect(() => {
    loadArticles();
  }, [sortBy]);

  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect();

    observerRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore && !loadingMore) {
        loadArticles(articles.length, true);
      }
    });

    if (lastArticleRef.current) {
      observerRef.current.observe(lastArticleRef.current);
    }

    return () => observerRef.current?.disconnect();
  }, [articles.length, hasMore, loadingMore, loadArticles]);

  const handleInteraction = async (articleId: string, type: 'like' | 'bookmark' | 'view') => {
    try {
      await supabase.from('user_interactions').insert({
        user_id: userId,
        article_id: articleId,
        interaction_type: type,
      });

      if (type === 'like' || type === 'bookmark') {
        toast({
          title: 'Success',
          description: `Article ${type === 'like' ? 'liked' : 'bookmarked'}!`,
        });
      }
    } catch (error) {
      console.error('Error recording interaction:', error);
    }
  };

  const handleShare = async (article: Article) => {
    try {
      await navigator.share({
        title: article.title,
        text: article.summary,
        url: article.url,
      });
    } catch (error) {
      navigator.clipboard.writeText(article.url);
      toast({
        title: 'Link copied',
        description: 'Article link copied to clipboard',
      });
    }
  };

  if (showPreferences) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => setShowPreferences(false)}>
          ← Back to Feed
        </Button>
        <NewsPreferences userId={userId} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">AI News Feed</h2>
        <Button variant="outline" size="sm" onClick={() => setShowPreferences(true)}>
          <Settings className="w-4 h-4 mr-2" />
          Preferences
        </Button>
      </div>

      <Tabs value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
        <TabsList className="w-full">
          <TabsTrigger value="relevance" className="flex-1">For You</TabsTrigger>
          <TabsTrigger value="chronological" className="flex-1">Latest</TabsTrigger>
        </TabsList>
      </Tabs>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : articles.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">No articles found. Try adjusting your preferences!</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {articles.map((article, index) => (
            <Card
              key={article.id}
              ref={index === articles.length - 1 ? lastArticleRef : null}
              className="p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex gap-4">
                {article.thumbnail_url && (
                  <div className="flex-shrink-0 w-32 h-32 rounded-lg overflow-hidden bg-muted">
                    <img
                      src={article.thumbnail_url}
                      alt={article.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div className="flex-1 space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-xl font-semibold mb-2">{article.title}</h3>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                        <Badge variant="secondary">{article.news_sources?.name}</Badge>
                        {article.media_type !== 'article' && (
                          <Badge variant="outline">{article.media_type}</Badge>
                        )}
                        {article.published_at && (
                          <span>• {new Date(article.published_at).toLocaleDateString()}</span>
                        )}
                        {article.author && <span>• {article.author}</span>}
                      </div>
                    </div>
                  </div>

                  {article.summary && (
                    <p className="text-muted-foreground line-clamp-3">{article.summary}</p>
                  )}

                  {article.ai_topics && article.ai_topics.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {article.ai_topics.map((topic) => (
                        <Badge key={topic} variant="outline" className="text-xs">
                          {topic}
                        </Badge>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleInteraction(article.id, 'like')}
                    >
                      <Heart className="w-4 h-4 mr-1" />
                      Like
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleInteraction(article.id, 'bookmark')}
                    >
                      <Bookmark className="w-4 h-4 mr-1" />
                      Save
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleShare(article)}
                    >
                      <Share2 className="w-4 h-4 mr-1" />
                      Share
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      asChild
                      onClick={() => handleInteraction(article.id, 'view')}
                    >
                      <a href={article.url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-4 h-4 mr-1" />
                        Read
                      </a>
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}

          {loadingMore && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          )}

          {!hasMore && articles.length > 0 && (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">You've reached the end!</p>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};