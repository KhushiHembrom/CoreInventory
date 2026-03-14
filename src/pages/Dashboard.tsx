import { useAuthStore } from "@/stores/authStore";
import ManagerDashboard from "./ManagerDashboard";
import StaffDashboard from "./StaffDashboard";
import { Skeleton } from "@/components/ui/skeleton";

export default function Dashboard() {
  const { profile, loading } = useAuthStore();

  // If auth is still loading, show a skeleton that fits both designs
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-48 bg-slate-100" />
          <Skeleton className="h-10 w-24 bg-slate-100" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl bg-slate-50" />
          ))}
        </div>
        <Skeleton className="h-[400px] w-full rounded-xl bg-slate-50/50" />
      </div>
    );
  }

  // Branching based on role
  if (profile?.role === "manager") {
    return <ManagerDashboard />;
  }

  // Default to Staff Dashboard for everyone else (including 'staff' role)
  return <StaffDashboard />;
}
