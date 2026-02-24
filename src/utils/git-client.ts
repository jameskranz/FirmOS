import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import fs from 'node:fs/promises';

const execAsync = promisify(exec);

export class GitClient {
    private workingDir: string;

    constructor(workingDir: string) {
        this.workingDir = workingDir;
    }

    /**
     * Executes a git command in the working directory.
     */
    async run(command: string): Promise<{ stdout: string, stderr: string }> {
        try {
            const { stdout, stderr } = await execAsync(`git ${command}`, {
                cwd: this.workingDir
            });
            return { stdout, stderr };
        } catch (err: any) {
            throw new Error(`Git command failed: git ${command}
Error: ${err.message}`);
        }
    }

    async clone(repoUrl: string): Promise<void> {
        // Clone into the working directory itself if it's empty, or a subdirectory?
        // Standard for runners is to have a clean /workspace and clone there.
        // We assume workingDir is the PARENT of where we want the repo, or the repo root.
        // Let's assume we clone INTO the workingDir.
        
        // Ensure directory exists
        await fs.mkdir(this.workingDir, { recursive: true });
        
        try {
            await execAsync(`git clone ${repoUrl} .`, { cwd: this.workingDir });
            console.log(`✅ Cloned ${repoUrl} into ${this.workingDir}`);
        } catch (err: any) {
            throw new Error(`Failed to clone ${repoUrl}: ${err.message}`);
        }
    }

    async checkout(branchName: string, create: boolean = false): Promise<void> {
        const cmd = create ? `checkout -b ${branchName}` : `checkout ${branchName}`;
        await this.run(cmd);
        console.log(`✅ Checked out branch ${branchName}`);
    }

    async commit(message: string): Promise<void> {
        await this.run('add .');
        await this.run(`commit -m "${message}"`);
        console.log(`✅ Committed changes: ${message}`);
    }

    async push(remote: string = 'origin', branchName?: string): Promise<void> {
        const currentBranch = branchName || (await this.run('rev-parse --abbrev-ref HEAD')).stdout.trim();
        await this.run(`push ${remote} ${currentBranch}`);
        console.log(`✅ Pushed ${currentBranch} to ${remote}`);
    }

    async pull(remote: string = 'origin', branchName: string = 'main'): Promise<void> {
        await this.run(`pull ${remote} ${branchName}`);
        console.log(`✅ Pulled ${branchName} from ${remote}`);
    }
}
