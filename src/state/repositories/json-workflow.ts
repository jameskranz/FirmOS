import fs from 'node:fs/promises';
import path from 'node:path';
import { IWorkflowRepository, WorkflowState, WorkflowHistoryEntry } from '../base.js';

export class JsonWorkflowRepository implements IWorkflowRepository {
    constructor(private filePath: string) {}

    private async readState(): Promise<Record<string, WorkflowState>> {
        try {
            const content = await fs.readFile(this.filePath, 'utf8');
            return JSON.parse(content);
        } catch (error: any) {
            if (error.code === 'ENOENT') return {};
            throw error;
        }
    }

    private async writeState(state: Record<string, WorkflowState>): Promise<void> {
        await fs.mkdir(path.dirname(this.filePath), { recursive: true });
        await fs.writeFile(this.filePath, JSON.stringify(state, null, 2));
    }

    async initialize(state: Omit<WorkflowState, 'history' | 'updatedAt'>): Promise<void> {
        const workflows = await this.readState();
        workflows[state.featureId] = { 
            ...state, 
            approvals: {}, 
            history: [], 
            updatedAt: new Date().toISOString() 
        };
        await this.writeState(workflows);
    }

    async update(featureId: string, updates: Partial<Omit<WorkflowState, 'featureId' | 'history'>>, historyEntry?: WorkflowHistoryEntry): Promise<void> {
        const workflows = await this.readState();
        if (!workflows[featureId]) throw new Error(`Workflow not found: ${featureId}`);
        
        workflows[featureId] = { 
            ...workflows[featureId], 
            ...updates, 
            updatedAt: new Date().toISOString() 
        };
        
        if (historyEntry) workflows[featureId].history.push(historyEntry);
        await this.writeState(workflows);
    }

    async get(featureId: string): Promise<WorkflowState | null> {
        const workflows = await this.readState();
        return workflows[featureId] || null;
    }

    async list(): Promise<WorkflowState[]> {
        const workflows = await this.readState();
        return Object.values(workflows);
    }
}
