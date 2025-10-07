import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { 
  Shield, 
  Download, 
  Trash2, 
  Eye, 
  Lock,
  AlertTriangle,
  CheckCircle2,
  Loader2
} from 'lucide-react';
import { logAuditEvent } from '@/lib/auditLogger';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface PrivacySettings {
  allow_personalization: boolean;
  allow_analytics: boolean;
  allow_data_sharing: boolean;
  data_retention_days: number;
}

export const PrivacyDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [settings, setSettings] = useState<PrivacySettings>({
    allow_personalization: true,
    allow_analytics: true,
    allow_data_sharing: false,
    data_retention_days: 365,
  });
  const [securityStatus, setSecurityStatus] = useState<{
    safe: boolean;
    anomalies: any[];
    risk_level?: string;
  } | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadPrivacySettings();
  }, []);

  const loadPrivacySettings = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('privacy_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setSettings({
          allow_personalization: data.allow_personalization,
          allow_analytics: data.allow_analytics,
          allow_data_sharing: data.allow_data_sharing,
          data_retention_days: data.data_retention_days,
        });
      }
    } catch (error) {
      console.error('Error loading privacy settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to load privacy settings',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    try {
      setSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('privacy_settings')
        .upsert({
          user_id: user.id,
          ...settings,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      await logAuditEvent({
        eventType: 'privacy_settings_update',
        eventDetails: settings,
      });

      toast({
        title: 'Success',
        description: 'Privacy settings saved successfully',
      });
    } catch (error) {
      console.error('Error saving privacy settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to save privacy settings',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleExportData = async () => {
    try {
      setExporting(true);
      const { data, error } = await supabase.functions.invoke('export-user-data');

      if (error) throw error;

      // Create and download JSON file
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `user-data-export-${new Date().toISOString()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: 'Success',
        description: 'Your data has been exported successfully',
      });
    } catch (error) {
      console.error('Error exporting data:', error);
      toast({
        title: 'Error',
        description: 'Failed to export data',
        variant: 'destructive',
      });
    } finally {
      setExporting(false);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('data_deletion_requests')
        .insert({
          user_id: user.id,
          status: 'pending',
        });

      if (error) throw error;

      await logAuditEvent({
        eventType: 'data_deletion_request',
        eventDetails: { requested_at: new Date().toISOString() },
      });

      toast({
        title: 'Request Submitted',
        description: 'Your data deletion request has been submitted. We will process it within 30 days as per GDPR requirements.',
      });

      setShowDeleteDialog(false);
    } catch (error) {
      console.error('Error requesting data deletion:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit deletion request',
        variant: 'destructive',
      });
    }
  };

  const handleSecurityScan = async () => {
    try {
      setScanning(true);
      const { data, error } = await supabase.functions.invoke('detect-anomalies');

      if (error) throw error;

      setSecurityStatus(data);

      if (data.safe) {
        toast({
          title: 'All Clear',
          description: 'No suspicious activity detected',
        });
      } else {
        toast({
          title: 'Anomalies Detected',
          description: `${data.anomalies.length} potential security issues found`,
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error scanning for anomalies:', error);
      toast({
        title: 'Error',
        description: 'Failed to scan for security issues',
        variant: 'destructive',
      });
    } finally {
      setScanning(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <Shield className="w-6 h-6 text-primary" />
          <div>
            <h2 className="text-2xl font-bold">Privacy & Security</h2>
            <p className="text-muted-foreground text-sm">
              Manage your data privacy preferences and security settings
            </p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Privacy Controls */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Lock className="w-5 h-5" />
              Privacy Controls
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="personalization">AI Personalization</Label>
                  <p className="text-sm text-muted-foreground">
                    Allow AI to personalize your news feed based on your interests
                  </p>
                </div>
                <Switch
                  id="personalization"
                  checked={settings.allow_personalization}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, allow_personalization: checked })
                  }
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="analytics">Analytics</Label>
                  <p className="text-sm text-muted-foreground">
                    Help us improve by collecting anonymous usage data
                  </p>
                </div>
                <Switch
                  id="analytics"
                  checked={settings.allow_analytics}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, allow_analytics: checked })
                  }
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="sharing">Data Sharing</Label>
                  <p className="text-sm text-muted-foreground">
                    Share anonymized data with trusted research partners
                  </p>
                </div>
                <Switch
                  id="sharing"
                  checked={settings.allow_data_sharing}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, allow_data_sharing: checked })
                  }
                />
              </div>
            </div>

            <Button onClick={handleSaveSettings} disabled={saving} className="w-full">
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Privacy Settings'
              )}
            </Button>
          </div>

          <Separator />

          {/* Security Scan */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Eye className="w-5 h-5" />
              Security Monitoring
            </h3>
            
            <p className="text-sm text-muted-foreground">
              Our AI-powered security system monitors your account for suspicious activities
            </p>

            <Button
              onClick={handleSecurityScan}
              disabled={scanning}
              variant="outline"
              className="w-full"
            >
              {scanning ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Scanning...
                </>
              ) : (
                <>
                  <Shield className="w-4 h-4 mr-2" />
                  Run Security Scan
                </>
              )}
            </Button>

            {securityStatus && (
              <div className={`p-4 rounded-lg border ${
                securityStatus.safe 
                  ? 'bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800' 
                  : 'bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800'
              }`}>
                <div className="flex items-start gap-3">
                  {securityStatus.safe ? (
                    <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
                  )}
                  <div>
                    <p className="font-semibold">
                      {securityStatus.safe ? 'Account Secure' : 'Anomalies Detected'}
                    </p>
                    {!securityStatus.safe && (
                      <ul className="text-sm mt-2 space-y-1">
                        {securityStatus.anomalies.map((anomaly, i) => (
                          <li key={i}>• {anomaly}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Data Management */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Data Management</h3>
            
            <div className="space-y-3">
              <Button
                onClick={handleExportData}
                disabled={exporting}
                variant="outline"
                className="w-full"
              >
                {exporting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    Export My Data (GDPR)
                  </>
                )}
              </Button>

              <Button
                onClick={() => setShowDeleteDialog(true)}
                variant="destructive"
                className="w-full"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Request Account Deletion
              </Button>
            </div>
          </div>
        </div>
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will submit a request to permanently delete your account and all associated data.
              This action cannot be undone. We will process your request within 30 days as required by GDPR.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAccount} className="bg-destructive text-destructive-foreground">
              Submit Deletion Request
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
