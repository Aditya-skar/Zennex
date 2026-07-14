import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navbar, TabType } from './Navbar';
import { useTheme } from '../themeContext';
import ProfileView from './profile/ProfileView';
import { ME_AUTHOR_ID } from './profile/profileData';
import PlayerCard from './PlayerCard/PlayerCard';
import {
  Compass,
  Home,
  Search,
  MessageSquare,
  User as UserIcon,
  Settings,
  Lock,
  HelpCircle,
  Info,
  LogOut,
  Bell,
  Menu,
  ChevronLeft,
  ChevronRight,
  X,
  Plus,
  Sparkles,
  Sun,
  Moon,
} from 'lucide-react';
import { MembershipModal, getSavedPlan, PLAN_CHANGE_EVENT, PlanType } from './Membership/Membership';
import ExplorePage from './ExplorePage/ExplorePage';
import HomePostCard from './HomeFeed/HomePostCard';
import { HOME_FEED_POSTS, type HomeFeedPost } from './HomeFeed/homeFeed';
import { buildFeed, FEED_CHANGED_EVENT } from './HomeFeed/feedAlgorithm';
import { CreateEventModal } from './ExplorePage/CreateEventModal';
import DiscoverPage from './DiscoverFeed/DiscoverPage';
import ChatPage from './Chat/ChatPage';
import {
  loadUserPosts,
  publishEvent,
  USER_POSTS_CHANGED_EVENT,
  type CreateEventPayload,
} from './HomeFeed/publishContent';
import './Layout.css';

