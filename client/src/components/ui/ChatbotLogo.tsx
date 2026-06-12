interface ChatbotLogoProps {
  size?: number;
  className?: string;
}

export function ChatbotLogo({ size = 36, className }: ChatbotLogoProps) {
  return (
    <img
      src="/logo/chatbotlogo.png"
      alt="Assistant IA"
      width={size}
      height={size}
      className={className}
      style={{ width: size, height: size, objectFit: 'contain', display: 'block', flexShrink: 0 }}
    />
  );
}
