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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      identity_fingerprints: {
        Row: {
          created_at: string
          duplicate_risk_level: string
          fingerprint_hash: string
          flagged: boolean
          fraud_risk_reasons: string[] | null
          fraud_risk_score: number
          id: string
          partial_dob_hash: string | null
          partial_name_hash: string | null
          partial_phone_hash: string | null
          phone: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          duplicate_risk_level?: string
          fingerprint_hash: string
          flagged?: boolean
          fraud_risk_reasons?: string[] | null
          fraud_risk_score?: number
          id?: string
          partial_dob_hash?: string | null
          partial_name_hash?: string | null
          partial_phone_hash?: string | null
          phone: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          duplicate_risk_level?: string
          fingerprint_hash?: string
          flagged?: boolean
          fraud_risk_reasons?: string[] | null
          fraud_risk_score?: number
          id?: string
          partial_dob_hash?: string | null
          partial_name_hash?: string | null
          partial_phone_hash?: string | null
          phone?: string
          updated_at?: string
        }
        Relationships: []
      }
      otp_codes: {
        Row: {
          code: string
          created_at: string
          expires_at: string
          id: string
          phone: string
          verified: boolean | null
        }
        Insert: {
          code: string
          created_at?: string
          expires_at: string
          id?: string
          phone: string
          verified?: boolean | null
        }
        Update: {
          code?: string
          created_at?: string
          expires_at?: string
          id?: string
          phone?: string
          verified?: boolean | null
        }
        Relationships: []
      }
      saved_schemes: {
        Row: {
          created_at: string
          id: string
          phone: string
          scheme_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          phone: string
          scheme_id: string
        }
        Update: {
          created_at?: string
          id?: string
          phone?: string
          scheme_id?: string
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          address: string | null
          age_range: string | null
          caste_category: string | null
          category: string | null
          created_at: string
          district: string | null
          dob: string | null
          education_level: string | null
          employment_status: string | null
          gender: string | null
          has_bank_account: boolean | null
          has_disability: boolean | null
          id: string
          income: number | null
          income_range: string | null
          land_ownership: string | null
          marital_status: string | null
          name: string | null
          occupation_type: string | null
          onboarding_complete: boolean | null
          phone: string
          residency: string | null
          state: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          age_range?: string | null
          caste_category?: string | null
          category?: string | null
          created_at?: string
          district?: string | null
          dob?: string | null
          education_level?: string | null
          employment_status?: string | null
          gender?: string | null
          has_bank_account?: boolean | null
          has_disability?: boolean | null
          id?: string
          income?: number | null
          income_range?: string | null
          land_ownership?: string | null
          marital_status?: string | null
          name?: string | null
          occupation_type?: string | null
          onboarding_complete?: boolean | null
          phone: string
          residency?: string | null
          state?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          age_range?: string | null
          caste_category?: string | null
          category?: string | null
          created_at?: string
          district?: string | null
          dob?: string | null
          education_level?: string | null
          employment_status?: string | null
          gender?: string | null
          has_bank_account?: boolean | null
          has_disability?: boolean | null
          id?: string
          income?: number | null
          income_range?: string | null
          land_ownership?: string | null
          marital_status?: string | null
          name?: string | null
          occupation_type?: string | null
          onboarding_complete?: boolean | null
          phone?: string
          residency?: string | null
          state?: string | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
