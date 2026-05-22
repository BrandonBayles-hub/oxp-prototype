import { useState, useRef, useEffect, useCallback } from "react";
import { useMediaRecorder } from "./useMediaRecorder.js";

function formatTime(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function SparkStudio({ token, onCreated, onCancel, apiBase }) {
  const [mode, setMode] = useState(null);
  const [phase, setPhase] = useState("pick");
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", category: "Leasing", durationSeconds: 120 });
  const [fileUpload, setFileUpload] = useState(null);
  const previewRef = useRef(null);
  const playbackRef = useRef(null);
  const recorder = useMediaRecorder();

  useEffect(() => {
    if (recorder.stream && previewRef.current && recorder.status === "previewing") {
      previewRef.current.srcObject = recorder.stream;
    }
  }, [recorder.stream, recorder.status]);

  useEffect(() => {
    if (recorder.blob && playbackRef.current) {
      playbackRef.current.src = URL.createObjectURL(recorder.blob);
    }
  }, [recorder.blob]);

  const pickMode = useCallback(async (m) => {
    setMode(m);
    if (m === "camera") {
      const stream = await recorder.startCamera();
      if (stream) setPhase("preview");
    } else if (m === "screen") {
      const stream = await recorder.startScreen();
      if (stream) setPhase("preview");
    } else {
      setPhase("upload");
    }
  }, [recorder]);

  const handleRecord = () => { recorder.record(); setPhase("recording"); };
  const handleStop = () => { recorder.stop(); setPhase("review"); };

  const handleReRecord = async () => {
    recorder.reset();
    if (mode === "camera") {
      const stream = await recorder.startCamera();
      if (stream) setPhase("preview");
    } else {
      const stream = await recorder.startScreen();
      if (stream) setPhase("preview");
    }
  };

  const handleAccept = () => setPhase("details");

  const handleSave = async (ev) => {
    ev.preventDefault();
    setUploading(true);
    try {
      let videoUrl = null;
      if (mode === "file" && fileUpload) {
        const fd = new FormData();
        fd.append("video", fileUpload);
        const r = await fetch(`${apiBase}/api/admin/videos/upload`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: fd
        });
        if (!r.ok) throw new Error("Upload failed");
        const data = await r.json();
        videoUrl = data.url;
      } else if (recorder.blob) {
        const ext = recorder.blob.type.includes("mp4") ? ".mp4" : ".webm";
        const file = new File([recorder.blob], `spotlight${ext}`, { type: recorder.blob.type });
        const fd = new FormData();
        fd.append("video", file);
        const r = await fetch(`${apiBase}/api/admin/videos/upload`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: fd
        });
        if (!r.ok) throw new Error("Upload failed");
        const data = await r.json();
        videoUrl = data.url;
      }

      const sparkData = {
        title: form.title,
        description: form.description,
        category: form.category,
        source: mode === "file" ? "uploaded" : "recorded",
        contentType: "video",
        durationSeconds: recorder.elapsed || form.durationSeconds,
        videoUrl
      };
      const resp = await fetch(`${apiBase}/api/admin/sparks`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(sparkData)
      });
      if (!resp.ok) throw new Error("Failed to create spotlight");
      onCreated?.();
    } catch (err) {
      alert(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleCancel = () => { recorder.reset(); onCancel?.(); };

  if (phase === "pick") {
    return (
      <div className="studio-card">
        <div className="studio-header">
          <h2 className="studio-title">Spotlight Studio</h2>
          <button className="btn-sm" onClick={handleCancel}>Cancel</button>
        </div>
        <p className="studio-subtitle">Choose how to create your Spotlight</p>
        <div className="studio-modes">
          <button className="studio-mode-btn" onClick={() => pickMode("camera")}>
            <div className="studio-mode-icon camera">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>
            </div>
            <strong>Camera</strong>
            <span>Record with webcam + mic</span>
          </button>
          <button className="studio-mode-btn" onClick={() => pickMode("screen")}>
            <div className="studio-mode-icon screen">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
            </div>
            <strong>Screen</strong>
            <span>Capture screen + narration</span>
          </button>
          <button className="studio-mode-btn" onClick={() => pickMode("file")}>
            <div className="studio-mode-icon upload">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            </div>
            <strong>Upload</strong>
            <span>Upload existing video</span>
          </button>
        </div>
      </div>
    );
  }

  if (phase === "upload") {
    return (
      <div className="studio-card">
        <div className="studio-header">
          <h2 className="studio-title">Upload Video</h2>
          <button className="btn-sm" onClick={handleCancel}>Cancel</button>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); if (fileUpload) setPhase("details"); }} className="form-stack">
          <div
            className="studio-drop-zone"
            onClick={() => document.getElementById("studio-file-input")?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); if (e.dataTransfer.files?.[0]) setFileUpload(e.dataTransfer.files[0]); }}
          >
            {fileUpload ? (
              <div className="studio-file-selected">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
                <strong>{fileUpload.name}</strong>
                <span>{(fileUpload.size / 1024 / 1024).toFixed(1)} MB</span>
              </div>
            ) : (
              <>
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                <div>Drop a video file here or click to browse</div>
                <div className="studio-hint">MP4, WebM, or MOV. Max 100 MB.</div>
              </>
            )}
          </div>
          <input id="studio-file-input" type="file" accept="video/*" style={{ display: "none" }}
            onChange={(e) => { if (e.target.files?.[0]) setFileUpload(e.target.files[0]); }}
          />
          <button type="submit" className="btn-primary" disabled={!fileUpload}>Continue</button>
        </form>
      </div>
    );
  }

  if (phase === "preview" || phase === "recording") {
    return (
      <div className="studio-card">
        <div className="studio-header">
          <h2 className="studio-title">{mode === "camera" ? "Camera Preview" : "Screen Preview"}</h2>
          <button className="btn-sm" onClick={handleCancel}>Cancel</button>
        </div>
        <div className={`studio-preview-wrap ${mode === "camera" ? "vertical" : ""}`}>
          <video ref={previewRef} autoPlay muted playsInline className="studio-preview-video" />
          {phase === "recording" && (
            <div className="studio-rec-overlay">
              <span className="studio-rec-dot" />
              <span className="studio-rec-time">{formatTime(recorder.elapsed)}</span>
            </div>
          )}
        </div>
        <div className="studio-controls">
          {phase === "preview" && (
            <button className="studio-record-btn" onClick={handleRecord}>
              <span className="studio-rec-dot-lg" /> Start Recording
            </button>
          )}
          {phase === "recording" && (
            <button className="studio-stop-btn" onClick={handleStop}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="4" width="16" height="16" rx="2"/></svg>
              Stop ({formatTime(recorder.elapsed)})
            </button>
          )}
        </div>
      </div>
    );
  }

  if (phase === "review") {
    return (
      <div className="studio-card">
        <div className="studio-header">
          <h2 className="studio-title">Review Recording</h2>
          <button className="btn-sm" onClick={handleCancel}>Cancel</button>
        </div>
        <div className={`studio-preview-wrap ${mode === "camera" ? "vertical" : ""}`}>
          <video ref={playbackRef} controls playsInline className="studio-preview-video" />
        </div>
        <div className="studio-review-info">
          <span>Duration: {formatTime(recorder.elapsed)}</span>
          <span>Size: {recorder.blob ? (recorder.blob.size / 1024 / 1024).toFixed(1) + " MB" : "--"}</span>
        </div>
        <div className="studio-controls">
          <button className="btn-sm" onClick={handleReRecord}>Re-record</button>
          <button className="btn-primary" onClick={handleAccept}>Use This Recording</button>
        </div>
      </div>
    );
  }

  if (phase === "details") {
    return (
      <div className="studio-card">
        <div className="studio-header">
          <h2 className="studio-title">Spotlight Details</h2>
          <button className="btn-sm" onClick={handleCancel}>Cancel</button>
        </div>
        <form onSubmit={handleSave} className="form-stack">
          <div className="form-group">
            <label>Title</label>
            <input required placeholder="e.g. 5-Minute Lead Response" value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div className="form-group">
            <label>Description</label>
            <textarea rows={2} placeholder="What this spotlight teaches..."
              value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="flex-row gap-2">
            <div className="form-group" style={{ flex: 1 }}>
              <label>Category</label>
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                <option>Leasing</option><option>Maintenance</option><option>Resident Experience</option><option>Operations</option><option>Compliance</option>
              </select>
            </div>
          </div>
          {(mode === "camera" || mode === "screen") && recorder.blob && (
            <div className="studio-review-info" style={{ marginTop: 0 }}>
              <span>Duration: {formatTime(recorder.elapsed)}</span>
              <span>Size: {(recorder.blob.size / 1024 / 1024).toFixed(1)} MB</span>
            </div>
          )}
          <button type="submit" className="btn-primary" disabled={uploading}>
            {uploading ? "Saving..." : "Create Spotlight"}
          </button>
        </form>
      </div>
    );
  }

  return null;
}
