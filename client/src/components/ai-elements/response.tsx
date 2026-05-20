import { memo } from 'react';
import { Streamdown } from 'streamdown';
import { cn } from '@/lib/utils';

export const Response = memo(
  ({ children, className }: { children: string; className?: string }) => (
    <Streamdown
      className={cn('chat-response [&>*:first-child]:mt-0 [&>*:last-child]:mb-0', className)}
    >
      {children}
    </Streamdown>
  ),
  (prev, next) => prev.children === next.children,
);
