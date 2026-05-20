import { cn } from '@/lib/utils';

export function Loader({ size = 16, className }: { size?: number; className?: string }) {
  return (
    <span className={cn('flex items-center gap-1', className)}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          style={{ width: size * 0.375, height: size * 0.375, animationDelay: `${i * 0.15}s` }}
          className="rounded-full bg-current opacity-60 animate-bounce"
        />
      ))}
    </span>
  );
}
