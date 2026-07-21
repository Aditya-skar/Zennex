import React, { useEffect, useState } from 'react';
import { Timer, Users, Flame, Check, UserPlus } from 'lucide-react';
import { type HomeFeedPost, getCountdownTarget, slotsLeft } from './homeFeed';

const URGENT_MS = 60 * 60 * 1000; // < 1 hour left → urgent styling

/**
 * Compact remaining-time label. Minutes only appear once the event is
 * genuinely minutes away; before that we stay coarse (days / hours).
 */
function formatRemaining(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const d = Math.floor(totalSec / 86400);
  const h = Math.floor((totalSec % 86400) / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h`;
  if (m > 0) return `${m}m`;
  return `${s}s`;
}

type Props = {
  post: HomeFeedPost;
  joined: boolean;
  onToggleJoin: () => void;
};

/**
 * Live ticking timer + join control shown on a post:
 *  - 'limited' events → "SLOTS OPEN · N left" / "FULL" + countdown to the joining deadline
 *  - 'open' events    → countdown to the event start time
 * Renders nothing once an open event has already started.
 */
export const PostCountdown: React.FC<Props> = ({ post, joined, onToggleJoin }) => {
  const target = getCountdownTarget(post);
  const targetTime = new Date(target.iso).getTime();

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  if (Number.isNaN(targetTime)) return null;

  const remaining = targetTime - now;
  const isLimited = post.registrationType === 'limited';

  // The current user counts as one taken slot while joined.
  const baseLeft = slotsLeft(post);
  const left = isLimited
    ? Math.max(0, baseLeft - (joined ? 1 : 0))
    : Infinity;
  const full = isLimited && left <= 0 && !joined;
  const closed = remaining <= 0 || full;

  // Open events that already started: nothing to count down to here.
  if (target.kind === 'start' && remaining <= 0) return null;

  const urgent = !closed && remaining <= URGENT_MS;

  const renderJoinButton = () => {
    if (target.kind === 'deadline' && remaining <= 0) {
      return <span className="home-post-join is-closed">Closed</span>;
    }
    if (full) {
      return (
        <span className="home-post-join is-full">
          <Users size={16} /> FULL
        </span>
      );
    }
    return (
      <button
        type="button"
        className={`home-post-join ${joined ? 'is-joined' : ''}`}
        onMouseDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          onToggleJoin();
        }}
      >
        {joined ? <Check size={16} /> : <UserPlus size={16} />}
        {joined ? 'Joined' : 'Join'}
      </button>
    );
  };

  return (
    <div className={`home-post-timer ${urgent ? 'is-urgent' : ''} ${closed ? 'is-closed' : ''}`}>
      {renderJoinButton()}

      {isLimited && (
        <span className={`home-post-slots ${full ? 'is-full' : ''}`}>
          <Users size={11} />
          {full ? 'FULL' : `${left} left`}
        </span>
      )}

      {target.kind === 'deadline' && remaining <= 0 ? (
        <span className="home-post-countdown">Registration closed</span>
      ) : remaining <= 0 ? null : (
        <span className="home-post-countdown">
          <span className="home-post-countdown-icon" aria-hidden="true">
            {urgent ? <Flame size={12} className="home-post-flame" /> : <Timer size={12} className="home-post-clock" />}
          </span>
          <span className="home-post-countdown-line">
            <span className="home-post-countdown-label">
              {target.kind === 'deadline' ? 'Closes' : 'Starts'}
            </span>
            <strong className="home-post-countdown-value">{formatRemaining(remaining)}</strong>
            {post.category && (
              <>
                <span className="home-post-countdown-sep" aria-hidden="true">
                  ·
                </span>
                <span className="home-post-category-tag">{post.category}</span>
              </>
            )}
          </span>
        </span>
      )}
    </div>
  );
};

export default PostCountdown;
