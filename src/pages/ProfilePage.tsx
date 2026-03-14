import { useState } from "react";
import { useAuthStore } from "@/stores/authStore";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { 
  User, 
  Mail, 
  LogOut, 
  Trash2, 
  CheckCircle2, 
  Loader2,
  Shield,
  Briefcase,
  Phone
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function ProfilePage() {
  const { profile, user, setProfile } = useAuthStore();
  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [phoneNumber, setPhoneNumber] = useState(profile?.phone_number || "");
  const [updatingProfile, setUpdatingProfile] = useState(false);
  const queryClient = useQueryClient();

  const isGoogleUser = user?.app_metadata?.provider === 'google';

  const handleUpdateProfile = async () => {
    setUpdatingProfile(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .update({ 
          full_name: fullName, 
          phone_number: phoneNumber 
        })
        .eq("id", user!.id)
        .select()
        .single();
      
      if (error) throw error;
      setProfile(data);
      toast.success("Profile updated successfully!");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setUpdatingProfile(false);
    }
  };

  const handleDeleteAccount = async () => {
    const confirm = window.confirm("Are you sure? This cannot be undone. All your data will be permanently deleted.");
    if (confirm) {
      toast.info("Please contact your administrator to delete your account.");
    }
  };

  const initials = fullName ? fullName.split(' ').map(n => n[0]).join('').toUpperCase() : user?.email?.[0].toUpperCase();
  const avatarUrl = profile?.avatar_url || (user?.user_metadata?.avatar_url);

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 border-none">Account Settings</h1>
        <p className="text-slate-500">Manage your profile information and security preferences</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Profile Info */}
        <div className="lg:col-span-2 space-y-8">
          <Card className="border-none shadow-sm overflow-hidden">
            <CardHeader className="bg-slate-50 border-b border-slate-100">
              <div className="flex items-center gap-4">
                <div className="relative group">
                  <div className="h-20 w-20 rounded-2xl bg-indigo-600 flex items-center justify-center text-white text-2xl font-bold shadow-xl shadow-indigo-200 overflow-hidden transform group-hover:scale-105 transition-transform">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt={fullName} className="h-full w-full object-cover" />
                    ) : (
                      initials
                    )}
                  </div>
                  <div className="absolute -bottom-2 -right-2 bg-emerald-500 rounded-full h-6 w-6 border-2 border-white flex items-center justify-center">
                    <CheckCircle2 size={12} className="text-white" />
                  </div>
                </div>
                <div>
                  <CardTitle className="text-xl">{fullName || "User Account"}</CardTitle>
                  <CardDescription className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary" className={`${profile?.role === 'manager' ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'}`}>
                      {profile?.role?.toUpperCase() || "STAFF"}
                    </Badge>
                    <Badge variant="outline" className="bg-slate-50">
                      {isGoogleUser ? "Google Auth" : "Email Auth"}
                    </Badge>
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-slate-500">
                    <User size={14} /> Full Name
                  </Label>
                  <Input 
                    value={fullName} 
                    onChange={e => setFullName(e.target.value)} 
                    className="h-11 border-slate-200 focus:ring-indigo-500"
                    placeholder="John Doe"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-slate-500">
                    <Mail size={14} /> Email Address
                  </Label>
                  <Input 
                    value={user?.email || ""} 
                    readOnly 
                    className="h-11 bg-slate-50 border-slate-200 text-slate-500 font-medium"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-slate-500">
                    <Phone size={14} /> Phone Number
                  </Label>
                  <Input 
                    value={phoneNumber} 
                    onChange={e => setPhoneNumber(e.target.value)}
                    className="h-11 border-slate-200 focus:ring-indigo-500"
                    placeholder="+91 98765 43210"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-slate-500">
                    <Briefcase size={14} /> Organization Role
                  </Label>
                  <Input 
                    value={profile?.role === 'manager' ? "Warehouse Manager" : "Warehouse Staff"} 
                    readOnly 
                    className="h-11 bg-slate-50 border-slate-200 text-slate-500"
                  />
                </div>
              </div>
              <div className="pt-4 flex justify-end">
                <Button 
                  onClick={handleUpdateProfile} 
                  disabled={updatingProfile}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 h-11 rounded-xl shadow-lg shadow-indigo-100 transition-all font-bold"
                >
                  {updatingProfile ? <Loader2 className="animate-spin mr-2" /> : null}
                  Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - sidebar cards */}
        <div className="space-y-8">
          <Card className="border-none shadow-sm overflow-hidden">
            <CardHeader className="bg-slate-50 border-b border-slate-100 p-4">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Shield className="h-4 w-4 text-indigo-600" /> Organization Status
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div className="space-y-1">
                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Workspace</p>
                <p className="text-sm font-bold text-slate-900">CoreInventory Global</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Member Since</p>
                <p className="text-sm font-medium text-slate-700">
                  {user?.created_at ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : "-"}
                </p>
              </div>
              <div className="space-y-2 pt-2">
                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Active Permissions</p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="text-[10px] py-0">Read Access</Badge>
                  <Badge variant="outline" className="text-[10px] py-0">Write Items</Badge>
                  {profile?.role === 'manager' && <Badge variant="outline" className="text-[10px] py-0 text-indigo-600 border-indigo-200">Full Admin</Badge>}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm overflow-hidden">
            <CardHeader className="bg-rose-50 border-b border-rose-100 p-4 font-bold text-rose-800 text-sm flex flex-row items-center gap-2">
              <Trash2 size={16} /> Danger Zone
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <p className="text-xs text-slate-500">
                Permanently delete your account and all associated data. This action is irreversible.
              </p>
              <Button 
                variant="outline" 
                onClick={handleDeleteAccount}
                className="w-full text-rose-600 border-rose-200 hover:bg-rose-50 hover:text-rose-700 h-10 rounded-lg text-xs font-bold transition-all"
              >
                Delete Account
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
