import { demoApiRequest, isDemoMode } from "./demo-data.js";

export const API_BASE = (typeof process !== "undefined" && process.env && process.env.NEXT_PUBLIC_ACADEMY_API_URL) || "http://localhost:3001";

export async function apiRequest(path, options = {}, token) {
  if (isDemoMode()) return demoApiRequest(path, options);

  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers
  });

  if (!response.ok) {
    let payload = {};
    try {
      payload = await response.json();
    } catch {
      payload = { error: response.statusText };
    }
    throw new Error(payload.error || `Request failed: ${response.status}`);
  }

  const contentType = response.headers.get("Content-Type") || "";
  if (contentType.includes("text/csv")) {
    return response.text();
  }
  const text = await response.text();
  if (!text || !text.trim()) return {};
  try {
    return JSON.parse(text);
  } catch (e) {
    console.error("[api] Failed to parse JSON response:", text.slice(0, 200));
    throw new Error("Invalid JSON response from server");
  }
}

// Content management
export const fetchAdminContent = (token, source) =>
  apiRequest(`/api/admin/content${source ? `?source=${source}` : ""}`, {}, token);
export const createCustomCourse = (token, data) =>
  apiRequest("/api/admin/content", { method: "POST", body: JSON.stringify(data) }, token);
export const updateCustomCourse = (token, id, data) =>
  apiRequest(`/api/admin/content/${id}`, { method: "PUT", body: JSON.stringify(data) }, token);
export const toggleCoursePublished = (token, id) =>
  apiRequest(`/api/admin/content/${id}/publish`, { method: "PUT" }, token);
export const deleteCustomCourse = (token, id) =>
  apiRequest(`/api/admin/content/${id}`, { method: "DELETE" }, token);
export async function uploadScormPackage(token, courseId, file) {
  const fd = new FormData();
  fd.append("scorm", file);
  const r = await fetch(`${API_BASE}/api/admin/content/${courseId}/upload`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: fd
  });
  if (!r.ok) { const p = await r.json().catch(() => ({})); throw new Error(p.error || `Upload failed: ${r.status}`); }
  return r.json();
}

// Groups (shape mirrors Entrata `company_groups` — Setup → Users and Groups → Groups)
export const fetchGroups = (token) => apiRequest("/api/groups", {}, token);
export const fetchGroupMembers = (token, groupId) => apiRequest(`/api/groups/${groupId}/members`, {}, token);
export const createGroup = (token, name, type) =>
  apiRequest("/api/groups", { method: "POST", body: JSON.stringify({ name, type }) }, token);
export const syncGroupsFromEntrata = (token) =>
  apiRequest("/api/groups/sync-from-entrata", { method: "POST" }, token);
export const addGroupMembers = (token, groupId, userIds) =>
  apiRequest(`/api/groups/${groupId}/members`, { method: "POST", body: JSON.stringify({ userIds }) }, token);
export const removeGroupMember = (token, groupId, userId) =>
  apiRequest(`/api/groups/${groupId}/members/${userId}`, { method: "DELETE" }, token);

// Bulk assign
export const bulkAssign = (token, data) =>
  apiRequest("/api/admin/assign-bulk", { method: "POST", body: JSON.stringify(data) }, token);

// Progress
export const fetchEnrollmentProgress = (token) => apiRequest("/api/admin/enrollment-progress", {}, token);
export const fetchCourseEnrollmentUsers = (token, courseId) =>
  apiRequest(`/api/admin/enrollment-progress/${courseId}/users`, {}, token);

// Bulk nudge
export const nudgeBulk = (token, userIds, message) =>
  apiRequest("/api/admin/nudge-bulk", { method: "POST", body: JSON.stringify({ userIds, message }) }, token);

// Comply - Admin
export const fetchAdminPolicies = (token) => apiRequest("/api/admin/policies", {}, token);
export const createAdminPolicy = (token, data) =>
  apiRequest("/api/admin/policies", { method: "POST", body: JSON.stringify(data) }, token);
export const updateAdminPolicy = (token, id, data) =>
  apiRequest(`/api/admin/policies/${id}`, { method: "PUT", body: JSON.stringify(data) }, token);
export const deleteAdminPolicy = (token, id) =>
  apiRequest(`/api/admin/policies/${id}`, { method: "DELETE" }, token);
export const savePolicySchedule = (token, policyId, data) =>
  apiRequest(`/api/admin/policies/${policyId}/schedule`, { method: "POST", body: JSON.stringify(data) }, token);
