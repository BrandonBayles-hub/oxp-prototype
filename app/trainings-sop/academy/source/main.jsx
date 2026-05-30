import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./styles.css";

class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error, info) { console.error("React error boundary:", error, info); }
  render() {
    if (this.state.error) {
      return <div style={{ padding: 40, fontFamily: "monospace" }}>
        <h2 style={{ color: "red" }}>Something went wrong</h2>
        <pre style={{ whiteSpace: "pre-wrap", fontSize: 13 }}>{this.state.error.message}</pre>
        <pre style={{ whiteSpace: "pre-wrap", fontSize: 11, color: "#666" }}>{this.state.error.stack}</pre>
        <button onClick={() => window.location.reload()} style={{ marginTop: 12 }}>Reload</button>
      </div>;
    }
    return this.props.children;
  }
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
