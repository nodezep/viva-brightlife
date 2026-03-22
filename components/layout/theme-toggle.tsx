'use client';

import {useEffect, useState} from 'react';
import {Moon, Sun} from 'lucide-react';
import {useTheme} from 'next-themes';

export function ThemeToggle() {
  const {theme, setTheme} = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <button
      type="button"
      className="rounded-lg border px-2 py-2 text-xs hover:bg-muted sm:px-3 sm:text-sm"
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      aria-label="toggle theme"
    >
      {mounted && theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
}
