import { supabase } from '@/integrations/supabase/client';

export type AuditEventType = 
  | 'login'
  | 'logout'
  | 'profile_update'
  | 'post_create'
  | 'post_update'
  | 'post_delete'
  | 'comment_create'
  | 'comment_delete'
  | 'data_export'
  | 'data_deletion_request'
  | 'privacy_settings_update'
  | 'suspicious_activity';

interface AuditLogData {
  eventType: AuditEventType;
  eventDetails?: Record<string, any>;
  userId?: string;
}

/**
 * Log an audit event to the database
 */
export const logAuditEvent = async ({ 
  eventType, 
  eventDetails = {},
  userId 
}: AuditLogData): Promise<void> => {
  try {
    // Get user ID if not provided
    let uid = userId;
    if (!uid) {
      const { data: { user } } = await supabase.auth.getUser();
      uid = user?.id;
    }

    if (!uid) {
      console.warn('Cannot log audit event: No user ID available');
      return;
    }

    // Get client info
    const userAgent = navigator.userAgent;

    await supabase.from('audit_logs').insert({
      user_id: uid,
      event_type: eventType,
      event_details: eventDetails,
      user_agent: userAgent,
    });

    console.log('Audit event logged:', eventType);
  } catch (error) {
    console.error('Failed to log audit event:', error);
  }
};

/**
 * Fetch audit logs for the current user
 */
export const fetchAuditLogs = async (limit = 50) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Failed to fetch audit logs:', error);
    throw error;
  }
};