export const Layout: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [viewingProfileId, setViewingProfileId] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [exploreFocus, setExploreFocus] = useState<{ eventId: string; coordinates: [number, number] } | null>(null);
  const navigate = useNavigate();

  // Membership states
  const [membershipPlan, setMembershipPlan] = useState<PlanType>(getSavedPlan);
  const [isMembershipOpen, setIsMembershipOpen] = useState(false);
  const [fullName, setFullName] = useState(() => localStorage.getItem('zenex-fullname') || 'Katakam Ritvik');
  const [avatar, setAvatar] = useState(() => localStorage.getItem('zenex-avatar') || 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=300&h=300&q=80');

  useEffect(() => {
    // If not set yet, store default Katakam Ritvik so it matches screenshot
    if (!localStorage.getItem('zenex-fullname')) {
      localStorage.setItem('zenex-fullname', 'Katakam Ritvik');
    }
    if (!localStorage.getItem('zenex-avatar')) {
      localStorage.setItem('zenex-avatar', 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=300&h=300&q=80');
    }
  }, []);

  useEffect(() => {
    const handlePlanChange = () => {
      setMembershipPlan(getSavedPlan());
    };
    const handleProfileChange = () => {
      setFullName(localStorage.getItem('zenex-fullname') || 'Katakam Ritvik');
      setAvatar(localStorage.getItem('zenex-avatar') || 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=300&h=300&q=80');
    };
    
    window.addEventListener(PLAN_CHANGE_EVENT, handlePlanChange);
    window.addEventListener('storage', handleProfileChange);
    
    const interval = setInterval(handleProfileChange, 500);

    return () => {
      window.removeEventListener(PLAN_CHANGE_EVENT, handlePlanChange);
      window.removeEventListener('storage', handleProfileChange);
      clearInterval(interval);
    };
  }, []);

  const handleViewOrganizerProfile = (organizerId: string) => {
    setViewingProfileId(organizerId === ME_AUTHOR_ID ? null : organizerId);
    setActiveTab('profile');
  };

  const handleTabChange = (tab: TabType) => {
    if (tab === 'profile') setViewingProfileId(null);
    setActiveTab(tab);
  };

  const handleViewPostLocation = (post: HomeFeedPost) => {
    setExploreFocus({ eventId: post.eventId, coordinates: post.coordinates });
    setActiveTab('explore');
  };

  // Feed recomputes when follows change, a post is created, or Home re-opens
  // (so newly-learned dwell/interest affinity is applied between visits).
  const [feedVersion, setFeedVersion] = useState(0);
  const [isHomeCreateOpen, setIsHomeCreateOpen] = useState(false);
  const [chatCreateGroupOpen, setChatCreateGroupOpen] = useState(false);
  const bumpFeed = () => setFeedVersion((v) => v + 1);

  useEffect(() => {
    const onFeedChanged = () => bumpFeed();
    window.addEventListener(FEED_CHANGED_EVENT, onFeedChanged);
    window.addEventListener(USER_POSTS_CHANGED_EVENT, onFeedChanged);
    return () => {
      window.removeEventListener(FEED_CHANGED_EVENT, onFeedChanged);
      window.removeEventListener(USER_POSTS_CHANGED_EVENT, onFeedChanged);
    };
  }, []);

  useEffect(() => {
    if (activeTab === 'home') bumpFeed();
    if (activeTab !== 'chat') setChatCreateGroupOpen(false);
  }, [activeTab]);

  const feed = useMemo(() => buildFeed([...loadUserPosts(), ...HOME_FEED_POSTS]), [feedVersion]);

  const handleHomeCreateEvent = (eventData: Record<string, unknown>) => {
    publishEvent(eventData as unknown as CreateEventPayload);
    bumpFeed();
  };

  // Handle resizing to collapse sidebar on tablet view initially
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768 && window.innerWidth <= 1024) {
        setIsSidebarOpen(false); // Collapsed on tablet screen space
      } else {
        setIsSidebarOpen(true);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleLogout = () => {
    setIsSettingsOpen(false);
    localStorage.removeItem('zenex-auth');
    navigate('/login');
  };

  const handleSidebarToggle = () => {
    setIsSidebarOpen((prev) => !prev);
  };

  // Mock RSVP Handler
  const handleRSVP = (eventName: string) => {
    alert(`Successfully RSVP'd to: ${eventName}! Added to your events list.`);
  };

  return (
    <div
      className={`zenex-app-shell ${activeTab === 'explore' ? 'explore-active' : ''} ${
        activeTab === 'home' || activeTab === 'discover' || activeTab === 'chat' || activeTab === 'profile'
          ? 'home-active'
          : ''
      }`}
    >
      {/* Fixed Header — hidden on Profile and Explore */}
      {activeTab !== 'explore' && activeTab !== 'profile' && (
        <header className="zenex-header">
          <div className="zenex-brand-group">
            <div className="zenex-logo-pill" onClick={() => handleTabChange('home')} style={{ cursor: 'pointer' }}>
              <img src="/logo.png" alt="SIMSOR" className="header-logo-img" />
            </div>
            <div>
              <p className="zenex-app-title" onClick={() => handleTabChange('home')} style={{ cursor: 'pointer' }}>SIMSOR</p>
            </div>
          </div>

          <div className="zenex-header-actions">
            <button
              type="button"
              className="sidebar-toggle-btn"
              onClick={handleSidebarToggle}
              aria-label="Toggle sidebar"
            >
              {isSidebarOpen ? <ChevronLeft size={18} /> : <Menu size={18} />}
            </button>

            {activeTab === 'chat' ? (
              <button
                type="button"
                className="header-action-circle-btn chat-create-group-btn"
                onClick={() => setChatCreateGroupOpen(true)}
                aria-label="Create group chat"
              >
                <Plus size={22} strokeWidth={2.5} />
              </button>
            ) : (
              <>
                <button
                  type="button"
                  className="header-action-circle-btn notifications-bell-btn"
                  onClick={() => setIsNotificationsOpen(true)}
                  aria-label="Notifications"
                >
                  <Bell size={20} />
                  <span className="red-badge-dot">3</span>
                </button>

                <div className="settings-menu-container">
                  <button
                    className={`settings-trigger ${isSettingsOpen ? 'active' : ''}`}
                    onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                    aria-label="Settings"
                  >
                    <Settings size={20} />
                  </button>
                  {isSettingsOpen && (
                    <>
                      <div className="settings-backdrop" onClick={() => setIsSettingsOpen(false)} />
                      <div className="settings-dropdown animate-scaleIn">
                        <div
                          className={`settings-premium-bar plan-${membershipPlan.toLowerCase()}`}
                          onClick={() => { setIsSettingsOpen(false); setIsMembershipOpen(true); }}
                        >
                          <Sparkles size={14} className="premium-bar-icon" />
                          <div className="premium-bar-content">
                            <span className="premium-bar-title">
                              {membershipPlan === 'FREE' ? 'Zenex Gold / Silver' : `Zenex ${membershipPlan}`}
                            </span>
                            <span className="premium-bar-subtitle">
                              {membershipPlan === 'FREE' ? 'Upgrade to Premium' : 'Manage Subscription'}
                            </span>
                          </div>
                          <ChevronRight size={12} className="premium-bar-arrow" />
                        </div>

                        <button className="settings-option" onClick={() => { setIsSettingsOpen(false); handleTabChange('profile'); }}>
                          <UserIcon size={16} />
                          <span>Edit Profile</span>
                        </button>
                        <button
                          className="settings-option settings-option--toggle"
                          onClick={(e) => { e.stopPropagation(); toggleTheme(); }}
                        >
                          {theme === 'dark' ? <Moon size={16} /> : <Sun size={16} />}
                          <span>{theme === 'dark' ? 'Dark mode' : 'Light mode'}</span>
                          <span className={`settings-toggle-pill ${theme === 'dark' ? 'is-on' : ''}`} aria-hidden="true">
                            <span className="settings-toggle-knob" />
                          </span>
                        </button>
                        <button className="settings-option" onClick={() => { setIsSettingsOpen(false); alert('Settings clicked'); }}>
                          <Settings size={16} />
                          <span>Settings</span>
                        </button>
                        <button className="settings-option" onClick={() => { setIsSettingsOpen(false); alert('Privacy clicked'); }}>
                          <Lock size={16} />
                          <span>Privacy</span>
                        </button>
                        <button className="settings-option" onClick={() => { setIsSettingsOpen(false); alert('Help & Support clicked'); }}>
                          <HelpCircle size={16} />
                          <span>Help & Support</span>
                        </button>
                        <button className="settings-option" onClick={() => { setIsSettingsOpen(false); alert('About Zenex clicked'); }}>
                          <Info size={16} />
                          <span>About Zenex</span>
                        </button>
                        <div className="settings-dropdown-divider" />
                        <button className="settings-option logout-option" onClick={handleLogout}>
                          <LogOut size={16} />
                          <span>Logout</span>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </header>
      )}

      {/* Main Responsive Grid Layout */}
      <div className={`zenex-layout-grid ${activeTab === 'explore' ? 'explore-layout-grid' : ''} ${isSidebarOpen ? 'sidebar-expanded' : 'sidebar-collapsed'}`}>
        
        {/* Left Sidebar */}
        <aside className={`zenex-sidebar ${activeTab === 'explore' ? 'explore-sidebar-floating' : ''} ${isSidebarOpen ? 'expanded' : 'collapsed'}`}>
          <div className="zenex-sidebar-inner">
            {/* Sidebar Branding (Only on Desktop when expanded) */}
            <div className="zenex-sidebar-brand">
              <img src="/logo.png" alt="ZENEX" className="zenex-sidebar-logo-img" />
              <span className="zenex-sidebar-logo-text">ZENEX</span>
            </div>

            <div className="zenex-sidebar-title">
              <span>MENU</span>
            </div>

            <nav className="zenex-nav-links">
              <button
                className={`sidebar-nav-item ${activeTab === 'explore' ? 'active' : ''}`}
                onClick={() => setActiveTab('explore')}
                aria-label="Explore"
              >
                <Compass size={18} />
                <span>Explore</span>
              </button>

              <button
                className={`sidebar-nav-item ${activeTab === 'home' ? 'active' : ''}`}
                onClick={() => setActiveTab('home')}
                aria-label="Home"
              >
                <Home size={18} />
                <span>Home</span>
              </button>

              <button
                className={`sidebar-nav-item ${activeTab === 'discover' ? 'active' : ''}`}
                onClick={() => setActiveTab('discover')}
                aria-label="Discover"
              >
                <Search size={18} />
                <span>Discover</span>
              </button>

              <button
                className={`sidebar-nav-item ${activeTab === 'chat' ? 'active' : ''}`}
                onClick={() => setActiveTab('chat')}
                aria-label="Chat"
              >
                <MessageSquare size={18} />
                <span>Chat</span>
              </button>

              <button
                className={`sidebar-nav-item ${activeTab === 'profile' ? 'active' : ''}`}
                onClick={() => setActiveTab('profile')}
                aria-label="Profile"
              >
                <UserIcon size={18} />
                <span>Profile</span>
              </button>
            </nav>

            <div className="zenex-sidebar-divider" />

            <div className="zenex-sidebar-utilities">
              <button
                className="sidebar-nav-item"
                onClick={() => setIsNotificationsOpen(true)}
                aria-label="Notifications"
              >
                <Bell size={18} />
                <span>Notifications</span>
              </button>

              <button
                className="sidebar-nav-item"
                onClick={() => setActiveTab('profile')}
                aria-label="Settings"
              >
                <Settings size={18} />
                <span>Settings</span>
              </button>

              <button className="sidebar-nav-item logout-button" onClick={handleLogout}>
                <LogOut size={18} />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </aside>

        {/* Main Panel Viewport */}
        <main className="zenex-main-panel">
          
          {/* EXPLORE PAGE */}
          {activeTab === 'explore' && (
            <ExplorePage
              onViewOrganizerProfile={handleViewOrganizerProfile}
              focusTarget={exploreFocus}
              onFocusHandled={() => setExploreFocus(null)}
            />
          )}

          {/* HOME PAGE – Instagram-style ranked event feed */}
          {activeTab === 'home' && (
            <div className="home-feed-view home-feed-view--posts animate-fadeIn">
              <button
                type="button"
                className="home-create-fab"
                onClick={() => setIsHomeCreateOpen(true)}
                aria-label="Create post or event"
              >
                <Plus size={22} strokeWidth={2.5} />
              </button>
              <CreateEventModal
                isOpen={isHomeCreateOpen}
                onClose={() => setIsHomeCreateOpen(false)}
                onSubmit={handleHomeCreateEvent}
              />
              {feed.hasFollowing && (
                <section className="home-feed-block">
                  <div className="home-feed-section-label">Boosting</div>
                  <div className="home-feed-list">
                    {feed.following.map((post) => (
                      <HomePostCard
                        key={post.id}
                        post={post}
                        onViewHostProfile={handleViewOrganizerProfile}
                        onViewAuthorProfile={handleViewOrganizerProfile}
                        onViewLocation={handleViewPostLocation}
                        onFollowChange={bumpFeed}
                        onPostDeleted={bumpFeed}
                      />
                    ))}
                  </div>
                </section>
              )}

              {feed.suggested.length > 0 && (
                <section className="home-feed-block">
                  <div className="home-feed-section-label">
                    {feed.hasFollowing ? 'Suggested for you' : 'For you'}
                  </div>
                  <div className="home-feed-list">
                    {feed.suggested.map(({ post, reason }) => (
                      <HomePostCard
                        key={post.id}
                        post={post}
                        reason={reason}
                        onViewHostProfile={handleViewOrganizerProfile}
                        onViewAuthorProfile={handleViewOrganizerProfile}
                        onViewLocation={handleViewPostLocation}
                        onFollowChange={bumpFeed}
                        onPostDeleted={bumpFeed}
                      />
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}

          {/* DISCOVER FEED */}
          {activeTab === 'discover' && (
            <DiscoverPage
              activeCategory={activeCategory}
              onCategoryChange={setActiveCategory}
              onViewOrganizerProfile={handleViewOrganizerProfile}
              onViewPostLocation={handleViewPostLocation}
              feedVersion={feedVersion}
              onFollowChange={bumpFeed}
            />
          )}

          {/* CHAT PAGE */}
          {activeTab === 'chat' && (
            <div className="chat-page-view animate-fadeIn">
              <ChatPage
                feedPosts={feed}
                createGroupOpen={chatCreateGroupOpen}
                onCreateGroupOpenChange={setChatCreateGroupOpen}
              />
            </div>
          )}

          {/* PROFILE PAGE */}
          {activeTab === 'profile' && (
            <div className="profile-page-view animate-fadeIn">
              <ProfileView
                userId={viewingProfileId}
                onViewProfile={handleViewOrganizerProfile}
                onBack={() => setViewingProfileId(null)}
              />
            </div>
          )}

        </main>

        {/* Right Panel (Visible on Desktop >1024px) */}
        <aside className="zenex-right-panel">
          
          {/* Membership Desktop Card */}
          <div className="glass-card right-panel-card membership-desktop-card">
            <div className="desktop-card-profile">
              <img src={avatar} alt={fullName} className="desktop-card-avatar" />
              <div className="desktop-card-info">
                <span className="desktop-card-name">{fullName}</span>
                <div className="desktop-card-plan-row">
                  <span className="desktop-card-plan-label">Current Plan:</span>
                  <span className={`plan-badge-pill badge-${membershipPlan.toLowerCase()}`}>{membershipPlan}</span>
                </div>
              </div>
            </div>

            {membershipPlan === 'FREE' && (
              <div className="desktop-quick-upgrades">
                <div className="quick-upgrade-item">
                  <span>Upgrade to <strong>PLUS</strong></span>
                  <span>₹699/mo</span>
                </div>
                <div className="quick-upgrade-item">
                  <span>Upgrade to <strong>PRO</strong></span>
                  <span>₹999/mo</span>
                </div>
              </div>
            )}

            {membershipPlan === 'PLUS' && (
              <div className="desktop-quick-upgrades">
                <div className="quick-upgrade-item">
                  <span>Upgrade to <strong>PRO</strong></span>
                  <span>₹999/mo</span>
                </div>
              </div>
            )}

            <button 
              type="button" 
              className="desktop-upgrade-now-btn"
              onClick={() => setIsMembershipOpen(true)}
            >
              <Sparkles size={14} />
              <span>{membershipPlan === 'PRO' ? 'Manage Plan' : 'Upgrade Now'}</span>
            </button>
          </div>

          {/* Notifications Card */}
          <div className="glass-card right-panel-card">
            <div className="panel-heading">
              <h3>Notifications</h3>
              <span className="unread-badge">3 unread</span>
            </div>
            <div className="panel-notifications-list">
              <div className="panel-notif-item unread">
                <div className="panel-notif-dot" />
                <div className="panel-notif-info">
                  <span className="panel-notif-text"><strong>Rahul Sharma</strong> wants to Dab Up with you.</span>
                  <span className="panel-notif-time">2h ago</span>
                </div>
              </div>
              <div className="panel-notif-item">
                <div className="panel-notif-info">
                  <span className="panel-notif-text">Cricket Match near <strong>Madhapur</strong> starts tomorrow.</span>
                  <span className="panel-notif-time">1d ago</span>
                </div>
              </div>
              <div className="panel-notif-item">
                <div className="panel-notif-info">
                  <span className="panel-notif-text">Your badge <strong>Event Organizer</strong> has been unlocked!</span>
                  <span className="panel-notif-time">3d ago</span>
                </div>
              </div>
            </div>
          </div>

          {/* Suggested Dab Ups */}
          <div className="glass-card right-panel-card">
            <div className="panel-heading">
              <h3>Suggested Dab Ups</h3>
              <span>3 new</span>
            </div>
            <ul className="panel-list">
              <li>
                <div className="panel-item-left">
                  <strong>Rahul Sharma</strong>
                  <span>Cricket Captain</span>
                </div>
                <button className="panel-item-action-btn">Dab Up</button>
              </li>
              <li>
                <div className="panel-item-left">
                  <strong>Neha Reddy</strong>
                  <span>Event Host</span>
                </div>
                <button className="panel-item-action-btn">Dab Up</button>
              </li>
              <li>
                <div className="panel-item-left">
                  <strong>Aisha Khan</strong>
                  <span>Fitness Trainer</span>
                </div>
                <button className="panel-item-action-btn">Dab Up</button>
              </li>
            </ul>
          </div>

          {/* Trending Events */}
          <div className="glass-card right-panel-card">
            <div className="panel-heading">
              <h3>Trending Events</h3>
              <span>Today</span>
            </div>
            <ul className="panel-list">
              <li>
                <div className="panel-item-left">
                  <strong>Sunday Football</strong>
                  <span>5 spots left</span>
                </div>
                <button className="panel-item-action-btn action-rsvp" onClick={() => handleRSVP("Sunday Football")}>RSVP</button>
              </li>
              <li>
                <div className="panel-item-left">
                  <strong>Live DJ Night</strong>
                  <span>Madhapur</span>
                </div>
                <button className="panel-item-action-btn action-rsvp" onClick={() => handleRSVP("Live DJ Night")}>RSVP</button>
              </li>
              <li>
                <div className="panel-item-left">
                  <strong>Open Mic</strong>
                  <span>Free entry</span>
                </div>
                <button className="panel-item-action-btn action-rsvp" onClick={() => handleRSVP("Open Mic")}>RSVP</button>
              </li>
            </ul>
          </div>

          {/* Rewards Summary */}
          <div className="glass-card right-panel-card rewards-card">
            <div className="panel-heading">
              <h3>Rewards Summary</h3>
              <span className="rewards-badge">XP Level 8</span>
            </div>
            <p><strong>12 Badges Earned</strong></p>
            <p className="rewards-sub">2 challenges unlocked in Hyderabad.</p>
            <div className="progress-bar" style={{ marginTop: 12 }}>
              <div className="progress-bar-fill" style={{ width: '65%' }}></div>
            </div>
            <div className="progress-bar-labels">
              <span>850 XP</span>
              <span>1200 XP to Level 9</span>
            </div>
          </div>

          {/* Online Users */}
          <div className="glass-card right-panel-card online-users-card">
            <div className="panel-heading">
              <h3>Online Users</h3>
              <span className="online-users-count">3 Online</span>
            </div>
            <div className="panel-online-users-list">
              <div className="online-user-item">
                <div className="online-avatar-wrap">
                  <img src="https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=150&h=150&q=80" alt="Rahul Sharma" className="online-avatar" />
                  <span className="online-dot-indicator" />
                </div>
                <span className="online-name">Rahul Sharma</span>
              </div>
              <div className="online-user-item">
                <div className="online-avatar-wrap">
                  <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&h=150&q=80" alt="Neha Reddy" className="online-avatar" />
                  <span className="online-dot-indicator" />
                </div>
                <span className="online-name">Neha Reddy</span>
              </div>
              <div className="online-user-item">
                <div className="online-avatar-wrap">
                  <img src="https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=150&h=150&q=80" alt="Vikram Malhotra" className="online-avatar" />
                  <span className="online-dot-indicator" />
                </div>
                <span className="online-name">Vikram Malhotra</span>
              </div>
            </div>
          </div>

        </aside>
      </div>

      {/* Slide-up Notifications Drawer (Used on mobile/tablet) */}
      {isNotificationsOpen && (
        <div className="ios-drawer-overlay" onClick={() => setIsNotificationsOpen(false)}>
          <div className="ios-drawer-sheet animate-slideUp" onClick={(e) => e.stopPropagation()}>
            <button className="ios-drawer-close-btn" onClick={() => setIsNotificationsOpen(false)} aria-label="Close">
              <X size={20} />
            </button>
            <div className="ios-drawer-body">
              <h3 className="ios-drawer-title">Notifications</h3>
              <p className="ios-drawer-subtitle">Stay connected with your matches</p>

              <div className="panel-notifications-list">
                <div className="panel-notif-item unread">
                  <div className="panel-notif-dot" />
                  <div className="panel-notif-info">
                    <span className="panel-notif-text"><strong>Rahul Sharma</strong> wants to Dab Up with you.</span>
                    <span className="panel-notif-time">2h ago</span>
                  </div>
                </div>
                <div className="panel-notif-item">
                  <div className="panel-notif-info">
                    <span className="panel-notif-text">Cricket Match near <strong>Madhapur</strong> starts tomorrow.</span>
                    <span className="panel-notif-time">1d ago</span>
                  </div>
                </div>
                <div className="panel-notif-item">
                  <div className="panel-notif-info">
                    <span className="panel-notif-text">Your badge <strong>Event Organizer</strong> has been unlocked!</span>
                    <span className="panel-notif-time">3d ago</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation Bar (Visible on Mobile <768px) */}
      <Navbar activeTab={activeTab} setActiveTab={handleTabChange} />

      {/* Premium Membership Modal */}
      <MembershipModal isOpen={isMembershipOpen} onClose={() => setIsMembershipOpen(false)} />
    </div>
  );
};

export default Layout;
