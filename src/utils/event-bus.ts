import { EventEmitter } from 'node:events';
import type { MessageBroker } from './message-broker.js';

export const eventBus = new EventEmitter();

let broker: MessageBroker | null = null;

/**
 * Connects the event bus to a message broker for cross-process broadcasting.
 */
export function bridgeToBroker(messageBroker: MessageBroker) {
    broker = messageBroker;
}

export enum FirmOsEvent {
    LOG = 'log',
    AGENT_STARTED = 'agent_started',
    AGENT_FINISHED = 'agent_finished',
    QUEUE_UPDATE = 'queue_update',
    CEO_REQUEST = 'ceo_request',
    DISPATCH_TASK = 'dispatch_task',
    PAUSE = 'pause',
    RESUME = 'resume',
    PURGE = 'purge',
    STATUS_UPDATE = 'status_update',
    SHUTDOWN = 'shutdown',
    RESET = 'reset',
    BOOTSTRAP_SEED = 'bootstrap_seed'
}

const BROADCAST_EVENTS = [
    FirmOsEvent.LOG,
    FirmOsEvent.AGENT_STARTED,
    FirmOsEvent.AGENT_FINISHED,
    FirmOsEvent.CEO_REQUEST,
    FirmOsEvent.STATUS_UPDATE
];

// Local listeners that trigger broadcasts
BROADCAST_EVENTS.forEach(event => {
    eventBus.on(event, (payload) => {
        if (broker) {
            broker.broadcast(event, payload).catch(err => {
                console.error(`Failed to broadcast event ${event}:`, err.message);
            });
        }
    });
});

export function emitLog(message: string) {
    eventBus.emit(FirmOsEvent.LOG, message);
}

export function emitAgentStarted(role: string, model: string) {
    eventBus.emit(FirmOsEvent.AGENT_STARTED, { role, model });
}

export function emitAgentFinished(role: string) {
    eventBus.emit(FirmOsEvent.AGENT_FINISHED, { role });
}
