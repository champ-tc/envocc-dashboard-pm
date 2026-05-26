const { Database } = require('duckdb');
const db = new Database(':memory:');
db.all("SELECT date, COUNT(DISTINCT station_id_new) as station_count FROM 'web/public/duckdb/pm25.csv' GROUP BY date ORDER BY date DESC LIMIT 10", (err, res) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  console.log(JSON.stringify(res, (key, value) =>
    typeof value === 'bigint' ? value.toString() : value, 2));
});
