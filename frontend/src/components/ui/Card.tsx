import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className = '', hover = false, children, ...props }, ref) => {
    return (
      <div 
        ref={ref} 
        className={`bg-career-surface border border-career-border text-career-text rounded-2xl p-4 sm:p-6 shadow-[0_1px_3px_rgba(48,42,30,0.04)] w-full max-w-full min-w-0 ${hover ? 'card-hover' : ''} ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';
