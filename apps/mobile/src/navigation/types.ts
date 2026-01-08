import type { NavigatorScreenParams } from "@react-navigation/native";

export type RootStackParamList = {
  Login1: undefined;
  Login2: undefined;
  Login3: undefined;
  Login4: undefined;
  Login5: { email?: string } | undefined;
  Home: undefined;
  Alert: undefined;
  Alert2: { alertId: string };
  Alert3: { alertId?: string };
  AlertRejected: undefined;
  Report1: undefined;
  Report2: {
    imageUri: string;
    latitude: number;
    longitude: number;
    timestamp: string; // ISO string to avoid non-serializable warning
    locationName?: string;
  };
  Report3: {
    imageUri: string;
    latitude: number;
    longitude: number;
    timestamp: string; // ISO string to avoid non-serializable warning
    locationName?: string;
    aiDescription?: string; // AI-generated description of the emergency photo
  };
  Report4: { reportId: string };
  Report5: { reportId?: string };
  ReportRejected: undefined;
  Settings1: undefined;
  Profile: undefined;
  History: undefined;
  HistoryDetails: {
    imageUri: string;
    date: string; // ISO string to avoid serialization issues
    latitude: number;
    longitude: number;
    locationName: string;
    description?: string;
    status?: string;
    incidentType?: "alert" | "report";
    alertId?: string;
  };
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}

