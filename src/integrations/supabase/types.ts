export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      admin_sessions: {
        Row: {
          created_at: string | null
          session_id: string
          value: boolean
        }
        Insert: {
          created_at?: string | null
          session_id: string
          value?: boolean
        }
        Update: {
          created_at?: string | null
          session_id?: string
          value?: boolean
        }
        Relationships: []
      }
      client_records: {
        Row: {
          address: string
          city: string
          created_at: string
          first_name: string
          id: string
          last_name: string
          order_id: string | null
          state: string
          zip: string
        }
        Insert: {
          address: string
          city: string
          created_at?: string
          first_name: string
          id?: string
          last_name: string
          order_id?: string | null
          state: string
          zip: string
        }
        Update: {
          address?: string
          city?: string
          created_at?: string
          first_name?: string
          id?: string
          last_name?: string
          order_id?: string | null
          state?: string
          zip?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_records_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          card_quantity: number
          client_count: number | null
          created_at: string
          csv_file_url: string | null
          custom_message: string | null
          early_bird_discount: boolean | null
          final_price: number
          front_preview_base64: string | null
          id: string
          inside_preview_base64: string | null
          logo_url: string | null
          mailing_window: string
          postage_cost: number | null
          postage_option: string
          previews_updated_at: string | null
          production_combined_pdf_generated_at: string | null
          production_combined_pdf_path: string | null
          production_combined_pdf_public_url: string | null
          readable_order_id: string | null
          regular_price: number
          selected_message: string | null
          signature_url: string | null
          status: string | null
          template_id: string
          tier_name: string
          updated_at: string
        }
        Insert: {
          card_quantity: number
          client_count?: number | null
          created_at?: string
          csv_file_url?: string | null
          custom_message?: string | null
          early_bird_discount?: boolean | null
          final_price: number
          front_preview_base64?: string | null
          id?: string
          inside_preview_base64?: string | null
          logo_url?: string | null
          mailing_window: string
          postage_cost?: number | null
          postage_option?: string
          previews_updated_at?: string | null
          production_combined_pdf_generated_at?: string | null
          production_combined_pdf_path?: string | null
          production_combined_pdf_public_url?: string | null
          readable_order_id?: string | null
          regular_price: number
          selected_message?: string | null
          signature_url?: string | null
          status?: string | null
          template_id: string
          tier_name: string
          updated_at?: string
        }
        Update: {
          card_quantity?: number
          client_count?: number | null
          created_at?: string
          csv_file_url?: string | null
          custom_message?: string | null
          early_bird_discount?: boolean | null
          final_price?: number
          front_preview_base64?: string | null
          id?: string
          inside_preview_base64?: string | null
          logo_url?: string | null
          mailing_window?: string
          postage_cost?: number | null
          postage_option?: string
          previews_updated_at?: string | null
          production_combined_pdf_generated_at?: string | null
          production_combined_pdf_path?: string | null
          production_combined_pdf_public_url?: string | null
          readable_order_id?: string | null
          regular_price?: number
          selected_message?: string | null
          signature_url?: string | null
          status?: string | null
          template_id?: string
          tier_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      templates: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          occasions: string[] | null
          preview_url: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id: string
          name: string
          occasions?: string[] | null
          preview_url: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          occasions?: string[] | null
          preview_url?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      clear_admin_session: {
        Args: { session_id: string }
        Returns: undefined
      }
      create_order: {
        Args: {
          template_id: string
          tier_name: string
          card_quantity: number
          regular_price: number
          final_price: number
          mailing_window: string
          postage_option?: string
          postage_cost?: number
          custom_message?: string
          selected_message?: string
          logo_url?: string
          signature_url?: string
          csv_file_url?: string
        }
        Returns: string
      }
      find_order_by_short_id: {
        Args: { short_id: string }
        Returns: {
          card_quantity: number
          client_count: number | null
          created_at: string
          csv_file_url: string | null
          custom_message: string | null
          early_bird_discount: boolean | null
          final_price: number
          front_preview_base64: string | null
          id: string
          inside_preview_base64: string | null
          logo_url: string | null
          mailing_window: string
          postage_cost: number | null
          postage_option: string
          previews_updated_at: string | null
          production_combined_pdf_generated_at: string | null
          production_combined_pdf_path: string | null
          production_combined_pdf_public_url: string | null
          readable_order_id: string | null
          regular_price: number
          selected_message: string | null
          signature_url: string | null
          status: string | null
          template_id: string
          tier_name: string
          updated_at: string
        }[]
      }
      generate_readable_order_id: {
        Args: { uuid_val: string }
        Returns: string
      }
      get_order_by_id: {
        Args: { order_id: string }
        Returns: {
          id: string
          readable_order_id: string
          status: string
          card_quantity: number
          final_price: number
          mailing_window: string
          created_at: string
          updated_at: string
          template_id: string
          tier_name: string
          client_count: number
          postage_option: string
          postage_cost: number
          regular_price: number
          logo_url: string
          signature_url: string
          csv_file_url: string
          early_bird_discount: boolean
          selected_message: string
          custom_message: string
          front_preview_base64: string
          inside_preview_base64: string
          production_combined_pdf_public_url: string
          production_combined_pdf_path: string
          production_combined_pdf_generated_at: string
        }[]
      }
      insert_client_records: {
        Args: { order_id: string; client_data: Json[] }
        Returns: undefined
      }
      is_admin_user: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      set_admin_session: {
        Args: { session_id: string }
        Returns: undefined
      }
    }
    Enums: {
      order_status: "pending" | "blocked" | "approved" | "sent"
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
      order_status: ["pending", "blocked", "approved", "sent"],
    },
  },
} as const
