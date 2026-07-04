import 'dotenv/config';
import { MongoClient } from 'mongodb';

const DB_NAME = 'expense_tracker';
const COLLECTION = 'appdata';
const DOC_ID = 'main';

async function test() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('❌ MONGODB_URI not set in .env file');
    process.exit(1);
  }

  console.log('Connecting to MongoDB Atlas...');
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('✅ Connected successfully!\n');

    const db = client.db(DB_NAME);
    const col = db.collection<{ _id: string }>(COLLECTION);

    const doc = await col.findOne({ _id: DOC_ID });
    const count = await col.countDocuments();

    console.log('Database name:    ', DB_NAME);
    console.log('Collection name:  ', COLLECTION, '(like a table in SQL)');
    console.log('Document ID:      ', DOC_ID);
    console.log('Documents in collection:', count);

    if (doc) {
      const { _id, accounts, categories, transactions, monthlyGoals } = doc as Record<string, unknown>;
      console.log('\n📦 Your data:');
      console.log('  Accounts:      ', (accounts as unknown[])?.length ?? 0);
      console.log('  Categories:    ', (categories as unknown[])?.length ?? 0);
      console.log('  Transactions:  ', (transactions as unknown[])?.length ?? 0);
      console.log('  Monthly goals: ', (monthlyGoals as unknown[])?.length ?? 0);
    } else {
      console.log('\n📭 No data yet — will be created when you start the app and add transactions.');
    }

    console.log('\n✅ MongoDB connection test PASSED');
  } catch (err) {
    console.error('❌ Connection failed:', err instanceof Error ? err.message : err);
    process.exit(1);
  } finally {
    await client.close();
  }
}

test();
