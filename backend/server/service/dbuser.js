const ADODB = require('node-adodb');

const dbuser = ADODB.open(process.env.dbuser_con);

module.exports = dbuser;