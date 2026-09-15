import React, { useMemo, useRef, useCallback, useState } from 'react';
import { PlayIcon, PauseIcon, SkipBackIcon, SkipForwardIcon, VolumeIcon, ShuffleIcon, RepeatIcon, QueueIcon } from './Icons';
import { usePlayer } from '../contexts/PlayerContext';
import '../styles/Player.css';

function formatTime(seconds: number): string {
  if (!seconds || !isFinite(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

const MusicPlayer: React.FC = () => {
    const {
      currentSong,
      isPlaying,
      currentTime,
      duration,
      volume,
      togglePlay,
      seek,
      setVolume,
      playNext,
      playPrevious,
      repeatMode,
      shuffleMode,
      cycleRepeatMode,
      toggleShuffleMode,
      queue,
      queueIndex,
      playSong,
    } = usePlayer();



  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const queuePanelId = 'yundo-queue-panel';

  const shuffleAriaLabel = shuffleMode === 'ON' ? 'Shuffle on' : 'Shuffle off';

  const progressBarRef = useRef<HTMLDivElement>(null);
  const volumeBarRef = useRef<HTMLDivElement>(null);


  const handleProgressClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const bar = progressBarRef.current;
      if (!bar || !duration) return;
      const rect = bar.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      seek(ratio * duration);
    },
    [duration, seek]
  );

  const handleVolumeClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const bar = volumeBarRef.current;
      if (!bar) return;
      const rect = bar.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      setVolume(ratio);
    },
    [setVolume]
  );

  const hasTrack = !!currentSong;
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const volumePercent = volume * 100;

  const activeQueue = useMemo(() => {
    if (!queue || queue.length === 0) return [];
    if (shuffleMode === 'ON') {
      const currentIdx = queue.findIndex((s) => s.id === currentSong?.id);
      if (currentIdx < 0) return queue;
      if (queueIndex < 0) return queue;
      return [...queue.slice(queueIndex), ...queue.slice(0, queueIndex)];
    }
    return queue;
  }, [queue, shuffleMode, queueIndex, currentSong]);

  const handleOpenQueue = useCallback(() => setIsQueueOpen(true), []);
  const handleCloseQueue = useCallback(() => setIsQueueOpen(false), []);

  const handleQueueSongClick = useCallback(
    async (songId: string) => {
      const song = queue.find((s) => s.id === songId);
      if (!song) return;
      await playSong(song, queue);
      setIsQueueOpen(false);
    },
    [queue, playSong]
  );

  const onQueueKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'Escape') setIsQueueOpen(false);
    },
    []
  );


  return (
    <div className={`player ${!hasTrack ? 'player-empty' : ''}`}>
      <div className="player-inner">
        <div className="player-track-info">
          <span className="player-track-title">
            {hasTrack && isPlaying && (
              <span className="player-eq">
                <span className="player-eq-bar" />
                <span className="player-eq-bar" />
                <span className="player-eq-bar" />
              </span>
            )}
            {currentSong?.title || 'No track selected'}
          </span>
          <span className="player-track-artist">
            {currentSong?.artist || '—'}
          </span>
        </div>

        <div className="player-controls">
          <button className="player-btn" title="Previous" onClick={playPrevious} disabled={!hasTrack}>
            <SkipBackIcon />
          </button>

          <button
            className="player-btn play-btn"
            title={isPlaying ? 'Pause' : 'Play'}
            onClick={togglePlay}
            disabled={!hasTrack}
          >
            {isPlaying ? <PauseIcon /> : <PlayIcon />}
          </button>

          <button className="player-btn" title="Next" onClick={playNext} disabled={!hasTrack}>
            <SkipForwardIcon />
          </button>

          <button
            className={`player-btn ${shuffleMode === 'ON' ? 'player-btn-active player-btn-neon' : ''}`}
            title="Shuffle"
            aria-label={shuffleAriaLabel}
            aria-pressed={shuffleMode === 'ON'}
            onClick={toggleShuffleMode}
            disabled={!hasTrack}
          >
            <ShuffleIcon className="player-shuffle-icon" />
          </button>

          <button
            className={`player-btn ${repeatMode !== 'OFF' ? 'player-btn-active' : ''}`}
            title={repeatMode === 'OFF' ? 'Repeat: Off' : repeatMode === 'ONE' ? 'Repeat: One' : 'Repeat: All'}
            aria-label={repeatMode === 'OFF' ? 'Repeat off' : repeatMode === 'ONE' ? 'Repeat one' : 'Repeat all'}
            aria-pressed={repeatMode !== 'OFF'}
            onClick={cycleRepeatMode}
            disabled={!hasTrack}
          >
            <span className="player-repeat-wrap" aria-hidden>
              <RepeatIcon className="player-repeat-icon" />
              {repeatMode === 'ONE' && <span className="player-repeat-indicator player-repeat-indicator-one">1</span>}
              {repeatMode === 'ALL' && <span className="player-repeat-indicator player-repeat-indicator-all" />}
            </span>
          </button>

          <button
            className={`player-btn ${isQueueOpen ? 'player-btn-active' : ''}`}
            title="Queue"
            aria-label="Open queue"
            aria-expanded={isQueueOpen}
            onClick={handleOpenQueue}
            disabled={!hasTrack}
          >
            <QueueIcon className={isQueueOpen ? 'player-queue-icon-active' : undefined} />
          </button>
        </div>

        {isQueueOpen && (
          <div className="player-queue-popover" role="dialog"             aria-modal="false" aria-labelledby={queuePanelId} onKeyDown={onQueueKeyDown}>
            <div className="player-queue-panel">

              <div className="player-queue-header">
                <div className="player-queue-title" id={queuePanelId}>Queue</div>
                <button className="player-queue-close" aria-label="Close queue" onClick={handleCloseQueue}>
                  <span aria-hidden>×</span>
                </button>
              </div>

              <div className="player-queue-list">
                {activeQueue.length === 0 ? (
                  <div className="player-queue-empty">No queued songs</div>
                ) : (
                  activeQueue.map((song) => {
                    const isCurrent = currentSong?.id === song.id;
                    return (
                      <button
                        key={song.id}
                        className={`player-queue-item ${isCurrent ? 'player-queue-item-current' : ''}`}
                        onClick={() => handleQueueSongClick(song.id)}
                      >
                        <div className="player-queue-item-main">
                          <div className="player-queue-item-title">{song.title || 'Untitled'}</div>
                          <div className="player-queue-item-artist">{song.artist || '—'}</div>
                        </div>
                        {isCurrent && <div className="player-queue-current-indicator" aria-hidden />}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}


        <div className="player-progress-wrapper">
          <span className="player-time">{formatTime(currentTime)}</span>
          <div
            ref={progressBarRef}
            className="player-progress-bar"
            onClick={handleProgressClick}
          >
            <div
              className="player-progress-fill"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <span className="player-time">{formatTime(duration)}</span>
        </div>

        <div className="player-volume">
          <VolumeIcon />
          <div
            ref={volumeBarRef}
            className="player-volume-bar"
            onClick={handleVolumeClick}
          >
            <div
              className="player-volume-fill"
              style={{ width: `${volumePercent}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default MusicPlayer;
