import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Verify user is authenticated
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('Authentication failed:', authError?.message);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { postId, optionIndex } = await req.json();

    if (typeof postId !== 'string' || typeof optionIndex !== 'number') {
      return new Response(
        JSON.stringify({ error: 'Invalid request parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing vote for post ${postId}, option ${optionIndex}, user ${user.id}`);

    // Fetch the post with current poll data
    const { data: post, error: fetchError } = await supabase
      .from('posts')
      .select('poll_options, poll_votes, user_id')
      .eq('id', postId)
      .single();

    if (fetchError || !post) {
      console.error('Error fetching post:', fetchError?.message);
      return new Response(
        JSON.stringify({ error: 'Post not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate poll exists
    if (!post.poll_options || !Array.isArray(post.poll_options)) {
      return new Response(
        JSON.stringify({ error: 'This post does not have a poll' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate option index
    if (optionIndex < 0 || optionIndex >= post.poll_options.length) {
      return new Response(
        JSON.stringify({ error: 'Invalid poll option' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user has already voted
    const pollVotes = post.poll_votes || {};
    if (pollVotes[user.id] !== undefined) {
      return new Response(
        JSON.stringify({ error: 'You have already voted on this poll' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Record the vote
    const updatedVotes = {
      ...pollVotes,
      [user.id]: optionIndex,
    };

    // Update the post with the new vote
    const { error: updateError } = await supabase
      .from('posts')
      .update({ poll_votes: updatedVotes })
      .eq('id', postId);

    if (updateError) {
      console.error('Error updating vote:', updateError.message);
      return new Response(
        JSON.stringify({ error: 'Failed to record vote' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Vote recorded successfully for user ${user.id}`);

    return new Response(
      JSON.stringify({ success: true, pollVotes: updatedVotes }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
