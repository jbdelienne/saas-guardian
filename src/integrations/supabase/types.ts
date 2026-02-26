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
      alert_thresholds: {
        Row: {
          created_at: string
          id: string
          integration_type: string
          is_enabled: boolean
          label: string | null
          metric_type: string
          severity: string
          threshold_operator: string
          threshold_value: number
          updated_at: string
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          integration_type: string
          is_enabled?: boolean
          label?: string | null
          metric_type: string
          severity?: string
          threshold_operator?: string
          threshold_value: number
          updated_at?: string
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          integration_type?: string
          is_enabled?: boolean
          label?: string | null
          metric_type?: string
          severity?: string
          threshold_operator?: string
          threshold_value?: number
          updated_at?: string
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "alert_thresholds_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      alerts: {
        Row: {
          alert_type: string
          created_at: string
          description: string
          id: string
          integration_type: string | null
          is_dismissed: boolean
          is_read: boolean
          metadata: Json | null
          severity: string
          title: string
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          alert_type: string
          created_at?: string
          description: string
          id?: string
          integration_type?: string | null
          is_dismissed?: boolean
          is_read?: boolean
          metadata?: Json | null
          severity?: string
          title: string
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          alert_type?: string
          created_at?: string
          description?: string
          id?: string
          integration_type?: string | null
          is_dismissed?: boolean
          is_read?: boolean
          metadata?: Json | null
          severity?: string
          title?: string
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "alerts_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      aws_credentials: {
        Row: {
          access_key_id: string
          created_at: string
          id: string
          last_sync_at: string | null
          region: string
          secret_access_key: string
          sync_status: string
          updated_at: string
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          access_key_id: string
          created_at?: string
          id?: string
          last_sync_at?: string | null
          region?: string
          secret_access_key: string
          sync_status?: string
          updated_at?: string
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          access_key_id?: string
          created_at?: string
          id?: string
          last_sync_at?: string | null
          region?: string
          secret_access_key?: string
          sync_status?: string
          updated_at?: string
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "aws_credentials_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      checks: {
        Row: {
          check_region: string | null
          checked_at: string
          error_message: string | null
          id: string
          response_size: number | null
          response_time: number
          service_id: string
          status: string
          status_code: number | null
          ttfb: number | null
          user_id: string
        }
        Insert: {
          check_region?: string | null
          checked_at?: string
          error_message?: string | null
          id?: string
          response_size?: number | null
          response_time?: number
          service_id: string
          status: string
          status_code?: number | null
          ttfb?: number | null
          user_id: string
        }
        Update: {
          check_region?: string | null
          checked_at?: string
          error_message?: string | null
          id?: string
          response_size?: number | null
          response_time?: number
          service_id?: string
          status?: string
          status_code?: number | null
          ttfb?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "checks_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      cost_by_service: {
        Row: {
          account_id: string
          amount: number
          created_at: string
          currency: string
          date: string
          granularity: string
          id: string
          service_name: string
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          account_id: string
          amount?: number
          created_at?: string
          currency?: string
          date: string
          granularity?: string
          id?: string
          service_name: string
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          account_id?: string
          amount?: number
          created_at?: string
          currency?: string
          date?: string
          granularity?: string
          id?: string
          service_name?: string
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cost_by_service_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      cost_snapshots: {
        Row: {
          account_id: string
          cached_at: string
          created_at: string
          end_date: string
          granularity: string
          id: string
          raw_data: Json
          start_date: string
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          account_id: string
          cached_at?: string
          created_at?: string
          end_date: string
          granularity?: string
          id?: string
          raw_data?: Json
          start_date: string
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          account_id?: string
          cached_at?: string
          created_at?: string
          end_date?: string
          granularity?: string
          id?: string
          raw_data?: Json
          start_date?: string
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cost_snapshots_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      dashboard_widgets: {
        Row: {
          config: Json
          created_at: string
          dashboard_id: string
          height: number
          id: string
          position_x: number
          position_y: number
          title: string
          user_id: string
          widget_type: string
          width: number
        }
        Insert: {
          config?: Json
          created_at?: string
          dashboard_id: string
          height?: number
          id?: string
          position_x?: number
          position_y?: number
          title: string
          user_id: string
          widget_type: string
          width?: number
        }
        Update: {
          config?: Json
          created_at?: string
          dashboard_id?: string
          height?: number
          id?: string
          position_x?: number
          position_y?: number
          title?: string
          user_id?: string
          widget_type?: string
          width?: number
        }
        Relationships: [
          {
            foreignKeyName: "dashboard_widgets_dashboard_id_fkey"
            columns: ["dashboard_id"]
            isOneToOne: false
            referencedRelation: "dashboards"
            referencedColumns: ["id"]
          },
        ]
      }
      dashboards: {
        Row: {
          created_at: string
          id: string
          name: string
          template: string
          updated_at: string
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          template?: string
          updated_at?: string
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          template?: string
          updated_at?: string
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dashboards_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_sync_data: {
        Row: {
          created_at: string
          id: string
          integration_id: string
          metadata: Json | null
          metric_key: string
          metric_type: string
          metric_unit: string | null
          metric_value: number
          synced_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          integration_id: string
          metadata?: Json | null
          metric_key: string
          metric_type: string
          metric_unit?: string | null
          metric_value?: number
          synced_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          integration_id?: string
          metadata?: Json | null
          metric_key?: string
          metric_type?: string
          metric_unit?: string | null
          metric_value?: number
          synced_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "integration_sync_data_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "integrations"
            referencedColumns: ["id"]
          },
        ]
      }
      integrations: {
        Row: {
          access_token_encrypted: string | null
          config: Json | null
          created_at: string
          id: string
          integration_type: string
          is_connected: boolean
          last_sync: string | null
          owner_id: string | null
          refresh_token_encrypted: string | null
          scopes: string[] | null
          tags: string[] | null
          token_expires_at: string | null
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          access_token_encrypted?: string | null
          config?: Json | null
          created_at?: string
          id?: string
          integration_type: string
          is_connected?: boolean
          last_sync?: string | null
          owner_id?: string | null
          refresh_token_encrypted?: string | null
          scopes?: string[] | null
          tags?: string[] | null
          token_expires_at?: string | null
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          access_token_encrypted?: string | null
          config?: Json | null
          created_at?: string
          id?: string
          integration_type?: string
          is_connected?: boolean
          last_sync?: string | null
          owner_id?: string | null
          refresh_token_encrypted?: string | null
          scopes?: string[] | null
          tags?: string[] | null
          token_expires_at?: string | null
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "integrations_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_settings: {
        Row: {
          created_at: string
          email_enabled: boolean
          id: string
          min_severity: string
          slack_webhook_url: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email_enabled?: boolean
          id?: string
          min_severity?: string
          slack_webhook_url?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email_enabled?: boolean
          id?: string
          min_severity?: string
          slack_webhook_url?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          avg_response_time: number | null
          check_interval: number
          content_keyword: string | null
          created_at: string
          icon: string
          id: string
          is_paused: boolean
          last_check: string | null
          name: string
          owner_id: string | null
          ssl_expiry_date: string | null
          ssl_issuer: string | null
          status: string
          tags: string[] | null
          updated_at: string
          uptime_percentage: number | null
          url: string
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          avg_response_time?: number | null
          check_interval?: number
          content_keyword?: string | null
          created_at?: string
          icon?: string
          id?: string
          is_paused?: boolean
          last_check?: string | null
          name: string
          owner_id?: string | null
          ssl_expiry_date?: string | null
          ssl_issuer?: string | null
          status?: string
          tags?: string[] | null
          updated_at?: string
          uptime_percentage?: number | null
          url: string
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          avg_response_time?: number | null
          check_interval?: number
          content_keyword?: string | null
          created_at?: string
          icon?: string
          id?: string
          is_paused?: boolean
          last_check?: string | null
          name?: string
          owner_id?: string | null
          ssl_expiry_date?: string | null
          ssl_issuer?: string | null
          status?: string
          tags?: string[] | null
          updated_at?: string
          uptime_percentage?: number | null
          url?: string
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "services_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      waitlist_signups: {
        Row: {
          company: string | null
          created_at: string
          email: string
          id: string
        }
        Insert: {
          company?: string | null
          created_at?: string
          email: string
          id?: string
        }
        Update: {
          company?: string | null
          created_at?: string
          email?: string
          id?: string
        }
        Relationships: []
      }
      workspace_invitations: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          invited_by: string
          invited_email: string
          role: Database["public"]["Enums"]["app_role"]
          status: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          id?: string
          invited_by: string
          invited_email: string
          role?: Database["public"]["Enums"]["app_role"]
          status?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          invited_by?: string
          invited_email?: string
          role?: Database["public"]["Enums"]["app_role"]
          status?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_invitations_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_members: {
        Row: {
          id: string
          joined_at: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
          workspace_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
          workspace_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_members_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_default_thresholds: {
        Args: { p_integration_type: string; p_user_id: string }
        Returns: undefined
      }
      get_auth_email: { Args: never; Returns: string }
      get_user_workspace_id: { Args: { _user_id: string }; Returns: string }
      get_workspace_member_emails: {
        Args: { _workspace_id: string }
        Returns: {
          email: string
          user_id: string
        }[]
      }
      is_workspace_admin: {
        Args: { _user_id: string; _workspace_id: string }
        Returns: boolean
      }
      is_workspace_member: {
        Args: { _user_id: string; _workspace_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "member"
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
      app_role: ["admin", "member"],
    },
  },
} as const
