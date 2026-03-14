import { useState } from "react";
import { useAuthStore } from "@/stores/authStore";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export default function ProfilePage() {
  const { profile, user } = useAuthStore();
  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [newPassword, setNewPassword] = useState("");
  const qc = useQueryClient();

  const updateProfile = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("profiles").update({ full_name: fullName }).eq("id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Profile updated"); qc.invalidateQueries({ queryKey: ["profile"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const changePassword = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Password changed"); setNewPassword(""); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="max-w-lg space-y-6">
      <h1 className="text-2xl font-semibold">Profile</h1>
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Personal Info</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div><Label>Email</Label><Input value={user?.email || ""} readOnly className="bg-muted" /></div>
          <div><Label>Role</Label><Input value={profile?.role || "staff"} readOnly className="bg-muted" /></div>
          <div><Label>Full Name</Label><Input value={fullName} onChange={e => setFullName(e.target.value)} /></div>
          <Button onClick={() => updateProfile.mutate()} disabled={updateProfile.isPending} size="sm">Save</Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Change Password</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div><Label>New Password</Label><Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} minLength={6} /></div>
          <Button onClick={() => changePassword.mutate()} disabled={changePassword.isPending || newPassword.length < 6} size="sm">Update Password</Button>
        </CardContent>
      </Card>
    </div>
  );
}
