import { GraduationCap } from 'lucide-react';

interface AppLogoProps {
  size?: number;
  className?: string;
}

export function AppLogo({ size = 36, className }: AppLogoProps) {
  const iconSize = Math.round(size * 0.56);
  return (
    <div
      style={{ width: size, height: size, flexShrink: 0, background: 'linear-gradient(135deg, #1e72d8, #00c9a8)' }}
      className={`flex items-center justify-center ${className ?? ''}`}
    >
      <GraduationCap style={{ width: iconSize, height: iconSize }} className="text-white" />
    </div>
  );
}
