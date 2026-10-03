// Generated from the Supabase schema (supabase/migrations). Regenerate after schema changes:
//   npx supabase gen types typescript --project-id <ref> > src/lib/supabase/database.types.ts

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      conversations: {
        Row: {
          created_at: string
          id: string
          last_message_at: string
          model_id: string | null
          project_id: string | null
          provider_id: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_message_at?: string
          model_id?: string | null
          project_id?: string | null
          provider_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          last_message_at?: string
          model_id?: string | null
          project_id?: string | null
          provider_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_project_id_user_id_fkey"
            columns: ["project_id", "user_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      messages: {
        Row: {
          attachments: Json
          content: string
          conversation_id: string
          created_at: string
          error: Json | null
          feedback: number | null
          finish_reason: string | null
          id: string
          model_id: string | null
          provider_id: string | null
          reasoning: string
          role: string
          search_text: unknown
          seq: number
          status: string
          updated_at: string
          usage: Json | null
          user_id: string
        }
        Insert: {
          attachments?: Json
          content?: string
          conversation_id: string
          created_at?: string
          error?: Json | null
          feedback?: number | null
          finish_reason?: string | null
          id?: string
          model_id?: string | null
          provider_id?: string | null
          reasoning?: string
          role: string
          search_text?: unknown
          seq?: never
          status?: string
          updated_at?: string
          usage?: Json | null
          user_id?: string
        }
        Update: {
          attachments?: Json
          content?: string
          conversation_id?: string
          created_at?: string
          error?: Json | null
          feedback?: number | null
          finish_reason?: string | null
          id?: string
          model_id?: string | null
          provider_id?: string | null
          reasoning?: string
          role?: string
          search_text?: unknown
          seq?: never
          status?: string
          updated_at?: string
          usage?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_user_id_fkey"
            columns: ["conversation_id", "user_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          created_at: string
          description: string
          id: string
          instructions: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string
          id?: string
          instructions?: string
          name: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          instructions?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      provider_credentials: {
        Row: {
          created_at: string
          id: string
          key_hint: string
          last_error: string | null
          last_verified_at: string | null
          options: Json
          provider_id: string
          secret_ciphertext: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          key_hint: string
          last_error?: string | null
          last_verified_at?: string | null
          options?: Json
          provider_id: string
          secret_ciphertext: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          key_hint?: string
          last_error?: string | null
          last_verified_at?: string | null
          options?: Json
          provider_id?: string
          secret_ciphertext?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          about_me: string
          created_at: string
          custom_instructions: string
          default_model: string | null
          default_provider: string | null
          nickname: string
          response_style: string
          send_on_enter: boolean
          show_reasoning: boolean
          text_size: string
          theme: string
          updated_at: string
          user_id: string
        }
        Insert: {
          about_me?: string
          created_at?: string
          custom_instructions?: string
          default_model?: string | null
          default_provider?: string | null
          nickname?: string
          response_style?: string
          send_on_enter?: boolean
          show_reasoning?: boolean
          text_size?: string
          theme?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          about_me?: string
          created_at?: string
          custom_instructions?: string
          default_model?: string | null
          default_provider?: string | null
          nickname?: string
          response_style?: string
          send_on_enter?: boolean
          show_reasoning?: boolean
          text_size?: string
          theme?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      consume_rate_limit: {
        Args: { p_bucket: string; p_max: number; p_window_seconds: number }
        Returns: {
          allowed: boolean
          remaining: number
          reset_at: string
        }[]
      }
      delete_all_conversations: { Args: never; Returns: undefined }
      delete_own_account: { Args: never; Returns: undefined }
      get_provider_secret: {
        Args: { p_provider_id: string }
        Returns: {
          options: Json
          secret_ciphertext: string
        }[]
      }
      search_conversations: {
        Args: { max_results?: number; search_query: string }
        Returns: {
          conversation_id: string
          last_message_at: string
          match_kind: string
          project_id: string
          snippet: string
          title: string
        }[]
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

type PublicSchema = Database["public"]

export type Tables<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Row"]
export type TablesInsert<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Insert"]
export type TablesUpdate<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Update"]
