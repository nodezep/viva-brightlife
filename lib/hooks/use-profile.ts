'use client';

import {useEffect, useState} from 'react';

type Profile = {
  role: 'admin' | 'manager' | 'viewer';
  is_active: boolean;
};

export function useProfile() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const fetchProfile = async () => {
      try {
        const response = await fetch('/api/profile/me');
        if (!response.ok) {
          return;
        }
        const data = await response.json();
        if (mounted && data.profile) {
          setProfile(data.profile as Profile);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    void fetchProfile();
    return () => {
      mounted = false;
    };
  }, []);

  return {profile, loading};
}
