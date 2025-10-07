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
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    console.log('Exporting data for user:', user.id);

    // Fetch all user data
    const [
      { data: profile },
      { data: posts },
      { data: comments },
      { data: likes },
      { data: preferences },
      { data: interactions },
      { data: privacySettings },
      { data: auditLogs }
    ] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('posts').select('*').eq('user_id', user.id),
      supabase.from('comments').select('*').eq('user_id', user.id),
      supabase.from('likes').select('*').eq('user_id', user.id),
      supabase.from('user_preferences').select('*').eq('user_id', user.id).single(),
      supabase.from('user_interactions').select('*').eq('user_id', user.id),
      supabase.from('privacy_settings').select('*').eq('user_id', user.id).single(),
      supabase.from('audit_logs').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
    ]);

    const exportData = {
      export_date: new Date().toISOString(),
      user: {
        id: user.id,
        email: user.email,
        created_at: user.created_at
      },
      profile,
      posts,
      comments,
      likes,
      preferences,
      interactions,
      privacy_settings: privacySettings,
      audit_logs: auditLogs
    };

    // Log the export
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      event_type: 'data_export',
      event_details: { timestamp: new Date().toISOString() }
    });

    return new Response(JSON.stringify(exportData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in export-user-data:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
