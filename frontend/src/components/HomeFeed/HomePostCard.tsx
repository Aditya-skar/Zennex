import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Heart,
  MessageCircle,
  MapPin,
  Lock,
  Globe,
  Repeat2,
  UserRound,
  X,
  CalendarClock,
  Sparkles,
  Star,
} from 'lucide-react';
import {
  type HomeFeedPost,
  getPostAuthor,
  getPostHost,
  isEventPast,
  getHostRating,
  FALLBACK_POST_IMAGE,
  ME_AUTHOR_ID,
} from './homeFeed';
import {
  type FeedReason,
  isFollowing as checkFollowing,
  toggleFollow,
  recordDwell,
  recordInteraction,
} from './feedAlgorithm';
import PostCountdown from './PostCountdown';
import { isJoined as checkJoined, toggleJoin } from './publishContent';
import ConfirmDialog from '../common/ConfirmDialog';
import { ensureEventChat, removeEventChat } from '../common/eventChats';
import { UserPlus } from 'lucide-react';
import './HomeFeed.css';

const LONG_PRESS_MS = 450;

type HomePostCardProps = {
  post: HomeFeedPost;
  reason?: FeedReason;
  onViewHostProfile: (hostId: string) => void;
  onViewLocation: (post: HomeFeedPost) => void;
  onViewAuthorProfile: (authorId: string) => void;
  onFollowChange?: () => void;
};

function reasonLabel(reason?: FeedReason): { icon: React.ReactNode; text: string } | null {
  if (!reason) return null;
  switch (reason.kind) {
    case 'interest':
      return { icon: <Sparkles size={11} />, text: `Because you like ${reason.label}` };
    case 'affinity':
      return { icon: <Sparkles size={11} />, text: `More ${reason.label} for you` };
    case 'popular':
      return { icon: <Sparkles size={11} />, text: 'Popular near you' };
    default:
      return null;
  }
}

