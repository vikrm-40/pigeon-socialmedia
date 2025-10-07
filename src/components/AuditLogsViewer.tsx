import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Activity } from 'lucide-react';
import { fetchAuditLogs } from '@/lib/auditLogger';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface AuditLog {
  id: string;
  event_type: string;
  event_details: any;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

export const AuditLogsViewer = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    try {
      setLoading(true);
      const data = await fetchAuditLogs(50);
      setLogs(data || []);
    } catch (error) {
      console.error('Error loading audit logs:', error);
      toast({
        title: 'Error',
        description: 'Failed to load audit logs',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getEventColor = (eventType: string) => {
    const colors: Record<string, string> = {
      login: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      logout: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
      profile_update: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      post_create: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      data_export: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      data_deletion_request: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      suspicious_activity: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    };
    return colors[eventType] || 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
  };

  const formatEventType = (eventType: string) => {
    return eventType
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <Activity className="w-6 h-6 text-primary" />
        <div>
          <h2 className="text-2xl font-bold">Activity Log</h2>
          <p className="text-muted-foreground text-sm">
            Track all activities on your account for security and transparency
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {logs.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No activity logs found
          </p>
        ) : (
          logs.map((log) => (
            <div
              key={log.id}
              className="p-4 border rounded-lg hover:bg-accent/50 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2">
                    <Badge className={getEventColor(log.event_type)}>
                      {formatEventType(log.event_type)}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {format(new Date(log.created_at), 'PPp')}
                    </span>
                  </div>
                  
                  {log.event_details && Object.keys(log.event_details).length > 0 && (
                    <div className="text-sm text-muted-foreground mt-2">
                      <pre className="font-mono text-xs bg-muted p-2 rounded overflow-x-auto">
                        {JSON.stringify(log.event_details, null, 2)}
                      </pre>
                    </div>
                  )}
                  
                  {log.user_agent && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Device: {log.user_agent.substring(0, 50)}...
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
};
