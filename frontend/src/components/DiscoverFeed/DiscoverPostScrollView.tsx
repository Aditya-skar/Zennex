import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft } from 'lucide-react';
import HomePostCard from '../HomeFeed/HomePostCard';
import type { HomeFeedPost } from '../HomeFeed/homeFeed';
import './DiscoverPage.css';

function getDiscoverModalRoot(): HTMLElement {
  return document.querySelector('.mobile-app-screen') ?? document.body;
}

type DiscoverPostScrollViewProps = {
  posts: HomeFeedPost[];
  initialPostId: string;
  onClose: () => void;
  onViewOrganizerProfile: (organizerId: string) => void;
  onViewPostLocation: (post: HomeFeedPost) => void;
  onFollowChange: () => void;
};

export const DiscoverPostScrollView: React.FC<DiscoverPostScrollViewProps> = ({
  posts,
  initialPostId,
  onClose,
  onViewOrganizerProfile,
  onViewPostLocation,
  onFollowChange,
}) => {
  const feedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const target = feedRef.current?.querySelector<HTMLElement>(
        `[data-discover-post-id="${initialPostId}"]`,
      );
      target?.scrollIntoView({ block: 'start' });
    });
    return () => cancelAnimationFrame(frame);
  }, [initialPostId]);

  return createPortal(
    <div className="discover-scroll-view discover-overlay-theme" role="dialog" aria-modal="true" aria-label="Posts">
      <header className="discover-scroll-view-header">
        <button type="button" className="discover-scroll-view-back" onClick={onClose} aria-label="Back">
          <ChevronLeft size={22} />
        </button>
        <span className="discover-scroll-view-title">Posts</span>
      </header>

      <div className="discover-scroll-view-feed" ref={feedRef}>
        <div className="home-feed-view home-feed-view--posts discover-scroll-view-list">
          <div className="home-feed-list">
            {posts.map((post) => (
              <div key={post.id} data-discover-post-id={post.id} className="discover-scroll-view-item">
                <HomePostCard
                  post={post}
                  onViewHostProfile={onViewOrganizerProfile}
                  onViewAuthorProfile={onViewOrganizerProfile}
                  onViewLocation={onViewPostLocation}
                  onFollowChange={onFollowChange}
                  onPostDeleted={onFollowChange}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>,
    getDiscoverModalRoot(),
  );
};

export default DiscoverPostScrollView;
