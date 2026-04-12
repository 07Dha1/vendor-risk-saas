/**
 * Quick DB viewer — run: node db-view.js [table]
 * Examples:
 *   node db-view.js            → shows all tables + counts
 *   node db-view.js users      → shows all users
 *   node db-view.js contracts  → shows all contracts
 */

const Database = require('better-sqlite3');
const db = new Database('contracts.db');

const arg = process.argv[2];

if (!arg) {
  // Show all tables and row counts
  const tables = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name != 'sqlite_sequence' ORDER BY name")
    .all();

  console.log('\n=== DATABASE TABLES ===\n');
  tables.forEach(({ name }) => {
    const { c } = db.prepare(`SELECT COUNT(*) as c FROM ${name}`).get();
    console.log(`  ${name.padEnd(30)} ${c} rows`);
  });
  console.log('\nUsage: node db-view.js <table_name>\n');
} else {
  // Show all rows for the given table
  const tables = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table'")
    .all()
    .map((t) => t.name);

  if (!tables.includes(arg)) {
    console.error(`Table "${arg}" not found. Available tables: ${tables.join(', ')}`);
    process.exit(1);
  }

  const rows = db.prepare(`SELECT * FROM ${arg}`).all();
  console.log(`\n=== ${arg.toUpperCase()} (${rows.length} rows) ===\n`);
  console.log(JSON.stringify(rows, null, 2));
}

db.close();
