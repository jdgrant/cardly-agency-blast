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
      email_unsubscribes: {
        Row: {
          created_at: string
          email: string
          id: string
          unsubscribed_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          unsubscribed_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          unsubscribed_at?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          billing_address: string | null
          card_quantity: number
          client_count: number | null
          contact_email: string | null
          contact_firstname: string | null
          contact_lastname: string | null
          contact_phone: string | null
          created_at: string
          cropped_signature_url: string | null
          csv_file_url: string | null
          custom_message: string | null
          early_bird_discount: boolean | null
          final_price: number
          front_preview_base64: string | null
          id: string
          inside_preview_base64: string | null
          invoice_paid: boolean | null
          logo_url: string | null
          mailing_window: string
          postage_cost: number | null
          postage_option: string
          previews_updated_at: string | null
          production_combined_pdf_generated_at: string | null
          production_combined_pdf_path: string | null
          production_combined_pdf_public_url: string | null
          promo_code: string | null
          readable_order_id: string | null
          regular_price: number
          selected_message: string | null
          signature_needs_review: boolean | null
          signature_purchased: boolean | null
          signature_url: string | null
          status: string | null
          template_id: string
          tier_name: string
          updated_at: string
        }
        Insert: {
          billing_address?: string | null
          card_quantity: number
          client_count?: number | null
          contact_email?: string | null
          contact_firstname?: string | null
          contact_lastname?: string | null
          contact_phone?: string | null
          created_at?: string
          cropped_signature_url?: string | null
          csv_file_url?: string | null
          custom_message?: string | null
          early_bird_discount?: boolean | null
          final_price: number
          front_preview_base64?: string | null
          id?: string
          inside_preview_base64?: string | null
          invoice_paid?: boolean | null
          logo_url?: string | null
          mailing_window: string
          postage_cost?: number | null
          postage_option?: string
          previews_updated_at?: string | null
          production_combined_pdf_generated_at?: string | null
          production_combined_pdf_path?: string | null
          production_combined_pdf_public_url?: string | null
          promo_code?: string | null
          readable_order_id?: string | null
          regular_price: number
          selected_message?: string | null
          signature_needs_review?: boolean | null
          signature_purchased?: boolean | null
          signature_url?: string | null
          status?: string | null
          template_id: string
          tier_name: string
          updated_at?: string
        }
        Update: {
          billing_address?: string | null
          card_quantity?: number
          client_count?: number | null
          contact_email?: string | null
          contact_firstname?: string | null
          contact_lastname?: string | null
          contact_phone?: string | null
          created_at?: string
          cropped_signature_url?: string | null
          csv_file_url?: string | null
          custom_message?: string | null
          early_bird_discount?: boolean | null
          final_price?: number
          front_preview_base64?: string | null
          id?: string
          inside_preview_base64?: string | null
          invoice_paid?: boolean | null
          logo_url?: string | null
          mailing_window?: string
          postage_cost?: number | null
          postage_option?: string
          previews_updated_at?: string | null
          production_combined_pdf_generated_at?: string | null
          production_combined_pdf_path?: string | null
          production_combined_pdf_public_url?: string | null
          promo_code?: string | null
          readable_order_id?: string | null
          regular_price?: number
          selected_message?: string | null
          signature_needs_review?: boolean | null
          signature_purchased?: boolean | null
          signature_url?: string | null
          status?: string | null
          template_id?: string
          tier_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      promocodes: {
        Row: {
          code: string
          created_at: string
          current_uses: number
          discount_percentage: number
          expires_at: string | null
          id: string
          is_active: boolean
          max_uses: number | null
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          current_uses?: number
          discount_percentage?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          current_uses?: number
          discount_percentage?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
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
        Args:
          | {
              p_billing_address?: string
              p_card_quantity: number
              p_contact_email?: string
              p_contact_firstname?: string
              p_contact_lastname?: string
              p_contact_phone?: string
              p_csv_file_url?: string
              p_custom_message?: string
              p_final_price: number
              p_logo_url?: string
              p_mailing_window: string
              p_postage_cost?: number
              p_postage_option?: string
              p_regular_price: number
              p_selected_message?: string
              p_signature_url?: string
              p_template_id: string
              p_tier_name: string
            }
          | {
              p_billing_address?: string
              p_card_quantity: number
              p_contact_email?: string
              p_contact_name?: string
              p_contact_phone?: string
              p_csv_file_url?: string
              p_custom_message?: string
              p_final_price: number
              p_logo_url?: string
              p_mailing_window: string
              p_postage_cost?: number
              p_postage_option?: string
              p_regular_price: number
              p_selected_message?: string
              p_signature_url?: string
              p_template_id: string
              p_tier_name: string
            }
          | {
              p_card_quantity: number
              p_csv_file_url?: string
              p_custom_message?: string
              p_final_price: number
              p_logo_url?: string
              p_mailing_window: string
              p_postage_cost?: number
              p_postage_option?: string
              p_regular_price: number
              p_selected_message?: string
              p_signature_url?: string
              p_template_id: string
              p_tier_name: string
            }
        Returns: string
      }
      find_order_by_short_id: {
        Args: { short_id: string }
        Returns: {
          billing_address: string | null
          card_quantity: number
          client_count: number | null
          contact_email: string | null
          contact_firstname: string | null
          contact_lastname: string | null
          contact_phone: string | null
          created_at: string
          cropped_signature_url: string | null
          csv_file_url: string | null
          custom_message: string | null
          early_bird_discount: boolean | null
          final_price: number
          front_preview_base64: string | null
          id: string
          inside_preview_base64: string | null
          invoice_paid: boolean | null
          logo_url: string | null
          mailing_window: string
          postage_cost: number | null
          postage_option: string
          previews_updated_at: string | null
          production_combined_pdf_generated_at: string | null
          production_combined_pdf_path: string | null
          production_combined_pdf_public_url: string | null
          promo_code: string | null
          readable_order_id: string | null
          regular_price: number
          selected_message: string | null
          signature_needs_review: boolean | null
          signature_purchased: boolean | null
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
      get_admin_clients_for_orders: {
        Args: { session_id_param: string }
        Returns: {
          first_name: string
          last_name: string
          order_id: string
        }[]
      }
      get_admin_orders: {
        Args: { session_id_param: string }
        Returns: {
          billing_address: string | null
          card_quantity: number
          client_count: number | null
          contact_email: string | null
          contact_firstname: string | null
          contact_lastname: string | null
          contact_phone: string | null
          created_at: string
          cropped_signature_url: string | null
          csv_file_url: string | null
          custom_message: string | null
          early_bird_discount: boolean | null
          final_price: number
          front_preview_base64: string | null
          id: string
          inside_preview_base64: string | null
          invoice_paid: boolean | null
          logo_url: string | null
          mailing_window: string
          postage_cost: number | null
          postage_option: string
          previews_updated_at: string | null
          production_combined_pdf_generated_at: string | null
          production_combined_pdf_path: string | null
          production_combined_pdf_public_url: string | null
          promo_code: string | null
          readable_order_id: string | null
          regular_price: number
          selected_message: string | null
          signature_needs_review: boolean | null
          signature_purchased: boolean | null
          signature_url: string | null
          status: string | null
          template_id: string
          tier_name: string
          updated_at: string
        }[]
      }
      get_order_by_id: {
        Args:
          | { order_id: string }
          | { order_id: string; session_id_param?: string }
        Returns: {
          billing_address: string
          card_quantity: number
          client_count: number
          contact_email: string
          contact_firstname: string
          contact_lastname: string
          contact_phone: string
          created_at: string
          csv_file_url: string
          custom_message: string
          early_bird_discount: boolean
          final_price: number
          front_preview_base64: string
          id: string
          inside_preview_base64: string
          logo_url: string
          mailing_window: string
          postage_cost: number
          postage_option: string
          production_combined_pdf_generated_at: string
          production_combined_pdf_path: string
          production_combined_pdf_public_url: string
          readable_order_id: string
          regular_price: number
          selected_message: string
          signature_url: string
          status: string
          template_id: string
          tier_name: string
          updated_at: string
        }[]
      }
      get_order_for_customer_management: {
        Args: { short_id: string }
        Returns: {
          billing_address: string
          card_quantity: number
          client_count: number
          contact_email: string
          contact_firstname: string
          contact_lastname: string
          contact_phone: string
          created_at: string
          cropped_signature_url: string
          csv_file_url: string
          custom_message: string
          early_bird_discount: boolean
          final_price: number
          front_preview_base64: string
          id: string
          inside_preview_base64: string
          invoice_paid: boolean
          logo_url: string
          mailing_window: string
          postage_cost: number
          postage_option: string
          promo_code: string
          readable_order_id: string
          regular_price: number
          selected_message: string
          signature_needs_review: boolean
          signature_purchased: boolean
          signature_url: string
          status: string
          template_id: string
          tier_name: string
          updated_at: string
        }[]
      }
      get_order_for_preview: {
        Args: { order_id: string }
        Returns: {
          card_quantity: number
          cropped_signature_url: string
          custom_message: string
          id: string
          logo_url: string
          selected_message: string
          signature_url: string
          template_id: string
        }[]
      }
      get_promocode: {
        Args: { code_param: string }
        Returns: {
          code: string
          current_uses: number
          discount_percentage: number
          expires_at: string
          id: string
          is_active: boolean
          max_uses: number
        }[]
      }
      insert_client_records: {
        Args: { client_data: Json[]; order_id: string }
        Returns: undefined
      }
      is_admin_user: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_email_unsubscribed: {
        Args: { email_address: string }
        Returns: boolean
      }
      reset_order_client_list: {
        Args: { order_readable_id: string }
        Returns: boolean
      }
      reset_order_completely: {
        Args: { order_readable_id: string }
        Returns: boolean
      }
      set_admin_session: {
        Args: { session_id: string }
        Returns: undefined
      }
      set_and_check_admin_session: {
        Args: { session_id_param: string }
        Returns: boolean
      }
      update_admin_order_status: {
        Args: {
          new_status_param: string
          order_id_param: string
          session_id_param: string
        }
        Returns: undefined
      }
      update_admin_order_status_fields: {
        Args: {
          field_name: string
          field_value: boolean
          order_id_param: string
          session_id_param: string
        }
        Returns: undefined
      }
      update_order_client_count_for_customer: {
        Args: { new_client_count: number; short_id: string }
        Returns: boolean
      }
      update_order_file_for_customer: {
        Args: { file_type: string; file_url: string; short_id: string }
        Returns: boolean
      }
      update_template_preview_url: {
        Args: {
          new_preview_url: string
          session_id_param: string
          template_id_param: string
        }
        Returns: undefined
      }
      use_promocode: {
        Args: { code_param: string }
        Returns: boolean
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
