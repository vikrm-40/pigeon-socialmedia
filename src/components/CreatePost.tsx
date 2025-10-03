import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Image, Video, BarChart3, Loader2, Sparkles, X } from 'lucide-react';
import { 
  textPostSchema, 
  pollPostSchema, 
  validateImageFile, 
  validateVideoFile 
} from '@/lib/validations';

type PostType = 'text' | 'image' | 'video' | 'poll';

interface CreatePostProps {
  userId: string;
}

const CreatePost = ({ userId }: CreatePostProps) => {
  const [content, setContent] = useState('');
  const [postType, setPostType] = useState<PostType>('text');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [loading, setLoading] = useState(false);
  const [generatingHashtags, setGeneratingHashtags] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file based on post type
      const validation = postType === 'image' 
        ? validateImageFile(file) 
        : validateVideoFile(file);
      
      if (!validation.valid) {
        toast.error(validation.error);
        e.target.value = ''; // Reset input
        return;
      }
      
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const generateHashtags = async () => {
    if (!content.trim()) {
      toast.error('Please enter some content first');
      return;
    }

    setGeneratingHashtags(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-hashtags', {
        body: { content },
      });

      if (error) throw error;
      setContent(content + '\n\n' + data.hashtags);
      toast.success('Hashtags generated!');
    } catch (error) {
      toast.error('Failed to generate hashtags');
    } finally {
      setGeneratingHashtags(false);
    }
  };

  const handlePost = async () => {
    if (!userId) {
      toast.error('You must be logged in to post');
      return;
    }

    setLoading(true);
    try {
      // Validate based on post type
      if (postType === 'text') {
        const validation = textPostSchema.safeParse({ content });
        if (!validation.success) {
          toast.error(validation.error.errors[0].message);
          setLoading(false);
          return;
        }
      } else if (postType === 'poll') {
        const filteredOptions = pollOptions.filter(opt => opt.trim() !== '');
        const validation = pollPostSchema.safeParse({
          question: pollQuestion,
          options: filteredOptions,
        });
        if (!validation.success) {
          toast.error(validation.error.errors[0].message);
          setLoading(false);
          return;
        }
      } else if ((postType === 'image' || postType === 'video') && !selectedFile) {
        toast.error(`Please select a ${postType} file`);
        setLoading(false);
        return;
      }

      let mediaUrl = '';

      // Upload media if exists
      if (selectedFile && (postType === 'image' || postType === 'video')) {
        const fileExt = selectedFile.name.split('.').pop();
        const fileName = `${userId}/${Date.now()}.${fileExt}`;
        const { error: uploadError, data } = await supabase.storage
          .from('media')
          .upload(fileName, selectedFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('media')
          .getPublicUrl(fileName);
        
        mediaUrl = publicUrl;
      }

      // Prepare post data
      const postData: any = {
        user_id: userId,
        post_type: postType,
        content: postType === 'text' || postType === 'image' || postType === 'video' ? content : null,
        media_url: mediaUrl || null,
      };

      if (postType === 'poll') {
        postData.poll_question = pollQuestion;
        postData.poll_options = pollOptions.filter(opt => opt.trim());
        postData.poll_votes = {};
      }

      const { error } = await supabase.from('posts').insert(postData);
      if (error) throw error;

      // Reset form
      setContent('');
      setPostType('text');
      setSelectedFile(null);
      setPreviewUrl('');
      setPollQuestion('');
      setPollOptions(['', '']);
      toast.success('Posted successfully!');
    } catch (error) {
      toast.error('Failed to create post. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const isValidPost = () => {
    if (postType === 'text') return content.trim();
    if (postType === 'image' || postType === 'video') return selectedFile;
    if (postType === 'poll') return pollQuestion.trim() && pollOptions.filter(opt => opt.trim()).length >= 2;
    return false;
  };

  return (
    <Card className="p-6 bg-card border-border shadow-card">
      <div className="space-y-4">
        <div className="flex gap-2">
          <Button
            variant={postType === 'text' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setPostType('text')}
            className={postType === 'text' ? 'bg-gradient-primary' : ''}
          >
            Text
          </Button>
          <Button
            variant={postType === 'image' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setPostType('image')}
            className={postType === 'image' ? 'bg-gradient-primary' : ''}
          >
            <Image className="w-4 h-4 mr-1" />
            Image
          </Button>
          <Button
            variant={postType === 'video' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setPostType('video')}
            className={postType === 'video' ? 'bg-gradient-primary' : ''}
          >
            <Video className="w-4 h-4 mr-1" />
            Video
          </Button>
          <Button
            variant={postType === 'poll' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setPostType('poll')}
            className={postType === 'poll' ? 'bg-gradient-primary' : ''}
          >
            <BarChart3 className="w-4 h-4 mr-1" />
            Poll
          </Button>
        </div>

        {postType === 'text' && (
          <div className="space-y-2">
            <Textarea
              placeholder="What's on your mind?"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[120px] resize-none"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={generateHashtags}
              disabled={generatingHashtags || !content.trim()}
              className="w-full"
            >
              {generatingHashtags ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4 mr-2" />
              )}
              Generate AI Hashtags
            </Button>
          </div>
        )}

        {(postType === 'image' || postType === 'video') && (
          <div className="space-y-2">
            <Textarea
              placeholder="Add a caption..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[80px] resize-none"
            />
            <div className="space-y-2">
              <Label htmlFor="file-upload">
                {postType === 'image' ? 'Upload Image' : 'Upload Video'}
              </Label>
              <Input
                id="file-upload"
                type="file"
                accept={postType === 'image' ? 'image/*' : 'video/*'}
                onChange={handleFileChange}
              />
              {previewUrl && (
                <div className="relative">
                  {postType === 'image' ? (
                    <img src={previewUrl} alt="Preview" className="rounded-lg max-h-64 w-full object-cover" />
                  ) : (
                    <video src={previewUrl} controls className="rounded-lg max-h-64 w-full" />
                  )}
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2"
                    onClick={() => {
                      setSelectedFile(null);
                      setPreviewUrl('');
                    }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {postType === 'poll' && (
          <div className="space-y-3">
            <Input
              placeholder="Ask a question..."
              value={pollQuestion}
              onChange={(e) => setPollQuestion(e.target.value)}
            />
            {pollOptions.map((option, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  placeholder={`Option ${index + 1}`}
                  value={option}
                  onChange={(e) => {
                    const newOptions = [...pollOptions];
                    newOptions[index] = e.target.value;
                    setPollOptions(newOptions);
                  }}
                />
                {pollOptions.length > 2 && (
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setPollOptions(pollOptions.filter((_, i) => i !== index))}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
            {pollOptions.length < 4 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPollOptions([...pollOptions, ''])}
              >
                Add Option
              </Button>
            )}
          </div>
        )}

        <Button
          onClick={handlePost}
          disabled={loading || !isValidPost()}
          className="w-full bg-gradient-primary hover:opacity-90"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Posting...
            </>
          ) : (
            'Post'
          )}
        </Button>
      </div>
    </Card>
  );
};

export default CreatePost;
