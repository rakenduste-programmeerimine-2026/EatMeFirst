// Generated shape of `supabase gen types typescript` for supabase/migrations/20261106120000_init_schema.sql.
// Regenerate with `npm run db:types` (needs `npx supabase start`). Do not edit by hand.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "12";
  };
  public: {
    Tables: {
      fridge_members: {
        Row: {
          fridge_id: string;
          joined_at: string;
          role: Database["public"]["Enums"]["member_role"];
          user_id: string;
        };
        Insert: {
          fridge_id: string;
          joined_at?: string;
          role?: Database["public"]["Enums"]["member_role"];
          user_id: string;
        };
        Update: {
          fridge_id?: string;
          joined_at?: string;
          role?: Database["public"]["Enums"]["member_role"];
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "fridge_members_fridge_id_fkey";
            columns: ["fridge_id"];
            isOneToOne: false;
            referencedRelation: "fridges";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fridge_members_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      fridges: {
        Row: {
          created_at: string;
          created_by: string;
          id: string;
          invite_code: string;
          name: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string;
          id?: string;
          invite_code?: string;
          name: string;
        };
        Update: {
          created_at?: string;
          created_by?: string;
          id?: string;
          invite_code?: string;
          name?: string;
        };
        Relationships: [
          {
            foreignKeyName: "fridges_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      items: {
        Row: {
          added_by: string | null;
          category: string | null;
          created_at: string;
          expiry_date: string;
          fridge_id: string;
          id: string;
          name: string;
          quantity: number | null;
          status: Database["public"]["Enums"]["item_status"];
          status_changed_at: string | null;
          unit: string | null;
          updated_at: string;
        };
        Insert: {
          added_by?: string | null;
          category?: string | null;
          created_at?: string;
          expiry_date: string;
          fridge_id: string;
          id?: string;
          name: string;
          quantity?: number | null;
          status?: Database["public"]["Enums"]["item_status"];
          status_changed_at?: string | null;
          unit?: string | null;
          updated_at?: string;
        };
        Update: {
          added_by?: string | null;
          category?: string | null;
          created_at?: string;
          expiry_date?: string;
          fridge_id?: string;
          id?: string;
          name?: string;
          quantity?: number | null;
          status?: Database["public"]["Enums"]["item_status"];
          status_changed_at?: string | null;
          unit?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "items_added_by_fkey";
            columns: ["added_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "items_fridge_id_fkey";
            columns: ["fridge_id"];
            isOneToOne: false;
            referencedRelation: "fridges";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          created_at: string;
          display_name: string;
          id: string;
        };
        Insert: {
          created_at?: string;
          display_name?: string;
          id: string;
        };
        Update: {
          created_at?: string;
          display_name?: string;
          id?: string;
        };
        Relationships: [];
      };
      recipes: {
        Row: {
          id: number;
          ingredients: string[];
          instructions: string;
          minutes: number | null;
          title: string;
        };
        Insert: {
          id?: never;
          ingredients: string[];
          instructions: string;
          minutes?: number | null;
          title: string;
        };
        Update: {
          id?: never;
          ingredients?: string[];
          instructions?: string;
          minutes?: number | null;
          title?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      fridge_weekly_stats: {
        Row: {
          fridge_id: string | null;
          used_count: number | null;
          wasted_count: number | null;
          week_start: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "items_fridge_id_fkey";
            columns: ["fridge_id"];
            isOneToOne: false;
            referencedRelation: "fridges";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Functions: {
      is_fridge_member: { Args: { p_fridge_id: string }; Returns: boolean };
      is_fridge_owner: { Args: { p_fridge_id: string }; Returns: boolean };
      join_fridge: { Args: { p_invite_code: string }; Returns: string };
      suggest_recipes: {
        Args: { p_fridge_id: string; p_limit?: number };
        Returns: {
          instructions: string;
          match_count: number;
          matched_items: string[];
          minutes: number;
          recipe_id: number;
          soonest_expiry: string;
          title: string;
        }[];
      };
    };
    Enums: {
      item_status: "active" | "used" | "wasted";
      member_role: "owner" | "member";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type PublicSchema = Database["public"];

export type Tables<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Row"];
export type TablesInsert<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Update"];
export type Enums<T extends keyof PublicSchema["Enums"]> = PublicSchema["Enums"][T];
