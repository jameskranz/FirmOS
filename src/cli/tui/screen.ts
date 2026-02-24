import blessed from 'blessed';
import { createLayout } from './layout.js';
import { eventBus, FirmOsEvent } from '../../utils/event-bus.js';

export function startTui() {
    const screen = blessed.screen({
        smartCSR: true,
        title: 'FirmOS - AI Swarm Orchestrator'
    });

    const panels = createLayout(screen);

    // Event Subscriptions
    eventBus.on(FirmOsEvent.LOG, (msg: string) => {
        const lines = msg.split('\n');
        lines.forEach(line => panels.log.log(line));
        screen.render();
    });

    eventBus.on(FirmOsEvent.AGENT_STARTED, ({ role, model }) => {
        panels.agentList.addItem(`${role} (${model})`);
        screen.render();
    });

    eventBus.on(FirmOsEvent.AGENT_FINISHED, ({ role }) => {
        // Find and remove (simple approach for now)
        const items = panels.agentList.getItems();
        const index = items.findIndex((item: any) => item.getContent().startsWith(role));
        if (index !== -1) {
            panels.agentList.removeItem(index);
        }
        screen.render();
    });

    const pendingRequests: any[] = [];

    eventBus.on(FirmOsEvent.CEO_REQUEST, (payload) => {
        pendingRequests.push(payload);
        if (panels.hitlInbox.getItem(0).getContent() === 'No pending requests') {
            panels.hitlInbox.clearItems();
        }
        panels.hitlInbox.addItem(`[${payload.role}] Review Requested`);
        screen.render();
    });

    // Handle selection in CEO Inbox
    panels.hitlInbox.on('select', (item: any, index: number) => {
        const payload = pendingRequests[index];
        if (!payload) return;

        const modal = blessed.form({
            parent: screen,
            keys: true,
            left: 'center',
            top: 'center',
            width: '80%',
            height: '80%',
            bg: 'black',
            border: { type: 'line', fg: 'red' as any },
            label: ` CEO Decision: ${payload.role} `
        });

        const promptText = blessed.text({
            parent: modal,
            top: 1,
            left: 2,
            width: '95%',
            height: '60%',
            content: `PROMPT:\n${payload.prompt}`,
            scrollbar: { ch: ' ', track: { bg: 'cyan' }, style: { inverse: true } }
        });

        const inputLabel = blessed.text({
            parent: modal,
            top: '65%',
            left: 2,
            content: 'Your Response:'
        });

        const input = blessed.textbox({
            parent: modal,
            top: '70%',
            left: 2,
            width: '95%',
            height: 3,
            inputOnFocus: true,
            border: { type: 'line' },
            style: { focus: { border: { fg: 'blue' } } }
        });

        const submit = blessed.button({
            parent: modal,
            top: '85%',
            left: 'center',
            name: 'submit',
            content: ' [ Send Response ] ',
            style: { focus: { bg: 'blue' }, hover: { bg: 'blue' } },
            padding: { left: 1, right: 1 },
            border: { type: 'line' }
        });

        input.on('submit', () => {
            const response = input.getValue();
            if (response.trim()) {
                // Publish back to task_routing
                // Note: We need a channel here, which we don't have in this module yet
                // For now, we'll log it and emit an event that a separate handler can catch
                eventBus.emit('ceo_response', { originalPayload: payload, response });
                
                modal.detach();
                panels.hitlInbox.removeItem(index);
                pendingRequests.splice(index, 1);
                if (pendingRequests.length === 0) {
                    panels.hitlInbox.addItem('No pending requests');
                }
                screen.render();
            }
        });

        submit.on('press', () => input.submit());

        modal.key(['escape', 'q'], () => {
            modal.detach();
            screen.render();
        });

        modal.focus();
        input.focus();
        screen.render();
    });

    // --- Control Listeners ---
    let isPaused = false;
    screen.key(['p'], () => {
        isPaused = !isPaused;
        if (isPaused) {
            eventBus.emit(FirmOsEvent.PAUSE);
        } else {
            eventBus.emit(FirmOsEvent.RESUME);
        }
    });

    eventBus.on(FirmOsEvent.STATUS_UPDATE, (newStatus: string) => {
        panels.status.setContent(` ${newStatus} `);
        panels.status.style.fg = newStatus === 'RUNNING' ? 'green' : 'yellow';
        screen.render();
    });

    // Destructive Purge with Confirmation
    let purgeConfirm = false;
    let purgeTimer: NodeJS.Timeout | null = null;

    screen.key(['x'], () => {
        if (!purgeConfirm) {
            purgeConfirm = true;
            panels.log.log('⚠️  PRESS "x" AGAIN TO PURGE ALL QUEUES (3s)');
            screen.render();
            
            if (purgeTimer) clearTimeout(purgeTimer);
            purgeTimer = setTimeout(() => {
                purgeConfirm = false;
                panels.log.log('ℹ️  Purge cancelled.');
                screen.render();
            }, 3000);
        } else {
            // Second press
            if (purgeTimer) clearTimeout(purgeTimer);
            purgeConfirm = false;
            eventBus.emit(FirmOsEvent.PURGE);
            screen.render();
        }
    });

    // Initial labels/mock data
    panels.log.log('Welcome to FirmOS TUI');
    panels.log.log('Press [q] to quit, [Tab] to switch focus');
    
    // Clear mock data
    panels.agentList.clearItems();
    panels.hitlInbox.clearItems();
    panels.hitlInbox.addItem('No pending requests');

    // Navigation
    screen.key(['escape', 'q', 'C-c'], () => {
        eventBus.emit(FirmOsEvent.SHUTDOWN);
    });

    eventBus.on(FirmOsEvent.SHUTDOWN, () => {
        screen.destroy();
        process.exit(0);
    });

    // Tab focus switching
    const focusable = [panels.agentList, panels.hitlInbox, panels.inputBar];
    let focusIndex = 0;

    screen.key(['tab'], () => {
        focusIndex = (focusIndex + 1) % focusable.length;
        focusable[focusIndex].focus();
        screen.render();
    });

    // --- Input Bar Logic ---
    screen.key(['i', 'd'], () => {
        if (!panels.inputBar.focused) {
            panels.inputBar.focus();
            screen.render();
        }
    });

    panels.inputBar.key(['escape'], () => {
        panels.inputBar.clearValue();
        panels.log.focus();
        screen.render();
    });

    panels.inputBar.on('submit', (value: string) => {
        if (value.trim()) {
            panels.log.log(`> Dispatching: ${value}`);
            eventBus.emit(FirmOsEvent.DISPATCH_TASK, value);
            panels.inputBar.clearValue();
            panels.log.focus(); // Return focus to log or keep in input? User usually wants to see logs.
            screen.render();
        }
    });

    screen.render();

    return { screen, panels };
}
