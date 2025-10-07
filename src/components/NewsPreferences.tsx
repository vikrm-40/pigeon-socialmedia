import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, X, Plus, Download, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface NewsPreferencesProps {
  userId: string;
}

const AI_TOPICS = [
  'Machine Learning',
  'Deep Learning',
  'Natural Language Processing',
  'Computer Vision',
  'Robotics',
  'AI Safety',
  'AI Ethics',
  'Generative AI',
  'Large Language Models',
  'Neural Networks',
  'Reinforcement Learning',
  'AI Research',
  'AI Applications',
  'AutoML',
  'Edge AI',
];

export const NewsPreferences = ({ userId }: NewsPreferencesProps) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [followedTopics, setFollowedTopics] = useState<string[]>([]);
  const [customTopic, setCustomTopic] = useState('');
  const [location, setLocation] = useState('');
  const [loadingSample, setLoadingSample] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadPreferences();
  }, [userId]);

  const loadPreferences = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setFollowedTopics(data.followed_topics || []);
        setLocation(data.location || '');
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
      toast({
        title: 'Error',
        description: 'Failed to load preferences',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const { error } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: userId,
          followed_topics: followedTopics,
          location,
        });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Preferences saved successfully',
      });
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast({
        title: 'Error',
        description: 'Failed to save preferences',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const toggleTopic = (topic: string) => {
    setFollowedTopics(prev =>
      prev.includes(topic)
        ? prev.filter(t => t !== topic)
        : [...prev, topic]
    );
  };

  const addCustomTopic = () => {
    if (customTopic.trim() && !followedTopics.includes(customTopic.trim())) {
      setFollowedTopics(prev => [...prev, customTopic.trim()]);
      setCustomTopic('');
    }
  };

  const loadSampleArticles = async () => {
    try {
      setLoadingSample(true);
      const { error } = await supabase.functions.invoke('seed-news');
      
      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Sample AI news articles loaded!',
      });
    } catch (error) {
      console.error('Error loading sample articles:', error);
      toast({
        title: 'Error',
        description: 'Failed to load sample articles',
        variant: 'destructive',
      });
    } finally {
      setLoadingSample(false);
    }
  };

  const fetchRealNews = async () => {
    try {
      setLoadingSample(true);
      toast({
        title: 'Fetching...',
        description: 'Getting latest AI news from real sources',
      });
      
      const { data, error } = await supabase.functions.invoke('fetch-real-news');
      
      if (error) throw error;

      toast({
        title: 'Success',
        description: `Fetched ${data.fetched} articles, added ${data.inserted} new ones`,
      });
    } catch (error) {
      console.error('Error fetching real news:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch real news',
        variant: 'destructive',
      });
    } finally {
      setLoadingSample(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card className="p-6 space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Personalize Your Feed</h3>
        <p className="text-muted-foreground text-sm">
          Select topics you're interested in to get personalized AI news recommendations
        </p>
        <div className="flex gap-2 mt-3">
          <Button
            onClick={fetchRealNews}
            disabled={loadingSample}
            size="sm"
            className="flex-1"
          >
            {loadingSample ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Fetching...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Fetch Latest AI News
              </>
            )}
          </Button>
          <Button
            onClick={loadSampleArticles}
            disabled={loadingSample}
            variant="outline"
            size="sm"
          >
            {loadingSample ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Loading...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Samples
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <Label>AI Topics</Label>
          <div className="flex flex-wrap gap-2 mt-2">
            {AI_TOPICS.map(topic => (
              <Badge
                key={topic}
                variant={followedTopics.includes(topic) ? 'default' : 'outline'}
                className="cursor-pointer hover:opacity-80"
                onClick={() => toggleTopic(topic)}
              >
                {topic}
                {followedTopics.includes(topic) && (
                  <X className="w-3 h-3 ml-1" />
                )}
              </Badge>
            ))}
          </div>
        </div>

        {followedTopics.filter(t => !AI_TOPICS.includes(t)).length > 0 && (
          <div>
            <Label>Custom Topics</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {followedTopics
                .filter(t => !AI_TOPICS.includes(t))
                .map(topic => (
                  <Badge
                    key={topic}
                    variant="default"
                    className="cursor-pointer hover:opacity-80"
                    onClick={() => toggleTopic(topic)}
                  >
                    {topic}
                    <X className="w-3 h-3 ml-1" />
                  </Badge>
                ))}
            </div>
          </div>
        )}

        <div>
          <Label htmlFor="customTopic">Add Custom Topic</Label>
          <div className="flex gap-2 mt-2">
            <Input
              id="customTopic"
              value={customTopic}
              onChange={(e) => setCustomTopic(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addCustomTopic()}
              placeholder="e.g., Quantum Computing"
            />
            <Button onClick={addCustomTopic} size="icon" variant="outline">
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div>
          <Label htmlFor="location">Location (Optional)</Label>
          <Input
            id="location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="e.g., San Francisco, CA"
            className="mt-2"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Get region-specific AI news and events
          </p>
        </div>
      </div>

      <Button onClick={handleSave} disabled={saving} className="w-full">
        {saving ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Saving...
          </>
        ) : (
          'Save Preferences'
        )}
      </Button>
    </Card>
  );
};