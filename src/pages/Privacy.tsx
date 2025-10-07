import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PrivacyDashboard } from '@/components/PrivacyDashboard';
import { AuditLogsViewer } from '@/components/AuditLogsViewer';

export default function Privacy() {
  return (
    <div className="container max-w-6xl mx-auto px-4 py-8">
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
