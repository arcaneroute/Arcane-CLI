/**
 * Tools - Export all tool definitions
 */

import { logger } from '@arcane/logger';
export { logger };

export { fileTools } from './FileTools';
export { shellTools } from './ShellTools';
export { gitTools } from './GitTools';
export { searchTools } from './SearchTools';
export { webTools } from './WebTools';

import { fileTools } from './FileTools';
import { shellTools } from './ShellTools';
import { gitTools } from './GitTools';
import { searchTools } from './SearchTools';
import { webTools } from './WebTools';

export const standardTools = [
  ...fileTools,
  ...shellTools,
  ...gitTools,
  ...searchTools,
  ...webTools,
];
