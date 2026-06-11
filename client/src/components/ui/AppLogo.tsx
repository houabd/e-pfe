interface AppLogoProps {
  size?: number;
  className?: string;
}

export function AppLogo({ size = 36, className }: AppLogoProps) {
  return (
    <img
      src="/logo.png"
      alt="e-PFC"
      width={size}
      height={size}
      style={{
        width: size,
        height: size,
        flexShrink: 0,
        objectFit: 'contain',
        display: 'block',
        mixBlendMode: 'multiply',
      }}
      className={className}
    />
  );
}
