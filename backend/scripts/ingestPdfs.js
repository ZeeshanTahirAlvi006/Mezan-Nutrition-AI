import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pdfParse from './pdfParser.cjs';
import { Pinecone } from '@pinecone-database/pinecone';
import crypto from 'crypto';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../../');

dotenv.config();

const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
const INDEX_NAME = 'nutriguide-kb';
const EMBED_MODEL = 'multilingual-e5-large';

const CHUNK_SIZE = 2000;
const OVERLAP = 300;
const UPSERT_BATCH_SIZE = 50;

const delay = (ms) => new Promise(res => setTimeout(res, ms));
const generateId = () => crypto.randomBytes(16).toString('hex');

/**
 * Generate embeddings using Pinecone's built-in inference API.
 * No external API key needed — it uses your Pinecone API key.
 */
async function generateEmbeddingsBatch(texts, retries = 5) {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await pinecone.inference.embed({
        model: EMBED_MODEL,
        inputs: texts,
        parameters: { inputType: 'passage', truncate: 'END' }
      });
      return response.data.map(d => d.values);
    } catch (error) {
      if (attempt < retries - 1) {
        const backoffMs = Math.min(2000 * Math.pow(2, attempt), 60000);
        console.log(`  ⏳ Error: ${error.message}. Backing off ${backoffMs / 1000}s (attempt ${attempt + 1}/${retries})...`);
        await delay(backoffMs);
      } else {
        console.error(`  ❌ Embedding failed after ${retries} attempts:`, error.message);
        return null;
      }
    }
  }
  return null;
}

function chunkText(text, size, overlap) {
  const chunks = [];
  let startIndex = 0;
  while (startIndex < text.length) {
    const endIndex = Math.min(startIndex + size, text.length);
    chunks.push(text.substring(startIndex, endIndex));
    startIndex += size - overlap;
  }
  return chunks;
}

async function processPdf(filePath, fileName, index) {
  console.log(`\n📄 Processing ${fileName}...`);
  
  try {
    const dataBuffer = fs.readFileSync(filePath);
    const sizeMB = (dataBuffer.length / 1024 / 1024).toFixed(2);
    console.log(`  File size: ${sizeMB} MB`);

    if (dataBuffer.length > 50 * 1024 * 1024) {
      console.log(`  ⚠️ Skipping ${fileName} — file too large (${sizeMB} MB).`);
      return;
    }
    
    const data = await pdfParse(dataBuffer);
    const rawText = data.text;
    const cleanText = rawText.replace(/\s+/g, ' ').trim();
    
    if (!cleanText || cleanText.length < 100) {
      console.log(`  ⚠️ Skipping ${fileName} — insufficient extractable text.`);
      return;
    }

    const chunks = chunkText(cleanText, CHUNK_SIZE, OVERLAP);
    console.log(`  Generated ${chunks.length} chunks.`);

    let vectors = [];
    let totalUploaded = 0;

    // Process in batches of 10 (Pinecone inference batch limit)
    const EMBED_BATCH = 10;
    for (let i = 0; i < chunks.length; i += EMBED_BATCH) {
      const batchTexts = chunks.slice(i, i + EMBED_BATCH);
      
      const embeddings = await generateEmbeddingsBatch(batchTexts);
      
      if (!embeddings) {
        console.log(`  ⚠️ Skipping batch at chunk ${i}.`);
        continue;
      }

      for (let j = 0; j < embeddings.length; j++) {
        vectors.push({
          id: `vec_${generateId()}`,
          values: embeddings[j],
          metadata: {
            source: fileName,
            text: batchTexts[j]
          }
        });
      }

      if (vectors.length >= UPSERT_BATCH_SIZE || i + EMBED_BATCH >= chunks.length) {
        if (vectors.length > 0) {
          await index.upsert({ records: vectors });
          totalUploaded += vectors.length;
          console.log(`  ✅ Uploaded ${totalUploaded}/${chunks.length} chunks`);
          vectors = [];
        }
      }

      await delay(500);
    }

    console.log(`  🎉 Finished ${fileName}! Total: ${totalUploaded} chunks stored.`);
  } catch (error) {
    console.error(`  ❌ Error processing ${fileName}:`, error.message);
  }
}

async function main() {
  console.log('🚀 Starting Pinecone Knowledge Base Ingestion Pipeline...');
  console.log(`   Index: ${INDEX_NAME}`);
  console.log(`   Embed model: ${EMBED_MODEL} (Pinecone built-in)`);
  
  if (!process.env.PINECONE_API_KEY) {
    console.error("❌ PINECONE_API_KEY is missing in .env");
    process.exit(1);
  }

  // Ensure index exists
  const existingIndexes = await pinecone.listIndexes();
  const indexExists = existingIndexes.indexes?.some(idx => idx.name === INDEX_NAME);

  if (!indexExists) {
    console.log(`Creating Pinecone index '${INDEX_NAME}'...`);
    await pinecone.createIndex({
      name: INDEX_NAME,
      dimension: 1024, // multilingual-e5-large dimension
      metric: 'cosine',
      spec: { 
        serverless: { 
          cloud: 'aws', 
          region: 'us-east-1' 
        } 
      }
    });
    console.log('Index created! Waiting 30 seconds for initialization...');
    await delay(30000);
  } else {
    console.log(`Index '${INDEX_NAME}' already exists. ✅`);
  }

  const index = pinecone.Index(INDEX_NAME);

  const files = fs.readdirSync(ROOT_DIR);
  const pdfFiles = files.filter(f => f.toLowerCase().endsWith('.pdf'));

  if (pdfFiles.length === 0) {
    console.log('No PDF files found in the root directory.');
    return;
  }

  // Sort: small files first
  const pdfFilesWithSize = pdfFiles.map(f => ({
    name: f,
    size: fs.statSync(path.join(ROOT_DIR, f)).size
  }));
  pdfFilesWithSize.sort((a, b) => a.size - b.size);

  console.log(`\nFound ${pdfFilesWithSize.length} PDFs (sorted by size):`);
  pdfFilesWithSize.forEach(f => console.log(`  - ${f.name} (${(f.size / 1024 / 1024).toFixed(2)} MB)`));

  for (const file of pdfFilesWithSize) {
    const filePath = path.join(ROOT_DIR, file.name);
    await processPdf(filePath, file.name, index);
  }

  console.log('\n🏁 Ingestion Complete!');
  process.exit(0);
}

main().catch(console.error);
