import { useState, useEffect } from 'react';
import { Search, User, Users, Loader2, Mail, Phone } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { useSearchParams, useNavigate } from 'react-router-dom';

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
  userPrimaryColor: string | null;
}

export default function TeacherStudents() {
  const { user, profile } = useAuth();
  const { preferences } = useUserPreferences();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [students, setStudents] = useState<Student[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [viewingGroup, setViewingGroup] = useState<Group | null>(null);
  const [userPrimaryColor, setUserPrimaryColor] = useState<string>('#3b82f6');
  
  // Get active tab from URL or default to 'students'
  const activeTab = searchParams.get('tab') || 'students';
  
  // Handle tab change
  const handleTabChange = (value: string) => {
    const newSearchParams = new URLSearchParams(searchParams);
    if (value === 'students') {
      newSearchParams.delete('tab');
    } else {
      newSearchParams.set('tab', value);
    }
    setSearchParams(newSearchParams, { replace: true });
  };

  useEffect(() => {
    if (!user) return;
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Update color when preferences change (for real-time updates after initial load)
  useEffect(() => {
    if (preferences?.primary_color) {
      setUserPrimaryColor(preferences.primary_color);
    }
  }, [preferences?.primary_color]);

  const fetchData = async () => {
    try {
      // Fetch teacher data and user preferences in parallel to get color immediately
      const [teacherResult, preferencesResult] = await Promise.all([
        supabase
          .from('teachers')
          .select('id')
          .eq('user_id', user?.id)
          .maybeSingle(),
        supabase
          .from('user_preferences')
          .select('primary_color')
          .eq('user_id', user?.id)
          .maybeSingle()
      ]);

      const { data: teacherData, error: teacherError } = teacherResult;
      const { data: preferencesData } = preferencesResult;

      // Get primary color immediately - use it directly in mapping, not from state
      const primaryColor = preferencesData?.primary_color || '#3b82f6';
      
      // Set primary color in state for use in render
      setUserPrimaryColor(primaryColor);

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

      // Map groups with their students - use primaryColor directly from fetch
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
        userPrimaryColor: primaryColor,
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
      s.email.toLowerCase().includes(search.toLowerCase()) ||
      s.language.toLowerCase().includes(search.toLowerCase()) ||
      (s.phone && s.phone.toLowerCase().includes(search.toLowerCase()))
  );

  const filteredGroups = groups.filter(
    (g) =>
      g.name.toLowerCase().includes(search.toLowerCase()) ||
      g.language.toLowerCase().includes(search.toLowerCase()) ||
      g.students.some(s => 
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.email.toLowerCase().includes(search.toLowerCase())
      )
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

            <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
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
                        className="glass-card-hover p-4 cursor-pointer"
                        onClick={() => setViewingGroup(group)}
                      >
                        <div className="flex items-start gap-3">
                          <div 
                            className="flex h-10 w-10 items-center justify-center rounded-full text-white flex-shrink-0"
                            style={{ backgroundColor: group.userPrimaryColor || userPrimaryColor }}
                          >
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
                              <div className="mt-3 space-y-2 border-t border-border/50 pt-3">
                                <p className="text-xs font-medium text-muted-foreground mb-2">Uczniowie w grupie:</p>
                                {group.students.slice(0, 5).map((student) => (
                                  <div key={student.id} className="flex items-center gap-2 text-sm">
                                    <div className="avatar-bubble h-6 w-6 text-xs flex-shrink-0">
                                      {student.name.split(' ').map((n) => n[0]).join('')}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <span className="font-medium text-foreground truncate block">{student.name}</span>
                                      {student.email && (
                                        <span className="text-xs text-muted-foreground truncate block">{student.email}</span>
                                      )}
                                    </div>
                                  </div>
                                ))}
                                {group.students.length > 5 && (
                                  <p className="text-xs text-muted-foreground mt-2">
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

      {/* Group Details Sheet */}
      <Sheet open={!!viewingGroup} onOpenChange={(open) => !open && setViewingGroup(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          {viewingGroup && (
            <>
              <SheetHeader className="text-left">
                <div className="flex items-center gap-4">
                  <div 
                    className="flex h-16 w-16 items-center justify-center rounded-full text-white flex-shrink-0"
                    style={{ backgroundColor: viewingGroup.userPrimaryColor || userPrimaryColor }}
                  >
                    <Users className="h-8 w-8" />
                  </div>
                  <div>
                    <SheetTitle className="text-xl">{viewingGroup.name}</SheetTitle>
                    <div className="mt-1 flex flex-wrap gap-1">
                      <Badge variant="secondary" className="text-xs">
                        {viewingGroup.language}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        {viewingGroup.level}
                      </Badge>
                    </div>
                  </div>
                </div>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                {/* Group Info */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg border border-border bg-card p-3">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Users className="h-4 w-4" />
                      <span className="text-xs">Uczniowie</span>
                    </div>
                    <p className="mt-1 font-medium">
                      {viewingGroup.students.length} / {viewingGroup.maxStudents}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border bg-card p-3">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <User className="h-4 w-4" />
                      <span className="text-xs">Język</span>
                    </div>
                    <p className="mt-1 truncate font-medium">{viewingGroup.language}</p>
                  </div>
                </div>

                <Separator />

                {/* Students List */}
                <div>
                  <h4 className="mb-3 text-sm font-medium text-foreground">
                    Uczniowie w grupie ({viewingGroup.students.length})
                  </h4>
                  {viewingGroup.students.length > 0 ? (
                    <div className="max-h-96 space-y-2 overflow-y-auto scrollbar-none pr-1">
                      {viewingGroup.students.map((student) => (
                        <div key={student.id} className="rounded-lg border border-border bg-card p-3 hover:bg-muted/30 transition-colors">
                          <div className="flex items-start gap-3">
                            <div className="avatar-bubble h-10 w-10 text-sm flex-shrink-0">
                              {student.name.split(' ').map((n) => n[0]).join('')}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-foreground">{student.name}</p>
                              <div className="mt-1 space-y-1">
                                {student.email && (
                                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Mail className="h-3 w-3" />
                                    <span className="truncate">{student.email}</span>
                                  </div>
                                )}
                                {student.phone && (
                                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Phone className="h-3 w-3" />
                                    <span>{student.phone}</span>
                                  </div>
                                )}
                                <div className="mt-2 flex items-center gap-2">
                                  <Badge variant="secondary" className="text-xs">
                                    {student.language}
                                  </Badge>
                                  <Badge variant="outline" className="text-xs">
                                    {student.level}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Brak uczniów w grupie</p>
                  )}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </DashboardLayout>
  );
}
