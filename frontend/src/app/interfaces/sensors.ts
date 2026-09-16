export interface Sensor {
  id?: string;
  name: string;
  mac_address: string;
  ip_address: string;
  locked: boolean;
  temperature: number;
  humidity: number;
  pressure: number;
  altitude: number;
  created_at: string;
}
