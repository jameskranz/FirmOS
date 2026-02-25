import blessed from 'blessed';
import contrib from 'blessed-contrib';

export function createLayout(screen: blessed.Widgets.Screen) {
    const grid = new contrib.grid({ rows: 12, cols: 12, screen: screen });

    // Left Column: Live Logs (8x6)
    const log = grid.set(0, 0, 8, 6, contrib.log, {
        fg: "green",
        selectedFg: "green",
        label: ' Swarm Logs ',
        border: { type: 'line', fg: 'cyan' },
        scrollbar: { ch: ' ', track: { bg: 'cyan' }, style: { inverse: true } }
    });

    // Middle Column: Tickets (8x3)
    const ticketList = grid.set(0, 6, 8, 3, blessed.list, {
        label: ' Tickets ',
        keys: true,
        vi: true,
        style: {
            selected: { bg: 'magenta' },
            border: { fg: 'magenta' }
        },
        border: { type: 'line' },
        scrollbar: { ch: ' ', track: { bg: 'magenta' }, style: { inverse: true } }
    });

    // Right Column: Sidebar (Status, Agents, CEO)
    // Top Right Status (1x3)
    const status = grid.set(0, 9, 1, 3, blessed.text, {
        label: ' Status ',
        content: ' RUNNING ',
        align: 'center',
        style: {
            fg: 'green',
            bold: true
        },
        border: { type: 'line', fg: 'white' }
    });

    // Top Right: Active Agents (3x3)
    const agentList = grid.set(1, 9, 3, 3, blessed.list, {
        label: ' Active Agents ',
        keys: true,
        vi: true,
        style: {
            selected: { bg: 'blue' },
            border: { fg: 'white' }
        },
        border: { type: 'line' }
    });

    // Bottom Right: CEO Inbox (HITL) (4x3)
    const hitlInbox = grid.set(4, 9, 4, 3, blessed.list, {
        label: ' CEO Inbox (HITL) ',
        keys: true,
        vi: true,
        style: {
            selected: { bg: 'red' },
            border: { fg: 'red' }
        },
        border: { type: 'line' }
    });

    // Bottom Left: Queue Monitor (2x12) - Shrunk to make room for input
    const queueMonitor = grid.set(8, 0, 2, 12, contrib.bar, {
        label: ' Queue Depth ',
        barWidth: 10,
        barSpacing: 4,
        xOffset: 0,
        maxHeight: 20,
        border: { type: 'line', fg: 'yellow' }
    });

    // Bottom: Input Bar (2x12)
    const inputBar = grid.set(10, 0, 2, 12, blessed.textbox, {
        label: ' Command Input (Press "i" to focus) ',
        keys: true,
        vi: true,
        inputOnFocus: true,
        style: {
            fg: 'white',
            bg: 'black',
            focus: { border: { fg: 'blue' } }
        },
        border: { type: 'line', fg: 'white' }
    });

    return { log, ticketList, status, agentList, hitlInbox, queueMonitor, inputBar };
}
