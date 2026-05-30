/* eslint-disable react/no-unescaped-entities */
import { useState, useEffect, useCallback, useRef } from "react";
import { ArrowLeft, FileText, Building2, Pencil, Save, X, AlertTriangle, Check, Trash2, RefreshCw, Eye, Columns, Share2, Link2, ExternalLink, Star, Sparkles, History, Clock } from "lucide-react";
import { fetchKbArticle, forkKbArticle, updateKbInstance, deleteKbInstance, syncKbInstance, createKbPreviewToken, fetchKbRevisions } from "./api";
import { RichTextEditor } from "./RichTextEditor";

function stripHtml(html) {
  return html.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

// Sanitize Zendesk article HTML for safe inline rendering.
// Zendesk exports occasionally contain iframes, scripts, meta refresh tags,
// and absolute links without target=_blank. When the viewer renders that
// HTML verbatim, clicking a link (or even an embedded iframe redirect) can
// navigate the current tab to entratasupport.zendesk.com or
// learning.entrataeducation.com -- polluting browser history and breaking
// the back button. We strip risky embeds and force every anchor to open in
// a new tab.
export function sanitizeArticleHtml(html) {
  if (!html) return "";
  let out = String(html);
  out = out.replace(/<script[\s\S]*?<\/script>/gi, "");
  out = out.replace(/<iframe[\s\S]*?<\/iframe>/gi, "");
  out = out.replace(/<iframe\b[^>]*\/?\s*>/gi, "");
  out = out.replace(/<object[\s\S]*?<\/object>/gi, "");
  out = out.replace(/<embed\b[^>]*>/gi, "");
  out = out.replace(/<meta\b[^>]*>/gi, "");
  out = out.replace(/<form\b[^>]*>/gi, "<div>");
  out = out.replace(/<\/form>/gi, "</div>");
  out = out.replace(/<base\b[^>]*>/gi, "");
  out = out.replace(/\s(on[a-z]+)\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "");
  out = out.replace(/<a\b([^>]*)>/gi, (match, attrs) => {
    let next = attrs;
    // Skip in-app links: the click interceptor handles these and we don't
    // want target=_blank to force them into a new tab.
    if (/\bdata-kb-slug\s*=/i.test(next)) {
      return `<a${next}>`;
    }
    const hrefMatch = /href\s*=\s*(?:"([^"]*)"|'([^']*)')/i.exec(next);
    const href = hrefMatch ? (hrefMatch[1] || hrefMatch[2] || "") : "";
    if (!href || href.startsWith("#") || href.startsWith("javascript:")) {
      next = next.replace(/href\s*=\s*(?:"[^"]*"|'[^']*')/i, 'data-disabled-href="true"');
      if (!/data-disabled-href/.test(next)) next += ' data-disabled-href="true"';
    }
    if (!/target\s*=/i.test(next)) next += ' target="_blank"';
    if (!/rel\s*=/i.test(next)) next += ' rel="noopener noreferrer"';
    else next = next.replace(/rel\s*=\s*(?:"([^"]*)"|'([^']*)')/i, (m, a, b) => {
      const existing = (a || b || "");
      const needs = ["noopener", "noreferrer"].filter(x => !existing.includes(x));
      return `rel="${[existing, ...needs].filter(Boolean).join(" ")}"`;
    });
    return `<a${next}>`;
  });
  return out;
}

function computeInlineDiff(oldHtml, newHtml) {
  const oldText = stripHtml(oldHtml);
  const newText = stripHtml(newHtml);
  const oldWords = oldText.split(/\s+/);
  const newWords = newText.split(/\s+/);

  const oldSet = new Set(oldWords);
  const newSet = new Set(newWords);

  let result = newHtml;
  for (const word of newWords) {
    if (word.length > 3 && !oldSet.has(word)) {
      const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      result = result.replace(
        new RegExp(`(?<=>)([^<]*?)(${escaped})([^<]*?)(?=<)`, "g"),
        (m, pre, match, post) => `${pre}<mark class="diff-added">${match}</mark>${post}`
      );
    }
  }
  for (const word of oldWords) {
    if (word.length > 3 && !newSet.has(word)) {
      const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      result = result.replace(
        new RegExp(`(?<=>)([^<]*?)(${escaped})([^<]*?)(?=<)`, "g"),
        (m, pre, match, post) => `${pre}<mark class="diff-removed">${match}</mark>${post}`
      );
    }
  }
  return result;
}

