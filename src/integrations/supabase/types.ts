export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      doctors: {
        Row: {
          added_by: string
          address: string
          created_at: string
          email: string | null
          hospital: string
          id: string
          is_verified: boolean
          name: string
          phone: string | null
          specialization: string
        }
        Insert: {
          added_by: string
          address: string
          created_at?: string
          email?: string | null
          hospital: string
          id?: string
          is_verified?: boolean
          name: string
          phone?: string | null
          specialization: string
        }
        Update: {
          added_by?: string
          address?: string
          created_at?: string
          email?: string | null
          hospital?: string
          id?: string
          is_verified?: boolean
          name?: string
          phone?: string | null
          specialization?: string
        }
        Relationships: []
      }
      medicines: {
        Row: {
          category: string
          created_at: string
          description: string | null
          dosage: string
          id: string
          name: string
          pack_size: string
          price: number
          stock: number
          type: string
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          dosage: string
          id?: string
          name: string
          pack_size: string
          price: number
          stock?: number
          type: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          dosage?: string
          id?: string
          name?: string
          pack_size?: string
          price?: number
          stock?: number
          type?: string
        }
        Relationships: []
      }
      medicals: {
        Row: {
          id: string
          created_at: string
          name: string
          area: string
        }
        Insert: {
          id?: string
          created_at?: string
          name: string
          area: string
        }
        Update: {
          id?: string
          created_at?: string
          name?: string
          area?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          id: string
          name: string
          region: string | null
          role: string
          status: string
        }
        Insert: {
          created_at?: string
          email: string
          id: string
          name: string
          region?: string | null
          role: string
          status: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          name?: string
          region?: string | null
          role?: string
          status?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          created_at: string
          id: string
          month: number
          mr_id: string
          status: string
          total_orders: number
          total_value: number
          total_visits: number
          year: number
        }
        Insert: {
          created_at?: string
          id?: string
          month: number
          mr_id: string
          status: string
          total_orders?: number
          total_value?: number
          total_visits?: number
          year: number
        }
        Update: {
          created_at?: string
          id?: string
          month?: number
          mr_id?: string
          status?: string
          total_orders?: number
          total_value?: number
          total_visits?: number
          year?: number
        }
        Relationships: []
      }
      medical_visit_orders: {
        Row: {
          created_at: string
          id: string
          medicine_id: string
          quantity: number
          medical_visit_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          medicine_id: string
          quantity: number
          medical_visit_id: string
        }
        Update: {
          created_at?: string
          id?: string
          medicine_id?: string
          quantity?: number
          medical_visit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "visit_orders_medicine_id_fkey"
            columns: ["medicine_id"]
            isOneToOne: false
            referencedRelation: "medicines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visit_orders_visit_id_fkey"
            columns: ["medical_visit_id"]
            isOneToOne: false
            referencedRelation: "medical_visits"
            referencedColumns: ["id"]
          },
        ]
      }
      medical_visits: {
        Row: {
          created_at: string
          visit_date: string
          id: string
          mr_id: string
          notes: string | null
          status: string
        }
        Insert: {
          created_at?: string
          visit_date: string
          id?: string
          mr_id: string
          notes?: string | null
          status: string
        }
        Update: {
          created_at?: string
          visit_date?: string
          id?: string
          mr_id?: string
          notes?: string | null
          status?: string
        }
        Relationships: []
      }
      visit_orders:{
        Row: {
          created_at: string
          id: string
          medicine_id: string
          quantity: number
          visit_id: string
          price: number
        }
        Insert: {
          created_at?: string
          id?: string
          medicine_id: string
          quantity: number
          visit_id: string
          price: number
        }
        Update: {
          created_at?: string
          id?: string
          medicine_id?: string
          quantity?: number
          visit_id?: string
          price: number
        }
        Relationships: [
          {
            foreignKeyName: "visit_orders_medicine_id_fkey"
            columns: ["medicine_id"]
            isOneToOne: false
            referencedRelation: "medicines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visit_orders_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "medical_visits"
            referencedColumns: ["id"]
          },
        ]
      }
      visits:{
        Row: {
          created_at: string
          date: string
          id: string
          mr_id: string
          notes: string | null
          status: string
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          mr_id: string
          notes?: string | null
          status: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          mr_id?: string
          notes?: string | null
          status?: string
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

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
