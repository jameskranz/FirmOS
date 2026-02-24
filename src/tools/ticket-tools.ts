import amqp from 'amqplib';
import { SchemaType } from '@google/generative-ai';
import { BaseTool } from './base.js';
import type { ToolDefinition } from './base.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { JsonStateManager } from '../state/json.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class CreateTicketTool extends BaseTool {
    private getProjectRoot(): string {
        return process.env.TARGET_WORKSPACE || (__dirname.includes(path.join('dist', 'src'))
            ? path.resolve(__dirname, '..', '..', '..')
            : path.resolve(__dirname, '..', '..'));
    }

    get definition(): ToolDefinition {
        return {
            name: "create_ticket",
            description: "Creates a new unassigned ticket (work item). Use this to define WHAT needs to be done before deciding WHO should do it.",
            parameters: {
                type: SchemaType.OBJECT,
                properties: {
                    title: { type: SchemaType.STRING, description: "Short title of the task." },
                    description: { type: SchemaType.STRING, description: "Detailed description of the work required." },
                    requirements: { type: SchemaType.STRING, description: "Optional: Technical skills or criteria needed for this task." },
                    parentId: { type: SchemaType.STRING, description: "Optional: The ID of the parent ticket this task belongs to." }
                },
                required: ["title", "description"]
            }
        };
    }

    async execute(args: { title: string, description: string, requirements?: string, parentId?: string }): Promise<string> {
        const stateFile = path.join(this.getProjectRoot(), 'company', 'state', 'workflows.json');
        const stateManager = new JsonStateManager(stateFile);

        const ticketId = await stateManager.createTicket({
            title: args.title,
            description: args.description,
            requirements: args.requirements,
            parentId: args.parentId || null
        });
        
        console.log(`🎫 Executed Tool: create_ticket -> Created Ticket [${ticketId}]`);
        return `Successfully created ticket '${args.title}' (ID: ${ticketId}). It is currently unassigned.`;
    }

    get guidance(): string {
        return "Use this tool to break down goals into specific work items. You don't need to specify a role yet. Focus on the requirements and description. This allows the HR/Recruiter department to find the best match for the task.";
    }
}

export class AssignTicketTool extends BaseTool {
    private getProjectRoot(): string {
        return process.env.TARGET_WORKSPACE || (__dirname.includes(path.join('dist', 'src'))
            ? path.resolve(__dirname, '..', '..', '..')
            : path.resolve(__dirname, '..', '..'));
    }

    get definition(): ToolDefinition {
        return {
            name: "assign_ticket",
            description: "Assigns an existing ticket to a role and triggers the work. This will publish the task to the agent's queue.",
            parameters: {
                type: SchemaType.OBJECT,
                properties: {
                    ticketId: { type: SchemaType.STRING, description: "The ID of the ticket to assign." },
                    assignedRole: { type: SchemaType.STRING, description: "The hierarchical role name (e.g., 'product/define')." }
                },
                required: ["ticketId", "assignedRole"]
            }
        };
    }

    async execute(args: { ticketId: string, assignedRole: string }): Promise<string> {
        const stateFile = path.join(this.getProjectRoot(), 'company', 'state', 'workflows.json');
        const stateManager = new JsonStateManager(stateFile);
        const QUEUE_NAME = 'task_routing';

        const ticket = await stateManager.getTicket(args.ticketId);
        if (!ticket) throw new Error(`Ticket not found: ${args.ticketId}`);

        await stateManager.updateTicket(args.ticketId, {
            assignedRole: args.assignedRole,
            status: 'Open'
        });

        // Trigger work via RabbitMQ
        try {
            const rabbitUrl = process.env.RABBITMQ_URL || 'amqp://localhost';
            const connection = await amqp.connect(rabbitUrl);
            const channel = await connection.createChannel();
            await channel.assertQueue(QUEUE_NAME, { durable: true });

            const taskPrompt = `TICKET ASSIGNED:
ID: ${ticket.id}
Title: ${ticket.title}
Description: ${ticket.description}
Requirements: ${ticket.requirements || 'N/A'}

Please use 'update_ticket' to mark this as 'In Progress' before you begin.`;

            const payload = JSON.stringify({ role: args.assignedRole, prompt: taskPrompt });
            channel.sendToQueue(QUEUE_NAME, Buffer.from(payload), { persistent: true });

            await new Promise(r => setTimeout(r, 200));
            await connection.close();
            
            console.log(`🤝 Executed Tool: assign_ticket -> Assigned [${args.ticketId}] to [${args.assignedRole}]`);
            return `Successfully assigned ticket ${args.ticketId} to ${args.assignedRole} and dispatched the task.`;
        } catch (err: any) {
            throw new Error(`Failed to dispatch assigned ticket: ${err.message}`);
        }
    }

