import { forwardRef, memo } from "react";
import { clsx } from "clsx";
import type { BaseComponentProps } from "@/types";

type ButtonIntent = 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info' | 'light' | 'dark';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, BaseComponentProps {
  variant?: 'solid' | 'soft' | 'outline' | 'ghost';
  size?: '1' | '2' | '3' | '4';
  intent?: ButtonIntent;
  loading?: boolean;
}

const intentStyles = {
  primary: {
    solid: 'bg-brand-seafoam hover:bg-brand-seafoam active:bg-brand-seafoam text-white border-brand-seafoam dark:bg-brand-seafoam dark:hover:bg-brand-seafoam dark:active:bg-brand-seafoam',
    soft: 'bg-brand-mint/20 dark:bg-brand-seafoam/20 hover:bg-brand-mint/30 text-brand-seafoam dark:text-brand-mint border-brand-mint/30 dark:bg-brand-seafoam/20 dark:hover:bg-brand-seafoam/50 dark:text-brand-mint dark:border-brand-seafoam/30',
    outline: 'border-brand-seafoam text-brand-seafoam dark:text-brand-mint hover:bg-brand-mint/10 bg-transparent dark:border-brand-mint dark:text-brand-mint dark:hover:bg-brand-seafoam/20',
    ghost: 'text-brand-seafoam dark:text-brand-mint hover:bg-brand-mint/10 bg-transparent border-transparent dark:text-brand-mint dark:hover:bg-brand-seafoam/20'
  },
  secondary: {
    solid: 'bg-muted-foreground/80 hover:bg-muted-foreground active:bg-muted-foreground text-white border-muted-foreground/80',
    soft: 'bg-muted hover:bg-muted/80 text-foreground border-border',
    outline: 'border-border text-muted-foreground hover:bg-muted bg-transparent',
    ghost: 'text-muted-foreground hover:bg-muted bg-transparent border-transparent'
  },
  success: {
    solid: 'bg-green-600 hover:bg-green-700 active:bg-green-800 text-white border-green-600 dark:bg-green-500 dark:hover:bg-green-600',
    soft: 'bg-green-100 dark:bg-green-900/30 hover:bg-green-200 text-green-800 dark:text-green-300 border-green-100 dark:bg-green-900/30 dark:hover:bg-green-900/50 dark:text-green-300 dark:border-green-900/30',
    outline: 'border-green-600 text-green-600 dark:text-green-400 hover:bg-green-50 dark:bg-green-900/20 bg-transparent dark:border-green-400 dark:text-green-400 dark:hover:bg-green-900/30',
    ghost: 'text-green-600 dark:text-green-400 hover:bg-green-50 dark:bg-green-900/20 bg-transparent border-transparent dark:text-green-400 dark:hover:bg-green-900/30'
  },
  danger: {
    solid: 'bg-red-600 hover:bg-red-700 active:bg-red-800 text-white border-red-600 dark:bg-red-500 dark:hover:bg-red-600',
    soft: 'bg-red-100 dark:bg-red-900/30 hover:bg-red-200 text-red-800 dark:text-red-300 border-red-100 dark:bg-red-900/30 dark:hover:bg-red-900/50 dark:text-red-300 dark:border-red-900/30',
    outline: 'border-red-600 text-red-600 dark:text-red-400 hover:bg-red-50 dark:bg-red-900/20 bg-transparent dark:border-red-400 dark:text-red-400 dark:hover:bg-red-900/30',
    ghost: 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:bg-red-900/20 bg-transparent border-transparent dark:text-red-400 dark:hover:bg-red-900/30'
  },
  warning: {
    solid: 'bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white border-amber-600 dark:bg-amber-500 dark:hover:bg-amber-600',
    soft: 'bg-amber-100 hover:bg-amber-200 text-amber-800 border-amber-100 dark:bg-amber-900/30 dark:hover:bg-amber-900/50 dark:text-amber-300 dark:border-amber-900/30',
    outline: 'border-amber-600 text-amber-600 hover:bg-amber-50 bg-transparent dark:border-amber-400 dark:text-amber-400 dark:hover:bg-amber-900/30',
    ghost: 'text-amber-600 hover:bg-amber-50 bg-transparent border-transparent dark:text-amber-400 dark:hover:bg-amber-900/30'
  },
  info: {
    solid: 'bg-brand-seafoam hover:bg-brand-seafoam active:bg-brand-seafoam text-white border-brand-seafoam dark:bg-brand-seafoam dark:hover:bg-brand-seafoam',
    soft: 'bg-brand-mint/20 dark:bg-brand-seafoam/20 hover:bg-brand-mint/30 text-brand-seafoam dark:text-brand-mint border-brand-mint/30 dark:bg-brand-seafoam/20 dark:hover:bg-brand-seafoam/50 dark:text-brand-mint dark:border-brand-seafoam/30',
    outline: 'border-brand-seafoam text-brand-seafoam dark:text-brand-mint hover:bg-brand-mint/10 dark:bg-brand-seafoam/20 bg-transparent dark:border-brand-mint dark:text-brand-mint dark:hover:bg-brand-seafoam/20',
    ghost: 'text-brand-seafoam dark:text-brand-mint hover:bg-brand-mint/10 dark:bg-brand-seafoam/20 bg-transparent border-transparent dark:text-brand-mint dark:hover:bg-brand-seafoam/20'
  },
  light: {
    solid: 'bg-muted hover:bg-muted/80 active:bg-muted-foreground/30 text-foreground border-border',
    soft: 'bg-muted hover:bg-muted/80 text-foreground border-border',
    outline: 'border-border text-foreground hover:bg-muted bg-transparent',
    ghost: 'text-foreground hover:bg-muted bg-transparent border-transparent'
  },
  dark: {
    solid: 'bg-foreground hover:bg-foreground/90 active:bg-foreground/80 text-background border-foreground',
    soft: 'bg-foreground/80 hover:bg-foreground/70 text-background border-foreground/80',
    outline: 'border-foreground text-foreground hover:bg-muted bg-transparent',
    ghost: 'text-foreground hover:bg-muted bg-transparent border-transparent'
  }
};

export const Button = memo(forwardRef<HTMLButtonElement, ButtonProps>(
  function Button({ 
    children, 
    className, 
    loading, 
    disabled, 
    variant = 'solid',
    intent = 'primary',
    size = '2',
    ...props 
  }, ref) {
    const intentClasses = intentStyles[intent][variant];
    
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={clsx(
          // Base styles
          'transition-all duration-200 cursor-pointer rounded-md font-medium border',
          'focus:outline-none focus:ring-2 focus:ring-offset-2',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'inline-flex items-center justify-center',
          // Size-specific padding
          size === '1' && 'px-3 py-1 text-sm',
          size === '2' && 'px-4 py-2 text-sm',
          size === '3' && 'px-6 py-3 text-base',
          size === '4' && 'px-8 py-4 text-lg',
          // Intent-based styling
          intentClasses,
          // Focus ring color based on intent
          {
            'focus:ring-brand-seafoam': intent === 'primary',
            'focus:ring-gray-500': intent === 'secondary',
            'focus:ring-green-500': intent === 'success',
            'focus:ring-red-500': intent === 'danger',
            'focus:ring-amber-500': intent === 'warning',
            'focus:ring-brand-seafoam': intent === 'info',
            'focus:ring-gray-300': intent === 'light',
            'focus:ring-gray-700': intent === 'dark',
          },
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
      </button>
    );
  }
)); 