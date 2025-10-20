/**
 * Configuration options for FalkorDB connection
 */
export interface FalkorDBGraphConfig {
  /**
   * Database host
   * @default "localhost"
   */
  host?: string;

  /**
   * Database port
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
   * Format: redis://host:port
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
