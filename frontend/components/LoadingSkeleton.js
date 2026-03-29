import React from 'react';

const SHIMMER_KEYFRAMES = `
  @keyframes shimmer {
    0% {
      background-position: -1000px 0;
    }
    100% {
      background-position: 1000px 0;
    }
  }
`;

const SkeletonPulse = ({ width = '100%', height = '20px', style = {} }) => (
  <div
    style={{
      width,
      height,
      backgroundColor: '#1a1a1a',
      backgroundImage: 'linear-gradient(90deg, #1a1a1a 0%, #222222 50%, #1a1a1a 100%)',
      backgroundSize: '1000px 100%',
      animation: 'shimmer 2s infinite',
      borderRadius: '4px',
      ...style,
    }}
  />
);

const CardSkeleton = () => (
  <div
    style={{
      width: '100%',
      padding: '16px',
      backgroundColor: '#111111',
      border: '1px solid #1E1E1E',
      borderRadius: '8px',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
    }}
  >
    <SkeletonPulse width="60%" height="24px" />
    <SkeletonPulse width="100%" height="16px" />
    <SkeletonPulse width="100%" height="16px" />
    <SkeletonPulse width="80%" height="16px" />
  </div>
);

const TableSkeleton = ({ rows = 5 }) => (
  <div
    style={{
      width: '100%',
      backgroundColor: '#111111',
      border: '1px solid #1E1E1E',
      borderRadius: '8px',
      overflow: 'hidden',
    }}
  >
    {/* Header */}
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '16px',
        padding: '16px',
        borderBottom: '1px solid #1E1E1E',
        backgroundColor: '#0A0A0A',
      }}
    >
      <SkeletonPulse width="80%" height="20px" />
      <SkeletonPulse width="80%" height="20px" />
      <SkeletonPulse width="80%" height="20px" />
      <SkeletonPulse width="80%" height="20px" />
    </div>

    {/* Rows */}
    {Array.from({ length: rows }).map((_, i) => (
      <div
        key={i}
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '16px',
          padding: '16px',
          borderBottom: i < rows - 1 ? '1px solid #1E1E1E' : 'none',
        }}
      >
        <SkeletonPulse width="85%" height="16px" />
        <SkeletonPulse width="75%" height="16px" />
        <SkeletonPulse width="80%" height="16px" />
        <SkeletonPulse width="70%" height="16px" />
      </div>
    ))}
  </div>
);

const ChartSkeleton = () => (
  <div
    style={{
      width: '100%',
      padding: '16px',
      backgroundColor: '#111111',
      border: '1px solid #1E1E1E',
      borderRadius: '8px',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
    }}
  >
    <SkeletonPulse width="40%" height="24px" />
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-end',
        gap: '8px',
        height: '200px',
        justifyContent: 'space-around',
      }}
    >
      {Array.from({ length: 12 }).map((_, i) => (
        <SkeletonPulse
          key={i}
          width="8%"
          height={`${Math.random() * 160 + 40}px`}
          style={{ alignSelf: 'flex-end' }}
        />
      ))}
    </div>
  </div>
);

const TextSkeleton = ({ lines = 3 }) => (
  <div
    style={{
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
    }}
  >
    {Array.from({ length: lines }).map((_, i) => (
      <SkeletonPulse
        key={i}
        width={i === lines - 1 ? '70%' : '100%'}
        height="16px"
      />
    ))}
  </div>
);

const StatSkeleton = () => (
  <div
    style={{
      width: '100%',
      padding: '16px',
      backgroundColor: '#111111',
      border: '1px solid #1E1E1E',
      borderRadius: '8px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    }}
  >
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
      <SkeletonPulse width="40%" height="16px" />
      <SkeletonPulse width="60%" height="28px" />
    </div>
    <SkeletonPulse width="60px" height="60px" style={{ borderRadius: '8px' }} />
  </div>
);

const FullPageSkeleton = () => (
  <div
    style={{
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      gap: '24px',
      padding: '24px',
    }}
  >
    {/* Header */}
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <SkeletonPulse width="30%" height="32px" />
      <SkeletonPulse width="120px" height="40px" />
    </div>

    {/* Stats Grid */}
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
      }}
    >
      {Array.from({ length: 4 }).map((_, i) => (
        <StatSkeleton key={i} />
      ))}
    </div>

    {/* Chart */}
    <ChartSkeleton />

    {/* Table */}
    <div>
      <SkeletonPulse width="20%" height="24px" style={{ marginBottom: '12px' }} />
      <TableSkeleton rows={5} />
    </div>
  </div>
);

/**
 * LoadingSkeleton Component
 *
 * A versatile loading skeleton component with multiple variants for different UI patterns.
 * Uses CSS keyframe animations for a subtle shimmer effect on dark backgrounds.
 *
 * @component
 * @param {string} type - The skeleton variant: 'card', 'table', 'chart', 'text', 'stat', or 'full'
 * @param {number} rows - Number of rows (for 'table' type, default: 5)
 * @param {number} lines - Number of lines (for 'text' type, default: 3)
 * @param {object} style - Additional inline styles to apply
 *
 * @example
 * // Card skeleton
 * <LoadingSkeleton type="card" />
 *
 * @example
 * // Table with 8 rows
 * <LoadingSkeleton type="table" rows={8} />
 *
 * @example
 * // Text with 5 lines
 * <LoadingSkeleton type="text" lines={5} />
 *
 * @example
 * // Full page dashboard layout
 * <LoadingSkeleton type="full" />
 */
function LoadingSkeleton({ type = 'card', rows = 5, lines = 3, style = {} }) {
  const renderSkeleton = () => {
    switch (type) {
      case 'card':
        return <CardSkeleton />;
      case 'table':
        return <TableSkeleton rows={rows} />;
      case 'chart':
        return <ChartSkeleton />;
      case 'text':
        return <TextSkeleton lines={lines} />;
      case 'stat':
        return <StatSkeleton />;
      case 'full':
        return <FullPageSkeleton />;
      default:
        return <CardSkeleton />;
    }
  };

  return (
    <>
      <style>{SHIMMER_KEYFRAMES}</style>
      <div style={style}>{renderSkeleton()}</div>
    </>
  );
}

export default LoadingSkeleton;

export {
  LoadingSkeleton,
  CardSkeleton,
  TableSkeleton,
  ChartSkeleton,
  TextSkeleton,
  StatSkeleton,
  FullPageSkeleton,
};
