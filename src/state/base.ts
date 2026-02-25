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
    repositoryUrl?: string;
    approvals: Record<string, { approved: boolean, timestamp: string, note?: string }>;
    history: WorkflowHistoryEntry[];
    updatedAt: string;
}

export interface Ticket {
    id: string;
    parentId: string | null;
    title: string;
    description: string;
    requirements?: string;
    repositoryUrl?: string;
    status: 'Open' | 'In Progress' | 'Blocked' | 'Done';
    assignedRole?: string;
    outputArtifact?: string;
    created: string;
    updated: string;
}

export interface Role {
    roleName: string;
    description: string;
    slaContent: string;
    modelTier: string;
    managerRole?: string;
    allowedTools?: string[];
    updatedAt: string;
}

export interface CeoInteraction {
    id: string;
    projectId: string;
    originalPrompt: string;
    ceoResponse: string;
    timestamp: string;
}

export abstract class BaseStateManager {
    protected projectId: string;

    constructor(projectId: string = 'default') {
        this.projectId = projectId;
    }

    abstract initializeWorkflow(state: Omit<WorkflowState, 'history' | 'updatedAt'>): Promise<void>;
    abstract updateWorkflow(featureId: string, updates: Partial<Omit<WorkflowState, 'featureId' | 'history'>>, historyEntry?: WorkflowHistoryEntry): Promise<void>;
    abstract getWorkflow(featureId: string): Promise<WorkflowState | null>;
    abstract listWorkflows(): Promise<WorkflowState[]>;

    // Ticket Management
    abstract createTicket(ticket: Omit<Ticket, 'id' | 'created' | 'updated' | 'status'>): Promise<string>;
    abstract updateTicket(ticketId: string, updates: Partial<Omit<Ticket, 'id' | 'created'>>): Promise<void>;
    abstract getTicket(ticketId: string): Promise<Ticket | null>;
    abstract listTickets(parentId: string | null): Promise<Ticket[]>;
    abstract listAllTickets(): Promise<Ticket[]>;

    // Role Management
    abstract upsertRole(role: Omit<Role, 'updatedAt'>): Promise<void>;
    abstract getRole(roleName: string): Promise<Role | null>;
    abstract listRoles(): Promise<Role[]>;

    // CEO Memory
    abstract logCeoInteraction(prompt: string, response: string): Promise<void>;
    abstract listCeoInteractions(): Promise<CeoInteraction[]>;

    // Directives
    abstract upsertDirective(roleName: string, content: string): Promise<void>;
    abstract getDirective(roleName: string): Promise<string | null>;

    // Cleanup
    abstract purgeProjectData(): Promise<void>;
}
