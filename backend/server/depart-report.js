const express = require('express');
const router = express.Router();
const authen = require('./service/authen');

const db = require('./service/db');
const pgp = db.$config.pgp;
const inv = ['STInvoice', 'OTInvoice']

router.use(authen.checkToken);

router.use((req, res, next) => {
  const q = req.body.query;
  let w = '';
  if (q.drugIdList && q.drugIdList.length) { w += '"DrugID" IN ($/drugIdList:csv/) AND ' }
  if (q.last_in) { w += '"DrugLastIn" < $/last_in/ AND ' }
  if (q.last_out) { w += '("DrugLastOut" IS NULL OR "DrugLastOut" < $/last_out/) AND ' }
  if (q.pd_min) { w += '"DrugStock" <= "DrugMin" AND ' }
  if (q.pd_max) { w += '"DrugStock" >= "DrugMax" AND ' }
  if (q.pd_active) { w += '"NotActive" = false AND ' }
  else if (q.pd_active === false) { w += '"NotActive" = true AND ' }
  if (q.below_max) { w += '"DrugStock" < "DrugMax" AND ' }
  if (q.below_rate) { w += '"DrugStock" < (("Out3" + "Out2") / 2) AND ' }
  if (q.on_orderneed) { w += '"OrderNeed" = true AND ' }
  else if (q.on_orderneed === false) { w += '"OrderNeed" = false AND ' }
  if (q.in_stock) { w += '"DrugStock" > 0 AND ' }
  else if (q.in_stock === false) { w += '"DrugStock" = 0 AND ' }
  if (q.stInv) { w += '"StInvID" >= $/stInv/ AND ' }
  if (q.stInv2) { w += '"StInvID" <= $/stInv2/ AND ' }
  if (q.stInvDate) { w += '"StInvDate" >= $/stInvDate/ AND ' }
  if (q.stInvDate2) { w += `"StInvDate" < $/stInvDate2/::timestamptz + interval '1 day' AND ` }
  if (q.stInvDateUpdate) { w += '"StInvDateUpdate" >= $/stInvDateUpdate/ AND ' }
  if (q.stInvDateUpdate2) { w += `"StInvDateUpdate" < $/stInvDateUpdate2/::timestamptz + interval '1 day' AND ` }
  if (q.stInvCust) { w += '"StInvCust" = $/stInvCust/ AND ' }
  if (q.status) { w += '"StInvStatus" = $/status/ AND ' }
  if (q.catId) { w += 'cat_id = $/catId/ AND ' }
  req.where = w
  next()
})

router.post('/stock', (req, res, next) => {
  const w = req.where + (req.body.query.has_stock ? '"DrugStock" > 0 ' : 'true');
  const criteria = pgp.as.format(' WHERE ' + w, req.body.query)
  db.task(t => {
    return t.any(`SELECT "DrugID", "DrugCost", "DrugCostUpdate", "DrugRemark", "DrugLastIn",
     "DrugLastOut", "DrugMin" FROM $1:name."DrugItem" ${criteria} ORDER BY "DrugID"`,
    req.query.sh).then(dItem => {
      if (dItem.length) {
        const dItemList = dItem.map(x => x.DrugID);
        const q = req.body.query;
        let w = '';
        if (q.has_exp_date) { w += '"DrugDExp" <= now() AND ' }
        else if (q.has_exp_date === false) { w += `"DrugDExp" > now() AND ` }
        if (q.near_exp_date) { w += `"DrugDExp" <= now() + interval '$/exp_period/ day' AND ` }
        else if (q.near_exp_date === false) { w += `"DrugDExp" > now() + interval '$/exp_period/ day' AND ` }
        const where = pgp.as.format(w, q) + '"DrugDStock" > 0';
        return t.any(`SELECT * FROM $1:name."DrugDetail" WHERE "DrugDID" IN ($2:csv) AND $3:raw
        ORDER BY "DrugDID", "DrugDExp" NULLS FIRST, "DrugDDate"`, [req.query.sh, dItemList, where])
          .then(dLot => { return [dItem, dLot] });
      }
      return [[], []]
    })
  })
    .then(data => { res.json(data); })
    .catch(err => { next(err); console.error(err) });
})

router.post('/rate', (req, res, next) => {
  const w = req.where + 'true';
  const criteria = pgp.as.format(' WHERE ' + w, req.body.query)
  db.task(t => {
    return t.any(`SELECT * FROM $1:name."DrugItem" ${criteria} ORDER BY "DrugID"`, req.query.sh)
    .then(dItem => {
      if (dItem.length) {
        const dItemList = dItem.map(x => x.DrugID);
        return t.any(`SELECT DISTINCT "DtDrugID"
        FROM "RQInvoice" INNER JOIN "RQInvoiceDetail" ON "RQInvoice"."StInvID" = "RQInvoiceDetail"."DtInvID"
        WHERE "StInvUpdate" = false AND "StInvDepart" = $1 AND "DtDrugID" IN ($2:csv)`, [req.query.sh, dItemList])
        .then(rq => {
          const rqList = rq.map(x => x.DtDrugID);
          const diff = dItemList.filter(x => !rqList.includes(x));
          if (diff.length) {
            return t.any(`SELECT DISTINCT "DtDrugID"
            FROM "APInvoice" INNER JOIN "APInvoiceDetail" ON "APInvoice"."StInvID" = "APInvoiceDetail"."DtInvID"
            WHERE "StInvUpdate" = false AND "StInvDepart" = $1 AND "DtDrugID" IN ($2:csv)`, [req.query.sh, diff])
            .then(ap => {
              const apList = ap.map(x => x.DtDrugID);
              return [dItem, [...rqList, ...apList]]
            })
          }
          return [dItem, rqList]
        })
      }
      return [[], []]
    })
  })
    .then(data => { res.json(data); })
    .catch(err => { next(err); console.error(err) });
})

