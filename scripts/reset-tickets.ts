import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function resetTickets() {
    const ticketsFile = path.join(__dirname, '..', 'company', 'state', 'tickets.json');

    try {
        if (await fs.stat(ticketsFile).catch(() => null)) {
            await fs.writeFile(ticketsFile, '{}');
            console.log('🗑️  Cleared: tickets.json');
        } else {
            console.log('✅ Tickets file does not exist, nothing to reset.');
        }
    } catch (error: any) {
        console.error('❌ Failed to reset tickets:', error.message);
        process.exit(1);
    }
}

resetTickets();