export const executePolicySchedule = (token, policyId) =>
  apiRequest(`/api/admin/policies/${policyId}/execute`, { method: "POST" }, token);

// Comply - File Upload
export async function uploadPolicyFile(token, file) {
  const fd = new FormData();
  fd.append("file", file);
  const r = await fetch(`${API_BASE}/api/admin/policies/upload`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: fd
  });
  if (!r.ok) { const p = await r.json().catch(() => ({})); throw new Error(p.error || `Upload failed: ${r.status}`); }
  return r.json();
}

// Comply - Versioning
export async function createPolicyVersion(token, policyId, data) {
  if (data.file) {
    const fd = new FormData();
    fd.append("file", data.file);
    const r = await fetch(`${API_BASE}/api/admin/policies/${policyId}/new-version`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: fd
    });
    if (!r.ok) { const p = await r.json().catch(() => ({})); throw new Error(p.error || `Version failed: ${r.status}`); }
    return r.json();
  }
  return apiRequest(`/api/admin/policies/${policyId}/new-version`, { method: "POST", body: JSON.stringify(data) }, token);
}

// Comply - Compliance
export const fetchPolicyCompliance = (token) => apiRequest("/api/admin/policy-compliance", {}, token);
export const fetchPolicyComplianceUsers = (token, policyId) =>
  apiRequest(`/api/admin/policy-compliance/${policyId}/users`, {}, token);

// Comply - Learner
export const acknowledgePolicy = (token, policyId) =>
  apiRequest(`/api/policies/${policyId}/acknowledge`, { method: "POST", body: JSON.stringify({}) }, token);

// Spotlights (learner-facing name; API routes remain /api/admin/sparks)
export const fetchAdminSparks = (token) => apiRequest("/api/admin/sparks", {}, token);
export const createSpark = (token, data) =>
  apiRequest("/api/admin/sparks", { method: "POST", body: JSON.stringify(data) }, token);
export const updateSpark = (token, id, data) =>
  apiRequest(`/api/admin/sparks/${id}`, { method: "PUT", body: JSON.stringify(data) }, token);
export const deleteSpark = (token, id) =>
  apiRequest(`/api/admin/sparks/${id}`, { method: "DELETE" }, token);
export const toggleSparkPublished = (token, id) =>
  apiRequest(`/api/admin/sparks/${id}/publish`, { method: "PUT" }, token);
export const saveSparkCapture = (token, id, steps) =>
  apiRequest(`/api/admin/sparks/${id}/capture`, { method: "POST", body: JSON.stringify({ steps }) }, token);
export const aiGenerateSpark = (token, id) =>
  apiRequest(`/api/admin/sparks/${id}/ai-generate`, { method: "POST" }, token);
export const assignSparks = (token, data) =>
  apiRequest("/api/admin/sparks/assign", { method: "POST", body: JSON.stringify(data) }, token);

// Spotlight auto-assign rules (API routes remain /api/admin/spark-rules)
export const fetchSparkRules = (token) => apiRequest("/api/admin/spark-rules", {}, token);
export const createSparkRule = (token, data) =>
  apiRequest("/api/admin/spark-rules", { method: "POST", body: JSON.stringify(data) }, token);
export const executeSparkRule = (token, id) =>
  apiRequest(`/api/admin/spark-rules/${id}/execute`, { method: "POST" }, token);

// Learner spotlight feed (API routes remain /api/sparks)
export const fetchSparksFeed = (token) => apiRequest("/api/sparks/feed", {}, token);
export const markSparkViewed = (token, id) =>
  apiRequest(`/api/sparks/${id}/view`, { method: "POST" }, token);
export const markSparkComplete = (token, id) =>
  apiRequest(`/api/sparks/${id}/complete`, { method: "POST" }, token);

// Video upload
export async function uploadVideo(token, file) {
  const fd = new FormData();
  fd.append("video", file);
  const r = await fetch(`${API_BASE}/api/admin/videos/upload`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: fd
  });
  if (!r.ok) { const p = await r.json().catch(() => ({})); throw new Error(p.error || `Upload failed: ${r.status}`); }
  return r.json();
}

// Workflow courses
export const createWorkflowCourse = (token, data) =>
  apiRequest("/api/admin/workflow-courses", { method: "POST", body: JSON.stringify(data) }, token);
