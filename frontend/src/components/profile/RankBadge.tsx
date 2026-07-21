import React from 'react';
import { getRankTierById, type RankTier } from './rankConfig';
import './RankBadge.css';

type RankBadgeProps = {
  tierId: string;
  size?: number;
  className?: string;
  title?: string;
  onClick?: () => void;
};

export function RankBadge({
  tierId,
  size = 52,
  className = '',
  title,
  onClick,
}: RankBadgeProps) {
  const tier = getRankTierById(tierId);
  if (!tier) return null;

  const label = title ?? `${tier.name} — ${tier.basis}`;

  const body = (
    <img
      src={tier.badgeImage}
      alt=""
      className="rank-badge-img"
      width={size}
      height={size}
      draggable={false}
    />
  );

  const style = {
    width: size,
    height: size,
    '--badge-scale': tier.badgeScale,
    '--badge-hero-scale': tier.badgeHeroScale,
    '--badge-focus': tier.badgeFocus,
  } as React.CSSProperties;

  const frameClass = `rank-badge--frame-${tier.badgeFrame}`;

  if (onClick) {
    return (
      <button
        type="button"
        className={`rank-badge rank-badge--btn rank-badge--${tierId} ${frameClass} ${className}`.trim()}
        style={style}
        onClick={onClick}
        aria-label={label}
        title={label}
      >
        {body}
      </button>
    );
  }

  return (
    <span
      className={`rank-badge rank-badge--${tierId} ${frameClass} ${className}`.trim()}
      style={style}
      title={label}
      aria-hidden={title ? undefined : true}
    >
      {body}
    </span>
  );
}

export function RankBadgeForTier({
  tier,
  ...props
}: Omit<RankBadgeProps, 'tierId'> & { tier: RankTier }) {
  return <RankBadge tierId={tier.id} {...props} />;
}
