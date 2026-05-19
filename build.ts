#!/usr/bin/env bun

export {};

const entrypoint = './src/cli/CLIRouter.ts';
const outdir = './dist';

// Build arcane-ui first since it's a workspace dependency
console.log('Building packages...');
await Bun.build({
  entrypoints: ['./packages/arcane-ui/src/index.ts'],
  outdir: './packages/arcane-ui/dist',
  target: 'bun',
  format: 'esm',
  external: ['@opentui/core'],
});

console.log('Building main...');

const result = await Bun.build({
  entrypoints: [entrypoint],
  outdir,
  target: 'bun',
  minify: true,
});

if (result.logs.length > 0) {
  for (const log of result.logs) {
    if (log.level === 'error') {
      console.error('ERROR:', log.message);
    } else if (log.level === 'warning') {
      console.warn('WARNING:', log.message);
    }
  }
}

if (result.success) {
  console.log('Build successful!');
} else {
  console.error('Build failed!');
  process.exit(1);
}
