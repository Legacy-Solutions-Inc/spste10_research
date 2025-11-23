import { View, Text, StyleSheet } from "react-native";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Session } from "@supabase/supabase-js";

export function HomeScreen() {
  const [session, setSession] = useState<Session | null>(null);
  const [supabaseAvailable, setSupabaseAvailable] = useState(true);

  useEffect(() => {
    // Check if Supabase is available
    const checkSupabase = async () => {
      try {
        const result = await supabase.auth.getSession();
        if (result.error && result.error.message?.includes("supabaseUrl is required")) {
          setSupabaseAvailable(false);
          return;
        }
        setSession(result.data?.session || null);
        setSupabaseAvailable(true);
      } catch (err: any) {
        if (err?.message?.includes("supabaseUrl is required")) {
          setSupabaseAvailable(false);
        } else {
          // Supabase is available but no session
          setSupabaseAvailable(true);
          setSession(null);
        }
      }
    };

    checkSupabase();

    try {
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, session) => {
        setSession(session);
      });

      return () => {
        if (subscription) {
          subscription.unsubscribe();
        }
      };
    } catch (err) {
      // Supabase not available, no cleanup needed
      return () => {};
    }
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to SPSTE10 Research</Text>
      {!supabaseAvailable ? (
        <View style={styles.content}>
          <Text style={styles.subtitle}>Supabase is not configured</Text>
          <Text style={styles.text}>
            The app is running without a database connection.
          </Text>
          <Text style={styles.text}>
            To enable Supabase, add your credentials to the .env file.
          </Text>
        </View>
      ) : session ? (
        <View style={styles.content}>
          <Text style={styles.subtitle}>You are authenticated!</Text>
          <Text style={styles.text}>User ID: {session.user.id}</Text>
          <Text style={styles.text}>Email: {session.user.email}</Text>
        </View>
      ) : (
        <Text style={styles.subtitle}>Not authenticated</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  content: {
    marginTop: 20,
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 18,
    marginBottom: 12,
  },
  text: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8,
  },
});

