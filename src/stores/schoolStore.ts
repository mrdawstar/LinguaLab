import { create } from 'zustand';

export interface Student {
  id: string;
  name: string;
  email: string;
  phone: string;
  language: string;
  level: string;
  pricePerHour: number;
  teacherId?: string;
  groupId?: string;
  status: 'active' | 'inactive' | 'paused';
  createdAt: Date;
}

export interface Teacher {
  id: string;
  name: string;
  email: string;
  phone: string;
  languages: string[];
  color: string;
}

export interface Group {
  id: string;
  name: string;
  language: string;
  level: string;
  teacherId: string;
  studentIds: string[];
  pricePerHour: number;
  maxStudents: number;
}

export interface Lesson {
  id: string;
  title: string;
  teacherId: string;
  studentId?: string;
  groupId?: string;
  date: Date;
  startTime: string;
  endTime: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  notes?: string;
  attendance?: Record<string, boolean>;
}

interface SchoolStore {
  students: Student[];
  teachers: Teacher[];
  groups: Group[];
  lessons: Lesson[];
  
  // Students
  addStudent: (student: Omit<Student, 'id' | 'createdAt'>) => void;
  updateStudent: (id: string, data: Partial<Student>) => void;
  deleteStudent: (id: string) => void;
  
  // Teachers
  addTeacher: (teacher: Omit<Teacher, 'id'>) => void;
  updateTeacher: (id: string, data: Partial<Teacher>) => void;
  deleteTeacher: (id: string) => void;
  
  // Groups
  addGroup: (group: Omit<Group, 'id'>) => void;
  updateGroup: (id: string, data: Partial<Group>) => void;
  deleteGroup: (id: string) => void;
  
  // Lessons
  addLesson: (lesson: Omit<Lesson, 'id'>) => void;
  updateLesson: (id: string, data: Partial<Lesson>) => void;
  deleteLesson: (id: string) => void;
}

// Start with empty data - no demo data for new schools
const demoTeachers: Teacher[] = [];
const demoStudents: Student[] = [];
const demoGroups: Group[] = [];
const demoLessons: Lesson[] = [];

export const useSchoolStore = create<SchoolStore>((set) => ({
  students: demoStudents,
  teachers: demoTeachers,
  groups: demoGroups,
  lessons: demoLessons,
  
  // Students
  addStudent: (student) => set((state) => ({
    students: [...state.students, { ...student, id: `s${Date.now()}`, createdAt: new Date() }]
  })),
  updateStudent: (id, data) => set((state) => ({
    students: state.students.map(s => s.id === id ? { ...s, ...data } : s)
  })),
  deleteStudent: (id) => set((state) => ({
    students: state.students.filter(s => s.id !== id)
  })),
  
  // Teachers
  addTeacher: (teacher) => set((state) => ({
    teachers: [...state.teachers, { ...teacher, id: `t${Date.now()}` }]
  })),
  updateTeacher: (id, data) => set((state) => ({
    teachers: state.teachers.map(t => t.id === id ? { ...t, ...data } : t)
  })),
  deleteTeacher: (id) => set((state) => ({
    teachers: state.teachers.filter(t => t.id !== id)
  })),
  
  // Groups
  addGroup: (group) => set((state) => ({
    groups: [...state.groups, { ...group, id: `g${Date.now()}` }]
  })),
  updateGroup: (id, data) => set((state) => ({
    groups: state.groups.map(g => g.id === id ? { ...g, ...data } : g)
  })),
  deleteGroup: (id) => set((state) => ({
    groups: state.groups.filter(g => g.id !== id)
  })),
  
  // Lessons
  addLesson: (lesson) => set((state) => ({
    lessons: [...state.lessons, { ...lesson, id: `l${Date.now()}` }]
  })),
  updateLesson: (id, data) => set((state) => ({
    lessons: state.lessons.map(l => l.id === id ? { ...l, ...data } : l)
  })),
  deleteLesson: (id) => set((state) => ({
    lessons: state.lessons.filter(l => l.id !== id)
  })),
}));
