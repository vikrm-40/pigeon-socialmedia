-- Add new audit event types for profile updates
ALTER TYPE audit_event_type ADD VALUE IF NOT EXISTS 'profile_updated';
ALTER TYPE audit_event_type ADD VALUE IF NOT EXISTS 'profile_avatar_updated';