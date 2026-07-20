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
  public: {
    Tables: {
      comments: {
        Row: {
          body: string
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      drivers: {
        Row: {
          color_key: string
          content: string | null
          created_at: string
          current_team_since: number | null
          current_team_slug: string | null
          flag: string
          former_teams: Json
          hero_media_url: string | null
          id: string
          info_card: string | null
          name: string
          number: number | null
          slug: string
          team_slug: string | null
          updated_at: string
        }
        Insert: {
          color_key: string
          content?: string | null
          created_at?: string
          current_team_since?: number | null
          current_team_slug?: string | null
          flag?: string
          former_teams?: Json
          hero_media_url?: string | null
          id?: string
          info_card?: string | null
          name: string
          number?: number | null
          slug: string
          team_slug?: string | null
          updated_at?: string
        }
        Update: {
          color_key?: string
          content?: string | null
          created_at?: string
          current_team_since?: number | null
          current_team_slug?: string | null
          flag?: string
          former_teams?: Json
          hero_media_url?: string | null
          id?: string
          info_card?: string | null
          name?: string
          number?: number | null
          slug?: string
          team_slug?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "drivers_team_slug_fkey"
            columns: ["team_slug"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["slug"]
          },
        ]
      }
      media_items: {
        Row: {
          caption: string
          created_at: string
          id: string
          scope: string
          sort_order: number
          updated_at: string
          url: string
        }
        Insert: {
          caption?: string
          created_at?: string
          id?: string
          scope: string
          sort_order?: number
          updated_at?: string
          url: string
        }
        Update: {
          caption?: string
          created_at?: string
          id?: string
          scope?: string
          sort_order?: number
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      news: {
        Row: {
          content: string | null
          created_at: string
          excerpt: string | null
          hero_media_url: string | null
          id: string
          published_at: string
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          excerpt?: string | null
          hero_media_url?: string | null
          id?: string
          published_at?: string
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          content?: string | null
          created_at?: string
          excerpt?: string | null
          hero_media_url?: string | null
          id?: string
          published_at?: string
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
        }
        Relationships: []
      }
      races: {
        Row: {
          created_at: string
          flag: string
          id: string
          name: string
          qualifying_content: string | null
          qualifying_media_url: string | null
          race_content: string | null
          race_date: string | null
          race_media_url: string | null
          slug: string
          updated_at: string
          youtube_url: string | null
        }
        Insert: {
          created_at?: string
          flag?: string
          id?: string
          name: string
          qualifying_content?: string | null
          qualifying_media_url?: string | null
          race_content?: string | null
          race_date?: string | null
          race_media_url?: string | null
          slug: string
          updated_at?: string
          youtube_url?: string | null
        }
        Update: {
          created_at?: string
          flag?: string
          id?: string
          name?: string
          qualifying_content?: string | null
          qualifying_media_url?: string | null
          race_content?: string | null
          race_date?: string | null
          race_media_url?: string | null
          slug?: string
          updated_at?: string
          youtube_url?: string | null
        }
        Relationships: []
      }
      seasons: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      stats_pages: {
        Row: {
          content: string | null
          hero_media_url: string | null
          id: string
          title: string
          updated_at: string
        }
        Insert: {
          content?: string | null
          hero_media_url?: string | null
          id: string
          title: string
          updated_at?: string
        }
        Update: {
          content?: string | null
          hero_media_url?: string | null
          id?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      teams: {
        Row: {
          color_key: string
          content: string | null
          created_at: string
          flag: string
          hero_media_url: string | null
          id: string
          logo_url: string | null
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          color_key: string
          content?: string | null
          created_at?: string
          flag?: string
          hero_media_url?: string | null
          id?: string
          logo_url?: string | null
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          color_key?: string
          content?: string | null
          created_at?: string
          flag?: string
          hero_media_url?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          slug?: string
          updated_at?: string
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin"
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
      app_role: ["admin"],
    },
  },
} as const
