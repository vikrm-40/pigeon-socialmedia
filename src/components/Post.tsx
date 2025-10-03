import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Heart, MessageCircle, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface PostProps {
  post: {
    id: string;
    user_id: string;
    content: string | null;
    post_type: string;
    media_url: string | null;
    poll_question: string | null;
    poll_options: string[] | null;
    poll_votes: Record<string, number> | null;
    created_at: string;
    profiles: {
      username: string;
      avatar_url: string | null;
    };
  };
  currentUserId: string | null;
}

const Post = ({ post, currentUserId }: PostProps) => {
  const [likes, setLikes] = useState<any[]>([]);
  const [hasLiked, setHasLiked] = useState(false);
  const [selectedPollOption, setSelectedPollOption] = useState<number | null>(null);

  useEffect(() => {
    fetchLikes();
  }, [post.id]);

  const fetchLikes = async () => {
    const { data } = await supabase
      .from('likes')
      .select('*')
      .eq('post_id', post.id);
    
    if (data) {
      setLikes(data);
      setHasLiked(data.some(like => like.user_id === currentUserId));
    }
  };

  const handleLike = async () => {
    if (!currentUserId) {
      toast.error('Please login to like posts');
      return;
    }

    if (hasLiked) {
      const { error } = await supabase
        .from('likes')
        .delete()
        .eq('post_id', post.id)
        .eq('user_id', currentUserId);
      
      if (!error) {
        setHasLiked(false);
        fetchLikes();
      }
    } else {
      const { error } = await supabase
        .from('likes')
        .insert({ post_id: post.id, user_id: currentUserId });
      
      if (!error) {
        setHasLiked(true);
        fetchLikes();
      }
    }
  };

  const handleVote = async (optionIndex: number) => {
    if (!currentUserId || selectedPollOption !== null) return;

    try {
      setSelectedPollOption(optionIndex);

      const { data, error } = await supabase.functions.invoke('handle-poll-vote', {
        body: { postId: post.id, optionIndex },
      });

      if (error) {
        setSelectedPollOption(null);
        toast.error(error.message || 'Failed to record vote');
        return;
      }

      if (data?.error) {
        setSelectedPollOption(null);
        toast.error(data.error);
        return;
      }

      toast.success('Vote recorded!');
    } catch (error) {
      setSelectedPollOption(null);
      toast.error('Failed to record vote');
    }
  };

  const handleDelete = async () => {
    const { error } = await supabase
      .from('posts')
      .delete()
      .eq('id', post.id);
    
    if (!error) {
      toast.success('Post deleted');
    }
  };

  const getTotalVotes = () => {
    if (!post.poll_votes) return 0;
    return Object.values(post.poll_votes).length;
  };

  const getVotePercentage = (optionIndex: number) => {
    const totalVotes = getTotalVotes();
    if (totalVotes === 0) return 0;
    const optionVotes = Object.values(post.poll_votes || {}).filter(v => v === optionIndex).length;
    return Math.round((optionVotes / totalVotes) * 100);
  };

  const hasUserVoted = () => {
    if (!currentUserId || !post.poll_votes) return false;
    return post.poll_votes[currentUserId] !== undefined;
  };

  return (
    <Card className="p-6 bg-card border-border shadow-card hover:shadow-glow transition-shadow animate-fade-in">
      <div className="flex items-start gap-4">
        <Avatar>
          <AvatarImage src={post.profiles.avatar_url || undefined} />
          <AvatarFallback className="bg-gradient-primary text-white">
            {post.profiles.username[0].toUpperCase()}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold">{post.profiles.username}</p>
              <p className="text-sm text-muted-foreground">
                {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
              </p>
            </div>
            {currentUserId === post.user_id && (
              <Button variant="ghost" size="icon" onClick={handleDelete}>
                <Trash2 className="w-4 h-4 text-destructive" />
              </Button>
            )}
          </div>

          {post.content && (
            <p className="text-foreground whitespace-pre-wrap">{post.content}</p>
          )}

          {post.media_url && (
            <div className="rounded-lg overflow-hidden">
              {post.post_type === 'image' ? (
                <img src={post.media_url} alt="Post media" className="w-full h-auto" />
              ) : (
                <video src={post.media_url} controls className="w-full h-auto" />
              )}
            </div>
          )}

          {post.post_type === 'poll' && post.poll_question && (
            <div className="space-y-3 p-4 bg-secondary rounded-lg">
              <p className="font-semibold">{post.poll_question}</p>
              {post.poll_options?.map((option, index) => {
                const percentage = getVotePercentage(index);
                const userVotedIndex = currentUserId && post.poll_votes ? post.poll_votes[currentUserId] : null;
                const isUserChoice = userVotedIndex === index;
                const hasVoted = hasUserVoted();
                
                return (
                  <button
                    key={index}
                    onClick={() => handleVote(index)}
                    disabled={hasVoted}
                    className="w-full text-left disabled:cursor-not-allowed"
                  >
                    <div className="relative p-3 bg-background rounded-lg border border-border hover:border-primary transition-colors disabled:opacity-70">
                      <div
                        className="absolute inset-0 bg-gradient-primary opacity-20 rounded-lg transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                      <div className="relative flex items-center justify-between">
                        <span className={isUserChoice ? 'font-semibold' : ''}>{option}</span>
                        <span className="text-sm text-muted-foreground">{percentage}%</span>
                      </div>
                    </div>
                  </button>
                );
              })}
              <p className="text-sm text-muted-foreground text-center">
                {getTotalVotes()} {getTotalVotes() === 1 ? 'vote' : 'votes'}
              </p>
            </div>
          )}

          <div className="flex items-center gap-4 pt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLike}
              className={hasLiked ? 'text-accent' : ''}
            >
              <Heart className={`w-4 h-4 mr-1 ${hasLiked ? 'fill-current' : ''}`} />
              {likes.length}
            </Button>
            <Button variant="ghost" size="sm">
              <MessageCircle className="w-4 h-4 mr-1" />
              Comment
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default Post;
