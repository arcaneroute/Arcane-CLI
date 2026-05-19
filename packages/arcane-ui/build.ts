// packages/arcane-ui/build.ts

import * as Bun from 'bun';

await Bun.build({
  entrypoints: ['./src/index.ts'],
  outdir: './dist',
  target: 'bun',
  format: 'esm',
  external: ['@opentui/core'],
});

console.log('Build complete!');