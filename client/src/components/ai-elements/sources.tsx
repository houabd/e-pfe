import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { BookOpenIcon, ChevronDownIcon } from 'lucide-react';
import type { ComponentProps } from 'react';

export const Sources = ({ className, ...props }: ComponentProps<'div'>) => (
  <Collapsible className={cn('text-xs', className)} {...props} />
);

export const SourcesTrigger = ({
  className, count, children, ...props
}: ComponentProps<typeof CollapsibleTrigger> & { count: number }) => (
  <CollapsibleTrigger
    className={cn('flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors', className)}
    {...props}
  >
    {children ?? (
      <>
        <BookOpenIcon className="size-3" />
        <span className="font-medium">{count} source{count > 1 ? 's' : ''} utilisée{count > 1 ? 's' : ''}</span>
        <ChevronDownIcon className="size-3 transition-transform duration-200 [[data-state=open]_&]:rotate-180" />
      </>
    )}
  </CollapsibleTrigger>
);

export const SourcesContent = ({ className, ...props }: ComponentProps<typeof CollapsibleContent>) => (
  <CollapsibleContent className={cn('mt-2 flex flex-col gap-1.5', className)} {...props} />
);

export const Source = ({ title, className, ...props }: ComponentProps<'div'> & { title: string }) => (
  <div className={cn('flex items-center gap-1.5 text-muted-foreground', className)} {...props}>
    <BookOpenIcon className="size-3 shrink-0" />
    <span className="font-medium truncate">{title}</span>
  </div>
);
