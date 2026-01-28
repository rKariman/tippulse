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
      admin_users: {
        Row: {
          created_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_tips_cache: {
        Row: {
          confidence: string
          expires_at: string
          fixture_id: string
          generated_at: string
          id: string
          market: string
          prediction: string
          reasoning: string
        }
        Insert: {
          confidence: string
          expires_at?: string
          fixture_id: string
          generated_at?: string
          id?: string
          market: string
          prediction: string
          reasoning: string
        }
        Update: {
          confidence?: string
          expires_at?: string
          fixture_id?: string
          generated_at?: string
          id?: string
          market?: string
          prediction?: string
          reasoning?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_tips_cache_fixture_id_fkey"
            columns: ["fixture_id"]
            isOneToOne: true
            referencedRelation: "fixtures"
            referencedColumns: ["id"]
          },
        ]
      }
      articles: {
        Row: {
          article_type: string | null
          body: string | null
          created_at: string | null
          excerpt: string | null
          id: string
          is_featured: boolean | null
          published_at: string | null
          slug: string
          title: string
        }
        Insert: {
          article_type?: string | null
          body?: string | null
          created_at?: string | null
          excerpt?: string | null
          id?: string
          is_featured?: boolean | null
          published_at?: string | null
          slug: string
          title: string
        }
        Update: {
          article_type?: string | null
          body?: string | null
          created_at?: string | null
          excerpt?: string | null
          id?: string
          is_featured?: boolean | null
          published_at?: string | null
          slug?: string
          title?: string
        }
        Relationships: []
      }
      bookmakers: {
        Row: {
          brand_color: string | null
          created_at: string | null
          id: string
          is_featured: boolean | null
          logo_url: string | null
          name: string
          slug: string
        }
        Insert: {
          brand_color?: string | null
          created_at?: string | null
          id?: string
          is_featured?: boolean | null
          logo_url?: string | null
          name: string
          slug: string
        }
        Update: {
          brand_color?: string | null
          created_at?: string | null
          id?: string
          is_featured?: boolean | null
          logo_url?: string | null
          name?: string
          slug?: string
        }
        Relationships: []
      }
      fixtures: {
        Row: {
          away_team_id: string | null
          created_at: string | null
          external_id: string | null
          home_team_id: string | null
          id: string
          kickoff_at: string
          last_synced_at: string | null
          league_id: string | null
          provider: string | null
          round: string | null
          season: string | null
          slug: string
          status: string | null
          venue: string | null
        }
        Insert: {
          away_team_id?: string | null
          created_at?: string | null
          external_id?: string | null
          home_team_id?: string | null
          id?: string
          kickoff_at: string
          last_synced_at?: string | null
          league_id?: string | null
          provider?: string | null
          round?: string | null
          season?: string | null
          slug: string
          status?: string | null
          venue?: string | null
        }
        Update: {
          away_team_id?: string | null
          created_at?: string | null
          external_id?: string | null
          home_team_id?: string | null
          id?: string
          kickoff_at?: string
          last_synced_at?: string | null
          league_id?: string | null
          provider?: string | null
          round?: string | null
          season?: string | null
          slug?: string
          status?: string | null
          venue?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fixtures_away_team_id_fkey"
            columns: ["away_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fixtures_home_team_id_fkey"
            columns: ["home_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fixtures_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
        ]
      }
      free_bets: {
        Row: {
          bookmaker: string | null
          created_at: string
          description: string
          id: string
          is_featured: boolean
          published: boolean
          region: string | null
          slug: string
          target_url: string
          terms: string | null
          title: string
          updated_at: string
          valid_from: string | null
          valid_to: string | null
        }
        Insert: {
          bookmaker?: string | null
          created_at?: string
          description: string
          id?: string
          is_featured?: boolean
          published?: boolean
          region?: string | null
          slug: string
          target_url: string
          terms?: string | null
          title: string
          updated_at?: string
          valid_from?: string | null
          valid_to?: string | null
        }
        Update: {
          bookmaker?: string | null
          created_at?: string
          description?: string
          id?: string
          is_featured?: boolean
          published?: boolean
          region?: string | null
          slug?: string
          target_url?: string
          terms?: string | null
          title?: string
          updated_at?: string
          valid_from?: string | null
          valid_to?: string | null
        }
        Relationships: []
      }
      leagues: {
        Row: {
          country: string | null
          created_at: string | null
          external_id: string | null
          id: string
          is_featured: boolean | null
          last_synced_at: string | null
          name: string
          provider: string | null
          slug: string
          sport: string | null
        }
        Insert: {
          country?: string | null
          created_at?: string | null
          external_id?: string | null
          id?: string
          is_featured?: boolean | null
          last_synced_at?: string | null
          name: string
          provider?: string | null
          slug: string
          sport?: string | null
        }
        Update: {
          country?: string | null
          created_at?: string | null
          external_id?: string | null
          id?: string
          is_featured?: boolean | null
          last_synced_at?: string | null
          name?: string
          provider?: string | null
          slug?: string
          sport?: string | null
        }
        Relationships: []
      }
      news_posts: {
        Row: {
          content: string
          cover_image_url: string | null
          created_at: string
          excerpt: string | null
          id: string
          published: boolean
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          content: string
          cover_image_url?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          published?: boolean
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          content?: string
          cover_image_url?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          published?: boolean
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      offers: {
        Row: {
          bookmaker_id: string | null
          created_at: string | null
          description: string | null
          id: string
          is_featured: boolean | null
          region: string | null
          slug: string
          target_url: string
          terms: string | null
          title: string
          valid_from: string | null
          valid_to: string | null
        }
        Insert: {
          bookmaker_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_featured?: boolean | null
          region?: string | null
          slug: string
          target_url: string
          terms?: string | null
          title: string
          valid_from?: string | null
          valid_to?: string | null
        }
        Update: {
          bookmaker_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_featured?: boolean | null
          region?: string | null
          slug?: string
          target_url?: string
          terms?: string | null
          title?: string
          valid_from?: string | null
          valid_to?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "offers_bookmaker_id_fkey"
            columns: ["bookmaker_id"]
            isOneToOne: false
            referencedRelation: "bookmakers"
            referencedColumns: ["id"]
          },
        ]
      }
      outbound_clicks: {
        Row: {
          bookmaker_slug: string | null
          created_at: string | null
          id: string
          ip_hash: string | null
          offer_slug: string | null
          referrer: string | null
          route: string | null
          target_url: string
          user_agent: string | null
        }
        Insert: {
          bookmaker_slug?: string | null
          created_at?: string | null
          id?: string
          ip_hash?: string | null
          offer_slug?: string | null
          referrer?: string | null
          route?: string | null
          target_url: string
          user_agent?: string | null
        }
        Update: {
          bookmaker_slug?: string | null
          created_at?: string | null
          id?: string
          ip_hash?: string | null
          offer_slug?: string | null
          referrer?: string | null
          route?: string | null
          target_url?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      preview_tips: {
        Row: {
          id: string
          preview_id: string | null
          sort_order: number | null
          tip_id: string | null
        }
        Insert: {
          id?: string
          preview_id?: string | null
          sort_order?: number | null
          tip_id?: string | null
        }
        Update: {
          id?: string
          preview_id?: string | null
          sort_order?: number | null
          tip_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "preview_tips_preview_id_fkey"
            columns: ["preview_id"]
            isOneToOne: false
            referencedRelation: "previews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "preview_tips_tip_id_fkey"
            columns: ["tip_id"]
            isOneToOne: false
            referencedRelation: "tips"
            referencedColumns: ["id"]
          },
        ]
      }
      previews: {
        Row: {
          created_at: string | null
          fixture_id: string
          id: string
          intro: string | null
          published_at: string | null
          slug: string
          title: string
        }
        Insert: {
          created_at?: string | null
          fixture_id: string
          id?: string
          intro?: string | null
          published_at?: string | null
          slug: string
          title: string
        }
        Update: {
          created_at?: string | null
          fixture_id?: string
          id?: string
          intro?: string | null
          published_at?: string | null
          slug?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "previews_fixture_id_fkey"
            columns: ["fixture_id"]
            isOneToOne: false
            referencedRelation: "fixtures"
            referencedColumns: ["id"]
          },
        ]
      }
      subscribers: {
        Row: {
          consent: boolean | null
          created_at: string | null
          email: string
          id: string
          source: string | null
        }
        Insert: {
          consent?: boolean | null
          created_at?: string | null
          email: string
          id?: string
          source?: string | null
        }
        Update: {
          consent?: boolean | null
          created_at?: string | null
          email?: string
          id?: string
          source?: string | null
        }
        Relationships: []
      }
      sync_runs: {
        Row: {
          created_at: string | null
          error: string | null
          id: string
          job_type: string
          params: Json | null
          provider: string
          success: boolean
          upserted_fixtures: number | null
          upserted_leagues: number | null
          upserted_teams: number | null
        }
        Insert: {
          created_at?: string | null
          error?: string | null
          id?: string
          job_type: string
          params?: Json | null
          provider: string
          success: boolean
          upserted_fixtures?: number | null
          upserted_leagues?: number | null
          upserted_teams?: number | null
        }
        Update: {
          created_at?: string | null
          error?: string | null
          id?: string
          job_type?: string
          params?: Json | null
          provider?: string
          success?: boolean
          upserted_fixtures?: number | null
          upserted_leagues?: number | null
          upserted_teams?: number | null
        }
        Relationships: []
      }
      teams: {
        Row: {
          created_at: string | null
          external_id: string | null
          id: string
          last_synced_at: string | null
          league_id: string | null
          name: string
          provider: string | null
          slug: string
        }
        Insert: {
          created_at?: string | null
          external_id?: string | null
          id?: string
          last_synced_at?: string | null
          league_id?: string | null
          name: string
          provider?: string | null
          slug: string
        }
        Update: {
          created_at?: string | null
          external_id?: string | null
          id?: string
          last_synced_at?: string | null
          league_id?: string | null
          name?: string
          provider?: string | null
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "teams_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
        ]
      }
      tips: {
        Row: {
          created_at: string | null
          fixture_id: string | null
          id: string
          market: string
          odds: number
          published_at: string | null
          reasoning_long: string | null
          reasoning_short: string | null
          selection: string
          stars: number | null
          title: string
        }
        Insert: {
          created_at?: string | null
          fixture_id?: string | null
          id?: string
          market: string
          odds: number
          published_at?: string | null
          reasoning_long?: string | null
          reasoning_short?: string | null
          selection: string
          stars?: number | null
          title: string
        }
        Update: {
          created_at?: string | null
          fixture_id?: string | null
          id?: string
          market?: string
          odds?: number
          published_at?: string | null
          reasoning_long?: string | null
          reasoning_short?: string | null
          selection?: string
          stars?: number | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "tips_fixture_id_fkey"
            columns: ["fixture_id"]
            isOneToOne: false
            referencedRelation: "fixtures"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin: { Args: { check_user_id?: string }; Returns: boolean }
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
    Enums: {},
  },
} as const
