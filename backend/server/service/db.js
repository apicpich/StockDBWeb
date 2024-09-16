const initOptions = {
  // initialization options;
};

const pgp = require('pg-promise')(initOptions);

pgp.pg.types.setTypeParser(1700, parseFloat);

const db = pgp(process.env.pg_con);

module.exports = db;
