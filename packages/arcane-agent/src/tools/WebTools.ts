/**
 * WebTools - Tool definitions untuk web operations
 */

import { logger } from '@arcane/logger';
import type { Tool, ToolFunction } from '../types';

const webSearch: ToolFunction = async (input: unknown) => {
  const { query, limit = 10 } = input as { query: string; limit?: number };
  logger.debug({ tool: 'web_search', query, limit }, 'Executing web_search');

  logger.info({ tool: 'web_search', query }, 'Web search placeholder - requires external API');
  return {
    success: true,
    message: `Web search for: ${query}`,
    query,
    limit,
    results: [],
    note: 'Web search requires external API integration',
  };
};

const fetchUrl: ToolFunction = async (input: unknown) => {
  const { url, method = 'GET', headers } = input as {
    url: string;
    method?: string;
    headers?: Record<string, string>;
  };

  logger.debug({ tool: 'fetch_url', url, method }, 'Executing fetch_url');
  try {
    const response = await fetch(url, {
      method,
      headers,
    });

    const text = await response.text();
    logger.info({ tool: 'fetch_url', url, status: response.status, success: response.ok }, 'fetch_url completed');
    return {
      success: response.ok,
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      body: text.slice(0, 10000),
      url,
    };
  } catch (error) {
    logger.error({ tool: 'fetch_url', url, error: String(error) }, 'fetch_url failed');
    return { success: false, error: String(error), url };
  }
};

const getJson: ToolFunction = async (input: unknown) => {
  const { url, headers } = input as { url: string; headers?: Record<string, string> };

  logger.debug({ tool: 'get_json', url }, 'Executing get_json');
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    });

    const json = await response.json();
    logger.info({ tool: 'get_json', url, status: response.status, success: response.ok }, 'get_json completed');
    return {
      success: response.ok,
      status: response.status,
      data: json,
      url,
    };
  } catch (error) {
    logger.error({ tool: 'get_json', url, error: String(error) }, 'get_json failed');
    return { success: false, error: String(error), url };
  }
};

const postJson: ToolFunction = async (input: unknown) => {
  const { url, data, headers } = input as {
    url: string;
    data: unknown;
    headers?: Record<string, string>;
  };

  logger.debug({ tool: 'post_json', url }, 'Executing post_json');
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify(data),
    });

    const json = await response.json();
    logger.info({ tool: 'post_json', url, status: response.status, success: response.ok }, 'post_json completed');
    return {
      success: response.ok,
      status: response.status,
      data: json,
      url,
    };
  } catch (error) {
    logger.error({ tool: 'post_json', url, error: String(error) }, 'post_json failed');
    return { success: false, error: String(error), url };
  }
};

export const webTools: Tool[] = [
  {
    name: 'web_search',
    description: 'Search the web for information.',
    execute: webSearch,
  },
  {
    name: 'fetch_url',
    description: 'Fetch content from a URL.',
    execute: fetchUrl,
  },
  {
    name: 'get_json',
    description: 'GET JSON from a URL.',
    execute: getJson,
  },
  {
    name: 'post_json',
    description: 'POST JSON to a URL.',
    execute: postJson,
  },
];
