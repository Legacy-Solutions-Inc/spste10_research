import type { NavigatorScreenParams } from "@react-navigation/native";

export type RootStackParamList = {
  Login1: undefined;
  Login2: undefined;
  Login3: undefined;
  Login4: undefined;
  Login5: undefined;
  Home: undefined;
  Alert: undefined;
  Alert2: undefined;
  Alert3: undefined;
  AlertRejected: undefined;
  Report1: undefined;
  Report2: {
    imageUri: string;
    latitude: number;
    longitude: number;
    timestamp: Date;
    locationName?: string;
  };
  Report3: {
    imageUri: string;
    latitude: number;
    longitude: number;
    timestamp: Date;
    locationName?: string;
  };
  Report4: undefined;
  Report5: undefined;
  ReportRejected: undefined;
  Settings1: undefined;
  Profile: undefined;
  History: undefined;
  HistoryDetails: {
    imageUri: string;
    date: Date;
    latitude: number;
    longitude: number;
    locationName: string;
  };
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}

