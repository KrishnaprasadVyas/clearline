import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;
const options = {};

let clientPromise: Promise<MongoClient> | undefined;

function getClientPromise(): Promise<MongoClient> {
  if (!uri) throw new Error('MONGODB_URI is not set');
  if (clientPromise) return clientPromise;

  if (process.env.NODE_ENV === 'development') {
    if (!(global as any)._mongoClientPromise) {
      const client = new MongoClient(uri, options);
      (global as any)._mongoClientPromise = client.connect();
    }
    clientPromise = (global as any)._mongoClientPromise as Promise<MongoClient>;
    return clientPromise;
  }

  const client = new MongoClient(uri, options);
  clientPromise = client.connect();
  return clientPromise;
}

// Kept for backward-compatibility with any default import usages.
// We intentionally do not initialize Mongo at module import time.
export default Promise.resolve(null as unknown as MongoClient);

export async function getDb() {
  const client = await getClientPromise();
  return client.db('clearpath');
}
