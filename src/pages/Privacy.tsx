import { useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { PrivacyDashboard } from '@/components/PrivacyDashboard';
import { AuditLogsViewer } from '@/components/AuditLogsViewer';
import { ArrowLeft } from 'lucide-react';

export default function Privacy() {
  const navigate = useNavigate();

  return (
    <div className="container max-w-6xl mx-auto px-4 py-8">
      <Button
        variant="ghost"
        onClick={() => navigate("/")}
        className="mb-6"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Feed
      </Button>

      <Tabs defaultValue="settings" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="settings">Privacy Settings</TabsTrigger>
          <TabsTrigger value="logs">Activity Logs</TabsTrigger>
        </TabsList>
        
        <TabsContent value="settings" className="mt-6">
          <PrivacyDashboard />
        </TabsContent>
        
        <TabsContent value="logs" className="mt-6">
          <AuditLogsViewer />
        </TabsContent>
      </Tabs>
    </div>
  );
}
