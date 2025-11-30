import { FalkorDB, Graph } from "falkordb";
import type { FalkorDBGraphConfig, StructuredSchema } from "../types";
// eslint-disable-next-line @typescript-eslint/no-explicit-any

export class FalkorDBGraph {
  private driver!: FalkorDB;

  private graph!: Graph;

  private schema = "";

  private structuredSchema: StructuredSchema = {
    nodeProps: {},
    relProps: {},
    relationships: [],
  };

  private enhancedSchema: boolean;

  private host: string;

  private port: number;

  private isExternalDriver: boolean = false;

  // LangChain compatibility properties
  public database: string = "falkordb";
  public timeoutMs: number = 30000;
  public enhancedSchemaCypher: boolean = false;

  constructor(config: FalkorDBGraphConfig) {
    try {
      this.enhancedSchema = config.enhancedSchema ?? false;

      // Mark if using external driver
      this.isExternalDriver = !!config.driver;

      // Store host/port for getConnectionUrl() method
      // Priority: driver (no parsing needed) > URL (parse for display) > host/port
      if (config.driver) {
        // When driver is provided, use default values for display purposes
        this.host = config.host ?? "localhost";
        this.port = config.port ?? 6379;
      } else if (config.url) {
        // Parse URL to extract host/port for getConnectionUrl()
        try {
          const parsedUrl = new URL(config.url);
          this.host = parsedUrl.hostname || "localhost";
          this.port = parsedUrl.port ? parseInt(parsedUrl.port, 10) : 6379;
        } catch (urlError) {
          // If URL parsing fails, fall back to host/port
          this.host = config.host ?? "localhost";
          this.port = config.port ?? 6379;
        }
      } else {
        // Use host/port directly
        this.host = config.host ?? "localhost";
        this.port = config.port ?? 6379;
      }
    } catch (error) {
      console.error("Error in FalkorDBGraph constructor:", error);
      throw new Error("Failed to initialize FalkorDBGraph.");
    }
  }

  static async initialize(config: FalkorDBGraphConfig): Promise<FalkorDBGraph> {
    const graph = new FalkorDBGraph(config);

    try {
      // Use pre-initialized driver if provided
      if (config.driver) {
        graph.driver = config.driver;
      } else {
        // Build driver options based on configuration
        const driverOptions: Parameters<typeof FalkorDB.connect>[0] = {};

        // If URL is provided, use it directly (takes precedence)
        if (config.url) {
          driverOptions.url = config.url;
        } else {
          // Otherwise, use socket configuration
          driverOptions.socket = {
            host: graph.host,
            port: graph.port,
          };
        }

        // Add authentication if provided
        if (config.username) {
          driverOptions.username = config.username;
        }
        if (config.password) {
          driverOptions.password = config.password;
        }

        graph.driver = await FalkorDB.connect(driverOptions);
      }

      await graph.verifyConnectivity();

      // If a default graph is specified, select it
      if (config.graph) {
        await graph.selectGraph(config.graph);
      }

      return graph;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      throw new Error(
        `Failed to connect to FalkorDB at ${graph.host}:${graph.port}: ${errorMessage}`
      );
    }
  }

  getSchema(): string {
    return this.schema;
  }

  getStructuredSchema(): StructuredSchema {
    return this.structuredSchema;
  }

