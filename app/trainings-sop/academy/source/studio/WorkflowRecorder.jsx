import { useState, useRef, useEffect, useCallback } from "react";
import { useMediaRecorder } from "./useMediaRecorder.js";
import { StepEditor } from "./StepEditor.jsx";

function formatTime(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function Countdown({ onComplete }) {
  const [count, setCount] = useState(3);
  useEffect(() => {
    if (count <= 0) { onComplete(); return; }
    const t = setTimeout(() => setCount(count - 1), 1000);
    return () => clearTimeout(t);
  }, [count, onComplete]);
  return (
    <div className="wf-countdown-overlay">
      <div className="wf-countdown-circle">
        <span className="wf-countdown-num">{count || "Go!"}</span>
      </div>
      <p className="wf-countdown-hint">Recording will begin shortly...</p>
    </div>
  );
}

export function WorkflowRecorder({ token, apiBase, onCreated, onCancel }) {
  const [phase, setPhase] = useState("setup");
  const [form, setForm] = useState({ title: "", category: "Operations", description: "" });
  const [steps, setSteps] = useState([]);
  const [stepInput, setStepInput] = useState("");
  const [showCountdown, setShowCountdown] = useState(false);
  const [audioSettings, setAudioSettings] = useState({ microphone: true, systemAudio: false });
  const previewRef = useRef(null);
  const recorder = useMediaRecorder();

  useEffect(() => {
    if (recorder.stream && previewRef.current && (recorder.status === "previewing" || recorder.status === "recording" || recorder.status === "paused")) {
      previewRef.current.srcObject = recorder.stream;
    }
  }, [recorder.stream, recorder.status]);

  useEffect(() => {
    if (previewRef.current) {
      recorder.setVideoEl(previewRef.current);
    }
  }, [previewRef.current]);

  useEffect(() => {
    if (recorder.status === "recorded" && (phase === "recording" || phase === "ready")) {
      setPhase("edit");
    }
  }, [recorder.status, phase]);

  useEffect(() => {
    if (phase !== "recording" && phase !== "paused") return;
    const handler = (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
      if (e.key === "Enter" || (e.ctrlKey && e.key === "m")) {
        e.preventDefault();
        handleMarkStep();
      } else if (e.ctrlKey && e.key === "p") {
        e.preventDefault();
        if (recorder.status === "recording") recorder.pause();
        else if (recorder.status === "paused") recorder.resume();
      } else if (e.ctrlKey && e.key === "s") {
        e.preventDefault();
        handleStop();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [phase, recorder.status, recorder.elapsed, steps.length]);

  const handleStartRecording = useCallback(async () => {
    const stream = await recorder.startScreen({
      microphone: audioSettings.microphone,
      systemAudio: audioSettings.systemAudio
    });
    if (stream) {
      setPhase("ready");
    }
  }, [recorder, audioSettings]);

  const handleBeginRecording = useCallback(() => {
    setShowCountdown(true);
  }, []);

  const handleCountdownComplete = useCallback(() => {
    setShowCountdown(false);
    recorder.record(2500000);
    setSteps([]);
    setPhase("recording");
  }, [recorder]);

  const handleMarkStep = useCallback(() => {
    const title = stepInput.trim() || `Step ${steps.length + 1}`;
    const thumbnail = recorder.captureFrame(previewRef.current);
    setSteps((prev) => [...prev, {
      timestamp: recorder.elapsed,
      title,
      description: "",
      thumbnail: thumbnail || null,
      annotations: []
    }]);
    setStepInput("");
  }, [stepInput, steps.length, recorder]);

  const handleStop = useCallback(() => {
    recorder.stop();
    setPhase("edit");
  }, [recorder]);

  const handleCancel = () => {
    recorder.reset();
    onCancel?.();
  };

  if (phase === "setup") {
    return (
      <div className="studio-card">
        <div className="studio-header">
          <h2 className="studio-title">Workflow Recorder</h2>
          <button className="btn-sm" onClick={handleCancel}>Cancel</button>
        </div>
        <p className="studio-subtitle">Record a workflow in Entrata and turn it into a SCORM-ready training course.</p>

        {recorder.error && (
          <div className="wf-error-banner">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            <span>{recorder.error}</span>
            <button className="wf-error-dismiss" onClick={() => recorder.reset()}>Dismiss</button>
          </div>
        )}

        <form onSubmit={(e) => { e.preventDefault(); handleStartRecording(); }} className="form-stack">
          <div className="form-group">
            <label>Course Title</label>
            <input required placeholder="e.g. How to Process a Move-Out" value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div className="form-group">
            <label>Description</label>
            <textarea rows={2} placeholder="Describe the workflow this training covers..."
              value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="form-row">
            <div className="form-group" style={{ maxWidth: 200 }}>
              <label>Category</label>
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                <option>Operations</option><option>Leasing</option><option>Maintenance</option>
                <option>Accounting</option><option>Resident Experience</option><option>Compliance</option>
              </select>
            </div>
            <div className="form-group">
              <label>Audio</label>
              <div className="wf-audio-options">
                <label className="wf-checkbox-label">
                  <input type="checkbox" checked={audioSettings.microphone}
                    onChange={(e) => setAudioSettings({ ...audioSettings, microphone: e.target.checked })} />
                  <span>Microphone (narration)</span>
                </label>
                <label className="wf-checkbox-label">
                  <input type="checkbox" checked={audioSettings.systemAudio}
                    onChange={(e) => setAudioSettings({ ...audioSettings, systemAudio: e.target.checked })} />
                  <span>System audio</span>
                </label>
              </div>
            </div>
          </div>

          <div className="studio-hint-box">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
            <div>
              <span>You will select a screen, window, or browser tab to record. During recording:</span>
              <ul className="wf-hint-list">
                <li><strong>Mark Step</strong> or <kbd>Enter</kbd> to flag key moments with auto-screenshots</li>
                <li><kbd>Ctrl+P</kbd> to pause/resume recording</li>
                <li><kbd>Ctrl+S</kbd> to stop recording</li>
              </ul>
              <span>After recording, edit steps, add click annotations, and export as a SCORM package.</span>
            </div>
          </div>

          <button type="submit" className="btn-primary wf-start-btn" disabled={!form.title.trim()}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
            Choose Screen & Start
          </button>
          {!form.title.trim() && (
            <p className="wf-disabled-hint">Enter a course title above to begin recording.</p>
          )}
        </form>
      </div>
    );
  }

  if (phase === "ready") {
    return (
      <div className="studio-card">
        <div className="studio-header">
          <h2 className="studio-title">Screen Selected</h2>
          <button className="btn-sm" onClick={handleCancel}>Cancel</button>
        </div>

        {showCountdown && <Countdown onComplete={handleCountdownComplete} />}

        <div className="studio-preview-wrap">
          <video ref={previewRef} autoPlay muted playsInline className="studio-preview-video" />
        </div>
        <div className="studio-hint-box">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          <span>Preview looks good? Click below to begin recording after a 3-second countdown.</span>
        </div>
        <div className="studio-controls">
          <button className="studio-record-btn" onClick={handleBeginRecording} disabled={showCountdown}>
            <span className="studio-rec-dot-lg" /> Begin Recording
          </button>
        </div>
      </div>
    );
  }

  if (phase === "recording" || (recorder.status === "paused" && phase !== "edit")) {
    const isPaused = recorder.status === "paused";
    return (
      <div className={`studio-card wf-recording ${isPaused ? "wf-paused" : ""}`}>
        <div className="studio-header">
          <div className="studio-rec-overlay" style={{ position: "static", padding: 0, background: "none" }}>
            {isPaused ? (
              <span className="wf-paused-indicator">PAUSED</span>
            ) : (
              <>
                <span className="studio-rec-dot" />
                <span className="studio-rec-time">{formatTime(recorder.elapsed)}</span>
              </>
            )}
          </div>
          <h2 className="studio-title" style={{ flex: 1, textAlign: "center" }}>{form.title}</h2>
          <div className="wf-rec-controls">
            {isPaused ? (
              <button className="wf-resume-btn" onClick={() => recorder.resume()}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                Resume
              </button>
            ) : (
              <button className="wf-pause-btn" onClick={() => recorder.pause()}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
                Pause
              </button>
            )}
            <button className="studio-stop-btn" onClick={handleStop}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="4" width="16" height="16" rx="2"/></svg>
              Stop
            </button>
          </div>
        </div>

        <div className="studio-preview-wrap wf-recording-preview">
          <video ref={previewRef} autoPlay muted playsInline className="studio-preview-video" />
          {isPaused && (
            <div className="wf-paused-overlay">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="white" opacity="0.8"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
            </div>
          )}
        </div>

        <div className="wf-rec-stats">
          <span className="wf-stat">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            {formatTime(recorder.elapsed)}
          </span>
          <span className="wf-stat">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            {formatSize(recorder.dataSize)}
          </span>
          <span className="wf-stat">{steps.length} step{steps.length !== 1 ? "s" : ""}</span>
        </div>

        <div className="wf-step-bar">
          <input
            className="wf-step-input"
            placeholder={`Step title (or press Enter/Mark for "Step ${steps.length + 1}")`}
            value={stepInput}
            onChange={(e) => setStepInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleMarkStep(); } }}
          />
          <button className="wf-mark-btn" onClick={handleMarkStep}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
            Mark Step
          </button>
        </div>

        {steps.length > 0 && (
          <div className="wf-step-chips">
            {steps.map((s, i) => (
              <span key={i} className="wf-step-chip">
                {s.thumbnail && <img src={s.thumbnail} alt="" className="wf-chip-thumb" />}
                <span className="wf-chip-time">{formatTime(s.timestamp)}</span> {s.title}
              </span>
            ))}
          </div>
        )}

        <div className="wf-shortcut-bar">
          <span><kbd>Enter</kbd> Mark Step</span>
          <span><kbd>Ctrl+P</kbd> Pause/Resume</span>
          <span><kbd>Ctrl+S</kbd> Stop</span>
        </div>
      </div>
    );
  }

  if (phase === "edit") {
    return (
      <StepEditor
        blob={recorder.blob}
        elapsed={recorder.elapsed}
        steps={steps}
        form={form}
        token={token}
        apiBase={apiBase}
        onCreated={onCreated}
        onReRecord={() => {
          recorder.reset();
          setSteps([]);
          setPhase("setup");
        }}
        onCancel={handleCancel}
      />
    );
  }

  return null;
}
