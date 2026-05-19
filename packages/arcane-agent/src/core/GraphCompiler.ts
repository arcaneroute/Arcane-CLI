/**
 * GraphCompiler - Compiles agent graphs menggunakan LangGraph
 * Simplified version - full LangGraph integration to be completed
 */

import { logger } from '@arcane/logger';
import type { AgentDefinition } from '../types';

export interface GraphCompileOptions {
  name?: string;
  checkpointer?: unknown;
}

export class GraphCompiler {
  private nodes: Map<string, AgentDefinition> = new Map();
  private edges: Map<string, string[]> = new Map();

  addNode(name: string, agent: AgentDefinition): this {
    logger.debug({ name, agentName: agent.name }, 'Adding node to graph');
    this.nodes.set(name, agent);
    return this;
  }

  addEdge(from: string, to: string): this {
    if (!this.edges.has(from)) {
      this.edges.set(from, []);
    }
    this.edges.get(from)!.push(to);
    logger.debug({ from, to, edgesCount: this.edges.get(from)!.length }, 'Added edge to graph');
    return this;
  }

  compile(options: GraphCompileOptions = {}): unknown {
    logger.info({ name: options.name, nodesCount: this.nodes.size, edgesCount: this.edges.size }, 'Compiling graph');
    return {
      name: options.name,
      nodes: this.getNodes(),
      edges: Object.fromEntries(this.edges),
    };
  }

  getNodes(): string[] {
    return Array.from(this.nodes.keys());
  }

  getEdges(): Map<string, string[]> {
    return new Map(this.edges);
  }
}
