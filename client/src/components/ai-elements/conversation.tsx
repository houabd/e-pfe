import { useStickToBottomContext, StickToBottom } from 'use-stick-to-bottom';
import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';
import type { ComponentProps } from 'react';

export const Conversation = ({ className, ...props }: ComponentProps<typeof StickToBottom>) => (
  <StickToBottom
    className={cn('relative flex-1 overflow-y-auto min-h-0', className)}
    initial="smooth"
    resize="smooth"
    role="log"
    {...props}
  />
);

export const ConversationContent = ({ className, ...props }: ComponentProps<typeof StickToBottom.Content>) => (
  <StickToBottom.Content className={cn('flex flex-col gap-5 p-4', className)} {...props} />
);

export function ConversationScrollButton() {
  const { isAtBottom, scrollToBottom } = useStickToBottomContext();
  if (isAtBottom) return null;
  return (
    <button
      type="button"
      onClick={() => scrollToBottom()}
      className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1 rounded-full border bg-background px-3 py-1.5 text-xs shadow-md hover:bg-muted transition-colors"
    >
      <ChevronDown className="size-3" /> Défiler vers le bas
    </button>
  );
}
