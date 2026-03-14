import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/stores/authStore";

import { AppLayout } from "@/components/layout/AppLayout";
import Auth from "@/pages/Auth";
import ResetPassword from "@/pages/ResetPassword";
import Dashboard from "@/pages/Dashboard";
import Products from "@/pages/Products";
import ProductDetail from "@/pages/ProductDetail";
import Receipts from "@/pages/Receipts";
import ReceiptNew from "@/pages/ReceiptNew";
import ReceiptDetail from "@/pages/ReceiptDetail";
import Deliveries from "@/pages/Deliveries";
import DeliveryNew from "@/pages/DeliveryNew";
import DeliveryDetail from "@/pages/DeliveryDetail";
import Transfers from "@/pages/Transfers";
import TransferNew from "@/pages/TransferNew";
import TransferDetail from "@/pages/TransferDetail";
import Adjustments from "@/pages/Adjustments";
import AdjustmentNew from "@/pages/AdjustmentNew";
import AdjustmentDetail from "@/pages/AdjustmentDetail";
import History from "@/pages/History";
import SettingsPage from "@/pages/SettingsPage";
import ProfilePage from "@/pages/ProfilePage";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuthStore();
  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>;
  if (!user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
}

function AppContent() {
  const { setUser, setProfile, setLoading } = useAuthStore();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        const { data } = await supabase.from("profiles").select("*").eq("id", session.user.id).single();
        setProfile(data);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        const { data } = await supabase.from("profiles").select("*").eq("id", session.user.id).single();
        setProfile(data);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [setUser, setProfile, setLoading]);

  return (
    <Routes>
      <Route path="/auth" element={<Auth />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route element={<AuthGuard><AppLayout /></AuthGuard>}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/products" element={<Products />} />
        <Route path="/products/:id" element={<ProductDetail />} />
        <Route path="/receipts" element={<Receipts />} />
        <Route path="/receipts/new" element={<ReceiptNew />} />
        <Route path="/receipts/:id" element={<ReceiptDetail />} />
        <Route path="/deliveries" element={<Deliveries />} />
        <Route path="/deliveries/new" element={<DeliveryNew />} />
        <Route path="/deliveries/:id" element={<DeliveryDetail />} />
        <Route path="/transfers" element={<Transfers />} />
        <Route path="/transfers/new" element={<TransferNew />} />
        <Route path="/transfers/:id" element={<TransferDetail />} />
        <Route path="/adjustments" element={<Adjustments />} />
        <Route path="/adjustments/new" element={<AdjustmentNew />} />
        <Route path="/adjustments/:id" element={<AdjustmentDetail />} />
        <Route path="/history" element={<History />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/profile" element={<ProfilePage />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
