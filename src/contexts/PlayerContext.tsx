import React, { createContext, useContext, useRef, useState, useCallback, useEffect } from 'react';
import type { Song } from '../services/playlistService';
import { signAudioUrl } from '../services/storageService';

type RepeatMode = 'OFF' | 'ONE' | 'ALL';

type ShuffleMode = 'OFF' | 'ON';

interface PlayerContextValue {
  currentSong: Song | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  queue: Song[];
  queueIndex: number;
  playSong: (song: Song, queue?: Song[]) => Promise<void>;
  togglePlay: () => void;
  seek: (time: number) => void;
  setVolume: (volume: number) => void;
  playNext: () => void;
  playPrevious: () => void;
  repeatMode: RepeatMode;
  shuffleMode: ShuffleMode;
  cycleRepeatMode: () => void;
  toggleShuffleMode: () => void;
}

const PlayerContext = createContext<PlayerContextValue | null>(null);

export function usePlayer(): PlayerContextValue {
  const ctx = useContext(PlayerContext);
  if (!ctx) {
    throw new Error('usePlayer must be used within PlayerProvider');
  }
  return ctx;
}

interface PlayerProviderProps {
  children: React.ReactNode;
}

export function PlayerProvider({ children }: PlayerProviderProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(0.7);
  const [queue, setQueue] = useState<Song[]>([]);
  const [queueIndex, setQueueIndex] = useState(-1);

  const [repeatMode, setRepeatMode] = useState<RepeatMode>(() => {
    const raw = typeof window !== 'undefined' ? window.localStorage.getItem('yundo.repeatMode') : null;
    if (raw === 'OFF' || raw === 'ONE' || raw === 'ALL') return raw;
    return 'OFF';
  });

  const [shuffleMode, setShuffleMode] = useState<ShuffleMode>(() => {
    const raw = typeof window !== 'undefined' ? window.localStorage.getItem('yundo.shuffleMode') : null;
    if (raw === 'OFF' || raw === 'ON') return raw;
    return 'OFF';
  });

  const shuffleRef = useRef<Song[]>([]);
  const naturalEndedRef = useRef(false);

   useEffect(() => {
     const audio = new Audio();
     audio.preload = 'metadata';
     audio.volume = 0.7;
     audioRef.current = audio;
 
     const onTimeUpdate = () => setCurrentTime(audio.currentTime);
     const onDurationChange = () => setDuration(audio.duration || 0);
     const onEnded = () => {
       const wasNatural = naturalEndedRef.current;
       naturalEndedRef.current = false;
       if (!wasNatural) {
         setIsPlaying(false);
         return;
       }
 
       const audioEl = audioRef.current;
       if (!audioEl) {
         setIsPlaying(false);
         return;
       }
 
       if (repeatMode === 'ONE' && currentSong) {
         audioEl.currentTime = 0;
         setCurrentTime(0);
         setDuration(audioEl.duration || 0);
         setIsPlaying(true);
         const p = audioEl.play();
         if (p && typeof (p as Promise<void>).then === 'function') {
           (p as Promise<void>).catch(() => setIsPlaying(false));
         }
         return;
       }
 
       setIsPlaying(false);
       const doNext = () => {
         const nextSong = getNextSongOnEnded();
         if (!nextSong) return;
         setCurrentSong(nextSong);
         setCurrentTime(0);
         setDuration(0);
         internalPlay(nextSong);
       };
 
       doNext();
     };
     const onError = () => {
       setIsPlaying(false);
     };
 
     audio.addEventListener('timeupdate', onTimeUpdate);
     audio.addEventListener('durationchange', onDurationChange);
     audio.addEventListener('ended', onEnded);
     audio.addEventListener('error', onError);


    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('durationchange', onDurationChange);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onError);
      audio.pause();
      audio.src = '';
    };
  }, []);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  const buildShuffledQueue = useCallback((baseQueue: Song[]) => {
    const copy = [...baseQueue];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }, []);

  const syncShuffleQueue = useCallback((baseQueue: Song[]) => {
    if (shuffleMode === 'OFF') {
      shuffleRef.current = baseQueue;
      return;
    }
    shuffleRef.current = buildShuffledQueue(baseQueue);
  }, [shuffleMode, buildShuffledQueue]);

  useEffect(() => {
    if (queue.length === 0) {
      shuffleRef.current = [];
      return;
    }
    syncShuffleQueue(queue);
  }, [queue, syncShuffleQueue]);

  useEffect(() => {
    if (!currentSong) return;
    const baseIdx = queue.findIndex((s) => s.id === currentSong.id);
    if (baseIdx < 0) {
      setCurrentSong(null);
      setIsPlaying(false);
      setQueueIndex(-1);
      setCurrentTime(0);
      setDuration(0);
    } else {
      setQueueIndex(baseIdx);
    }
  }, [queue, currentSong]);



  const getNextSongOnEnded = useCallback((): Song | null => {
    const baseQueue = queue;
    if (baseQueue.length === 0) return null;
    const currentId = currentSong?.id;
    if (!currentId) return null;

    const activeQueue = shuffleMode === 'ON' ? shuffleRef.current : baseQueue;
    if (activeQueue.length === 0) return null;

    const currentIdx = activeQueue.findIndex((s) => s.id === currentId);
    if (currentIdx < 0) return null;

    if (currentIdx + 1 < activeQueue.length) return activeQueue[currentIdx + 1];
    if (repeatMode === 'ALL') return activeQueue[0] ?? null;
    return null;
  }, [queue, currentSong, repeatMode, shuffleMode]);

  const getNextSongManual = useCallback((): Song | null => {
    const baseQueue = queue;
    if (baseQueue.length === 0 || queueIndex < 0) return null;

    const activeQueue = shuffleMode === 'ON' ? shuffleRef.current : baseQueue;
    if (activeQueue.length === 0) return null;

    const currentId = currentSong?.id;
    const currentIdx = currentId ? activeQueue.findIndex((s) => s.id === currentId) : queueIndex;
    if (currentIdx < 0) return null;

    if (currentIdx + 1 < activeQueue.length) return activeQueue[currentIdx + 1];
    if (repeatMode === 'ALL') return activeQueue[0] ?? null;
    return null;
  }, [queue, queueIndex, currentSong, repeatMode, shuffleMode]);

  const getPreviousSongManual = useCallback((): Song | null => {
    const baseQueue = queue;
    if (baseQueue.length === 0 || queueIndex < 0) return null;

    const activeQueue = shuffleMode === 'ON' ? shuffleRef.current : baseQueue;
    if (activeQueue.length === 0) return null;

    const currentId = currentSong?.id;
    const currentIdx = currentId ? activeQueue.findIndex((s) => s.id === currentId) : queueIndex;
    if (currentIdx < 0) return null;

    if (currentIdx - 1 >= 0) return activeQueue[currentIdx - 1];
    if (repeatMode === 'ALL') return activeQueue[activeQueue.length - 1] ?? null;
    return null;
  }, [queue, queueIndex, currentSong, repeatMode, shuffleMode]);


  const internalPlay = useCallback(async (song: Song) => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    const source = song.audioObjectKey || song.audioUrl;
    if (!source) {
      return;
    }

    try {
      let url: string;
      if (song.audioObjectKey) {
        url = await signAudioUrl(song.audioObjectKey);
      } else {
        url = song.audioUrl!;
      }
      audio.src = url;
      await audio.play();
      setIsPlaying(true);
    } catch {
      setIsPlaying(false);
    }
  }, []);

  const playSong = useCallback(async (song: Song, newQueue?: Song[]) => {
    const audio = audioRef.current;
    if (!audio) return;

    if (newQueue) {
      setQueue(newQueue);
      const idx = newQueue.findIndex((s) => s.id === song.id);
      setQueueIndex(idx >= 0 ? idx : -1);
      syncShuffleQueue(newQueue);

      if (shuffleMode === 'ON') {
        const activeQueue = shuffleRef.current;
        const shuffledIdx = activeQueue.findIndex((s) => s.id === song.id);
        if (shuffledIdx < 0) {
          naturalEndedRef.current = false;
        }
      }
    }

    if (currentSong?.id === song.id) {
      if (isPlaying) {
        audio.pause();
        setIsPlaying(false);
      } else {
        try {
          await audio.play();
          setIsPlaying(true);
        } catch {
          setIsPlaying(false);
        }
      }
      return;
    }

    setCurrentSong(song);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    audio.pause();
    audio.currentTime = 0;

    await internalPlay(song);
  }, [currentSong, isPlaying, internalPlay, syncShuffleQueue, shuffleMode]);

  const playNext = useCallback(() => {
    if (queue.length === 0 || queueIndex < 0) return;
    if (naturalEndedRef.current) naturalEndedRef.current = false;

    const nextSong = getNextSongManual();
    if (!nextSong) return;

    setCurrentSong(nextSong);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);

    const baseIdx = queue.findIndex((s) => s.id === nextSong.id);
    setQueueIndex(baseIdx);

    internalPlay(nextSong);
  }, [queue, queueIndex, internalPlay, getNextSongManual]);

  const playPrevious = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (audio.currentTime > 3) {
      audio.currentTime = 0;
      setCurrentTime(0);
      naturalEndedRef.current = false;
      return;
    }

    if (queue.length === 0 || queueIndex < 0) return;
    if (naturalEndedRef.current) naturalEndedRef.current = false;

    const prevSong = getPreviousSongManual();
    if (!prevSong) return;

    setCurrentSong(prevSong);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);

    const baseIdx = queue.findIndex((s) => s.id === prevSong.id);
    setQueueIndex(baseIdx);

    internalPlay(prevSong);
  }, [queue, queueIndex, internalPlay, getPreviousSongManual]);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !currentSong) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().then(() => {
        setIsPlaying(true);
      }).catch(() => {
        setIsPlaying(false);
      });
    }
  }, [currentSong, isPlaying]);

  const cycleRepeatMode = useCallback(() => {
    setRepeatMode((prev) => {
      if (prev === 'OFF') return 'ONE';
      if (prev === 'ONE') return 'ALL';
      return 'OFF';
    });
  }, []);

  const toggleShuffleMode = useCallback(() => {
    setShuffleMode((prev) => {
      const next: ShuffleMode = prev === 'OFF' ? 'ON' : 'OFF';
      if (next === 'OFF') {
        shuffleRef.current = queue;
      } else {
        syncShuffleQueue(queue);
      }
      return next;
    });
  }, [queue, syncShuffleQueue]);

  const seek = useCallback((time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  }, []);

  const setVolume = useCallback((v: number) => {
    setVolumeState(v);
  }, []);

  return (
    <PlayerContext.Provider
      value={{
        currentSong,
        isPlaying,
        currentTime,
        duration,
        volume,
        queue,
        queueIndex,
        playSong,
        togglePlay,
        seek,
        setVolume,
        playNext,
        playPrevious,
        repeatMode,
        shuffleMode,
        cycleRepeatMode,
        toggleShuffleMode,
      }}
    >
      {children}
    </PlayerContext.Provider>
  );
}
