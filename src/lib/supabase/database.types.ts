export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

type Currency = Database["public"]["Enums"]["currency_code"]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      accounts: {
        Row: {
          color: string | null
          created_at: string
          credit_limit: number | null
          currency: Currency
          due_day: number | null
          id: string
          include_in_net_worth: boolean
          institution: string | null
          is_archived: boolean
          name: string
          opening_balance: number
          opening_date: string
          sort_order: number
          statement_day: number | null
          type: Database["public"]["Enums"]["account_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          credit_limit?: number | null
          currency?: Currency
          due_day?: number | null
          id?: string
          include_in_net_worth?: boolean
          institution?: string | null
          is_archived?: boolean
          name: string
          opening_balance?: number
          opening_date?: string
          sort_order?: number
          statement_day?: number | null
          type: Database["public"]["Enums"]["account_type"]
          updated_at?: string
          user_id?: string
        }
        Update: Partial<Database["public"]["Tables"]["accounts"]["Insert"]>
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          id: string
          new_data: Json | null
          old_data: Json | null
          record_id: string | null
          table_name: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name: string
          user_id?: string | null
        }
        Update: Partial<Database["public"]["Tables"]["audit_logs"]["Insert"]>
        Relationships: []
      }
      calendar_events: {
        Row: {
          created_at: string
          end_date: string | null
          event_date: string
          event_time: string | null
          event_type: Database["public"]["Enums"]["event_type"]
          frequency: Database["public"]["Enums"]["frequency"]
          id: string
          notes: string | null
          remind_days_before: number
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          end_date?: string | null
          event_date: string
          event_time?: string | null
          event_type?: Database["public"]["Enums"]["event_type"]
          frequency?: Database["public"]["Enums"]["frequency"]
          id?: string
          notes?: string | null
          remind_days_before?: number
          title: string
          updated_at?: string
          user_id?: string
        }
        Update: Partial<Database["public"]["Tables"]["calendar_events"]["Insert"]>
        Relationships: []
      }
      categories: {
        Row: {
          color: string | null
          created_at: string
          icon: string | null
          id: string
          is_archived: boolean
          kind: Database["public"]["Enums"]["category_kind"]
          name: string
          parent_id: string | null
          sort_order: number
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          is_archived?: boolean
          kind: Database["public"]["Enums"]["category_kind"]
          name: string
          parent_id?: string | null
          sort_order?: number
          updated_at?: string
          user_id?: string
        }
        Update: Partial<Database["public"]["Tables"]["categories"]["Insert"]>
        Relationships: []
      }
      exchange_rates: {
        Row: {
          base: Currency
          created_at: string
          id: string
          quote: Currency
          rate: number
          rate_date: string
          source: string
          user_id: string | null
        }
        Insert: {
          base: Currency
          created_at?: string
          id?: string
          quote: Currency
          rate: number
          rate_date?: string
          source?: string
          user_id?: string | null
        }
        Update: Partial<Database["public"]["Tables"]["exchange_rates"]["Insert"]>
        Relationships: []
      }
      planned_items: {
        Row: {
          account_id: string
          amount: number
          category_id: string | null
          created_at: string
          end_date: string | null
          frequency: Database["public"]["Enums"]["frequency"]
          id: string
          is_active: boolean
          kind: Database["public"]["Enums"]["transaction_kind"]
          name: string
          notes: string | null
          start_date: string
          to_account_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id: string
          amount: number
          category_id?: string | null
          created_at?: string
          end_date?: string | null
          frequency?: Database["public"]["Enums"]["frequency"]
          id?: string
          is_active?: boolean
          kind: Database["public"]["Enums"]["transaction_kind"]
          name: string
          notes?: string | null
          start_date: string
          to_account_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Update: Partial<Database["public"]["Tables"]["planned_items"]["Insert"]>
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          base_currency: Currency
          city: string | null
          country: string
          created_at: string
          email: string | null
          first_name: string | null
          id: string
          last_name: string | null
          main_goal: string | null
          onboarding_completed_at: string | null
          status: string
          timezone: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          base_currency?: Currency
          city?: string | null
          country?: string
          created_at?: string
          email?: string | null
          first_name?: string | null
          id: string
          last_name?: string | null
          main_goal?: string | null
          onboarding_completed_at?: string | null
          status?: string
          timezone?: string
          updated_at?: string
        }
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>
        Relationships: []
      }
      transactions: {
        Row: {
          account_id: string
          amount: number
          category_id: string | null
          created_at: string
          date: string
          description: string | null
          id: string
          kind: Database["public"]["Enums"]["transaction_kind"]
          notes: string | null
          planned_date: string | null
          planned_item_id: string | null
          to_account_id: string | null
          to_amount: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id: string
          amount: number
          category_id?: string | null
          created_at?: string
          date?: string
          description?: string | null
          id?: string
          kind: Database["public"]["Enums"]["transaction_kind"]
          notes?: string | null
          planned_date?: string | null
          planned_item_id?: string | null
          to_account_id?: string | null
          to_amount?: number | null
          updated_at?: string
          user_id?: string
        }
        Update: Partial<Database["public"]["Tables"]["transactions"]["Insert"]>
        Relationships: []
      }
    }
    Views: {
      account_balances: {
        Row: {
          account_id: string | null
          balance: number | null
          user_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      account_type:
        | "bank_savings"
        | "bank_checking"
        | "cash"
        | "digital_wallet"
        | "investment"
        | "credit_card"
        | "other"
      category_kind: "income" | "expense"
      currency_code: "COP" | "USD" | "EUR" | "MXN" | "GBP"
      event_type: "birthday" | "appointment" | "activity" | "reminder" | "other"
      frequency:
        | "once"
        | "weekly"
        | "biweekly"
        | "semimonthly"
        | "monthly"
        | "bimonthly"
        | "quarterly"
        | "semiannual"
        | "yearly"
      transaction_kind: "income" | "expense" | "transfer"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database["public"]
export type Tables<T extends keyof (PublicSchema["Tables"] & PublicSchema["Views"])> =
  (PublicSchema["Tables"] & PublicSchema["Views"])[T] extends { Row: infer R } ? R : never
export type TablesInsert<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Insert"]
export type TablesUpdate<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Update"]
export type Enums<T extends keyof PublicSchema["Enums"]> = PublicSchema["Enums"][T]
