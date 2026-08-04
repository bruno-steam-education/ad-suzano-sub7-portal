import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  addAthleteStatEvent,
  archiveAthleteProfile,
  getAthleteAdminSnapshot,
  getStaffSession,
  onStaffAuthChange,
  saveAthleteProfile,
  signInStaff,
  signOutStaff,
  uploadAthletePhoto,
} from '../services/athleteAdmin';

const AthleteAdminContext = createContext(null);

const EMPTY_SNAPSHOT = { profiles: [], events: [] };

function mapByAthleteId(items) {
  return items.reduce((map, item) => {
    map.set(item.athlete_id, item);
    return map;
  }, new Map());
}

function groupEventsByAthleteId(items) {
  return items.reduce((map, item) => {
    const current = map.get(item.athlete_id) ?? [];
    current.push(item);
    map.set(item.athlete_id, current);
    return map;
  }, new Map());
}

export function AthleteAdminProvider({ children }) {
  const [session, setSession] = useState(null);
  const [snapshot, setSnapshot] = useState(EMPTY_SNAPSHOT);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    try {
      const next = await getAthleteAdminSnapshot();
      setSnapshot(next);
      setError('');
    } catch (refreshError) {
      setError(refreshError.message || 'Não foi possível carregar os dados administrativos.');
    }
  }, []);

  useEffect(() => {
    let active = true;
    Promise.all([getStaffSession(), getAthleteAdminSnapshot()])
      .then(([nextSession, nextSnapshot]) => {
        if (!active) return;
        setSession(nextSession);
        setSnapshot(nextSnapshot);
      })
      .catch((initialError) => {
        if (active) setError(initialError.message || 'Não foi possível conectar ao banco.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    const unsubscribe = onStaffAuthChange((nextSession) => {
      if (!active) return;
      setSession(nextSession);
      refresh();
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, [refresh]);

  const login = useCallback(async (password) => {
    const nextSession = await signInStaff(password);
    setSession(nextSession);
    await refresh();
  }, [refresh]);

  const logout = useCallback(async () => {
    await signOutStaff();
    setSession(null);
    await refresh();
  }, [refresh]);

  const saveAthlete = useCallback(async ({ profile, stats, photo }) => {
    let photoData = {};
    if (photo) photoData = await uploadAthletePhoto(profile.athlete_id, photo);
    await saveAthleteProfile({ ...profile, ...photoData, is_active: true });

    const hasStatAddition = Object.entries(stats).some(([key, value]) => (
      !['source', 'note'].includes(key) && Number(value) > 0
    ));
    if (hasStatAddition) {
      await addAthleteStatEvent({
        ...stats,
        games: Number(stats.games) || 0,
        goals: Number(stats.goals) || 0,
        assists: Number(stats.assists) || 0,
        steals: Number(stats.steals) || 0,
        yellow_cards: Number(stats.yellow_cards) || 0,
        red_cards: Number(stats.red_cards) || 0,
        goals_conceded: Number(stats.goals_conceded) || 0,
        saves: Number(stats.saves) || 0,
      });
    }
    await refresh();
  }, [refresh]);

  const archiveAthlete = useCallback(async (profile) => {
    await archiveAthleteProfile(profile);
    await refresh();
  }, [refresh]);

  const value = useMemo(() => ({
    session,
    isAdmin: Boolean(session),
    loading,
    error,
    profilesById: mapByAthleteId(snapshot.profiles),
    eventsByAthleteId: groupEventsByAthleteId(snapshot.events),
    login,
    logout,
    saveAthlete,
    archiveAthlete,
    refresh,
  }), [archiveAthlete, error, loading, login, logout, refresh, saveAthlete, session, snapshot.events, snapshot.profiles]);

  return <AthleteAdminContext.Provider value={value}>{children}</AthleteAdminContext.Provider>;
}

export function useAthleteAdmin() {
  const context = useContext(AthleteAdminContext);
  if (!context) throw new Error('useAthleteAdmin deve ser usado dentro de AthleteAdminProvider.');
  return context;
}
