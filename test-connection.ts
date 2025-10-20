#!/usr/bin/env node

/**
 * Simple script to test FalkorDB connectivity
 * Run with: npm run build && node dist/test-connection.js
 * Or with tsx: npx tsx test-connection.ts
 */

import { FalkorDBGraph } from './src/graphs/falkordb.js';

async function testFalkorDB() {
  console.log('🔍 Testing FalkorDB connection...\n');

  const host = process.env.FALKORDB_HOST || 'localhost';
  const port = parseInt(process.env.FALKORDB_PORT || '6379', 10);

  console.log(`📡 Connecting to FalkorDB at ${host}:${port}`);

  try {
    // Initialize connection
    const graph = await FalkorDBGraph.initialize({
      host,
      port,
      graph: 'testConnection'
    });

    console.log('✅ Successfully connected to FalkorDB!');
    console.log(`   Connection URL: ${graph.getConnectionUrl()}`);
    console.log(`   Graph selected: ${graph.hasSelectedGraph()}`);

    // Test a simple query
    console.log('\n🧪 Running test query...');
    const result = await graph.query('RETURN "Hello from FalkorDB!" AS message, 42 AS number');
    console.log('✅ Query executed successfully!');
    console.log('   Result:', result.data);

    // Create some test data
    console.log('\n🏗️  Creating test data...');
    await graph.query(`
      CREATE (:Person {name: 'Alice', age: 30})-[:KNOWS {since: 2020}]->(:Person {name: 'Bob', age: 25})
    `);
    console.log('✅ Test data created!');

    // Refresh and display schema
    console.log('\n📊 Refreshing schema...');
    await graph.refreshSchema();
    const schema = graph.getStructuredSchema();
    console.log('✅ Schema refreshed!');
    console.log('   Node types:', Object.keys(schema.nodeProps));
    console.log('   Relationship types:', Object.keys(schema.relProps));
    console.log('   Relationships:', schema.relationships);

    // Query the data
    console.log('\n🔎 Querying test data...');
    const queryResult = await graph.query(`
      MATCH (p1:Person)-[k:KNOWS]->(p2:Person)
      RETURN p1.name AS person1, p2.name AS person2, k.since AS since
    `);
    console.log('✅ Query result:', queryResult.data);

    // Clean up
    console.log('\n🧹 Cleaning up test data...');
    await graph.clearGraph();
    console.log('✅ Test graph cleared!');

    // Close connection
    await graph.close();
    console.log('\n✅ All tests passed! FalkorDB is working correctly! 🎉');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Error testing FalkorDB:');
    if (error instanceof Error) {
      console.error(`   ${error.message}`);
      console.error('\n💡 Make sure FalkorDB is running. You can start it with:');
      console.error('   docker run -p 6379:6379 -it --rm falkordb/falkordb:latest');
    } else {
      console.error(error);
    }
    process.exit(1);
  }
}

testFalkorDB();
