import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', label, error, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-career-dark mb-1.5">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={`flex w-full rounded-xl border bg-career-surface px-4 py-2.5 text-base text-career-text placeholder:text-career-muted/60 focus:outline-none focus:ring-2 focus:ring-career-primary focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200 ${
            error ? 'border-red-500 focus:ring-red-500' : 'border-career-border hover:border-career-primary/40'
          } ${className}`}
          {...props}
        />
        {error && (
          <p className="mt-1.5 text-sm text-red-600">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
