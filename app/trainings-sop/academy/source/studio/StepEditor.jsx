/* eslint-disable react/no-unescaped-entities */
import { useState, useRef, useEffect, useCallback } from "react";

function formatTime(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function AnnotationLayer({ annotations, onAdd, onRemove, onUpdateLabel, readOnly }) {
  const [pendingAnnot, setPendingAnnot] = useState(null);
  const [pendingLabel, setPendingLabel] = useState("");
  const labelRef = useRef(null);

  useEffect(() => {
    if (pendingAnnot && labelRef.current) labelRef.current.focus();
  }, [pendingAnnot]);

  const handleClick = (e) => {
    if (readOnly || pendingAnnot) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    setPendingAnnot({ x, y });
    setPendingLabel("");
  };

  const confirmAnnotation = () => {
    if (pendingAnnot) {
      onAdd?.({ ...pendingAnnot, label: pendingLabel.trim(), type: "click" });
      setPendingAnnot(null);
      setPendingLabel("");
    }
  };

  const cancelAnnotation = () => {
    setPendingAnnot(null);
    setPendingLabel("");
  };

  return (
    <div className="wf-annotation-layer" onClick={handleClick} style={{ cursor: readOnly ? "default" : pendingAnnot ? "default" : "crosshair" }}>
      {annotations.map((a, i) => (
        <div
          key={i}
          className={`wf-annotation-marker wf-annotation-${a.type}`}
          style={{ left: `${a.x * 100}%`, top: `${a.y * 100}%` }}
        >
          <div className="wf-annotation-ring" />
          <span className="wf-annotation-num">{i + 1}</span>
          {a.label && <span className="wf-annotation-label">{a.label}</span>}
          {!readOnly && (
            <button className="wf-annotation-remove" onClick={(e) => { e.stopPropagation(); onRemove?.(i); }} title="Remove">&times;</button>
          )}
        </div>
      ))}
      {pendingAnnot && (
        <div className="wf-annotation-marker wf-annotation-pending" style={{ left: `${pendingAnnot.x * 100}%`, top: `${pendingAnnot.y * 100}%` }} onClick={e => e.stopPropagation()}>
          <div className="wf-annotation-ring" style={{ borderColor: "var(--primary, #3b82f6)" }} />
          <div className="wf-annotation-popover">
            <input ref={labelRef} className="wf-annotation-popover-input" placeholder="What should the user click here?" value={pendingLabel} onChange={e => setPendingLabel(e.target.value)} onKeyDown={e => { if (e.key === "Enter") confirmAnnotation(); if (e.key === "Escape") cancelAnnotation(); }} />
            <div className="wf-annotation-popover-actions">
              <button className="btn-primary btn-sm" onClick={confirmAnnotation}>Add</button>
              <button className="btn-sm" onClick={cancelAnnotation}>Cancel</button>
            </div>
          </div>
        </div>
      )}
      {!readOnly && !pendingAnnot && annotations.length === 0 && (
        <div className="wf-annotation-hint">Click on the video to add click targets for this step</div>
      )}
    </div>
  );
}

export function StepEditor({ blob, elapsed, steps: initialSteps, form, token, apiBase, onCreated, onReRecord, onCancel }) {
  const [steps, setSteps] = useState(() =>
    (initialSteps || []).map(s => ({ ...s, annotations: s.annotations || [] }))
  );
  const [activeStep, setActiveStep] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [savedCourseId, setSavedCourseId] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState(null);
  const [thumbnails, setThumbnails] = useState(() => {
    const t = {};
    initialSteps?.forEach((s, i) => { if (s.thumbnail) t[i] = s.thumbnail; });
    return t;
  });
  const [annotationMode, setAnnotationMode] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const videoUrl = useRef(null);

  useEffect(() => {
    if (blob) {
      videoUrl.current = URL.createObjectURL(blob);
      if (videoRef.current) videoRef.current.src = videoUrl.current;
    }
    return () => { if (videoUrl.current) URL.revokeObjectURL(videoUrl.current); };
  }, [blob]);

  const captureThumbnail = useCallback((stepIdx, timestamp) => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    video.currentTime = timestamp;
    const handler = () => {
      canvas.width = 320;
      canvas.height = 180;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0, 320, 180);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
      setThumbnails((prev) => ({ ...prev, [stepIdx]: dataUrl }));
      video.removeEventListener("seeked", handler);
    };
    video.addEventListener("seeked", handler);
  }, []);

  useEffect(() => {
    if (!videoRef.current || !blob) return;
    const video = videoRef.current;
    const onLoaded = () => {
      steps.forEach((s, i) => {
        if (!thumbnails[i]) {
          setTimeout(() => captureThumbnail(i, s.timestamp), i * 200);
        }
      });
    };
    video.addEventListener("loadeddata", onLoaded);
    return () => video.removeEventListener("loadeddata", onLoaded);
  }, [blob, steps.length, captureThumbnail]);

  const jumpTo = (timestamp) => {
    if (videoRef.current) videoRef.current.currentTime = timestamp;
  };

  const updateStep = (idx, field, value) => {
    setSteps((prev) => prev.map((s, i) => i === idx ? { ...s, [field]: value } : s));
  };

  const removeStep = (idx) => {
    setSteps((prev) => prev.filter((_, i) => i !== idx));
    setThumbnails((prev) => {
      const next = {};
      Object.keys(prev).forEach((k) => {
        const ki = Number(k);
        if (ki < idx) next[ki] = prev[ki];
        else if (ki > idx) next[ki - 1] = prev[ki];
      });
      return next;
    });
    if (activeStep === idx) setActiveStep(null);
    else if (activeStep > idx) setActiveStep(activeStep - 1);
  };

  const addStep = () => {
    const time = videoRef.current ? Math.floor(videoRef.current.currentTime) : 0;
    const newSteps = [...steps, { timestamp: time, title: "", description: "", annotations: [] }];
    newSteps.sort((a, b) => a.timestamp - b.timestamp);
    const oldIndexMap = new Map(steps.map((s, i) => [s, i]));
    const remapped = {};
    newSteps.forEach((s, newIdx) => {
      const oldIdx = oldIndexMap.get(s);
      if (oldIdx !== undefined && thumbnails[oldIdx]) remapped[newIdx] = thumbnails[oldIdx];
    });
    setThumbnails(remapped);
    newSteps.forEach((s, i) => { if (!s.title) s.title = `Step ${i + 1}`; });
    setSteps(newSteps);
    const insertedIdx = newSteps.findIndex(s => s.timestamp === time && s.title === `Step ${newSteps.indexOf(s) + 1}`);
    if (insertedIdx >= 0) { setActiveStep(insertedIdx); captureThumbnail(insertedIdx, time); }
  };

  const autoGenerateSteps = () => {
    if (!elapsed || elapsed < 5) return;
    if (steps.length > 0 && !window.confirm("This will replace your existing steps. Continue?")) return;
    const count = Math.min(Math.max(3, Math.ceil(elapsed / 15)), 10);
    const interval = elapsed / count;
    const generated = Array.from({ length: count }, (_, i) => ({
      timestamp: Math.round(i * interval),
      title: `Step ${i + 1}`,
      description: "",
      annotations: []
    }));
    setSteps(generated);
    setThumbnails({});
    generated.forEach((s, i) => {
      setTimeout(() => captureThumbnail(i, s.timestamp), i * 300);
    });
  };

  const handleCancelWithConfirm = () => {
    if (savedCourseId || window.confirm("Discard this recording and all edits?")) {
      onCancel?.();
    }
  };

  const addAnnotation = (stepIdx, annotation) => {
    setSteps(prev => prev.map((s, i) => i === stepIdx ? { ...s, annotations: [...s.annotations, annotation] } : s));
  };

  const removeAnnotation = (stepIdx, annotIdx) => {
    setSteps(prev => prev.map((s, i) => i === stepIdx
      ? { ...s, annotations: s.annotations.filter((_, ai) => ai !== annotIdx) }
      : s
    ));
  };

  const updateAnnotationLabel = (stepIdx, annotIdx, label) => {
    setSteps(prev => prev.map((s, i) => i === stepIdx
      ? { ...s, annotations: s.annotations.map((a, ai) => ai === annotIdx ? { ...a, label } : a) }
      : s
    ));
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const ext = blob.type.includes("mp4") ? ".mp4" : ".webm";
      const file = new File([blob], `workflow${ext}`, { type: blob.type });
      const fd = new FormData();
      fd.append("video", file);
      const uploadResp = await fetch(`${apiBase}/api/admin/videos/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd
      });
      if (!uploadResp.ok) throw new Error("Video upload failed");
      const { url: videoUrlPath } = await uploadResp.json();

      const stepsPayload = steps.map(s => ({
        timestamp: s.timestamp,
        title: s.title,
        description: s.description,
        annotations: s.annotations || []
      }));

      const courseResp = await fetch(`${apiBase}/api/admin/workflow-courses`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title: form.title,
          description: form.description,
          category: form.category,
          videoUrl: videoUrlPath,
          workflowSteps: stepsPayload,
          durationMinutes: Math.max(1, Math.ceil(elapsed / 60))
        })
      });
      if (!courseResp.ok) throw new Error("Course creation failed");
      const course = await courseResp.json();
      setSavedCourseId(course.id);
      onCreated?.();
    } catch (err) {
      setSaveError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleExportScorm = async () => {
    if (!savedCourseId) return;
    setExporting(true);
    setExportError(null);
    try {
      const resp = await fetch(`${apiBase}/api/admin/workflow-courses/${savedCourseId}/export-scorm`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || "Export failed");
      }
      const blobData = await resp.blob();
      const url = URL.createObjectURL(blobData);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${form.title.replace(/[^a-zA-Z0-9]/g, "_")}_SCORM.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setExportError(err.message);
    } finally {
      setExporting(false);
    }
  };

  const activeStepData = activeStep !== null ? steps[activeStep] : null;

  return (
    <div className="studio-card step-editor">
      <div className="studio-header">
        <h2 className="studio-title">Edit Steps &mdash; {form.title}</h2>
        <div className="flex-row" style={{ gap: 8 }}>
          <button className="btn-sm" onClick={handleCancelWithConfirm}>Cancel</button>
          {!savedCourseId && onReRecord && (
            <button className="btn-sm wf-rerecord-btn" onClick={() => {
              if (window.confirm("Discard this recording and start over?")) onReRecord();
            }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg>
              Re-record
            </button>
          )}
          {savedCourseId ? (
            <button className="btn-primary wf-export-btn" onClick={handleExportScorm} disabled={exporting}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              {exporting ? "Exporting..." : "Export SCORM"}
            </button>
          ) : (
            <button className="btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? "Generating Course..." : "Generate Course"}
            </button>
          )}
        </div>
      </div>

      {saveError && (
        <div className="wf-error-banner" style={{ marginBottom: 12 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          <span>Save failed: {saveError}</span>
          <button className="wf-error-dismiss" onClick={() => setSaveError(null)}>Dismiss</button>
        </div>
      )}

      {exportError && (
        <div className="wf-error-banner" style={{ marginBottom: 12 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          <span>Export failed: {exportError}</span>
          <button className="wf-error-dismiss" onClick={() => setExportError(null)}>Dismiss</button>
        </div>
      )}

      {savedCourseId && (
        <div className="wf-success-banner">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          <span>Course saved! You can now export it as a SCORM package for use in any LMS.</span>
        </div>
      )}

      <div className="step-editor-layout">
        <div className="step-editor-video">
          <div className="wf-video-container">
            <video ref={videoRef} controls playsInline className="studio-preview-video" />
            <canvas ref={canvasRef} style={{ display: "none" }} />
            {annotationMode && activeStep !== null && (
              <AnnotationLayer
                annotations={activeStepData?.annotations || []}
                onAdd={(a) => addAnnotation(activeStep, a)}
                onRemove={(i) => removeAnnotation(activeStep, i)}
              />
            )}
          </div>

          <div className="step-editor-timeline">
            <div className="step-timeline-track">
              {steps.map((s, i) => {
                const pct = elapsed > 0 ? (s.timestamp / elapsed) * 100 : 0;
                return (
                  <button
                    key={i}
                    className={`step-timeline-marker ${activeStep === i ? "active" : ""}`}
                    style={{ left: `${pct}%` }}
                    onClick={() => { jumpTo(s.timestamp); setActiveStep(i); }}
                    title={`${s.title} (${formatTime(s.timestamp)})`}
                  >
                    {i + 1}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="wf-editor-toolbar">
            <button
              className={`wf-toolbar-btn ${annotationMode ? "active" : ""}`}
              onClick={() => {
                if (!annotationMode && activeStep === null && steps.length > 0) {
                  setActiveStep(0);
                  jumpTo(steps[0].timestamp);
                }
                setAnnotationMode(!annotationMode);
              }}
              title={activeStep === null && steps.length > 0 ? "Select a step first, then toggle annotation mode" : "Toggle click annotation mode"}
              disabled={steps.length === 0}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/><path d="M13 13l6 6"/></svg>
              {annotationMode ? "Annotation Mode On" : "Add Click Targets"}
            </button>
            <button className="wf-toolbar-btn" onClick={addStep} title="Add step at current playback time">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Add Step Here
            </button>
            <button className="wf-toolbar-btn wf-auto-btn" onClick={autoGenerateSteps} title="Auto-generate evenly spaced steps">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
              Auto-Generate Steps
            </button>
          </div>
          {annotationMode && activeStep === null && (
            <div className="wf-annotation-guide">Select a step from the list to place click targets on the video.</div>
          )}
        </div>

        <div className="step-editor-list">
          <div className="step-editor-list-header">
            <strong>Steps ({steps.length})</strong>
          </div>
          {steps.length === 0 ? (
            <div className="step-editor-empty">
              No steps marked. Click "Add Step Here" while scrubbing the video, or "Auto-Generate Steps" to create evenly spaced steps.
            </div>
          ) : (
            <div className="step-editor-items">
              {steps.map((s, i) => (
                <div
                  key={i}
                  className={`step-editor-item ${activeStep === i ? "active" : ""}`}
                  onClick={() => { jumpTo(s.timestamp); setActiveStep(i); }}
                >
                  <div className="step-item-header">
                    <span className="step-item-num">{i + 1}</span>
                    <span className="step-item-time">{formatTime(s.timestamp)}</span>
                    {s.annotations.length > 0 && (
                      <span className="step-item-annot-badge" title={`${s.annotations.length} click target(s)`}>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/></svg>
                        {s.annotations.length}
                      </span>
                    )}
                    <button className="step-item-recapture" onClick={(e) => { e.stopPropagation(); captureThumbnail(i, s.timestamp); }} title="Re-capture thumbnail">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg>
                    </button>
                    <button className="step-item-remove" onClick={(e) => { e.stopPropagation(); removeStep(i); }} title="Remove step">&times;</button>
                  </div>
                  {thumbnails[i] && (
                    <img src={thumbnails[i]} alt="" className="step-item-thumb" />
                  )}
                  <input
                    className="step-item-title-input"
                    value={s.title}
                    onChange={(e) => updateStep(i, "title", e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    placeholder="Step title"
                  />
                  <textarea
                    className="step-item-desc-input"
                    value={s.description}
                    onChange={(e) => updateStep(i, "description", e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    placeholder="Describe what the user should do in this step..."
                    rows={2}
                  />
                  {activeStep === i && s.annotations.length > 0 && (
                    <div className="step-item-annotations">
                      <div className="step-item-annot-title">Click Targets:</div>
                      {s.annotations.map((a, ai) => (
                        <div key={ai} className="step-item-annot-row">
                          <span className="step-item-annot-num">{ai + 1}</span>
                          <input
                            className="step-item-annot-label-input"
                            value={a.label}
                            onChange={(e) => updateAnnotationLabel(i, ai, e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            placeholder="Click target label..."
                          />
                          <button className="step-item-annot-remove" onClick={(e) => { e.stopPropagation(); removeAnnotation(i, ai); }}>&times;</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
