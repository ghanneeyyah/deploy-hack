// src/components/common/SuccessAlert.jsx
import { CheckCircle, X } from 'lucide-react';
import { cn } from '../../utils/helpers';

export default function SuccessAlert({ message, onDismiss, className }) {
  if (!message) return null;

  return (
    <div
      className={cn(
        'flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-lg',
        className
      )}
      role="alert"
    >
      <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
      <p className="text-sm text-green-700 flex-grow">{message}</p>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="text-green-400 hover:text-green-600 flex-shrink-0"
          aria-label="Dismiss message"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}