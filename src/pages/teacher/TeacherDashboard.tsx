import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { TeacherStats } from '@/components/teacher/TeacherStats';
import { TodayLessons } from '@/components/teacher/TodayLessons';
import { MyGroups } from '@/components/teacher/MyGroups';
import { useAuth } from '@/contexts/AuthContext';

export default function TeacherDashboard() {
  const { profile } = useAuth();
  
  return (
    <DashboardLayout 
      title="Panel nauczyciela" 
      subtitle={`Dzień dobry, ${profile?.full_name || 'Nauczycielu'}!`}
      requiredRole="teacher"
    >
      {/* Stats */}
      <div className="mb-6">
        <TeacherStats />
      </div>

      {/* Main content grid */}
      <div className="grid gap-6 lg:grid-cols-5">
        {/* Today's lessons - main focus */}
        <div className="lg:col-span-3">
          <h2 className="mb-4 text-lg font-semibold text-foreground">
            Dzisiejsze zajęcia
          </h2>
          <TodayLessons />
        </div>

        {/* Sidebar content */}
        <div className="lg:col-span-2">
          <MyGroups />
        </div>
      </div>
    </DashboardLayout>
  );
}
