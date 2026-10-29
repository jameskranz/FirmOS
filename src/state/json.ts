import fs from 'node:fs/promises';
import path from 'node:path';
import { 
    BaseStateManager, 
    IWorkflowRepository, 
    ITicketRepository, 
    IRoleRepository, 
    IDirectiveRepository, 
    IReviewRepository, 
    IProjectConfigRepository, 
    ICeoMemoryRepository,
    IAuditLogRepository
} from './base.js';

import { JsonWorkflowRepository } from './repositories/json-workflow.js';
import { JsonTicketRepository } from './repositories/json-ticket.js';
import { JsonRoleRepository } from './repositories/json-role.js';
import { JsonDirectiveRepository } from './repositories/json-directive.js';
import { JsonReviewRepository } from './repositories/json-review.js';
import { JsonProjectConfigRepository } from './repositories/json-config.js';
import { JsonCeoMemoryRepository } from './repositories/json-ceo.js';
import { JsonAuditLogRepository } from './repositories/json-audit.js';

export class JsonStateManager extends BaseStateManager {
    private baseDir: string;

    public workflows: IWorkflowRepository;
    public tickets: ITicketRepository;
    public roles: IRoleRepository;
    public directives: IDirectiveRepository;
    public reviews: IReviewRepository;
    public config: IProjectConfigRepository;
    public ceoMemory: ICeoMemoryRepository;
    public auditLogs: IAuditLogRepository;

    constructor(filePath: string, projectId: string = 'default') {
        super(projectId);
        // We use the directory of the provided state file as our base for all json stores
        this.baseDir = path.dirname(filePath);
        
        this.workflows = new JsonWorkflowRepository(filePath);
        this.tickets = new JsonTicketRepository(path.join(this.baseDir, '.firmos-tickets.json'));
        this.roles = new JsonRoleRepository(path.join(this.baseDir, '.firmos-roles.json'));
        this.directives = new JsonDirectiveRepository(path.join(this.baseDir, '.firmos-directives.json'));
        this.reviews = new JsonReviewRepository(path.join(this.baseDir, '.firmos-reviews.json'));
        this.config = new JsonProjectConfigRepository(path.join(this.baseDir, '.firmos-config.json'));
        this.ceoMemory = new JsonCeoMemoryRepository(path.join(this.baseDir, '.firmos-ceo.json'));
        this.auditLogs = new JsonAuditLogRepository(path.join(this.baseDir, '.firmos-audit.json'));
    }

    async purgeProjectData(): Promise<void> {
        const files = [
            '.firmos-state.json',
            '.firmos-tickets.json',
            '.firmos-roles.json',
            '.firmos-directives.json',
            '.firmos-reviews.json',
            '.firmos-config.json',
            '.firmos-ceo.json',
            '.firmos-audit.json'
        ];
        for (const file of files) {
            try {
                await fs.unlink(path.join(this.baseDir, file));
            } catch (e) {}
        }
    }
}
