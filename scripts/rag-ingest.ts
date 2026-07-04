/**
 * CLI: pnpm run rag:ingest [-- --contentId=xxx]
 * Requires: pgvector extension + OPENAI_API_KEY (optional mock embeddings)
 */
import 'dotenv/config';
import { runIngestJob } from '../lib/rag/ingest';

const contentIdArg = process.argv.find((a) => a.startsWith('--contentId='));
const contentId = contentIdArg?.split('=')[1];

runIngestJob(contentId)
  .then((r) => {
    console.log('RAG ingest complete:', r);
    process.exit(0);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
