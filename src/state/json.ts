import fs from 'node:fs/promises';
import path from 'node:path';
import { BaseStateManager } from './base.ts';
import type { WorkflowState, WorkflowHistoryEntry } from './base.ts';

export class JsonStateManager extends BaseStateManager {
    private filePath: string;

    constructor(filePath: string) {
        super();
        this.filePath = filePath;
    }

    private async readState(): Promise<Record<string, WorkflowState>> {
        try {
            const content = await fs.readFile(this.filePath, 'utf8');
            return JSON.parse(content);
        } catch (error: any) {
            if (error.code === 'ENOENT') {
                return {};
            }
            throw error;
        }
    }

    private async writeState(state: Record<string, WorkflowState>): Promise<void> {
        await fs.mkdir(path.dirname(this.filePath), { recursive: true });
        await fs.writeFile(this.filePath, JSON.stringify(state, null, 2));
    }

    async initializeWorkflow(state: Omit<WorkflowState, 'history' | 'updatedAt'>): Promise<void> {
        const workflows = await this.readState();
        const newState: WorkflowState = {
            ...state,
            history: [],
            updatedAt: new Date().toISOString()
        };
        workflows[state.featureId] = newState;
        await this.writeState(workflows);
    }

    async updateWorkflow(featureId: string, updates: Partial<Omit<WorkflowState, 'featureId' | 'history'>>, historyEntry?: WorkflowHistoryEntry): Promise<void> {
        const workflows = await this.readState();
        const workflow = workflows[featureId];
        if (!workflow) {
            throw new Error(`Workflow not found: ${featureId}`);
        }

        const updatedWorkflow: WorkflowState = {
            ...workflow,
            ...updates,
            updatedAt: new Date().toISOString()
        };

        if (historyEntry) {
            updatedWorkflow.history.push(historyEntry);
        }

        workflows[featureId] = updatedWorkflow;
        await this.writeState(workflows);
    }

    async getWorkflow(featureId: string): Promise<WorkflowState | null> {
        const workflows = await this.readState();
        return workflows[featureId] || null;
    }

    async listWorkflows(): Promise<WorkflowState[]> {
        const workflows = await this.readState();
        return Object.values(workflows);
    }
}
