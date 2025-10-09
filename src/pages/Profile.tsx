import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { logAuditEvent } from "@/lib/auditLogger";
import { ArrowLeft, Camera, Save } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type Profile = Tables<"profiles">;

const Profile = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [email, setEmail] = useState("");
  const [stats, setStats] = useState({ posts: 0, likes: 0, comments: 0 });

  const [formData, setFormData] = useState({
    username: "",
    bio: "",
    avatar_url: "",
  });

  useEffect(() => {
    fetchProfile();
    fetchStats();
  }, []);

  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      setEmail(user.email || "");

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) throw error;

      setProfile(data);
      setFormData({
        username: data.username || "",
        bio: data.bio || "",
        avatar_url: data.avatar_url || "",
      });
    } catch (error) {
      console.error("Error fetching profile:", error);
      toast({
        title: "Error",
        description: "Failed to load profile",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [postsData, likesData, commentsData] = await Promise.all([
        supabase.from("posts").select("id", { count: "exact" }).eq("user_id", user.id),
        supabase.from("likes").select("id", { count: "exact" }).eq("user_id", user.id),
        supabase.from("comments").select("id", { count: "exact" }).eq("user_id", user.id),
      ]);

      setStats({
        posts: postsData.count || 0,
        likes: likesData.count || 0,
        comments: commentsData.count || 0,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = event.target.files?.[0];
      if (!file) return;

      if (!file.type.startsWith("image/")) {
        toast({
          title: "Invalid file",
          description: "Please upload an image file",
          variant: "destructive",
        });
        return;
      }

      if (file.size > 2 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please upload an image smaller than 2MB",
          variant: "destructive",
        });
        return;
      }

      setUploading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;

      const { error: uploadError, data } = await supabase.storage
        .from("media")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("media")
        .getPublicUrl(fileName);

      setFormData({ ...formData, avatar_url: publicUrl });

      await logAuditEvent({ 
        eventType: "profile_avatar_updated", 
        eventDetails: { fileName } 
      });

      toast({
        title: "Success",
        description: "Avatar uploaded successfully",
      });
    } catch (error) {
      console.error("Error uploading avatar:", error);
      toast({
        title: "Error",
        description: "Failed to upload avatar",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("profiles")
        .update({
          username: formData.username,
          bio: formData.bio,
          avatar_url: formData.avatar_url,
        })
        .eq("id", user.id);

      if (error) throw error;

      await logAuditEvent({ 
        eventType: "profile_updated", 
        eventDetails: {
          username: formData.username,
          hasAvatar: !!formData.avatar_url 
        }
      });

      toast({
        title: "Success",
        description: "Profile updated successfully",
      });

      fetchProfile();
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-4xl mx-auto py-8 px-4">
        <Button
          variant="ghost"
          onClick={() => navigate("/")}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Feed
        </Button>

        <div className="grid gap-6">
          {/* Profile Header */}
          <Card>
            <CardHeader>
              <CardTitle>Profile Settings</CardTitle>
              <CardDescription>
                Manage your public profile information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Avatar Section */}
              <div className="flex items-center gap-6">
                <div className="relative">
                  <Avatar className="w-24 h-24">
                    <AvatarImage src={formData.avatar_url} />
                    <AvatarFallback className="text-2xl">
                      {formData.username.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <label
                    htmlFor="avatar-upload"
                    className="absolute bottom-0 right-0 bg-primary text-primary-foreground rounded-full p-2 cursor-pointer hover:bg-primary/90 transition-colors"
                  >
                    <Camera className="w-4 h-4" />
                    <input
                      id="avatar-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAvatarUpload}
                      disabled={uploading}
                    />
                  </label>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{formData.username}</h3>
                  <p className="text-sm text-muted-foreground">{email}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Member since {new Date(profile?.created_at || "").toLocaleDateString()}
                  </p>
                </div>
              </div>

              {/* Form Fields */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    placeholder="Enter your username"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    value={formData.bio}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    placeholder="Tell us about yourself..."
                    rows={4}
                  />
                  <p className="text-xs text-muted-foreground">
                    {formData.bio.length} / 500 characters
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    value={email}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground">
                    Email cannot be changed here
                  </p>
                </div>
              </div>

              <Button
                onClick={handleSave}
                disabled={saving || uploading}
                className="w-full"
              >
                <Save className="w-4 h-4 mr-2" />
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </CardContent>
          </Card>

          {/* Stats Card */}
          <Card>
            <CardHeader>
              <CardTitle>Activity Stats</CardTitle>
              <CardDescription>Your engagement on Pigeon</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 bg-muted rounded-lg">
                  <p className="text-3xl font-bold text-primary">{stats.posts}</p>
                  <p className="text-sm text-muted-foreground mt-1">Posts</p>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <p className="text-3xl font-bold text-primary">{stats.likes}</p>
                  <p className="text-sm text-muted-foreground mt-1">Likes</p>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <p className="text-3xl font-bold text-primary">{stats.comments}</p>
                  <p className="text-sm text-muted-foreground mt-1">Comments</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Profile;
