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
  errorPath?: "continue" | "stop" | "branch";
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
}

export interface StepRunLog {
  nodeId: string;
  status: "pending" | "running" | "success" | "failure" | "skipped";
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  durationMs?: number;
  error?: string;
  startedAt?: string;
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
  }>;
  edges: Array<{
    id: string;
    source: string;
    target: string;
    label?: string;
    condition?: string;
  }>;
  dataSources: string[];
  triggers: string[];
}
