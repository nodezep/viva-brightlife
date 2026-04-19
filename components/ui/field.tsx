import type {ReactNode} from 'react';

type FieldProps = {
  label: string;
  children: ReactNode;
};

export function Field({label, children}: FieldProps) {
  return (
    <div className="relative">
      {children}
      <label className="pointer-events-none absolute left-3 top-1 text-[10px] font-bold uppercase tracking-wider text-primary/50 transition-all peer-placeholder-shown:top-2.5 peer-placeholder-shown:text-sm peer-placeholder-shown:font-normal peer-placeholder-shown:text-muted-foreground peer-focus:top-1 peer-focus:text-[10px] peer-focus:font-bold peer-focus:text-primary">
        {label}
      </label>
    </div>
  );
}
