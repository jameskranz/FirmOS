import type { WorkflowStatus } from '../state/base.js';

export interface HandoffConfig {
    targetRole: string;
    nextStatus: WorkflowStatus;
    promptTemplate: (args: any) => string;
}

export class HandoffManager {
    private configs: Record<string, HandoffConfig> = {
        'submit_for_review': {
            targetRole: 'architect/review',
            nextStatus: 'reviewing',
            promptTemplate: (args) => `REVIEW REQUEST: Please review the feature '${args.featureName}' (${args.featureId}). 

Workbook: ${args.workbookPath}

Note: ${args.note || 'No additional notes provided.'}`
        },
        'submit_feedback': {
            targetRole: 'product/define',
            nextStatus: 'revising',
            promptTemplate: (args) => `FEEDBACK RECEIVED: Technical feedback has been submitted for feature '${args.featureId}'. 

Feedback: ${args.feedback}

Please revise the feature workbook and PRD as needed.`
        },
        'submit_for_approval': {
            targetRole: 'ceo',
            nextStatus: 'pending_approval',
            promptTemplate: (args) => `APPROVAL REQUEST: Feature '${args.featureName}' (${args.featureId}) is ready for final human approval. 

Workbook: ${args.workbookPath}

Summary: ${args.note || 'Ready for review.'}`
        }
    };

    getHandoffConfig(toolName: string, args?: any): HandoffConfig | null {
        const config = this.configs[toolName];
        if (!config) return null;

        // If a targetRole is explicitly provided in the tool arguments, override the default
        if (args && args.targetRole) {
            return {
                ...config,
                targetRole: args.targetRole
            };
        }

        return config;
    }
}
