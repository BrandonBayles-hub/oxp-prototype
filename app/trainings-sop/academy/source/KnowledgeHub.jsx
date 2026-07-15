import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { Search, FileText, ExternalLink, Clock, Tag, X, Building2, ChevronRight, FolderOpen, Star, History, Filter } from "lucide-react";
import { searchKbArticles, fetchKbCategories, fetchKbPopular } from "./api";
import { sanitizeArticleHtml } from "./ArticleViewer";

// Seed demo rows kept as a compatibility export for dev.green + legacy callers.
// The live KB tab reads from /api/kb/search; this constant is just a fallback.
export const KB_ARTICLES = [
  { id: "kb1", type: "article", title: "Reverse Charges and Credits", summary: "Instructions on how to reverse charges and credits to correct posting errors. Covers single transaction reversal and bulk reversal tool.", category: "Accounting", path: "Residents >> Charges", url: "https://entratasupport.zendesk.com/hc/en-us/articles/47655630624283", readTime: "3 min", slug: "reverse-charges-credits" },
  { id: "kb2", type: "article", title: "Reversing Payments", summary: "How to reverse a payment after it has been processed through Entrata's merchant services. Card reversals take 3-5 business days, ACH reversals 6-7 days.", category: "Accounting", path: "Residents >> AR Payments", url: "https://entratasupport.zendesk.com/hc/en-us/articles/14330629730971", readTime: "4 min", slug: "reversing-payments" },
  { id: "kb3", type: "article", title: "Adding Charges and Credits", summary: "Add individual charges, credits, and scheduled recurring charges to a resident's ledger. Covers one-time and recurring charge setup.", category: "Accounting", path: "Residents >> Charges", url: "https://entratasupport.zendesk.com/hc/en-us/articles/8404123c", readTime: "5 min", slug: "adding-charges-credits" },
  { id: "kb4", type: "article", title: "Processing a Move-In", summary: "Complete guide to processing a move-in in Entrata, including lease setup, charge configuration, and key handoff.", category: "Leasing", path: "Residents >> Applications", url: "https://entratasupport.zendesk.com/hc/en-us/articles/move-in", readTime: "8 min", slug: "processing-move-in" },
  { id: "kb5", type: "article", title: "Creating and Managing Work Orders", summary: "How to create, assign, prioritize, and close work orders. Includes resident communication, vendor assignment, and make-ready workflows.", category: "Maintenance", path: "Maintenance >> Work Orders", url: "https://entratasupport.zendesk.com/hc/en-us/articles/work-orders", readTime: "6 min", slug: "creating-work-orders" },
  { id: "kb6", type: "article", title: "Setting Up Lease Renewals", summary: "Configure and process lease renewals. Covers offer letters, rent increases, term options, and bulk renewal workflows.", category: "Leasing", path: "Residents >> Renewals", url: "https://entratasupport.zendesk.com/hc/en-us/articles/renewals", readTime: "7 min", slug: "lease-renewals" },
  { id: "kb7", type: "article", title: "Fair Housing Compliance Guide", summary: "Advertising compliance, reasonable accommodations, protected classes, and documentation best practices for Fair Housing Act compliance.", category: "Compliance", path: "Reference Guide", url: "https://entratasupport.zendesk.com/hc/en-us/articles/fair-housing", readTime: "10 min", slug: "fair-housing-guide" },
  { id: "kb8", type: "article", title: "Configuring Late Fees", summary: "Set up automatic late fee assessment including grace periods, fee amounts, percentage-based fees, and property-level overrides.", category: "Accounting", path: "Setup >> Properties >> Financial >> Charges", url: "https://entratasupport.zendesk.com/hc/en-us/articles/late-fees", readTime: "5 min", slug: "configuring-late-fees" },
  { id: "kb9", type: "article", title: "Resident Portal Setup", summary: "Configure the Resident Portal for online payments, maintenance requests, lease signing, and community announcements.", category: "Resident Experience", path: "Setup >> Properties >> Resident Portal", url: "https://entratasupport.zendesk.com/hc/en-us/articles/resident-portal", readTime: "6 min", slug: "resident-portal-setup" },
  { id: "kb10", type: "article", title: "Running Standard Reports", summary: "Access and customize standard reports including rent roll, delinquency, vacancy, and financial summaries.", category: "Reporting", path: "Data & Reports >> Standard Reports", url: "https://entratasupport.zendesk.com/hc/en-us/articles/reports", readTime: "4 min", slug: "running-standard-reports" },
  { id: "kb11", type: "article", title: "Bulk Updating Lease Dates", summary: "Use the bulk edit tool to update lease start/end dates, MTM intervals, and scheduled charge dates across multiple residents.", category: "Leasing", path: "Residents >> Bulk Edit", url: "https://entratasupport.zendesk.com/hc/en-us/articles/bulk-lease", readTime: "5 min", slug: "bulk-updating-lease-dates" },
  { id: "kb12", type: "article", title: "Vendor Management and PO Processing", summary: "Add vendors, create purchase orders, process invoices, and manage vendor insurance compliance.", category: "Maintenance", path: "Accounting >> Vendors", url: "https://entratasupport.zendesk.com/hc/en-us/articles/vendors", readTime: "7 min", slug: "vendor-management" },
  { id: "rn1", type: "release-note", title: "Release Notes - March 24, 2026 (Standard)", summary: "Category filters for search, bookmark favorite articles, estimated read time badges, and updated favorites system.", category: "Platform", date: "Mar 24, 2026", url: "https://entratasupport.zendesk.com/hc/en-us/articles/46857768947867" },
  { id: "rn2", type: "release-note", title: "Release Notes - January 6, 2026", summary: "Search improvements with category filters, bookmarking system overhaul, and estimated read time for articles.", category: "Platform", date: "Jan 6, 2026", url: "https://entratasupport.zendesk.com/hc/en-us/articles/44893226520219" },
  { id: "rn3", type: "release-note", title: "Release Notes - Audience Builder (Beta)", summary: "New Audience Builder tool for creating targeted, reusable audience segments. Filter by lease stage, move-in date, delinquency status.", category: "Marketing", date: "Oct 7, 2025", url: "https://entratasupport.zendesk.com/hc/en-us/articles/audience-builder" },
  { id: "rn4", type: "release-note", title: "Release Notes - Ledger Posting Control", summary: "New setting to control whether reversed AR payment transactions post directly to resident ledger.", category: "Accounting", date: "Jan 2026", url: "https://entratasupport.zendesk.com/hc/en-us/articles/ledger-posting" },
];

