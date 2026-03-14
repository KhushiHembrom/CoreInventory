import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Package, Eye, EyeOff, ShieldCheck, Loader2 } from "lucide-react";

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [role, setRole] = useState("staff");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const phoneRegex = /^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]{9,14}$/;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          toast.error(error.message);
        } else {
          toast.success("Welcome back to CoreInventory!");
          navigate("/dashboard");
        }
      } else {
        // Validation for phone number
        if (!phoneRegex.test(phoneNumber)) {
          toast.error("Please enter a valid phone number");
          setLoading(false);
          return;
        }

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { 
              full_name: fullName, 
              role,
              phone_number: phoneNumber 
            },
            emailRedirectTo: window.location.origin,
          },
        });

        if (error) {
          toast.error(error.message);
        } else if (data.user) {
          // Manual upsert into profiles to ensure fields are captured immediately
          const { error: profileError } = await supabase
            .from('profiles')
            .upsert({
              id: data.user.id,
              full_name: fullName,
              email: email,
              phone_number: phoneNumber,
              role: role
            });
            
          if (profileError) {
            console.error("Profile upsert error:", profileError);
          }
          
          toast.success("Success! Please check your email to confirm your account.");
        }
      }
    } catch (error: any) {
        toast.error("An unexpected error occurred. Please try again.");
    } finally {
        setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin + '/dashboard'
      }
    });
    if (error) toast.error(error.message);
  };

  const handleForgotPassword = async () => {
    if (!email) { toast.error("Please enter your email address first"); return; }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) toast.error(error.message);
    else toast.success("Password reset instructions have been sent to your email");
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-900 via-slate-900 to-black">
      {/* Decorative Blur Elements */}
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600/20 blur-[120px] rounded-full" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full" />
      
      <Card className="w-full max-w-md border-slate-800 bg-slate-900/50 backdrop-blur-xl shadow-2xl relative z-10 border-0 overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />
        
        <CardHeader className="text-center pt-10 pb-6">
          <div className="flex flex-col items-center gap-4 mb-6">
            <div className="h-14 w-14 rounded-2xl overflow-hidden shadow-lg shadow-indigo-500/20 transform -rotate-3 hover:rotate-0 transition-transform duration-300">
                <img src="/favicon.png" alt="CoreInventory" className="h-full w-full object-cover" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white tracking-tight">CoreInventory</h2>
              <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-[0.2em] mt-1">Inventory Intelligence</p>
            </div>
          </div>
          <CardTitle className="text-xl text-slate-100">{isLogin ? "Sign In" : "Get Started"}</CardTitle>
          <CardDescription className="text-slate-400">
            {isLogin ? "Access your warehouse command center" : "Create your account to start managing stock"}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6 pb-10">
          <div className="space-y-4">
            <button
              type="button"
              onClick={handleGoogleLogin}
              className="w-full flex items-center justify-center gap-3 px-4 py-2.5 border border-slate-700 rounded-xl bg-slate-800/50 hover:bg-slate-800 transition-all text-sm font-medium text-slate-200 shadow-sm"
            >
              <svg width="18" height="18" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
              </svg>
              Continue with Google
            </button>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-slate-800" />
              </div>
              <div className="relative flex justify-center text-[10px] uppercase font-bold tracking-widest">
                <span className="bg-[#0f172a] px-3 text-slate-500">or use email</span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="fullName" className="text-xs font-bold text-slate-400 uppercase tracking-wider">Full Name</Label>
                    <Input 
                      id="fullName" 
                      value={fullName} 
                      onChange={(e) => setFullName(e.target.value)} 
                      required 
                      className="bg-slate-800/50 border-slate-700 text-slate-200 h-11 rounded-xl focus:ring-indigo-500/20"
                      placeholder="John Doe"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phoneNumber" className="text-xs font-bold text-slate-400 uppercase tracking-wider">Phone Number</Label>
                    <Input 
                      id="phoneNumber" 
                      type="tel"
                      value={phoneNumber} 
                      onChange={(e) => setPhoneNumber(e.target.value)} 
                      required 
                      className="bg-slate-800/50 border-slate-700 text-slate-200 h-11 rounded-xl focus:ring-indigo-500/20"
                      placeholder="+91 98765 43210"
                    />
                  </div>
                </>
              )}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs font-bold text-slate-400 uppercase tracking-wider">Work Email</Label>
                <Input 
                    id="email" 
                    type="email" 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)} 
                    required 
                    className="bg-slate-800/50 border-slate-700 text-slate-200 h-11 rounded-xl focus:ring-indigo-500/20"
                    placeholder="name@company.com"
                />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center px-1">
                    <Label htmlFor="password" className="text-xs font-bold text-slate-400 uppercase tracking-wider">Password</Label>
                    {isLogin && (
                      <button type="button" onClick={handleForgotPassword} className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 transition-colors uppercase tracking-wider">
                        Forgot?
                      </button>
                    )}
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    className="bg-slate-800/50 border-slate-700 text-slate-200 h-11 rounded-xl pr-12 focus:ring-indigo-500/20"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              {!isLogin && (
                <div className="space-y-2">
                  <Label htmlFor="role" className="text-xs font-bold text-slate-400 uppercase tracking-wider">Team Role</Label>
                  <Select value={role} onValueChange={setRole}>
                    <SelectTrigger className="bg-slate-800/50 border-slate-700 text-slate-200 h-11 rounded-xl">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-800 text-slate-200">
                      <SelectItem value="staff">Staff Member</SelectItem>
                      <SelectItem value="manager">Warehouse Manager</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              <Button 
                type="submit" 
                className="w-full h-11 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-all shadow-lg shadow-indigo-500/10 mt-2" 
                disabled={loading}
              >
                {loading ? (
                    <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Authenticating...</span>
                    </div>
                ) : (
                    isLogin ? "Enter Dashboard" : "Create My Account"
                )}
              </Button>
            </form>
          </div>
          
          <div className="text-center">
            <button 
                onClick={() => setIsLogin(!isLogin)} 
                className="text-sm text-slate-400 hover:text-white transition-colors"
            >
              {isLogin ? (
                <span>New to CoreInventory? <span className="text-indigo-400 font-bold">Join the team</span></span>
              ) : (
                <span>Already have an account? <span className="text-indigo-400 font-bold">Sign in</span></span>
              )}
            </button>
          </div>
        </CardContent>
      </Card>
      
      <p className="absolute bottom-8 left-1/2 -translate-x-1/2 text-[10px] text-slate-600 font-bold uppercase tracking-[0.4em] z-10">
        Secure Inventory Systems Inc.
      </p>
    </div>
  );
}


