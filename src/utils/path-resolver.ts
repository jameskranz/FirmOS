import fs from 'node:fs';
import path from 'node:path';

let PROJECT_ROOT = process.cwd();

/**
 * Validates that the current working directory is a valid FirmOS project.
 * Throws an error if no 'conductor/' directory or '.firmosrc' file is found.
 */
export function validateProjectRoot() {
    const cwd = process.cwd();
    const hasConductor = fs.existsSync(path.join(cwd, 'conductor'));
    const hasFirmosrc = fs.existsSync(path.join(cwd, '.firmosrc'));

    if (!hasConductor && !hasFirmosrc) {
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
