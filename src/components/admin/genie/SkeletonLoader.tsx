import React from 'react';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'rectangular' | 'circular' | 'rounded';
  width?: string | number;
  height?: string | number;
  isDarkMode?: boolean;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  variant = 'rectangular',
  width,
  height,
  isDarkMode = false
}) => {
  const baseClasses = isDarkMode
    ? 'bg-gray-800'
    : 'bg-gray-200';

  const variantClasses = {
    text: 'rounded',
    rectangular: 'rounded-none',
    circular: 'rounded-full',
    rounded: 'rounded-xl'
  };

  const style: React.CSSProperties = {
    width: width ?? '100%',
    height: height ?? (variant === 'text' ? '1em' : '100px')
  };

  return (
    <div
      className={`${baseClasses} ${variantClasses[variant]} animate-pulse ${className}`}
      style={style}
    />
  );
};

// Pre-built skeleton layouts for common patterns
export const SourceCardSkeleton: React.FC<{ isDarkMode?: boolean }> = ({ isDarkMode = false }) => (
  <div className={`rounded-xl border p-3 ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>
    <div className="flex items-center gap-3">
      <Skeleton variant="circular" width={40} height={40} isDarkMode={isDarkMode} />
      <div className="flex-1 space-y-2">
        <Skeleton variant="text" width="70%" height={16} isDarkMode={isDarkMode} />
        <Skeleton variant="text" width="40%" height={12} isDarkMode={isDarkMode} />
      </div>
    </div>
  </div>
);

export const StageContentSkeleton: React.FC<{ isDarkMode?: boolean }> = ({ isDarkMode = false }) => (
  <div className="p-6 space-y-6">
    {/* Header */}
    <div className={`rounded-2xl p-6 ${isDarkMode ? 'bg-gray-800/50' : 'bg-gray-100'}`}>
      <div className="flex items-start gap-4">
        <Skeleton variant="rounded" width={48} height={48} isDarkMode={isDarkMode} />
        <div className="flex-1 space-y-3">
          <Skeleton variant="text" width="50%" height={24} isDarkMode={isDarkMode} />
          <Skeleton variant="text" width="80%" height={16} isDarkMode={isDarkMode} />
          <div className="flex gap-4 pt-2">
            <Skeleton variant="text" width={100} height={16} isDarkMode={isDarkMode} />
            <Skeleton variant="text" width={100} height={16} isDarkMode={isDarkMode} />
          </div>
        </div>
      </div>
    </div>

    {/* Grid */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="space-y-4">
        <Skeleton variant="text" width="30%" height={20} isDarkMode={isDarkMode} />
        <Skeleton variant="rounded" height={200} isDarkMode={isDarkMode} />
      </div>
      <div className="space-y-4">
        <Skeleton variant="text" width="30%" height={20} isDarkMode={isDarkMode} />
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <SourceCardSkeleton key={i} isDarkMode={isDarkMode} />
          ))}
        </div>
      </div>
    </div>
  </div>
);

export const PipelineRailSkeleton: React.FC<{ isDarkMode?: boolean }> = ({ isDarkMode = false }) => (
  <div className={`px-6 py-3 border-b ${isDarkMode ? 'border-gray-800 bg-gray-900/50' : 'border-gray-100 bg-white'}`}>
    <div className="flex items-center justify-center gap-2">
      {[...Array(6)].map((_, i) => (
        <React.Fragment key={i}>
          <div className="flex items-center gap-2">
            <Skeleton variant="circular" width={28} height={28} isDarkMode={isDarkMode} />
            <Skeleton variant="text" width={50} height={14} isDarkMode={isDarkMode} className="hidden sm:block" />
          </div>
          {i < 5 && <Skeleton variant="text" width={32} height={2} isDarkMode={isDarkMode} />}
        </React.Fragment>
      ))}
    </div>
  </div>
);

export const CopilotSkeleton: React.FC<{ isDarkMode?: boolean }> = ({ isDarkMode = false }) => (
  <div className={`w-80 flex flex-col border-l ${isDarkMode ? 'border-gray-800 bg-gray-900' : 'border-gray-200 bg-white'}`}>
    <div className={`px-4 py-3 border-b ${isDarkMode ? 'border-gray-800' : 'border-gray-100'}`}>
      <div className="flex items-center gap-2">
        <Skeleton variant="rounded" width={28} height={28} isDarkMode={isDarkMode} />
        <Skeleton variant="text" width={80} height={16} isDarkMode={isDarkMode} />
      </div>
    </div>
    <div className="flex-1 p-4 space-y-4">
      <Skeleton variant="rounded" height={80} isDarkMode={isDarkMode} />
      <div className="space-y-2">
        <Skeleton variant="text" width="40%" height={12} isDarkMode={isDarkMode} />
        <Skeleton variant="rounded" height={6} isDarkMode={isDarkMode} />
      </div>
      <div className="space-y-2">
        <Skeleton variant="text" width="30%" height={12} isDarkMode={isDarkMode} />
        <div className="space-y-1">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} variant="text" width="90%" height={12} isDarkMode={isDarkMode} />
          ))}
        </div>
      </div>
    </div>
  </div>
);

export default Skeleton;
