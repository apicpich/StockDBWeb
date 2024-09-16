const db = require('./db');
const pgp = db.$config.pgp;

const dateToText = (input) => {
  if (input) {
    d = new Date(input)
    return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
  }
  return null
}

const dateKeyId = (input = null) => {
  let d = new Date()
  if (input) { d = new Date(input) }
  return (d.getFullYear() % 100) + ('0' + (d.getMonth() + 1)).slice(-2);
}

const genUniqueID = (seed) => {
  let _seed = seed ? seed : 0
  const _now = Date.now() + _seed
  return +(_now.toString() + Math.floor(Math.random() * 1000).toString())
}
const genDate = (isoDateString) => {
  if (isoDateString && isoDateString != "1970-01-01T00:00:00Z") {
    return new Date(isoDateString);
  } else {
    return null;
  }
}

const depart_cs = new pgp.helpers.ColumnSet([
  'depart_id', 'depart_name', 'depart_address', 'depart_remark', "depart_line_token",
  "depart_type", "depart_autosave"
], { table: 'depart' });

const status_cs = new pgp.helpers.ColumnSet([
  'status_id', 'status_name'
], { table: 'status' });

const supplier_cs = new pgp.helpers.ColumnSet([
  'SupplierID', 'SupplierName', 'SupplierAddress', 'SupplierPhone'
]);

const customer_cs = new pgp.helpers.ColumnSet([
  'CustID', 'CustName', 'CustAddress', 'CustPhone'
]);

const product_cs = new pgp.helpers.ColumnSet([
  'DrugID', 'DrugCost', 'DrugCostUpdate', 'DrugSupply',
  'DrugRemark', 'DrugStock', 'DrugValue', { name: 'DrugExp', cast: 'timestamptz' },
  'DrugMin', 'DrugMax', 'MinLock', 'MaxLock', 'Out1', 'Out2', 'Out3', 'OrderNeed', 'NotActive'
]);

const pdlot_cs = new pgp.helpers.ColumnSet([
  'DrugDID',
  { name: 'DrugDDate', cast: 'timestamptz' },
  'DrugInvID', 'DrugDSupply', 'DrugDLot',
  'DrugDAmount', 'DrugDPack', 'DrugDCost',
  { name: 'DrugDExp', cast: 'timestamptz' },
  'DrugDStock',
  { name: 'DrugDLast', cast: 'timestamptz' },
  'DrugTNID'
]);

const pdlot_update_cs = pdlot_cs.extend(['?DrugLotID'])

const pdUpdateQuery = `SELECT "DrugDID" AS "DrugID", SUM("DrugDStock") AS "DrugStock",
  SUM("DrugDStock" * "DrugDCost" / "DrugDPack") AS "DrugValue", MIN("DrugDExp") AS "DrugExp"
  FROM $1:name."DrugDetail" WHERE "DrugDID" IN ($2:csv) AND "DrugDStock" > 0
  GROUP BY "DrugDID"`;

module.exports = {
  dateToText, dateKeyId, genUniqueID, genDate,
  depart_cs, status_cs, supplier_cs, customer_cs, product_cs,
  pdlot_cs, pdlot_update_cs, pdUpdateQuery
};
