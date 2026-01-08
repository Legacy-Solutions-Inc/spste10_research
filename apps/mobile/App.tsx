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
import { AlertScreen } from "./src/screens/alert/AlertScreen";
import { AlertScreen2 } from "./src/screens/alert/AlertScreen2";
import { AlertScreen3 } from "./src/screens/alert/AlertScreen3";
import { AlertScreenRejected } from "./src/screens/alert/AlertScreenRejected";
import { ReportScreen1 } from "./src/screens/report/ReportScreen1";
import { ReportScreen2 } from "./src/screens/report/ReportScreen2";
import { ReportScreen3 } from "./src/screens/report/ReportScreen3";
import { ReportScreen4 } from "./src/screens/report/ReportScreen4";
import { ReportScreen5 } from "./src/screens/report/ReportScreen5";
import { ReportScreenRejected } from "./src/screens/report/ReportScreenRejected";
import { SettingsScreen1 } from "./src/screens/settingsOptions/SettingsScreen1";
import { ProfileScreen } from "./src/screens/settingsOptions/ProfileScreen";
import { HistoryScreen } from "./src/screens/settingsOptions/HistoryScreen";
import { HistoryDetailsScreen } from "./src/screens/settingsOptions/HistoryDetailsScreen";
import type { RootStackParamList } from "./src/navigation/types";
import "./global.css";

const Stack = createNativeStackNavigator<RootStackParamList>();

function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <StatusBar style="auto" />
        <Stack.Navigator initialRouteName="Login1">
        <Stack.Screen
          name="Login1"
          component={LoginScreen1}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Login2"
          component={LoginScreen2}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Login3"
          component={CreateAccountScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Login4"
          component={ResetPassword}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Login5"
          component={EmailConfirmationScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Alert"
          component={AlertScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Alert2"
          component={AlertScreen2}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Alert3"
          component={AlertScreen3}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="AlertRejected"
          component={AlertScreenRejected}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Report1"
          component={ReportScreen1}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Report2"
          component={ReportScreen2}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Report3"
          component={ReportScreen3}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Report4"
          component={ReportScreen4}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Report5"
          component={ReportScreen5}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="ReportRejected"
          component={ReportScreenRejected}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Settings1"
          component={SettingsScreen1}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Profile"
          component={ProfileScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="History"
          component={HistoryScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="HistoryDetails"
          component={HistoryDetailsScreen}
          options={{ headerShown: false }}
        />
      </Stack.Navigator>
    </NavigationContainer>
    </SafeAreaProvider>
  );
}

export default App;