import type { FalkorDB } from "falkordb";

/**
 * Configuration options for FalkorDB connection
 */
export interface FalkorDBGraphConfig {
  /**
   * Database host (used only if url is not provided)
   * @default "localhost"
   */
  host?: string;

  /**
   * Database port (used only if url is not provided)
   * @default 6379
   */
  port?: number;

  /**
   * Name of the graph to use
   */
  graph?: string;

  /**
   * Enable enhanced schema details
   * @default false
   */
  enhancedSchema?: boolean;

  /**
   * Connection URL (alternative to host/port)
   * Format: falkor[s]://[[username][:password]@][host][:port][/db-number]
   * When provided, this takes precedence over host/port
   */
  url?: string;

  /**
   * Optional username for authentication
   */
  username?: string;

  /**
   * Optional password for authentication
   */
  password?: string;

  /**
   * Pre-initialized FalkorDB driver instance
   * When provided, all connection options (url, host, port, etc.) are ignored
   */
  driver?: FalkorDB;
}

/**
 * Structured representation of the graph schema
 */
export interface StructuredSchema {
  /**
   * Node properties by label
   * @example { "Person": ["name", "age"], "Movie": ["title", "year"] }
   */
  nodeProps: { [key: string]: string[] };

  /**
   * Relationship properties by type
   * @example { "ACTED_IN": ["role", "year"], "DIRECTED": [] }
   */
  relProps: { [key: string]: string[] };

  /**
   * Graph relationships
   */
  relationships: Array<{
    /** Starting node label */
    start: string;
    /** Relationship type */
    type: string;
    /** Ending node label */
    end: string;
  }>;
}
