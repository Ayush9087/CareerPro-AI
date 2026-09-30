import React from 'react';
import { Button } from './Button';
import { AlertCircle, RefreshCcw } from 'lucide-react';

interface ErrorStateProps {
  message: string;
  retryLabel?: string;
  onRetry: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  message,
  retryLabel = 'Try Again',
  onRetry,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center max-w-md mx-auto my-8">
      <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mb-4 text-rose-500">
        <AlertCircle size={32} />
      </div>
      <h3 className="text-lg font-semibold text-slate-900 mb-2">
        Oops! Something went wrong
      </h3>
      <p className="text-slate-500 mb-6">
        {message}
      </p>
      <Button
        onClick={onRetry}
        variant="outline"
        className="flex items-center gap-2"
      >
        <RefreshCcw size={16} />
        {retryLabel}
      </Button>
    </div>
  );
};
