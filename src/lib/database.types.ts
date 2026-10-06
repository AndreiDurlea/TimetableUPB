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
    PostgrestVersion: "14.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      academic_calendar: {
        Row: {
          created_at: string | null
          description: string | null
          end_date: string
          id: string
          name: string
          start_date: string
          type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          end_date: string
          id?: string
          name: string
          start_date: string
          type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          end_date?: string
          id?: string
          name?: string
          start_date?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      buildings: {
        Row: {
          color: string
          full_name: string | null
          id: string
          shorthand: string
        }
        Insert: {
          color?: string
          full_name?: string | null
          id?: string
          shorthand: string
        }
        Update: {
          color?: string
          full_name?: string | null
          id?: string
          shorthand?: string
        }
        Relationships: []
      }
      classes: {
        Row: {
          class_type: string
          day_of_week: number
          domain_id: string | null
          end_time: string
          faculty_id: string | null
          frequency: string
          group_id: string | null
          id: string
          name: string
          room_id: string | null
          series_id: string | null
          shorthand: string | null
          start_time: string
          subgroup_id: string | null
          teacher_id: string | null
        }
        Insert: {
          class_type: string
          day_of_week: number
          domain_id?: string | null
          end_time: string
          faculty_id?: string | null
          frequency: string
          group_id?: string | null
          id?: string
          name: string
          room_id?: string | null
          series_id?: string | null
          shorthand?: string | null
          start_time: string
          subgroup_id?: string | null
          teacher_id?: string | null
        }
        Update: {
          class_type?: string
          day_of_week?: number
          domain_id?: string | null
          end_time?: string
          faculty_id?: string | null
          frequency?: string
          group_id?: string | null
          id?: string
          name?: string
          room_id?: string | null
          series_id?: string | null
          shorthand?: string | null
          start_time?: string
          subgroup_id?: string | null
          teacher_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "classes_domain_id_fkey"
            columns: ["domain_id"]
            isOneToOne: false
            referencedRelation: "domains"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classes_faculty_id_fkey"
            columns: ["faculty_id"]
            isOneToOne: false
            referencedRelation: "faculties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classes_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classes_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classes_series_id_fkey"
            columns: ["series_id"]
            isOneToOne: false
            referencedRelation: "series"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classes_subgroup_id_fkey"
            columns: ["subgroup_id"]
            isOneToOne: false
            referencedRelation: "subgroups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classes_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      domains: {
        Row: {
          faculty_id: string
          id: string
          name: string
        }
        Insert: {
          faculty_id: string
          id?: string
          name: string
        }
        Update: {
          faculty_id?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "domains_faculty_id_fkey"
            columns: ["faculty_id"]
            isOneToOne: false
            referencedRelation: "faculties"
            referencedColumns: ["id"]
          },
        ]
      }
      faculties: {
        Row: {
          full_name: string
          id: string
          shorthand: string
        }
        Insert: {
          full_name: string
          id?: string
          shorthand: string
        }
        Update: {
          full_name?: string
          id?: string
          shorthand?: string
        }
        Relationships: []
      }
      groups: {
        Row: {
          id: string
          name: string
          series_id: string
        }
        Insert: {
          id?: string
          name: string
          series_id: string
        }
        Update: {
          id?: string
          name?: string
          series_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "groups_series_id_fkey"
            columns: ["series_id"]
            isOneToOne: false
            referencedRelation: "series"
            referencedColumns: ["id"]
          },
        ]
      }
      holidays: {
        Row: {
          created_at: string | null
          description: string | null
          end_date: string
          id: string
          name: string
          start_date: string
          type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          end_date: string
          id?: string
          name: string
          start_date: string
          type?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          end_date?: string
          id?: string
          name?: string
          start_date?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          id: string
          is_admin: boolean | null
          subgroup_id: string | null
        }
        Insert: {
          id: string
          is_admin?: boolean | null
          subgroup_id?: string | null
        }
        Update: {
          id?: string
          is_admin?: boolean | null
          subgroup_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_subgroup_id_fkey"
            columns: ["subgroup_id"]
            isOneToOne: false
            referencedRelation: "subgroups"
            referencedColumns: ["id"]
          },
        ]
      }
      rooms: {
        Row: {
          building_id: string | null
          id: string
          name: string | null
          room_index: string | null
        }
        Insert: {
          building_id?: string | null
          id?: string
          name?: string | null
          room_index?: string | null
        }
        Update: {
          building_id?: string | null
          id?: string
          name?: string | null
          room_index?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rooms_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
        ]
      }
      series: {
        Row: {
          domain_id: string
          id: string
          name: string
        }
        Insert: {
          domain_id: string
          id?: string
          name: string
        }
        Update: {
          domain_id?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "series_domain_id_fkey"
            columns: ["domain_id"]
            isOneToOne: false
            referencedRelation: "domains"
            referencedColumns: ["id"]
          },
        ]
      }
      subgroups: {
        Row: {
          group_id: string
          id: string
          name: string
        }
        Insert: {
          group_id: string
          id?: string
          name: string
        }
        Update: {
          group_id?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "subgroups_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      teachers: {
        Row: {
          email: string | null
          id: string
          name: string | null
        }
        Insert: {
          email?: string | null
          id?: string
          name?: string | null
        }
        Update: {
          email?: string | null
          id?: string
          name?: string | null
        }
        Relationships: []
      }
      user_calendar_sync: {
        Row: {
          calendar_id: string
          calendar_name: string | null
          created_at: string | null
          refresh_token: string | null
          subgroup_id: string | null
          synced_at: string | null
          synced_class_ids: string[] | null
          synced_fingerprint: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          calendar_id: string
          calendar_name?: string | null
          created_at?: string | null
          refresh_token?: string | null
          subgroup_id?: string | null
          synced_at?: string | null
          synced_class_ids?: string[] | null
          synced_fingerprint?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          calendar_id?: string
          calendar_name?: string | null
          created_at?: string | null
          refresh_token?: string | null
          subgroup_id?: string | null
          synced_at?: string | null
          synced_class_ids?: string[] | null
          synced_fingerprint?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_calendar_sync_subgroup_id_fkey"
            columns: ["subgroup_id"]
            isOneToOne: false
            referencedRelation: "subgroups"
            referencedColumns: ["id"]
          },
        ]
      }
      user_classes: {
        Row: {
          class_id: string
          user_id: string
        }
        Insert: {
          class_id: string
          user_id: string
        }
        Update: {
          class_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_classes_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_classes_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "detailed_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_classes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_removed_classes: {
        Row: {
          class_id: string
          created_at: string
          user_id: string
        }
        Insert: {
          class_id: string
          created_at?: string
          user_id: string
        }
        Update: {
          class_id?: string
          created_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_removed_classes_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_removed_classes_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "detailed_classes"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      detailed_classes: {
        Row: {
          building_shorthand: string | null
          class_type: string | null
          day_of_week: number | null
          domain_id: string | null
          domain_name: string | null
          end_time: string | null
          faculty_id: string | null
          faculty_shorthand: string | null
          frequency: string | null
          group_id: string | null
          group_name: string | null
          id: string | null
          name: string | null
          resolved_domain_id: string | null
          resolved_faculty_id: string | null
          room_id: string | null
          room_index: string | null
          room_name: string | null
          series_id: string | null
          series_name: string | null
          shorthand: string | null
          start_time: string | null
          subgroup_id: string | null
          subgroup_name: string | null
          teacher_id: string | null
          teacher_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "classes_domain_id_fkey"
            columns: ["domain_id"]
            isOneToOne: false
            referencedRelation: "domains"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classes_faculty_id_fkey"
            columns: ["faculty_id"]
            isOneToOne: false
            referencedRelation: "faculties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classes_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classes_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classes_series_id_fkey"
            columns: ["series_id"]
            isOneToOne: false
            referencedRelation: "series"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classes_subgroup_id_fkey"
            columns: ["subgroup_id"]
            isOneToOne: false
            referencedRelation: "subgroups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classes_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      get_class_domain_id: { Args: { p_class_id: string }; Returns: string }
      get_relevant_classes: {
        Args: { p_subgroup_id: string }
        Returns: {
          class_type: string
          day_of_week: number
          domain_id: string | null
          end_time: string
          faculty_id: string | null
          frequency: string
          group_id: string | null
          id: string
          name: string
          room_id: string | null
          series_id: string | null
          shorthand: string | null
          start_time: string
          subgroup_id: string | null
          teacher_id: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "classes"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_subgroup_id_from_hierarchy: {
        Args: {
          p_domain_name: string
          p_faculty_shorthand: string
          p_group_name: string
          p_series_name: string
          p_subgroup_name: string
        }
        Returns: {
          domain_id: string
          faculty_id: string
          group_id: string
          series_id: string
          subgroup_id: string
        }[]
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

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
