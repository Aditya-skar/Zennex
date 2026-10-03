/**
 * Single entry point for "all posts the feed/Discover should consider".
 * Behind a live backend this fetches the real, shared posts table (Phase 3);
 * otherwise it falls back to the original localStorage + seed array so mock
 * mode stays byte-for-byte unchanged.
 */
import { isBackendEnabled } from '../../api/client';
import { listPosts } from '../../api/postsApi';
import { HOME_FEED_POSTS, mapPostDtoToHomeFeedPost, type HomeFeedPost } from './homeFeed';
import { loadUserPosts } from './publishContent';

export async function loadFeedPosts(): Promise<HomeFeedPost[]> {
  if (isBackendEnabled()) {
    const dtos = await listPosts();
    return dtos.map(mapPostDtoToHomeFeedPost);
  }
  return [...loadUserPosts(), ...HOME_FEED_POSTS];
}
