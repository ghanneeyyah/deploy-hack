// src/components/common/LoadingSpinner.jsx
import { cn } from '../../utils/helpers';

export default function LoadingSpinner({ size = 'md', className }) {
  const sizeClasses = {
    sm: 'w-5 h-5 border-2',
    md: 'w-8 h-8 border-3',
    lg: 'w-12 h-12 border-4',
  };

  return (
    <div
      className={cn(
        'rounded-full border-maroon-200 border-t-maroon-800 animate-spin',
        sizeClasses[size],
        className
      )}
      role="status"
      aria-label="Loading"
    />
  );
}