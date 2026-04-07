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
      attendance: {
        Row: {
          class_id: string
          created_at: string
          daily_entry_id: string | null
          date: string
          id: string
          notes: string | null
          status: string
          student_id: string
        }
        Insert: {
          class_id: string
          created_at?: string
          daily_entry_id?: string | null
          date?: string
          id?: string
          notes?: string | null
          status?: string
          student_id: string
        }
        Update: {
          class_id?: string
          created_at?: string
          daily_entry_id?: string | null
          date?: string
          id?: string
          notes?: string | null
          status?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_daily_entry_id_fkey"
            columns: ["daily_entry_id"]
            isOneToOne: false
            referencedRelation: "daily_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          id: string
          ip_address: string | null
          new_data: Json | null
          old_data: Json | null
          record_id: string | null
          school_id: string | null
          table_name: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          school_id?: string | null
          table_name?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          school_id?: string | null
          table_name?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools_with_counts"
            referencedColumns: ["id"]
          },
        ]
      }
      billing: {
        Row: {
          amount: number
          created_at: string
          description: string
          due_date: string
          guardian_id: string | null
          id: string
          notes: string | null
          payment_date: string | null
          payment_method: string | null
          school_id: string
          status: string | null
          student_id: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          description: string
          due_date: string
          guardian_id?: string | null
          id?: string
          notes?: string | null
          payment_date?: string | null
          payment_method?: string | null
          school_id: string
          status?: string | null
          student_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string
          due_date?: string
          guardian_id?: string | null
          id?: string
          notes?: string | null
          payment_date?: string | null
          payment_method?: string | null
          school_id?: string
          status?: string | null
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "billing_guardian_id_fkey"
            columns: ["guardian_id"]
            isOneToOne: false
            referencedRelation: "guardians"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools_with_counts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      broadcast_logs: {
        Row: {
          class_id: string
          created_at: string
          daily_entry_id: string | null
          failed_count: number | null
          id: string
          message: string
          school_id: string
          sent_at: string | null
          sent_count: number | null
          status: string | null
          teacher_id: string
          total_recipients: number | null
        }
        Insert: {
          class_id: string
          created_at?: string
          daily_entry_id?: string | null
          failed_count?: number | null
          id?: string
          message: string
          school_id: string
          sent_at?: string | null
          sent_count?: number | null
          status?: string | null
          teacher_id: string
          total_recipients?: number | null
        }
        Update: {
          class_id?: string
          created_at?: string
          daily_entry_id?: string | null
          failed_count?: number | null
          id?: string
          message?: string
          school_id?: string
          sent_at?: string | null
          sent_count?: number | null
          status?: string | null
          teacher_id?: string
          total_recipients?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "broadcast_logs_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "broadcast_logs_daily_entry_id_fkey"
            columns: ["daily_entry_id"]
            isOneToOne: false
            referencedRelation: "daily_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "broadcast_logs_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "broadcast_logs_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools_with_counts"
            referencedColumns: ["id"]
          },
        ]
      }
      calendars: {
        Row: {
          class_end_date: string | null
          class_start_date: string | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          is_default: boolean | null
          name: string
          school_id: string
          updated_at: string | null
          year: number
        }
        Insert: {
          class_end_date?: string | null
          class_start_date?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name: string
          school_id: string
          updated_at?: string | null
          year: number
        }
        Update: {
          class_end_date?: string | null
          class_start_date?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name?: string
          school_id?: string
          updated_at?: string | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "calendars_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendars_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools_with_counts"
            referencedColumns: ["id"]
          },
        ]
      }
      chart_of_accounts: {
        Row: {
          code: string
          created_at: string
          id: string
          is_active: boolean | null
          name: string
          parent_id: string | null
          school_id: string
          type: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          name: string
          parent_id?: string | null
          school_id: string
          type: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          name?: string
          parent_id?: string | null
          school_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "chart_of_accounts_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chart_of_accounts_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chart_of_accounts_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools_with_counts"
            referencedColumns: ["id"]
          },
        ]
      }
      classes: {
        Row: {
          created_at: string
          grade: string | null
          id: string
          is_active: boolean | null
          max_students: number | null
          monthly_fee: number | null
          name: string
          school_id: string
          shift: string | null
          updated_at: string
          year: number
        }
        Insert: {
          created_at?: string
          grade?: string | null
          id?: string
          is_active?: boolean | null
          max_students?: number | null
          monthly_fee?: number | null
          name: string
          school_id: string
          shift?: string | null
          updated_at?: string
          year: number
        }
        Update: {
          created_at?: string
          grade?: string | null
          id?: string
          is_active?: boolean | null
          max_students?: number | null
          monthly_fee?: number | null
          name?: string
          school_id?: string
          shift?: string | null
          updated_at?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "classes_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classes_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools_with_counts"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          avatar_url: string | null
          contact_type: string
          contact_types: string[] | null
          created_at: string | null
          device_name: string | null
          email: string | null
          full_name: string
          guardian_id: string | null
          id: string
          lead_id: string | null
          linked_student_ids: string[] | null
          notes: string | null
          phone: string
          profile_id: string | null
          school_id: string
          student_id: string | null
          tags: string[] | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          contact_type: string
          contact_types?: string[] | null
          created_at?: string | null
          device_name?: string | null
          email?: string | null
          full_name: string
          guardian_id?: string | null
          id?: string
          lead_id?: string | null
          linked_student_ids?: string[] | null
          notes?: string | null
          phone: string
          profile_id?: string | null
          school_id: string
          student_id?: string | null
          tags?: string[] | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          contact_type?: string
          contact_types?: string[] | null
          created_at?: string | null
          device_name?: string | null
          email?: string | null
          full_name?: string
          guardian_id?: string | null
          id?: string
          lead_id?: string | null
          linked_student_ids?: string[] | null
          notes?: string | null
          phone?: string
          profile_id?: string | null
          school_id?: string
          student_id?: string | null
          tags?: string[] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contacts_guardian_id_fkey"
            columns: ["guardian_id"]
            isOneToOne: false
            referencedRelation: "guardians"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "enrollment_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools_with_counts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      contracts: {
        Row: {
          contract_number: string | null
          created_at: string
          document_url: string | null
          end_date: string | null
          guardian_id: string | null
          id: string
          monthly_value: number | null
          school_id: string
          start_date: string | null
          status: string | null
          student_id: string
          terms: Json | null
          updated_at: string
        }
        Insert: {
          contract_number?: string | null
          created_at?: string
          document_url?: string | null
          end_date?: string | null
          guardian_id?: string | null
          id?: string
          monthly_value?: number | null
          school_id: string
          start_date?: string | null
          status?: string | null
          student_id: string
          terms?: Json | null
          updated_at?: string
        }
        Update: {
          contract_number?: string | null
          created_at?: string
          document_url?: string | null
          end_date?: string | null
          guardian_id?: string | null
          id?: string
          monthly_value?: number | null
          school_id?: string
          start_date?: string | null
          status?: string | null
          student_id?: string
          terms?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contracts_guardian_id_fkey"
            columns: ["guardian_id"]
            isOneToOne: false
            referencedRelation: "guardians"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools_with_counts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_entries: {
        Row: {
          class_id: string
          content: string | null
          created_at: string
          entry_date: string
          homework: string | null
          id: string
          observations: string | null
          school_id: string
          teacher_id: string
          updated_at: string
        }
        Insert: {
          class_id: string
          content?: string | null
          created_at?: string
          entry_date?: string
          homework?: string | null
          id?: string
          observations?: string | null
          school_id: string
          teacher_id: string
          updated_at?: string
        }
        Update: {
          class_id?: string
          content?: string | null
          created_at?: string
          entry_date?: string
          homework?: string | null
          id?: string
          observations?: string | null
          school_id?: string
          teacher_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_entries_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_entries_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_entries_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools_with_counts"
            referencedColumns: ["id"]
          },
        ]
      }
      discount_types: {
        Row: {
          created_at: string
          description: string | null
          discount_fixed: number | null
          discount_percentage: number | null
          id: string
          is_active: boolean | null
          name: string
          school_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          discount_fixed?: number | null
          discount_percentage?: number | null
          id?: string
          is_active?: boolean | null
          name: string
          school_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          discount_fixed?: number | null
          discount_percentage?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          school_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "discount_types_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discount_types_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools_with_counts"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_details: {
        Row: {
          bank_account: string | null
          bank_agency: string | null
          bank_name: string | null
          created_at: string
          department: string | null
          hire_date: string | null
          id: string
          notes: string | null
          pix_key: string | null
          position: string | null
          salary: number | null
          salary_type: string | null
          school_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          bank_account?: string | null
          bank_agency?: string | null
          bank_name?: string | null
          created_at?: string
          department?: string | null
          hire_date?: string | null
          id?: string
          notes?: string | null
          pix_key?: string | null
          position?: string | null
          salary?: number | null
          salary_type?: string | null
          school_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          bank_account?: string | null
          bank_agency?: string | null
          bank_name?: string | null
          created_at?: string
          department?: string | null
          hire_date?: string | null
          id?: string
          notes?: string | null
          pix_key?: string | null
          position?: string | null
          salary?: number | null
          salary_type?: string | null
          school_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_details_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_details_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools_with_counts"
            referencedColumns: ["id"]
          },
        ]
      }
      enrollment_lead_activities: {
        Row: {
          activity_type: string
          created_at: string | null
          description: string | null
          id: string
          lead_id: string
          user_id: string
        }
        Insert: {
          activity_type: string
          created_at?: string | null
          description?: string | null
          id?: string
          lead_id: string
          user_id: string
        }
        Update: {
          activity_type?: string
          created_at?: string | null
          description?: string | null
          id?: string
          lead_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrollment_lead_activities_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "enrollment_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollment_lead_activities_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      enrollment_leads: {
        Row: {
          assigned_to: string | null
          created_at: string | null
          expected_start: string | null
          guardian_cpf: string | null
          guardian_email: string | null
          guardian_name: string
          guardian_phone: string
          id: string
          interest_level: string | null
          lost_reason: string | null
          next_follow_up: string | null
          notes: string | null
          school_id: string
          sector_id: string | null
          source: string | null
          status: string | null
          student_birth_date: string | null
          student_grade: string | null
          student_name: string
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string | null
          expected_start?: string | null
          guardian_cpf?: string | null
          guardian_email?: string | null
          guardian_name: string
          guardian_phone: string
          id?: string
          interest_level?: string | null
          lost_reason?: string | null
          next_follow_up?: string | null
          notes?: string | null
          school_id: string
          sector_id?: string | null
          source?: string | null
          status?: string | null
          student_birth_date?: string | null
          student_grade?: string | null
          student_name: string
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          created_at?: string | null
          expected_start?: string | null
          guardian_cpf?: string | null
          guardian_email?: string | null
          guardian_name?: string
          guardian_phone?: string
          id?: string
          interest_level?: string | null
          lost_reason?: string | null
          next_follow_up?: string | null
          notes?: string | null
          school_id?: string
          sector_id?: string | null
          source?: string | null
          status?: string | null
          student_birth_date?: string | null
          student_grade?: string | null
          student_name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "enrollment_leads_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollment_leads_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollment_leads_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools_with_counts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollment_leads_sector_id_fkey"
            columns: ["sector_id"]
            isOneToOne: false
            referencedRelation: "sectors"
            referencedColumns: ["id"]
          },
        ]
      }
      enrollments: {
        Row: {
          class_id: string
          created_at: string
          discount_fixed: number | null
          discount_percentage: number | null
          discount_type_id: string | null
          documents: Json | null
          enrollment_date: string | null
          id: string
          monthly_value: number | null
          notes: string | null
          payment_plan_id: string | null
          school_id: string
          status: string | null
          student_id: string
          total_value: number | null
          updated_at: string
          year: number
        }
        Insert: {
          class_id: string
          created_at?: string
          discount_fixed?: number | null
          discount_percentage?: number | null
          discount_type_id?: string | null
          documents?: Json | null
          enrollment_date?: string | null
          id?: string
          monthly_value?: number | null
          notes?: string | null
          payment_plan_id?: string | null
          school_id: string
          status?: string | null
          student_id: string
          total_value?: number | null
          updated_at?: string
          year: number
        }
        Update: {
          class_id?: string
          created_at?: string
          discount_fixed?: number | null
          discount_percentage?: number | null
          discount_type_id?: string | null
          documents?: Json | null
          enrollment_date?: string | null
          id?: string
          monthly_value?: number | null
          notes?: string | null
          payment_plan_id?: string | null
          school_id?: string
          status?: string | null
          student_id?: string
          total_value?: number | null
          updated_at?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_discount_type_id_fkey"
            columns: ["discount_type_id"]
            isOneToOne: false
            referencedRelation: "discount_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_payment_plan_id_fkey"
            columns: ["payment_plan_id"]
            isOneToOne: false
            referencedRelation: "payment_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools_with_counts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      evolution_instances: {
        Row: {
          api_key: string | null
          api_url: string | null
          connected_phone: string | null
          created_at: string
          display_name: string | null
          id: string
          instance_name: string
          qr_code: string | null
          school_id: string
          status: string | null
          updated_at: string
        }
        Insert: {
          api_key?: string | null
          api_url?: string | null
          connected_phone?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          instance_name: string
          qr_code?: string | null
          school_id: string
          status?: string | null
          updated_at?: string
        }
        Update: {
          api_key?: string | null
          api_url?: string | null
          connected_phone?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          instance_name?: string
          qr_code?: string | null
          school_id?: string
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "evolution_instances_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evolution_instances_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools_with_counts"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_ledger: {
        Row: {
          account_id: string | null
          amount: number
          created_at: string
          date: string
          description: string
          id: string
          notes: string | null
          reference: string | null
          school_id: string
          type: string
        }
        Insert: {
          account_id?: string | null
          amount: number
          created_at?: string
          date?: string
          description: string
          id?: string
          notes?: string | null
          reference?: string | null
          school_id: string
          type: string
        }
        Update: {
          account_id?: string | null
          amount?: number
          created_at?: string
          date?: string
          description?: string
          id?: string
          notes?: string | null
          reference?: string | null
          school_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_ledger_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_ledger_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_ledger_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools_with_counts"
            referencedColumns: ["id"]
          },
        ]
      }
      grades: {
        Row: {
          class_id: string
          created_at: string
          date: string | null
          grade_type: string | null
          id: string
          max_value: number | null
          notes: string | null
          period: string | null
          student_id: string
          subject: string | null
          teacher_id: string | null
          value: number | null
        }
        Insert: {
          class_id: string
          created_at?: string
          date?: string | null
          grade_type?: string | null
          id?: string
          max_value?: number | null
          notes?: string | null
          period?: string | null
          student_id: string
          subject?: string | null
          teacher_id?: string | null
          value?: number | null
        }
        Update: {
          class_id?: string
          created_at?: string
          date?: string | null
          grade_type?: string | null
          id?: string
          max_value?: number | null
          notes?: string | null
          period?: string | null
          student_id?: string
          subject?: string | null
          teacher_id?: string | null
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "grades_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grades_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      guardian_portal_access: {
        Row: {
          created_at: string
          email: string
          guardian_id: string
          id: string
          is_active: boolean
          school_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          guardian_id: string
          id?: string
          is_active?: boolean
          school_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          guardian_id?: string
          id?: string
          is_active?: boolean
          school_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "guardian_portal_access_guardian_id_fkey"
            columns: ["guardian_id"]
            isOneToOne: true
            referencedRelation: "guardians"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guardian_portal_access_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guardian_portal_access_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools_with_counts"
            referencedColumns: ["id"]
          },
        ]
      }
      guardians: {
        Row: {
          address: string | null
          cpf: string | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          is_primary: boolean | null
          phone: string | null
          relationship: string | null
          school_id: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          cpf?: string | null
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          is_primary?: boolean | null
          phone?: string | null
          relationship?: string | null
          school_id: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          cpf?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          is_primary?: boolean | null
          phone?: string | null
          relationship?: string | null
          school_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "guardians_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guardians_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools_with_counts"
            referencedColumns: ["id"]
          },
        ]
      }
      instance_sectors: {
        Row: {
          created_at: string
          id: string
          instance_id: string
          sector_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          instance_id: string
          sector_id: string
        }
        Update: {
          created_at?: string
          id?: string
          instance_id?: string
          sector_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "instance_sectors_instance_id_fkey"
            columns: ["instance_id"]
            isOneToOne: false
            referencedRelation: "evolution_instances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "instance_sectors_sector_id_fkey"
            columns: ["sector_id"]
            isOneToOne: false
            referencedRelation: "sectors"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          city: string | null
          contact_name: string
          created_at: string
          email: string
          id: string
          message: string | null
          phone: string | null
          school_name: string
          source: string | null
          state: string | null
          status: string | null
          student_count: string | null
          updated_at: string
        }
        Insert: {
          city?: string | null
          contact_name: string
          created_at?: string
          email: string
          id?: string
          message?: string | null
          phone?: string | null
          school_name: string
          source?: string | null
          state?: string | null
          status?: string | null
          student_count?: string | null
          updated_at?: string
        }
        Update: {
          city?: string | null
          contact_name?: string
          created_at?: string
          email?: string
          id?: string
          message?: string | null
          phone?: string | null
          school_name?: string
          source?: string | null
          state?: string | null
          status?: string | null
          student_count?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      lesson_plans: {
        Row: {
          class_id: string
          content: string | null
          created_at: string
          end_date: string | null
          evaluation: string | null
          id: string
          methodology: string | null
          objectives: string | null
          resources: string | null
          school_id: string
          start_date: string
          status: string | null
          subject: string | null
          teacher_id: string
          title: string
          updated_at: string
        }
        Insert: {
          class_id: string
          content?: string | null
          created_at?: string
          end_date?: string | null
          evaluation?: string | null
          id?: string
          methodology?: string | null
          objectives?: string | null
          resources?: string | null
          school_id: string
          start_date: string
          status?: string | null
          subject?: string | null
          teacher_id: string
          title: string
          updated_at?: string
        }
        Update: {
          class_id?: string
          content?: string | null
          created_at?: string
          end_date?: string | null
          evaluation?: string | null
          id?: string
          methodology?: string | null
          objectives?: string | null
          resources?: string | null
          school_id?: string
          start_date?: string
          status?: string | null
          subject?: string | null
          teacher_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_plans_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_plans_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_plans_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools_with_counts"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_plans: {
        Row: {
          created_at: string
          description: string | null
          discount_percentage: number | null
          id: string
          installments: number
          is_active: boolean | null
          name: string
          school_id: string
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          discount_percentage?: number | null
          id?: string
          installments?: number
          is_active?: boolean | null
          name: string
          school_id: string
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          discount_percentage?: number | null
          id?: string
          installments?: number
          is_active?: boolean | null
          name?: string
          school_id?: string
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_plans_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_plans_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools_with_counts"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          billing_id: string
          created_at: string
          id: string
          notes: string | null
          payment_date: string
          payment_method: string | null
          receipt_url: string | null
        }
        Insert: {
          amount: number
          billing_id: string
          created_at?: string
          id?: string
          notes?: string | null
          payment_date?: string
          payment_method?: string | null
          receipt_url?: string | null
        }
        Update: {
          amount?: number
          billing_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          payment_date?: string
          payment_method?: string | null
          receipt_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_billing_id_fkey"
            columns: ["billing_id"]
            isOneToOne: false
            referencedRelation: "billing"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_plans: {
        Row: {
          created_at: string
          description: string | null
          features: Json | null
          id: string
          is_active: boolean | null
          max_students: number | null
          min_students: number | null
          name: string
          price_per_student: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          max_students?: number | null
          min_students?: number | null
          name: string
          price_per_student?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          max_students?: number | null
          min_students?: number | null
          name?: string
          price_per_student?: number
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string
          id: string
          is_active: boolean | null
          phone: string | null
          school_id: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name: string
          id: string
          is_active?: boolean | null
          phone?: string | null
          school_id?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string
          id?: string
          is_active?: boolean | null
          phone?: string | null
          school_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools_with_counts"
            referencedColumns: ["id"]
          },
        ]
      }
      psychology_records: {
        Row: {
          attachments: Json | null
          created_at: string
          description: string | null
          duration_minutes: number | null
          follow_up_date: string | null
          follow_up_notes: string | null
          id: string
          participants: string | null
          professional_id: string
          record_date: string
          record_type: string
          school_id: string
          status: string | null
          student_id: string
          title: string
          updated_at: string
        }
        Insert: {
          attachments?: Json | null
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          follow_up_date?: string | null
          follow_up_notes?: string | null
          id?: string
          participants?: string | null
          professional_id: string
          record_date?: string
          record_type?: string
          school_id: string
          status?: string | null
          student_id: string
          title: string
          updated_at?: string
        }
        Update: {
          attachments?: Json | null
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          follow_up_date?: string | null
          follow_up_notes?: string | null
          id?: string
          participants?: string | null
          professional_id?: string
          record_date?: string
          record_type?: string
          school_id?: string
          status?: string | null
          student_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "psychology_records_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "psychology_records_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "psychology_records_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools_with_counts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "psychology_records_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      quick_replies: {
        Row: {
          category: string | null
          content: string
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean | null
          school_id: string
          sector_id: string | null
          shortcut: string
          title: string
        }
        Insert: {
          category?: string | null
          content: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          school_id: string
          sector_id?: string | null
          shortcut: string
          title: string
        }
        Update: {
          category?: string | null
          content?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          school_id?: string
          sector_id?: string | null
          shortcut?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "quick_replies_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quick_replies_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quick_replies_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools_with_counts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quick_replies_sector_id_fkey"
            columns: ["sector_id"]
            isOneToOne: false
            referencedRelation: "sectors"
            referencedColumns: ["id"]
          },
        ]
      }
      school_calendar: {
        Row: {
          affects_school_days: boolean | null
          calendar_id: string | null
          created_at: string | null
          description: string | null
          end_date: string | null
          event_type: string
          id: string
          school_id: string
          start_date: string
          title: string
          updated_at: string | null
          year: number
        }
        Insert: {
          affects_school_days?: boolean | null
          calendar_id?: string | null
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          event_type?: string
          id?: string
          school_id: string
          start_date: string
          title: string
          updated_at?: string | null
          year: number
        }
        Update: {
          affects_school_days?: boolean | null
          calendar_id?: string | null
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          event_type?: string
          id?: string
          school_id?: string
          start_date?: string
          title?: string
          updated_at?: string | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "school_calendar_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "calendars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_calendar_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_calendar_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools_with_counts"
            referencedColumns: ["id"]
          },
        ]
      }
      school_subscriptions: {
        Row: {
          billing_day: number | null
          created_at: string
          custom_price_per_student: number | null
          expires_at: string | null
          id: string
          notes: string | null
          plan_id: string | null
          school_id: string
          started_at: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          billing_day?: number | null
          created_at?: string
          custom_price_per_student?: number | null
          expires_at?: string | null
          id?: string
          notes?: string | null
          plan_id?: string | null
          school_id: string
          started_at?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          billing_day?: number | null
          created_at?: string
          custom_price_per_student?: number | null
          expires_at?: string | null
          id?: string
          notes?: string | null
          plan_id?: string | null
          school_id?: string
          started_at?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "platform_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_subscriptions_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: true
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_subscriptions_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: true
            referencedRelation: "schools_with_counts"
            referencedColumns: ["id"]
          },
        ]
      }
      schools: {
        Row: {
          address: string | null
          created_at: string
          email: string | null
          id: string
          logo_url: string | null
          name: string
          phone: string | null
          settings: Json | null
          slug: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          logo_url?: string | null
          name: string
          phone?: string | null
          settings?: Json | null
          slug: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          phone?: string | null
          settings?: Json | null
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      sectors: {
        Row: {
          created_at: string
          description: string | null
          evolution_instance: string | null
          id: string
          is_active: boolean | null
          name: string
          school_id: string
          updated_at: string
          whatsapp_number: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          evolution_instance?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          school_id: string
          updated_at?: string
          whatsapp_number?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          evolution_instance?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          school_id?: string
          updated_at?: string
          whatsapp_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sectors_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sectors_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools_with_counts"
            referencedColumns: ["id"]
          },
        ]
      }
      student_classes: {
        Row: {
          class_id: string
          created_at: string
          enrollment_date: string | null
          id: string
          status: string | null
          student_id: string
        }
        Insert: {
          class_id: string
          created_at?: string
          enrollment_date?: string | null
          id?: string
          status?: string | null
          student_id: string
        }
        Update: {
          class_id?: string
          created_at?: string
          enrollment_date?: string | null
          id?: string
          status?: string | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_classes_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_classes_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_guardians: {
        Row: {
          created_at: string
          guardian_id: string
          id: string
          student_id: string
        }
        Insert: {
          created_at?: string
          guardian_id: string
          id?: string
          student_id: string
        }
        Update: {
          created_at?: string
          guardian_id?: string
          id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_guardians_guardian_id_fkey"
            columns: ["guardian_id"]
            isOneToOne: false
            referencedRelation: "guardians"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_guardians_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          address: string | null
          birth_date: string | null
          created_at: string
          enrollment_number: string | null
          full_name: string
          gender: string | null
          id: string
          is_active: boolean | null
          notes: string | null
          photo_url: string | null
          school_id: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          birth_date?: string | null
          created_at?: string
          enrollment_number?: string | null
          full_name: string
          gender?: string | null
          id?: string
          is_active?: boolean | null
          notes?: string | null
          photo_url?: string | null
          school_id: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          birth_date?: string | null
          created_at?: string
          enrollment_number?: string | null
          full_name?: string
          gender?: string | null
          id?: string
          is_active?: boolean | null
          notes?: string | null
          photo_url?: string | null
          school_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "students_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools_with_counts"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_invoices: {
        Row: {
          created_at: string
          due_date: string
          id: string
          notes: string | null
          paid_at: string | null
          payment_method: string | null
          payment_reference: string | null
          price_per_student: number
          reference_month: string
          school_id: string
          status: string | null
          student_count: number
          subscription_id: string | null
          total_amount: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          due_date: string
          id?: string
          notes?: string | null
          paid_at?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          price_per_student: number
          reference_month: string
          school_id: string
          status?: string | null
          student_count?: number
          subscription_id?: string | null
          total_amount: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          due_date?: string
          id?: string
          notes?: string | null
          paid_at?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          price_per_student?: number
          reference_month?: string
          school_id?: string
          status?: string | null
          student_count?: number
          subscription_id?: string | null
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_invoices_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_invoices_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools_with_counts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_invoices_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "school_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      super_admins: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      teacher_classes: {
        Row: {
          class_id: string
          created_at: string
          id: string
          subject: string | null
          teacher_id: string
        }
        Insert: {
          class_id: string
          created_at?: string
          id?: string
          subject?: string | null
          teacher_id: string
        }
        Update: {
          class_id?: string
          created_at?: string
          id?: string
          subject?: string | null
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_classes_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          school_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          school_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          school_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools_with_counts"
            referencedColumns: ["id"]
          },
        ]
      }
      user_sectors: {
        Row: {
          created_at: string
          id: string
          sector_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          sector_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          sector_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_sectors_sector_id_fkey"
            columns: ["sector_id"]
            isOneToOne: false
            referencedRelation: "sectors"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_conversations: {
        Row: {
          assigned_to: string | null
          closed_at: string | null
          contact_id: string | null
          contact_name: string | null
          created_at: string
          guardian_id: string | null
          id: string
          last_message_at: string | null
          opened_at: string | null
          phone: string
          priority: string | null
          resolution_summary: string | null
          school_id: string
          sector_id: string | null
          status: string | null
          student_id: string | null
          tags: string[] | null
          ticket_status: string | null
          unread_count: number | null
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          closed_at?: string | null
          contact_id?: string | null
          contact_name?: string | null
          created_at?: string
          guardian_id?: string | null
          id?: string
          last_message_at?: string | null
          opened_at?: string | null
          phone: string
          priority?: string | null
          resolution_summary?: string | null
          school_id: string
          sector_id?: string | null
          status?: string | null
          student_id?: string | null
          tags?: string[] | null
          ticket_status?: string | null
          unread_count?: number | null
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          closed_at?: string | null
          contact_id?: string | null
          contact_name?: string | null
          created_at?: string
          guardian_id?: string | null
          id?: string
          last_message_at?: string | null
          opened_at?: string | null
          phone?: string
          priority?: string | null
          resolution_summary?: string | null
          school_id?: string
          sector_id?: string | null
          status?: string | null
          student_id?: string | null
          tags?: string[] | null
          ticket_status?: string | null
          unread_count?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_conversations_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_conversations_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_conversations_guardian_id_fkey"
            columns: ["guardian_id"]
            isOneToOne: false
            referencedRelation: "guardians"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_conversations_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_conversations_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools_with_counts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_conversations_sector_id_fkey"
            columns: ["sector_id"]
            isOneToOne: false
            referencedRelation: "sectors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_conversations_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_messages: {
        Row: {
          body: string | null
          conversation_id: string
          created_at: string
          direction: string
          external_id: string | null
          id: string
          is_quick_reply: boolean | null
          media_caption: string | null
          media_filename: string | null
          media_url: string | null
          message_type: string | null
          reaction: string | null
          reply_to_id: string | null
          status: string | null
        }
        Insert: {
          body?: string | null
          conversation_id: string
          created_at?: string
          direction: string
          external_id?: string | null
          id?: string
          is_quick_reply?: boolean | null
          media_caption?: string | null
          media_filename?: string | null
          media_url?: string | null
          message_type?: string | null
          reaction?: string | null
          reply_to_id?: string | null
          status?: string | null
        }
        Update: {
          body?: string | null
          conversation_id?: string
          created_at?: string
          direction?: string
          external_id?: string | null
          id?: string
          is_quick_reply?: boolean | null
          media_caption?: string | null
          media_filename?: string | null
          media_url?: string | null
          message_type?: string | null
          reaction?: string | null
          reply_to_id?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_messages"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      schools_with_counts: {
        Row: {
          address: string | null
          created_at: string | null
          email: string | null
          id: string | null
          logo_url: string | null
          name: string | null
          phone: string | null
          settings: Json | null
          slug: string | null
          student_count: number | null
          updated_at: string | null
          user_count: number | null
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          email?: string | null
          id?: string | null
          logo_url?: string | null
          name?: string | null
          phone?: string | null
          settings?: Json | null
          slug?: string | null
          student_count?: never
          updated_at?: string | null
          user_count?: never
        }
        Update: {
          address?: string | null
          created_at?: string | null
          email?: string | null
          id?: string | null
          logo_url?: string | null
          name?: string | null
          phone?: string | null
          settings?: Json | null
          slug?: string | null
          student_count?: never
          updated_at?: string | null
          user_count?: never
        }
        Relationships: []
      }
    }
    Functions: {
      get_guardian_id_for_user: { Args: { _user_id: string }; Returns: string }
      get_guardian_student_ids: {
        Args: { _guardian_id: string }
        Returns: string[]
      }
      get_user_school_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _school_id?: string
          _user_id: string
        }
        Returns: boolean
      }
      has_sector_access: {
        Args: { _sector_id: string; _user_id: string }
        Returns: boolean
      }
      is_director: {
        Args: { _school_id?: string; _user_id: string }
        Returns: boolean
      }
      is_guardian_user: { Args: { _user_id: string }; Returns: boolean }
      is_super_admin: { Args: { _user_id?: string }; Returns: boolean }
    }
    Enums: {
      app_role: "teacher" | "secretary" | "admin" | "director"
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
      app_role: ["teacher", "secretary", "admin", "director"],
    },
  },
} as const
