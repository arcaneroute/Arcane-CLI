import { createArcaneRenderer } from './src/index';
import { createArcaneApp, arcaneEventBus } from './src/index';
import logger from '@arcane/logger';

const { debug, info, error } = logger;

info('=== ArcaneUI Starting ===');

async function main() {
  try {
    debug('Creating renderer...');

    // Create renderer - this is where it might fail
    const renderer = await createArcaneRenderer();
    info('Renderer created successfully');

    // Create app
    debug('Creating app...');
    const app = createArcaneApp(renderer, arcaneEventBus);
    info('App created successfully');

    // Wire up global error handlers
    process.on('uncaughtException', (err) => {
      error(`UNCAUGHT EXCEPTION: ${err instanceof Error ? err.stack : String(err)}`);
    });

    process.on('unhandledRejection', (reason) => {
      error(`UNHANDLED REJECTION: ${reason}`);
    });

    // Simulate some events after a delay
    setTimeout(() => {
      debug('Emitting budget:update event');
      arcaneEventBus.emit('budget:update', { used: 73, total: 100, percentage: 73 });
    }, 1000);

    setTimeout(() => {
      debug('Emitting message:receive event');
      arcaneEventBus.emit('message:receive', {
        id: 'msg-1',
        role: 'assistant',
        content: 'Welcome to Arcane UI! This is a test message.',
        timestamp: new Date(),
      });
    }, 2000);

    info('Arcane UI example running...');
  } catch (err) {
    error(`FATAL ERROR: ${err instanceof Error ? err.stack : String(err)}`);
    process.exit(1);
  }
}

main();