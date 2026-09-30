import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'accent' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'primary', size = 'md', isLoading = false, children, disabled, ...props }, ref) => {
    
    const baseStyles = "inline-flex items-center justify-center font-medium rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-career-background disabled:opacity-50 disabled:pointer-events-none btn-press cursor-pointer max-w-full whitespace-normal text-center";
    
    const variants = {
      primary: "bg-career-primary text-career-surface hover:bg-career-primary/85 hover:shadow-md focus:ring-career-primary",
      secondary: "bg-transparent border border-career-border text-career-text hover:bg-career-border/20 hover:border-career-primary/40 focus:ring-career-primary",
      accent: "bg-career-accent text-career-dark hover:bg-career-accent/85 hover:shadow-md focus:ring-career-accent",
      ghost: "bg-transparent text-career-text hover:bg-career-border/20 focus:ring-career-primary"
    };

    const sizes = {
      sm: "min-h-11 px-4 text-sm gap-1.5",
      md: "min-h-11 px-4 sm:px-6 text-sm sm:text-base gap-2",
      lg: "min-h-12 sm:min-h-14 px-4 sm:px-8 text-base sm:text-lg gap-2"
    };

    const classes = `${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`;

    return (
      <button ref={ref} className={classes} disabled={disabled || isLoading} {...props}>
        {isLoading ? (
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        ) : null}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
