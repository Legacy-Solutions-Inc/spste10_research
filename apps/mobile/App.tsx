import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import {
  LoginScreen1,
  LoginScreen2,
  CreateAccountScreen,
  ResetPassword,
  EmailConfirmationScreen,
} from "./src/screens/auth/login";
import { HomeScreen } from "./src/screens/HomeScreen";
import { IncidentLiveScreen } from "./src/screens/live/IncidentLiveScreen";
import { ReportScreen1 } from "./src/screens/report/ReportScreen1";
import { ReportScreen2 } from "./src/screens/report/ReportScreen2";
import { ReportScreen3 } from "./src/screens/report/ReportScreen3";
import { AccountScreen } from "./src/screens/settingsOptions/AccountScreen";
import { EmergencyInfoScreen } from "./src/screens/onboarding/EmergencyInfoScreen";
import { LocationPermissionScreen } from "./src/screens/onboarding/LocationPermissionScreen";
import { HistoryScreen } from "./src/screens/settingsOptions/HistoryScreen";
import { HistoryDetailsScreen } from "./src/screens/settingsOptions/HistoryDetailsScreen";
import { BootScreen } from "./src/components/BootScreen";
import { AuthProvider, useAuth } from "./src/lib/auth";
import { useOnboarded } from "./src/lib/onboarding";
import type { RootStackParamList } from "./src/navigation/types";
import "./global.css";

const Stack = createNativeStackNavigator<RootStackParamList>();

// Live alert/report screens can only be left through their own buttons
const liveScreenOptions = { gestureEnabled: false };

function RootNavigator() {
  const { status, session } = useAuth();
  const onboarded = useOnboarded(
    status === "signedIn" ? session?.user.id : undefined
  );

  if (status === "loading" || (status === "signedIn" && onboarded === null)) {
    return <BootScreen />;
  }

  // The first screen of a group is where the navigator lands, so onboarding
  // goes first until this user has finished it
  const onboardingScreens = (
    <>
      <Stack.Screen name="OnboardingInfo" component={EmergencyInfoScreen} />
      <Stack.Screen
        name="OnboardingLocation"
        component={LocationPermissionScreen}
      />
    </>
  );

  // Rendering one set of screens or the other means signing out can't be
  // swiped back into Home, and a signed-in user never sees the login screens
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {status === "signedIn" ? (
        <>
          {!onboarded && onboardingScreens}
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen
            name="AlertLive"
            component={IncidentLiveScreen}
            options={liveScreenOptions}
          />
          <Stack.Screen name="Report1" component={ReportScreen1} />
          <Stack.Screen name="Report2" component={ReportScreen2} />
          <Stack.Screen name="Report3" component={ReportScreen3} />
          <Stack.Screen
            name="ReportLive"
            component={IncidentLiveScreen}
            options={liveScreenOptions}
          />
          <Stack.Screen name="Account" component={AccountScreen} />
          <Stack.Screen name="Profile" component={EmergencyInfoScreen} />
          <Stack.Screen name="History" component={HistoryScreen} />
          <Stack.Screen
            name="HistoryDetails"
            component={HistoryDetailsScreen}
          />
          {onboarded && onboardingScreens}
        </>
      ) : (
        <>
          <Stack.Screen name="Login1" component={LoginScreen1} />
          <Stack.Screen name="Login2" component={LoginScreen2} />
          <Stack.Screen name="Login3" component={CreateAccountScreen} />
          <Stack.Screen name="Login4" component={ResetPassword} />
          <Stack.Screen name="Login5" component={EmailConfirmationScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}

function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NavigationContainer>
          <StatusBar style="auto" />
          <RootNavigator />
        </NavigationContainer>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

export default App;