export function ArticleViewer({ slug, token, isAdmin, onBack, isFavorite, onToggleFavorite, onOpenArticle }) {
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState("original"); // "original" | "company" | "compare"
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [forking, setForking] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [poppedOut, setPoppedOut] = useState(false);
  // Change-summary publish flow + version history
  const [publishOpen, setPublishOpen] = useState(false);
  const [changeSummary, setChangeSummary] = useState("");
  const [ttlDays, setTtlDays] = useState(3);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [revisions, setRevisions] = useState(null);
  const [revisionsLoading, setRevisionsLoading] = useState(false);
  const articleContentRef = useRef(null);

  // After render, walk the rendered article DOM and force every link to
  // open in a new tab + strip any embed/script/event-handler attribute that
  // slipped past the regex sanitizer. This is belt-and-suspenders protection
  // against Zendesk HTML causing back-button redirects to Help Center URLs.
  useEffect(() => {
    const root = articleContentRef.current;
    if (!root) return;
    root.querySelectorAll("iframe, object, embed, form, base, script, meta").forEach(el => el.remove());
    root.querySelectorAll("a").forEach(a => {
      if (a.hasAttribute("data-kb-slug")) {
        a.classList.add("kb-internal-link");
        a.style.cursor = "pointer";
        a.removeAttribute("target");
        return;
      }
      const href = a.getAttribute("href") || "";
      if (!href || href.startsWith("#") || href.toLowerCase().startsWith("javascript:")) {
        a.removeAttribute("href");
        a.style.cursor = "default";
        return;
      }
      a.setAttribute("target", "_blank");
      const existingRel = a.getAttribute("rel") || "";
      const rel = new Set(existingRel.split(/\s+/).filter(Boolean));
      rel.add("noopener"); rel.add("noreferrer");
      a.setAttribute("rel", Array.from(rel).join(" "));
    });
    root.querySelectorAll("*").forEach(el => {
      for (const attr of Array.from(el.attributes)) {
        if (/^on/i.test(attr.name)) el.removeAttribute(attr.name);
      }
    });
  });

  const handlePopOut = () => {
    if (!article) return;
    const content = sanitizeArticleHtml(viewMode === "company" && article.instance_id ? article.instance_content : article.content_html);
    const win = window.open("", "_blank", "width=720,height=800,scrollbars=yes,resizable=yes");
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${article.title} -- Entrata Academy</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;color:#1a1a2e;background:#fff;padding:0}
.header{background:linear-gradient(135deg,#0f172a,#1e293b);color:#fff;padding:20px 32px;position:sticky;top:0;z-index:10}
.header h1{font-size:18px;font-weight:700;margin-bottom:4px}
.header .meta{font-size:12px;color:rgba(255,255,255,.55);display:flex;gap:12px;align-items:center}
.header .meta span{display:flex;align-items:center;gap:4px}
.content{padding:32px;max-width:720px;line-height:1.7;font-size:15px}
.content h1,.content h2,.content h3{margin:24px 0 12px;color:#0f172a}
.content h2{font-size:18px;border-bottom:1px solid #e2e8f0;padding-bottom:8px}
.content h3{font-size:15px}
.content p{margin-bottom:16px}
.content ul,.content ol{margin:0 0 16px 20px}
.content li{margin-bottom:6px}
.content table{width:100%;border-collapse:collapse;margin-bottom:16px}
.content th,.content td{border:1px solid #e2e8f0;padding:8px 12px;text-align:left;font-size:14px}
.content th{background:#f8fafc;font-weight:600}
.content code{background:#f1f5f9;padding:2px 6px;border-radius:3px;font-size:13px}
.content blockquote{border-left:3px solid #3b82f6;padding:12px 16px;background:#eff6ff;margin:0 0 16px;border-radius:0 6px 6px 0}
.footer{padding:16px 32px;border-top:1px solid #e2e8f0;text-align:center;font-size:11px;color:#94a3b8}
</style></head><body>
<div class="header">
<h1>${article.title}</h1>
<div class="meta"><span>${article.category}</span>${article.path ? `<span>${article.path}</span>` : ""}${article.read_time_minutes ? `<span>${article.read_time_minutes} min read</span>` : ""}</div>
</div>
<div class="content">${content}</div>
<div class="footer">Entrata Academy -- Knowledge Base</div>
</body></html>`);
    win.document.close();
    setPoppedOut(true);
    const timer = setInterval(() => { if (win.closed) { setPoppedOut(false); clearInterval(timer); } }, 1000);
  };

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchKbArticle(token, slug);
      setArticle(data);
      if (data.instance_id && data.instance_status === "published") {
        setViewMode("company");
      } else {
        setViewMode("original");
      }
      return data;
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [slug, token]);

  useEffect(() => { load(); }, [load]);

  const handleFork = async () => {
    try {
      setForking(true);
      await forkKbArticle(token, slug);
      const data = await load();
      setViewMode("company");
      setEditContent(data?.instance_content || data?.content_html || "");
      setEditing(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setForking(false);
    }
  };

  const handleSave = async (status, summaryOverride, ttlOverride) => {
    try {
      setSaving(true);
      const payload = { content_html: editContent, status };
      if (status === "published" && typeof summaryOverride === "string" && summaryOverride.trim()) {
        payload.change_summary = summaryOverride.trim();
        payload.change_summary_ttl_days = Number(ttlOverride) || 3;
      }
      await updateKbInstance(token, slug, payload);
      await load();
      setEditing(false);
      setPublishOpen(false);
      setChangeSummary("");
      setBannerDismissed(false);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const openPublishDialog = () => {
    setChangeSummary("");
    setTtlDays(3);
    setPublishOpen(true);
  };

  const openHistory = async () => {
    setHistoryOpen(true);
    if (revisions) return;
    try {
      setRevisionsLoading(true);
      const rows = await fetchKbRevisions(token, slug);
      setRevisions(rows);
    } catch (e) {
      setRevisions([]);
    } finally {
      setRevisionsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Revert to Entrata original? This will delete your company's customized version.")) return;
    try {
      await deleteKbInstance(token, slug);
      await load();
      setViewMode("original");
    } catch (e) {
      setError(e.message);
    }
  };

  const handleSync = async () => {
    try {
      await syncKbInstance(token, slug);
      await load();
    } catch (e) {
      setError(e.message);
    }
  };

  if (loading) {
    return (
      <div className="article-viewer">
        <button className="article-back" onClick={onBack}><ArrowLeft size={14} /> Back to articles</button>
        <div className="card" style={{ padding: 48, textAlign: "center" }}>
          <div className="skeleton h-8 w-64 mb-4" style={{ margin: "0 auto" }} />
          <div className="skeleton h-4 w-full mb-2" />
          <div className="skeleton h-4 w-full mb-2" />
          <div className="skeleton h-4 w-3/4" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="article-viewer">
        <button className="article-back" onClick={onBack}><ArrowLeft size={14} /> Back to articles</button>
        <div className="card" style={{ padding: 48, textAlign: "center" }}>
          <AlertTriangle size={32} style={{ color: "var(--red-500)", marginBottom: 8 }} />
          <p>{error}</p>
          <button className="btn btn-secondary" onClick={load}><RefreshCw size={13} /> Retry</button>
        </div>
      </div>
    );
  }

  if (!article) return null;

  const hasInstance = !!article.instance_id;
  const isStale = hasInstance && article.base_version < article.version;
  const isDraft = hasInstance && article.instance_status === "draft";
  const rawCurrentContent = viewMode === "company" && hasInstance ? article.instance_content : article.content_html;
  const currentContent = sanitizeArticleHtml(rawCurrentContent);
  const sanitizedOriginal = sanitizeArticleHtml(article.content_html);
  const sanitizedInstance = sanitizeArticleHtml(article.instance_content);

  return (
    <div className="article-viewer">
      <button className="article-back" onClick={onBack}><ArrowLeft size={14} /> Back to articles</button>

      <div className="article-header">
        <div style={{ flex: 1 }}>
          <div className="article-meta-row">
            <span className="knowledge-type-badge knowledge-type-badge--article">Article</span>
            <span className="knowledge-category">{article.category}</span>
            {article.path ? <span className="knowledge-category">{article.path}</span> : null}
          </div>
          <h2 className="article-title">{article.title}</h2>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
          {onToggleFavorite ? (
            <button
              className={`kb-fav-btn ${isFavorite ? "kb-fav-btn--active" : ""}`}
              onClick={() => onToggleFavorite(slug)}
              title={isFavorite ? "Remove from favorites" : "Add to favorites"}
              style={{ padding: 6 }}
            >
              <Star size={16} />
            </button>
          ) : null}
          <button
            className="btn btn-sm btn-secondary"
            onClick={handlePopOut}
            title="Open in separate window"
            style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12 }}
          >
            <ExternalLink size={13} /> {poppedOut ? "Open Again" : "Pop Out"}
          </button>
        </div>
      </div>

      {/* Toggle: Entrata Original <-> Company Version (admin only) */}
      {isAdmin ? (
        <div className="article-toggle-bar">
          <div className="article-toggle">
            <button
              className={`article-toggle-btn ${viewMode === "original" ? "active" : ""}`}
              onClick={() => { setViewMode("original"); setEditing(false); }}
            >
              <FileText size={13} />
              Entrata Original
              {isStale ? <span className="article-stale-dot" title="Entrata has updates" /> : null}
            </button>
            <button
              className={`article-toggle-btn ${viewMode === "company" ? "active" : ""}`}
              onClick={() => setViewMode("company")}
              disabled={!hasInstance}
            >
              <Building2 size={13} />
              Your Company
              {hasInstance && isDraft ? <span className="article-draft-badge">Draft</span> : null}
              {hasInstance && !isDraft ? <Check size={11} style={{ color: "var(--green-600)" }} /> : null}
            </button>
            {isStale ? (
              <button
                className={`article-toggle-btn ${viewMode === "compare" ? "active" : ""}`}
                onClick={() => { setViewMode("compare"); setEditing(false); }}
              >
                <Columns size={13} />
                Compare
              </button>
            ) : null}
          </div>

          {viewMode === "company" && hasInstance && !editing ? (
            <div className="article-actions">
              <button className="btn btn-sm btn-secondary" onClick={() => { setEditContent(article.instance_content); setEditing(true); }}>
                <Pencil size={12} /> Edit
              </button>
              <button className="btn btn-sm btn-secondary" onClick={openHistory}>
                <History size={12} /> History
              </button>
              <button className="btn btn-sm btn-secondary" onClick={async () => {
                try {
                  const result = await createKbPreviewToken(token, slug, 7);
                  const url = `${window.location.origin}/kb/preview/${result.token}`;
                  setPreviewUrl(url);
                  await navigator.clipboard?.writeText(url);
                } catch (e) {
                  setPreviewUrl("Error creating preview link");
                }
              }}>
                <Share2 size={12} /> Share Preview
              </button>
              <button className="btn btn-sm btn-ghost btn-danger" onClick={handleDelete}>
                <Trash2 size={12} /> Revert
              </button>
            </div>
          ) : null}
          {previewUrl ? (
            <div className="article-preview-link-banner">
              <Link2 size={12} />
              <span>Preview link copied: <code>{previewUrl}</code></span>
              <button onClick={() => setPreviewUrl(null)}><X size={12} /></button>
            </div>
          ) : null}

          {viewMode === "original" && !hasInstance ? (
            <button className="btn btn-sm btn-primary" onClick={handleFork} disabled={forking}>
              <Building2 size={12} /> {forking ? "Creating..." : "Customize for your company"}
            </button>
          ) : null}
        </div>
      ) : null}

      {/* Stale warning (admin only) */}
      {isAdmin && isStale && viewMode === "company" ? (
        <div className="article-stale-banner">
          <AlertTriangle size={14} />
          <span>Entrata has updated the original article since your last customization. <button className="article-inline-link" onClick={() => setViewMode("original")}>Review changes</button></span>
          <button className="btn btn-sm btn-secondary" onClick={handleSync}>
            <Check size={12} /> Mark as reviewed
          </button>
        </div>
      ) : null}

      {/* Compare side-by-side with diff highlighting */}
      {viewMode === "compare" && isStale && hasInstance ? (
        <div className="article-compare">
          <div className="article-compare-toolbar">
            <span className="text-sm" style={{ fontWeight: 600 }}>Comparing versions</span>
            <div className="flex-row">
              <button className="btn btn-sm btn-secondary" onClick={() => { handleSync(); setViewMode("company"); }}>
                <Check size={12} /> Keep My Version
              </button>
              <button className="btn btn-sm btn-ghost btn-danger" onClick={handleDelete}>
                <Trash2 size={12} /> Reset to Original
              </button>
              <button className="btn btn-sm btn-primary" onClick={() => { setEditContent(article.instance_content); setEditing(true); setViewMode("company"); }}>
                <Pencil size={12} /> Edit My Version
              </button>
            </div>
          </div>
          <div className="article-diff-legend">
            <span><span className="swatch" style={{ background: "var(--green-100)" }} /> Added in original</span>
            <span><span className="swatch" style={{ background: "var(--red-100)" }} /> Removed from original</span>
          </div>
          <div className="article-compare-panels">
            <div className="article-compare-panel">
              <div className="article-compare-label article-compare-label--entrata">
                <FileText size={12} /> Entrata Original (Updated)
              </div>
              <div className="article-content" dangerouslySetInnerHTML={{ __html: computeInlineDiff(sanitizedInstance, sanitizedOriginal) }} />
            </div>
            <div className="article-compare-panel">
              <div className="article-compare-label article-compare-label--company">
                <Building2 size={12} /> Your Company Version
              </div>
              <div className="article-content" dangerouslySetInnerHTML={{ __html: computeInlineDiff(sanitizedOriginal, sanitizedInstance) }} />
            </div>
          </div>
        </div>
      ) : null}

      {/* Company version CTA when none exists (admin only -- non-admins just see original) */}
      {isAdmin && viewMode === "company" && !hasInstance ? (
        <div className="article-empty-instance">
          <Building2 size={32} style={{ color: "var(--text-muted)" }} />
          <h3>No company version yet</h3>
          <p>Customize this article with your company's specific processes, contacts, and procedures.</p>
          <button className="btn btn-primary" onClick={handleFork} disabled={forking}>
            <Pencil size={13} /> {forking ? "Creating..." : "Create Company Version"}
          </button>
        </div>
      ) : null}

      {/* Editor mode */}
      {editing && hasInstance ? (
        <div className="article-editor-wrap">
          <div className="article-editor-toolbar">
            <span className="text-sm text-muted">Editing company version</span>
            <div className="flex-row">
              <button className="btn btn-sm btn-ghost" onClick={() => setEditing(false)} disabled={saving}><X size={12} /> Cancel</button>
              <button className="btn btn-sm btn-secondary" onClick={() => handleSave("draft")} disabled={saving}>
                <Save size={12} /> {saving ? "Saving..." : "Save Draft"}
              </button>
              <button className="btn btn-sm btn-primary" onClick={openPublishDialog} disabled={saving}>
                <Eye size={12} /> {saving ? "Publishing..." : "Save & Publish"}
              </button>
            </div>
          </div>
          <RichTextEditor
            value={editContent}
            onChange={setEditContent}
            height={500}
            placeholder="Enter your company-specific content..."
          />
        </div>
      ) : null}

      {/* Change-summary banner: shows the writer's 1-sentence "what changed" note
          until change_summary_expires_at. Only rendered when viewing the surface
          (company-instance or canonical) whose summary is active. */}
      {!editing && viewMode !== "compare" && !bannerDismissed ? (() => {
        const banner = viewMode === "company" && hasInstance
          ? article.instance_change_summary_banner
          : article.canonical_change_summary;
        if (!banner || !banner.show) return null;
        const setAt = banner.setAt ? new Date(banner.setAt) : null;
        const expiresAt = banner.expiresAt ? new Date(banner.expiresAt) : null;
        return (
          <div className="article-change-banner">
            <Sparkles size={14} />
            <div style={{ flex: 1 }}>
              <div className="article-change-banner-label">
                What changed{setAt ? ` \u00b7 ${setAt.toLocaleDateString()}` : ""}
              </div>
              <div className="article-change-banner-text">{banner.summary}</div>
            </div>
            {expiresAt ? (
              <span className="article-change-banner-ttl" title={`Banner auto-hides on ${expiresAt.toLocaleString()}`}>
                <Clock size={11} /> until {expiresAt.toLocaleDateString()}
              </span>
            ) : null}
            <button className="article-change-banner-close" onClick={() => setBannerDismissed(true)} title="Dismiss for this session">
              <X size={12} />
            </button>
          </div>
        );
      })() : null}

      {/* Article content */}
      {!editing && viewMode !== "compare" && (viewMode === "original" || hasInstance) ? (
        <div className="article-content-wrap">
          {isAdmin && viewMode === "company" && hasInstance ? (
            <div className="article-company-header">
              <Building2 size={14} />
              <span>Company-customized version</span>
              {isDraft ? <span className="article-draft-badge">Draft -- only visible to admins</span> : null}
              {article.instance_updated_by_name ? (
                <span className="text-muted text-xs">Last edited by {article.instance_updated_by_name}</span>
              ) : null}
            </div>
          ) : null}
          <div
            ref={articleContentRef}
            className="article-content"
            onClickCapture={(e) => {
              const anchor = e.target.closest && e.target.closest("a");
              if (!anchor) return;
              const kbSlug = anchor.getAttribute("data-kb-slug");
              if (kbSlug) {
                e.preventDefault();
                e.stopPropagation();
                if (onOpenArticle) onOpenArticle(kbSlug);
                return;
              }
              const href = anchor.getAttribute("href") || "";
              if (!href || href.startsWith("#") || href.toLowerCase().startsWith("javascript:")) {
                e.preventDefault();
                e.stopPropagation();
                return;
              }
              if (!anchor.target || anchor.target === "_self") {
                anchor.target = "_blank";
                anchor.rel = anchor.rel || "noopener noreferrer";
              }
            }}
            dangerouslySetInnerHTML={{ __html: currentContent }}
          />
        </div>
      ) : null}

      {/* Publish dialog: collects the 1-sentence change summary that drives the banner. */}
      {publishOpen ? (
        <div className="article-publish-backdrop" onClick={() => !saving && setPublishOpen(false)}>
          <div className="article-publish-modal" onClick={(e) => e.stopPropagation()}>
            <div className="article-publish-header">
              <Sparkles size={14} />
              <h3>Publish this version</h3>
              <button className="btn btn-sm btn-ghost" onClick={() => setPublishOpen(false)} disabled={saving}>
                <X size={12} />
              </button>
            </div>
            <div className="article-publish-body">
              <label className="article-publish-label" htmlFor="change-summary">
                What changed? (1 sentence)
                <span className="text-muted text-xs"> shown as a banner at the top of the article</span>
              </label>
              <textarea
                id="change-summary"
                className="article-publish-textarea"
                value={changeSummary}
                onChange={(e) => setChangeSummary(e.target.value.slice(0, 240))}
                placeholder="e.g. Updated payment hold workflow to match the new ACH cutoff times."
                rows={3}
                autoFocus
              />
              <div className="article-publish-meta">
                <span className="text-muted text-xs">{changeSummary.length}/240</span>
                <label className="article-publish-ttl">
                  Show for
                  <select value={ttlDays} onChange={(e) => setTtlDays(Number(e.target.value))}>
                    <option value={1}>1 day</option>
                    <option value={3}>3 days</option>
                    <option value={7}>7 days</option>
                    <option value={14}>14 days</option>
                  </select>
                </label>
              </div>
            </div>
            <div className="article-publish-footer">
              <button
                className="btn btn-sm btn-ghost"
                onClick={() => handleSave("published", "", 0)}
                disabled={saving}
                title="Publish without a change summary banner"
              >
                Skip summary
              </button>
              <button
                className="btn btn-sm btn-primary"
                onClick={() => handleSave("published", changeSummary, ttlDays)}
                disabled={saving || !changeSummary.trim()}
              >
                <Eye size={12} /> {saving ? "Publishing..." : "Publish"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Version history drawer */}
      {historyOpen ? (
        <div className="article-publish-backdrop" onClick={() => setHistoryOpen(false)}>
          <div className="article-history-modal" onClick={(e) => e.stopPropagation()}>
            <div className="article-publish-header">
              <History size={14} />
              <h3>Version history</h3>
              <button className="btn btn-sm btn-ghost" onClick={() => setHistoryOpen(false)}>
                <X size={12} />
              </button>
            </div>
            <div className="article-history-body">
              {revisionsLoading ? (
                <p className="text-muted text-sm">Loading...</p>
              ) : !revisions || revisions.length === 0 ? (
                <p className="text-muted text-sm">No revisions recorded yet. Revisions are captured each time this article is saved.</p>
              ) : (
                <ul className="article-history-list">
                  {revisions.map((r) => (
                    <li key={r.id} className="article-history-item">
                      <div className="article-history-item-row">
                        <span className={`article-history-status article-history-status--${r.status}`}>{r.status}</span>
                        <span className="text-xs text-muted">{new Date(r.created_at).toLocaleString()}</span>
                        {r.created_by_name ? <span className="text-xs text-muted">{r.created_by_name}</span> : null}
                      </div>
                      {r.change_summary ? <div className="article-history-summary">{r.change_summary}</div> : null}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
