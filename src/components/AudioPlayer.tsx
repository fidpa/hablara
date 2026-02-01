"use client";

/**
 * AudioPlayer - Audio-Wiedergabe mit Controls
 *
 * Play/Pause, Seek, Volume, Speed-Slider. Data URLs (statt Blob URLs) für WebKit-Kompatibilität.
 * Auto-Play Feature (optional) nach Metadata-Load. Named handlers für sauberes Cleanup.
 */

import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Play, Pause, Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";
import { logger } from "@/lib/logger";

interface AudioPlayerProps {
  audioData: string | null; // Base64 encoded WAV
  className?: string;
  onPlayStateChange?: (isPlaying: boolean) => void;
  autoPlay?: boolean; // Auto-play after audio loads
}

/**
 * Audio player component with play/pause, seek, volume, and speed controls
 *
 * Uses Data URLs instead of Blob URLs to avoid WebKit lifecycle issues.
 * Auto-play feature triggers playback after metadata loads (if requested).
 */
export function AudioPlayer({
  audioData,
  className,
  onPlayStateChange,
  autoPlay = false,
}: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const onPlayStateChangeRef = useRef(onPlayStateChange);
  onPlayStateChangeRef.current = onPlayStateChange;

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isLoaded, setIsLoaded] = useState(false);

  // Create audio element when audioData changes
  useEffect(() => {
    if (!audioData) {
      setIsLoaded(false);
      return;
    }

    // Use Data URL instead of Blob URL (eliminates lifecycle complexity)
    const url = `data:audio/wav;base64,${audioData}`;

    // Create new audio element
    const audio = new Audio(url);
    audioRef.current = audio;

    // Named event handlers for proper cleanup
    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
      setIsLoaded(true);

      // Auto-play if requested (user already clicked Card play button)
      if (autoPlay) {
        audio.play()
          .then(() => {
            setIsPlaying(true);
            onPlayStateChangeRef.current?.(true);
          })
          .catch((err) => {
            logger.warn('AudioPlayer', 'Auto-play blocked (user gesture may be required)', err);
          });
      }
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      onPlayStateChangeRef.current?.(false);
    };

    const handleError = (e: Event) => {
      const target = e.target as HTMLAudioElement;
      const errorCode = target?.error?.code;
      const errorMessage = target?.error?.message || 'Unknown error';
      logger.error('AudioPlayer', `Audio error [code=${errorCode}]: ${errorMessage}`, {
        event: e,
        src: target?.src?.substring(0, 100),
        networkState: target?.networkState,
        readyState: target?.readyState,
      });
      setIsLoaded(false);
    };

    // Add event listeners
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("error", handleError);

    // Apply current settings
    audio.volume = isMuted ? 0 : volume;
    audio.playbackRate = playbackRate;

    // Cleanup: Remove listeners, pause audio, and help GC
    return () => {
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("error", handleError);
      audio.pause();
      audioRef.current = null; // Help GC
    };
    // Dependencies: audioData, autoPlay trigger full audio recreation
    // volume/isMuted/playbackRate have dedicated effects (lines 114-125)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioData, autoPlay]);

  // Update volume when changed
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  // Update playback rate when changed
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  const togglePlay = useCallback(() => {
    if (!audioRef.current || !isLoaded) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
      onPlayStateChangeRef.current?.(false);
    } else {
      audioRef.current.play()
        .then(() => {
          setIsPlaying(true);
          onPlayStateChangeRef.current?.(true);
        })
        .catch((err) => {
          logger.error('AudioPlayer', 'Play failed', err);
        });
    }
  }, [isPlaying, isLoaded]);

  const handleSeek = useCallback((value: number[]) => {
    if (!audioRef.current || !isLoaded) return;
    const newTime = value[0] ?? 0;
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  }, [isLoaded]);

  const handleVolumeChange = useCallback((value: number[]) => {
    const newVolume = value[0] ?? 1;
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  }, []);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => !prev);
  }, []);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const playbackRates = [0.5, 0.75, 1, 1.25, 1.5, 2];

  if (!audioData) {
    return (
      <div className={cn("flex items-center justify-center p-4 text-muted-foreground", className)}>
        Keine Audiodaten verfügbar
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-3 p-3 bg-muted/30 rounded-lg", className)}>
      {/* Progress bar */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground w-10 text-right">
          {formatTime(currentTime)}
        </span>
        <Slider
          value={[currentTime]}
          max={duration || 1}
          step={0.1}
          onValueChange={handleSeek}
          disabled={!isLoaded}
          className="flex-1"
        />
        <span className="text-xs text-muted-foreground w-10">
          {formatTime(duration)}
        </span>
      </div>

      {/* Controls */}
      <div className="flex flex-col gap-2">
        {/* Row 1: Play + Volume */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={togglePlay}
            disabled={!isLoaded}
            className="h-9 w-9 flex-shrink-0"
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? (
              <Pause className="h-5 w-5" />
            ) : (
              <Play className="h-5 w-5" />
            )}
          </Button>

          <div className="flex items-center gap-2 flex-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleMute}
              className="h-8 w-8 flex-shrink-0"
              aria-label={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="h-4 w-4" />
              ) : (
                <Volume2 className="h-4 w-4" />
              )}
            </Button>
            <Slider
              value={[isMuted ? 0 : volume]}
              max={1}
              step={0.05}
              onValueChange={handleVolumeChange}
              className="flex-1"
            />
          </div>
        </div>

        {/* Row 2: Playback speed */}
        <div className="flex items-center gap-1 justify-center">
          {playbackRates.map((rate) => (
            <Button
              key={rate}
              variant={playbackRate === rate ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setPlaybackRate(rate)}
              className="h-7 px-2 text-xs flex-1"
            >
              {rate}x
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
