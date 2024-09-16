const express = require('express');
const router = express.Router();
const authen = require('./service/authen');
const startup = require('./service/startup');

const db = require('./service/db');
const pgp = db.$config.pgp;
const {
  depart_cs, status_cs, supplier_cs, customer_cs, product_cs
} = require('./service/model');

const workTbl = [
  { tbl: 'depart', field_id: 'depart_id', w_name: 'หน่วยงาน', cs: depart_cs },
  { tbl: 'status', field_id: 'status_id', w_name: 'สถานะ', cs: status_cs },
  { tbl: 'Supplier', field_id: 'SupplierID', w_name: 'ผู้จำหน่าย', cs: supplier_cs },
  { tbl: 'Customer', field_id: 'CustID', w_name: 'ผู้เบิก', cs: customer_cs },
  { tbl: 'DrugItem', field_id: 'DrugID', w_name: 'วัสดุ', cs: product_cs },
]

router.use(authen.checkToken);

router.get('/token', (req, res, next) => {
  const payload = { user: req.decoded.user, role: req.decoded.role };
  const token = authen.createToken(payload);
  res.json(token)
})

router.get('/myuser', (req, res, next) => {
  db.any("SELECT * FROM myuser WHERE user_name = $1", req.query.id)
    .then(data => { res.json(data); })
    .catch(err => { next(err); console.error(err) });
})

router.get('/select', (req, res, next) => {
  const tbl = +req.query.on
  let schema = 'public'
  if (req.query.sh) { schema = req.query.sh }
  let query = pgp.as.format('SELECT * FROM $1:name.$2:name', [schema, workTbl[tbl].tbl])
  if (req.query.id) {
    query += pgp.as.format(' WHERE $1:name = $2', [workTbl[tbl].field_id, req.query.id])
  }
  if (req.query.order) {
    query += pgp.as.format(' ORDER BY $1:name', req.query.order)
  }
  db.any(query)
  .then(data => { res.json(data); })
  .catch(err => { next(err); console.error(err) });
})

router.delete('/delete', (req, res, next) => {
  const tbl = +req.query.on
  let schema = 'public'
  if (req.query.sh) { schema = req.query.sh }
  db.none(
    'DELETE FROM $1:name.$2:name WHERE $3:name = $4',
    [schema, workTbl[tbl].tbl, workTbl[tbl].field_id, req.query.id]
  ).then(() => {
    res.json({ message: `ลบ${workTbl[tbl].w_name} ${req.query.id} เรียบร้อยแล้ว...` });
    let data = {}
    data[workTbl[tbl].field_id] = req.query.id
    req.io.emit('updateItem', { tableId: tbl, isDelete: true, data: data })
  })
  .catch(err => { next(err); console.error(err) });
})

router.put('/save', (req, res, next) => {
  const tbl = +req.query.on
  let schema = 'public'
  if (req.query.sh) { schema = req.query.sh }
  const item = req.body.data;
  const insert = pgp.helpers.insert(item, workTbl[tbl].cs, { table: workTbl[tbl].tbl, schema: schema }) +
    ' ON CONFLICT ("' + workTbl[tbl].field_id + '") DO UPDATE SET ' +
    workTbl[tbl].cs.assignColumns({ from: 'EXCLUDED', skip: workTbl[tbl].field_id });
  db.none(insert).then(() => {
    res.json({ message: `บันทึก${workTbl[tbl].w_name} ${item[workTbl[tbl].field_id]} เรียบร้อยแล้ว...` });
    req.io.emit('updateItem', { tableId: tbl, data: item })
  })
  .catch(err => { next(err); console.error(err) });
})

