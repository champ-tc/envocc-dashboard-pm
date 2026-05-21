import duckdb from 'duckdb';
import path from 'path';
const db = new duckdb.Database(':memory:');
const csvPath = path.join(process.cwd(), 'public', 'duckdb', 'pm25.csv');
db.all(`SELECT * FROM read_csv_auto('${csvPath}', ignore_errors=true) LIMIT 1;`, (err, res) => {
    console.log(res);
});
