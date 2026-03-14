import { useState, useRef, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "@/integrations/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { toast } from "sonner"
import { Eye, EyeOff, Loader2, ShieldCheck, ArrowLeft } from "lucide-react"

export default function ForgotPassword() {
  const [step, setStep] = useState<'request' | 'verify' | 'reset'>('request')
  const [email, setEmail] = useState(
    new URLSearchParams(window.location.search).get('email') || ''
  )
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [countdown, setCountdown] = useState(0)
  
  const navigate = useNavigate()
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    if (countdown <= 0) return
    const timer = setTimeout(() => setCountdown(c => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [countdown])

  const handleSendOtp = async () => {
    if (!email) {
      toast.error("Please enter your email address")
      return
    }
    setLoading(true)
    const { error } = await supabase.auth.signInWithOtp({
      email: email,
      options: { shouldCreateUser: false }
    })
    setLoading(false)
    if (error) {
      toast.error(error.message)
    } else {
      toast.success("OTP sent! Check your email inbox.")
      setStep('verify')
      setCountdown(60)
    }
  }

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return // numbers only
    const newOtp = [...otp]
    newOtp[index] = value.slice(-1) // only take last char if multiple
    setOtp(newOtp)
    
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData('text').slice(0, 6).split('')
    if (pastedData.every(char => /^\d$/.test(char))) {
      const newOtp = [...otp]
      pastedData.forEach((char, i) => {
        newOtp[i] = char
      })
      setOtp(newOtp)
      inputRefs.current[Math.min(pastedData.length, 5)]?.focus()
    }
  }

  const handleVerifyOtp = async () => {
    setLoading(true)
    const { error } = await supabase.auth.verifyOtp({
      email: email,
      token: otp.join(''),
      type: 'email'
    })
    setLoading(false)
    if (error) {
      toast.error("Invalid or expired OTP. Please try again.")
      setOtp(['', '', '', '', '', ''])
      inputRefs.current[0]?.focus()
    } else {
      toast.success("OTP verified!")
      setStep('reset')
    }
  }

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword.length < 8) {
      toast.error("Min. 8 characters")
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords don't match")
      return
    }

    setLoading(true)
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    })
    setLoading(false)
    if (error) {
      toast.error(error.message)
    } else {
      toast.success("Password updated successfully!")
      await supabase.auth.signOut()
      navigate('/auth')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-900 via-slate-900 to-black">
      {/* Decorative Blur Elements */}
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600/20 blur-[120px] rounded-full" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full" />
      
      <Card className="w-full max-w-md border-slate-800 bg-slate-900/50 backdrop-blur-xl shadow-2xl relative z-10 border-0 overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />
        
        <CardHeader className="text-center pt-10 pb-6">
          <div className="flex flex-col items-center gap-4 mb-6">
            <div className="h-14 w-14 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 transform -rotate-3 hover:rotate-0 transition-transform duration-300">
                <ShieldCheck className="h-8 w-8 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white tracking-tight">CoreInventory</h2>
              <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-[0.2em] mt-1">Inventory Intelligence</p>
            </div>
          </div>

          <div className="flex items-center justify-center gap-2 mb-6">
            {['request', 'verify', 'reset'].map((s, i) => (
              <div key={s} className={`h-2 rounded-full transition-all duration-300 ${
                step === s
                  ? 'w-8 bg-indigo-500'
                  : ['request', 'verify', 'reset'].indexOf(step) > i
                    ? 'w-2 bg-indigo-700'
                    : 'w-2 bg-slate-700'
              }`} />
            ))}
          </div>

          <CardTitle className="text-xl text-slate-100">
            {step === 'request' && "Forgot Password"}
            {step === 'verify' && "Enter OTP"}
            {step === 'reset' && "Set New Password"}
          </CardTitle>
          <CardDescription className="text-slate-400">
            {step === 'request' && "Enter your email and we'll send you a 6-digit code"}
            {step === 'verify' && `We sent a 6-digit code to ${email}`}
            {step === 'reset' && "Choose a strong password for your account"}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6 pb-10">
          {step === 'request' && (
            <div className="space-y-4">
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
              <Button 
                onClick={handleSendOtp}
                className="w-full h-11 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-all shadow-lg shadow-indigo-500/10" 
                disabled={loading}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {loading ? "Sending..." : "Send OTP"}
              </Button>
              <button 
                onClick={() => navigate('/auth')}
                className="w-full flex items-center justify-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
              >
                <ArrowLeft size={16} /> Back to Sign In
              </button>
            </div>
          )}

          {step === 'verify' && (
            <div className="space-y-6">
              <div className="flex justify-between gap-2">
                {otp.map((digit, i) => (
                  <input
                    key={i}
                    ref={el => inputRefs.current[i] = el}
                    type="text"
                    maxLength={1}
                    value={digit}
                    onChange={e => handleOtpChange(i, e.target.value)}
                    onKeyDown={e => handleKeyDown(i, e)}
                    onPaste={handlePaste}
                    className="w-12 h-12 text-center text-xl font-bold border-2 rounded-xl bg-slate-800/50 border-slate-700 text-slate-200 focus:border-indigo-500 focus:outline-none transition-all"
                  />
                ))}
              </div>

              <Button 
                onClick={handleVerifyOtp}
                className="w-full h-11 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-all shadow-lg shadow-indigo-500/10" 
                disabled={loading || otp.join('').length < 6}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {loading ? "Verifying..." : "Verify OTP"}
              </Button>

              <div className="text-center space-y-4">
                {countdown > 0 ? (
                  <p className="text-sm text-slate-400">Resend OTP in <span className="text-indigo-400 font-bold">{countdown}s</span></p>
                ) : (
                  <button 
                    onClick={handleSendOtp}
                    className="text-sm text-indigo-400 font-bold hover:text-indigo-300 transition-colors uppercase tracking-wider"
                  >
                    Resend OTP
                  </button>
                )}
                <button 
                  onClick={() => setStep('request')}
                  className="block w-full text-sm text-slate-400 hover:text-white transition-colors"
                >
                  Change Email
                </button>
              </div>
            </div>
          )}

          {step === 'reset' && (
            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword" className="text-xs font-bold text-slate-400 uppercase tracking-wider">New Password</Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={8}
                    className="bg-slate-800/50 border-slate-700 text-slate-200 h-11 rounded-xl pr-12 focus:ring-indigo-500/20"
                    placeholder="Min. 8 characters"
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

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-xs font-bold text-slate-400 uppercase tracking-wider">Confirm Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirm ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="bg-slate-800/50 border-slate-700 text-slate-200 h-11 rounded-xl pr-12 focus:ring-indigo-500/20"
                    placeholder="Repeat your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  >
                    {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <Button 
                type="submit"
                className="w-full h-11 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-all shadow-lg shadow-indigo-500/10 mt-2" 
                disabled={loading}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {loading ? "Updating..." : "Update Password"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
      
      <p className="absolute bottom-8 left-1/2 -translate-x-1/2 text-[10px] text-slate-600 font-bold uppercase tracking-[0.4em] z-10">
        Secure Inventory Systems Inc.
      </p>
    </div>
  )
}