router.post('/inv', (req, res, next) => {
  const w = req.where + 'true';
  const criteria = pgp.as.format(' WHERE ' + w, req.body.query)
  const tbl = inv[+req.query.inv];
  let extra_field = '', left_join = '';
  if (req.query.inv === '1') {
    left_join = 'LEFT JOIN $1:name."DrugDetail" T4 ON T1."DtLotID" = T4."DrugLotID"'
    extra_field = ', "DrugDLot" AS "DtLot", "DrugDExp" AS "DtExp" '
  }
  db.any(`SELECT T1.*, T2.*${extra_field}
  FROM $1:name."${tbl + 'Detail'}" T1 INNER JOIN $1:name."${tbl}" T2 ON T1."DtInvID" = T2."StInvID"
  INNER JOIN $1:name."DrugItem" T3 ON T1."DtDrugID" = T3."DrugID"
  ${left_join} ${criteria} ORDER BY "DtInvID", "DtDID"`, req.query.sh)
  .then(data => { res.json(data); })
  .catch(err => { next(err); console.error(err) });
})

router.post('/stockcard', (req, res, next) => {
  const q = req.body.query;
  if (q.DrugID) {
    const w = req.where + '"DtDrugID" = $/DrugID/ AND "StInvUpdate" = true';
    const criteria = pgp.as.format(' WHERE ' + w, q)
    db.task(t => {
      return t.batch([
        t.any('SELECT "DrugID", "DrugStock", "DrugValue" FROM $1:name."DrugItem" WHERE "DrugID" = $2', [req.query.sh, q.DrugID]),
        t.any(`SELECT T1.*, "StInvID", "StInvDate", "StInvCust", "StInvRef", "StInvDateUpdate", "StKeyUser", 0 AS mode
         FROM $1:name."STInvoiceDetail" T1 INNER JOIN $1:name."STInvoice" T2 ON T1."DtInvID" = T2."StInvID"
        ${criteria} ORDER BY "StInvDateUpdate", "DtDID"`, req.query.sh),
        t.any(`SELECT T1.*, "DrugDLot" AS "DtLot", "StInvID", "StInvDate", "StInvCust", "StInvRef", "StInvDateUpdate", "StKeyUser", 1 AS mode
         FROM $1:name."OTInvoiceDetail" T1 INNER JOIN $1:name."OTInvoice" T2 ON T1."DtInvID" = T2."StInvID"
         INNER JOIN $1:name."DrugDetail" T4 ON T1."DtLotID" = T4."DrugLotID"
        ${criteria} ORDER BY "StInvDateUpdate", "DtDID"`, req.query.sh),
      ])
    })
    .then(data => { res.json(data); })
    .catch(err => { next(err); console.error(err) });  
  } else {
    res.status(400).json({ errcode: 1, message: "กรุณาระบุรายการวัสดุ.." })
  }
})

router.post('/catallreport', (req, res, next) => {
  const q = req.body.query;
  if (q.departs.length) {
    let w = req.where
    if (q.has_exp_date) { w += '"DrugDExp" <= now() AND ' }
    else if (q.has_exp_date === false) { w += `"DrugDExp" > now() AND ` }
    if (q.near_exp_date) { w += `"DrugDExp" <= now() + interval '$/exp_period/ day' AND ` }
    else if (q.near_exp_date === false) { w += `"DrugDExp" > now() + interval '$/exp_period/ day' AND ` }
    const where = pgp.as.format(w, q) + '"DrugDStock" > 0';
    let sql = ''
    for (let i = 0; i < q.departs.length; i++){
      sql += pgp.as.format(
        `SELECT $1 AS depart_id, cat_id, Sum("DrugDStock" * "DrugDCost" / "DrugDPack") AS sum_value 
        FROM $1:name."DrugDetail" T1 INNER JOIN $1:name."DrugItem" T2 ON T1."DrugDID" = T2."DrugID" 
        INNER JOIN drugcat T3 ON T2."DrugID" = T3.drug_id 
        WHERE ${where} GROUP BY cat_id 
        ${i < q.departs.length - 1 ? 'UNION ALL ' : ''}
        `, [q.departs[i]]);
    }
    db.task(t => {
      if (q.firstQuery) {
        return t.none('TRUNCATE public.drugcat').then(() => {
          const insert = pgp.helpers.insert(req.body.catData, ['drug_id', 'cat_id'], 'drugcat');
          return t.none(insert).then(() => {
            return t.any(sql)
          })
        })
      }
      return t.any(sql)
    })
    .then(data => { res.json(data); })
    .catch(err => { next(err); console.error(err) });  
  } else {
    res.status(400).json({ errcode: 1, message: "ข้อมูลไม่ถูกต้อง.." })
  }
})

module.exports = router;