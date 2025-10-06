import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);
    
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { limit = 20, offset = 0, sortBy = 'relevance' } = await req.json();

    // Fetch user preferences
    const { data: preferences } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', user.id)
      .single();

    // Fetch user interactions for personalization
    const { data: interactions } = await supabase
      .from('user_interactions')
      .select('article_id, interaction_type')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(100);

    // Fetch articles
    let query = supabase
      .from('news_articles')
      .select(`
        *,
        news_sources(name, category)
      `);

    // Apply sorting
    if (sortBy === 'chronological') {
      query = query.order('published_at', { ascending: false });
    } else {
      query = query.order('created_at', { ascending: false });
    }

    const { data: articles, error: articlesError } = await query
      .range(offset, offset + limit - 1);

    if (articlesError) throw articlesError;

    // Use AI to personalize and rank articles
    if (articles && articles.length > 0 && sortBy === 'relevance') {
      const prompt = `You are an AI news recommendation system. Given a user's preferences and past interactions, rank these articles by relevance.

User preferences:
- Followed topics: ${preferences?.followed_topics?.join(', ') || 'None'}
- Location: ${preferences?.location || 'Not specified'}

Recent interactions: ${interactions?.map(i => `${i.interaction_type} on article ${i.article_id}`).join('; ') || 'None'}

Articles:
${articles.map((a, i) => `${i}. ${a.title} - Topics: ${a.ai_topics?.join(', ') || 'general'}`).join('\n')}

Return a JSON array of article indices ordered by relevance (most relevant first). Only return the JSON array, nothing else.`;

      const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${lovableApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: 'You are a helpful AI that returns only valid JSON arrays.' },
            { role: 'user', content: prompt }
          ],
        }),
      });

      if (aiResponse.ok) {
        const aiData = await aiResponse.json();
        const rankingText = aiData.choices[0].message.content;
        
        try {
          const ranking = JSON.parse(rankingText.replace(/```json\n?|\n?```/g, ''));
          const rankedArticles = ranking.map((idx: number) => articles[idx]).filter(Boolean);
          
          return new Response(JSON.stringify({ 
            articles: rankedArticles,
            hasMore: articles.length === limit 
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        } catch (parseError) {
          console.error('Failed to parse AI ranking:', parseError);
        }
      }
    }

    return new Response(JSON.stringify({ 
      articles,
      hasMore: articles.length === limit 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in personalize-feed:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});