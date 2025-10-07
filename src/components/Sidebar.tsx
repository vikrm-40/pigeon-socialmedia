import { Card } from '@/components/ui/card';
import { TrendingUp, Hash, Home, User, LogOut, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { logAuditEvent } from '@/lib/auditLogger';

const trendingTopics = [
  { tag: '#AIAdvancements', posts: '1.2K' },
  { tag: '#FutureTech', posts: '980' },
  { tag: '#ReactDev', posts: '750' },
  { tag: '#WebDesign', posts: '620' },
  { tag: '#GenerativeAI', posts: '500' },
  { tag: '#CloudComputing', posts: '410' },
];

const Sidebar = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogout = async () => {
    try {
      await logAuditEvent({ eventType: 'logout' });
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      navigate('/auth');
      toast({
        title: 'Logged out',
        description: 'You have been logged out successfully',
      });
    } catch (error) {
      console.error('Error logging out:', error);
      toast({
        title: 'Error',
        description: 'Failed to log out',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-4">
      <Card className="p-4 bg-card border-border shadow-card sticky top-4">
        <nav className="space-y-2">
          <Link
            to="/"
            className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-accent transition-colors"
          >
            <Home className="w-5 h-5" />
            <span>Home</span>
          </Link>
          <Link
            to="/profile"
            className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-accent transition-colors"
          >
            <User className="w-5 h-5" />
            <span>Profile</span>
          </Link>
          <Link
            to="/privacy"
            className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-accent transition-colors"
          >
            <Shield className="w-5 h-5" />
            <span>Privacy & Security</span>
          </Link>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-accent transition-colors text-left"
          >
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </button>
        </nav>
      </Card>

      <Card className="p-6 bg-card border-border shadow-card sticky top-4">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-accent" />
          <h2 className="font-semibold text-lg">Trending Now</h2>
        </div>
        <div className="space-y-3">
          {trendingTopics.map((topic) => (
            <button
              key={topic.tag}
              className="w-full text-left p-3 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors group"
            >
              <div className="flex items-center gap-2 mb-1">
                <Hash className="w-4 h-4 text-primary group-hover:scale-110 transition-transform" />
                <span className="font-medium">{topic.tag}</span>
              </div>
              <p className="text-sm text-muted-foreground">{topic.posts} posts</p>
            </button>
          ))}
        </div>
      </Card>
    </div>
  );
};

export default Sidebar;
