import { useState, useRef, useEffect, useCallback } from "react";

function formatTime(sec) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function AnnotationOverlay({ annotations }) {
  if (!annotations || annotations.length === 0) return null;
  return (
    <div className="wf-player-annotation-overlay">
      {annotations.map((a, i) => (
        <div
          key={i}
          className="wf-player-click-target"
          style={{ left: `${a.x * 100}%`, top: `${a.y * 100}%` }}
        >
          <div className="wf-player-click-ring" />
          <div className="wf-player-click-dot" />
          {a.label && <span className="wf-player-click-label">{a.label}</span>}
        </div>
      ))}
    </div>
  );
}

export function WorkflowPlayer({ course, apiBase, onClose, onComplete }) {
  const [activeStep, setActiveStep] = useState(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [viewedSteps, setViewedSteps] = useState(new Set());
  const [showShortcuts, setShowShortcuts] = useState(false);
  const videoRef = useRef(null);

  const steps = course.workflow_steps || [];
  const videoSrc = course.video_url ? `${apiBase}${course.video_url}` : null;
  const progress = steps.length > 0 ? Math.round((viewedSteps.size / steps.length) * 100) : 0;
  const allViewed = steps.length > 0 && viewedSteps.size >= steps.length;

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onTime = () => {
      setCurrentTime(video.currentTime);
      const t = video.currentTime;
      let active = null;
      for (let i = steps.length - 1; i >= 0; i--) {
        if (t >= steps[i].timestamp) { active = i; break; }
      }
      if (active !== null) {
        setViewedSteps(prev => {
          if (prev.has(active)) return prev;
          const next = new Set(prev);
          next.add(active);
          return next;
        });
      }
      setActiveStep(active);
    };
    const onMeta = () => setDuration(video.duration);
    video.addEventListener("timeupdate", onTime);
    video.addEventListener("loadedmetadata", onMeta);
    return () => { video.removeEventListener("timeupdate", onTime); video.removeEventListener("loadedmetadata", onMeta); };
  }, [steps]);

  const jumpTo = useCallback((timestamp) => {
    if (videoRef.current) { videoRef.current.currentTime = timestamp; videoRef.current.play(); }
  }, []);

  const jumpToStep = useCallback((idx) => {
    if (idx >= 0 && idx < steps.length) {
      jumpTo(steps[idx].timestamp);
    }
  }, [steps, jumpTo]);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        const next = (activeStep === null ? 0 : activeStep + 1);
        if (next < steps.length) jumpToStep(next);
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        const prev = (activeStep === null ? 0 : activeStep - 1);
        if (prev >= 0) jumpToStep(prev);
      } else if (e.key === " ") {
        e.preventDefault();
        const v = videoRef.current;
        if (v) v.paused ? v.play() : v.pause();
      } else if (e.key === "Escape") {
        onClose?.();
      } else if (e.key === "?") {
        setShowShortcuts(prev => !prev);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [activeStep, steps, jumpToStep, onClose]);

  const activeAnnotations = activeStep !== null && steps[activeStep] ? (steps[activeStep].annotations || []) : [];

  if (!videoSrc) {
    return (
      <div className="wf-player-overlay" onClick={onClose}>
        <div className="wf-player-modal" onClick={(e) => e.stopPropagation()}>
          <div className="wf-player-header">
            <h2>{course.title}</h2>
            <button className="btn-sm" onClick={onClose}>&times; Close</button>
          </div>
          <div className="wf-player-empty">No video available for this course.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="wf-player-overlay" onClick={onClose}>
      <div className="wf-player-modal" onClick={(e) => e.stopPropagation()}>
        <div className="wf-player-header">
          <div>
            <h2>{course.title}</h2>
            <span className="wf-player-meta">{course.category} &middot; {course.duration_minutes} min</span>
          </div>
          <div className="flex-row" style={{ gap: 8 }}>
            <button className="btn-sm wf-shortcut-toggle" onClick={() => setShowShortcuts(!showShortcuts)} title="Keyboard shortcuts">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M6 8h.001"/><path d="M10 8h.001"/><path d="M14 8h.001"/><path d="M18 8h.001"/><path d="M8 12h.001"/><path d="M12 12h.001"/><path d="M16 12h.001"/><path d="M7 16h10"/></svg>
            </button>
            {onComplete && (
              <button className="btn-primary btn-sm" onClick={onComplete} disabled={!allViewed}>
                {allViewed ? "Mark Complete" : `${progress}% viewed`}
              </button>
            )}
            <button className="btn-sm" onClick={onClose}>&times; Close</button>
          </div>
        </div>

        {showShortcuts && (
          <div className="wf-player-shortcuts-bar">
            <span><kbd>Space</kbd> Play/Pause</span>
            <span><kbd>&larr;</kbd> Prev Step</span>
            <span><kbd>&rarr;</kbd> Next Step</span>
            <span><kbd>Esc</kbd> Close</span>
            <span><kbd>?</kbd> Toggle Shortcuts</span>
          </div>
        )}

        <div className="wf-player-body">
          <div className="wf-player-video-col">
            <div className="wf-player-video-wrap">
              <video ref={videoRef} controls playsInline className="wf-player-video" src={videoSrc} />
              <AnnotationOverlay annotations={activeAnnotations} />
            </div>
            {steps.length > 0 && (
              <div className="wf-player-timeline">
                {steps.map((s, i) => {
                  const pct = duration > 0 ? (s.timestamp / duration) * 100 : 0;
                  return (
                    <button
                      key={i}
                      className={`step-timeline-marker ${activeStep === i ? "active" : ""} ${viewedSteps.has(i) ? "viewed" : ""}`}
                      style={{ left: `${pct}%` }}
                      onClick={() => jumpTo(s.timestamp)}
                      title={`${s.title} (${formatTime(s.timestamp)})`}
                    >
                      {i + 1}
                    </button>
                  );
                })}
                <div
                  className="wf-player-playhead"
                  style={{ left: duration > 0 ? `${(currentTime / duration) * 100}%` : 0 }}
                />
              </div>
            )}
          </div>

          {steps.length > 0 && (
            <div className="wf-player-steps">
              <div className="wf-player-steps-title">Steps ({viewedSteps.size}/{steps.length})</div>
              <div className="wf-player-steps-list">
                {steps.map((s, i) => (
                  <button
                    key={i}
                    className={`wf-player-step ${activeStep === i ? "active" : ""} ${viewedSteps.has(i) ? "viewed" : ""}`}
                    onClick={() => jumpTo(s.timestamp)}
                  >
                    <span className="wf-player-step-num">
                      {viewedSteps.has(i) ? (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                      ) : (i + 1)}
                    </span>
                    <div className="wf-player-step-body">
                      <div className="wf-player-step-title">{s.title}</div>
                      <div className="wf-player-step-time">{formatTime(s.timestamp)}</div>
                      {s.description && <div className="wf-player-step-desc">{s.description}</div>}
                      {s.annotations && s.annotations.length > 0 && (
                        <div className="wf-player-step-annot-count">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/></svg>
                          {s.annotations.length} click target{s.annotations.length !== 1 ? "s" : ""}
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
              <div className="wf-player-progress">
                <div className="wf-player-progress-bar">
                  <div className="wf-player-progress-fill" style={{ width: `${progress}%` }} />
                </div>
                <span className="wf-player-progress-text">{progress}% complete</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
