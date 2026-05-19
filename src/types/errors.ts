/*
 * arcane-route :: src/types/errors.ts
 * Custom error classes with typed error codes
 */

export type ArcaneErrorCode =
  | 'API_KEY_MISSING'
  | 'UNKNOWN_PROVIDER'
  | 'SWD_VERIFICATION_FAILED'
  | 'BUDGET_EXCEEDED'
  | 'MEMORY_CORRUPTED'
  | 'FILESYSTEM_PERMISSION'
  | 'CLAUDE_API_ERROR'
  | 'OPENAI_API_ERROR'
  | 'INVALID_EFFORT_LEVEL'
  | 'PATH_TRAVERSAL'
  | 'CONFIG_INVALID';

/**
 * Base error class for all arcane-route errors.
 * Carries a typed ArcaneErrorCode for programmatic handling.
 */
export class ArcaneError extends Error {
  // Mutable (not readonly) so subclasses can set it in their constructors
  public override name: string = 'ArcaneError';

  constructor(
    message: string,
    public readonly code: ArcaneErrorCode,
  ) {
    super(message);
    // Restore prototype chain (required for custom Error subclasses in TS)
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Thrown when ANTHROPIC_API_KEY or OPENAI_API_KEY is missing or invalid.
 */
export class ApiKeyMissingError extends ArcaneError {
  constructor(provider: string) {
    super(
      `API key missing for provider "${provider}". ` +
        `Set the appropriate key in your .env file.\n` +
        `  Anthropic: export ANTHROPIC_API_KEY="sk-ant-..."\n` +
        `  OpenAI:    export OPENAI_API_KEY="sk-..."`,
      'API_KEY_MISSING',
    );
    this.name = 'ApiKeyMissingError';
  }
}

/**
 * Thrown when LLM_PROVIDER env var has an unknown value.
 */
export class UnknownProviderError extends ArcaneError {
  constructor(provider: string) {
    super(
      `Unknown LLM_PROVIDER "${provider}". Valid values: anthropic, openai.\n` +
        `Set LLM_PROVIDER in your .env file.`,
      'UNKNOWN_PROVIDER',
    );
    this.name = 'UnknownProviderError';
  }
}

/**
 * Thrown when the SWD engine detects that an AI-claimed file operation
 * does not match the actual filesystem state.
 */
export class SWDVerificationError extends ArcaneError {
  constructor(details: string) {
    super(`SWD verification failed: ${details}`, 'SWD_VERIFICATION_FAILED');
    this.name = 'SWDVerificationError';
  }
}

/**
 * Thrown when the session token or turn budget is exhausted.
 */
export class BudgetExceededError extends ArcaneError {
  constructor(reason: string) {
    super(reason, 'BUDGET_EXCEEDED');
    this.name = 'BudgetExceededError';
  }
}

/**
 * Thrown when ARCANE_MEMORY.md cannot be parsed or is corrupted.
 */
export class MemoryCorruptedError extends ArcaneError {
  constructor(details: string) {
    super(`ARCANE_MEMORY.md is corrupted: ${details}`, 'MEMORY_CORRUPTED');
    this.name = 'MemoryCorruptedError';
  }
}

/**
 * Thrown when file I/O fails due to permissions.
 */
export class FilesystemPermissionError extends ArcaneError {
  constructor(path: string, operation: string) {
    super(`Filesystem permission denied: cannot ${operation} "${path}"`, 'FILESYSTEM_PERMISSION');
    this.name = 'FilesystemPermissionError';
  }
}

/**
 * Thrown when a path traversal attack is detected (e.g. ../../etc/passwd).
 */
export class PathTraversalError extends ArcaneError {
  constructor(path: string) {
    super(
      `SECURITY VIOLATION: Path traversal detected on "${path}". ` +
        `All paths must be relative to the working directory.`,
      'PATH_TRAVERSAL',
    );
    this.name = 'PathTraversalError';
  }
}

/**
 * Thrown when ConfigManager detects an invalid configuration.
 */
export class ConfigInvalidError extends ArcaneError {
  constructor(message: string) {
    super(`Invalid configuration: ${message}`, 'CONFIG_INVALID');
    this.name = 'ConfigInvalidError';
  }
}
