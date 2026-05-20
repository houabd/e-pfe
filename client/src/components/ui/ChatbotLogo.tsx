import { Bot } from 'lucide-react';

interface ChatbotLogoProps {
  size?: number;
  className?: string;
}

export function ChatbotLogo({ size = 36, className }: ChatbotLogoProps) {
  const iconSize = Math.round(size * 0.56);
  return (
    <div
      style={{ width: size, height: size, flexShrink: 0, background: 'linear-gradient(135deg, #1e72d8, #00c9a8)' }}
      className={`rounded-full flex items-center justify-center ${className ?? ''}`}
    >
      <Bot style={{ width: iconSize, height: iconSize }} className="text-white" />
    </div>
  );
}