    get guidance(): string {
        return "Use this tool only when you are certain which role should handle a ticket. If you are unsure, leave the ticket unassigned for the Recruiter/HR to handle. This tool officially starts the micro-loop for the assigned agent.";
    }
}

export class UpdateTicketTool extends BaseTool {
    private getProjectRoot(): string {
        return process.env.TARGET_WORKSPACE || (__dirname.includes(path.join('dist', 'src'))
            ? path.resolve(__dirname, '..', '..', '..')
            : path.resolve(__dirname, '..', '..'));
    }

    get definition(): ToolDefinition {
        return {
            name: "update_ticket",
            description: "Updates the status or details of an existing ticket. Use this to mark progress or completion.",
            parameters: {
                type: SchemaType.OBJECT,
                properties: {
                    ticketId: { type: SchemaType.STRING, description: "The ID of the ticket to update." },
                    status: { type: SchemaType.STRING, description: "New status: 'Open', 'In Progress', 'Blocked', 'Done'." },
                    outputArtifact: { type: SchemaType.STRING, description: "Optional: Path to the artifact produced (e.g., 'company/work/feat-prd.md')." }
                },
                required: ["ticketId", "status"]
            }
        };
    }

    async execute(args: { ticketId: string, status: 'Open' | 'In Progress' | 'Blocked' | 'Done', outputArtifact?: string }): Promise<string> {
        const stateFile = path.join(this.getProjectRoot(), 'company', 'state', 'workflows.json');
        const stateManager = new JsonStateManager(stateFile);

        await stateManager.updateTicket(args.ticketId, {
            status: args.status,
            outputArtifact: args.outputArtifact
        });

        console.log(`🔄 Executed Tool: update_ticket -> Updated [${args.ticketId}] to ${args.status}`);
        return `Successfully updated ticket ${args.ticketId} to status '${args.status}'.`;
    }

    get guidance(): string {
        return "Use this tool to update the status of your assigned ticket. When you start work, mark it 'In Progress'. When finished, mark it 'Done' and provide the 'outputArtifact' path.";
    }
}

export class ListTicketsTool extends BaseTool {
    private getProjectRoot(): string {
        return process.env.TARGET_WORKSPACE || (__dirname.includes(path.join('dist', 'src'))
            ? path.resolve(__dirname, '..', '..', '..')
            : path.resolve(__dirname, '..', '..'));
    }

    get definition(): ToolDefinition {
        return {
            name: "list_tickets",
            description: "Lists tickets based on criteria. Use this to see your assigned work or check the status of child tickets.",
            parameters: {
                type: SchemaType.OBJECT,
                properties: {
                    parentId: { type: SchemaType.STRING, description: "Optional: List only children of this ticket ID." },
                    assignedRole: { type: SchemaType.STRING, description: "Optional: List tickets assigned to this role." },
                    status: { type: SchemaType.STRING, description: "Optional: Filter by status." }
                },
                required: []
            }
        };
    }

    async execute(args: { parentId?: string, assignedRole?: string, status?: string }): Promise<string> {
        const stateFile = path.join(this.getProjectRoot(), 'company', 'state', 'workflows.json');
        const stateManager = new JsonStateManager(stateFile);

        const tickets = await stateManager.listTickets(args.parentId !== undefined ? args.parentId : null);

        let filtered = tickets;
        if (args.assignedRole) {
            filtered = filtered.filter(t => t.assignedRole === args.assignedRole);
        }
        if (args.status) {
            filtered = filtered.filter(t => t.status === args.status);
        }

        if (filtered.length === 0) return "No tickets found matching criteria.";

        return JSON.stringify(filtered, null, 2);
    }

    get guidance(): string {
        return "Use this tool to maintain situational awareness. Managers use it to check if dependencies are 'Done'. Recruiter uses it to find tickets where assignedRole is missing.";
    }
}
