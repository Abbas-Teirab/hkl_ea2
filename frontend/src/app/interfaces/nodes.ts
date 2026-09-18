export interface Node {
  id?: string;
  created_at?: string;
  name: string;
  transmission_period: number;
  location: string;
  enabled: boolean;
}
