import React from 'react';
import { EmptyState } from './EmptyState';
import { ErrorState } from './ErrorState';

interface StateWrapperProps {
  isLoading: boolean;
  error: Error | null;
  isEmpty: boolean;
  skeleton: React.ReactNode;
  emptyState: React.ReactNode;
  onRetry: () => void;
  children: React.ReactNode;
  customError?: React.ReactNode;
}

export const StateWrapper: React.FC<StateWrapperProps> = ({
  isLoading,
  error,
  isEmpty,
  skeleton,
  emptyState,
  onRetry,
  children,
  customError,
}) => {
  if (isLoading) {
    return <div className="w-full">{skeleton}</div>;
  }

  if (error) {
    return customError ? (
      <div>{customError}</div>
    ) : (
      <ErrorState
        message={error.message}
        onRetry={onRetry}
      />
    );
  }

  if (isEmpty) {
    return <div className="w-full">{emptyState}</div>;
  }

  return <div className="w-full">{children}</div>;
};
