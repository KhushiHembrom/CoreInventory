/*
-- FEATURE 6: Run this in Supabase SQL Editor
-- Add missing columns to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone_number TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Update handle_new_user to support Google OAuth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      split_part(NEW.email, '@', 1)
    ),
    NEW.email,
    NULL -- Forced NULL to trigger profile completion modal
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    avatar_url = NEW.raw_user_meta_data->>'avatar_url',
    full_name = COALESCE(profiles.full_name, EXCLUDED.full_name);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
*/

import { useState, useEffect, useRef } from "react";
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
  Phone, 
  Shield, 
  Lock, 
  LogOut, 
  Eye, 
  EyeOff, 
  Trash2, 
  CheckCircle2, 
  AlertTriangle,
  Loader2,
  KeyRound,
  Fingerprint
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

export default function ProfilePage() {
  const { profile, user, setProfile } = useAuthStore();
  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [phoneNumber, setPhoneNumber] = useState(profile?.phone_number || "");
  const [updatingProfile, setUpdatingProfile] = useState(false);
  const queryClient = useQueryClient();

  // Password / OTP State
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpCode, setOtpCode] = useState(["", "", "", "", "", ""]);
  const [timer, setTimer] = useState(0);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  const otpRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  const isGoogleUser = user?.app_metadata?.provider === 'google';

  const maskPhone = (phone: string) => {
    if (!phone) return "";
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length < 10) return phone;
    return `+${cleaned.substring(0, cleaned.length - 10)} ${cleaned.substring(cleaned.length - 10, cleaned.length - 7)} ******* ${cleaned.substring(cleaned.length - 3)}`;
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timer > 0) {
      interval = setInterval(() => setTimer(t => t - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [timer]);

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

  const handleSendOTP = async () => {
    if (!phoneNumber) {
      toast.error("Please add a phone number to your profile first");
      return;
    }
    try {
      const { error } = await supabase.auth.signInWithOtp({
        phone: phoneNumber
      });
      if (error) throw error;
      setOtpSent(true);
      setTimer(60);
      toast.success('OTP sent to ' + maskPhone(phoneNumber));
    } catch (error: any) {
      toast.error("Failed to send OTP: " + error.message);
    }
  };

  const handleVerifyOTP = async () => {
    setVerifyingOtp(true);
    try {
      const token = otpCode.join("");
      const { error } = await supabase.auth.verifyOtp({
        phone: phoneNumber,
        token: token,
        type: 'sms'
      });
      if (error) throw error;
      setOtpVerified(true);
      toast.success("Identity verified! You can now set a new password.");
    } catch (error: any) {
      toast.error("Invalid or expired OTP: " + error.message);
    } finally {
      setVerifyingOtp(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (newPassword.length < 8 || !/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      toast.error("Password must be at least 8 chars and contain uppercase, lowercase, and a number");
      return;
    }

    setChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });
      if (error) throw error;
      toast.success("Password changed successfully!");
      // Reset state
      setOtpSent(false);
      setOtpVerified(false);
      setOtpCode(["", "", "", "", "", ""]);
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setChangingPassword(false);
    }
  };

  const handleOtpInput = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newCode = [...otpCode];
    newCode[index] = value.slice(-1);
    setOtpCode(newCode);

    if (value && index < 5) {
      otpRefs[index + 1].current?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otpCode[index] && index > 0) {
      otpRefs[index - 1].current?.focus();
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
                    <Mail size={14} /> Email Address <Lock size={12} />
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
                    <Shield size={14} /> Organization Role
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

          {/* Change Password Flow */}
          <Card className="border-none shadow-sm overflow-hidden">
            <CardHeader className="bg-slate-50 border-b border-slate-100">
              <CardTitle className="text-lg flex items-center gap-2">
                <KeyRound className="h-5 w-5 text-indigo-600" />
                Security & Password
              </CardTitle>
              <CardDescription>
                {isGoogleUser && !otpVerified ? "You are using Google Auth. Set a password for email login too." : "Secure your account with a strong password"}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-8">
              {!otpSent && (
                <div className="flex flex-col items-center justify-center py-6 text-center">
                  <div className="h-16 w-16 rounded-full bg-indigo-50 flex items-center justify-center mb-4">
                    <Fingerprint className="h-8 w-8 text-indigo-600" />
                  </div>
                  <h3 className="text-lg font-bold">Identity Verification Required</h3>
                  <p className="text-slate-500 text-sm max-w-xs mt-2 mb-6">
                    To change your password, we'll send a one-time verification code to {maskPhone(phoneNumber) || "your phone"}.
                  </p>
                  <Button 
                    onClick={handleSendOTP} 
                    disabled={!phoneNumber}
                    className="h-12 border-indigo-200 hover:bg-indigo-50 text-indigo-700 bg-white border-2 px-8 rounded-xl font-bold"
                  >
                    Send OTP to my Phone
                  </Button>
                  {!phoneNumber && (
                    <p className="text-rose-500 text-xs mt-3 flex items-center gap-1">
                      <AlertTriangle size={12} /> Add phone number above first
                    </p>
                  )}
                </div>
              )}

              {otpSent && !otpVerified && (
                <div className="space-y-8 py-4">
                  <div className="text-center">
                    <h3 className="text-lg font-bold">Enter Verification Code</h3>
                    <p className="text-slate-500 text-sm mt-1">
                      Sent to {maskPhone(phoneNumber)}
                    </p>
                  </div>

                  <div className="flex gap-3 justify-center">
                    {otpCode.map((digit, i) => (
                      <input
                        key={i}
                        ref={otpRefs[i]}
                        type="text"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOtpInput(i, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(i, e)}
                        className="w-12 h-14 text-center text-2xl font-bold border-2 rounded-xl border-slate-200 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100 transition-all outline-none"
                      />
                    ))}
                  </div>

                  <div className="flex flex-col items-center gap-4">
                    <Button 
                      onClick={handleVerifyOTP} 
                      disabled={verifyingOtp || otpCode.join("").length < 6}
                      className="w-full max-w-xs h-12 bg-indigo-600 hover:bg-indigo-700 rounded-xl font-bold transition-all"
                    >
                      {verifyingOtp ? <Loader2 className="animate-spin mr-2" /> : null}
                      Verify Identity
                    </Button>
                    <button 
                      onClick={handleSendOTP} 
                      disabled={timer > 0}
                      className={`text-sm font-semibold transition-colors ${timer > 0 ? 'text-slate-400 cursor-not-allowed' : 'text-indigo-600 hover:text-indigo-800'}`}
                    >
                      {timer > 0 ? `Resend code in ${timer}s` : "Didn't receive code? Resend"}
                    </button>
                  </div>
                </div>
              )}

              {otpVerified && (
                <div className="space-y-6 max-w-md mx-auto py-4 animate-in slide-in-from-bottom duration-300">
                  <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-100 rounded-xl mb-6">
                    <CheckCircle2 size={24} className="text-emerald-500 shrink-0" />
                    <p className="text-sm font-medium text-emerald-800">Your identity has been verified. You can now set a new password.</p>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-slate-700">New Password</Label>
                      <div className="relative">
                        <Input
                          type={showNewPassword ? "text" : "password"}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="h-11 pr-10 border-slate-200 focus:ring-indigo-500"
                          placeholder="Min 8 characters"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-slate-700">Confirm New Password</Label>
                      <div className="relative">
                        <Input
                          type={showConfirmPassword ? "text" : "password"}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="h-11 pr-10 border-slate-200 focus:ring-indigo-500"
                          placeholder="Repeat new password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>

                    <div className="pt-2">
                      <ul className="text-[11px] text-slate-500 space-y-1 ml-2 list-disc">
                        <li className={newPassword.length >= 8 ? "text-emerald-600 font-bold" : ""}>Minimum 8 characters</li>
                        <li className={/[A-Z]/.test(newPassword) && /[a-z]/.test(newPassword) ? "text-emerald-600 font-bold" : ""}>Uppercase & lowercase letters</li>
                        <li className={/[0-9]/.test(newPassword) ? "text-emerald-600 font-bold" : ""}>At least one number</li>
                      </ul>
                    </div>

                    <Button 
                      onClick={handleChangePassword}
                      disabled={changingPassword || !newPassword}
                      className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 rounded-xl font-bold shadow-lg shadow-indigo-100"
                    >
                      {changingPassword ? <Loader2 className="animate-spin mr-2" /> : null}
                      Update Secure Password
                    </Button>
                  </div>
                </div>
              )}
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
