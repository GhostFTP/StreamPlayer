export default function SkeletonCard({ type = 'media' }) {
  if (type === 'file') {
    return (
      <div className="file-card skeleton">
        <div className="file-thumb skeleton-block" />
        <div className="file-info">
          <div className="skeleton-line skeleton-line-title" />
          <div className="skeleton-line skeleton-line-sub" />
        </div>
      </div>
    );
  }

  return (
    <div className="media-card skeleton">
      <div className="media-poster skeleton-block" />
      <div className="media-info">
        <div className="skeleton-line skeleton-line-title" />
        <div className="skeleton-line skeleton-line-sub" />
      </div>
    </div>
  );
}
