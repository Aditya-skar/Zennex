import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Plus, Check, Pencil, Trash2 } from 'lucide-react';
import { ORGANIZER_BY_ID } from './exploreEvents';
import { getFollowing } from '../HomeFeed/feedAlgorithm';
import { getDabbedUpIds } from '../profile/profileData';
import {
  loadPeopleLists,
  createPeopleList,
  updatePeopleList,
  deletePeopleList,
  toggleListMember,
  getPeopleList,
  PEOPLE_LISTS_CHANGED_EVENT,
  type PeopleList,
} from '../HomeFeed/audienceLists';

const LONG_PRESS_MS = 450;

export const MyPeopleListsSection: React.FC = () => {
  const [lists, setLists] = useState<PeopleList[]>(() => loadPeopleLists());
  const [actionListId, setActionListId] = useState<string | null>(null);
  const [editingListId, setEditingListId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const pressTimer = useRef<number | null>(null);
  const longPressTriggered = useRef(false);

  const refresh = useCallback(() => setLists(loadPeopleLists()), []);

  useEffect(() => {
    const onChange = () => refresh();
    window.addEventListener(PEOPLE_LISTS_CHANGED_EVENT, onChange);
    return () => window.removeEventListener(PEOPLE_LISTS_CHANGED_EVENT, onChange);
  }, [refresh]);

  const editingList = editingListId ? lists.find((l) => l.id === editingListId) : null;

  useEffect(() => {
    setEditName(editingList?.name ?? '');
  }, [editingList?.id, editingList?.name]);

  const connectedPeople = [...new Set([...getDabbedUpIds(), ...getFollowing()])]
    .map((id) => ORGANIZER_BY_ID[id])
    .filter(Boolean);

  const clearPress = useCallback(() => {
    if (pressTimer.current !== null) {
      window.clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  }, []);

  const startLongPress = useCallback(
    (listId: string) => {
      longPressTriggered.current = false;
      clearPress();
      pressTimer.current = window.setTimeout(() => {
        longPressTriggered.current = true;
        setActionListId(listId);
        if ('vibrate' in navigator) navigator.vibrate?.(12);
      }, LONG_PRESS_MS);
    },
    [clearPress],
  );

  const handleListPointerEnd = () => {
    clearPress();
  };

  const handleCreateList = () => {
    const list = createPeopleList('✨');
    refresh();
    setEditingListId(list.id);
  };

  const handleSaveName = (value: string) => {
    setEditName(value);
    if (!editingListId) return;
    updatePeopleList(editingListId, { name: value });
    refresh();
  };

  const handleToggleMember = (memberId: string) => {
    if (!editingListId) return;
    toggleListMember(editingListId, memberId);
    refresh();
  };

  const handleDeleteList = () => {
    if (!editingListId) return;
    deletePeopleList(editingListId);
    refresh();
    setEditingListId(null);
  };

  const openEditFromAction = () => {
    if (actionListId) setEditingListId(actionListId);
    setActionListId(null);
  };

  return (
    <section className="create-event-section create-event-section--lists">
      <h4 className="create-event-section-title">My lists</h4>
      <p className="field-hint">
        Group people you&apos;ve connected with. Long-press a list to edit members.
      </p>

      <div className="people-lists-row">
        {lists.map((list) => (
          <button
            key={list.id}
            type="button"
            className="people-list-chip"
            onTouchStart={() => startLongPress(list.id)}
            onTouchEnd={handleListPointerEnd}
            onTouchMove={clearPress}
            onMouseDown={() => startLongPress(list.id)}
            onMouseUp={handleListPointerEnd}
            onMouseLeave={clearPress}
            onContextMenu={(e) => {
              e.preventDefault();
              setActionListId(list.id);
            }}
          >
            <span className="people-list-chip-name">{list.name}</span>
            <span className="people-list-chip-count">{list.memberIds.length}</span>
          </button>
        ))}
        <button type="button" className="people-list-chip people-list-chip--new" onClick={handleCreateList}>
          <Plus size={14} />
          <span>New</span>
        </button>
      </div>

      {lists.length === 0 && (
        <p className="field-hint people-lists-empty">No lists yet — tap New to create one.</p>
      )}

      {actionListId && (
        <div className="people-list-action-overlay" onClick={() => setActionListId(null)}>
          <div className="people-list-action-sheet" onClick={(e) => e.stopPropagation()}>
            <p className="people-list-action-title">
              {getPeopleList(actionListId)?.name ?? 'List'}
            </p>
            <button type="button" className="people-list-action-btn" onClick={openEditFromAction}>
              <Pencil size={16} />
              Edit list
            </button>
            <button
              type="button"
              className="people-list-action-btn people-list-action-btn--muted"
              onClick={() => setActionListId(null)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {editingList && (
        <div className="people-list-edit-overlay" onClick={() => setEditingListId(null)}>
          <div className="people-list-edit-panel" onClick={(e) => e.stopPropagation()}>
            <div className="people-list-edit-head">
              <h5>Edit list</h5>
              <button
                type="button"
                className="people-list-delete-btn"
                onClick={handleDeleteList}
                aria-label="Delete list"
              >
                <Trash2 size={16} />
              </button>
            </div>

            <label className="people-list-edit-label" htmlFor="peopleListName">
              List name
            </label>
            <input
              id="peopleListName"
              type="text"
              className="people-list-name-input"
              placeholder="Close friends 🫶"
              value={editName}
              onChange={(e) => handleSaveName(e.target.value)}
              maxLength={32}
            />

            <p className="people-list-edit-label">Dabbed Up people</p>
            {connectedPeople.length === 0 ? (
              <p className="field-hint">
                Dab Up with people on Discover first — they&apos;ll show up here.
              </p>
            ) : (
              <div className="people-list-members">
                {connectedPeople.map((person) => {
                  const isOn = editingList.memberIds.includes(person.id);
                  return (
                    <button
                      key={person.id}
                      type="button"
                      className={`people-list-member-row ${isOn ? 'is-on' : ''}`}
                      onClick={() => handleToggleMember(person.id)}
                    >
                      <img src={person.avatar} alt="" className="people-list-member-avatar" />
                      <span className="people-list-member-meta">
                        <strong>{person.name}</strong>
                        <small>{person.role}</small>
                      </span>
                      <span className="people-list-member-check" aria-hidden="true">
                        {isOn && <Check size={14} />}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            <button type="button" className="people-list-edit-done" onClick={() => setEditingListId(null)}>
              Done
            </button>
          </div>
        </div>
      )}
    </section>
  );
};

export default MyPeopleListsSection;
