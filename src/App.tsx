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

import { Skeleton } from "@/components/ui/skeleton";

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuthStore();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 
                          border-indigo-600 mx-auto mb-4" />
          <p className="text-gray-500 text-sm">Loading CoreInventory...</p>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
}

function AppContent() {
  const { setUser, setProfile, setLoading } = useAuthStore();

  useEffect(() => {
    let mounted = true;

    const updateAuthState = async (session: any) => {
      if (!mounted) return;
      
      const currentUser = session?.user ?? null;
      
      if (currentUser) {
        try {
          const { data, error } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", currentUser.id)
            .single();
            
          if (mounted) {
            if (error) {
              console.error("Profile fetch error:", error);
            }
            setUser(currentUser);
            setProfile(data || null);
            setLoading(false);
          }
        } catch (error) {
          console.error("Critical profile fetch error:", error);
          if (mounted) {
            setUser(currentUser);
            setLoading(false);
          }
        }
      } else {
        if (mounted) {
          setUser(null);
          setProfile(null);
          setLoading(false);
        }
      }
    };

    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (mounted) await updateAuthState(session);
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED' || event === 'TOKEN_REFRESHED') {
        if (mounted) await updateAuthState(session);
      }
    });

    const safetyTimeout = setTimeout(() => {
      if (mounted) setLoading(false);
    }, 5000);

    return () => {
      mounted = false;
      subscription.unsubscribe();
      clearTimeout(safetyTimeout);
    };
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