export const fetchWorkflowCourse = (token, courseId) =>
  apiRequest(`/api/courses/${courseId}/workflow`, {}, token);
export async function exportWorkflowScorm(token, courseId) {
  const r = await fetch(`${API_BASE}/api/admin/workflow-courses/${courseId}/export-scorm`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!r.ok) { const p = await r.json().catch(() => ({})); throw new Error(p.error || `Export failed: ${r.status}`); }
  return r.blob();
}

// Training AI (agentic role-based simulator)
export const taiFetchProperties = (token) => apiRequest("/api/training-ai/properties", {}, token);
export const taiFetchSimTypes = (token) => apiRequest("/api/training-ai/sim-types", {}, token);

// Training AI - Company Guidelines (Admin)
export const taiFetchGuidelines = (token) => apiRequest("/api/training-ai/guidelines", {}, token);
export const taiCreateGuideline = (token, data) =>
  apiRequest("/api/training-ai/guidelines", { method: "POST", body: JSON.stringify(data) }, token);
export const taiUpdateGuideline = (token, id, data) =>
  apiRequest(`/api/training-ai/guidelines/${id}`, { method: "PUT", body: JSON.stringify(data) }, token);
export const taiDeleteGuideline = (token, id) =>
  apiRequest(`/api/training-ai/guidelines/${id}`, { method: "DELETE" }, token);
export const taiStartSession = (token, propertyId, simulationType) =>
  apiRequest("/api/training-ai/sessions", { method: "POST", body: JSON.stringify({ propertyId, simulationType }) }, token);
export const taiSendMessage = (token, sessionId, content) =>
  apiRequest(`/api/training-ai/sessions/${sessionId}/messages`, {
    method: "POST",
    body: JSON.stringify({ content })
  }, token);
export const taiCompleteSession = (token, sessionId) =>
  apiRequest(`/api/training-ai/sessions/${sessionId}/complete`, { method: "POST" }, token);
export const taiGetSession = (token, sessionId) =>
  apiRequest(`/api/training-ai/sessions/${sessionId}`, {}, token);
export const taiListSessions = (token) => apiRequest("/api/training-ai/sessions", {}, token);
export const taiTeamDashboard = (token) => apiRequest("/api/training-ai/dashboard/team", {}, token);
export const taiUserDashboard = (token, userId) =>
  apiRequest(`/api/training-ai/dashboard/user/${userId}`, {}, token);

// Analytics BI
export const fetchMyDashboard = (token) => apiRequest("/api/analytics/my-dashboard", {}, token);
export const fetchMyTranscriptCsv = (token) =>
  apiRequest("/api/analytics/my-dashboard?format=csv", {}, token);
export const fetchAdminAnalyticsOverview = (token) =>
  apiRequest("/api/admin/analytics/overview", {}, token);
export const fetchContentEffectiveness = (token) =>
  apiRequest("/api/admin/analytics/content-effectiveness", {}, token);
export const fetchComplianceOverview = (token) =>
  apiRequest("/api/admin/analytics/compliance-overview", {}, token);
export const fetchTeamComplianceSummary = (token) =>
  apiRequest("/api/manager/team/compliance-summary", {}, token);
export const fetchTeamAnalytics = (token) =>
  apiRequest("/api/manager/team/analytics", {}, token);
export const fetchCompletionRate = (token, groupBy = "property") =>
  apiRequest(`/api/analytics/completion-rate?groupBy=${groupBy}`, {}, token);

// Learning Plans (Learner)
export const fetchMyLearningPlans = (token) => apiRequest("/api/my-learning-plans", {}, token);

// Learning Plans (Catalog - all plans, any user)
export const fetchCatalogLearningPlans = (token) => apiRequest("/api/catalog/learning-plans", {}, token);

// Learning Plans (Admin)
export const fetchLearningPaths = (token) => apiRequest("/api/admin/learning-paths", {}, token);
export const fetchLearningPath = (token, id) => apiRequest(`/api/admin/learning-paths/${id}`, {}, token);
export const createLearningPath = (token, data) =>
  apiRequest("/api/admin/learning-paths", { method: "POST", body: JSON.stringify(data) }, token);
export const updateLearningPath = (token, id, data) =>
  apiRequest(`/api/admin/learning-paths/${id}`, { method: "PUT", body: JSON.stringify(data) }, token);
