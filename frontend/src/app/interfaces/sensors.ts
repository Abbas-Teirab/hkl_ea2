export interface Reading {
  id?: string;
  created_at: string;
  mac_address: string;
  ip_address: string;
  locked: number;
  location: string;
  temperature: number;
  humidity: number;
  pressure: number;
  altitude: number;
}
