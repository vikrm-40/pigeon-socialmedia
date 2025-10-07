import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { DOMParser } from "https://deno.land/x/deno_dom@v0.1.38/deno-dom-wasm.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get or create news sources
    const { data: sources } = await supabase.from('news_sources').select('*');
    
    if (!sources || sources.length === 0) {
      await supabase.from('news_sources').insert([
        { name: 'arXiv AI', url: 'https://arxiv.org', category: 'Research' },
        { name: 'Hacker News', url: 'https://news.ycombinator.com', category: 'Tech News' },
        { name: 'TechCrunch AI', url: 'https://techcrunch.com/category/artificial-intelligence/', category: 'Tech News' },
        { name: 'MIT Technology Review', url: 'https://www.technologyreview.com/topic/artificial-intelligence/', category: 'Tech News' },
        { name: 'The Verge AI', url: 'https://www.theverge.com/ai-artificial-intelligence', category: 'Tech News' },
      ]);
    }

    const { data: updatedSources } = await supabase.from('news_sources').select('*');
    const articles: any[] = [];

    // Fetch from arXiv API
    try {
      const arxivSource = updatedSources?.find(s => s.name === 'arXiv AI');
      const arxivResponse = await fetch(
        'http://export.arxiv.org/api/query?search_query=cat:cs.AI+OR+cat:cs.LG+OR+cat:cs.CL+OR+cat:cs.CV&start=0&max_results=10&sortBy=submittedDate&sortOrder=descending'
      );
      const arxivXml = await arxivResponse.text();
      
      const doc = new DOMParser().parseFromString(arxivXml, 'text/xml');
      const entries = doc?.querySelectorAll('entry');
      
      entries?.forEach((entry: any) => {
        const title = entry.querySelector('title')?.textContent?.trim();
        const summary = entry.querySelector('summary')?.textContent?.trim();
        const link = entry.querySelector('id')?.textContent?.trim();
        const published = entry.querySelector('published')?.textContent?.trim();
        const authors = Array.from(entry.querySelectorAll('author name')).map((a: any) => a.textContent).join(', ');
        
        if (title && summary && link) {
          articles.push({
            source_id: arxivSource?.id,
            title: title.replace(/\s+/g, ' '),
            summary: summary.substring(0, 500).replace(/\s+/g, ' '),
            url: link,
            published_at: published || new Date().toISOString(),
            media_type: 'article',
            ai_topics: ['AI Research', 'Machine Learning', 'Deep Learning'],
            author: authors || 'arXiv',
          });
        }
      });
    } catch (error) {
      console.error('Error fetching arXiv:', error);
    }

    // Fetch from Hacker News API
    try {
      const hnSource = updatedSources?.find(s => s.name === 'Hacker News');
      const hnResponse = await fetch('https://hacker-news.firebaseio.com/v0/topstories.json');
      const storyIds = await hnResponse.json();
      
      // Fetch first 5 stories
      for (let i = 0; i < Math.min(5, storyIds.length); i++) {
        const storyResponse = await fetch(`https://hacker-news.firebaseio.com/v0/item/${storyIds[i]}.json`);
        const story = await storyResponse.json();
        
        if (story && story.title && story.url && 
            (story.title.toLowerCase().includes('ai') || 
             story.title.toLowerCase().includes('machine learning') ||
             story.title.toLowerCase().includes('gpt') ||
             story.title.toLowerCase().includes('llm'))) {
          articles.push({
            source_id: hnSource?.id,
            title: story.title,
            summary: `Score: ${story.score} | Comments: ${story.descendants || 0}`,
            url: story.url,
            published_at: new Date(story.time * 1000).toISOString(),
            media_type: 'article',
            ai_topics: ['AI Discussion', 'Tech News'],
            author: story.by || 'Hacker News',
          });
        }
      }
    } catch (error) {
      console.error('Error fetching Hacker News:', error);
    }

    // Fetch from TechCrunch RSS
    try {
      const tcSource = updatedSources?.find(s => s.name === 'TechCrunch AI');
      const tcResponse = await fetch('https://techcrunch.com/category/artificial-intelligence/feed/');
      const tcXml = await tcResponse.text();
      
      const doc = new DOMParser().parseFromString(tcXml, 'text/xml');
      const items = doc?.querySelectorAll('item');
      
      items?.forEach((item: any, index: number) => {
        if (index < 5) {
          const title = item.querySelector('title')?.textContent?.trim();
          const description = item.querySelector('description')?.textContent?.trim();
          const link = item.querySelector('link')?.textContent?.trim();
          const pubDate = item.querySelector('pubDate')?.textContent?.trim();
          const creator = item.querySelector('creator')?.textContent?.trim();
          
          if (title && link) {
            articles.push({
              source_id: tcSource?.id,
              title,
              summary: description?.substring(0, 500) || 'TechCrunch article on AI',
              url: link,
              published_at: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
              media_type: 'article',
              ai_topics: ['AI News', 'Tech Industry'],
              author: creator || 'TechCrunch',
            });
          }
        }
      });
    } catch (error) {
      console.error('Error fetching TechCrunch:', error);
    }

    // Insert articles
    if (articles.length > 0) {
      const { data: inserted, error } = await supabase
        .from('news_articles')
        .upsert(articles, { onConflict: 'url', ignoreDuplicates: true })
        .select();

      if (error) throw error;

      return new Response(JSON.stringify({ 
        success: true, 
        fetched: articles.length,
        inserted: inserted?.length || 0,
        message: 'Real news articles fetched successfully' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ 
      success: true, 
      fetched: 0,
      message: 'No new articles found' 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching real news:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