export const deleteLearningPath = (token, id) =>
  apiRequest(`/api/admin/learning-paths/${id}`, { method: "DELETE" }, token);
export const addLearningPathCourse = (token, pathId, courseId, required = true) =>
  apiRequest(`/api/admin/learning-paths/${pathId}/courses`, { method: "POST", body: JSON.stringify({ course_id: courseId, required }) }, token);
export const removeLearningPathCourse = (token, pathId, courseId) =>
  apiRequest(`/api/admin/learning-paths/${pathId}/courses/${courseId}`, { method: "DELETE" }, token);
export const reorderLearningPathCourses = (token, pathId, courseIds) =>
  apiRequest(`/api/admin/learning-paths/${pathId}/reorder`, { method: "PUT", body: JSON.stringify({ course_ids: courseIds }) }, token);

// Discovery Catalog
export const fetchDiscoveryCatalog = (token) => apiRequest("/api/courses/discovery", {}, token);

// Gamification
export const fetchGamificationProfile = (token) => apiRequest("/api/gamification/profile", {}, token);
export const fetchLeaderboard = (token, scope = 'company', period = 'all') =>
  apiRequest(`/api/gamification/leaderboard?scope=${scope}&period=${period}`, {}, token);
export const fetchAllBadges = (token) => apiRequest("/api/gamification/badges", {}, token);
export const fetchXpHistory = (token) => apiRequest("/api/gamification/xp-history", {}, token);

// Course Reviews
export const fetchCourseReviews = (token, courseId) => apiRequest(`/api/courses/${courseId}/reviews`, {}, token);
export const submitCourseReview = (token, courseId, rating, reviewText) =>
  apiRequest(`/api/courses/${courseId}/reviews`, { method: "POST", body: JSON.stringify({ rating, review_text: reviewText }) }, token);
export const fetchPopularCourses = (token) => apiRequest("/api/courses/popular", {}, token);

// Course catalog taxonomy (Phase 2 of publishing workflow redesign)
export const fetchCategories = (token) => apiRequest("/api/categories", {}, token);

// Curated plan overrides (Phase 3 of publishing workflow redesign)
export const fetchCuratedPlans = (token) => apiRequest("/api/admin/curated-plans", {}, token);
export const hideCuratedPlan = (token, id) => apiRequest(`/api/admin/curated-plans/${id}/hide`, { method: "POST" }, token);
export const unhideCuratedPlan = (token, id) => apiRequest(`/api/admin/curated-plans/${id}/unhide`, { method: "POST" }, token);

// ILT / VILT -- instructor-led sessions
export const fetchIltSessions = (token, { courseId, upcoming } = {}) => {
  const params = new URLSearchParams();
  if (courseId) params.set("courseId", courseId);
  if (upcoming) params.set("upcoming", "true");
  const qs = params.toString();
  return apiRequest(`/api/ilt/sessions${qs ? "?" + qs : ""}`, {}, token);
};
export const fetchIltSession = (token, id) => apiRequest(`/api/ilt/sessions/${id}`, {}, token);
export const createIltSession = (token, data) =>
  apiRequest("/api/admin/ilt/sessions", { method: "POST", body: JSON.stringify(data) }, token);
export const updateIltSession = (token, id, data) =>
  apiRequest(`/api/admin/ilt/sessions/${id}`, { method: "PATCH", body: JSON.stringify(data) }, token);
export const deleteIltSession = (token, id) =>
  apiRequest(`/api/admin/ilt/sessions/${id}`, { method: "DELETE" }, token);
export const registerIltSession = (token, id) =>
  apiRequest(`/api/ilt/sessions/${id}/register`, { method: "POST" }, token);
export const unregisterIltSession = (token, id) =>
  apiRequest(`/api/ilt/sessions/${id}/unregister`, { method: "POST" }, token);
export const markIltAttendance = (token, id, attended) =>
  apiRequest(`/api/admin/ilt/sessions/${id}/attendance`, { method: "POST", body: JSON.stringify({ attended }) }, token);

// In-app notifications (drawer)
export const fetchMyNotifications = (token) => apiRequest("/api/notifications/me", {}, token);
export const markNotificationRead = (token, id) =>
  apiRequest(`/api/notifications/${id}/read`, { method: "POST" }, token);
export const markAllNotificationsRead = (token) =>
  apiRequest("/api/notifications/read-all", { method: "POST" }, token);

