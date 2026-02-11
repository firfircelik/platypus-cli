export enum AgentState {
  IDLE = 'idle',
  STARTING = 'starting',
  RUNNING = 'running',
  PAUSED = 'paused',
  STOPPING = 'stopping',
  STOPPED = 'stopped',
  ERROR = 'error'
}

export enum AgentRole {
  FRONTEND_DEVELOPER = 'frontend-dev',
  BACKEND_DEVELOPER = 'backend-dev',
  FULLSTACK_DEVELOPER = 'fullstack-dev',
  DEVOPS_ENGINEER = 'devops',
  QA_TESTER = 'qa',
  PROJECT_MANAGER = 'pm',
  ARCHITECT = 'architect',
  SECURITY_SPECIALIST = 'security',
  DATA_ENGINEER = 'data-engineer'
}

export interface AgentConfig {
  id?: string
  name: string
  role: AgentRole
  capabilities: string[]
  model?: string
  temperature?: number
  maxTokens?: number
  sessionName?: string
  layout?: ScreenLayout
}

export interface Agent {
  id: string
  name: string
  role: AgentRole
  capabilities: string[]
  sessionId: string
  sessionName: string
  paneId: string
  state: AgentState
  context: SharedContext
  createdAt: Date
  updatedAt: Date
  lastActivity: Date
}

export interface AgentMessage {
  id: string
  from: string
  to: string | string[]
  type: 'request' | 'response' | 'broadcast' | 'notification'
  content: string
  metadata?: Record<string, unknown>
  timestamp: Date
}

export interface AgentAssignment {
  agentId: string
  task: Task
  status: 'pending' | 'in_progress' | 'completed' | 'failed'
  startedAt?: Date
  completedAt?: Date
  result?: unknown
  error?: Error
}

export interface Task {
  id: string
  description: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  type: string
  requirements: Record<string, unknown>
  dependencies: string[]
  estimatedDuration?: number
  timeout?: number
}

export interface SharedContext {
  projectRoot: string
  files: Map<string, FileState>
  dependencies: DependencyGraph
  configuration: ProjectConfig
  agentStates: Map<string, AgentState>
  variables: Map<string, unknown>
}

export interface FileState {
  path: string
  hash: string
  modifiedBy: string | null
  lockedBy: string | null
  lockedAt: Date | null
  version: number
}

export interface DependencyGraph {
  nodes: Map<string, DependencyNode>
  edges: Map<string, string[]>
}

export interface DependencyNode {
  name: string
  version: string
  type: 'package' | 'file' | 'module'
  dependencies: string[]
}

export interface ProjectConfig {
  name: string
  version: string
  language: string
  framework: string
  buildCommand: string
  testCommand: string
  startCommand: string
}

export enum ScreenLayout {
  DEV = 'dev',
  REVIEW = 'review',
  MONITOR = 'monitor',
  COLLABORATIVE = 'collaborative',
  CUSTOM = 'custom'
}

export interface SessionConfig {
  name: string
  layout: ScreenLayout
  panes: PaneConfig[]
  environment: Record<string, string>
}

export interface PaneConfig {
  id: string
  title: string
  command?: string
  size?: number
  focus: boolean
}

export interface SessionHandle {
  id: string
  name: string
  pid: number
  socketPath: string
  createdAt: Date
  active: boolean
}

export interface PaneHandle {
  id: string
  sessionId: string
  windowId: string
  index: number
  active: boolean
}

export interface Lock {
  id: string
  agentId: string
  filePath: string
  acquiredAt: Date
  expiresAt: Date | null
}

export interface ConflictResolution {
  type: 'merge' | 'override' | 'rename' | 'manual'
  resolvedBy: string
  resolvedAt: Date
  result: FileState
}

export interface FileConflict {
  id: string
  filePath: string
  agents: string[]
  changes: Map<string, string>
  detectedAt: Date
  resolution?: ConflictResolution
}

export interface AuditEntry {
  id: string
  agentId: string
  action: string
  resource: string
  details: Record<string, unknown>
  timestamp: Date
}
