import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Per user, so a second account on the same phone still gets onboarding
const keyFor = (userId: string) => `agap.onboarded.${userId}`;

export async function markOnboarded(userId: string) {
  try {
    await AsyncStorage.setItem(keyFor(userId), "1");
  } catch (err) {
    console.log("Couldn't save onboarding flag:", err);
  }
}

/** null while loading, then whether this user has finished onboarding */
export function useOnboarded(userId: string | undefined) {
  const [onboarded, setOnboarded] = useState<boolean | null>(null);

  useEffect(() => {
    if (!userId) {
      setOnboarded(null);
      return;
    }
    let active = true;
    AsyncStorage.getItem(keyFor(userId))
      .then((value) => {
        if (active) setOnboarded(value === "1");
      })
      // Storage failure shouldn't trap anyone in onboarding
      .catch(() => {
        if (active) setOnboarded(true);
      });
    return () => {
      active = false;
    };
  }, [userId]);

  return onboarded;
}
