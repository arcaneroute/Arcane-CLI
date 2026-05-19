import { build, type BuildOptions } from 'bun';

const options: BuildOptions = {
  entrypoints: ['./src/index.ts'],
  outdir: './dist',
  target: 'bun',
  format: 'esm',
  external: ['@langchain/langgraph', '@langchain/core', 'zod'],
  sourcemap: 'external',
};

console.log('Building arcane-agent...');
const result = await build(options);

if (result.logs.length > 0) {
  console.error('Build warnings/errors:');
  for (const log of result.logs) {
    console.error(log);
  }
}

if (result.success) {
  console.log('Build succeeded!');
} else {
  console.error('Build failed!');
  process.exit(1);
}
