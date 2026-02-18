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
        }
        Relationships: []
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
        }
        Relationships: []
      }
      checks: {
        Row: {
          checked_at: string
          error_message: string | null
          id: string
          response_time: number
          service_id: string
          status: string
          status_code: number | null
          user_id: string
        }
        Insert: {
          checked_at?: string
          error_message?: string | null
          id?: string
          response_time?: number
          service_id: string
          status: string
          status_code?: number | null
          user_id: string
        }
        Update: {
          checked_at?: string
          error_message?: string | null
          id?: string
          response_time?: number
          service_id?: string
          status?: string
          status_code?: number | null
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
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          template?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          template?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
          refresh_token_encrypted: string | null
          scopes: string[] | null
          token_expires_at: string | null
          user_id: string
        }
        Insert: {
          access_token_encrypted?: string | null
          config?: Json | null
          created_at?: string
          id?: string
          integration_type: string
          is_connected?: boolean
          last_sync?: string | null
          refresh_token_encrypted?: string | null
          scopes?: string[] | null
          token_expires_at?: string | null
          user_id: string
        }
        Update: {
          access_token_encrypted?: string | null
          config?: Json | null
          created_at?: string
          id?: string
          integration_type?: string
          is_connected?: boolean
          last_sync?: string | null
          refresh_token_encrypted?: string | null
          scopes?: string[] | null
          token_expires_at?: string | null
          user_id?: string
        }
        Relationships: []
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
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      services: {
        Row: {
          avg_response_time: number | null
          check_interval: number
          created_at: string
          icon: string
          id: string
          is_paused: boolean
          last_check: string | null
          name: string
          ssl_expiry_date: string | null
          ssl_issuer: string | null
          status: string
          updated_at: string
          uptime_percentage: number | null
          url: string
          user_id: string
        }
        Insert: {
          avg_response_time?: number | null
          check_interval?: number
          created_at?: string
          icon?: string
          id?: string
          is_paused?: boolean
          last_check?: string | null
          name: string
          ssl_expiry_date?: string | null
          ssl_issuer?: string | null
          status?: string
          updated_at?: string
          uptime_percentage?: number | null
          url: string
          user_id: string
        }
        Update: {
          avg_response_time?: number | null
          check_interval?: number
          created_at?: string
          icon?: string
          id?: string
          is_paused?: boolean
          last_check?: string | null
          name?: string
          ssl_expiry_date?: string | null
          ssl_issuer?: string | null
          status?: string
          updated_at?: string
          uptime_percentage?: number | null
          url?: string
          user_id?: string
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
