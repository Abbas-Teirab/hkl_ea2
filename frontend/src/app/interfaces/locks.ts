export interface Lock {
  id?: string;
  name: string;
  mac_address: string;
  ip_address: string;
  locked: boolean;
  created_at?: string;
}
