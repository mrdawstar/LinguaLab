import { useState, useEffect, useCallback } from 'react';
import { Users, Calendar, TrendingUp, Loader2, ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';

interface Group {
  id: string;
  name: string;
  language: string;
  level: string;
  studentCount: number;
  attendance: number;
  nextLesson: string | null;
}

export function MyGroups() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState<Group[]>([]);

  const fetchGroups = useCallback(async () => {
    try {
      // Fetch groups assigned to this teacher (RLS handles the filtering)
      const { data: groupsData, error } = await supabase
        .from('groups')
        .select(`
          id,
          name,
          language,
          level,
          teacher_id
        `);

      if (error) throw error;

      if (!groupsData || groupsData.length === 0) {
        setGroups([]);
        setLoading(false);
        return;
      }

      // Get student counts and next lessons for each group
      const enrichedGroups = await Promise.all(
        groupsData.map(async (group) => {
          // Get student count
          const { count: studentCount } = await supabase
            .from('students')
            .select('id', { count: 'exact', head: true })
            .eq('group_id', group.id);

          // Get next lesson
          const today = format(new Date(), 'yyyy-MM-dd');
          const { data: nextLessonData } = await supabase
            .from('lessons')
            .select('date, start_time')
            .eq('group_id', group.id)
            .gte('date', today)
            .order('date', { ascending: true })
            .order('start_time', { ascending: true })
            .limit(1);

          // Get attendance for this group's lessons
          const { data: lessonsData } = await supabase
            .from('lessons')
            .select('id')
            .eq('group_id', group.id);

          let attendance = 0;
          if (lessonsData && lessonsData.length > 0) {
            const lessonIds = lessonsData.map(l => l.id);
            const { data: attendanceData } = await supabase
              .from('lesson_attendance')
              .select('attended')
              .in('lesson_id', lessonIds);

            if (attendanceData && attendanceData.length > 0) {
              const presentCount = attendanceData.filter(a => a.attended).length;
              attendance = Math.round((presentCount / attendanceData.length) * 100);
            }
          }

          let nextLesson: string | null = null;
          if (nextLessonData && nextLessonData.length > 0) {
            const lessonDate = new Date(nextLessonData[0].date);
            const isToday = format(lessonDate, 'yyyy-MM-dd') === today;
            nextLesson = isToday 
              ? `Dzisiaj, ${nextLessonData[0].start_time.slice(0, 5)}`
              : `${format(lessonDate, 'dd.MM')}, ${nextLessonData[0].start_time.slice(0, 5)}`;
          }

          return {
            id: group.id,
            name: group.name,
            language: group.language,
            level: group.level,
            studentCount: studentCount || 0,
            attendance,
            nextLesson,
          };
        })
      );

      setGroups(enrichedGroups);
    } catch (error) {
      console.error('Error fetching groups:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    fetchGroups();
  }, [user, fetchGroups]);

  if (loading) {
    return (
      <div className="glass-card flex h-64 items-center justify-center p-6">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <div className="glass-card p-6 animate-fade-in">
        <h3 className="mb-4 text-lg font-semibold text-foreground">Moje grupy</h3>
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <Users className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground">Brak przypisanych grup</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Grupy pojawią się po przypisaniu przez administratora
          </p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="glass-card p-6 animate-fade-in cursor-pointer group hover:shadow-md transition-all"
      onClick={() => navigate('/teacher/students?tab=groups')}
    >
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
          Moje grupy
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">{groups.length} grup</span>
          <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {groups.map((group) => (
          <div
            key={group.id}
            className="rounded-xl border border-border/50 p-4 transition-all hover:border-primary/30 hover:shadow-md"
          >
            <h4 className="font-semibold text-foreground">{group.name}</h4>
            <div className="mt-1 flex items-center gap-2">
              <span className="rounded bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                {group.language}
              </span>
              <span className="rounded bg-muted px-2 py-0.5 text-xs">
                {group.level}
              </span>
            </div>
            
            <div className="mt-3 space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="h-4 w-4" />
                <span>{group.studentCount} uczniów</span>
              </div>
              {group.nextLesson && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>{group.nextLesson}</span>
                </div>
              )}
              {group.attendance > 0 && (
                <div className="flex items-center gap-2 text-sm">
                  <TrendingUp className="h-4 w-4 text-success" />
                  <span className="text-success">{group.attendance}% frekwencja</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
