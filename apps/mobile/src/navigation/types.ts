import type { NavigatorScreenParams } from "@react-navigation/native";

export type RootStackParamList = {
  Login1: undefined;
  Login2: undefined;
  Login3: undefined;
  Login4: undefined;
  Login5: { email?: string } | undefined;
  OnboardingInfo: undefined;
  OnboardingLocation: undefined;
  Home: undefined;
  // Without an id the screen sends a new alert; with one it follows it live
  AlertLive: { id?: string } | undefined;
  Report1: undefined;
  // Location is resolved on the review screen, not at capture
  Report2: { imageUri: string; timestamp: string };
  Report3: { imageUri: string; timestamp: string };
  ReportLive: { id: string };
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