// Quiz engine
export const fetchCourseQuiz = (token, courseId) => apiRequest(`/api/courses/${courseId}/quiz`, {}, token);
export const fetchQuizForAttempt = (token, quizId) => apiRequest(`/api/quizzes/${quizId}/for-attempt`, {}, token);
export const submitQuizAttempt = (token, quizId, answers, enrollmentId = null) =>
  apiRequest(`/api/quizzes/${quizId}/attempt`, { method: "POST", body: JSON.stringify({ answers, enrollmentId }) }, token);
export const fetchMyQuizAttempts = (token, quizId) => apiRequest(`/api/quizzes/${quizId}/attempts/me`, {}, token);

// Audit Log
export const fetchAuditLog = (token, params = {}) => {
  const qs = new URLSearchParams(params).toString();
  return apiRequest(`/api/admin/audit-log${qs ? `?${qs}` : ''}`, {}, token);
};
export const exportAuditLog = (token, params = {}) => {
  const qs = new URLSearchParams(params).toString();
  return apiRequest(`/api/admin/audit-log/export${qs ? `?${qs}` : ''}`, {}, token);
};

// Scheduled Reports
export const fetchScheduledReports = (token) => apiRequest("/api/admin/scheduled-reports", {}, token);
export const createScheduledReport = (token, data) =>
  apiRequest("/api/admin/scheduled-reports", { method: "POST", body: JSON.stringify(data) }, token);
export const updateScheduledReport = (token, id, data) =>
  apiRequest(`/api/admin/scheduled-reports/${id}`, { method: "PUT", body: JSON.stringify(data) }, token);
export const deleteScheduledReport = (token, id) =>
  apiRequest(`/api/admin/scheduled-reports/${id}`, { method: "DELETE" }, token);

// Certificates
export const fetchMyCertificates = (token) => apiRequest("/api/certificates/mine", {}, token);
export const getCertificateDownloadUrl = (certId) => `${API_BASE}/api/certificates/${certId}/download`;

// Onboarding Journeys
export const fetchJourneyDetails = (token, pathId) =>
  apiRequest(`/api/admin/learning-paths/${pathId}/journey`, {}, token);
export const updateJourneyDays = (token, pathId, journeyDays) =>
  apiRequest(`/api/admin/learning-paths/${pathId}/journey`, { method: "PUT", body: JSON.stringify({ journey_days: journeyDays }) }, token);
export const fetchTeamJourneyProgress = (token) =>
  apiRequest("/api/manager/team/journey-progress", {}, token);

// E1: My Onboarding Journey (learner)
export const fetchMyJourney = (token) => apiRequest("/api/my-journey", {}, token);

// E2: Outcomes Dashboard
export const fetchOutcomesDashboard = (token) => apiRequest("/api/admin/analytics/outcomes", {}, token);

// E3: Contextual Training Triggers + DAP
export const fetchContextualTriggers = (token) => apiRequest("/api/admin/contextual-triggers", {}, token);
export const fetchTriggerFires = (token) => apiRequest("/api/admin/trigger-fires", {}, token);
export const simulateTriggerEvent = (token, eventType, payload) =>
  apiRequest(`/api/webhooks/entrata/${encodeURIComponent(eventType)}`, { method: "POST", body: JSON.stringify(payload || {}) }, token);
export const createContextualTrigger = (token, data) =>
  apiRequest("/api/admin/contextual-triggers", { method: "POST", body: JSON.stringify(data) }, token);
export const updateContextualTrigger = (token, id, data) =>
  apiRequest(`/api/admin/contextual-triggers/${id}`, { method: "PUT", body: JSON.stringify(data) }, token);
export const toggleContextualTrigger = (token, id, enabled) =>
  apiRequest(`/api/admin/contextual-triggers/${id}`, { method: "PUT", body: JSON.stringify({ enabled }) }, token);
export const deleteContextualTrigger = (token, id) =>
  apiRequest(`/api/admin/contextual-triggers/${id}`, { method: "DELETE" }, token);

// DAP: Learner endpoints
export const dapCheck = (token, workflowKey) => apiRequest(`/api/dap/check?workflow=${encodeURIComponent(workflowKey)}`, {}, token);
export const dapCompleteGate = (token, gateId, data) =>
  apiRequest(`/api/dap/gates/${gateId}/complete`, { method: "POST", body: JSON.stringify(data) }, token);
export const dapResetGate = (token, gateId) =>
  apiRequest(`/api/dap/gates/${gateId}/reset`, { method: "POST" }, token);
