import fs from 'node:fs/promises';
import path from 'node:path';
import { BaseStateManager } from './base.js';
import type { WorkflowState, WorkflowHistoryEntry, Ticket, Role, CeoInteraction } from './base.js';
import { randomUUID } from 'node:crypto';

export class JsonStateManager extends BaseStateManager {
    private filePath: string;
    private ticketsFilePath: string;

    constructor(filePath: string, projectId: string = 'default') {
        super(projectId);
        this.filePath = filePath;
        this.ticketsFilePath = path.join(path.dirname(filePath), 'tickets.json');
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

    private async readTickets(): Promise<Record<string, Ticket>> {
        try {
            const content = await fs.readFile(this.ticketsFilePath, 'utf8');
            return JSON.parse(content);
        } catch (error: any) {
            if (error.code === 'ENOENT') {
                return {};
            }
            throw error;
        }
    }

    private async writeTickets(tickets: Record<string, Ticket>): Promise<void> {
        await fs.mkdir(path.dirname(this.ticketsFilePath), { recursive: true });
        await fs.writeFile(this.ticketsFilePath, JSON.stringify(tickets, null, 2));
    }

    async initializeWorkflow(state: Omit<WorkflowState, 'history' | 'updatedAt'>): Promise<void> {
        const workflows = await this.readState();
        const newState: WorkflowState = {
            ...state,
            approvals: {},
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

    // Ticket Management Implementation
    async createTicket(ticketData: Omit<Ticket, 'id' | 'created' | 'updated' | 'status'>): Promise<string> {
        const tickets = await this.readTickets();
        const id = randomUUID();
        const now = new Date().toISOString();
        
        const newTicket: Ticket = {
            id,
            ...ticketData,
            status: 'Open',
            created: now,
            updated: now
        };

        tickets[id] = newTicket;
        await this.writeTickets(tickets);
        return id;
    }

    async updateTicket(ticketId: string, updates: Partial<Omit<Ticket, 'id' | 'created'>>): Promise<void> {
        const tickets = await this.readTickets();
        const ticket = tickets[ticketId];
        if (!ticket) {
            throw new Error(`Ticket not found: ${ticketId}`);
        }

        const updatedTicket: Ticket = {
            ...ticket,
            ...updates,
            updated: new Date().toISOString()
        };

        tickets[ticketId] = updatedTicket;
        await this.writeTickets(tickets);
    }

    async getTicket(ticketId: string): Promise<Ticket | null> {
        const tickets = await this.readTickets();
        return tickets[ticketId] || null;
    }

    async listTickets(parentId: string | null): Promise<Ticket[]> {
        const tickets = await this.readTickets();
        const allTickets = Object.values(tickets);
        
        if (parentId === null) {
            // List root tickets (those with no parent)
            return allTickets.filter(t => t.parentId === null);
        } else {
            // List children of a specific parent
            return allTickets.filter(t => t.parentId === parentId);
        }
    }

    async listAllTickets(): Promise<Ticket[]> {
        const tickets = await this.readTickets();
        return Object.values(tickets);
    }

    // Role Management (Stub/Legacy Sync handled by tools for JSON)
    async upsertRole(role: Omit<Role, 'updatedAt'>): Promise<void> {
        // Legacy tools already write to role-registry.json
    }

    async getRole(roleName: string): Promise<Role | null> {
        return null;
    }

    async listRoles(): Promise<Role[]> {
        return [];
    }

    // CEO Memory
    async logCeoInteraction(prompt: string, response: string): Promise<void> {
        // Not implemented for JSON state
    }

    async listCeoInteractions(): Promise<CeoInteraction[]> {
        return [];
    }

    // Directives
    async upsertDirective(roleName: string, content: string): Promise<void> {
        // Not implemented for JSON state
    }

    async getDirective(roleName: string): Promise<string | null> {
        return null;
    }

    async purgeProjectData(): Promise<void> {
        // Not implemented for JSON state
    }
}
