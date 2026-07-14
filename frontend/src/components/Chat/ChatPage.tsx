import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Check,
  ChevronRight,
  Image as ImageIcon,
  MoreHorizontal,
  Paperclip,
  Search,
  Send,
  UserMinus,
  UserPlus,
  Users,
  Video,
  X,
} from 'lucide-react';
import type { HomeFeedPost } from '../HomeFeed/homeFeed';
import { ME_AUTHOR_ID } from '../ExplorePage/exploreEvents';
import {
  addGroupMember,
  createGroup,
  getAllConversations,
  getAvailableContacts,
  isGroupAdmin,
  messagePreview,
  removeGroupMember,
  REACTION_EMOJIS,
  SAMPLE_VIDEOS,
  sendSharedPost,
  sendTextMessage,
  sendVideoMessage,
  subscribeChatStore,
  toggleReaction,
  type ChatConversation,
  type ChatMember,
  type ChatMessage,
} from './chatStore';
import './ChatPage.css';

type ChatPageProps = {
  feedPosts: HomeFeedPost[];
  createGroupOpen?: boolean;
  onCreateGroupOpenChange?: (open: boolean) => void;
};

function groupReactions(reactions: ChatMessage['reactions']): { emoji: string; count: number; mine: boolean }[] {
  const map = new Map<string, { count: number; mine: boolean }>();
  for (const r of reactions) {
    const prev = map.get(r.emoji) ?? { count: 0, mine: false };
    map.set(r.emoji, { count: prev.count + 1, mine: prev.mine || r.userId === ME_AUTHOR_ID });
  }
  return [...map.entries()].map(([emoji, data]) => ({ emoji, ...data }));
}

