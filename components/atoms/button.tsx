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
    solid: 'bg-lime-600 hover:bg-lime-700 active:bg-lime-800 text-white border-lime-600 dark:bg-lime-500 dark:hover:bg-lime-600 dark:active:bg-lime-700',
    soft: 'bg-lime-100 dark:bg-lime-900/30 hover:bg-lime-200 text-lime-800 dark:text-lime-300 border-lime-100 dark:bg-lime-900/30 dark:hover:bg-lime-900/50 dark:text-lime-300 dark:border-lime-900/30',
    outline: 'border-lime-600 text-lime-600 dark:text-lime-400 hover:bg-lime-50 bg-transparent dark:border-lime-400 dark:text-lime-400 dark:hover:bg-lime-900/30',
    ghost: 'text-lime-600 dark:text-lime-400 hover:bg-lime-50 bg-transparent border-transparent dark:text-lime-400 dark:hover:bg-lime-900/30'
  },
  secondary: {
    solid: 'bg-gray-600 hover:bg-gray-700 active:bg-gray-800 text-white border-gray-600 dark:bg-muted0 dark:hover:bg-gray-600',
    soft: 'bg-gray-100 dark:bg-gray-700 hover:bg-muted text-gray-800 dark:text-gray-200 border-border dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-200 dark:border-gray-800',
    outline: 'border-gray-600 text-muted-foreground hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-800 bg-transparent dark:border-gray-400 dark:text-muted-foreground dark:hover:bg-gray-800',
    ghost: 'text-muted-foreground hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-800 bg-transparent border-transparent dark:text-muted-foreground dark:hover:bg-gray-800'
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
    solid: 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white border-blue-600 dark:bg-blue-500 dark:hover:bg-blue-600',
    soft: 'bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 text-blue-800 dark:text-blue-300 border-blue-100 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 dark:text-blue-300 dark:border-blue-900/30',
    outline: 'border-blue-600 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:bg-blue-900/20 bg-transparent dark:border-blue-400 dark:text-blue-400 dark:hover:bg-blue-900/30',
    ghost: 'text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:bg-blue-900/20 bg-transparent border-transparent dark:text-blue-400 dark:hover:bg-blue-900/30'
  },
  light: {
    solid: 'bg-gray-100 dark:bg-gray-700 hover:bg-muted active:bg-muted-foreground/30 text-gray-800 dark:text-gray-200 border-border dark:bg-gray-800 dark:hover:bg-gray-700 dark:active:bg-gray-600 dark:text-gray-200 dark:border-gray-800',
    soft: 'bg-muted hover:bg-gray-100 dark:hover:bg-gray-700 dark:bg-gray-700 text-foreground border-gray-50 dark:bg-gray-900 dark:hover:bg-gray-800 dark:text-muted-foreground dark:border-gray-900',
    outline: 'border-gray-300 dark:border-gray-600 text-foreground hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-800 bg-transparent dark:border-gray-600 dark:text-muted-foreground dark:hover:bg-gray-800',
    ghost: 'text-foreground hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-800 bg-transparent border-transparent dark:text-muted-foreground dark:hover:bg-gray-800'
  },
  dark: {
    solid: 'bg-gray-900 hover:bg-gray-800 active:bg-gray-700 text-white border-gray-900 dark:bg-gray-100 dark:bg-gray-700 dark:hover:bg-muted dark:active:bg-muted-foreground/30 dark:text-foreground dark:border-border',
    soft: 'bg-gray-800 hover:bg-gray-700 text-gray-100 border-gray-800 dark:bg-muted dark:hover:bg-muted-foreground/30 dark:text-gray-800 dark:text-gray-200 dark:border-border',
    outline: 'border-gray-900 text-foreground hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-800 bg-transparent dark:border-border dark:text-gray-100 dark:hover:bg-gray-800',
    ghost: 'text-foreground hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-800 bg-transparent border-transparent dark:text-gray-100 dark:hover:bg-gray-800'
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
            'focus:ring-lime-500': intent === 'primary',
            'focus:ring-gray-500': intent === 'secondary',
            'focus:ring-green-500': intent === 'success',
            'focus:ring-red-500': intent === 'danger',
            'focus:ring-amber-500': intent === 'warning',
            'focus:ring-blue-500': intent === 'info',
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