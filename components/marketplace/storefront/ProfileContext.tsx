"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import {
  DEMO_PROFILES,
  type DemoProfile,
} from "@/lib/marketplace/utils/profiles";

interface ProfileContextValue {
  profile: DemoProfile;
  setProfileId: (id: string) => void;
}

const ProfileContext = createContext<ProfileContextValue | null>(null);

export function ProfileProvider({
  children,
  initialProfileId,
}: {
  children: ReactNode;
  initialProfileId: string;
}) {
  const router = useRouter();
  const [profile, setProfile] = useState<DemoProfile>(
    () => DEMO_PROFILES.find((p) => p.id === initialProfileId) ?? DEMO_PROFILES[0]
  );

  const setProfileId = useCallback(
    (id: string) => {
      const found = DEMO_PROFILES.find((p) => p.id === id);
      if (found) {
        setProfile(found);
        document.cookie = `exchange-profile=${id};path=/;max-age=31536000`;
        router.refresh();
      }
    },
    [router]
  );

  return (
    <ProfileContext value={{ profile, setProfileId }}>
      {children}
    </ProfileContext>
  );
}

export function useProfile() {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error("useProfile must be used within ProfileProvider");
  return ctx;
}