export const dapResetByWorkflow = (token, workflowKey) =>
  apiRequest(`/api/dap/reset-by-workflow`, { method: "POST", body: JSON.stringify({ workflow_key: workflowKey }) }, token);
export const dapWalkthroughSteps = (token, id) => apiRequest(`/api/dap/walkthroughs/${id}/steps`, {}, token);
export const dapCompleteWalkthrough = (token, id) =>
  apiRequest(`/api/dap/walkthroughs/${id}/complete`, { method: "POST" }, token);
export const dapDismissWalkthrough = (token, id) =>
  apiRequest(`/api/dap/walkthroughs/${id}/dismiss`, { method: "POST" }, token);
export const dapLogEvent = (token, data) =>
  apiRequest("/api/dap/events", { method: "POST", body: JSON.stringify(data) }, token);
export const dapRequestException = (token, triggerId, reason) =>
  apiRequest("/api/dap/exceptions/request", { method: "POST", body: JSON.stringify({ trigger_id: triggerId, reason }) }, token);
export const dapMyStatus = (token) => apiRequest("/api/dap/my-status", {}, token);

// DAP: Admin endpoints
export const dapAdminDashboard = (token) => apiRequest("/api/admin/dap/dashboard", {}, token);
export const dapAdminCompliance = (token) => apiRequest("/api/admin/dap/compliance", {}, token);
export const dapAdminExceptions = (token) => apiRequest("/api/admin/dap/exceptions", {}, token);
export const dapAdminUpdateException = (token, id, data) =>
  apiRequest(`/api/admin/dap/exceptions/${id}`, { method: "PUT", body: JSON.stringify(data) }, token);
export const dapAdminAdoptionByWorkflow = (token) => apiRequest("/api/admin/dap/adoption-by-workflow", {}, token);
export const dapAdminWalkthroughs = (token) => apiRequest("/api/admin/dap/walkthroughs", {}, token);
export const dapAdminToggleWalkthrough = (token, id, enabled) =>
  apiRequest(`/api/admin/dap/walkthroughs/${id}`, { method: "PUT", body: JSON.stringify({ enabled }) }, token);

// E4: Brand Kit
export const fetchBrandKit = (token) => apiRequest("/api/admin/brand-kit", {}, token);
export const updateBrandKit = (token, data) =>
  apiRequest("/api/admin/brand-kit", { method: "PUT", body: JSON.stringify(data) }, token);

// E5: Enablement Calendar + Recurring Schedules
export const fetchEnablementCalendar = (token) => apiRequest("/api/admin/enablement-calendar", {}, token);
export const createRecurringSchedule = (token, data) =>
  apiRequest("/api/admin/recurring-schedules", { method: "POST", body: JSON.stringify(data) }, token);

// E6: Migration Wizard
export const validateMigrationHistory = (token, rows) =>
  apiRequest("/api/admin/migration/validate-history", { method: "POST", body: JSON.stringify({ rows }) }, token);
export const executeMigration = (token, data) =>
  apiRequest("/api/admin/migration/execute", { method: "POST", body: JSON.stringify(data) }, token);

// E7: Verticals
export const fetchVerticals = (token) => apiRequest("/api/verticals", {}, token);

// Certification Programs - Admin
export const fetchCertPrograms = (token) => apiRequest("/api/admin/certification-programs", {}, token);
export const createCertProgram = (token, data) =>
  apiRequest("/api/admin/certification-programs", { method: "POST", body: JSON.stringify(data) }, token);
export const updateCertProgram = (token, id, data) =>
  apiRequest(`/api/admin/certification-programs/${id}`, { method: "PUT", body: JSON.stringify(data) }, token);
export const deleteCertProgram = (token, id) =>
  apiRequest(`/api/admin/certification-programs/${id}`, { method: "DELETE" }, token);
export const addCertProgramCourse = (token, programId, courseId) =>
  apiRequest(`/api/admin/certification-programs/${programId}/courses`, { method: "POST", body: JSON.stringify({ course_id: courseId }) }, token);
export const removeCertProgramCourse = (token, programId, courseId) =>
  apiRequest(`/api/admin/certification-programs/${programId}/courses/${courseId}`, { method: "DELETE" }, token);
export const assignCertProgram = (token, programId, userIds) =>
  apiRequest(`/api/admin/certification-programs/${programId}/assign`, { method: "POST", body: JSON.stringify({ user_ids: userIds }) }, token);
