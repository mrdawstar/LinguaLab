import { useState, useEffect, useCallback } from 'react';
import { BookOpen, Users, Clock, TrendingUp, Loader2 } from 'lucide-react';
import { StatCard } from '@/components/dashboard/StatCard';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { useNavigate } from 'react-router-dom';

export function TeacherStats() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    todayLessons: 0,
    completedToday: 0,
    totalStudents: 0,
    newStudentsThisMonth: 0,
    weeklyHours: 0,
    remainingHoursToday: 0,
    averageAttendance: 0,
    attendanceChange: 0,
  });

  const fetchStats = useCallback(async () => {
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
      const weekEnd = format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
      const monthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd');
      const monthEnd = format(endOfMonth(new Date()), 'yyyy-MM-dd');

      // Get teacher id for current user
      const { data: teacherData } = await supabase
        .from('teachers')
        .select('id')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (!teacherData) {
        setLoading(false);
        return;
      }

      // Fetch today's lessons
      const { data: todayLessonsData } = await supabase
        .from('lessons')
        .select('id, is_completed, start_time, end_time')
        .eq('teacher_id', teacherData.id)
        .eq('date', today);

      const todayLessons = todayLessonsData?.length || 0;
      const completedToday = todayLessonsData?.filter(l => l.is_completed)?.length || 0;

      // Calculate remaining hours today
      const now = new Date();
      const currentTime = format(now, 'HH:mm:ss');
      const remainingLessons = todayLessonsData?.filter(l => !l.is_completed && l.start_time > currentTime) || [];
      const remainingHoursToday = remainingLessons.reduce((acc, lesson) => {
        const start = new Date(`${today}T${lesson.start_time}`);
        const end = new Date(`${today}T${lesson.end_time}`);
        return acc + (end.getTime() - start.getTime()) / (1000 * 60 * 60);
      }, 0);

      // Fetch ONLY students assigned to this teacher (by teacher_id)
      const { count: studentCount, error: studentError } = await supabase
        .from('students')
        .select('id', { count: 'exact', head: true })
        .eq('teacher_id', teacherData.id);

      if (studentError) throw studentError;
      const totalStudents = studentCount || 0;

      // Fetch weekly lessons for hours calculation
      const { data: weeklyLessonsData } = await supabase
        .from('lessons')
        .select('id, start_time, end_time, date')
        .eq('teacher_id', teacherData.id)
        .gte('date', weekStart)
        .lte('date', weekEnd);

      const weeklyHours = weeklyLessonsData?.reduce((acc, lesson) => {
        const start = new Date(`${lesson.date}T${lesson.start_time}`);
        const end = new Date(`${lesson.date}T${lesson.end_time}`);
        return acc + (end.getTime() - start.getTime()) / (1000 * 60 * 60);
      }, 0) || 0;

      // Fetch attendance data
      const { data: attendanceData } = await supabase
        .from('lesson_attendance')
        .select('attended, lesson_id')
        .in('lesson_id', weeklyLessonsData?.map(l => l.id) || []);

      const totalAttendance = attendanceData?.length || 0;
      const presentCount = attendanceData?.filter(a => a.attended)?.length || 0;
      const averageAttendance = totalAttendance > 0 ? Math.round((presentCount / totalAttendance) * 100) : 0;

      setStats({
        todayLessons,
        completedToday,
        totalStudents,
        newStudentsThisMonth: 0,
        weeklyHours: Math.round(weeklyHours),
        remainingHoursToday: Math.round(remainingHoursToday),
        averageAttendance,
        attendanceChange: 0,
      });
    } catch (error) {
      console.error('Error fetching teacher stats:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    fetchStats();
  }, [user, fetchStats]);

  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="glass-card flex h-24 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ))}
      </div>
    );
  }

  // Show empty state if no data
  const hasData = stats.todayLessons > 0 || stats.totalStudents > 0 || stats.weeklyHours > 0;

  if (!hasData) {
    return (
      <div className="glass-card p-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <Users className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold text-foreground">Brak przypisanych danych</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Statystyki pojawią się po przypisaniu uczniów lub grup przez administratora.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Dzisiejsze zajęcia"
        value={stats.todayLessons.toString()}
        change={stats.completedToday > 0 ? `${stats.completedToday} zakończone` : 'Brak zakończonych'}
        changeType="neutral"
        icon={BookOpen}
        onClick={() => navigate('/teacher/lessons')}
      />
      <StatCard
        title="Moi uczniowie"
        value={stats.totalStudents.toString()}
        change="Przypisanych uczniów"
        changeType="neutral"
        icon={Users}
        onClick={() => navigate('/teacher/students')}
      />
      <StatCard
        title="Godziny w tym tygodniu"
        value={`${stats.weeklyHours}h`}
        change={stats.remainingHoursToday > 0 ? `${stats.remainingHoursToday}h pozostało dziś` : 'Brak zajęć dziś'}
        changeType="neutral"
        icon={Clock}
        onClick={() => navigate('/teacher/lessons')}
      />
      <StatCard
        title="Średnia frekwencja"
        value={stats.averageAttendance > 0 ? `${stats.averageAttendance}%` : '-'}
        change={stats.averageAttendance > 0 ? 'W tym tygodniu' : 'Brak danych'}
        changeType="neutral"
        icon={TrendingUp}
        onClick={() => navigate('/teacher/lessons')}
      />
    </div>
  );
}