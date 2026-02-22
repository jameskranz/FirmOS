import type { WorkflowStatus } from '../state/base.ts';

export interface HandoffConfig {
    targetRole: string;
    nextStatus: WorkflowStatus;
    promptTemplate: (args: any) => string;
}

export class HandoffManager {
    private configs: Record<string, HandoffConfig> = {
        'submit_for_review': {
            targetRole: 'senior-systems-architect',
            nextStatus: 'reviewing',
            promptTemplate: (args) => `REVIEW REQUEST: Please review the feature '${args.featureName}' (${args.featureId}). 

Workbook: ${args.workbookPath}

Note: ${args.note || 'No additional notes provided.'}`
        },
        'submit_feedback': {
            targetRole: 'product-manager',
            nextStatus: 'revising',
            promptTemplate: (args) => `FEEDBACK RECEIVED: Technical feedback has been submitted for feature '${args.featureId}'. 

Feedback: ${args.feedback}

Please revise the feature workbook and PRD as needed.`
        },
        'submit_for_approval': {
            targetRole: 'human',
            nextStatus: 'pending_approval',
            promptTemplate: (args) => `APPROVAL REQUEST: Feature '${args.featureName}' (${args.featureId}) is ready for final human approval. 

Workbook: ${args.workbookPath}

Summary: ${args.note || 'Ready for review.'}`
        }
    };

    getHandoffConfig(toolName: string): HandoffConfig | null {
        return this.configs[toolName] || null;
    }
}
