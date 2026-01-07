export interface Alert {
  id: string;
  type: "Emergency Alert" | "Emergency Report";
  location: string;
  timestamp: string;
  latitude: number;
  longitude: number;
  name?: string;
  age?: number;
  bloodType?: string;
  sex?: string;
  // For Emergency Reports
  imageUrl?: string;
  description?: string;
}

