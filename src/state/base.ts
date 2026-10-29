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

export interface ArtifactReview {
    id: string;
    projectId: string;
    featureId: string;
    artifactType: string;
    versionNumber: number;
    contentSnapshot: string;
    reviewerRole: string;
    status: 'approved' | 'revisions_needed';
    note?: string;
    timestamp: string;
}

// --- Specialized Repositories ---

export interface IWorkflowRepository {
    initialize(state: Omit<WorkflowState, 'history' | 'updatedAt'>): Promise<void>;
    update(featureId: string, updates: Partial<Omit<WorkflowState, 'featureId' | 'history'>>, historyEntry?: WorkflowHistoryEntry): Promise<void>;
    get(featureId: string): Promise<WorkflowState | null>;
    list(): Promise<WorkflowState[]>;
}

export interface ITicketRepository {
    create(ticket: Omit<Ticket, 'id' | 'created' | 'updated' | 'status'>): Promise<string>;
    update(ticketId: string, updates: Partial<Omit<Ticket, 'id' | 'created'>>): Promise<void>;
    get(ticketId: string): Promise<Ticket | null>;
    list(parentId: string | null): Promise<Ticket[]>;
    listAll(): Promise<Ticket[]>;
}

export interface IRoleRepository {
    upsert(role: Omit<Role, 'updatedAt'>): Promise<void>;
    get(roleName: string): Promise<Role | null>;
    list(): Promise<Role[]>;
    
    // Tier Management
    upsertTier(tierName: string, modelName: string): Promise<void>;
    getTier(tierName: string): Promise<string | null>;
    listTiers(): Promise<Record<string, string>>;
}

export interface IDirectiveRepository {
    upsert(roleName: string, content: string, updatedBy?: string, reason?: string): Promise<void>;
    get(roleName: string): Promise<string | null>;
    listHistory(roleName: string): Promise<any[]>;
}

export interface IReviewRepository {
    record(featureId: string, artifactType: string, contentSnapshot: string, reviewerRole: string, status: string, note?: string): Promise<void>;
    list(featureId: string): Promise<ArtifactReview[]>;
    getLatestApproved(featureId: string, artifactType: string): Promise<string | null>;
}

export interface IProjectConfigRepository {
    upsert(key: string, value: string): Promise<void>;
    get(key: string): Promise<string | null>;
}

export interface ICeoMemoryRepository {
    log(prompt: string, response: string): Promise<void>;
    list(): Promise<CeoInteraction[]>;
}

export interface IAuditLogRepository {
    log(eventType: string, eventName: string, details?: any): Promise<void>;
    list(eventType?: string): Promise<any[]>;
}

// --- Container for all repositories ---
export abstract class BaseStateManager {
    protected projectId: string;
    
    constructor(projectId: string = 'default') {
        this.projectId = projectId;
    }

    abstract workflows: IWorkflowRepository;
    abstract tickets: ITicketRepository;
    abstract roles: IRoleRepository;
    abstract directives: IDirectiveRepository;
    abstract reviews: IReviewRepository;
    abstract config: IProjectConfigRepository;
    abstract ceoMemory: ICeoMemoryRepository;
    abstract auditLogs: IAuditLogRepository;

    // Cleanup
    abstract purgeProjectData(): Promise<void>;
}
