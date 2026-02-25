import { EventEmitter } from 'node:events';

export const eventBus = new EventEmitter();

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

export function emitLog(message: string) {
    eventBus.emit(FirmOsEvent.LOG, message);
}

export function emitAgentStarted(role: string, model: string) {
    eventBus.emit(FirmOsEvent.AGENT_STARTED, { role, model });
}

export function emitAgentFinished(role: string) {
    eventBus.emit(FirmOsEvent.AGENT_FINISHED, { role });
}