export const HomePostCard: React.FC<HomePostCardProps> = ({
  post,
  reason,
  onViewHostProfile,
  onViewLocation,
  onViewAuthorProfile,
  onFollowChange,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [liked, setLiked] = useState(false);
  const [reposted, setReposted] = useState(false);
  const [following, setFollowing] = useState(() => checkFollowing(post.authorId));
  const [joined, setJoined] = useState(() => checkJoined(post.eventId));
  const [confirmJoinOpen, setConfirmJoinOpen] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);
  const triedFallback = useRef(false);
  const pressTimer = useRef<number | null>(null);
  const cardRef = useRef<HTMLElement>(null);

  // Dwell tracking – accumulate visible time and report it for affinity learning.
  const dwellStart = useRef<number | null>(null);
  const dwellTotal = useRef(0);

  const author = getPostAuthor(post);
  const host = getPostHost(post);
  const past = isEventPast(post);
  const badge = reasonLabel(reason);
  const isOwnPost = post.authorId === ME_AUTHOR_ID;
  const { rating, count } = getHostRating(post);

  const clearPressTimer = useCallback(() => {
    if (pressTimer.current !== null) {
      window.clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  }, []);

  const startPress = useCallback(() => {
    clearPressTimer();
    pressTimer.current = window.setTimeout(() => {
      setIsMenuOpen(true);
      if ('vibrate' in navigator) navigator.vibrate?.(15);
    }, LONG_PRESS_MS);
  }, [clearPressTimer]);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsMenuOpen(true);
  };

  useEffect(() => clearPressTimer, [clearPressTimer]);

  useEffect(() => {
    if (!isMenuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsMenuOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isMenuOpen]);

  // Track how long the post stays on screen (>=55% visible).
  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;

    const flush = () => {
      if (dwellStart.current !== null) {
        dwellTotal.current += performance.now() - dwellStart.current;
        dwellStart.current = null;
      }
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.55) {
          if (dwellStart.current === null) dwellStart.current = performance.now();
        } else {
          flush();
        }
      },
      { threshold: [0, 0.55, 1] },
    );

    observer.observe(el);

    return () => {
      flush();
      observer.disconnect();
      if (dwellTotal.current > 0) {
        recordDwell(post, dwellTotal.current);
        dwellTotal.current = 0;
      }
    };
  }, [post]);

  const closeMenu = () => setIsMenuOpen(false);

  const handleLike = () => {
    setLiked((v) => {
      const next = !v;
      if (next) recordInteraction(post, 'like');
      return next;
    });
  };

  const handleLocation = () => {
    recordInteraction(post, 'location');
    onViewLocation(post);
  };

  const handleRepost = () => {
    setReposted((v) => {
      const next = !v;
      if (next) recordInteraction(post, 'repost');
      return next;
    });
  };

  const handleFollow = () => {
    const now = toggleFollow(post.authorId);
    setFollowing(now);
    onFollowChange?.();
  };

  const handleJoin = () => {
    // Leaving needs no confirmation; joining asks the user to confirm first.
    if (joined) {
      const now = toggleJoin(post.eventId);
      setJoined(now);
      if (!now) removeEventChat(post.eventId);
      return;
    }
    setConfirmJoinOpen(true);
  };

  const confirmJoin = () => {
    const now = toggleJoin(post.eventId);
    setJoined(now);
    if (now) {
      recordInteraction(post, 'join');
      ensureEventChat({
        eventId: post.eventId,
        title: post.eventTitle,
        category: post.category,
        avatar: author.avatar,
        hostName: author.name,
      });
      if ('vibrate' in navigator) navigator.vibrate?.(10);
    }
    setConfirmJoinOpen(false);
  };

  const handleAuthor = () => {
    recordInteraction(post, 'openProfile');
    onViewAuthorProfile(post.authorId);
  };

  return (
    <article
      ref={cardRef}
      className={`home-post-card ${post.type === 'text' ? 'home-post-card--text' : ''} ${
        past ? 'home-post-card--past' : ''
      }`}
      onTouchStart={startPress}
      onTouchEnd={clearPressTimer}
      onTouchMove={clearPressTimer}
      onMouseDown={startPress}
      onMouseUp={clearPressTimer}
      onMouseLeave={clearPressTimer}
      onContextMenu={handleContextMenu}
    >
      {badge && (
        <div className="home-post-reason">
          {badge.icon}
          {badge.text}
        </div>
      )}

      <header className="home-post-head">
        <button type="button" className="home-post-author" onClick={handleAuthor}>
          <img className="home-post-avatar" src={author.avatar} alt={author.name} />
          <span className="home-post-author-meta">
            <span className="home-post-author-name">{author.name}</span>
            <span className="home-post-subline">
              {post.isReshared && host ? (
                <>
                  <Repeat2 size={12} className="home-post-reshare-icon" />
                  reshared {host.name}
                </>
              ) : (
                author.role
              )}
              <span className="home-post-dot">•</span>
              <span className="home-post-inline-rating" title={`${rating.toFixed(1)} from ${count} ratings`}>
                <Star size={11} className="home-post-rating-star" fill="currentColor" />
                <strong>{rating.toFixed(1)}</strong>
                <span className="home-post-rating-count">({count})</span>
              </span>
              <span className="home-post-dot">•</span>
              {post.postedAgo}
            </span>
          </span>
        </button>

        <div className="home-post-head-right">
          {isOwnPost ? (
            <span className="home-post-you-tag">You</span>
          ) : (
            <button
              type="button"
              className={`home-post-follow ${following ? 'is-following' : ''}`}
              onClick={handleFollow}
            >
              {following ? 'Following' : 'Follow'}
            </button>
          )}
          <span
            className={`home-post-visibility ${post.visibility}`}
            title={post.visibility === 'private' ? 'Private event' : 'Public event'}
          >
            {post.visibility === 'private' ? <Lock size={12} /> : <Globe size={12} />}
          </span>
        </div>
      </header>

      <p className="home-post-caption">{post.caption}</p>

      {post.type === 'poster' && post.image && (
        <div className={`home-post-media ${imgLoaded ? 'is-loaded' : ''}`}>
          {imgFailed ? (
            <div className="home-post-media-fallback">
              <span className="home-post-media-fallback-title">{post.eventTitle}</span>
              <span className="home-post-media-fallback-sub">{post.category}</span>
            </div>
          ) : (
            <img
              src={post.image}
              alt={post.eventTitle}
              loading="lazy"
              onLoad={() => setImgLoaded(true)}
              onError={(e) => {
                if (!triedFallback.current) {
                  triedFallback.current = true;
                  e.currentTarget.src = FALLBACK_POST_IMAGE;
                } else {
                  setImgFailed(true);
                }
              }}
            />
          )}
          {past && <span className="home-post-ended-badge">Event ended</span>}
        </div>
      )}

      {post.type === 'video' && post.videoUrl && (
        <div className="home-post-media is-loaded">
          <video src={post.videoUrl} controls playsInline preload="metadata" />
          {past && <span className="home-post-ended-badge">Event ended</span>}
        </div>
      )}

      {!past && <PostCountdown post={post} joined={joined} onToggleJoin={handleJoin} />}

      <button type="button" className="home-post-event-chip" onClick={handleLocation}>
        <span className="home-post-event-chip-icon">
          {past ? <CalendarClock size={15} /> : <MapPin size={15} />}
        </span>
        <span className="home-post-event-chip-copy">
          <span className="home-post-event-title">{post.eventTitle}</span>
          <span className="home-post-event-sub">
            {post.eventDateLabel} · {post.eventLocation}
          </span>
        </span>
        {post.type === 'text' && past && <span className="home-post-ended-tag">Ended</span>}
      </button>

      <footer className="home-post-actions">
        <button
          type="button"
          className={`home-post-action ${liked ? 'liked' : ''}`}
          onClick={handleLike}
        >
          <Heart size={17} fill={liked ? 'currentColor' : 'none'} />
          {post.likes + (liked ? 1 : 0)}
        </button>
        <button type="button" className="home-post-action">
          <MessageCircle size={17} />
          {post.comments}
        </button>
        <button
          type="button"
          className={`home-post-action ${reposted ? 'reposted' : ''}`}
          onClick={handleRepost}
          title="Re-recommend to your followers"
        >
          <Repeat2 size={17} />
          {reposted ? 'Reposted' : 'Repost'}
        </button>
        <button
          type="button"
          className="home-post-action home-post-action--location"
          onClick={handleLocation}
        >
          <MapPin size={17} />
          Location
        </button>
      </footer>

      {isMenuOpen && (
        <div className="home-post-menu-overlay" onClick={closeMenu}>
          <div className="home-post-menu" role="menu" onClick={(e) => e.stopPropagation()}>
            <div className="home-post-menu-header">
              <span>Post options</span>
              <button type="button" className="home-post-menu-close" onClick={closeMenu}>
                <X size={16} />
              </button>
            </div>

            {post.isReshared && host && (
              <button
                type="button"
                className="home-post-menu-item"
                onClick={() => {
                  closeMenu();
                  recordInteraction(post, 'openProfile');
                  onViewHostProfile(host.id);
                }}
              >
                <UserRound size={18} />
                <span className="home-post-menu-copy">
                  <strong>View host profile</strong>
                  <small>{host.name} · original event host</small>
                </span>
              </button>
            )}

            <button
              type="button"
              className="home-post-menu-item"
              onClick={() => {
                closeMenu();
                handleLocation();
              }}
            >
              <MapPin size={18} />
              <span className="home-post-menu-copy">
                <strong>View location</strong>
                <small>Open {post.eventLocation} on Explore</small>
              </span>
            </button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmJoinOpen}
        icon={<UserPlus size={24} />}
        title="Join this event?"
        message={
          <>
            Confirm your spot for <strong>{post.eventTitle}</strong> on {post.eventDateLabel}.
          </>
        }
        confirmLabel="Confirm"
        cancelLabel="Cancel"
        onConfirm={confirmJoin}
        onCancel={() => setConfirmJoinOpen(false)}
      />
    </article>
  );
};

export default HomePostCard;
