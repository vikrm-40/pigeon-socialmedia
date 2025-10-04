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

  const handleDelete = async () => {
    const { error } = await supabase
      .from('posts')
      .delete()
      .eq('id', post.id);
    
    if (!error) {
      toast.success('Post deleted');
    }
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
