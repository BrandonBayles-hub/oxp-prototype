import { useCallback, useEffect, useState } from "react";
import "../styles/training-ai.css";
import {
  taiFetchProperties,
  taiFetchSimTypes,
  taiStartSession,
  taiSendMessage,
  taiCompleteSession,
  taiTeamDashboard,
  taiUserDashboard
} from "../api.js";
import { SessionSetup } from "./SessionSetup.jsx";
import { SimulationChat } from "./SimulationChat.jsx";
import { CoachingSidebar } from "./CoachingSidebar.jsx";
import { SessionComplete } from "./SessionComplete.jsx";
import { ManagerDashboard } from "./ManagerDashboard.jsx";
import { TraineeDetail } from "./TraineeDetail.jsx";
import { GuidelinesManager } from "./GuidelinesManager.jsx";

export function TrainingAI({ token, isManager, isAdmin }) {
  const [phase, setPhase] = useState("setup");
  const [properties, setProperties] = useState([]);
  const [propertyId, setPropertyId] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [propertyName, setPropertyName] = useState("");
  const [persona, setPersona] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [skillSnapshot, setSkillSnapshot] = useState({});
  const [coachingNote, setCoachingNote] = useState(null);
  const [avgScore, setAvgScore] = useState(null);
  const [turnCount, setTurnCount] = useState(0);
  const [moveTowardClose, setMoveTowardClose] = useState(false);
  const [sending, setSending] = useState(false);
  const [typing, setTyping] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");
  const [completeData, setCompleteData] = useState(null);
  const [teamData, setTeamData] = useState(null);
  const [traineeData, setTraineeData] = useState(null);
  const [detailUserId, setDetailUserId] = useState(null);

  const [simTypesInfo, setSimTypesInfo] = useState(null);
  const [selectedSimType, setSelectedSimType] = useState(null);
  const [activeSimConfig, setActiveSimConfig] = useState(null);
  const [brandCompliance, setBrandCompliance] = useState([]);

  const loadProps = useCallback(async () => {
    try {
      const rows = await taiFetchProperties(token);
      setProperties(rows);
      if (rows.length && !propertyId) {
        setPropertyId(rows[0].id);
      }
    } catch (e) {
      setError(e.message);
    }
  }, [token, propertyId]);

  const loadSimTypes = useCallback(async () => {
    try {
      const data = await taiFetchSimTypes(token);
      setSimTypesInfo(data);
      if (data.defaultType && !selectedSimType) {
        setSelectedSimType(data.defaultType);
      }
    } catch (e) {
      console.error("Failed to load sim types:", e.message);
    }
  }, [token, selectedSimType]);

  useEffect(() => {
    loadProps();
    loadSimTypes();
  }, [loadProps, loadSimTypes]);

  const loadTeam = async () => {
    try {
      const d = await taiTeamDashboard(token);
      setTeamData(d);
      setPhase("manager");
    } catch (e) {
      setError(e.message);
    }
  };

  const loadTrainee = async (userId) => {
    try {
      const d = await taiUserDashboard(token, userId);
      setTraineeData(d);
      setDetailUserId(userId);
      setPhase("trainee");
    } catch (e) {
      setError(e.message);
    }
  };

  const handleStart = async () => {
    setError("");
    setStarting(true);
    try {
      const res = await taiStartSession(token, propertyId, selectedSimType);
      const s = res.session;
      setSessionId(s.id);
      const p = typeof s.persona === "string" ? JSON.parse(s.persona) : s.persona;
      setPersona(p);
      setMessages(
        (res.messages || []).map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content
        }))
      );
      setSkillSnapshot(res.session_meta?.skill_snapshot || {});
      setCoachingNote(null);
      setAvgScore(res.session_meta?.avg_score ?? null);
      setTurnCount(0);
      setMoveTowardClose(false);

      setActiveSimConfig({
        simulationType: res.session_meta?.simulation_type || selectedSimType || "leasing",
        skills: res.session_meta?.skills || [],
        counterpartLabel: res.session_meta?.counterpartLabel || "Prospect",
        traineeLabel: res.session_meta?.traineeLabel || "You",
      });

      const prop = properties.find((x) => x.id === propertyId);
      setPropertyName(prop?.name || "");
      setPhase("sim");
    } catch (e) {
      setError(e.message);
    } finally {
      setStarting(false);
    }
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || !sessionId || sending) return;
    setInput("");
    setSending(true);
    setTyping(true);
    setAnalyzing(true);
    setMessages((prev) => [
      ...prev,
      { id: `t-${Date.now()}`, role: "trainee", content: text }
    ]);
    try {
      const res = await taiSendMessage(token, sessionId, text);
      const delay = Math.min(2000, 800 + text.length * 15);
      await new Promise((r) => setTimeout(r, delay));
      setTyping(false);
      setMessages((prev) => [
        ...prev,
        {
          id: `p-${Date.now()}`,
          role: "prospect",
          content: res.prospect_message
        }
      ]);
      setCoachingNote(res.coaching_note);
      setSkillSnapshot(res.session_meta?.skill_snapshot || {});
      setAvgScore(res.session_meta?.avg_score ?? null);
      setTurnCount(res.session_meta?.turn_count ?? 0);
      setMoveTowardClose(!!res.session_meta?.directive?.move_toward_close);
      setBrandCompliance(res.evaluation?.brand_compliance || []);

      if (res.session_meta?.skills) {
        setActiveSimConfig((prev) => ({
          ...prev,
          skills: res.session_meta.skills,
          counterpartLabel: res.session_meta.counterpartLabel || prev?.counterpartLabel,
          traineeLabel: res.session_meta.traineeLabel || prev?.traineeLabel,
        }));
      }
    } catch (e) {
      setError(e.message);
      setTyping(false);
    } finally {
      setSending(false);
      setAnalyzing(false);
    }
  };

  const handleEndSession = async () => {
    if (!sessionId) return;
    try {
      const res = await taiCompleteSession(token, sessionId);
      setCompleteData({
        ...res,
        skills: res.skills || activeSimConfig?.skills,
      });
      setPhase("complete");
    } catch (e) {
      setError(e.message);
    }
  };

  const resetSetup = () => {
    setPhase("setup");
    setSessionId(null);
    setMessages([]);
    setPersona(null);
    setCompleteData(null);
    setCoachingNote(null);
    setActiveSimConfig(null);
    setInput("");
  };

  const simLabel = simTypesInfo?.types?.find((t) => t.key === selectedSimType)?.label || "Training AI";
  const simDescription = simTypesInfo?.types?.find((t) => t.key === selectedSimType)?.description || "";

  if (phase === "manager") {
    return (
      <ManagerDashboard
        data={teamData}
        onSelectUser={(id) => loadTrainee(id)}
        onBack={() => setPhase("setup")}
      />
    );
  }

  if (phase === "trainee") {
    return (
      <TraineeDetail
        data={traineeData}
        onBack={loadTeam}
      />
    );
  }

  return (
    <div className="tai-root">
      <div className="tai-toolbar">
        <div>
          <h2 style={{ margin: 0 }}>Training AI</h2>
          <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "4px 0 0" }}>
            {activeSimConfig
              ? `${activeSimConfig.traineeLabel} simulation in progress`
              : simLabel
                ? `${simLabel}`
                : "Agentic role-based simulator"}
          </p>
        </div>
        <div className="tai-toolbar-actions">
          {isAdmin ? (
            <button type="button" className="btn-sm" onClick={() => setPhase(phase === "guidelines" ? "setup" : "guidelines")}>
              {phase === "guidelines" ? "Back to training" : "Training guidelines"}
            </button>
          ) : null}
          {isManager ? (
            <button type="button" className="btn-sm" onClick={loadTeam}>
              Team dashboard
            </button>
          ) : null}
        </div>
      </div>

      {error ? (
        <div className="error-banner">
          {error}
          <button type="button" className="btn-sm" style={{ marginLeft: 8 }} onClick={() => setError("")}>
            Dismiss
          </button>
        </div>
      ) : null}

      {phase === "guidelines" && isAdmin ? (
        <GuidelinesManager token={token} />
      ) : null}

      {phase === "setup" ? (
        <SessionSetup
          properties={properties}
          propertyId={propertyId}
          setPropertyId={setPropertyId}
          onStart={handleStart}
          starting={starting}
          error={null}
          simTypesInfo={simTypesInfo}
          selectedSimType={selectedSimType}
          setSelectedSimType={setSelectedSimType}
        />
      ) : null}

      {phase === "sim" ? (
        <>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
            <button type="button" className="btn-sm" onClick={handleEndSession}>
              End session
            </button>
            <button type="button" className="btn-sm" onClick={resetSetup}>
              Cancel
            </button>
          </div>
          <div className="tai-layout">
            <SimulationChat
              messages={messages}
              input={input}
              setInput={setInput}
              onSend={handleSend}
              sending={sending}
              typing={typing}
              propertyName={propertyName}
              counterpartLabel={activeSimConfig?.counterpartLabel || "Prospect"}
            />
            <CoachingSidebar
              persona={persona}
              skillSnapshot={skillSnapshot}
              coachingNote={coachingNote}
              avgScore={avgScore}
              turnCount={turnCount}
              moveTowardClose={moveTowardClose}
              analyzing={analyzing}
              skills={activeSimConfig?.skills}
              traineeLabel={activeSimConfig?.traineeLabel}
              brandCompliance={brandCompliance}
            />
          </div>
        </>
      ) : null}

      {phase === "complete" && completeData ? (
        <SessionComplete
          readiness={completeData.readiness}
          overallScore={completeData.overall_score}
          skillSnapshot={completeData.skill_snapshot}
          skills={completeData.skills}
          onTrainAgain={resetSetup}
          onClose={resetSetup}
        />
      ) : null}
    </div>
  );
}
