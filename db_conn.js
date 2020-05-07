var path = require('path');
const sqlite3 = require("sqlite3").verbose();
var fs = require('fs');

const db_name = path.resolve(__dirname, "data", "users.db");
var folder_name = __dirname + "/data";
if (!fs.existsSync(folder_name)) {
  fs.mkdirSync(folder_name);
}

const db = new sqlite3.Database(db_name, err => {
  if (err) {
    return console.error(err.message);
  }
  console.log("Successful connection to the database: 'users.db'");
});


const sql_delete = `DROP TABLE IF EXISTS users`;

const sql_create = `CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  password VARCHAR(10) NOT NULL,
  auth_token VARCHAR(256) NULL UNIQUE,
  is_logged_in TINYINT NOT NULL DEFAULT 0
);`;

const sql_add_user = `INSERT INTO users(name, email, password, is_logged_in) VALUES('abc', 'abc@gmail.com', 'abc@123', 0)`;

db.run(sql_delete, err => {
  if (err) {
    return console.log(err.message);
  }
  console.log('Successfully deleted users table');
  db.run(sql_create, err => {
    if (err) {
      return console.error(err.message);
    }
    console.log("Successful creation of the 'users' table");
  
    db.run(sql_add_user, err => {
      if (err) {
        return console.error(err.message);
      }
      console.log("Added a record to the 'users' table");
    });
  });
});

module.exports = db;
