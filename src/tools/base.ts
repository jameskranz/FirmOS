import { SchemaType } from '@google/generative-ai';

export type ToolDefinition = {
    name: string;
    description: string;
    parameters: {
        type: SchemaType;
        properties: Record<string, any>;
        required: string[];
    };
}

export abstract class BaseTool {
    abstract get definition(): ToolDefinition;
    abstract execute(args: any): Promise<string | void>;
}
