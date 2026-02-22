import { SaveFileTool } from './save-file.ts';
import { ReplaceInFileTool } from './replace-in-file.ts';
import { HireAgentTool } from './hire-agent.ts';
import { ReadFileTool } from './read-file.ts';
import { ListDirectoryTool } from './list-directory.ts';
import { PublishMessageTool } from './publish-message.ts';
import { 
    InitializeFeatureWorkTool, 
    AddFeatureNoteTool, 
    ReadFeatureWorkTool 
} from './workbook-tools.ts';
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
    new ReadFeatureWorkTool()
];

export const firmOsTools: Tool = {
    functionDeclarations: allTools.map(t => t.definition)
};

export * from './base.ts';
export * from './save-file.ts';
export * from './replace-in-file.ts';
export * from './hire-agent.ts';
export * from './read-file.ts';
export * from './list-directory.ts';
export * from './publish-message.ts';
export * from './workbook-tools.ts';
