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
      className="rounded-lg border px-3 py-2 text-sm hover:bg-muted"
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      aria-label="toggle theme"
    >
      {mounted && theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
}
