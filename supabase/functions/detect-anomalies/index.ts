import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

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
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    console.log('Detecting anomalies for user:', user.id);

    // Fetch recent audit logs for the user
    const { data: recentLogs } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(100);

    if (!recentLogs || recentLogs.length === 0) {
      return new Response(JSON.stringify({ anomalies: [], safe: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Prepare data for AI analysis
    const logSummary = recentLogs.map(log => ({
      event_type: log.event_type,
      timestamp: log.created_at,
      ip_address: log.ip_address,
      details: log.event_details
    }));

    // Use AI to detect anomalies
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: 'You are a security expert analyzing user activity logs for suspicious patterns. Identify potential security threats such as: multiple failed logins, unusual access patterns, rapid data exports, location changes, or abnormal activity frequency. Respond with a JSON object containing an "anomalies" array and a "risk_level" (low, medium, high).'
          },
          {
            role: 'user',
            content: `Analyze these user activity logs and identify any suspicious patterns:\n${JSON.stringify(logSummary, null, 2)}`
          }
        ]
      }),
    });

    if (!aiResponse.ok) {
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const analysisText = aiData.choices[0].message.content;
    
    // Parse AI response
    let analysis;
    try {
      analysis = JSON.parse(analysisText);
    } catch {
      analysis = { anomalies: [], risk_level: 'low' };
    }

    // Log if suspicious activity detected
    if (analysis.anomalies && analysis.anomalies.length > 0) {
      await supabase.from('audit_logs').insert({
        user_id: user.id,
        event_type: 'suspicious_activity',
        event_details: { 
          anomalies: analysis.anomalies,
          risk_level: analysis.risk_level,
          detected_at: new Date().toISOString()
        }
      });
    }

    return new Response(JSON.stringify({
      ...analysis,
      safe: analysis.anomalies.length === 0
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in detect-anomalies:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
