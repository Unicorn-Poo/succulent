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
    solid: 'bg-lime-600 hover:bg-lime-700 active:bg-lime-800 text-white border-lime-600',
    soft: 'bg-lime-100 hover:bg-lime-200 text-lime-800 border-lime-100',
    outline: 'border-lime-600 text-lime-600 hover:bg-lime-50 bg-transparent',
    ghost: 'text-lime-600 hover:bg-lime-50 bg-transparent border-transparent'
  },
  secondary: {
    solid: 'bg-gray-600 hover:bg-gray-700 active:bg-gray-800 text-white border-gray-600',
    soft: 'bg-gray-100 hover:bg-gray-200 text-gray-800 border-gray-100',
    outline: 'border-gray-600 text-gray-600 hover:bg-gray-50 bg-transparent',
    ghost: 'text-gray-600 hover:bg-gray-50 bg-transparent border-transparent'
  },
  success: {
    solid: 'bg-green-600 hover:bg-green-700 active:bg-green-800 text-white border-green-600',
    soft: 'bg-green-100 hover:bg-green-200 text-green-800 border-green-100',
    outline: 'border-green-600 text-green-600 hover:bg-green-50 bg-transparent',
    ghost: 'text-green-600 hover:bg-green-50 bg-transparent border-transparent'
  },
  danger: {
    solid: 'bg-red-600 hover:bg-red-700 active:bg-red-800 text-white border-red-600',
    soft: 'bg-red-100 hover:bg-red-200 text-red-800 border-red-100',
    outline: 'border-red-600 text-red-600 hover:bg-red-50 bg-transparent',
    ghost: 'text-red-600 hover:bg-red-50 bg-transparent border-transparent'
  },
  warning: {
    solid: 'bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white border-amber-600',
    soft: 'bg-amber-100 hover:bg-amber-200 text-amber-800 border-amber-100',
    outline: 'border-amber-600 text-amber-600 hover:bg-amber-50 bg-transparent',
    ghost: 'text-amber-600 hover:bg-amber-50 bg-transparent border-transparent'
  },
  info: {
    solid: 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white border-blue-600',
    soft: 'bg-blue-100 hover:bg-blue-200 text-blue-800 border-blue-100',
    outline: 'border-blue-600 text-blue-600 hover:bg-blue-50 bg-transparent',
    ghost: 'text-blue-600 hover:bg-blue-50 bg-transparent border-transparent'
  },
  light: {
    solid: 'bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-gray-800 border-gray-100',
    soft: 'bg-gray-50 hover:bg-gray-100 text-gray-700 border-gray-50',
    outline: 'border-gray-300 text-gray-700 hover:bg-gray-50 bg-transparent',
    ghost: 'text-gray-700 hover:bg-gray-50 bg-transparent border-transparent'
  },
  dark: {
    solid: 'bg-gray-900 hover:bg-gray-800 active:bg-gray-700 text-white border-gray-900',
    soft: 'bg-gray-800 hover:bg-gray-700 text-gray-100 border-gray-800',
    outline: 'border-gray-900 text-gray-900 hover:bg-gray-50 bg-transparent',
    ghost: 'text-gray-900 hover:bg-gray-50 bg-transparent border-transparent'
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