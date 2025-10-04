import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Rate limiting: Track requests per IP/user
const requestAttempts = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 20; // Max 20 hashtag generations per hour
const RATE_WINDOW = 3600000; // 1 hour in milliseconds

const checkRateLimit = (identifier: string): boolean => {
  const now = Date.now();
  const attempts = requestAttempts.get(identifier);
  
  if (!attempts || now > attempts.resetTime) {
    requestAttempts.set(identifier, { count: 1, resetTime: now + RATE_WINDOW });
    return true;
  }
  
  if (attempts.count >= RATE_LIMIT) {
    return false;
  }
  
  attempts.count++;
  return true;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { content } = await req.json();

    if (!content || !content.trim()) {
      return new Response(
        JSON.stringify({ error: 'Content is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Rate limit check using content as identifier (in production, use user ID or IP)
    const identifier = content.substring(0, 50); // Use content prefix as basic identifier
    if (!checkRateLimit(identifier)) {
      return new Response(
        JSON.stringify({ error: 'Too many requests. Please try again later.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 429 }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: 'You are a social media expert. Generate 5-8 relevant, trending hashtags for posts. Return ONLY the hashtags separated by spaces, starting with #. Be creative and relevant.'
          },
          {
            role: 'user',
            content: `Generate hashtags for this post: "${content}"`
          }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 429 }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted. Please add more credits.' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 402 }
        );
      }
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const hashtags = data.choices[0].message.content.trim();

    return new Response(
      JSON.stringify({ hashtags }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in generate-hashtags function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate hashtags';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
