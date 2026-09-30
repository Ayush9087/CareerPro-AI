import React from 'react';
import { Button } from './Button';
import { AlertCircle, FileText, MessageSquare, Target, TrendingUp, Zap } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  icon?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  action,
  icon,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-6 sm:p-12 text-center bg-career-surface rounded-2xl border-2 border-dashed border-career-border max-w-2xl mx-auto my-8 w-full min-w-0">
      <div className="w-16 h-16 bg-career-background rounded-full flex items-center justify-center shadow-sm mb-4 text-career-muted">
        {icon || <FileText size={32} />}
      </div>
      <h3 className="text-xl font-semibold text-career-dark mb-2">{title}</h3>
      <p className="text-career-muted mb-6 max-w-sm">
        {description}
      </p>
      {action && (
        <Button onClick={action.onClick} className="w-full sm:w-auto">
          {action.label}
        </Button>
      )}
    </div>
  );
};
