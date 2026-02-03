import { useState, useEffect } from 'react';
import { Search, User, Users, Loader2 } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Student {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  language: string;
  level: string;
}

interface Group {
  id: string;
  name: string;
  language: string;
  level: string;
  maxStudents: number;
  students: Student[];
}

export default function TeacherStudents() {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [students, setStudents] = useState<Student[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);

  useEffect(() => {
    if (!user) return;
    fetchData();
  }, [user]);

  const fetchData = async () => {
    try {
      const { data: teacherData, error: teacherError } = await supabase
        .from('teachers')
        .select('id')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (teacherError || !teacherData?.id) {
        setStudents([]);
        setGroups([]);
        return;
      }

      // Fetch students assigned directly to this teacher
      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select('id, name, email, phone, language, level, group_id, teacher_id')
        .eq('teacher_id', teacherData.id);

      if (studentsError) throw studentsError;

      // Fetch groups assigned to this teacher
      const { data: groupsData, error: groupsError } = await supabase
        .from('groups')
        .select('id, name, language, level, max_students, teacher_id')
        .eq('teacher_id', teacherData.id);

      if (groupsError) throw groupsError;

      // Fetch students in the teacher's groups
      const groupIds = (groupsData || []).map((g) => g.id);
      const { data: groupStudentsData } = groupIds.length
        ? await supabase
            .from('students')
            .select('id, name, email, phone, language, level, group_id')
            .in('group_id', groupIds)
        : { data: [] };

      // Map students to their data format (dedupe across direct + group)
      const combinedStudents = [...(studentsData || []), ...(groupStudentsData || [])];
      const uniqueStudents = Array.from(
        new Map(combinedStudents.map((s) => [s.id, s])).values()
      );
      const mappedStudents: Student[] = uniqueStudents.map((s) => ({
        id: s.id,
        name: s.name,
        email: s.email,
        phone: s.phone,
        language: s.language,
        level: s.level,
      }));

      // Map groups with their students
      const mappedGroups: Group[] = (groupsData || []).map(g => ({
        id: g.id,
        name: g.name,
        language: g.language,
        level: g.level,
        maxStudents: g.max_students || 10,
        students: (groupStudentsData || [])
          .filter(s => s.group_id === g.id)
          .map(s => ({
            id: s.id,
            name: s.name,
            email: s.email,
            phone: s.phone,
            language: s.language,
            level: s.level,
          })),
      }));

      setStudents(mappedStudents);
      setGroups(mappedGroups);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = students.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.language.toLowerCase().includes(search.toLowerCase())
  );

  const filteredGroups = groups.filter(
    (g) =>
      g.name.toLowerCase().includes(search.toLowerCase()) ||
      g.language.toLowerCase().includes(search.toLowerCase())
  );

  const totalStudentsCount = students.length + groups.reduce((acc, g) => acc + g.students.length, 0);

  if (loading) {
    return (
      <DashboardLayout title="Moi uczniowie" subtitle="Lista przypisanych uczniów i grup" requiredRole="teacher">
        <div className="flex h-96 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout 
      title="Moi uczniowie" 
      subtitle={`Witaj, ${profile?.full_name || 'Nauczycielu'}!`}
      requiredRole="teacher"
    >
      <div className="glass-card p-6">
        {totalStudentsCount === 0 && groups.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-muted">
              <Users className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold text-foreground">Brak przypisanych uczniów</h3>
            <p className="mt-2 max-w-md text-muted-foreground">
              Uczniowie i grupy pojawią się tutaj po przypisaniu przez administratora lub managera.
            </p>
          </div>
        ) : (
          <>
            {/* Search */}
            <div className="mb-6">
              <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Szukaj uczniów lub grup..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <Tabs defaultValue="students" className="w-full">
              <TabsList className="mb-4">
                <TabsTrigger value="students" className="gap-2">
                  <User className="h-4 w-4" />
                  Uczniowie ({students.length})
                </TabsTrigger>
                <TabsTrigger value="groups" className="gap-2">
                  <Users className="h-4 w-4" />
                  Grupy ({groups.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="students">
                {filteredStudents.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground">
                    {students.length === 0 
                      ? 'Brak przypisanych uczniów indywidualnych' 
                      : 'Brak wyników wyszukiwania'}
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {filteredStudents.map((student) => (
                      <div
                        key={student.id}
                        className="glass-card-hover p-4"
                      >
                        <div className="flex items-start gap-3">
                          <div className="avatar-bubble flex-shrink-0 text-xs">
                            {student.name.split(' ').map((n) => n[0]).join('')}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-foreground truncate">{student.name}</h3>
                            <p className="text-sm text-muted-foreground">{student.email}</p>
                            <div className="mt-2 flex items-center gap-2">
                              <span className="rounded bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                                {student.language}
                              </span>
                              <span className="rounded bg-muted px-2 py-0.5 text-xs">
                                {student.level}
                              </span>
                            </div>
                            {student.phone && (
                              <p className="mt-2 text-xs text-muted-foreground">{student.phone}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="groups">
                {filteredGroups.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground">
                    {groups.length === 0 
                      ? 'Brak przypisanych grup' 
                      : 'Brak wyników wyszukiwania'}
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {filteredGroups.map((group) => (
                      <div
                        key={group.id}
                        className="glass-card-hover p-4"
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/10 text-accent flex-shrink-0">
                            <Users className="h-5 w-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-foreground truncate">{group.name}</h3>
                            <div className="mt-1 flex items-center gap-2">
                              <span className="rounded bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                                {group.language}
                              </span>
                              <span className="rounded bg-muted px-2 py-0.5 text-xs">
                                {group.level}
                              </span>
                            </div>
                            <p className="mt-2 text-sm text-muted-foreground">
                              {group.students.length} / {group.maxStudents} uczniów
                            </p>
                            
                            {/* Lista uczniów w grupie */}
                            {group.students.length > 0 && (
                              <div className="mt-3 space-y-1">
                                {group.students.slice(0, 5).map((student) => (
                                  <div key={student.id} className="flex items-center gap-2 text-sm">
                                    <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-xs">
                                      {student.name.split(' ').map((n) => n[0]).join('')}
                                    </div>
                                    <span className="truncate">{student.name}</span>
                                  </div>
                                ))}
                                {group.students.length > 5 && (
                                  <p className="text-xs text-muted-foreground">
                                    +{group.students.length - 5} więcej
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
