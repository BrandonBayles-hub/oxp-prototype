import { useRef, useState, useCallback } from "react";

const PREFERRED_MIME = [
  "video/webm;codecs=vp9,opus",
  "video/webm;codecs=vp8,opus",
  "video/webm",
  "video/mp4"
];

function pickMime() {
  if (typeof MediaRecorder === "undefined") return "";
  for (const m of PREFERRED_MIME) {
    if (MediaRecorder.isTypeSupported(m)) return m;
  }
  return "";
}

export function useMediaRecorder() {
  const [status, setStatus] = useState("idle");
  const [blob, setBlob] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState(null);
  const [dataSize, setDataSize] = useState(0);

  const recorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const startTimeRef = useRef(0);
  const pausedDurationRef = useRef(0);
  const pauseStartRef = useRef(0);
  const videoElRef = useRef(null);

  const cleanup = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    recorderRef.current = null;
    chunksRef.current = [];
    pausedDurationRef.current = 0;
    pauseStartRef.current = 0;
  }, []);

  const startCamera = useCallback(async (facingMode = "user") => {
    cleanup();
    setBlob(null);
    setError(null);
    setElapsed(0);
    setDataSize(0);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1080 }, height: { ideal: 1920 } },
        audio: true
      });
      streamRef.current = stream;
      setStatus("previewing");
      return stream;
    } catch (err) {
      const msg = err.name === "NotAllowedError" ? "Camera access was denied. Please allow camera access and try again."
        : err.name === "NotFoundError" ? "No camera found. Please connect a camera and try again."
        : err.message || "Camera access failed";
      setError(msg);
      setStatus("error");
      return null;
    }
  }, [cleanup]);

  const startScreen = useCallback(async (options = {}) => {
    cleanup();
    setBlob(null);
    setError(null);
    setElapsed(0);
    setDataSize(0);
    try {
      const displayOptions = {
        video: { cursor: "always" },
        audio: !!options.systemAudio
      };

      const screenStream = await navigator.mediaDevices.getDisplayMedia(displayOptions);

      let micStream = null;
      if (options.microphone !== false) {
        try {
          micStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        } catch { /* mic is optional */ }
      }

      const tracks = [...screenStream.getVideoTracks()];
      if (micStream) tracks.push(...micStream.getAudioTracks());
      if (options.systemAudio && screenStream.getAudioTracks().length) {
        tracks.push(...screenStream.getAudioTracks());
      }

      const combined = new MediaStream(tracks);
      streamRef.current = combined;

      screenStream.getVideoTracks()[0].addEventListener("ended", () => {
        if (recorderRef.current && recorderRef.current.state === "recording") {
          recorderRef.current.stop();
        }
      });

      setStatus("previewing");
      return combined;
    } catch (err) {
      const msg = err.name === "NotAllowedError"
        ? "Screen sharing was cancelled or denied. Click 'Choose Screen & Start' again and select a screen, window, or tab to share."
        : err.name === "NotFoundError" ? "No screen available for sharing."
        : err.name === "NotReadableError" ? "Could not read from the selected screen. Try a different screen or tab."
        : err.message || "Screen share failed";
      setError(msg);
      setStatus("error");
      return null;
    }
  }, [cleanup]);

  const record = useCallback((bitrate) => {
    if (!streamRef.current) return;
    const mimeType = pickMime();
    const options = mimeType ? { mimeType } : {};
    if (bitrate) options.videoBitsPerSecond = bitrate;
    const recorder = new MediaRecorder(streamRef.current, options);
    chunksRef.current = [];
    setDataSize(0);

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunksRef.current.push(e.data);
        setDataSize(prev => prev + e.data.size);
      }
    };

    recorder.onstop = () => {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
      const type = mimeType || "video/webm";
      const recorded = new Blob(chunksRef.current, { type });
      setBlob(recorded);
      setDataSize(recorded.size);
      setStatus("recorded");
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };

    recorderRef.current = recorder;
    recorder.start(1000);
    startTimeRef.current = Date.now();
    pausedDurationRef.current = 0;
    timerRef.current = setInterval(() => {
      const now = Date.now();
      const paused = pauseStartRef.current ? (now - pauseStartRef.current) : 0;
      const totalElapsed = now - startTimeRef.current - pausedDurationRef.current - paused;
      setElapsed(Math.floor(Math.max(0, totalElapsed) / 1000));
    }, 500);
    setStatus("recording");
  }, []);

  const pause = useCallback(() => {
    if (recorderRef.current?.state === "recording") {
      recorderRef.current.pause();
      pauseStartRef.current = Date.now();
      setStatus("paused");
    }
  }, []);

  const resume = useCallback(() => {
    if (recorderRef.current?.state === "paused") {
      recorderRef.current.resume();
      if (pauseStartRef.current) {
        pausedDurationRef.current += Date.now() - pauseStartRef.current;
        pauseStartRef.current = 0;
      }
      setStatus("recording");
    }
  }, []);

  const stop = useCallback(() => {
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
  }, []);

  const captureFrame = useCallback((videoElement) => {
    const video = videoElement || videoElRef.current;
    if (!video || !video.videoWidth) return null;
    const canvas = document.createElement("canvas");
    canvas.width = Math.min(video.videoWidth, 1280);
    canvas.height = Math.round(canvas.width * (video.videoHeight / video.videoWidth));
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.75);
  }, []);

  const reset = useCallback(() => {
    cleanup();
    setBlob(null);
    setError(null);
    setElapsed(0);
    setDataSize(0);
    setStatus("idle");
  }, [cleanup]);

  return {
    status,
    blob,
    elapsed,
    error,
    dataSize,
    stream: streamRef.current,
    startCamera,
    startScreen,
    record,
    pause,
    resume,
    stop,
    captureFrame,
    reset,
    setVideoEl: (el) => { videoElRef.current = el; }
  };
}
