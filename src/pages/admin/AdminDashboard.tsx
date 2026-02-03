import { AlertCircle, Users, Calendar } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatCard } from '@/components/dashboard/StatCard';
import { MonthlyRevenueCard } from '@/components/dashboard/MonthlyRevenueCard';
import { RevenueChart } from '@/components/dashboard/RevenueChart';
import { AttendanceChart } from '@/components/dashboard/AttendanceChart';
import { PaymentStatus } from '@/components/dashboard/PaymentStatus';
import { StudentOverview } from '@/components/dashboard/StudentOverview';
import { UpcomingLessons } from '@/components/dashboard/UpcomingLessons';
import { AttendanceOverview } from '@/components/dashboard/AttendanceOverview';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useSubscriptionLimits } from '@/hooks/useSubscriptionLimits';
import { PremiumFeatureGuard } from '@/components/subscription/PremiumFeatureGuard';

export default function AdminDashboard() {
  const { profile, schoolId, role, canViewFinances } = useAuth();
  const navigate = useNavigate();
  const displayName = profile?.full_name?.split(' ')[0] || (role === 'manager' ? 'Manager' : 'Admin');
  const { limits } = useSubscriptionLimits();

  // Fetch students count
  const { data: studentsCount = 0 } = useQuery({
    queryKey: ['studentsCount', schoolId],
    queryFn: async () => {
      if (!schoolId) return 0;
      const { count } = await supabase
        .from('students')
        .select('*', { count: 'exact', head: true })
        .eq('school_id', schoolId);
      return count || 0;
    },
    enabled: !!schoolId,
  });

  // Fetch today's lessons count
  const { data: todayLessons = 0 } = useQuery({
    queryKey: ['todayLessons', schoolId],
    queryFn: async () => {
      if (!schoolId) return 0;
      const today = new Date().toISOString().split('T')[0];
      const { count } = await supabase
        .from('lessons')
        .select('*', { count: 'exact', head: true })
        .eq('school_id', schoolId)
        .eq('date', today);
      return count || 0;
    },
    enabled: !!schoolId,
  });

  // Fetch students with no payment - based on packages (same logic as PaymentsPage)
  // Students with 0 remaining lessons in active packages
  const { data: overdueStudentsCount = 0 } = useQuery({
    queryKey: ['overdueStudentsCount', schoolId],
    queryFn: async () => {
      if (!schoolId) return 0;
      
      // Get all students
      const { data: students, error: studentsError } = await supabase
        .from('students')
        .select('id')
        .eq('school_id', schoolId);

      if (studentsError) {
        console.error('Error fetching students:', studentsError);
        return 0;
      }

      if (!students || students.length === 0) return 0;

      // Get all active packages
      const { data: packages, error: packagesError } = await supabase
        .from('package_purchases')
        .select('student_id, lessons_total, lessons_used, status')
        .eq('school_id', schoolId)
        .eq('status', 'active');

      if (packagesError) {
        console.error('Error fetching packages:', packagesError);
        return 0;
      }

      // Calculate remaining lessons per student
      const remainingByStudent = new Map<string, number>();
      (packages || []).forEach((pkg: any) => {
        const total = Number(pkg.lessons_total) || 0;
        const used = Number(pkg.lessons_used) || 0;
        const remaining = Math.max(0, total - used);
        
        const current = remainingByStudent.get(pkg.student_id) || 0;
        remainingByStudent.set(pkg.student_id, current + remaining);
      });

      // Count students with 0 remaining lessons
      const studentsWithNoPayment = students.filter((student) => {
        const remaining = remainingByStudent.get(student.id) || 0;
        return remaining === 0;
      });

      return studentsWithNoPayment.length;
    },
    enabled: !!schoolId,
  });

  // Fetch teachers count
  const { data: teachersCount = 0 } = useQuery({
    queryKey: ['teachersCount', schoolId],
    queryFn: async () => {
      if (!schoolId) return 0;
      const { count } = await supabase
        .from('teachers')
        .select('*', { count: 'exact', head: true })
        .eq('school_id', schoolId);
      return count || 0;
    },
    enabled: !!schoolId,
  });

  return (
    <DashboardLayout 
      title="Dashboard" 
      subtitle={`Witaj, ${displayName}!`}
      requiredRole={['admin', 'manager']}
    >
      {/* Stats grid */}
      <div className="mb-4 grid grid-cols-2 gap-3 sm:mb-6 sm:gap-4 lg:grid-cols-4">
        <StatCard
          title="Aktywni uczniowie"
          value={studentsCount}
          change={`${teachersCount} nauczycieli`}
          changeType="neutral"
          icon={Users}
          onClick={() => navigate('/admin/students')}
          limit={limits.students.limit}
          current={limits.students.current}
          showLimit={limits.students.limit !== null}
        />
        <StatCard
          title="Zajęcia dzisiaj"
          value={todayLessons}
          change="Sprawdź harmonogram"
          changeType="neutral"
          icon={Calendar}
          onClick={() => navigate('/admin/schedule')}
        />
        {canViewFinances && (
          <>
            <StatCard
              title="Zaległe płatności"
              value={overdueStudentsCount}
              change={overdueStudentsCount > 0 ? "Wymaga uwagi" : "Wszystko OK"}
              changeType={overdueStudentsCount > 0 ? "negative" : "positive"}
              icon={AlertCircle}
              iconColor={overdueStudentsCount > 0 ? "text-destructive" : "text-primary"}
              onClick={() => navigate('/admin/payments')}
            />
            <PremiumFeatureGuard feature="monthlyReports">
              <MonthlyRevenueCard />
            </PremiumFeatureGuard>
          </>
        )}
        {!canViewFinances && (
          <>
            <StatCard
              title="Nauczyciele"
              value={teachersCount}
              change="Aktywnych"
              changeType="neutral"
              icon={Users}
              onClick={() => navigate('/admin/teachers')}
              limit={limits.teachers.limit}
              current={limits.teachers.current}
              showLimit={limits.teachers.limit !== null}
            />
            <StatCard
              title="Ten tydzień"
              value={todayLessons * 5}
              change="Szacowane zajęcia"
              changeType="neutral"
              icon={Calendar}
              onClick={() => navigate('/admin/schedule')}
            />
          </>
        )}
      </div>

      {/* Main charts row - only for admin */}
      {canViewFinances && (
        <div className="mb-4 grid grid-cols-1 gap-4 sm:mb-6 sm:gap-6 lg:grid-cols-3 lg:items-stretch">
          <div className="w-full min-w-0 lg:col-span-2">
            <PremiumFeatureGuard feature="advancedAnalytics" className="w-full h-full">
              <RevenueChart />
            </PremiumFeatureGuard>
          </div>
          <div className="w-full min-w-0">
            <AttendanceChart />
          </div>
        </div>
      )}

      {/* Secondary content */}
      {canViewFinances ? (
        <div className="grid items-start gap-4 sm:gap-6 lg:grid-cols-2">
          <div className="space-y-4 sm:space-y-6">
            <PaymentStatus />
            <StudentOverview />
          </div>
          <div className="space-y-4 sm:space-y-6">
            <UpcomingLessons />
            <AttendanceOverview />
          </div>
        </div>
      ) : (
        <>
          <div className="grid items-stretch gap-4 sm:gap-6 lg:grid-cols-2">
            <UpcomingLessons />
            <AttendanceChart />
          </div>
          <div className="mt-4 grid items-stretch gap-4 sm:mt-6 sm:gap-6 lg:grid-cols-2">
            <StudentOverview />
            <AttendanceOverview />
          </div>
        </>
      )}
    </DashboardLayout>
  );
}
