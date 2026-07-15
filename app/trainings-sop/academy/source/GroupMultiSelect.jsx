import React, { useMemo, useState } from "react";
import { Search, X, MapPin, Building2, Users, Briefcase, Tag, ShieldCheck, Network, Cloud } from "lucide-react";

const TYPE_LABEL = {
  region: "Regions",
  property: "Properties",
  role: "Roles",
  department: "Departments",
  custom: "Custom",
};

const TYPE_ORDER = ["region", "property", "role", "department", "custom"];

const TYPE_ICON = {
  region: MapPin,
  property: Building2,
  role: Briefcase,
  department: Users,
  custom: Tag,
};

// Source badges reflect how the group is provisioned in Entrata
// (Setup → Users and Groups → Groups):
//   - is_system: shipped as part of Entrata (e.g. LCADMIN, LCTRNR)
//   - is_active_directory_group: membership managed in AD
//   - is_scim_group: provisioned via SCIM (Okta, Entra ID, etc.)
function GroupSourceBadges({ group }) {
  const badges = [];
  if (group.is_system) badges.push({ key: "system", label: "System", icon: ShieldCheck, title: `System group${group.system_code ? ` · ${group.system_code}` : ""}` });
  if (group.is_active_directory_group) badges.push({ key: "ad", label: "AD", icon: Network, title: "Synced from Active Directory" });
  if (group.is_scim_group) badges.push({ key: "scim", label: "SCIM", icon: Cloud, title: "Provisioned via SCIM" });
  if (!badges.length) return null;
  return (
    <span className="gms-badges">
      {badges.map((b) => {
        const Icon = b.icon;
        return (
          <span key={b.key} className={`gms-badge gms-badge-${b.key}`} title={b.title}>
            <Icon size={10} /> {b.label}
          </span>
        );
      })}
    </span>
  );
}

/**
 * GroupMultiSelect
 * Search + facets + grouped-by-type picker that scales from 5 to 500+ groups.
 *
 * Props:
 *   groups   — [{ id, name, type, member_count }]
 *   value    — string[] of selected group ids
 *   onChange — (nextIds: string[]) => void
 */
export function GroupMultiSelect({ groups = [], value = [], onChange }) {
  const [search, setSearch] = useState("");
  const [facet, setFacet] = useState("all");

  const typeCounts = useMemo(() => {
    const counts = {};
    for (const g of groups) counts[g.type] = (counts[g.type] || 0) + 1;
    return counts;
  }, [groups]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return groups.filter((g) => {
      if (facet !== "all" && g.type !== facet) return false;
      if (q && !g.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [groups, search, facet]);

  const byType = useMemo(() => {
    const map = {};
    for (const g of filtered) {
      if (!map[g.type]) map[g.type] = [];
      map[g.type].push(g);
    }
    for (const t of Object.keys(map)) map[t].sort((a, b) => a.name.localeCompare(b.name));
    return map;
  }, [filtered]);

  const selectedGroups = useMemo(
    () => groups.filter((g) => value.includes(g.id)),
    [groups, value]
  );
  const totalMembers = selectedGroups.reduce((s, g) => s + (Number(g.member_count) || 0), 0);

  function toggle(id) {
    onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id]);
  }
  function selectAllInType(type) {
    const idsInType = groups.filter((g) => g.type === type).map((g) => g.id);
    onChange(Array.from(new Set([...value, ...idsInType])));
  }
  function clearType(type) {
    const idsInType = new Set(groups.filter((g) => g.type === type).map((g) => g.id));
    onChange(value.filter((id) => !idsInType.has(id)));
  }

  const visibleTypes = TYPE_ORDER.filter((t) => byType[t] && byType[t].length > 0);

  return (
    <div className="group-multi-select">
      {selectedGroups.length > 0 && (
        <div className="gms-tokens">
          {selectedGroups.map((g) => (
            <span key={g.id} className="gms-token">
              {g.name}
              <button type="button" onClick={() => toggle(g.id)} aria-label={`Remove ${g.name}`}>
                <X size={11} />
              </button>
            </span>
          ))}
          <button
            type="button"
            className="gms-clear-all"
            onClick={() => onChange([])}
          >
            Clear all
          </button>
        </div>
      )}

      <div className="gms-search">
        <Search size={14} />
        <input
          type="text"
          placeholder={`Search ${groups.length} group${groups.length === 1 ? "" : "s"}...`}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search && (
          <button
            type="button"
            className="gms-search-clear"
            onClick={() => setSearch("")}
            aria-label="Clear search"
          >
            <X size={12} />
          </button>
        )}
      </div>

      <div className="gms-facets">
        <button
          type="button"
          className={`gms-facet${facet === "all" ? " active" : ""}`}
          onClick={() => setFacet("all")}
        >
          All <span>{groups.length}</span>
        </button>
        {TYPE_ORDER.filter((t) => typeCounts[t]).map((t) => {
          const Icon = TYPE_ICON[t];
          return (
            <button
              type="button"
              key={t}
              className={`gms-facet${facet === t ? " active" : ""}`}
              onClick={() => setFacet(t)}
            >
              <Icon size={11} /> {TYPE_LABEL[t]} <span>{typeCounts[t]}</span>
            </button>
          );
        })}
      </div>

      <div className="gms-list">
        {visibleTypes.length === 0 ? (
          <div className="gms-empty">
            {search ? `No groups match "${search}"` : "No groups available"}
          </div>
        ) : (
          visibleTypes.map((t) => {
            const items = byType[t];
            const totalInType = groups.filter((g) => g.type === t).length;
            const selectedInType = groups.filter((g) => g.type === t && value.includes(g.id)).length;
            const allSelected = selectedInType === totalInType && totalInType > 0;
            return (
              <div key={t} className="gms-section">
                <div className="gms-section-header">
                  <span className="gms-section-title">
                    {TYPE_LABEL[t]}
                    {items.length < totalInType ? (
                      <span className="gms-section-sub"> · showing {items.length} of {totalInType}</span>
                    ) : null}
                  </span>
                  <button
                    type="button"
                    className="gms-section-action"
                    onClick={() => (allSelected ? clearType(t) : selectAllInType(t))}
                  >
                    {allSelected
                      ? `Clear ${TYPE_LABEL[t].toLowerCase()}`
                      : `Select all ${totalInType}`}
                  </button>
                </div>
                {items.map((g) => {
                  const checked = value.includes(g.id);
                  return (
                    <label key={g.id} className={`gms-row${checked ? " selected" : ""}`}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggle(g.id)}
                      />
                      <span className="gms-row-main">
                        <span className="gms-row-title">
                          <span className="gms-row-name">{g.name}</span>
                          <GroupSourceBadges group={g} />
                        </span>
                        {g.description ? (
                          <span className="gms-row-desc" title={g.description}>{g.description}</span>
                        ) : null}
                      </span>
                      <span className="gms-row-count">
                        {g.member_count ?? 0} {Number(g.member_count) === 1 ? "person" : "people"}
                      </span>
                    </label>
                  );
                })}
              </div>
            );
          })
        )}
      </div>

      <div className="gms-footer">
        {selectedGroups.length === 0 ? (
          <span className="text-muted">Select one or more groups above.</span>
        ) : (
          <span>
            <strong>{selectedGroups.length}</strong> {selectedGroups.length === 1 ? "group" : "groups"} selected
            {" · up to "}
            <strong>{totalMembers}</strong> {totalMembers === 1 ? "person" : "people"}
            {selectedGroups.length > 1 ? (
              <span className="text-muted"> (may include overlap)</span>
            ) : null}
          </span>
        )}
      </div>
    </div>
  );
}
