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
      card_packs: {
        Row: {
          card_count: number
          created_at: string
          id: string
          opened: boolean
          result: Json | null
          session_id: string | null
          source: string
          updated_at: string
          user_id: string
        }
        Insert: {
          card_count?: number
          created_at?: string
          id?: string
          opened?: boolean
          result?: Json | null
          session_id?: string | null
          source?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          card_count?: number
          created_at?: string
          id?: string
          opened?: boolean
          result?: Json | null
          session_id?: string | null
          source?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "card_packs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "prediction_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      cards: {
        Row: {
          attack: number | null
          boost: number | null
          card_type: string
          created_at: string
          defense: number | null
          driver_number: number | null
          driver_slug: string | null
          id: string
          image_url: string
          is_booster: boolean
          race_flag: string | null
          race_name: string | null
          race_position: string | null
          season_slug: string | null
          serial_number: string
          team_slug: string | null
          updated_at: string
        }
        Insert: {
          attack?: number | null
          boost?: number | null
          card_type?: string
          created_at?: string
          defense?: number | null
          driver_number?: number | null
          driver_slug?: string | null
          id?: string
          image_url: string
          is_booster?: boolean
          race_flag?: string | null
          race_name?: string | null
          race_position?: string | null
          season_slug?: string | null
          serial_number: string
          team_slug?: string | null
          updated_at?: string
        }
        Update: {
          attack?: number | null
          boost?: number | null
          card_type?: string
          created_at?: string
          defense?: number | null
          driver_number?: number | null
          driver_slug?: string | null
          id?: string
          image_url?: string
          is_booster?: boolean
          race_flag?: string | null
          race_name?: string | null
          race_position?: string | null
          season_slug?: string | null
          serial_number?: string
          team_slug?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      club_join_requests: {
        Row: {
          club_id: string
          created_at: string
          id: string
          status: string
          user_id: string
        }
        Insert: {
          club_id: string
          created_at?: string
          id?: string
          status?: string
          user_id: string
        }
        Update: {
          club_id?: string
          created_at?: string
          id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "club_join_requests_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      club_members: {
        Row: {
          club_id: string
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          club_id: string
          created_at?: string
          id?: string
          role?: string
          user_id: string
        }
        Update: {
          club_id?: string
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "club_members_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      club_message_reactions: {
        Row: {
          created_at: string
          emoji: string
          id: string
          message_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji: string
          id?: string
          message_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          message_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "club_message_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "club_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      club_messages: {
        Row: {
          body: string
          club_id: string
          created_at: string
          id: string
          is_ai: boolean
          media_duration: number | null
          media_type: string | null
          media_url: string | null
          user_id: string | null
        }
        Insert: {
          body?: string
          club_id: string
          created_at?: string
          id?: string
          is_ai?: boolean
          media_duration?: number | null
          media_type?: string | null
          media_url?: string | null
          user_id?: string | null
        }
        Update: {
          body?: string
          club_id?: string
          created_at?: string
          id?: string
          is_ai?: boolean
          media_duration?: number | null
          media_type?: string | null
          media_url?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "club_messages_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      clubs: {
        Row: {
          ai_enabled: boolean
          code: string
          created_at: string
          description: string
          id: string
          name: string
          owner_id: string
          require_approval: boolean
          updated_at: string
          visibility: string
        }
        Insert: {
          ai_enabled?: boolean
          code: string
          created_at?: string
          description?: string
          id?: string
          name: string
          owner_id: string
          require_approval?: boolean
          updated_at?: string
          visibility?: string
        }
        Update: {
          ai_enabled?: boolean
          code?: string
          created_at?: string
          description?: string
          id?: string
          name?: string
          owner_id?: string
          require_approval?: boolean
          updated_at?: string
          visibility?: string
        }
        Relationships: []
      }
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
          current_team_is_reserve: boolean
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
          current_team_is_reserve?: boolean
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
          current_team_is_reserve?: boolean
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
      duel_drafts: {
        Row: {
          booster_pool: string[]
          created_at: string
          duel_pool: string[]
          id: string
          mode: string
          used: boolean
          user_id: string
        }
        Insert: {
          booster_pool?: string[]
          created_at?: string
          duel_pool: string[]
          id?: string
          mode: string
          used?: boolean
          user_id: string
        }
        Update: {
          booster_pool?: string[]
          created_at?: string
          duel_pool?: string[]
          id?: string
          mode?: string
          used?: boolean
          user_id?: string
        }
        Relationships: []
      }
      duel_matches: {
        Row: {
          booster: Json | null
          created_at: string
          draft_id: string | null
          id: string
          mode: string
          my_cards: Json
          opponent_cards: Json
          result: string
          rounds: Json
          season_points: number
          user_id: string
          vault_awarded: number
        }
        Insert: {
          booster?: Json | null
          created_at?: string
          draft_id?: string | null
          id?: string
          mode: string
          my_cards?: Json
          opponent_cards?: Json
          result: string
          rounds?: Json
          season_points?: number
          user_id: string
          vault_awarded?: number
        }
        Update: {
          booster?: Json | null
          created_at?: string
          draft_id?: string | null
          id?: string
          mode?: string
          my_cards?: Json
          opponent_cards?: Json
          result?: string
          rounds?: Json
          season_points?: number
          user_id?: string
          vault_awarded?: number
        }
        Relationships: [
          {
            foreignKeyName: "duel_matches_draft_id_fkey"
            columns: ["draft_id"]
            isOneToOne: false
            referencedRelation: "duel_drafts"
            referencedColumns: ["id"]
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
      notifications: {
        Row: {
          body: string
          club_id: string | null
          created_at: string
          id: string
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string
          club_id?: string | null
          created_at?: string
          id?: string
          read?: boolean
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string
          club_id?: string | null
          created_at?: string
          id?: string
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      poll_options: {
        Row: {
          created_at: string
          id: string
          label: string
          poll_id: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          label: string
          poll_id: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
          poll_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "poll_options_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "polls"
            referencedColumns: ["id"]
          },
        ]
      }
      poll_votes: {
        Row: {
          created_at: string
          id: string
          option_id: string
          poll_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          option_id: string
          poll_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          option_id?: string
          poll_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "poll_votes_option_id_fkey"
            columns: ["option_id"]
            isOneToOne: false
            referencedRelation: "poll_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "poll_votes_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "polls"
            referencedColumns: ["id"]
          },
        ]
      }
      polls: {
        Row: {
          closes_at: string | null
          created_at: string
          created_by: string | null
          id: string
          is_admin: boolean
          question: string
          updated_at: string
        }
        Insert: {
          closes_at?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_admin?: boolean
          question: string
          updated_at?: string
        }
        Update: {
          closes_at?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_admin?: boolean
          question?: string
          updated_at?: string
        }
        Relationships: []
      }
      prediction_sessions: {
        Row: {
          closes_at: string | null
          created_at: string
          id: string
          name: string
          result_top3: Json | null
          status: string
          updated_at: string
        }
        Insert: {
          closes_at?: string | null
          created_at?: string
          id?: string
          name: string
          result_top3?: Json | null
          status?: string
          updated_at?: string
        }
        Update: {
          closes_at?: string | null
          created_at?: string
          id?: string
          name?: string
          result_top3?: Json | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      predictions: {
        Row: {
          created_at: string
          id: string
          points: number
          session_id: string
          top3: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          points?: number
          session_id: string
          top3: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          points?: number
          session_id?: string
          top3?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "predictions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "prediction_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          sv_linked_at: string | null
          sv_reward_claimed: boolean
          sv_user_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          sv_linked_at?: string | null
          sv_reward_claimed?: boolean
          sv_user_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          sv_linked_at?: string | null
          sv_reward_claimed?: boolean
          sv_user_id?: string | null
        }
        Relationships: []
      }
      races: {
        Row: {
          created_at: string
          flag: string
          id: string
          is_live: boolean
          name: string
          qualifying_content: string | null
          qualifying_media_url: string | null
          qualifying_updated_at: string | null
          qualifying_youtube_url: string | null
          race_content: string | null
          race_date: string | null
          race_media_url: string | null
          race_updated_at: string | null
          race_youtube_url: string | null
          round_number: number | null
          slug: string
          updated_at: string
          youtube_url: string | null
        }
        Insert: {
          created_at?: string
          flag?: string
          id?: string
          is_live?: boolean
          name: string
          qualifying_content?: string | null
          qualifying_media_url?: string | null
          qualifying_updated_at?: string | null
          qualifying_youtube_url?: string | null
          race_content?: string | null
          race_date?: string | null
          race_media_url?: string | null
          race_updated_at?: string | null
          race_youtube_url?: string | null
          round_number?: number | null
          slug: string
          updated_at?: string
          youtube_url?: string | null
        }
        Update: {
          created_at?: string
          flag?: string
          id?: string
          is_live?: boolean
          name?: string
          qualifying_content?: string | null
          qualifying_media_url?: string | null
          qualifying_updated_at?: string | null
          qualifying_youtube_url?: string | null
          race_content?: string | null
          race_date?: string | null
          race_media_url?: string | null
          race_updated_at?: string | null
          race_youtube_url?: string | null
          round_number?: number | null
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
          current_driver_slugs: Json
          flag: string
          former_lineups: Json
          hero_media_url: string | null
          id: string
          info_card: string | null
          logo_url: string | null
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          color_key: string
          content?: string | null
          created_at?: string
          current_driver_slugs?: Json
          flag?: string
          former_lineups?: Json
          hero_media_url?: string | null
          id?: string
          info_card?: string | null
          logo_url?: string | null
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          color_key?: string
          content?: string | null
          created_at?: string
          current_driver_slugs?: Json
          flag?: string
          former_lineups?: Json
          hero_media_url?: string | null
          id?: string
          info_card?: string | null
          logo_url?: string | null
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_cards: {
        Row: {
          card_id: string
          copies: number
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          card_id: string
          copies?: number
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          card_id?: string
          copies?: number
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_cards_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
        ]
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
      user_vault: {
        Row: {
          created_at: string
          points: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          points?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          points?: number
          updated_at?: string
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
  public: {
    Enums: {
      app_role: ["admin"],
    },
  },
} as const
