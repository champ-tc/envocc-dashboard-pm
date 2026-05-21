import { Database } from 'duckdb';
const db = new Database(':memory:');
db.all("SELECT year, month, diagnosis, COUNT(*) as count FROM 'public/duckdb/hdc.parquet' WHERE (year = 2026 AND month IN (3, 4) AND diagnosis = 'การวินิจฉัยโรคทั้งหมด') OR (year = 2024) GROUP BY year, month, diagnosis ORDER BY year, month, diagnosis", (err, res) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  console.log(JSON.stringify(res, (key, value) =>
    typeof value === 'bigint'
      ? value.toString()
      : value
  , 2));
});