router.get('/pdwinlist', (req, res, next) => {
  const depart = req.query.depart
  const id = req.query.id
  db.task(t => {
    return t.batch([
      t.any('SELECT * FROM $1:name."DrugItem" WHERE "DrugID" = $2', [depart, id]),
      t.any(`SELECT "StInvID"
       FROM "RQInvoice" INNER JOIN "RQInvoiceDetail" ON "RQInvoice"."StInvID" = "RQInvoiceDetail"."DtInvID"
       WHERE "StInvUpdate" = false AND "StInvDepart" = $1 AND "DtDrugID" = $2 LIMIT 1`, [depart, id]),
      t.any(`SELECT "StInvID"
       FROM "APInvoice" INNER JOIN "APInvoiceDetail" ON "APInvoice"."StInvID" = "APInvoiceDetail"."DtInvID"
       WHERE "StInvUpdate" = false AND "StInvDepart" = $1 AND "DtDrugID" = $2 LIMIT 1`, [depart, id])
    ])
  })
  .then(data => { res.json(data); })
  .catch(err => { next(err); console.error(err) });
})

router.get('/productlot', (req, res, next) => {
  let sql = `SELECT * FROM $1:name."DrugDetail" WHERE "DrugDID" = $2 AND `
  if (req.query.all === 'true') {
    sql += `"DrugDStock" = 0 ORDER BY "DrugDDate" DESC`
  } else {
    sql += `"DrugDStock" > 0 ORDER BY "DrugDExp" NULLS FIRST, "DrugDDate"`
  }
  db.any(sql, [req.query.sh, req.query.id])
  .then(data => { res.json(data); })
  .catch(err => { next(err); console.error(err) });
})

router.get('/pdwlot', (req, res, next) => {
  db.task(t => {
    return t.any('SELECT * FROM $1:name."DrugItem" WHERE "DrugID" = $2', [req.query.sh, req.query.id]).then(drug => {
      if (drug.length) {
        return t.any(`SELECT T1.*, "SupplierName"
          FROM $1:name."DrugDetail" T1 INNER JOIN $1:name."Supplier" T2 ON T1."DrugDSupply" = T2."SupplierID"
          WHERE "DrugDID" = $2 AND "DrugDStock" > 0
          ORDER BY "DrugDExp" NULLS FIRST, "DrugDDate"`, [req.query.sh, req.query.id]).then(lot => {
          return [drug, lot]
        })
      }
      return [drug, []]
    })
  })
  .then(data => { res.json(data); })
  .catch(err => { next(err); console.error(err) });
})

router.put('/departrate', (req, res, next) => {
  startup.departRateUpdate(req.body.depart).then((result) => {
    res.json(result)
  }).catch(err => {
    console.error(err);
    res.status(500).json({ message: 'มีข้อผิดพลาดในการปรับปรุงอัตราการเบิกของหน่วยงาน ...' });
  });
})

router.post('/savedepart', (req, res, next) => {
  const item = req.body.data;
  const insert = pgp.helpers.insert(item, depart_cs) +
    ' ON CONFLICT (depart_id) DO UPDATE SET ' +
    depart_cs.assignColumns({ from: 'EXCLUDED', skip: 'depart_id' });
  db.tx(t => {
    if (item.depart_id !== 'center') {
      return t.any('SELECT schema_name FROM information_schema.schemata WHERE schema_name = $1', item.depart_id)
      .then(schema => {
        if (schema.length && schema[0].schema_name === item.depart_id) {
          return t.none(insert)
        }
        return t.none(startup.departSqlCreate, item.depart_id).then(() => {
          return t.none(`INSERT INTO $1:name."Supplier" ("SupplierID", "SupplierName") VALUES ('center', 'ส่วนกลาง')`, item.depart_id)
          .then(() => {
            return t.none(insert)
          })
        })
      })
    }
    return t.none(insert)
  })
  .then(() => {
    res.json({ message: `บันทึกหน่วยงานรหัส ${item.depart_id} เรียบร้อยแล้ว...` });
    req.io.emit('updateItem', { tableId: 0, data: item })
  })
  .catch(err => { next(err); console.error(err) });
})

module.exports = router;