const PAGE_SIZE = 30;

const UPDATED_OPTIONS = [
  { id: "any", label: "Any time", days: null },
  { id: "30", label: "Last 30 days", days: 30 },
  { id: "90", label: "Last 90 days", days: 90 },
  { id: "365", label: "Last year", days: 365 },
];

function buildCategoryTree(categories) {
  const map = new Map();
  const roots = [];
  for (const cat of categories) {
    map.set(cat.id, { ...cat, children: [] });
  }
  for (const cat of categories) {
    const node = map.get(cat.id);
    if (cat.parent_id && map.has(cat.parent_id)) {
      map.get(cat.parent_id).children.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}

function CategoryTreeNode({ node, selectedId, onSelect, depth = 0 }) {
  const [expanded, setExpanded] = useState(depth < 2);
  const hasChildren = node.children.length > 0;
  const isSelected = selectedId === node.id;

  return (
    <div>
      <button
        className={`kb-category-node ${isSelected ? "kb-category-node--active" : ""}`}
        style={{ paddingLeft: 12 + depth * 16 }}
        onClick={() => {
          if (hasChildren) setExpanded(!expanded);
          onSelect(node.id, node.name);
        }}
      >
        {hasChildren ? (
          <ChevronRight size={12} className={`kb-category-chevron ${expanded ? "kb-category-chevron--open" : ""}`} />
        ) : (
          <span style={{ width: 12 }} />
        )}
        <FolderOpen size={13} />
        <span>{node.name}</span>
      </button>
      {expanded && hasChildren ? (
        <div>
          {node.children
            .sort((a, b) => a.sort_order - b.sort_order)
            .map(child => (
              <CategoryTreeNode key={child.id} node={child} selectedId={selectedId} onSelect={onSelect} depth={depth + 1} />
            ))}
        </div>
      ) : null}
    </div>
  );
}

function ResultSkeleton() {
  return (
    <div className="knowledge-card knowledge-card--skeleton">
      <div className="knowledge-card-icon"><div className="kb-skel kb-skel--icon" /></div>
      <div className="knowledge-card-body">
        <div className="kb-skel kb-skel--line kb-skel--short" />
        <div className="kb-skel kb-skel--line" />
        <div className="kb-skel kb-skel--line kb-skel--medium" />
      </div>
    </div>
  );
}

function mapApiRowToCard(r) {
  return {
    id: r.id,
    type: "article",
    title: r.title_highlight || r.title,
    rawTitle: r.title,
    summary: r.content_snippet || r.summary || "",
    category: r.category,
    category_id: r.category_id,
    path: r.path,
    readTime: r.read_time_minutes ? `${r.read_time_minutes} min` : null,
    slug: r.slug,
    url: r.url,
    source: r.source,
    rank: r.rank,
    updatedAt: r.zendesk_updated_at || r.updated_at,
    instance_id: r.instance_id,
    instance_status: r.instance_status,
    base_version: r.base_version,
    version: r.version,
  };
}

export function KnowledgeHub({ kbInstances = [], onOpenArticle, token, recentViews = [], favorites = [], onToggleFavorite }) {
  const [queryText, setQueryText] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [categories, setCategories] = useState([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [selectedCategoryName, setSelectedCategoryName] = useState(null);
  const [updatedFilter, setUpdatedFilter] = useState("any");
  const [onlyFavorites, setOnlyFavorites] = useState(false);

  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [popular, setPopular] = useState([]);

  const loadMoreRef = useRef(null);
  const fetchIdRef = useRef(0);

  useEffect(() => {
    if (token) {
      fetchKbCategories(token).then(setCategories).catch(() => {});
      fetchKbPopular(token, 30, 6)
        .then(data => setPopular(data?.results || []))
        .catch(() => {});
    }
  }, [token]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(queryText), 300);
    return () => clearTimeout(timer);
  }, [queryText]);

  const filterSignature = useMemo(() => JSON.stringify({
    q: debouncedQuery,
    cat: selectedCategoryId,
    upd: updatedFilter,
    fav: onlyFavorites,
  }), [debouncedQuery, selectedCategoryId, updatedFilter, onlyFavorites]);

  const buildSearchOpts = useCallback((pageOffset) => {
    const opts = { q: debouncedQuery, limit: PAGE_SIZE, offset: pageOffset };
    if (selectedCategoryId) opts.category_id = selectedCategoryId;
    const updMeta = UPDATED_OPTIONS.find(o => o.id === updatedFilter);
    if (updMeta?.days) {
      const d = new Date(Date.now() - updMeta.days * 24 * 3600 * 1000);
      opts.updated_after = d.toISOString();
    }
    if (onlyFavorites) opts.only_favorites = true;
    return opts;
  }, [debouncedQuery, selectedCategoryId, updatedFilter, onlyFavorites]);

  // Reload page 0 whenever filters change.
  useEffect(() => {
    if (!token) return;
    const fetchId = ++fetchIdRef.current;
    setLoading(true);
    setOffset(0);
    searchKbArticles(token, buildSearchOpts(0))
      .then(resp => {
        if (fetchIdRef.current !== fetchId) return;
        const results = (resp?.results || []).map(mapApiRowToCard);
        setItems(results);
        setHasMore(Boolean(resp?.has_more));
        setTotal(resp?.total ?? null);
        setOffset(results.length);
      })
      .catch(() => {
        if (fetchIdRef.current !== fetchId) return;
        setItems([]);
        setHasMore(false);
        setTotal(0);
      })
      .finally(() => {
        if (fetchIdRef.current !== fetchId) return;
        setLoading(false);
      });
  }, [token, filterSignature, buildSearchOpts]);

  const loadMore = useCallback(async () => {
    if (!token || !hasMore || loadingMore || loading) return;
    const fetchId = fetchIdRef.current;
    setLoadingMore(true);
    try {
      const resp = await searchKbArticles(token, buildSearchOpts(offset));
      if (fetchIdRef.current !== fetchId) return;
      const more = (resp?.results || []).map(mapApiRowToCard);
      setItems(prev => [...prev, ...more]);
      setHasMore(Boolean(resp?.has_more));
      setOffset(prev => prev + more.length);
    } catch {
      setHasMore(false);
    } finally {
      setLoadingMore(false);
    }
  }, [token, hasMore, loadingMore, loading, offset, buildSearchOpts]);

  useEffect(() => {
    if (!loadMoreRef.current) return;
    const el = loadMoreRef.current;
    const obs = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) loadMore();
    }, { rootMargin: "400px" });
    obs.observe(el);
    return () => obs.disconnect();
  }, [loadMore]);

  const categoryTree = useMemo(() => buildCategoryTree(categories), [categories]);
  const favoriteSlugs = useMemo(() => new Set(favorites.map(f => f.article_slug)), [favorites]);

  const instanceMap = useMemo(() => {
    const map = {};
    for (const inst of kbInstances) map[inst.slug] = inst;
    return map;
  }, [kbInstances]);

  const handleCategorySelect = (id, name) => {
    if (selectedCategoryId === id) {
      setSelectedCategoryId(null);
      setSelectedCategoryName(null);
    } else {
      setSelectedCategoryId(id);
      setSelectedCategoryName(name);
    }
  };

  const filtersActive = Boolean(selectedCategoryId || updatedFilter !== "any" || onlyFavorites || debouncedQuery.trim());
  const showIntroRails = !filtersActive && items.length > 0;

  return (
    <div className="kb-layout">
      {categoryTree.length > 0 ? (
        <div className="kb-sidebar">
          <div className="kb-sidebar-header">Categories</div>
          <button
            className={`kb-category-node ${!selectedCategoryId ? "kb-category-node--active" : ""}`}
            onClick={() => { setSelectedCategoryId(null); setSelectedCategoryName(null); }}
            style={{ paddingLeft: 12 }}
          >
            <span style={{ width: 12 }} />
            <FolderOpen size={13} />
            <span>All Categories</span>
          </button>
          {categoryTree.map(node => (
            <CategoryTreeNode key={node.id} node={node} selectedId={selectedCategoryId} onSelect={handleCategorySelect} />
          ))}
        </div>
      ) : null}

      <div className="kb-main">
        <div className="knowledge-search-bar">
          <Search size={16} />
          <input
            type="text"
            placeholder='Search help articles... (try "reverse a charge")'
            value={queryText}
            onChange={(e) => setQueryText(e.target.value)}
          />
          {loading ? <span className="knowledge-searching">Searching...</span> : null}
          {queryText && <button className="knowledge-clear" onClick={() => setQueryText("")}><X size={14} /></button>}
        </div>

        <div className="knowledge-filters">
          <span className="knowledge-filter-label"><Filter size={12} /> Filters:</span>
          <label className="knowledge-filter-select">
            Updated:
            <select value={updatedFilter} onChange={(e) => setUpdatedFilter(e.target.value)}>
              {UPDATED_OPTIONS.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
            </select>
          </label>
          {favorites.length > 0 ? (
            <button
              className={`knowledge-filter-chip ${onlyFavorites ? "active" : ""}`}
              onClick={() => setOnlyFavorites(v => !v)}
            >
              <Star size={11} style={{ verticalAlign: -1 }} /> Favorites <span className="knowledge-filter-count">{favorites.length}</span>
            </button>
          ) : null}
          {typeof total === "number" ? (
            <span className="knowledge-filter-total">{total.toLocaleString()} article{total === 1 ? "" : "s"}</span>
          ) : null}
        </div>

        {/* Popular right now */}
        {showIntroRails && popular.length > 0 ? (
          <div className="kb-recent-viewed">
            <div className="kb-recent-header">
              <Star size={14} />
              <span>Popular right now</span>
            </div>
            <div className="kb-recent-scroll">
              {popular.map(p => (
                <button key={`pop-${p.slug}`} className="kb-recent-card" onClick={() => onOpenArticle && onOpenArticle(p.slug)}>
                  <FileText size={13} className="kb-recent-icon" />
                  <div className="kb-recent-text">
                    <div className="kb-recent-title">{p.title}</div>
                    <div className="kb-recent-meta">{p.category}{p.read_time_minutes ? ` -- ${p.read_time_minutes} min` : ""}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {/* Recently Viewed */}
        {showIntroRails && recentViews.length > 0 ? (
          <div className="kb-recent-viewed">
            <div className="kb-recent-header">
              <History size={14} />
              <span>Recently Viewed</span>
            </div>
            <div className="kb-recent-scroll">
              {recentViews.map(v => (
                <button key={v.article_slug} className="kb-recent-card" onClick={() => onOpenArticle && onOpenArticle(v.article_slug)}>
                  <FileText size={13} className="kb-recent-icon" />
                  <div className="kb-recent-text">
                    <div className="kb-recent-title">{v.title}</div>
                    <div className="kb-recent-meta">{v.category}{v.read_time_minutes ? ` -- ${v.read_time_minutes} min` : ""}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {selectedCategoryName ? (
          <div className="kb-active-filter">
            <Tag size={12} /> Filtered by: <strong>{selectedCategoryName}</strong>
            <button onClick={() => { setSelectedCategoryId(null); setSelectedCategoryName(null); }}><X size={12} /></button>
          </div>
        ) : null}

        {loading && items.length === 0 ? (
          <div className="knowledge-results">
            {Array.from({ length: 6 }).map((_, i) => <ResultSkeleton key={i} />)}
          </div>
        ) : items.length === 0 ? (
          <div className="card" style={{ textAlign: "center", padding: "48px 24px" }}>
            <Search size={32} style={{ color: "var(--text-muted)", marginBottom: 8 }} />
            <h3>No results found</h3>
            <p style={{ fontSize: 14, color: "var(--text-muted)" }}>Try a different search term or clear the filters.</p>
            {filtersActive ? (
              <button
                className="btn btn-secondary"
                style={{ marginTop: 12 }}
                onClick={() => {
                  setQueryText("");
                  setSelectedCategoryId(null);
                  setSelectedCategoryName(null);
                  setUpdatedFilter("any");
                  setOnlyFavorites(false);
                }}
              >
                Clear all filters
              </button>
            ) : null}
          </div>
        ) : (
          <div className="knowledge-results">
            {items.map((item) => {
              const Icon = FileText;
              const instance = item.slug ? (instanceMap[item.slug] || (item.instance_id ? item : null)) : null;
              const isStale = instance && instance.base_version < (instance.current_version || instance.version);
              const clickable = item.slug && onOpenArticle;

              return (
                <div
                  key={item.id}
                  className={`knowledge-card knowledge-card--${item.type} ${clickable ? "knowledge-card--clickable" : ""}`}
                  onClick={clickable ? () => onOpenArticle(item.slug) : undefined}
                  role={clickable ? "button" : undefined}
                  tabIndex={clickable ? 0 : undefined}
                  onKeyDown={clickable ? (e) => { if (e.key === "Enter") onOpenArticle(item.slug); } : undefined}
                >
                  <div className="knowledge-card-icon"><Icon size={16} /></div>
                  <div className="knowledge-card-body">
                    <div className="knowledge-card-header">
                      <span className="knowledge-type-badge knowledge-type-badge--article">Article</span>
                      {item.slug && onToggleFavorite ? (
                        <button
                          className={`kb-fav-btn ${favoriteSlugs.has(item.slug) ? "kb-fav-btn--active" : ""}`}
                          onClick={(e) => { e.stopPropagation(); onToggleFavorite(item.slug); }}
                          title={favoriteSlugs.has(item.slug) ? "Remove from favorites" : "Add to favorites"}
                        >
                          <Star size={13} />
                        </button>
                      ) : null}
                      {item.category ? <span className="knowledge-category">{item.category}</span> : null}
                      {instance && instance.instance_status === "published" ? (
                        <span className={`knowledge-card-customized ${isStale ? "knowledge-card-customized--stale" : ""}`}>
                          <Building2 size={10} />
                          {isStale ? "Update available" : "Customized"}
                        </span>
                      ) : null}
                      {instance && instance.instance_status === "draft" ? (
                        <span className="knowledge-card-customized knowledge-card-customized--draft">
                          <Building2 size={10} /> Draft
                        </span>
                      ) : null}
                    </div>
                    <h4 className="knowledge-card-title" dangerouslySetInnerHTML={{ __html: sanitizeArticleHtml(item.title) }} />
                    {item.summary ? <p className="knowledge-card-summary" dangerouslySetInnerHTML={{ __html: sanitizeArticleHtml(item.summary) }} /> : null}
                    <div className="knowledge-card-meta">
                      {item.path ? <span><Tag size={11} /> {item.path}</span> : null}
                      {item.readTime ? <span><Clock size={11} /> {item.readTime}</span> : null}
                      {item.updatedAt ? <span><Clock size={11} /> Updated {new Date(item.updatedAt).toLocaleDateString()}</span> : null}
                      {item.url && !clickable ? <a href={item.url} target="_blank" rel="noopener noreferrer" className="knowledge-card-link" onClick={(e) => e.stopPropagation()}><ExternalLink size={11} /> View in Help Center</a> : null}
                    </div>
                  </div>
                </div>
              );
            })}

            {hasMore ? (
              <div ref={loadMoreRef} className="kb-load-more">
                {loadingMore ? (
                  <>
                    <ResultSkeleton />
                    <ResultSkeleton />
                  </>
                ) : (
                  <button className="btn btn-secondary" onClick={loadMore}>Load more</button>
                )}
              </div>
            ) : items.length > 0 && typeof total === "number" && items.length >= total ? (
              <div className="kb-load-more kb-load-more--end">
                End of results &mdash; {total.toLocaleString()} article{total === 1 ? "" : "s"} total.
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
