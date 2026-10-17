import { MongoClient } from "mongodb";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const uri = process.env.MONGODB_URI ?? process.env.MONGO_URI;
if (!uri) throw new Error("MONGODB_URI is required");

const client = new MongoClient(uri, {
  appName: "gratog-mongo-to-turso-inventory",
  maxPoolSize: 1,
  minPoolSize: 0,
  serverSelectionTimeoutMS: 15_000,
});

const typeOf = (value) => {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  if (value instanceof Date) return "date";
  if (value?._bsontype) return String(value._bsontype).toLowerCase();
  return typeof value;
};

try {
  await client.connect();
  const db = client.db();
  const collections = await db.listCollections({}, { nameOnly: true }).toArray();
  collections.sort((a, b) => a.name.localeCompare(b.name));

  const report = {
    generatedAt: new Date().toISOString(),
    database: db.databaseName,
    collectionCount: collections.length,
    collections: {},
  };

  for (const { name } of collections) {
    const collection = db.collection(name);
    const count = await collection.estimatedDocumentCount();
    const indexes = await collection.indexes();
    const fields = {};
    let sampled = 0;

    for await (const document of collection.find({}, { projection: {} }).sort({ _id: 1 }).limit(100)) {
      sampled += 1;
      for (const [field, value] of Object.entries(document)) {
        fields[field] ??= { present: 0, types: {} };
        fields[field].present += 1;
        const observedType = typeOf(value);
        fields[field].types[observedType] = (fields[field].types[observedType] ?? 0) + 1;
      }
    }

    report.collections[name] = {
      estimatedCount: count,
      sampled,
      indexes: indexes.map(({ name: indexName, key, unique = false, sparse = false }) => ({
        name: indexName,
        key,
        unique,
        sparse,
      })),
      fields,
    };
  }

  const outputPath = resolve(process.env.MONGO_INVENTORY_OUTPUT ?? ".tmp/mongodb-inventory.json");
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
  process.stdout.write(JSON.stringify({
    status: "ok",
    database: report.database,
    collectionCount: report.collectionCount,
    outputPath,
  }) + "\n");
} finally {
  await client.close();
}
