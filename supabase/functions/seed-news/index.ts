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
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get news sources
    const { data: sources } = await supabase.from('news_sources').select('*');
    if (!sources || sources.length === 0) {
      return new Response(JSON.stringify({ error: 'No sources found' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const sampleArticles = [
      {
        source_id: sources[0].id,
        title: 'Breakthrough in Neural Network Architecture: Transformer 2.0',
        summary: 'Researchers unveil a revolutionary transformer architecture that achieves 10x better efficiency while maintaining state-of-the-art performance across multiple benchmarks.',
        url: 'https://arxiv.org/example/transformer-2.0',
        published_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        media_type: 'article',
        ai_topics: ['Deep Learning', 'Neural Networks', 'Machine Learning'],
        author: 'Dr. Jane Smith et al.',
      },
      {
        source_id: sources[1].id,
        title: 'OpenAI Announces GPT-5: The Future of AI Assistants',
        summary: 'OpenAI reveals GPT-5 with enhanced reasoning capabilities, multimodal understanding, and improved safety measures.',
        url: 'https://techcrunch.com/example/gpt-5-announcement',
        published_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
        media_type: 'article',
        thumbnail_url: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=400',
        ai_topics: ['Large Language Models', 'Generative AI', 'AI Safety'],
        author: 'Tech Reporter',
      },
      {
        source_id: sources[2].id,
        title: 'Computer Vision Breakthrough: Real-time 3D Scene Understanding',
        summary: 'New algorithm enables real-time 3D reconstruction and understanding from single camera inputs, opening doors for AR applications.',
        url: 'https://technologyreview.com/example/3d-vision',
        published_at: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
        media_type: 'article',
        thumbnail_url: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=400',
        ai_topics: ['Computer Vision', 'Deep Learning', 'AI Applications'],
        author: 'MIT Technology Review',
      },
      {
        source_id: sources[3].id,
        title: 'Reinforcement Learning Achieves Human-Level Performance in Strategy Games',
        summary: 'DeepMind\'s latest RL agent demonstrates superhuman performance across multiple complex strategy games without game-specific training.',
        url: 'https://deepmind.google/example/rl-games',
        published_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
        media_type: 'article',
        thumbnail_url: 'https://images.unsplash.com/photo-1560253023-3ec5d502959f?w=400',
        ai_topics: ['Reinforcement Learning', 'AI Research', 'Deep Learning'],
        author: 'DeepMind Research Team',
      },
      {
        source_id: sources[0].id,
        title: 'Natural Language Processing: Context Windows Extended to 10M Tokens',
        summary: 'Novel attention mechanism enables processing of extremely long contexts, revolutionizing document understanding and analysis.',
        url: 'https://arxiv.org/example/long-context-nlp',
        published_at: new Date(Date.now() - 18 * 60 * 60 * 1000).toISOString(),
        media_type: 'article',
        ai_topics: ['Natural Language Processing', 'Large Language Models', 'AI Research'],
        author: 'Research Consortium',
      },
      {
        source_id: sources[4].id,
        title: 'AI Ethics Framework: New Guidelines for Responsible AI Development',
        summary: 'International consortium releases comprehensive ethical guidelines addressing bias, transparency, and accountability in AI systems.',
        url: 'https://openai.com/blog/ai-ethics-framework',
        published_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        media_type: 'article',
        thumbnail_url: 'https://images.unsplash.com/photo-1676277791608-ac54525aa94f?w=400',
        ai_topics: ['AI Ethics', 'AI Safety', 'AI Research'],
        author: 'AI Ethics Board',
      },
      {
        source_id: sources[1].id,
        title: 'Edge AI Revolution: Running LLMs on Mobile Devices',
        summary: 'New compression techniques enable running billion-parameter models on smartphones with minimal latency and power consumption.',
        url: 'https://techcrunch.com/example/edge-ai-mobile',
        published_at: new Date(Date.now() - 36 * 60 * 60 * 1000).toISOString(),
        media_type: 'article',
        thumbnail_url: 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=400',
        ai_topics: ['Edge AI', 'Machine Learning', 'AI Applications'],
        author: 'Mobile AI Reporter',
      },
      {
        source_id: sources[5].id,
        title: 'NeurIPS 2025: Top Papers and Emerging Trends in AI Research',
        summary: 'Conference highlights include advances in multimodal learning, efficient training methods, and AI for scientific discovery.',
        url: 'https://neurips.cc/example/2025-highlights',
        published_at: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
        media_type: 'conference',
        thumbnail_url: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=400',
        ai_topics: ['AI Research', 'Machine Learning', 'Deep Learning'],
        author: 'NeurIPS Committee',
      },
    ];

    // Insert articles (ignore conflicts)
    const { data: inserted, error } = await supabase
      .from('news_articles')
      .upsert(sampleArticles, { onConflict: 'url', ignoreDuplicates: true })
      .select();

    if (error) throw error;

    return new Response(JSON.stringify({ 
      success: true, 
      inserted: inserted?.length || 0,
      message: 'Sample articles added successfully' 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error seeding news:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});