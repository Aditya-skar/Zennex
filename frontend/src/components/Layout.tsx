import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navbar, TabType } from './Navbar';
import { useTheme } from '../themeContext';
import ProfileView from './profile/ProfileView';
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
  X,
  Plus,
  Send,
  Sparkles,
  ChevronRight,
  Sun,
  Moon,
} from 'lucide-react';
import { MembershipModal, getSavedPlan, PLAN_CHANGE_EVENT, PlanType } from './Membership/Membership';
import ExplorePage from './ExplorePage/ExplorePage';
import { EVENT_ORGANIZERS } from './ExplorePage/exploreEvents';
import HomePostCard from './HomeFeed/HomePostCard';
import { HOME_FEED_POSTS, type HomeFeedPost } from './HomeFeed/homeFeed';
import { buildFeed, FEED_CHANGED_EVENT } from './HomeFeed/feedAlgorithm';
import { CreateEventModal } from './ExplorePage/CreateEventModal';
import {
  getEventChats,
  appendEventChatMessage,
  EVENT_CHATS_CHANGED_EVENT,
  type EventGroupChat,
} from './common/eventChats';
import {
  loadUserPosts,
  publishEvent,
  USER_POSTS_CHANGED_EVENT,
  type CreateEventPayload,
} from './HomeFeed/publishContent';
import './Layout.css';

interface Message {
  id: number;
  sender: 'me' | 'other';
  text: string;
  time: string;
}

interface ChatSession {
  id: number | string;
  name: string;
  avatar: string;
  role: string;
  online: boolean;
  messages: Message[];
  /** Event id when this is a temporary event group chat. */
  eventId?: string;
  isGroup?: boolean;
}

