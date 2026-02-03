export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      groups: {
        Row: {
          created_at: string
          id: string
          language: string
          level: string
          max_students: number | null
          name: string
          price_per_hour: number | null
          school_id: string
          teacher_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          language: string
          level: string
          max_students?: number | null
          name: string
          price_per_hour?: number | null
          school_id: string
          teacher_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          language?: string
          level?: string
          max_students?: number | null
          name?: string
          price_per_hour?: number | null
          school_id?: string
          teacher_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "groups_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "groups_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          role: Database["public"]["Enums"]["app_role"]
          school_id: string
          token: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by: string
          role: Database["public"]["Enums"]["app_role"]
          school_id: string
          token?: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          role?: Database["public"]["Enums"]["app_role"]
          school_id?: string
          token?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invitations_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_attendance: {
        Row: {
          attended: boolean
          comment: string | null
          created_at: string
          id: string
          lesson_id: string
          package_purchase_id: string | null
          revenue_amount: number | null
          student_id: string
          updated_at: string
        }
        Insert: {
          attended?: boolean
          comment?: string | null
          created_at?: string
          id?: string
          lesson_id: string
          package_purchase_id?: string | null
          revenue_amount?: number | null
          student_id: string
          updated_at?: string
        }
        Update: {
          attended?: boolean
          comment?: string | null
          created_at?: string
          id?: string
          lesson_id?: string
          package_purchase_id?: string | null
          revenue_amount?: number | null
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_attendance_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_attendance_package_purchase_id_fkey"
            columns: ["package_purchase_id"]
            isOneToOne: false
            referencedRelation: "package_purchases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_attendance_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      lessons: {
        Row: {
          created_at: string
          date: string
          end_time: string
          group_id: string | null
          id: string
          is_completed: boolean | null
          notes: string | null
          school_id: string
          start_time: string
          student_id: string | null
          teacher_id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          date: string
          end_time: string
          group_id?: string | null
          id?: string
          is_completed?: boolean | null
          notes?: string | null
          school_id: string
          start_time: string
          student_id?: string | null
          teacher_id: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          date?: string
          end_time?: string
          group_id?: string | null
          id?: string
          is_completed?: boolean | null
          notes?: string | null
          school_id?: string
          start_time?: string
          student_id?: string | null
          teacher_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lessons_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lessons_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lessons_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lessons_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      package_purchases: {
        Row: {
          created_at: string
          created_by: string | null
          expires_at: string | null
          hours_purchased: number
          id: string
          lessons_total: number | null
          lessons_used: number | null
          price_per_hour: number | null
          price_per_lesson: number | null
          purchase_date: string
          school_id: string
          status: string | null
          student_id: string
          teacher_id: string | null
          total_amount: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          hours_purchased: number
          id?: string
          lessons_total?: number | null
          lessons_used?: number | null
          price_per_hour?: number | null
          price_per_lesson?: number | null
          purchase_date?: string
          school_id: string
          status?: string | null
          student_id: string
          teacher_id?: string | null
          total_amount: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          hours_purchased?: number
          id?: string
          lessons_total?: number | null
          lessons_used?: number | null
          price_per_hour?: number | null
          price_per_lesson?: number | null
          purchase_date?: string
          school_id?: string
          status?: string | null
          student_id?: string
          teacher_id?: string | null
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "package_purchases_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "package_purchases_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string | null
          id: string
          package_lessons: number | null
          package_purchase_id: string | null
          payment_date: string | null
          payment_type: string | null
          school_id: string
          status: string
          student_id: string
          teacher_id: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          package_lessons?: number | null
          package_purchase_id?: string | null
          payment_date?: string | null
          payment_type?: string | null
          school_id: string
          status?: string
          student_id: string
          teacher_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          package_lessons?: number | null
          package_purchase_id?: string | null
          payment_date?: string | null
          payment_type?: string | null
          school_id?: string
          status?: string
          student_id?: string
          teacher_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_package_purchase_id_fkey"
            columns: ["package_purchase_id"]
            isOneToOne: false
            referencedRelation: "package_purchases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          school_id: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          school_id?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          school_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      school_settings: {
        Row: {
          created_at: string
          currency: string | null
          default_price_per_hour: number | null
          email_notifications: boolean | null
          id: string
          lesson_duration_minutes: number | null
          school_id: string
          sms_notifications: boolean | null
          timezone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency?: string | null
          default_price_per_hour?: number | null
          email_notifications?: boolean | null
          id?: string
          lesson_duration_minutes?: number | null
          school_id: string
          sms_notifications?: boolean | null
          timezone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string | null
          default_price_per_hour?: number | null
          email_notifications?: boolean | null
          id?: string
          lesson_duration_minutes?: number | null
          school_id?: string
          sms_notifications?: boolean | null
          timezone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_settings_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: true
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      schools: {
        Row: {
          accent_color: string | null
          created_at: string
          id: string
          logo_url: string | null
          name: string
          primary_color: string | null
          secondary_color: string | null
          stripe_customer_id: string | null
          subscription_ends_at: string | null
          subscription_plan: string | null
          subscription_status: string | null
          trial_ends_at: string | null
          updated_at: string
        }
        Insert: {
          accent_color?: string | null
          created_at?: string
          id?: string
          logo_url?: string | null
          name: string
          primary_color?: string | null
          secondary_color?: string | null
          stripe_customer_id?: string | null
          subscription_ends_at?: string | null
          subscription_plan?: string | null
          subscription_status?: string | null
          trial_ends_at?: string | null
          updated_at?: string
        }
        Update: {
          accent_color?: string | null
          created_at?: string
          id?: string
          logo_url?: string | null
          name?: string
          primary_color?: string | null
          secondary_color?: string | null
          stripe_customer_id?: string | null
          subscription_ends_at?: string | null
          subscription_plan?: string | null
          subscription_status?: string | null
          trial_ends_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      students: {
        Row: {
          created_at: string
          email: string
          group_id: string | null
          id: string
          instagram: string | null
          language: string
          level: string
          name: string
          package_expires_at: string | null
          package_hours: number | null
          package_used_hours: number | null
          payment_status: string | null
          phone: string | null
          price_per_hour: number | null
          school_id: string
          status: string | null
          teacher_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          group_id?: string | null
          id?: string
          instagram?: string | null
          language: string
          level: string
          name: string
          package_expires_at?: string | null
          package_hours?: number | null
          package_used_hours?: number | null
          payment_status?: string | null
          phone?: string | null
          price_per_hour?: number | null
          school_id: string
          status?: string | null
          teacher_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          group_id?: string | null
          id?: string
          instagram?: string | null
          language?: string
          level?: string
          name?: string
          package_expires_at?: string | null
          package_hours?: number | null
          package_used_hours?: number | null
          payment_status?: string | null
          phone?: string | null
          price_per_hour?: number | null
          school_id?: string
          status?: string | null
          teacher_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "students_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      teachers: {
        Row: {
          calendar_color: string | null
          created_at: string
          email: string
          id: string
          instagram: string | null
          languages: string[] | null
          meeting_link: string | null
          name: string
          phone: string | null
          school_id: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          calendar_color?: string | null
          created_at?: string
          email: string
          id?: string
          instagram?: string | null
          languages?: string[] | null
          meeting_link?: string | null
          name: string
          phone?: string | null
          school_id: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          calendar_color?: string | null
          created_at?: string
          email?: string
          id?: string
          instagram?: string | null
          languages?: string[] | null
          meeting_link?: string | null
          name?: string
          phone?: string | null
          school_id?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "teachers_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      user_preferences: {
        Row: {
          accent_color: string | null
          created_at: string
          id: string
          primary_color: string | null
          secondary_color: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          accent_color?: string | null
          created_at?: string
          id?: string
          primary_color?: string | null
          secondary_color?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          accent_color?: string | null
          created_at?: string
          id?: string
          primary_color?: string | null
          secondary_color?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_invitation_by_token: {
        Args: { _token: string }
        Returns: {
          email: string
          expires_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          school_id: string
          token: string
        }[]
      }
      get_user_school_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      update_student_payment_status: {
        Args: { _student_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "teacher" | "manager"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "teacher", "manager"],
    },
  },
} as const
