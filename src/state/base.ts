export type WorkflowStatus = 'drafting' | 'reviewing' | 'revising' | 'pending_approval' | 'completed';

export interface WorkflowHistoryEntry {
    timestamp: string;
    fromAgent: string;
    toAgent: string;
    action: string;
    note?: string;
}

export interface WorkflowState {
    featureId: string;
    featureName: string;
    currentAgent: string;
    status: WorkflowStatus;
    workbookPath: string;
    history: WorkflowHistoryEntry[];
    updatedAt: string;
}

export abstract class BaseStateManager {
    abstract initializeWorkflow(state: Omit<WorkflowState, 'history' | 'updatedAt'>): Promise<void>;
    abstract updateWorkflow(featureId: string, updates: Partial<Omit<WorkflowState, 'featureId' | 'history'>>, historyEntry?: WorkflowHistoryEntry): Promise<void>;
    abstract getWorkflow(featureId: string): Promise<WorkflowState | null>;
    abstract listWorkflows(): Promise<WorkflowState[]>;
}
