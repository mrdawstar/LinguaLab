import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useEffect, useLayoutEffect } from "react";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { SubscriptionProvider } from "@/contexts/SubscriptionContext";
import { UserPreferencesLoader } from "@/components/UserPreferencesLoader";
import { SubscriptionGuard } from "@/components/layout/SubscriptionGuard";
import { SubscriptionPageGuard } from "@/components/layout/SubscriptionPageGuard";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import LandingPage from "./pages/LandingPage";
import Auth from "./pages/Auth";
import AdminDashboard from "./pages/admin/AdminDashboard";
import StudentsPage from "./pages/admin/StudentsPage";
import GroupsPage from "./pages/admin/GroupsPage";
import TeachersPage from "./pages/admin/TeachersPage";
import SchedulePage from "./pages/admin/SchedulePage";
import SettingsPage from "./pages/admin/SettingsPage";
import PaymentsPage from "./pages/admin/PaymentsPage";
import InvitationsPage from "./pages/admin/InvitationsPage";
import SubscriptionPage from "./pages/admin/SubscriptionPage";
import ManagerDashboard from "./pages/manager/ManagerDashboard";
import ManagerStudentsPage from "./pages/manager/ManagerStudentsPage";
import ManagerSchedulePage from "./pages/manager/ManagerSchedulePage";
import TeacherDashboard from "./pages/teacher/TeacherDashboard";
import TeacherCalendar from "./pages/teacher/TeacherCalendar";
import TeacherStudents from "./pages/teacher/TeacherStudents";
import TeacherSettingsPage from "./pages/teacher/TeacherSettingsPage";
import SubscriptionSuccess from '@/pages/SubscriptionSuccess';
import PrivacyPolicy from './pages/PrivacyPolicy';
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
  }, []);

  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    const rafId = window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    });
    const timeoutId = window.setTimeout(() => {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    }, 50);
    return () => {
      window.cancelAnimationFrame(rafId);
      window.clearTimeout(timeoutId);
    };
  }, [pathname]);

  return null;
};

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SubscriptionProvider>
          <ThemeProvider>
            <UserPreferencesLoader>
              <TooltipProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter
                future={{
                  v7_startTransition: true,
                  v7_relativeSplatPath: true,
                }}
              >
                <ScrollToTop />
                <ErrorBoundary>
                  <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/login" element={<Navigate to="/auth" replace />} />
                <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                {/* Admin routes - protected by subscription */}
                <Route path="/admin" element={<SubscriptionGuard><AdminDashboard /></SubscriptionGuard>} />
                <Route path="/admin/students" element={<SubscriptionGuard><StudentsPage /></SubscriptionGuard>} />
                <Route path="/admin/groups" element={<SubscriptionGuard><GroupsPage /></SubscriptionGuard>} />
                <Route path="/admin/teachers" element={<SubscriptionGuard><TeachersPage /></SubscriptionGuard>} />
                <Route path="/admin/schedule" element={<SubscriptionGuard><SchedulePage /></SubscriptionGuard>} />
                <Route path="/admin/settings" element={<SubscriptionGuard><SettingsPage /></SubscriptionGuard>} />
                <Route path="/admin/payments" element={<SubscriptionGuard><PaymentsPage /></SubscriptionGuard>} />
                <Route path="/admin/invitations" element={<SubscriptionGuard><InvitationsPage /></SubscriptionGuard>} />
                <Route path="/admin/subscription" element={<SubscriptionPageGuard><SubscriptionPage /></SubscriptionPageGuard>} />
                {/* Manager routes - protected by subscription */}
                <Route path="/manager" element={<SubscriptionGuard><ManagerDashboard /></SubscriptionGuard>} />
                <Route path="/manager/students" element={<SubscriptionGuard><ManagerStudentsPage /></SubscriptionGuard>} />
                <Route path="/manager/schedule" element={<SubscriptionGuard><ManagerSchedulePage /></SubscriptionGuard>} />
                {/* Teacher routes - protected by subscription */}
                <Route path="/subscription-success" element={<SubscriptionSuccess />} />
                <Route path="/teacher" element={<SubscriptionGuard><TeacherDashboard /></SubscriptionGuard>} />
                <Route path="/teacher/lessons" element={<SubscriptionGuard><TeacherCalendar /></SubscriptionGuard>} />
                <Route path="/teacher/students" element={<SubscriptionGuard><TeacherStudents /></SubscriptionGuard>} />
                <Route path="/teacher/settings" element={<SubscriptionGuard><TeacherSettingsPage /></SubscriptionGuard>} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </ErrorBoundary>
              </BrowserRouter>
              </TooltipProvider>
            </UserPreferencesLoader>
          </ThemeProvider>
        </SubscriptionProvider>
      </AuthProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
