import React from 'react';

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  className?: string;
  animated?: boolean;
}

const Skeleton: React.FC<SkeletonProps> = ({ 
  width = '100%', 
  height = '20px', 
  className = '', 
  animated = true 
}) => (
  <div
    className={`skeleton ${animated ? 'skeleton-animated' : ''} ${className}`}
    style={{
      width: typeof width === 'number' ? `${width}px` : width,
      height: typeof height === 'number' ? `${height}px` : height,
    }}
  />
);

interface AppSkeletonProps {
  loadingProgress: number;
}

export const AppSkeleton: React.FC<AppSkeletonProps> = ({ loadingProgress }) => (
  <div className="app-skeleton">
    {/* Header skeleton */}
    <div className="skeleton-header">
      <Skeleton width={200} height={32} className="skeleton-title" />
      <Skeleton width={300} height={16} className="skeleton-subtitle" />
    </div>

    {/* Progress bar */}
    <div className="skeleton-progress">
      <div className="progress-bar">
        <div 
          className="progress-fill" 
          style={{ width: `${loadingProgress}%` }}
        />
      </div>
      <div className="progress-text">Loading... {loadingProgress}%</div>
    </div>

    {/* Sidebar skeleton */}
    <div className="skeleton-sidebar">
      <div className="skeleton-location-status">
        <Skeleton width={120} height={16} />
        <Skeleton width={80} height={12} />
      </div>
      
      <div className="skeleton-filters">
        <Skeleton width="100%" height={40} />
        <Skeleton width="100%" height={40} />
      </div>
      
      <div className="skeleton-items">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="skeleton-item">
            <Skeleton width="70%" height={20} />
            <Skeleton width="100%" height={16} />
            <Skeleton width="60%" height={14} />
          </div>
        ))}
      </div>
    </div>

    {/* Map skeleton */}
    <div className="skeleton-map">
      <div className="skeleton-map-placeholder">
        <div className="map-loading-icon">🗺️</div>
        <div className="map-loading-text">Loading Map...</div>
      </div>
      
      {/* Floating buttons skeleton */}
      <div className="skeleton-floating-buttons">
        <Skeleton width={56} height={56} className="skeleton-button" />
        <Skeleton width={72} height={72} className="skeleton-button" />
      </div>
    </div>
  </div>
);

export default Skeleton;
