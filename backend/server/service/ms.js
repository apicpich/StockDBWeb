const ADODB = require('node-adodb');

const db = ADODB.open(process.env.db_con);

module.exports = db;