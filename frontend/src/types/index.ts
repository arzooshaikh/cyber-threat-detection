export interface MilitaryBase {
  id: number;
  base_id: string;
  base_name: string;
  location: string;
  ip_subnet: string;
  contact_email: string | null;
  is_active: boolean;
  last_sync: string | null;
  created_at: string;
  updated_at: string;
}