import { SaveFileTool } from './save-file.js';
import { ReplaceInFileTool } from './replace-in-file.js';
import { HireAgentTool } from './hire-agent.js';
import { ReadFileTool } from './read-file.js';
import { ListDirectoryTool } from './list-directory.js';
import { PublishMessageTool } from './publish-message.js';
import { 
    InitializeFeatureWorkTool, 
    AddFeatureNoteTool, 
    ReadFeatureWorkTool 
} from './workbook-tools.js';
import { SubmitForReviewTool } from './submit-for-review.js';
import { SubmitFeedbackTool } from './submit-feedback.js';
import { SubmitForApprovalTool } from './submit-for-approval.js';
import { ListRolesTool } from './list-roles.js';
import { RequestHireTool } from './request-hire.js';
import { SubmitReviewResultTool } from './submit-review-result.js';
import { ReviewArtifactTool } from './review-artifact.js';
import { CreateTicketTool, AssignTicketTool, UpdateTicketTool, ListTicketsTool } from './ticket-tools.js';
import { ProvisionWorkerTool } from './provision-worker.js';
import { ListWorkersTool } from './list-workers.js';
import { TerminateWorkerTool } from './terminate-worker.js';
import { UpdateDirectivesTool } from './update-directives.js';
import { RunShellCommandTool } from './run-shell-command.js';
import type { Tool } from '@google/generative-ai';

export const allTools = [
    new SaveFileTool(),
    new ReplaceInFileTool(),
    new HireAgentTool(),
    new ReadFileTool(),
    new ListDirectoryTool(),
    new PublishMessageTool(),
    new InitializeFeatureWorkTool(),
    new AddFeatureNoteTool(),
    new ReadFeatureWorkTool(),
    new SubmitForReviewTool(),
    new SubmitFeedbackTool(),
    new SubmitForApprovalTool(),
    new ListRolesTool(),
    new RequestHireTool(),
    new SubmitReviewResultTool(),
    new ReviewArtifactTool(),
    new CreateTicketTool(),
    new AssignTicketTool(),
    new UpdateTicketTool(),
    new ListTicketsTool(),
    new ProvisionWorkerTool(),
    new ListWorkersTool(),
    new TerminateWorkerTool(),
    new UpdateDirectivesTool(),
    new RunShellCommandTool()
];

export const firmOsTools: Tool = {
    functionDeclarations: allTools.map(t => t.definition)
};

export * from './base.js';
export * from './save-file.js';
export * from './replace-in-file.js';
export * from './hire-agent.js';
export * from './read-file.js';
export * from './list-directory.js';
export * from './publish-message.js';
export * from './workbook-tools.js';
export * from './submit-for-review.js';
export * from './submit-feedback.js';
export * from './submit-for-approval.js';
export * from './list-roles.js';
export * from './request-hire.js';
export * from './submit-review-result.js';
export * from './review-artifact.js';
export * from './ticket-tools.js';
export * from './provision-worker.js';
export * from './list-workers.js';
export * from './terminate-worker.js';
export * from './update-directives.js';
export * from './run-shell-command.js';
