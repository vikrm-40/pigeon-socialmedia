-- Create news sources table
CREATE TABLE public.news_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  category TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create news articles table
CREATE TABLE public.news_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID REFERENCES public.news_sources(id),
  title TEXT NOT NULL,
  content TEXT,
  summary TEXT,
  author TEXT,
  url TEXT NOT NULL UNIQUE,
  published_at TIMESTAMP WITH TIME ZONE,
  media_type TEXT DEFAULT 'article',
  media_url TEXT,
  thumbnail_url TEXT,
  tags TEXT[],
  ai_topics TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create user preferences table
CREATE TABLE public.user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  followed_topics TEXT[] DEFAULT '{}',
  preferred_sources UUID[],
  location TEXT,
  feed_sort_preference TEXT DEFAULT 'relevance',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id)
);

-- Create user interactions table for personalization
CREATE TABLE public.user_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  article_id UUID NOT NULL REFERENCES public.news_articles(id) ON DELETE CASCADE,
  interaction_type TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_news_articles_published_at ON public.news_articles(published_at DESC);
CREATE INDEX idx_news_articles_tags ON public.news_articles USING GIN(tags);
CREATE INDEX idx_news_articles_ai_topics ON public.news_articles USING GIN(ai_topics);
CREATE INDEX idx_user_interactions_user_id ON public.user_interactions(user_id);
CREATE INDEX idx_user_interactions_article_id ON public.user_interactions(article_id);

-- Enable RLS
ALTER TABLE public.news_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.news_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_interactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for news_sources
CREATE POLICY "News sources are viewable by everyone"
  ON public.news_sources FOR SELECT
  USING (true);

-- RLS Policies for news_articles
CREATE POLICY "News articles are viewable by everyone"
  ON public.news_articles FOR SELECT
  USING (true);

-- RLS Policies for user_preferences
CREATE POLICY "Users can view their own preferences"
  ON public.user_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own preferences"
  ON public.user_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences"
  ON public.user_preferences FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for user_interactions
CREATE POLICY "Users can view their own interactions"
  ON public.user_interactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own interactions"
  ON public.user_interactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create trigger for updating user_preferences updated_at
CREATE TRIGGER update_user_preferences_updated_at
  BEFORE UPDATE ON public.user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert some default news sources
INSERT INTO public.news_sources (name, url, category) VALUES
  ('arXiv', 'https://arxiv.org', 'research'),
  ('TechCrunch AI', 'https://techcrunch.com/category/artificial-intelligence/', 'news'),
  ('MIT Technology Review', 'https://www.technologyreview.com/topic/artificial-intelligence/', 'news'),
  ('OpenAI Blog', 'https://openai.com/blog/', 'blog'),
  ('DeepMind Blog', 'https://deepmind.google/discover/blog/', 'blog'),
  ('AI Conference Updates', 'https://neurips.cc/', 'conference');