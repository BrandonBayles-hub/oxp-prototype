import { useState } from "react";
import { FileText, Download, Loader2, CheckCircle2, Calendar, ShieldCheck, BookOpen, AlertTriangle } from "lucide-react";
import { API_BASE } from "../api";

const REPORT_TEMPLATES = [
  {
    id: "completion-summary",
    title: "Monthly Completion Summary",
    description: "All completions by property, user, and course for the selected period.",
    icon: CheckCircle2,
    endpoint: "/api/admin/analytics/overview?format=csv",
    filename: "completion-summary.csv",
  },
  {
    id: "compliance-gaps",
    title: "Compliance Gaps Report",
    description: "Users with missing or expired certifications, grouped by property.",
    icon: ShieldCheck,
    endpoint: "/api/admin/analytics/compliance-overview?format=csv",
    filename: "compliance-gaps.csv",
  },
  {
    id: "content-effectiveness",
    title: "Course Effectiveness Report",
    description: "Per-course enrollment counts, completion rates, scores, ratings, and drop-off.",
    icon: BookOpen,
    endpoint: "/api/admin/analytics/content-effectiveness?format=csv",
    filename: "content-effectiveness.csv",
  },
  {
    id: "overdue-assignments",
    title: "Overdue Assignments Report",
    description: "All overdue course assignments and policy acknowledgments by user.",
    icon: AlertTriangle,
    endpoint: "/api/admin/analytics/overdue-assignments?format=csv",
    filename: "overdue-assignments.csv",
  },
];

export function ReportBuilder({ token }) {
  const [downloading, setDownloading] = useState(null);
  const [downloaded, setDownloaded] = useState(new Set());

  const handleDownload = async (report) => {
    setDownloading(report.id);
    try {
      const resp = await fetch(`${API_BASE}${report.endpoint}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!resp.ok) throw new Error("Download failed");
      const text = await resp.text();
      const blob = new Blob([text], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = report.filename; a.click();
      URL.revokeObjectURL(url);
      setDownloaded(s => new Set([...s, report.id]));
    } catch (err) {
      console.error("Download error:", err);
      alert("Download failed. Please try again.");
    }
    setDownloading(null);
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>Report Library</h2>
          <p style={{ fontSize: 13, color: "#6b7280", margin: "4px 0 0" }}>Pre-built reports ready for download. Custom report builder planned for a future release.</p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {REPORT_TEMPLATES.map(report => {
          const Icon = report.icon;
          const isDownloading = downloading === report.id;
          const wasDownloaded = downloaded.has(report.id);

          return (
            <div key={report.id} className="card" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: "#f3f4f6", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Icon size={20} style={{ color: "#6b7280" }} />
                </div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 600, margin: "0 0 4px" }}>{report.title}</h3>
                  <p style={{ fontSize: 13, color: "#6b7280", margin: 0, lineHeight: 1.5 }}>{report.description}</p>
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button
                  className={`btn-sm ${wasDownloaded ? "btn-ghost" : "btn-primary"}`}
                  onClick={() => handleDownload(report)}
                  disabled={isDownloading}
                >
                  {isDownloading ? (
                    <><Loader2 size={13} className="animate-spin" /> Generating...</>
                  ) : wasDownloaded ? (
                    <><CheckCircle2 size={13} /> Download Again</>
                  ) : (
                    <><Download size={13} /> Download CSV</>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="card" style={{ padding: 16, marginTop: 16, background: "#f9fafb" }}>
        <p style={{ fontSize: 13, color: "#6b7280", margin: 0 }}>
          <FileText size={13} style={{ verticalAlign: -2 }} /> Reports are generated in real-time from current data. CSV files can be opened in Excel, Google Sheets, or any spreadsheet application.
        </p>
      </div>
    </div>
  );
}
