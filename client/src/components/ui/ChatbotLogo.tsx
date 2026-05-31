interface ChatbotLogoProps {
  size?: number;
  className?: string;
}

export function ChatbotLogo({ size = 36, className }: ChatbotLogoProps) {
  return (
    <img
      src="/chatbotlogo.png"
      alt="Assistant IA"
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
