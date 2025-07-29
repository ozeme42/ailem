import * as React from "react"
import { cn } from "@/lib/utils"

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<"textarea">
>(({ className, ...props }, ref) => {
  const internalRef = React.useRef<HTMLTextAreaElement>(null);
  const compositeRef = (el: HTMLTextAreaElement) => {
    if (typeof ref === 'function') {
      ref(el);
    } else if (ref) {
      ref.current = el;
    }
    (internalRef as React.MutableRefObject<HTMLTextAreaElement | null>).current = el;
  };

  React.useLayoutEffect(() => {
    const textarea = internalRef.current;
    if (textarea) {
      // Reset height to shrink on delete
      textarea.style.height = 'inherit';
      // Set height
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [props.value]); // Recalculate on value change

  return (
    <textarea
      className={cn(
        "flex w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "resize-none overflow-hidden",
        className
      )}
      ref={compositeRef}
      rows={1}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";

export { Textarea };
