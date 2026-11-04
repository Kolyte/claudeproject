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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      applications: {
        Row: {
          applicant_id: string
          created_at: string
          id: string
          message: string
          need_id: string
          status: string
          updated_at: string
        }
        Insert: {
          applicant_id?: string
          created_at?: string
          id?: string
          message: string
          need_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          applicant_id?: string
          created_at?: string
          id?: string
          message?: string
          need_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "applications_applicant_id_fkey"
            columns: ["applicant_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_need_id_fkey"
            columns: ["need_id"]
            isOneToOne: false
            referencedRelation: "project_needs"
            referencedColumns: ["id"]
          },
        ]
      }
      milestones: {
        Row: {
          achieved_at: string
          created_at: string
          description: string
          evidence_url: string | null
          id: string
          project_id: string
          title: string
          verification: string
        }
        Insert: {
          achieved_at: string
          created_at?: string
          description: string
          evidence_url?: string | null
          id?: string
          project_id: string
          title: string
          verification?: string
        }
        Update: {
          achieved_at?: string
          created_at?: string
          description?: string
          evidence_url?: string | null
          id?: string
          project_id?: string
          title?: string
          verification?: string
        }
        Relationships: [
          {
            foreignKeyName: "milestones_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          bio: string
          created_at: string
          declared_skills: string[]
          display_name: string
          hours_per_week: number | null
          id: string
          interests: string[]
          location: string
          participation_types: string[]
          updated_at: string
          work_modes: string[]
        }
        Insert: {
          bio?: string
          created_at?: string
          declared_skills?: string[]
          display_name?: string
          hours_per_week?: number | null
          id?: string
          interests?: string[]
          location?: string
          participation_types?: string[]
          updated_at?: string
          work_modes?: string[]
        }
        Update: {
          bio?: string
          created_at?: string
          declared_skills?: string[]
          display_name?: string
          hours_per_week?: number | null
          id?: string
          interests?: string[]
          location?: string
          participation_types?: string[]
          updated_at?: string
          work_modes?: string[]
        }
        Relationships: []
      }
      project_needs: {
        Row: {
          compensation: string
          created_at: string
          description: string
          desirable_skills: string[]
          hours_per_week: number
          id: string
          location: string
          participation_type: string
          project_id: string
          required_skills: string[]
          status: string
          title: string
          work_mode: string
        }
        Insert: {
          compensation?: string
          created_at?: string
          description: string
          desirable_skills?: string[]
          hours_per_week: number
          id?: string
          location: string
          participation_type: string
          project_id: string
          required_skills?: string[]
          status?: string
          title: string
          work_mode: string
        }
        Update: {
          compensation?: string
          created_at?: string
          description?: string
          desirable_skills?: string[]
          hours_per_week?: number
          id?: string
          location?: string
          participation_type?: string
          project_id?: string
          required_skills?: string[]
          status?: string
          title?: string
          work_mode?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_needs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_posts: {
        Row: {
          author_id: string
          body: string
          created_at: string
          id: string
          project_id: string
          type: string
        }
        Insert: {
          author_id?: string
          body: string
          created_at?: string
          id?: string
          project_id: string
          type: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          project_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_posts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          created_at: string
          id: string
          location: string
          owner_display_name: string
          owner_id: string
          pitch: string
          problem: string
          sector: string
          solution: string
          stage: string
          status: string
          title: string
          updated_at: string
          visibility: string
        }
        Insert: {
          created_at?: string
          id?: string
          location?: string
          owner_display_name?: string
          owner_id?: string
          pitch?: string
          problem?: string
          sector?: string
          solution?: string
          stage?: string
          status?: string
          title?: string
          updated_at?: string
          visibility?: string
        }
        Update: {
          created_at?: string
          id?: string
          location?: string
          owner_display_name?: string
          owner_id?: string
          pitch?: string
          problem?: string
          sector?: string
          solution?: string
          stage?: string
          status?: string
          title?: string
          updated_at?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      application_review_summary: {
        Args: { application_id: string }
        Returns: Json
      }
      discover_projects: {
        Args: {
          filter_location?: string
          filter_q?: string
          filter_sector?: string
          filter_skill?: string
          filter_stage?: string
        }
        Returns: {
          created_at: string
          id: string
          last_substantive_update_at: string
          location: string
          open_needs_count: number
          owner_display_name: string
          pitch: string
          required_skills: string[]
          sector: string
          stage: string
          status: string
          title: string
        }[]
      }
      valid_text_list: {
        Args: { items: string[]; max_count?: number }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never
