import * as React from 'react';
import { cn } from '@/lib/utils';

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<'textarea'>
>(({ className, value, ...props }, ref) => {
  return (
    <div className="grid w-full">
      <textarea
        className={cn(
          'col-start-1 row-start-1 resize-none overflow-hidden',
          'flex min-h-[40px] w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
          className
        )}
        ref={ref}
        rows={1}
        value={value}
        {...props}
      />
      {/* This div is a "shadow" element that grows with the content, forcing the grid cell to expand. The textarea then fills the cell. */}
      <div
        className={cn(
          'pointer-events-none col-start-1 row-start-1 invisible whitespace-pre-wrap',
          'flex min-h-[40px] w-full rounded-md px-3 py-2 text-base md:text-sm',
           className
        )}
      >
        {/* Add a non-breaking space to ensure the div has height even when empty, matching textarea's min-height */}
        {value}&nbsp;
      </div>
    </div>
  );
});
Textarea.displayName = 'Textarea';

export { Textarea };