  async selectGraph(graphName: string): Promise<void> {
    if (!this.driver) {
      throw new Error(
        "FalkorDB driver not initialized. Call initialize() first."
      );
    }

    try {
      this.graph = await this.driver.selectGraph(graphName);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to select graph '${graphName}': ${errorMessage}`);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async query(query: string): Promise<any> {
    if (!this.graph) {
      throw new Error("No graph selected. Call selectGraph() first.");
    }

    try {
      return await this.graph.query(query);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      throw new Error(`Query execution failed: ${errorMessage}`);
    }
  }

  async verifyConnectivity(): Promise<void> {
    if (!this.driver) {
      throw new Error("FalkorDB driver not initialized.");
    }

    try {
      await this.driver.info();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to verify connectivity: ${errorMessage}`);
    }
  }

  async refreshSchema(): Promise<void> {
    if (!this.graph) {
      throw new Error("No graph selected. Call selectGraph() first.");
    }

    try {
      const nodePropertiesQuery = `
        MATCH (n)
        WITH keys(n) as keys, labels(n) AS labels
        UNWIND labels AS label
        UNWIND keys AS key
        WITH label, collect(DISTINCT key) AS properties
        RETURN {label: label, properties: properties} AS output
      `;

      const relPropertiesQuery = `
        MATCH ()-[r]->()
        WITH keys(r) as keys, type(r) AS type
        UNWIND keys AS key
        WITH type, collect(DISTINCT key) AS properties
        RETURN {type: type, properties: properties} AS output
      `;

      const relQuery = `
        MATCH (n)-[r]->(m)
        UNWIND labels(n) as src_label
        UNWIND labels(m) as dst_label
        RETURN DISTINCT {start: src_label, type: type(r), end: dst_label} AS output
      `;

      // Execute queries with error handling
      const [
        nodePropertiesResult,
        relationshipsPropertiesResult,
        relationshipsResult,
      ] = await Promise.all([
        this.query(nodePropertiesQuery).catch(() => ({ data: [] })),
        this.query(relPropertiesQuery).catch(() => ({ data: [] })),
        this.query(relQuery).catch(() => ({ data: [] })),
      ]);

      const nodeProperties = nodePropertiesResult.data || [];
      const relationshipsProperties = relationshipsPropertiesResult.data || [];
      const relationships = relationshipsResult.data || [];

      this.structuredSchema = {
        nodeProps: Object.fromEntries(
          nodeProperties.map(
            (el: { output: { label: string; properties: string[] } }) => [
              el.output.label,
              el.output.properties,
            ]
          )
        ),
        relProps: Object.fromEntries(
          relationshipsProperties.map(
            (el: { output: { type: string; properties: string[] } }) => [
              el.output.type,
              el.output.properties,
            ]
          )
        ),
        relationships: relationships.map(
          (el: { output: { start: string; type: string; end: string } }) =>
            el.output
        ),
      };

      if (this.enhancedSchema) {
        await this.enhanceSchemaDetails();
      }

      this.schema = this.formatSchema();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to refresh schema: ${errorMessage}`);
    }
  }

  private async enhanceSchemaDetails(): Promise<void> {
    console.log("Enhanced schema details not yet implemented for FalkorDB.");
  }

  private formatSchema(): string {
    const { nodeProps, relProps, relationships } = this.structuredSchema;

    const formattedNodeProps = Object.entries(nodeProps)
      .map(([label, props]) => `${label}: {${props.join(", ")}}`)
      .join("\n");

    const formattedRelProps = Object.entries(relProps)
      .map(([type, props]) => `${type}: {${props.join(", ")}}`)
      .join("\n");

    const formattedRelationships = relationships
      .map((rel) => `(:${rel.start}) -[:${rel.type}]-> (:${rel.end})`)
      .join("\n");

    return [
      "Node properties are the following:",
      formattedNodeProps,
      "Relationship properties are the following:",
      formattedRelProps,
      "The relationships are the following:",
      formattedRelationships,
    ].join("\n");
  }

  async close(): Promise<void> {
    try {
      // Only close the driver if it was created internally
      // Don't close externally provided drivers
      if (this.driver && !this.isExternalDriver) {
        await this.driver.close();
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.warn(
        `Warning: Error closing FalkorDB connection: ${errorMessage}`
      );
    }
  }

  /**
   * Check if the driver is connected and ready
   */
  isConnected(): boolean {
    return !!this.driver;
  }

  /**
   * Check if a graph is currently selected
   */
  hasSelectedGraph(): boolean {
    return !!this.graph;
  }

  /**
   * Get the current connection URL
   */
  getConnectionUrl(): string {
    return `http://${this.host}:${this.port}`;
  }

  /**
   * Execute multiple queries in sequence
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async executeQueries(queries: string[]): Promise<any[]> {
    if (!this.graph) {
      throw new Error("No graph selected. Call selectGraph() first.");
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const results: any[] = [];
    for (const query of queries) {
      try {
        const result = await this.query(query);
        results.push(result);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        throw new Error(`Failed executing query "${query}": ${errorMessage}`);
      }
    }
    return results;
  }

  /**
   * Clear all data in the current graph (useful for testing)
   */
  async clearGraph(): Promise<void> {
    if (!this.graph) {
      throw new Error("No graph selected. Call selectGraph() first.");
    }

    try {
      await this.query("MATCH (n) DETACH DELETE n");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to clear graph: ${errorMessage}`);
    }
  }

  /**
   * LangChain compatibility method - not implemented for FalkorDB
   * @throws Error indicating this method is not implemented
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
  async addGraphDocuments(_documents: any[]): Promise<void> {
    throw new Error(
      "addGraphDocuments is not implemented for FalkorDB. Please use the query() method directly to add data."
    );
  }
}
