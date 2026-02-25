import { exec } from 'node:child_process';
import { SchemaType } from '@google/generative-ai';
import { BaseTool } from './base.js';
import type { ToolDefinition } from './base.js';
import { getProjectRoot } from '../utils/path-resolver.js';

export class RunShellCommandTool extends BaseTool {
    get definition(): ToolDefinition {
        return {
            name: "run_shell_command",
            description: "Executes a shell command within the project root. Use this to run tests, build the project, or manage dependencies.",
            parameters: {
                type: SchemaType.OBJECT,
                properties: {
                    command: {
                        type: SchemaType.STRING,
                        description: "The full shell command to execute (e.g., 'npm test')."
                    },
                    timeout: {
                        type: SchemaType.NUMBER,
                        description: "Optional: Execution timeout in milliseconds (default: 60000)."
                    }
                },
                required: ["command"]
            }
        };
    }

    async execute(args: { command: string, timeout?: number }): Promise<string> {
        const { command, timeout = 60000 } = args;
        const projectRoot = getProjectRoot();

        console.log(`💻 Executing Shell Command: ${command} (Timeout: ${timeout}ms)`);

        return new Promise((resolve) => {
            exec(command, { 
                cwd: projectRoot, 
                timeout: timeout,
                maxBuffer: 1024 * 1024 * 10 // 10MB
            }, (error, stdout, stderr) => {
                const result = {
                    exitCode: error ? error.code : 0,
                    stdout: stdout.trim(),
                    stderr: stderr.trim(),
                    error: error ? error.message : null
                };

                const output = `--- COMMAND RESULT ---
Exit Code: ${result.exitCode}
STDOUT:
${result.stdout || '(empty)'}
STDERR:
${result.stderr || '(empty)'}
${result.error ? `ERROR: ${result.error}` : ''}
----------------------`;

                resolve(output);
            });
        });
    }

    get guidance(): string {
        return "This is a powerful tool. Use it to verify your changes by running existing tests or creating new ones. Always check the 'Exit Code'—a code of 0 usually means success. If you are installing dependencies, ensure you are in the correct directory.";
    }
}
