import React from 'react';

interface ProgressBarProps {
  progress: number;
  taskName: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ progress, taskName }) => {
  // Ensure progress is within the 0-100 range
  const clampedProgress = Math.min(100, Math.max(0, progress));

  return (
    <div>
      <div className="flex justify-between mb-1">
        <span className="text-sm font-medium text-gray-700">{taskName}</span>
        <span className="text-sm font-medium text-gray-700">{Math.round(clampedProgress)}%</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2.5" aria-live="polite">
        <div
          className="bg-teal-600 h-2.5 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${clampedProgress}%` }}
          role="progressbar"
          aria-valuenow={clampedProgress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Processing progress: ${taskName}`}
        ></div>
      </div>
    </div>
  );
};