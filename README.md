# @falkordb/langchain-ts

FalkorDB integration for LangChain.js - A blazing fast graph database for AI applications.

[![npm version](https://badge.fury.io/js/@falkordb%2Flangchain-ts.svg)](https://www.npmjs.com/package/@falkordb/langchain-ts)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## About

[FalkorDB](https://www.falkordb.com/) is a high-performance graph database that enables you to build knowledge graphs and perform complex graph queries with blazing speed. This package provides seamless integration between FalkorDB and LangChain.js, allowing you to leverage graph-based knowledge for your AI applications.

## Features

- 🚀 **Fast Graph Queries**: Built on Redis with optimized graph operations
- 🔗 **Cypher Support**: Use Cypher query language for graph operations
- 🧠 **LLM Integration**: Works seamlessly with LangChain's QA chains
- 📊 **Schema Management**: Automatic schema detection and updates
- 🔄 **Async/Await**: Modern async API
- 📝 **TypeScript**: Full TypeScript support with type definitions

## Installation

```bash
npm install @falkordb/langchain-ts falkordb
```

You'll also need LangChain and a language model:

```bash
npm install langchain @langchain/openai @langchain/community
```

## Quick Start

### 1. Start FalkorDB

The easiest way to run FalkorDB is with Docker:

```bash
docker run -p 6379:6379 -it --rm falkordb/falkordb:latest
```

### 2. Basic Usage

```typescript
import { FalkorDBGraph } from "@falkordb/langchain-ts";
import { OpenAI } from "@langchain/openai";
import { GraphCypherQAChain } from "@langchain/community/chains/graph_qa/cypher";

// Initialize connection
const graph = await FalkorDBGraph.initialize({
  host: "localhost",
  port: 6379,
  graph: "movies"
});

// Create some data
await graph.query(
  "CREATE (a:Actor {name:'Bruce Willis'})" +
  "-[:ACTED_IN]->(:Movie {title: 'Pulp Fiction'})"
);

// Refresh schema
await graph.refreshSchema();

// Set up QA chain
const model = new OpenAI({ temperature: 0 });
// Note: Type assertion needed for LangChain compatibility
const chain = GraphCypherQAChain.fromLLM({
  llm: model,
  graph: graph as any,
});

// Ask questions about your graph
const response = await chain.run("Who played in Pulp Fiction?");
console.log(response);
// Output: Bruce Willis played in Pulp Fiction.

// Clean up
await graph.close();
```

### 3. Advanced Connection Options

The library supports multiple ways to connect to FalkorDB:

#### Using a URL

```typescript
// Simple URL connection
const graph = await FalkorDBGraph.initialize({
  url: "falkor://localhost:6379",
  graph: "movies"
});

// URL with authentication
const graph = await FalkorDBGraph.initialize({
  url: "falkor://username:password@myserver:6379",
  graph: "movies"
});
```

#### Using a Pre-initialized Driver

This is useful when you need full control over the driver configuration or want to share a driver across multiple graph instances:

```typescript
import { FalkorDB } from "falkordb";

// Create a driver with custom configuration
const driver = await FalkorDB.connect({
  socket: { 
    host: "localhost", 
    port: 6379,
    connectTimeout: 10000
  },
  username: "myuser",
  password: "mypassword",
  poolOptions: {
    min: 2,
    max: 10
  }
});

// Use the driver with multiple graphs
const moviesGraph = await FalkorDBGraph.initialize({
  driver: driver,
  graph: "movies"
});

const booksGraph = await FalkorDBGraph.initialize({
  driver: driver,
  graph: "books"
});

// Close graphs (won't close the shared driver)
await moviesGraph.close();
await booksGraph.close();

// Close the driver when done
await driver.close();
```

## API Reference

### FalkorDBGraph

#### `initialize(config: FalkorDBGraphConfig): Promise<FalkorDBGraph>`

Creates and initializes a new FalkorDB connection.

**Config Options:**
- `host` (string, optional): Database host. Default: `"localhost"` (ignored if `url` or `driver` is provided)
- `port` (number, optional): Database port. Default: `6379` (ignored if `url` or `driver` is provided)
- `graph` (string, optional): Graph name to use
- `url` (string, optional): Connection URL format: `falkor[s]://[[username][:password]@][host][:port][/db-number]`. Takes precedence over `host` and `port`
- `username` (string, optional): Username for authentication
- `password` (string, optional): Password for authentication
- `driver` (FalkorDB, optional): Pre-initialized FalkorDB driver instance. When provided, all other connection options are ignored
- `driverOptions` (object, optional): Additional FalkorDB driver options (socket config, pool options, etc.)
- `enhancedSchema` (boolean, optional): Enable enhanced schema details. Default: `false`

**Examples:**

Using host and port:
```typescript
const graph = await FalkorDBGraph.initialize({
  host: "localhost",
  port: 6379,
  graph: "myGraph",
  enhancedSchema: true
});
```

Using connection URL:
```typescript
const graph = await FalkorDBGraph.initialize({
  url: "falkor://localhost:6379",
  graph: "myGraph"
});
```

Using connection URL with authentication:
```typescript
const graph = await FalkorDBGraph.initialize({
  url: "falkor://username:password@localhost:6379",
  graph: "myGraph"
});
```

Using a pre-initialized driver:
```typescript
import { FalkorDB } from "falkordb";

const driver = await FalkorDB.connect({
  socket: { host: "localhost", port: 6379 },
  username: "myuser",
  password: "mypassword"
});

const graph = await FalkorDBGraph.initialize({
  driver: driver,
  graph: "myGraph"
});

// When using a pre-initialized driver, you're responsible for closing it
await graph.close(); // This won't close the driver
await driver.close(); // Close the driver manually
```

With additional driver options:
```typescript
const graph = await FalkorDBGraph.initialize({
  host: "localhost",
  port: 6379,
  graph: "myGraph",
  driverOptions: {
    name: "my-app-client",
    pingInterval: 60000,
    socket: {
      connectTimeout: 10000,
      keepAlive: 30000
    }
  }
});
```

#### `query(query: string): Promise<any>`

Executes a Cypher query on the graph.

```typescript
const result = await graph.query(
  "MATCH (n:Person) RETURN n.name LIMIT 10"
);
```

#### `refreshSchema(): Promise<void>`

Updates the graph schema information.

```typescript
await graph.refreshSchema();
console.log(graph.getSchema());
```

#### `getSchema(): string`

Returns the current graph schema as a formatted string.

#### `getStructuredSchema(): StructuredSchema`

Returns the structured schema object containing node properties, relationship properties, and relationships.

#### `selectGraph(graphName: string): Promise<void>`

Switches to a different graph.

```typescript
await graph.selectGraph("anotherGraph");
```

#### `close(): Promise<void>`

Closes the database connection.

```typescript
await graph.close();
```

## Advanced Usage

### Custom Cypher Queries

```typescript
const graph = await FalkorDBGraph.initialize({
  host: "localhost",
  port: 6379,
  graph: "movies"
});

// Complex query
const result = await graph.query(`
  MATCH (a:Actor)-[:ACTED_IN]->(m:Movie)
  WHERE m.year > 2000
  RETURN a.name, m.title, m.year
  ORDER BY m.year DESC
  LIMIT 10
`);

console.log(result.data);
```

### Multiple Queries

```typescript
await graph.executeQueries([
  "CREATE (p:Person {name: 'Alice'})",
  "CREATE (p:Person {name: 'Bob'})",
  "MATCH (a:Person {name: 'Alice'}), (b:Person {name: 'Bob'}) CREATE (a)-[:KNOWS]->(b)"
]);
```

### Working with Schema

```typescript
await graph.refreshSchema();

// Get formatted schema
const schema = graph.getSchema();
console.log(schema);

// Get structured schema
const structuredSchema = graph.getStructuredSchema();
console.log(structuredSchema.nodeProps);
console.log(structuredSchema.relationships);
```

### Error Handling

```typescript
try {
  const graph = await FalkorDBGraph.initialize({
    host: "localhost",
    port: 6379,
    graph: "myGraph"
  });
  
  await graph.query("CREATE (n:Node {name: 'test'})");
  
} catch (error) {
  console.error("Error:", error.message);
} finally {
  await graph.close();
}
```

## Examples

Check out the [examples](./examples) directory for more use cases:

- [Basic Queries](./examples/basic-queries.ts) - Basic graph operations
- [Graph DB FalkorDB](./examples/graph_db_falkordb.ts) - Working with FalkorDB
- [Quickstart](./examples/quickstart.ts) - Quick start guide

## Requirements

- Node.js >= 18
- FalkorDB server running (Redis-compatible)
- LangChain >= 0.1.0

## Development

```bash
# Clone the repository
git clone https://github.com/FalkorDB/FalkorDB-Langchain-js.git
cd FalkorDB-Langchain-js

# Install dependencies
npm install

# Build
npm run build

# Run tests
npm test

# Run integration tests (requires FalkorDB running)
npm run test:int
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Documentation

- [FalkorDB Documentation](https://docs.falkordb.com/)
- [LangChain Documentation](https://js.langchain.com/docs/)
- [Cypher Query Language](https://neo4j.com/docs/cypher-manual/current/)

## License

MIT © FalkorDB

## Support

- 📫 [GitHub Issues](https://github.com/FalkorDB/FalkorDB-Langchain-js/issues)
- 💬 [FalkorDB Discord](https://discord.gg/falkordb)
- 📧 Email: support@falkordb.com
- 🌐 Website: https://www.falkordb.com/

## Acknowledgments

Special thanks to the LangChain team for their excellent framework and the FalkorDB team for their amazing graph database.
