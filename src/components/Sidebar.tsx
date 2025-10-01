import { Card } from '@/components/ui/card';
import { TrendingUp, Hash } from 'lucide-react';

const trendingTopics = [
  { tag: '#AIAdvancements', posts: '1.2K' },
  { tag: '#FutureTech', posts: '980' },
  { tag: '#ReactDev', posts: '750' },
  { tag: '#WebDesign', posts: '620' },
  { tag: '#GenerativeAI', posts: '500' },
  { tag: '#CloudComputing', posts: '410' },
];

const Sidebar = () => {
  return (
    <div className="space-y-4">
      <Card className="p-6 bg-card border-border shadow-card sticky top-4">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-accent" />
          <h2 className="font-semibold text-lg">Trending Now</h2>
        </div>
        <div className="space-y-3">
          {trendingTopics.map((topic, index) => (
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
