import { ReactNode, useEffect } from "react";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/stores/authStore";

import { AppLayout } from "@/components/layout/AppLayout";
import Auth from "@/pages/Auth";
import ForgotPassword from "@/pages/ForgotPassword";
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

function AuthGuard({ children }: { children: ReactNode }) {
  const { user, loading } = useAuthStore();
  
  if (loading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-500 font-medium animate-pulse">Loading CoreInventory...</p>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
}

function RoleGuard({ children, requiredRole }: { children: ReactNode, requiredRole: string }) {
  const { profile, loading } = useAuthStore();
  
  if (loading) return null;
  if (!profile || profile.role !== requiredRole) {
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
}

function AppContent() {
  const { setUser, setProfile, setLoading } = useAuthStore();

  useEffect(() => {
    let mounted = true;

    const safetyTimeout = setTimeout(() => {
      if (mounted) setLoading(false);
    }, 5000);

    const syncSession = async (session: any) => {
      if (!mounted) return;
      const user = session?.user ?? null;
      setUser(user);
      
      if (user) {
        try {
          const { data } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", user.id)
            .single();
          if (mounted) setProfile(data || null);
        } catch (e) {
          console.error("Profile sync error:", e);
        }
      } else {
        setProfile(null);
      }
      
      if (mounted) {
        setLoading(false);
        clearTimeout(safetyTimeout);
      }
    };

    // Initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      syncSession(session);
    });

    // Auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      syncSession(session);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
      clearTimeout(safetyTimeout);
    };
  }, [setUser, setProfile, setLoading]);

  return (
    <Routes>
      <Route path="/auth" element={<Auth />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
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
        <Route path="/adjustments" element={<RoleGuard requiredRole="manager"><Adjustments /></RoleGuard>} />
        <Route path="/adjustments/new" element={<RoleGuard requiredRole="manager"><AdjustmentNew /></RoleGuard>} />
        <Route path="/adjustments/:id" element={<RoleGuard requiredRole="manager"><AdjustmentDetail /></RoleGuard>} />
        <Route path="/history" element={<RoleGuard requiredRole="manager"><History /></RoleGuard>} />
        <Route path="/settings" element={<RoleGuard requiredRole="manager"><SettingsPage /></RoleGuard>} />
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
