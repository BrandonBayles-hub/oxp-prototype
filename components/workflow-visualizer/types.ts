export interface WorkflowNodeData {
  type: "trigger" | "condition" | "action" | "loop" | "delay" | "end";
  label: string;
  description: string;
  mcpTool?: string;
  mcpServer?: string;
  config?: Record<string, string>;
  retryPolicy?: RetryPolicy;
  timeout?: number;
  inputMappings?: FieldMapping[];
  outputFields?: OutputField[];
  /** Behavior when this step fails after retries are exhausted. */
  errorPath?: "continue" | "stop" | "branch";
  /**
   * When errorPath === "branch", the dedicated on-error target node id.
   * An edge with label "on-error" is also created in the graph.
   */
  errorTargetId?: string;
}

export interface RetryPolicy {
  maxRetries: number;
  backoffMs: number;
  backoffMultiplier: number;
}

export interface FieldMapping {
  targetField: string;
  sourceNodeId: string;
  sourceField: string;
  expression?: string;
}

export interface OutputField {
  name: string;
  type: "string" | "number" | "boolean" | "object" | "array";
  sample?: string;
  description?: string;
}

export interface StepRunLog {
  nodeId: string;
  status: "pending" | "running" | "success" | "failure" | "skipped" | "error_handled";
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  durationMs?: number;
  error?: string;
  errorCode?: string;
  startedAt?: string;
  /** Resolved formula previews for mapped parameters. */
  resolvedInputs?: Record<string, unknown>;
}

export interface ExecutionRun {
  id: string;
  status: "running" | "success" | "failure" | "timeout";
  startedAt: string;
  endedAt?: string;
  trigger: string;
  environment: "sandbox" | "production";
  steps: StepRunLog[];
}

export interface GeneratedWorkflow {
  id?: string;
  name: string;
  description: string;
  nodes: Array<{
    id: string;
    type: WorkflowNodeData["type"];
    label: string;
    description: string;
    mcpTool?: string;
    mcpServer?: string;
    config?: Record<string, string>;
    retryPolicy?: RetryPolicy;
    timeout?: number;
    inputMappings?: FieldMapping[];
    outputFields?: OutputField[];
    errorPath?: "continue" | "stop" | "branch";
    errorTargetId?: string;
  }>;
  edges: Array<{
    id: string;
    source: string;
    target: string;
    label?: string;
    condition?: string;
    /** Marks this as an on-error branch edge */
    isErrorPath?: boolean;
  }>;
  dataSources: string[];
  triggers: string[];
}
