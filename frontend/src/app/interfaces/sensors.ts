export interface Reading {
  id?: string;
  created_at: string;
  mac_address: string;
  ip_address: string;
  location: string;
  temperature: number;
  humidity: number;
  oxygen: number;
  conductivity: number;
}
