import { FalkorDBGraph } from "@falkordb/langchain-ts";
import { OpenAI } from "@langchain/openai";
import { GraphCypherQAChain } from "@langchain/community/chains/graph_qa/cypher";

/**
 * Quickstart example for @falkordb/langchain-ts
 *
 * Prerequisites:
 * 1. FalkorDB running: docker run -p 6379:6379 -it --rm falkordb/falkordb:latest
 * 2. OpenAI API key set in environment: export OPENAI_API_KEY=your_key_here
 */

async function main() {
  console.log("🚀 FalkorDB LangChain Integration - Quickstart\n");

  // Initialize FalkorDB connection
  console.log("📊 Connecting to FalkorDB...");
  const graph = await FalkorDBGraph.initialize({
    host: "localhost",
    port: 6379,
    graph: "movies",
  });
  console.log("✅ Connected!\n");

  // Create sample movie data
  console.log("🎬 Creating sample movie data...");
  await graph.query(
    "CREATE " +
      "(a1:Actor {name:'Bruce Willis', age:68})" +
      "-[:ACTED_IN {role:'Butch'}]->(:Movie {title:'Pulp Fiction', year:1994}), " +
      "(a2:Actor {name:'John Travolta', age:70})" +
      "-[:ACTED_IN {role:'Vincent'}]->(:Movie {title:'Pulp Fiction', year:1994}), " +
      "(d:Director {name:'Quentin Tarantino'})" +
      "-[:DIRECTED]->(:Movie {title:'Pulp Fiction', year:1994})"
  );
  console.log("✅ Sample data created!\n");

  // Refresh schema
  console.log("📋 Refreshing graph schema...");
  await graph.refreshSchema();
  console.log("Schema:");
  console.log(graph.getSchema());
  console.log();

  // Set up QA chain with LLM
  console.log("🤖 Setting up QA chain with OpenAI...");
  const model = new OpenAI({
    temperature: 0,
    modelName: "gpt-3.5-turbo",
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chain = GraphCypherQAChain.fromLLM({
    llm: model,
    graph: graph as any, // Type assertion for LangChain compatibility
  });
  console.log("✅ QA chain ready!\n");

  // Ask questions
  const questions = [
    "Who played in Pulp Fiction?",
    "What roles did the actors play?",
    "Who directed Pulp Fiction?",
    "When was Pulp Fiction released?",
  ];

  console.log("❓ Asking questions about the graph:\n");
  for (const question of questions) {
    console.log(`Q: ${question}`);
    try {
      const response = await chain.run(question);
      console.log(`A: ${response}\n`);
    } catch (error) {
      console.error(
        `Error: ${error instanceof Error ? error.message : String(error)}\n`
      );
    }
  }

  // Clean up
  console.log("🧹 Cleaning up...");
  await graph.clearGraph();
  await graph.close();
  console.log("✅ Done!");
}

// Run the example
main().catch((error) => {
  console.error("❌ Error:", error);
  process.exit(1);
});