export const Layout: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [discoverOrganizerId, setDiscoverOrganizerId] = useState<string | null>(null);
  const [exploreFocus, setExploreFocus] = useState<{ eventId: string; coordinates: [number, number] } | null>(null);
  const discoverOrganizersRef = useRef<HTMLDivElement>(null);
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
    setDiscoverOrganizerId(organizerId);
    setActiveTab('discover');
  };

  const handleViewPostLocation = (post: HomeFeedPost) => {
    setExploreFocus({ eventId: post.eventId, coordinates: post.coordinates });
    setActiveTab('explore');
  };

  // Feed recomputes when follows change, a post is created, or Home re-opens
  // (so newly-learned dwell/interest affinity is applied between visits).
  const [feedVersion, setFeedVersion] = useState(0);
  const [isHomeCreateOpen, setIsHomeCreateOpen] = useState(false);
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
  }, [activeTab]);

  const feed = useMemo(() => buildFeed([...loadUserPosts(), ...HOME_FEED_POSTS]), [feedVersion]);

  const handleHomeCreateEvent = (eventData: Record<string, unknown>) => {
    publishEvent(eventData as unknown as CreateEventPayload);
    bumpFeed();
  };

  useEffect(() => {
    if (activeTab !== 'discover' || !discoverOrganizerId) return;

    const scrollTimer = window.setTimeout(() => {
      const target = document.getElementById(`discover-organizer-${discoverOrganizerId}`);
      target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 180);

    return () => window.clearTimeout(scrollTimer);
  }, [activeTab, discoverOrganizerId]);

  // Chat interactive states
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([
    {
      id: 1,
      name: 'Rahul Sharma',
      avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=150&h=150&q=80',
      role: 'Cricket Captain',
      online: true,
      messages: [
        { id: 1, sender: 'other', text: 'Hey, are you down for the cricket match this Sunday?', time: '2:15 PM' },
        { id: 2, sender: 'me', text: 'Yeah, definitely! What time does it start?', time: '2:18 PM' },
        { id: 3, sender: 'other', text: 'We start at 9 AM in Gachibowli. See you there!', time: '2:20 PM' },
      ],
    },
    {
      id: 2,
      name: 'Neha Reddy',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&h=150&q=80',
      role: 'Event Host',
      online: true,
      messages: [
        { id: 1, sender: 'other', text: 'Hi! Thanks for attending the open mic night!', time: 'Yesterday' },
        { id: 2, sender: 'me', text: 'It was amazing! The performances were great.', time: 'Yesterday' },
      ],
    },
    {
      id: 3,
      name: 'Aisha Khan',
      avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=150&h=150&q=80',
      role: 'Fitness Trainer',
      online: false,
      messages: [
        { id: 1, sender: 'other', text: 'Group yoga session is scheduled for Saturday morning.', time: '2 days ago' },
      ],
    },
  ]);
  const [activeChatId, setActiveChatId] = useState<number | string>(1);
  const [typedMessage, setTypedMessage] = useState('');
  const [eventChats, setEventChats] = useState<EventGroupChat[]>(() => getEventChats());

  useEffect(() => {
    const refresh = () => setEventChats(getEventChats());
    window.addEventListener(EVENT_CHATS_CHANGED_EVENT, refresh);
    return () => window.removeEventListener(EVENT_CHATS_CHANGED_EVENT, refresh);
  }, []);

  // Temporary event group chats (from joins) shown above the regular DMs.
  const eventChatSessions: ChatSession[] = useMemo(
    () =>
      eventChats.map((chat) => ({
        id: `gc-${chat.eventId}`,
        eventId: chat.eventId,
        isGroup: true,
        name: chat.title,
        avatar: chat.avatar,
        role: `Event group · hosted by ${chat.hostName}`,
        online: true,
        messages: chat.messages,
      })),
    [eventChats],
  );

  const allChatSessions = useMemo(
    () => [...eventChatSessions, ...chatSessions],
    [eventChatSessions, chatSessions],
  );

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

  const handleSendMessage = () => {
    const text = typedMessage.trim();
    if (!text) return;

    // Event group chats live in the shared store; DMs in local state.
    const activeGroup = eventChatSessions.find((c) => c.id === activeChatId);
    if (activeGroup?.eventId) {
      appendEventChatMessage(activeGroup.eventId, text);
      setTypedMessage('');
      return;
    }

    setChatSessions((prev) =>
      prev.map((chat) => {
        if (chat.id === activeChatId) {
          const now = new Date();
          const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          return {
            ...chat,
            messages: [
              ...chat.messages,
              {
                id: chat.messages.length + 1,
                sender: 'me',
                text,
                time: timeString,
              },
            ],
          };
        }
        return chat;
      })
    );
    setTypedMessage('');
  };

  // Mock RSVP Handler
  const handleRSVP = (eventName: string) => {
    alert(`Successfully RSVP'd to: ${eventName}! Added to your events list.`);
  };

  // Get active chat (event group chats first, then DMs)
  const activeChat =
    allChatSessions.find((c) => c.id === activeChatId) || allChatSessions[0];

  return (
    <div
      className={`zenex-app-shell ${activeTab === 'explore' ? 'explore-active' : ''} ${
        activeTab === 'home' ? 'home-active' : ''
      }`}
    >
      {/* Fixed Header */}
      {activeTab !== 'explore' && (
        <header className="zenex-header">
        <div className="zenex-brand-group">
          {/* Logo element clickable to reset to home */}
          <div className="zenex-logo-pill" onClick={() => setActiveTab('home')} style={{ cursor: 'pointer' }}>
            <img src="/logo.png" alt="ZENEX" className="header-logo-img" />
          </div>
          <div>
            <p className="zenex-app-title" onClick={() => setActiveTab('home')} style={{ cursor: 'pointer' }}>ZENEX</p>
            <p className="zenex-app-tagline">Connect. Play. Experience.</p>
          </div>
        </div>

        <div className="zenex-header-actions">
          {/* Collapsible Sidebar Button (visible on tablet and desktop) */}
          <button
            type="button"
            className="sidebar-toggle-btn"
            onClick={handleSidebarToggle}
            aria-label="Toggle sidebar"
          >
            {isSidebarOpen ? <ChevronLeft size={18} /> : <Menu size={18} />}
          </button>

          {/* Quick Notification Bell */}
          <button
            type="button"
            className="header-action-circle-btn notifications-bell-btn"
            onClick={() => setIsNotificationsOpen(true)}
            aria-label="Notifications"
          >
            <Bell size={20} />
            <span className="red-badge-dot">3</span>
          </button>

          {/* Settings Trigger */}
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
                  {/* Premium subscription bar */}
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

                  <button className="settings-option" onClick={() => { setIsSettingsOpen(false); setActiveTab('profile'); }}>
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
                onClick={() => setIsSettingsOpen(true)}
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
                  <div className="home-feed-section-label">Following</div>
                  <div className="home-feed-list">
                    {feed.following.map((post) => (
                      <HomePostCard
                        key={post.id}
                        post={post}
                        onViewHostProfile={handleViewOrganizerProfile}
                        onViewAuthorProfile={handleViewOrganizerProfile}
                        onViewLocation={handleViewPostLocation}
                        onFollowChange={bumpFeed}
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
                      />
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}

          {/* DISCOVER FEED */}
          {activeTab === 'discover' && (
            <div className="discover-page-view animate-fadeIn">
              <section className="zenex-hero-card glass-card">
                <div className="hero-card-copy">
                  <span className="hero-chip">Find & Match Activities</span>
                  <h2>Discover Feed</h2>
                  <p>Explore the full poster grid of sports, arts, music, wellness and competitive matches.</p>
                </div>
                <div className="hero-card-icon">
                  <div className="hero-icon-glow" />
                  <Search size={36} />
                </div>
              </section>

              {/* Interactive Category Tabs scroll */}
              <div className="discover-category-scroller">
                {['All', 'Sports', 'Entertainment', 'Arts', 'Fitness', 'Wellness'].map((cat) => (
                  <button
                    key={cat}
                    className={`discover-category-chip ${activeCategory === cat ? 'active' : ''}`}
                    onClick={() => setActiveCategory(cat)}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Grid of poster activity categories */}
              <section className="discover-grid-section">
                <h3>Explore Hubs</h3>
                <div className="discover-grid-layout">
                  <div className="discover-gradient-card card-purple-blue">
                    <h4>Sports Tournaments</h4>
                    <p>Find local tournaments, matches and leagues. Join team lineups or create customized challenges.</p>
                    <button className="discover-action-btn">Browse Matches</button>
                  </div>

                  <div className="discover-gradient-card card-purple-pink">
                    <h4>Performing Arts</h4>
                    <p>Immerse in local standup comedy showcases, music nights, poetry slams and indie acoustic sets.</p>
                    <button className="discover-action-btn">Find Stages</button>
                  </div>

                  <div className="discover-gradient-card card-blue-pink">
                    <h4>Wellness Sessions</h4>
                    <p>Connect with local fitness trainers, yoga sessions, runs, and healthy lifestyle clubs.</p>
                    <button className="discover-action-btn">Book Sessions</button>
                  </div>

                  <div className="discover-gradient-card card-orange-pink">
                    <h4>Community Hangouts</h4>
                    <p>Meet and connect with local organizers, esports matches, running groups and social communities.</p>
                    <button className="discover-action-btn">Meet People</button>
                  </div>
                </div>
              </section>

              <section className="discover-organizers-section" ref={discoverOrganizersRef}>
                <div className="discover-organizers-header">
                  <h3>Event Organizers</h3>
                  <p>Tap an organizer from the map to jump to their profile here.</p>
                </div>
                <div className="discover-organizers-list">
                  {EVENT_ORGANIZERS.map((organizer) => (
                    <article
                      key={organizer.id}
                      id={`discover-organizer-${organizer.id}`}
                      className={`discover-organizer-card glass-card ${
                        discoverOrganizerId === organizer.id ? 'is-highlighted' : ''
                      }`}
                      onClick={() => setDiscoverOrganizerId(organizer.id)}
                    >
                      <img
                        src={organizer.avatar}
                        alt={organizer.name}
                        className="discover-organizer-avatar"
                      />
                      <div className="discover-organizer-body">
                        <div className="discover-organizer-top">
                          <h4>{organizer.name}</h4>
                          <span className="discover-organizer-role">{organizer.role}</span>
                        </div>
                        <span className="discover-organizer-username">@{organizer.username}</span>
                        <p className="discover-organizer-bio">{organizer.bio}</p>
                        <div className="discover-organizer-meta">
                          <span>{organizer.location}</span>
                          <span>{organizer.eventsHosted} events hosted</span>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            </div>
          )}

          {/* CHAT PAGE (INTERACTIVE PANEL) */}
          {activeTab === 'chat' && (
            <div className="chat-page-view animate-fadeIn">
              <div className="chat-layout-container glass-card">
                {/* Chat Left Panel */}
                <div className="chat-session-list">
                  <div className="chat-panel-header">
                    <h3>Conversations</h3>
                    <button className="new-chat-btn"><Plus size={16} /></button>
                  </div>
                  <div className="chat-session-scroll">
                    {allChatSessions.map((session) => (
                      <div
                        key={session.id}
                        className={`chat-session-item ${session.id === activeChatId ? 'active' : ''}`}
                        onClick={() => setActiveChatId(session.id)}
                      >
                        <div className="session-avatar-wrap">
                          <img src={session.avatar} alt={session.name} className="session-avatar" />
                          {session.online && <span className="session-online-dot" />}
                          {session.isGroup && <span className="session-group-badge">GC</span>}
                        </div>
                        <div className="session-details">
                          <div className="session-name-row">
                            <span className="session-name">{session.name}</span>
                            <span className="session-time">
                              {session.messages[session.messages.length - 1]?.time || ''}
                            </span>
                          </div>
                          <span className="session-message-preview">
                            {session.messages[session.messages.length - 1]?.text || 'No messages yet'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Chat Right Panel (Conversation Box) */}
                <div className="chat-conversation-box">
                  <div className="conversation-header">
                    <div className="conversation-user-info">
                      <img src={activeChat.avatar} alt={activeChat.name} className="conversation-avatar" />
                      <div>
                        <span className="conversation-name">{activeChat.name}</span>
                        <span className="conversation-status">
                          {activeChat.isGroup
                            ? activeChat.role
                            : activeChat.online
                            ? 'Online'
                            : 'Offline'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="conversation-messages-list">
                    {activeChat.messages.map((msg) => (
                      <div key={msg.id} className={`chat-message-bubble ${msg.sender}`}>
                        <div className="message-content-box">
                          <p className="message-text">{msg.text}</p>
                          <span className="message-time">{msg.time}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="conversation-input-row">
                    <input
                      type="text"
                      placeholder={`Type a message to ${activeChat.name}...`}
                      value={typedMessage}
                      onChange={(e) => setTypedMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSendMessage();
                      }}
                      className="chat-message-input"
                    />
                    <button
                      className="chat-send-btn"
                      onClick={handleSendMessage}
                      aria-label="Send message"
                    >
                      <Send size={16} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* PROFILE PAGE */}
          {activeTab === 'profile' && (
            <div className="profile-page-view animate-fadeIn">
              <ProfileView />
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
                  <span className="panel-notif-text"><strong>Rahul Sharma</strong> sent you a connection request.</span>
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

          {/* Suggested Connections */}
          <div className="glass-card right-panel-card">
            <div className="panel-heading">
              <h3>Suggested Connections</h3>
              <span>3 new</span>
            </div>
            <ul className="panel-list">
              <li>
                <div className="panel-item-left">
                  <strong>Rahul Sharma</strong>
                  <span>Cricket Captain</span>
                </div>
                <button className="panel-item-action-btn">Connect</button>
              </li>
              <li>
                <div className="panel-item-left">
                  <strong>Neha Reddy</strong>
                  <span>Event Host</span>
                </div>
                <button className="panel-item-action-btn">Connect</button>
              </li>
              <li>
                <div className="panel-item-left">
                  <strong>Aisha Khan</strong>
                  <span>Fitness Trainer</span>
                </div>
                <button className="panel-item-action-btn">Connect</button>
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
                    <span className="panel-notif-text"><strong>Rahul Sharma</strong> sent you a connection request.</span>
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
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Premium Membership Modal */}
      <MembershipModal isOpen={isMembershipOpen} onClose={() => setIsMembershipOpen(false)} />
    </div>
  );
};

export default Layout;
