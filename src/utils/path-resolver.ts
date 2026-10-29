import fs from 'node:fs';
import path from 'node:path';

let PROJECT_ROOT = process.cwd();

/**
 * Validates that the current working directory is a valid FirmOS project.
 * Throws an error if no '.firmosrc' file is found.
 */
export function validateProjectRoot() {
    const cwd = process.cwd();
    const hasFirmosrc = fs.existsSync(path.join(cwd, '.firmosrc'));

    if (!hasFirmosrc) {
        throw new Error("FirmOS context not found. Please run this command from the root of a FirmOS project.");
    }
    PROJECT_ROOT = cwd;
}

/**
 * Returns the resolved PROJECT_ROOT.
 * Defaults to process.cwd() if validateProjectRoot has not been called.
 */
export function getProjectRoot() {
    return PROJECT_ROOT;
}

/**
 * Returns the directory for project artifacts (workbooks, PRDs).
 * Defaults to 'artifacts' but can be overridden by FIRMOS_ARTIFACTS_DIR env var.
 */
export function getArtifactsDir() {
    const defaultDir = path.join(getProjectRoot(), 'artifacts');
    return process.env.FIRMOS_ARTIFACTS_DIR || defaultDir;
}