export const fetchCertProgramProgress = (token, programId) =>
  apiRequest(`/api/admin/certification-programs/${programId}/progress`, {}, token);

// Certification Programs - Learner
export const fetchMyCertifications = (token) => apiRequest("/api/certifications/me", {}, token);

// Knowledge Base Articles (with company instance overlay)
export const fetchKbArticles = (token) => apiRequest("/api/kb/articles", {}, token);
export const fetchKbArticle = (token, slug) => apiRequest(`/api/kb/articles/${slug}`, {}, token);
export const forkKbArticle = (token, slug) =>
  apiRequest(`/api/kb/articles/${slug}/instance`, { method: "POST" }, token);
export const updateKbInstance = (token, slug, data) =>
  apiRequest(`/api/kb/articles/${slug}/instance`, { method: "PUT", body: JSON.stringify(data) }, token);
export const deleteKbInstance = (token, slug) =>
  apiRequest(`/api/kb/articles/${slug}/instance`, { method: "DELETE" }, token);
export const fetchKbRevisions = (token, slug) =>
  apiRequest(`/api/kb/articles/${slug}/revisions`, {}, token);
export const syncKbInstance = (token, slug) =>
  apiRequest(`/api/kb/articles/${slug}/instance/sync`, { method: "POST" }, token);
export const fetchAdminKbInstances = (token) => apiRequest("/api/admin/kb/instances", {}, token);

// KB Search (full-text with fuzzy matching, paginated + faceted)
// Accepts either (token, qString) for back-compat or (token, {q, limit, offset,
// category_id, section_id, updated_after, only_favorites, source}).
// Always resolves to { results, has_more, total } so infinite-scroll works.
export const searchKbArticles = async (token, arg2, legacyType, legacyLimit) => {
  const opts = typeof arg2 === "string" ? { q: arg2 } : (arg2 || {});
  const params = new URLSearchParams();
  if (opts.q != null) params.set("q", opts.q);
  if (opts.limit != null) params.set("limit", String(opts.limit));
  else if (legacyLimit != null) params.set("limit", String(legacyLimit));
  if (opts.offset != null) params.set("offset", String(opts.offset));
  if (opts.category_id) params.set("category_id", opts.category_id);
  if (opts.section_id) params.set("section_id", opts.section_id);
  if (opts.updated_after) params.set("updated_after", opts.updated_after);
  if (opts.only_favorites) params.set("only_favorites", "1");
  if (opts.source) params.set("source", opts.source);
  if (legacyType) params.set("type", legacyType);
  const raw = await apiRequest(`/api/kb/search?${params}`, {}, token);
  // Tolerate the pre-envelope response in case anything is cached.
  if (Array.isArray(raw)) return { results: raw, has_more: false, total: raw.length };
  return raw;
};

// Most-viewed / popular articles for the KB landing surface
export const fetchKbPopular = (token, windowDays = 30, limit = 10) =>
  apiRequest(`/api/kb/popular?window=${windowDays}&limit=${limit}`, {}, token);

// Full metadata for a single article (used by the inline viewer so we don't
// keep the whole KB in memory on the client). Reuses the existing
// /api/kb/articles/:slug endpoint which handles tenant-scoped instances +
// role-gated content filtering.
export const fetchKbArticleBySlug = (token, slug) =>
  apiRequest(`/api/kb/articles/${encodeURIComponent(slug)}`, {}, token);

// Support Assistant (deflection bot)
export const askKbAssistant = (token, { question, conversation_id, history }) =>
  apiRequest("/api/kb/ask", {
    method: "POST",
    body: JSON.stringify({ question, conversation_id, history }),
  }, token);

// Streamed version. Invokes onEvent({ type, data }) for each parsed SSE
// event. Returns a Promise that resolves with the final "done" payload.
export async function streamKbAssistant(token, { question, conversation_id, history }, onEvent) {
  const res = await fetch(`${API_BASE}/api/kb/ask/stream`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ question, conversation_id, history }),
  });
  if (!res.ok || !res.body) {
    throw new Error(`Stream failed: ${res.status} ${res.statusText}`);
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let finalPayload = null;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    // Process complete SSE frames separated by a blank line.
    let boundary;
    while ((boundary = buffer.indexOf("\n\n")) !== -1) {
      const frame = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);
      const lines = frame.split("\n");
      let evt = "message";
      let dataLines = [];
      for (const line of lines) {
        if (line.startsWith("event:")) evt = line.slice(6).trim();
        else if (line.startsWith("data:")) dataLines.push(line.slice(5).trim());
      }
      let data = dataLines.join("\n");
      if (!data) continue;
      try { data = JSON.parse(data); } catch { /* keep as string */ }
      onEvent && onEvent({ type: evt, data });
      if (evt === "done") finalPayload = data;
    }
  }
  return finalPayload;
}

