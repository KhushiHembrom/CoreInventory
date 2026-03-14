import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/stores/authStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Building2, Users, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";

export function CompleteProfileModal() {
  const { user, profile, setProfile } = useAuthStore();
  const [role, setRole] = useState<string>("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (user && (!profile || !profile.role || !profile.phone_number)) {
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  }, [user, profile]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!role || !phoneNumber) {
      toast.error("Please fill in all fields");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .upsert({ 
          id: user?.id,
          role: role,
          phone_number: phoneNumber,
          full_name: user?.user_metadata?.full_name || profile?.full_name || ""
        }, { onConflict: 'id' })
        .select()
        .single();

      if (error) throw error;
      
      setProfile(data);
      toast.success("Profile completed successfully!");
      setIsOpen(false);
    } catch (error: any) {
      toast.error("Failed to update profile: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4">
      <Card className="w-full max-w-lg border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
        <div className="bg-indigo-600 p-8 text-center text-white">
          <h2 className="text-2xl font-bold">Welcome to CoreInventory! 👋</h2>
          <p className="text-indigo-100 mt-2">Please complete your profile to continue</p>
        </div>
        
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="space-y-2">
            <Label htmlFor="complete-phone" className="text-sm font-semibold text-slate-700">Phone Number</Label>
            <Input
              id="complete-phone"
              type="tel"
              placeholder="+91 98765 43210"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              required
              className="h-12 border-slate-200 focus:ring-indigo-500"
            />
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-semibold text-slate-700">Select Your Role</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setRole("manager")}
                className={`relative flex flex-col items-center text-center p-5 rounded-xl border-2 transition-all duration-200 ${
                  role === "manager" 
                    ? "border-indigo-600 bg-indigo-50 ring-4 ring-indigo-500/10" 
                    : "border-slate-100 hover:border-slate-200 bg-slate-50/50"
                }`}
              >
                {role === "manager" && (
                  <CheckCircle2 className="absolute top-3 right-3 h-5 w-5 text-indigo-600" />
                )}
                <div className={`h-12 w-12 rounded-full flex items-center justify-center mb-3 ${
                  role === "manager" ? "bg-indigo-600 text-white" : "bg-slate-200 text-slate-500"
                }`}>
                  <Building2 size={24} />
                </div>
                <h4 className="font-bold text-slate-900">Manager</h4>
                <p className="text-[11px] text-slate-500 mt-1">Manage inventory, approve operations, view reports</p>
              </button>

              <button
                type="button"
                onClick={() => setRole("staff")}
                className={`relative flex flex-col items-center text-center p-5 rounded-xl border-2 transition-all duration-200 ${
                  role === "staff" 
                    ? "border-indigo-600 bg-indigo-50 ring-4 ring-indigo-500/10" 
                    : "border-slate-100 hover:border-slate-200 bg-slate-50/50"
                }`}
              >
                {role === "staff" && (
                  <CheckCircle2 className="absolute top-3 right-3 h-5 w-5 text-indigo-600" />
                )}
                <div className={`h-12 w-12 rounded-full flex items-center justify-center mb-3 ${
                  role === "staff" ? "bg-indigo-600 text-white" : "bg-slate-200 text-slate-500"
                }`}>
                  <Users size={24} />
                </div>
                <h4 className="font-bold text-slate-900">Staff</h4>
                <p className="text-[11px] text-slate-500 mt-1">Daily operations, receipts, deliveries, transfers</p>
              </button>
            </div>
          </div>

          <Button 
            type="submit" 
            disabled={loading || !role || !phoneNumber}
            className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 transition-all active:scale-[0.98]"
          >
            {loading ? <Loader2 className="animate-spin mr-2" /> : null}
            Continue to Dashboard
          </Button>
        </form>
      </Card>
    </div>
  );
}
