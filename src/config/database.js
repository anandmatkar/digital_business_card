const { Pool } = require('pg');
require("dotenv").config();

let connection = new Pool({
    user: process.env.DATABASE_USER,
    host: process.env.DATABASE_HOST,
    database: process.env.DATABASE_NAME,
    password: 'Chetan@123', //enter your postgres password here
    port: 5432,
});

connection.connect((err) => {
    if (err) {
        console.log(err.message);
    } else {
        console.log("Database connected successfully....");
    }
});

module.exports = connection;