export default function ChatPage({
  feedPosts,
  createGroupOpen = false,
  onCreateGroupOpenChange,
}: ChatPageProps) {
  const [conversations, setConversations] = useState<ChatConversation[]>(() => getAllConversations());
  const [activeChatId, setActiveChatId] = useState<string>(() => getAllConversations()[0]?.id ?? '');
  const [draft, setDraft] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileShowConversation, setMobileShowConversation] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(createGroupOpen);

  useEffect(() => {
    if (createGroupOpen) setShowCreateGroup(true);
  }, [createGroupOpen]);

  const closeCreateGroup = () => {
    setShowCreateGroup(false);
    onCreateGroupOpenChange?.(false);
  };
  const [showMembers, setShowMembers] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [showPostPicker, setShowPostPicker] = useState(false);
  const [showVideoPicker, setShowVideoPicker] = useState(false);
  const [reactionTarget, setReactionTarget] = useState<{ chatId: string; messageId: string } | null>(null);
  const [groupName, setGroupName] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const longPressTimer = useRef<number | null>(null);

  const refresh = useCallback(() => setConversations(getAllConversations()), []);

  useEffect(() => subscribeChatStore(refresh), [refresh]);

  const activeChat = useMemo(
    () => conversations.find((c) => c.id === activeChatId) ?? conversations[0],
    [conversations, activeChatId],
  );

  const contacts = useMemo(() => getAvailableContacts(), []);
  const filteredConversations = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        messagePreview(c.messages[c.messages.length - 1] ?? ({} as ChatMessage))
          .toLowerCase()
          .includes(q),
    );
  }, [conversations, searchQuery]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeChat?.messages.length, activeChatId]);

  const openConversation = (id: string) => {
    setActiveChatId(id);
    setMobileShowConversation(true);
    setReactionTarget(null);
    setShowShareMenu(false);
  };

  const handleSend = () => {
    if (!activeChat || !draft.trim()) return;
    sendTextMessage(activeChat.id, draft);
    setDraft('');
  };

  const handleCreateGroup = () => {
    const created = createGroup(groupName, selectedMembers);
    if (created) {
      closeCreateGroup();
      setGroupName('');
      setSelectedMembers([]);
      openConversation(created.id);
    }
  };

  const toggleMemberPick = (id: string) => {
    setSelectedMembers((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id],
    );
  };

  const startLongPress = (chatId: string, messageId: string) => {
    longPressTimer.current = window.setTimeout(() => {
      setReactionTarget({ chatId, messageId });
    }, 450);
  };

  const cancelLongPress = () => {
    if (longPressTimer.current) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleReaction = (emoji: string) => {
    if (!reactionTarget) return;
    toggleReaction(reactionTarget.chatId, reactionTarget.messageId, emoji);
    setReactionTarget(null);
  };

  const renderMessage = (msg: ChatMessage, chat: ChatConversation) => {
    const reactions = groupReactions(msg.reactions);
    const isReactionOpen =
      reactionTarget?.chatId === chat.id && reactionTarget?.messageId === msg.id;

    return (
      <div
        key={msg.id}
        className={`chat-msg-row ${msg.sender}`}
        onTouchStart={() => startLongPress(chat.id, msg.id)}
        onTouchEnd={cancelLongPress}
        onTouchMove={cancelLongPress}
        onMouseDown={() => startLongPress(chat.id, msg.id)}
        onMouseUp={cancelLongPress}
        onMouseLeave={cancelLongPress}
        onContextMenu={(e) => {
          e.preventDefault();
          setReactionTarget({ chatId: chat.id, messageId: msg.id });
        }}
      >
        {chat.type !== 'dm' && msg.sender === 'other' && (
          <img src={findAvatar(chat, msg.authorId)} alt="" className="chat-msg-avatar" />
        )}

        <div className="chat-msg-stack">
          {chat.type !== 'dm' && msg.sender === 'other' && (
            <span className="chat-msg-author">{msg.authorName}</span>
          )}

          <div className={`chat-bubble ${msg.sender} ${msg.kind !== 'text' ? 'rich' : ''}`}>
            {msg.kind === 'text' && <p className="chat-bubble-text">{msg.text}</p>}

            {msg.kind === 'post' && msg.sharedPost && (
              <div className="chat-shared-post">
                <div className="chat-shared-post-head">
                  <img src={msg.sharedPost.authorAvatar} alt="" />
                  <div>
                    <span className="chat-shared-author">{msg.sharedPost.authorName}</span>
                    <span className="chat-shared-event">{msg.sharedPost.eventTitle}</span>
                  </div>
                </div>
                {msg.sharedPost.image && (
                  <img src={msg.sharedPost.image} alt="" className="chat-shared-media" />
                )}
                {msg.sharedPost.videoUrl && !msg.sharedPost.image && (
                  <video src={msg.sharedPost.videoUrl} className="chat-shared-media" controls />
                )}
                <p className="chat-shared-caption">{msg.sharedPost.caption}</p>
              </div>
            )}

            {msg.kind === 'video' && msg.mediaUrl && (
              <div className="chat-video-wrap">
                <video src={msg.mediaUrl} controls className="chat-video-player" />
                {msg.text && <p className="chat-bubble-text">{msg.text}</p>}
              </div>
            )}

            {msg.kind === 'image' && msg.mediaUrl && (
              <img src={msg.mediaUrl} alt="" className="chat-shared-media" />
            )}

            <span className="chat-bubble-time">{msg.time}</span>
          </div>

          {reactions.length > 0 && (
            <div className={`chat-reactions-pill ${msg.sender}`}>
              {reactions.map((r) => (
                <button
                  key={r.emoji}
                  type="button"
                  className={`chat-reaction-chip ${r.mine ? 'mine' : ''}`}
                  onClick={() => toggleReaction(chat.id, msg.id, r.emoji)}
                >
                  {r.emoji}
                  {r.count > 1 && <span>{r.count}</span>}
                </button>
              ))}
            </div>
          )}

          {isReactionOpen && (
            <div className="chat-reaction-picker">
              {REACTION_EMOJIS.map((emoji) => (
                <button key={emoji} type="button" onClick={() => handleReaction(emoji)}>
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="chat-page">
      <div className={`chat-shell ${mobileShowConversation ? 'show-thread' : ''}`}>
        {/* Conversation list */}
        <aside className="chat-list-panel">
          <div className="chat-search-wrap">
            <Search size={16} />
            <input
              type="search"
              placeholder="Search conversations"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="chat-session-list">
            {filteredConversations.map((session) => {
              const last = session.messages[session.messages.length - 1];
              return (
                <button
                  key={session.id}
                  type="button"
                  className={`chat-session-row ${session.id === activeChatId ? 'active' : ''}`}
                  onClick={() => openConversation(session.id)}
                >
                  <div className="chat-session-avatar-wrap">
                    <img src={session.avatar} alt="" className="chat-session-avatar" />
                    {session.online && <span className="chat-online-dot" />}
                    {session.type !== 'dm' && (
                      <span className="chat-group-badge">
                        {session.type === 'event' ? 'EV' : 'GC'}
                      </span>
                    )}
                  </div>
                  <div className="chat-session-body">
                    <span className="chat-session-name">{session.name}</span>
                    <span className="chat-session-preview">
                      {last ? messagePreview(last) : 'No messages yet'}
                    </span>
                  </div>
                  <span className="chat-session-time">{last?.time ?? ''}</span>
                </button>
              );
            })}
          </div>
        </aside>

        {/* Active thread */}
        {activeChat && (
          <section className="chat-thread-panel">
            <header className="chat-thread-header">
              <button
                type="button"
                className="chat-back-btn"
                aria-label="Back to list"
                onClick={() => setMobileShowConversation(false)}
              >
                <ArrowLeft size={20} />
              </button>

              <button
                type="button"
                className="chat-thread-user"
                onClick={() => activeChat.type !== 'dm' && setShowMembers(true)}
              >
                <img src={activeChat.avatar} alt="" />
                <div className="chat-thread-user-text">
                  <span className="chat-thread-name">{activeChat.name}</span>
                  <span className="chat-thread-status">
                    {activeChat.type === 'dm'
                      ? activeChat.online
                        ? 'Active now'
                        : 'Offline'
                      : activeChat.subtitle}
                  </span>
                </div>
                {activeChat.type !== 'dm' && <ChevronRight size={16} className="chat-thread-chevron" />}
              </button>

              {activeChat.type === 'group' && isGroupAdmin(activeChat) && (
                <button
                  type="button"
                  className="chat-icon-btn"
                  aria-label="Manage members"
                  onClick={() => setShowMembers(true)}
                >
                  <Users size={18} />
                </button>
              )}
            </header>

            <div className="chat-messages-scroll">
              {activeChat.messages.map((msg) => renderMessage(msg, activeChat))}
              <div ref={messagesEndRef} />
            </div>

            <footer className="chat-composer">
              <div className="chat-composer-tools">
                <button
                  type="button"
                  className="chat-icon-btn"
                  aria-label="Attach"
                  onClick={() => setShowShareMenu((v) => !v)}
                >
                  <Paperclip size={18} />
                </button>
                {showShareMenu && (
                  <div className="chat-share-menu">
                    <button type="button" onClick={() => { setShowPostPicker(true); setShowShareMenu(false); }}>
                      <ImageIcon size={16} /> Share post
                    </button>
                    <button type="button" onClick={() => { setShowVideoPicker(true); setShowShareMenu(false); }}>
                      <Video size={16} /> Share video
                    </button>
                  </div>
                )}
              </div>

              <input
                type="text"
                className="chat-composer-input"
                placeholder="Message..."
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              />

              <button
                type="button"
                className="chat-send-btn"
                aria-label="Send"
                disabled={!draft.trim()}
                onClick={handleSend}
              >
                <Send size={16} />
              </button>
            </footer>
          </section>
        )}
      </div>

      {/* Create group modal */}
      {showCreateGroup && (
        <div className="chat-modal-overlay" onClick={closeCreateGroup}>
          <div className="chat-modal" onClick={(e) => e.stopPropagation()}>
            <header className="chat-modal-header">
              <h3>New group</h3>
              <button type="button" className="chat-icon-btn" onClick={closeCreateGroup}>
                <X size={18} />
              </button>
            </header>

            <label className="chat-field">
              <span>Group name</span>
              <input
                type="text"
                placeholder="Weekend crew, Gym buddies..."
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
              />
            </label>

            <p className="chat-modal-label">Add members</p>
            <div className="chat-member-pick-list">
              {contacts
                .filter((c) => c.id !== ME_AUTHOR_ID)
                .map((contact) => (
                  <button
                    key={contact.id}
                    type="button"
                    className={`chat-member-pick ${selectedMembers.includes(contact.id) ? 'selected' : ''}`}
                    onClick={() => toggleMemberPick(contact.id)}
                  >
                    <img src={contact.avatar} alt="" />
                    <span>{contact.name}</span>
                    {selectedMembers.includes(contact.id) && <Check size={16} />}
                  </button>
                ))}
            </div>

            <button
              type="button"
              className="chat-primary-btn"
              disabled={!groupName.trim() || selectedMembers.length === 0}
              onClick={handleCreateGroup}
            >
              Create group
            </button>
          </div>
        </div>
      )}

      {/* Members panel */}
      {showMembers && activeChat && activeChat.type !== 'dm' && (
        <div className="chat-modal-overlay" onClick={() => setShowMembers(false)}>
          <div className="chat-modal chat-members-modal" onClick={(e) => e.stopPropagation()}>
            <header className="chat-modal-header">
              <h3>{activeChat.name}</h3>
              <button type="button" className="chat-icon-btn" onClick={() => setShowMembers(false)}>
                <X size={18} />
              </button>
            </header>
            <p className="chat-members-count">{activeChat.members.length} members</p>

            <div className="chat-members-list">
              {activeChat.members.map((member) => (
                <div key={member.id} className="chat-member-row">
                  <img src={member.avatar} alt="" />
                  <div>
                    <span className="chat-member-name">{member.name}</span>
                    <span className="chat-member-role">
                      {member.id === activeChat.adminId ? 'Admin' : member.role ?? 'Member'}
                    </span>
                  </div>
                  {activeChat.type === 'group' &&
                    isGroupAdmin(activeChat) &&
                    member.id !== ME_AUTHOR_ID && (
                      <button
                        type="button"
                        className="chat-icon-btn danger"
                        aria-label={`Remove ${member.name}`}
                        onClick={() => removeGroupMember(activeChat.id, member.id)}
                      >
                        <UserMinus size={16} />
                      </button>
                    )}
                </div>
              ))}
            </div>

            {activeChat.type === 'group' && isGroupAdmin(activeChat) && (
              <AddMemberSection
                chatId={activeChat.id}
                existingIds={activeChat.members.map((m) => m.id)}
                contacts={contacts}
              />
            )}
          </div>
        </div>
      )}

      {/* Share post picker */}
      {showPostPicker && activeChat && (
        <div className="chat-modal-overlay" onClick={() => setShowPostPicker(false)}>
          <div className="chat-modal chat-picker-modal" onClick={(e) => e.stopPropagation()}>
            <header className="chat-modal-header">
              <h3>Share a post</h3>
              <button type="button" className="chat-icon-btn" onClick={() => setShowPostPicker(false)}>
                <X size={18} />
              </button>
            </header>
            <div className="chat-post-pick-list">
              {feedPosts.slice(0, 12).map((post) => (
                <button
                  key={post.id}
                  type="button"
                  className="chat-post-pick"
                  onClick={() => {
                    sendSharedPost(activeChat.id, post);
                    setShowPostPicker(false);
                  }}
                >
                  {post.image && <img src={post.image} alt="" />}
                  <div>
                    <span>{post.eventTitle}</span>
                    <p>{post.caption.slice(0, 60)}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Share video picker */}
      {showVideoPicker && activeChat && (
        <div className="chat-modal-overlay" onClick={() => setShowVideoPicker(false)}>
          <div className="chat-modal" onClick={(e) => e.stopPropagation()}>
            <header className="chat-modal-header">
              <h3>Share a video</h3>
              <button type="button" className="chat-icon-btn" onClick={() => setShowVideoPicker(false)}>
                <X size={18} />
              </button>
            </header>
            {SAMPLE_VIDEOS.map((v) => (
              <button
                key={v.url}
                type="button"
                className="chat-video-pick"
                onClick={() => {
                  sendVideoMessage(activeChat.id, v.url, v.label);
                  setShowVideoPicker(false);
                }}
              >
                <Video size={16} />
                {v.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function findAvatar(chat: ChatConversation, authorId: string): string {
  return chat.members.find((m) => m.id === authorId)?.avatar ?? chat.avatar;
}

function AddMemberSection({
  chatId,
  existingIds,
  contacts,
}: {
  chatId: string;
  existingIds: string[];
  contacts: ChatMember[];
}) {
  const [open, setOpen] = useState(false);
  const available = contacts.filter((c) => c.id !== ME_AUTHOR_ID && !existingIds.includes(c.id));

  if (available.length === 0) return null;

  return (
    <div className="chat-add-member">
      <button type="button" className="chat-add-member-toggle" onClick={() => setOpen((v) => !v)}>
        <UserPlus size={16} />
        Add people
        <MoreHorizontal size={16} />
      </button>
      {open && (
        <div className="chat-add-member-list">
          {available.map((contact) => (
            <button
              key={contact.id}
              type="button"
              className="chat-member-pick"
              onClick={() => addGroupMember(chatId, contact.id)}
            >
              <img src={contact.avatar} alt="" />
              <span>{contact.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
