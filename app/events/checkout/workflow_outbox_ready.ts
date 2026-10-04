import { BaseEvent } from '@adonisjs/core/events'

/** Wakes the publisher after commit. The outbox remains the durable source of work. */
export default class WorkflowOutboxReady extends BaseEvent {}
