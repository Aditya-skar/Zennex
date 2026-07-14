import React, { useCallback, useRef, useState } from 'react';
import { Play } from 'lucide-react';
import { fallbackImageFor, type HomeFeedPost } from '../HomeFeed/homeFeed';

const LONG_PRESS_MS = 450;

type DiscoverGridTileProps = {
  post: HomeFeedPost;
  onClick: () => void;
  onLongPress: () => void;
};

const DiscoverGridTile: React.FC<DiscoverGridTileProps> = ({ post, onClick, onLongPress }) => {
  const triedFallback = useRef(false);
  const pressTimer = useRef<number | null>(null);
  const longPressTriggered = useRef(false);
  const [imgSrc, setImgSrc] = useState(post.image ?? fallbackImageFor(post.id));

  const clearPress = useCallback(() => {
    if (pressTimer.current !== null) {
      window.clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  }, []);

  const startLongPress = useCallback(() => {
    longPressTriggered.current = false;
    clearPress();
    pressTimer.current = window.setTimeout(() => {
      longPressTriggered.current = true;
      onLongPress();
      if ('vibrate' in navigator) navigator.vibrate?.(12);
    }, LONG_PRESS_MS);
  }, [clearPress, onLongPress]);

  const handlePointerEnd = () => {
    clearPress();
  };

  const handleClick = (e: React.MouseEvent) => {
    if (longPressTriggered.current) {
      e.preventDefault();
      longPressTriggered.current = false;
      return;
    }
    onClick();
  };

  return (
    <div
      role="button"
      tabIndex={0}
      className="discover-grid-tile"
      aria-label={post.eventTitle}
      onTouchStart={startLongPress}
      onTouchEnd={handlePointerEnd}
      onTouchMove={clearPress}
      onTouchCancel={clearPress}
      onMouseDown={startLongPress}
      onMouseUp={handlePointerEnd}
      onMouseLeave={clearPress}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
    >
      {post.type === 'video' && post.videoUrl ? (
        <>
          <video
            src={post.videoUrl}
            className="discover-grid-media"
            muted
            playsInline
            preload="metadata"
          />
          <span className="discover-grid-type-badge" aria-hidden="true">
            <Play size={14} fill="currentColor" />
          </span>
        </>
      ) : post.type === 'poster' && post.image ? (
        <img
          src={imgSrc}
          alt=""
          className="discover-grid-media"
          loading="lazy"
          draggable={false}
          onError={() => {
            if (!triedFallback.current) {
              triedFallback.current = true;
              setImgSrc(fallbackImageFor(post.id));
            }
          }}
        />
      ) : (
        <div className="discover-grid-text-tile">
          <p className="discover-grid-text-caption">{post.caption}</p>
          <span className="discover-grid-text-category">{post.category}</span>
        </div>
      )}
    </div>
  );
};

export default DiscoverGridTile;
