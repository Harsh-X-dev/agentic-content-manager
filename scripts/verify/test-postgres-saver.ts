import "dotenv/config";
import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";

const connString = process.env.DATABASE_URL;
if (!connString) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

console.log("Testing PostgresSaver...");
const checkpointer = PostgresSaver.fromConnString(connString);
console.log("[PostgresSaver] ⚙️  Setting up checkpoint tables (runs once on startup, safe to call repeatedly)...");
await checkpointer.setup();
console.log("[PostgresSaver] ✅ Checkpoint tables ready.");
