'use client';

import {useMemo, useState} from 'react';

type Props = {
  size?: number;
  className?: string;
};

const candidates = ['/logo-circle.png', '/logo.png', '/logo.jpg', '/logo.jpeg'];

export function BrandLogo({size = 44, className = ''}: Props) {
  const [index, setIndex] = useState(0);
  const src = useMemo(() => candidates[index] ?? null, [index]);

  return (
    <div
      className={`relative overflow-hidden rounded-full ring-2 ring-primary/25 bg-white ${className}`}
      style={{width: size, height: size}}
      aria-label="Viva Brightlife logo"
    >
      {src ? (
        <img
          src={src}
          alt="Viva Brightlife"
          className="h-full w-full object-cover scale-[1.45] object-[50%_48%]"
          onError={() => setIndex((current) => current + 1)}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-primary text-[11px] font-bold text-white">
          VB
        </div>
      )}
    </div>
  );
}