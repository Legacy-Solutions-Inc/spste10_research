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
  Account: undefined;
  Profile: undefined;
  History: undefined;
  HistoryDetails: {
    id: string;
    incidentType: "alert" | "report";
    imageUri: string;
    date: string; // ISO string to avoid serialization issues
    latitude: number;
    longitude: number;
    locationName: string;
    description?: string;
    status: string;
  };
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}