export const handoffKbAssistantTurn = (token, turnId) =>
  apiRequest(`/api/kb/ask/${encodeURIComponent(turnId)}/handoff`, { method: "POST" }, token);

export const fetchKbAssistantAnalytics = (token, windowDays = 30) =>
  apiRequest(`/api/kb/ask/analytics?window=${windowDays}`, {}, token);

// KB Categories (hierarchical tree)
export const fetchKbCategories = (token) => apiRequest("/api/kb/categories", {}, token);
export const createKbCategory = (token, data) =>
  apiRequest("/api/kb/categories", { method: "POST", body: JSON.stringify(data) }, token);
export const updateKbCategory = (token, id, data) =>
  apiRequest(`/api/kb/categories/${id}`, { method: "PUT", body: JSON.stringify(data) }, token);
export const reorderKbCategories = (token, items) =>
  apiRequest("/api/kb/categories/reorder", { method: "PUT", body: JSON.stringify({ items }) }, token);
export const deleteKbCategory = (token, id) =>
  apiRequest(`/api/kb/categories/${id}`, { method: "DELETE" }, token);

// KB Slug resolution (redirect support)
export const resolveKbSlug = (slug) => apiRequest(`/api/kb/resolve/${slug}`);

// KB Draft preview tokens
export const createKbPreviewToken = (token, slug, expiresDays) =>
  apiRequest(`/api/kb/articles/${slug}/preview-token`, { method: "POST", body: JSON.stringify({ expires_days: expiresDays }) }, token);
export const fetchKbPreview = (previewToken) => apiRequest(`/api/kb/preview/${previewToken}`);

// KB View History
export const trackKbView = (token, slug) =>
  apiRequest(`/api/kb/views/${slug}`, { method: "POST" }, token);
export const fetchKbRecentViews = (token) => apiRequest("/api/kb/views/recent", {}, token);

// KB Favorites
export const fetchKbFavorites = (token) => apiRequest("/api/kb/favorites", {}, token);
export const addKbFavorite = (token, slug) =>
  apiRequest(`/api/kb/favorites/${slug}`, { method: "POST" }, token);
export const removeKbFavorite = (token, slug) =>
  apiRequest(`/api/kb/favorites/${slug}`, { method: "DELETE" }, token);

// KB Admin: staleness notifications and broken links
export const fetchKbStalenessNotifications = (token) => apiRequest("/api/admin/kb/staleness-notifications", {}, token);
export const fetchKbBrokenLinks = (token) => apiRequest("/api/admin/kb/broken-links", {}, token);

// What's New: release-grouped product updates feed
export const fetchWhatsNew = (token, { productArea, updateType, search, track } = {}) => {
  const params = new URLSearchParams();
  if (productArea && productArea !== "all") params.set("product_area", productArea);
  if (updateType && updateType !== "all") params.set("update_type", updateType);
  if (search && search.trim()) params.set("search", search.trim());
  if (track && track !== "all") params.set("track", track);
  const qs = params.toString();
  return apiRequest(`/api/whats-new${qs ? `?${qs}` : ""}`, {}, token);
};
export const fetchWhatsNewUnread = (token) => apiRequest("/api/whats-new/unread-count", {}, token);
export const markUpdateRead = (token, id) => apiRequest(`/api/whats-new/${id}/read`, { method: "POST" }, token);
export const markAllUpdatesRead = (token) => apiRequest("/api/whats-new/mark-all-read", { method: "POST" }, token);
export const fetchWhatsNewReadIds = (token) => apiRequest("/api/whats-new/read-ids", {}, token);

// Admin: content visibility settings
export const fetchContentVisibility = (token) => apiRequest("/api/admin/content-visibility", {}, token);
export const updateContentVisibility = (token, surface, enabled, minRole) =>
  apiRequest("/api/admin/content-visibility", { method: "PUT", body: JSON.stringify({ surface, enabled, min_role: minRole }) }, token);
