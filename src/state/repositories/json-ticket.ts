import fs from 'node:fs/promises';
import path from 'node:path';
import { ITicketRepository, Ticket } from '../base.js';
import { randomUUID } from 'node:crypto';

export class JsonTicketRepository implements ITicketRepository {
    constructor(private filePath: string) {}

    private async readTickets(): Promise<Record<string, Ticket>> {
        try {
            const content = await fs.readFile(this.filePath, 'utf8');
            return JSON.parse(content);
        } catch (error: any) {
            if (error.code === 'ENOENT') return {};
            throw error;
        }
    }

    private async writeTickets(tickets: Record<string, Ticket>): Promise<void> {
        await fs.mkdir(path.dirname(this.filePath), { recursive: true });
        await fs.writeFile(this.filePath, JSON.stringify(tickets, null, 2));
    }

    async create(ticketData: Omit<Ticket, 'id' | 'created' | 'updated' | 'status'>): Promise<string> {
        const tickets = await this.readTickets();
        const id = randomUUID();
        const now = new Date().toISOString();
        tickets[id] = { 
            id, 
            ...ticketData, 
            status: 'Open', 
            created: now, 
            updated: now 
        };
        await this.writeTickets(tickets);
        return id;
    }

    async update(ticketId: string, updates: Partial<Omit<Ticket, 'id' | 'created'>>): Promise<void> {
        const tickets = await this.readTickets();
        if (!tickets[ticketId]) throw new Error(`Ticket not found: ${ticketId}`);
        
        tickets[ticketId] = { 
            ...tickets[ticketId], 
            ...updates, 
            updated: new Date().toISOString() 
        };
        await this.writeTickets(tickets);
    }

    async get(ticketId: string): Promise<Ticket | null> {
        const tickets = await this.readTickets();
        return tickets[ticketId] || null;
    }

    async list(parentId: string | null): Promise<Ticket[]> {
        const tickets = await this.readTickets();
        return Object.values(tickets).filter(t => t.parentId === parentId);
    }

    async listAll(): Promise<Ticket[]> {
        const tickets = await this.readTickets();
        return Object.values(tickets);
    }
}
