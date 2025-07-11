import { forwardRef, memo } from "react";
import { Button as RadixButton } from "@radix-ui/themes";
import type { ButtonProps as RadixButtonProps } from "@radix-ui/themes";
import { clsx } from "clsx";
import type { BaseComponentProps } from "@/types";

interface ButtonProps extends RadixButtonProps, BaseComponentProps {
  variant?: 'solid' | 'soft' | 'outline' | 'ghost';
  size?: '1' | '2' | '3' | '4';
  loading?: boolean;
  disabled?: boolean;
}

export const Button = memo(forwardRef<HTMLButtonElement, ButtonProps>(
  function Button({ 
    children, 
    className, 
    loading, 
    disabled, 
    variant = 'solid',
    size = '2',
    ...props 
  }, ref) {
    return (
      <RadixButton
        ref={ref}
        variant={variant}
        size={size}
        disabled={disabled || loading}
        className={clsx(
          'transition-all duration-200',
          'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
          {
            'opacity-50 cursor-not-allowed': disabled,
            'cursor-wait': loading,
          },
          className
        )}
        {...props}
      >
        {loading ? (
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            Loading...
          </div>
        ) : children}
      </RadixButton>
    );
  }
)); 