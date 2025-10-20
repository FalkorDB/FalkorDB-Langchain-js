import { FalkorDBGraph } from "@falkordb/langchain-ts";

/**
 * Basic example showing direct Cypher query usage
 * 
 * Prerequisites:
 * docker run -p 6379:6379 -it --rm falkordb/falkordb:latest
 */

async function main() {
  // Connect to FalkorDB
  const graph = await FalkorDBGraph.initialize({
    host: "localhost",
    port: 6379,
    graph: "social"
  });

  console.log("Creating social network graph...\n");

  // Create nodes
  await graph.query(`
    CREATE 
      (alice:Person {name: 'Alice', age: 30, city: 'New York'}),
      (bob:Person {name: 'Bob', age: 25, city: 'San Francisco'}),
      (charlie:Person {name: 'Charlie', age: 35, city: 'New York'}),
      (diana:Person {name: 'Diana', age: 28, city: 'Los Angeles'})
  `);

  // Create relationships
  await graph.query(`
    MATCH (alice:Person {name: 'Alice'}), (bob:Person {name: 'Bob'})
    CREATE (alice)-[:KNOWS {since: 2020}]->(bob)
  `);

  await graph.query(`
    MATCH (alice:Person {name: 'Alice'}), (charlie:Person {name: 'Charlie'})
    CREATE (alice)-[:KNOWS {since: 2018}]->(charlie)
  `);

  await graph.query(`
    MATCH (bob:Person {name: 'Bob'}), (diana:Person {name: 'Diana'})
    CREATE (bob)-[:KNOWS {since: 2021}]->(diana)
  `);

  console.log("Querying the graph...\n");

  // Query 1: Find all people Alice knows
  const result1 = await graph.query(`
    MATCH (alice:Person {name: 'Alice'})-[:KNOWS]->(friend)
    RETURN friend.name as name, friend.age as age
  `);
  console.log("People Alice knows:");
  console.log(result1.data);
  console.log();

  // Query 2: Find people in New York
  const result2 = await graph.query(`
    MATCH (p:Person {city: 'New York'})
    RETURN p.name as name, p.age as age
    ORDER BY p.age
  `);
  console.log("People in New York:");
  console.log(result2.data);
  console.log();

  // Query 3: Find friends of friends
  const result3 = await graph.query(`
    MATCH (alice:Person {name: 'Alice'})-[:KNOWS]->()-[:KNOWS]->(fof)
    WHERE fof.name <> 'Alice'
    RETURN DISTINCT fof.name as name
  `);
  console.log("Friends of Alice's friends:");
  console.log(result3.data);
  console.log();

  // Refresh and display schema
  await graph.refreshSchema();
  console.log("Graph schema:");
  console.log(graph.getSchema());
  console.log();

  // Clean up
  await graph.clearGraph();
  await graph.close();
  console.log("Example completed!");
}

main().catch(console.error);
