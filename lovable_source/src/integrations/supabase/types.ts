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
      app_settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          actor_email: string | null
          actor_id: string | null
          created_at: string
          customer_id: string | null
          entity: string
          entity_id: string | null
          id: string
          new_value: Json | null
          old_value: Json | null
          reason: string | null
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          customer_id?: string | null
          entity: string
          entity_id?: string | null
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          reason?: string | null
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          customer_id?: string | null
          entity?: string
          entity_id?: string | null
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          reason?: string | null
        }
        Relationships: []
      }
      banks: {
        Row: {
          doc: Json
          is_active: boolean
          slug: string
          updated_at: string
        }
        Insert: {
          doc: Json
          is_active?: boolean
          slug: string
          updated_at?: string
        }
        Update: {
          doc?: Json
          is_active?: boolean
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      countries: {
        Row: {
          code: string
          doc: Json
        }
        Insert: {
          code: string
          doc: Json
        }
        Update: {
          code?: string
          doc?: Json
        }
        Relationships: []
      }
      customers: {
        Row: {
          account_status: string
          birth_date: string | null
          city: string | null
          country: string | null
          created_at: string
          customer_no: string
          email: string
          first_name: string | null
          house_number: string | null
          id: string
          internal_note: string | null
          kyc_status: string
          kyc_verified_at: string | null
          kyc_verified_by: string | null
          last_name: string | null
          phone: string | null
          postal_code: string | null
          street: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          account_status?: string
          birth_date?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          customer_no?: string
          email?: string
          first_name?: string | null
          house_number?: string | null
          id?: string
          internal_note?: string | null
          kyc_status?: string
          kyc_verified_at?: string | null
          kyc_verified_by?: string | null
          last_name?: string | null
          phone?: string | null
          postal_code?: string | null
          street?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          account_status?: string
          birth_date?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          customer_no?: string
          email?: string
          first_name?: string | null
          house_number?: string | null
          id?: string
          internal_note?: string | null
          kyc_status?: string
          kyc_verified_at?: string | null
          kyc_verified_by?: string | null
          last_name?: string | null
          phone?: string | null
          postal_code?: string | null
          street?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      discount_codes: {
        Row: {
          categories: string[]
          code: string
          created_at: string
          created_by: string | null
          id: string
          kind: string
          label: string | null
          max_uses: number | null
          status: string
          use_count: number
          valid_until: string | null
          value: number
        }
        Insert: {
          categories?: string[]
          code: string
          created_at?: string
          created_by?: string | null
          id?: string
          kind: string
          label?: string | null
          max_uses?: number | null
          status?: string
          use_count?: number
          valid_until?: string | null
          value: number
        }
        Update: {
          categories?: string[]
          code?: string
          created_at?: string
          created_by?: string | null
          id?: string
          kind?: string
          label?: string | null
          max_uses?: number | null
          status?: string
          use_count?: number
          valid_until?: string | null
          value?: number
        }
        Relationships: []
      }
      form_submissions: {
        Row: {
          attachment_paths: string[]
          created_at: string
          id: string
          kind: string
          payload: Json
        }
        Insert: {
          attachment_paths?: string[]
          created_at?: string
          id?: string
          kind: string
          payload?: Json
        }
        Update: {
          attachment_paths?: string[]
          created_at?: string
          id?: string
          kind?: string
          payload?: Json
        }
        Relationships: []
      }
      formular_access_codes: {
        Row: {
          admin_label: string | null
          code_hash: string
          code_hint: string
          code_plain: string | null
          contract_conditions: Json | null
          created_at: string
          created_by: string | null
          id: string
          last_used_at: string | null
          status: string
          use_count: number
        }
        Insert: {
          admin_label?: string | null
          code_hash: string
          code_hint: string
          code_plain?: string | null
          contract_conditions?: Json | null
          created_at?: string
          created_by?: string | null
          id?: string
          last_used_at?: string | null
          status?: string
          use_count?: number
        }
        Update: {
          admin_label?: string | null
          code_hash?: string
          code_hint?: string
          code_plain?: string | null
          contract_conditions?: Json | null
          created_at?: string
          created_by?: string | null
          id?: string
          last_used_at?: string | null
          status?: string
          use_count?: number
        }
        Relationships: []
      }
      formular_access_logs: {
        Row: {
          code_id: string | null
          id: string
          used_at: string
          used_by_name: string | null
          user_agent: string | null
        }
        Insert: {
          code_id?: string | null
          id?: string
          used_at?: string
          used_by_name?: string | null
          user_agent?: string | null
        }
        Update: {
          code_id?: string | null
          id?: string
          used_at?: string
          used_by_name?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "formular_access_logs_code_id_fkey"
            columns: ["code_id"]
            isOneToOne: false
            referencedRelation: "formular_access_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      formular_sessions: {
        Row: {
          code_id: string
          created_at: string
          expires_at: string
          id: string
          name: string
        }
        Insert: {
          code_id: string
          created_at?: string
          expires_at: string
          id?: string
          name: string
        }
        Update: {
          code_id?: string
          created_at?: string
          expires_at?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "formular_sessions_code_id_fkey"
            columns: ["code_id"]
            isOneToOne: false
            referencedRelation: "formular_access_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      kyc_documents: {
        Row: {
          address_doc_kind: string | null
          customer_id: string
          doc_type: string
          document_date: string | null
          file_name: string
          id: string
          mime_type: string
          size_bytes: number
          status: string
          storage_path: string
          uploaded_at: string
        }
        Insert: {
          address_doc_kind?: string | null
          customer_id: string
          doc_type: string
          document_date?: string | null
          file_name: string
          id?: string
          mime_type: string
          size_bytes?: number
          status?: string
          storage_path: string
          uploaded_at?: string
        }
        Update: {
          address_doc_kind?: string | null
          customer_id?: string
          doc_type?: string
          document_date?: string | null
          file_name?: string
          id?: string
          mime_type?: string
          size_bytes?: number
          status?: string
          storage_path?: string
          uploaded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "kyc_documents_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      kyc_reviews: {
        Row: {
          admin_email: string | null
          admin_id: string
          created_at: string
          customer_id: string
          decision: string
          id: string
          reason: string | null
        }
        Insert: {
          admin_email?: string | null
          admin_id: string
          created_at?: string
          customer_id: string
          decision: string
          id?: string
          reason?: string | null
        }
        Update: {
          admin_email?: string | null
          admin_id?: string
          created_at?: string
          customer_id?: string
          decision?: string
          id?: string
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kyc_reviews_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      live_news: {
        Row: {
          category: string
          created_at: string
          doc: Json
          id: string
          published_at: string
          slug: string
          source_url: string
        }
        Insert: {
          category: string
          created_at?: string
          doc: Json
          id?: string
          published_at: string
          slug: string
          source_url: string
        }
        Update: {
          category?: string
          created_at?: string
          doc?: Json
          id?: string
          published_at?: string
          slug?: string
          source_url?: string
        }
        Relationships: []
      }
      news_source_seen: {
        Row: {
          created_at: string
          source_url: string
          status: string
        }
        Insert: {
          created_at?: string
          source_url: string
          status: string
        }
        Update: {
          created_at?: string
          source_url?: string
          status?: string
        }
        Relationships: []
      }
      news_sync_state: {
        Row: {
          cron_token: string
          id: number
          last_result: Json | null
          last_run_at: string | null
          locked_until: string | null
          paused_reason: string | null
          updated_at: string
        }
        Insert: {
          cron_token?: string
          id: number
          last_result?: Json | null
          last_run_at?: string | null
          locked_until?: string | null
          paused_reason?: string | null
          updated_at?: string
        }
        Update: {
          cron_token?: string
          id?: number
          last_result?: Json | null
          last_run_at?: string | null
          locked_until?: string | null
          paused_reason?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      portfolio_positions: {
        Row: {
          amount: number
          available_from: string | null
          created_at: string
          created_by: string | null
          currency: string
          current_price: number | null
          fees: number
          id: string
          interest_rate: number | null
          maturity_date: string | null
          note: string | null
          origin: string
          portfolio_id: string
          product_id: string
          purchase_date: string
          quantity: number
          status: string
          unit_price: number | null
          updated_at: string
        }
        Insert: {
          amount?: number
          available_from?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          current_price?: number | null
          fees?: number
          id?: string
          interest_rate?: number | null
          maturity_date?: string | null
          note?: string | null
          origin?: string
          portfolio_id: string
          product_id: string
          purchase_date?: string
          quantity?: number
          status?: string
          unit_price?: number | null
          updated_at?: string
        }
        Update: {
          amount?: number
          available_from?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          current_price?: number | null
          fees?: number
          id?: string
          interest_rate?: number | null
          maturity_date?: string | null
          note?: string | null
          origin?: string
          portfolio_id?: string
          product_id?: string
          purchase_date?: string
          quantity?: number
          status?: string
          unit_price?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_positions_portfolio_id_fkey"
            columns: ["portfolio_id"]
            isOneToOne: false
            referencedRelation: "portfolios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portfolio_positions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolios: {
        Row: {
          cash_balance: number
          created_at: string
          currency: string
          customer_id: string
          id: string
          portfolio_no: string
          updated_at: string
        }
        Insert: {
          cash_balance?: number
          created_at?: string
          currency?: string
          customer_id: string
          id?: string
          portfolio_no?: string
          updated_at?: string
        }
        Update: {
          cash_balance?: number
          created_at?: string
          currency?: string
          customer_id?: string
          id?: string
          portfolio_no?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "portfolios_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: true
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      price_alerts: {
        Row: {
          cooldown_until: string | null
          created_at: string
          currency: string | null
          direction: string
          id: string
          is_active: boolean
          note: string | null
          symbol: string
          target_price: number
          triggered_at: string | null
          triggered_count: number
          triggered_price: number | null
          user_id: string
        }
        Insert: {
          cooldown_until?: string | null
          created_at?: string
          currency?: string | null
          direction?: string
          id?: string
          is_active?: boolean
          note?: string | null
          symbol: string
          target_price: number
          triggered_at?: string | null
          triggered_count?: number
          triggered_price?: number | null
          user_id: string
        }
        Update: {
          cooldown_until?: string | null
          created_at?: string
          currency?: string | null
          direction?: string
          id?: string
          is_active?: boolean
          note?: string | null
          symbol?: string
          target_price?: number
          triggered_at?: string | null
          triggered_count?: number
          triggered_price?: number | null
          user_id?: string
        }
        Relationships: []
      }
      price_history: {
        Row: {
          admin_email: string | null
          admin_id: string | null
          created_at: string
          field: string
          id: string
          new_price: number | null
          old_price: number | null
          product_id: string
          reason: string
        }
        Insert: {
          admin_email?: string | null
          admin_id?: string | null
          created_at?: string
          field?: string
          id?: string
          new_price?: number | null
          old_price?: number | null
          product_id: string
          reason: string
        }
        Update: {
          admin_email?: string | null
          admin_id?: string | null
          created_at?: string
          field?: string
          id?: string
          new_price?: number | null
          old_price?: number | null
          product_id?: string
          reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "price_history_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_assignments: {
        Row: {
          created_at: string
          customer_id: string
          product_id: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          product_id: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_assignments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_assignments_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          buy_price: number | null
          category: string
          conditions: string | null
          coupon_rate: number | null
          created_at: string
          created_by: string | null
          currency: string
          id: string
          interest_rate: number | null
          ipo_date_label: string | null
          ipo_status: string | null
          isin: string | null
          issuer: string | null
          market_cap: number | null
          market_cap_note: string | null
          market_price: number | null
          market_price_at: string | null
          market_price_source: string
          maturity_date: string | null
          min_amount: number | null
          name: string
          nominal_value: number | null
          sell_price: number | null
          shares_outstanding: number | null
          status: string
          term_months: number | null
          ticker: string | null
          updated_at: string
          visibility: string
        }
        Insert: {
          buy_price?: number | null
          category: string
          conditions?: string | null
          coupon_rate?: number | null
          created_at?: string
          created_by?: string | null
          currency?: string
          id?: string
          interest_rate?: number | null
          ipo_date_label?: string | null
          ipo_status?: string | null
          isin?: string | null
          issuer?: string | null
          market_cap?: number | null
          market_cap_note?: string | null
          market_price?: number | null
          market_price_at?: string | null
          market_price_source?: string
          maturity_date?: string | null
          min_amount?: number | null
          name: string
          nominal_value?: number | null
          sell_price?: number | null
          shares_outstanding?: number | null
          status?: string
          term_months?: number | null
          ticker?: string | null
          updated_at?: string
          visibility?: string
        }
        Update: {
          buy_price?: number | null
          category?: string
          conditions?: string | null
          coupon_rate?: number | null
          created_at?: string
          created_by?: string | null
          currency?: string
          id?: string
          interest_rate?: number | null
          ipo_date_label?: string | null
          ipo_status?: string | null
          isin?: string | null
          issuer?: string | null
          market_cap?: number | null
          market_cap_note?: string | null
          market_price?: number | null
          market_price_at?: string | null
          market_price_source?: string
          maturity_date?: string | null
          min_amount?: number | null
          name?: string
          nominal_value?: number | null
          sell_price?: number | null
          shares_outstanding?: number | null
          status?: string
          term_months?: number | null
          ticker?: string | null
          updated_at?: string
          visibility?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address_addition: string | null
          avatar_url: string | null
          city: string | null
          country: string | null
          created_at: string
          email: string
          email_digest_enabled: boolean
          first_name: string | null
          house_number: string | null
          id: string
          last_name: string | null
          last_password_reset_at: string | null
          last_seen_at: string | null
          must_change_password: boolean
          name: string
          notification_prefs: Json | null
          onboarding_completed: boolean
          onboarding_completed_steps: Json
          phone: string | null
          postal_code: string | null
          status: string
          street: string | null
          updated_at: string
          verified: boolean
        }
        Insert: {
          address_addition?: string | null
          avatar_url?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          email: string
          email_digest_enabled?: boolean
          first_name?: string | null
          house_number?: string | null
          id: string
          last_name?: string | null
          last_password_reset_at?: string | null
          last_seen_at?: string | null
          must_change_password?: boolean
          name?: string
          notification_prefs?: Json | null
          onboarding_completed?: boolean
          onboarding_completed_steps?: Json
          phone?: string | null
          postal_code?: string | null
          status?: string
          street?: string | null
          updated_at?: string
          verified?: boolean
        }
        Update: {
          address_addition?: string | null
          avatar_url?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          email?: string
          email_digest_enabled?: boolean
          first_name?: string | null
          house_number?: string | null
          id?: string
          last_name?: string | null
          last_password_reset_at?: string | null
          last_seen_at?: string | null
          must_change_password?: boolean
          name?: string
          notification_prefs?: Json | null
          onboarding_completed?: boolean
          onboarding_completed_steps?: Json
          phone?: string | null
          postal_code?: string | null
          status?: string
          street?: string | null
          updated_at?: string
          verified?: boolean
        }
        Relationships: []
      }
      savings_offers: {
        Row: {
          bank_slug: string | null
          doc: Json
          id: string
          is_active: boolean
          updated_at: string
        }
        Insert: {
          bank_slug?: string | null
          doc: Json
          id: string
          is_active?: boolean
          updated_at?: string
        }
        Update: {
          bank_slug?: string | null
          doc?: Json
          id?: string
          is_active?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      staff_permissions: {
        Row: {
          permissions: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          permissions?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          permissions?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          customer_id: string
          customer_note: string | null
          discount_amount: number
          discount_code: string | null
          displayed_price: number | null
          executed_at: string | null
          executed_by: string | null
          executed_price: number | null
          execution_note: string | null
          fees: number
          id: string
          idempotency_key: string | null
          origin: string
          portfolio_id: string
          product_id: string
          quantity: number
          side: string
          status: string
          status_reason: string | null
          total: number | null
          tx_no: string
          updated_at: string
        }
        Insert: {
          amount?: number
          created_at?: string
          created_by?: string | null
          customer_id: string
          customer_note?: string | null
          discount_amount?: number
          discount_code?: string | null
          displayed_price?: number | null
          executed_at?: string | null
          executed_by?: string | null
          executed_price?: number | null
          execution_note?: string | null
          fees?: number
          id?: string
          idempotency_key?: string | null
          origin?: string
          portfolio_id: string
          product_id: string
          quantity?: number
          side: string
          status?: string
          status_reason?: string | null
          total?: number | null
          tx_no?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          customer_id?: string
          customer_note?: string | null
          discount_amount?: number
          discount_code?: string | null
          displayed_price?: number | null
          executed_at?: string | null
          executed_by?: string | null
          executed_price?: number | null
          execution_note?: string | null
          fees?: number
          id?: string
          idempotency_key?: string | null
          origin?: string
          portfolio_id?: string
          product_id?: string
          quantity?: number
          side?: string
          status?: string
          status_reason?: string | null
          total?: number | null
          tx_no?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_portfolio_id_fkey"
            columns: ["portfolio_id"]
            isOneToOne: false
            referencedRelation: "portfolios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_watchlist: {
        Row: {
          asset_type: string
          created_at: string
          display_name: string | null
          id: string
          position: number
          symbol: string
          user_id: string
        }
        Insert: {
          asset_type?: string
          created_at?: string
          display_name?: string | null
          id?: string
          position?: number
          symbol: string
          user_id: string
        }
        Update: {
          asset_type?: string
          created_at?: string
          display_name?: string | null
          id?: string
          position?: number
          symbol?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      execute_transaction: {
        Args: {
          _admin: string
          _admin_email: string
          _fees: number
          _note: string
          _price: number
          _tx: string
        }
        Returns: Json
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
