const express = require('express');
const router = express.Router();
const authen = require('./service/authen');

const db = require('./service/db');
const pgp = db.$config.pgp;
const {
  dateKeyId, pdlot_update_cs, pdUpdateQuery
} = require('./service/model');

const OTInvoice_cs = new pgp.helpers.ColumnSet([
  'StInvID', { name: 'StInvDate', cast: 'timestamptz' }, 'StInvCust', 'StInvRef', 'StInvUpdate',
  { name: 'StInvDateUpdate', cast: 'timestamptz' }, 'StKeyUser', 'StInvStatus', 'StInvMemo'
]);

const OTInvoiceDetail_cs = new pgp.helpers.ColumnSet([
  'DtDID', 'DtLotID', 'DtInvID', 'DtDrugID', 'DtAmount', 'DtPack', 'DtPrice', 'DtStock', 'DtRemain'
]);

const pd_update_cs = new pgp.helpers.ColumnSet([
  '?DrugID', 'DrugStock', 'DrugValue',
  { name: 'DrugExp', cast: 'timestamptz' },
  { name: 'DrugLastOut', cast: 'timestamptz' }
]);

router.use(authen.checkToken);

router.get('/todaylist', (req, res, next) => {
  const sql = `SELECT "StInvID" AS id, "StInvDate" AS inv_date, "CustName" AS name, "StInvRef" AS ref, "StInvUpdate" AS update
    FROM $1:name."OTInvoice" T1 INNER JOIN $1:name."Customer" T2 ON T1."StInvCust" = T2."CustID" 
    WHERE "StInvDateUpdate"::date = now()::date OR "StInvUpdate" = false ORDER BY "StInvUpdate", "StInvID"`
  db.any(sql, req.query.sh)
   .then(data => { res.json(data); })
   .catch(err => { next(err); console.error(err) });
})

router.get('/invlist', (req, res, next) => {
  let sql = `SELECT "StInvID", "StInvDate", "StInvCust", "CustName", "StInvRef", "StInvUpdate"
    FROM $1:name."OTInvoice" T1 INNER JOIN $1:name."Customer" T2 ON T1."StInvCust" = T2."CustID"`
    if (req.query.search) {
      sql += pgp.as.format(
        ` WHERE "StInvID" ILIKE $1 OR "StInvCust" ILIKE $1 OR "CustName" ILIKE $1
        OR "StInvRef" ILIKE $1 OR to_char("StInvDate", 'mmyy') = $2 
        ORDER BY "StInvUpdate", "StInvDate" DESC, "StInvID" DESC LIMIT 100`
        , [req.query.search + '%', ('0000' + req.query.search).slice(-4)]
      )
    } else {
      sql += ` ORDER BY "StInvUpdate", "StInvDate" DESC, "StInvID" DESC LIMIT 100`
    }
  db.any(sql, [req.query.sh])
    .then(data => { res.json(data); })
    .catch(err => { next(err); console.error(err) });
})

router.get('/invid', (req, res, next) => {
  db.task(t => {
    let task = [];
    task.push(t.any(`SELECT * FROM $1:name."OTInvoice" WHERE "StInvID" = $2`, [req.query.sh, req.query.id]))
    task.push(t.any(
      `SELECT T1.*, "DrugDLot" AS "DtLot", "DrugDExp" AS "DtExp", "DrugTNID" AS "DtTNID"
      FROM $1:name."OTInvoiceDetail" T1 LEFT JOIN $1:name."DrugDetail" T2 ON T1."DtLotID" = T2."DrugLotID"
      WHERE "DtInvID" = $2 ORDER BY "DtDID"`, [req.query.sh, req.query.id]
    ))
    return t.batch(task)
  })
    .then(data => { res.json(data); })
    .catch(err => { next(err); console.error(err) });
})

router.post('/invoice', (req, res, next) => {
  const inv_data = req.body.inv;
  inv_data.StKeyUser = req.decoded.user;
  const detail_data = req.body.detail;
  const schema = req.query.sh;
  if (inv_data && detail_data) {
    db.tx(t => {
      let task = [];
      if (req.body.isNewInv) {
        const mntSearch = 'OT' + dateKeyId();
        return t.any('SELECT Max("StInvID") AS max_id FROM $1:name."OTInvoice" WHERE "StInvID" ILike $2', [schema, mntSearch + '%'])
        .then(invId => {
          let runId = '001';
          if (invId[0].max_id) {
            runId = ('00' + (+invId[0].max_id.slice(-3) + 1)).slice(-3)
          }
          inv_data.StInvID = mntSearch + runId
          detail_data.forEach(item => { item.DtInvID = inv_data.StInvID })
          const insert = pgp.helpers.insert(inv_data, OTInvoice_cs, { table: 'OTInvoice', schema: schema })
          task.push(t.none(insert))
          const insert_detail = pgp.helpers.insert(detail_data, OTInvoiceDetail_cs, { table: 'OTInvoiceDetail', schema: schema })
          task.push(t.none(insert_detail))
          return t.batch(task).then(() => {
            return { err_code: 0 }
          })
        })
      } else {
        return t.any('SELECT "StInvID", "StInvUpdate" FROM $1:name."OTInvoice" WHERE "StInvID" = $2', [schema, inv_data.StInvID])
        .then(st => {
          if (st.length) {
            if (st[0].StInvUpdate) {
              if (req.body.update) {
                return { err_code: 2, message: `ใบเบิกเลขที่ ${inv_data.StInvID} ได้มีการเบิกจ่ายไปก่อนหน้าแล้ว...` }
              } else {
                if (detail_data.length) {
                  return { err_code: 2, message: `ใบเบิกเลขที่ ${inv_data.StInvID} ได้มีการเบิกจ่ายไปก่อนหน้าแล้ว...` }
                }
              }
            }
          }
          if (req.body.update && detail_data.length) {
            inv_data.StInvUpdate = true;
            inv_data.StInvDateUpdate = new Date()
            let pdList = [], dtCutData = []
            // get unique drugid to pdList
            detail_data.forEach(dt => {
              if (!pdList.includes(dt.DtDrugID)) {
                pdList.push(dt.DtDrugID)
              }
            });
            return t.any(`SELECT * FROM $1:name."DrugDetail" WHERE "DrugDID" IN ($2:csv) AND "DrugDStock" > 0
            ORDER BY "DrugDID", "DrugDExp" NULLS FIRST, "DrugDDate"`, [schema, pdList]).then(pdLotData => {
              if (pdLotData.length) {
                let sumStock = pdLotData.reduce((sum, cur) => {
                  let index = sum.findIndex(x => x.DrugDID === cur.DrugDID)
                  if (index > -1) {
                    sum[index].DrugStock += cur.DrugDStock
                  } else {
                    sum.push({ DrugDID: cur.DrugDID, DrugStock: cur.DrugDStock })
                  }
                  return sum
                }, [])
                detail_data.forEach(dt => {
                  let drugStock = sumStock.find(x => x.DrugDID === dt.DtDrugID).DrugStock
                  let remainAmount = dt.DtAmount * dt.DtPack, i = 1;
                  if (dt.DtLotID) {
                    const findLot = pdLotData.find(x => x.DrugLotID === dt.DtLotID && x.DrugDID === dt.DtDrugID && x.DrugDStock > 0);
                    if (findLot) {
                      let cutRow = { ...dt }
                      cutRow.DtStock = findLot.DrugDStock
                      cutRow.DtRemain = drugStock
                      const diff = findLot.DrugDStock - remainAmount
                      let pack = cutRow.DtPack
                      if (diff >= 0) {
                        findLot.DrugDStock = diff; remainAmount = 0
                      } else {
                        if (findLot.DrugDStock % cutRow.DtPack) {
                          if (findLot.DrugDStock % findLot.DrugDPack) { pack = 1 } else { pack = findLot.DrugDPack }
                        }
                        cutRow.DtPack = pack
                        cutRow.DtAmount = findLot.DrugDStock / pack
                        findLot.DrugDStock = 0; remainAmount = Math.abs(diff)
                      }
                      cutRow.DtPrice = findLot.DrugDCost / findLot.DrugDPack * pack
                      dtCutData.push(cutRow)
                      findLot.hasUpdate = true
                      findLot.DrugDLast = new Date()
                    }
                  }
                  while (remainAmount > 0) {
                    const findPd = pdLotData.find(x => x.DrugDID === dt.DtDrugID && x.DrugDStock > 0);
                    if (findPd) {
                      i++
                      let cutRow = { ...dt }
                      cutRow.DtDID = +dt.DtDID + i
                      cutRow.DtLotID = findPd.DrugLotID;
                      cutRow.DtLot = findPd.DrugDLot;
                      cutRow.DtExp = findPd.DrugDExp;
                      cutRow.DtTNID = findPd.DrugTNID
                      cutRow.DtStock = findPd.DrugDStock
                      cutRow.DtRemain = drugStock
                      const diff = findPd.DrugDStock - remainAmount
                      let pack = cutRow.DtPack
                      if (diff >= 0) {
                        if (remainAmount % cutRow.DtPack) {
                          if (remainAmount % findPd.DrugDPack) { pack = 1 } else { pack = findPd.DrugDPack }
                        }
                        cutRow.DtPack = pack
                        cutRow.DtAmount = remainAmount / pack
                        findPd.DrugDStock = diff; remainAmount = 0;
                      } else {
                        if (findPd.DrugDStock % cutRow.DtPack) {
                          if (findPd.DrugDStock % findPd.DrugDPack) { pack = 1 } else { pack = findPd.DrugDPack }
                        }
                        cutRow.DtPack = pack
                        cutRow.DtAmount = findPd.DrugDStock / pack
                        findPd.DrugDStock = 0; remainAmount = Math.abs(diff)
                      }
                      cutRow.DtPrice = findPd.DrugDCost / findPd.DrugDPack * pack
                      dtCutData.push(cutRow)
                      findPd.hasUpdate = true
                      findPd.DrugDLast = new Date()
                    } else {
                      break
                    }
                  }
                })
                const insert = pgp.helpers.insert(inv_data, OTInvoice_cs, { table: 'OTInvoice', schema: schema }) +
                  ' ON CONFLICT ("StInvID") DO UPDATE SET ' +
                  OTInvoice_cs.assignColumns({ from: 'EXCLUDED', skip: 'StInvID' });
                task.push(t.none(insert))
                task.push(t.none('DELETE FROM $1:name."OTInvoiceDetail" WHERE "DtInvID" = $2', [schema, inv_data.StInvID]));
                const insert_detail = pgp.helpers.insert(dtCutData, OTInvoiceDetail_cs, { table: 'OTInvoiceDetail', schema: schema })
                task.push(t.none(insert_detail))
                const lotUpdateData = pdLotData.filter(x => x.hasUpdate);
                const lotUpdate = pgp.helpers.update(lotUpdateData, pdlot_update_cs, { table: 'DrugDetail', schema: schema }) + ' WHERE v."DrugLotID" = t."DrugLotID"';
                task.push(t.none(lotUpdate))
                return t.batch(task).then(() => {
                  return t.any(pdUpdateQuery, [schema, pdList]).then((result) => {
                    pdList.forEach(pId => {
                      const rIndex = result.findIndex(r => r.DrugID === pId)
                      if (rIndex === -1) {
                        result.push({
                          DrugID: pId, DrugStock: 0, DrugValue: 0, DrugExp: null, DrugLastOut: new Date()
                        });
                      } else {
                        result[rIndex].DrugLastOut = new Date();
                      }
                    });
                    const pdUpdate = pgp.helpers.update(result, pd_update_cs, { table: 'DrugItem', schema: schema }) + ' WHERE v."DrugID" = t."DrugID"'
                    return t.none(pdUpdate).then(() => { return { err_code: 0, otDetail: dtCutData } })
                  })
                })
              } else {
                return { err_code: 3, message: `ใบเบิกเลขที่ ${inv_data.StInvID} ไม่มีวัสดุที่สามารถตัดจ่ายได้...` }
              }
            })
          }
          const insert = pgp.helpers.insert(inv_data, OTInvoice_cs, { table: 'OTInvoice', schema: schema }) +
            ' ON CONFLICT ("StInvID") DO UPDATE SET ' +
            OTInvoice_cs.assignColumns({ from: 'EXCLUDED', skip: 'StInvID' });
          task.push(t.none(insert))
          if (detail_data.length) {
            task.push(t.none('DELETE FROM $1:name."OTInvoiceDetail" WHERE "DtInvID" = $2', [schema, inv_data.StInvID]));
            const insert_detail = pgp.helpers.insert(detail_data, OTInvoiceDetail_cs, { table: 'OTInvoiceDetail', schema: schema })
            task.push(t.none(insert_detail))
          }
          return t.batch(task).then(() => { return { err_code: 0, otDetail: [] } })
        })
      }
    })
      .then((result) => {
        if (result.err_code > 0) { res.json({ err_code: result.err_code, message: result.message }) }
        else {
          res.json({ err_code: 0, invId: inv_data.StInvID, otDetail: result.otDetail, message: `บันทึกใบเบิกเลขที่ ${inv_data.StInvID} เรียบร้อยแล้ว...` })
          const data = {
            id: inv_data.StInvID, name: inv_data.CustName,
            inv_date: req.body.update ? inv_data.StInvDateUpdate : inv_data.StInvDate,
            ref: inv_data.StInvRef, update: inv_data.StInvUpdate
          }
          req.io.emit('updateInvItem', { invType: 3, isDelete: false, depart: schema, data: [data] })
        }
      })
      .catch(err => { next(err); console.error(err) });
  } else {
    res.status(500).json({ message: `ไม่มีข้อมูลรายการใบเบิกวัสดุ` })
  }
})

router.delete('/invdelete', (req, res, next) => {
  const schema = req.query.sh;
  db.tx(t => {
    return t.any('SELECT "StInvID", "StInvUpdate" FROM $1:name."OTInvoice" WHERE "StInvID" = $2', [schema, req.query.id])
      .then(st => {
      if (st.length && st[0].StInvUpdate) {
        return { err_code: 1, message: `ไม่สามารถลบใบเบิกเลขที่ ${req.query.id} ได้ ใบเบิกนี้มีการเบิกจ่ายวัสดุออกเรียบร้อยแล้ว...` }
      }
      return t.none('DELETE FROM $1:name."OTInvoice" WHERE "StInvID" = $2',  [schema, req.query.id]).then(() => {
        return { err_code: 0 }
      })
    })
  })
  .then((result) => {
    if (result.err_code > 0) { res.status(422).json({ errcode: result.err_code, message: result.message }) }
    else {
      res.json({ message: `ลบใบเบิกเลขที่ ${req.query.id} เรียบร้อยแล้ว...` })
      req.io.emit('updateInvItem', { invType: 3, isDelete: true, depart: schema, data: [{ id: req.query.id }] })
    };
  })
  .catch(err => { next(err); console.error(err) });
})

router.post('/invcancel', (req, res, next) => {
  const schema = req.query.sh;
  const { id, inv_name } = req.body
  db.tx(t => {
    return t.any(`SELECT * FROM $1:name."OTInvoice" WHERE "StInvID" = $2`, [schema, id])
    .then(st => {
      if (st.length) {
        if (st[0].StInvUpdate) {
          let task = []
          return t.any(`SELECT "DtLotID", "DtDrugID", "DtAmount", "DtPack"
          FROM $1:name."OTInvoiceDetail" WHERE "DtInvID" = $2`, [schema, id]).then(lt => {
            if (lt.length) {
              const otLotList = lt.map(x => x.DtLotID);
              return t.any(`SELECT "DrugLotID", "DrugDStock" FROM $1:name."DrugDetail" WHERE "DrugLotID" IN ($2:csv)`, [schema, otLotList])
              .then(pdLotData => {
                lt.forEach(item => {
                  const found = pdLotData.find(x => x.DrugLotID === item.DtLotID);
                  found.DrugDStock += item.DtAmount * item.DtPack
                });
                const update = pgp.helpers.update(pdLotData, ['?DrugLotID', 'DrugDStock'], { table: 'DrugDetail', schema: schema }) + ' WHERE v."DrugLotID" = t."DrugLotID"';
                task.push(t.none(update))
                task.push(
                  t.none(`UPDATE $1:name."OTInvoice" SET "StInvUpdate" = false, "StInvDateUpdate" = null, "StKeyUser" = $2
                WHERE "StInvID" = $3`, [schema, req.decoded.user, id])
                )
                return t.batch(task).then(() => {
                  const pdList = lt.map(x => x.DtDrugID);
                  return t.any(pdUpdateQuery, [schema, pdList]).then((result) => {
                    const field = [
                      '?DrugID', 'DrugStock', 'DrugValue',
                      { name: 'DrugExp', cast: 'timestamptz' }
                    ];
                    const pdUpdate = pgp.helpers.update(result, field, { table: 'DrugItem', schema: schema }) + ' WHERE v."DrugID" = t."DrugID"';
                    return t.none(pdUpdate).then(() => { return { err_code: 0, inv: st[0] } })
                  })
                })
              })
            } else {
              return t.none('DELETE FROM $1:name."OTInvoice" WHERE StInvID = $2', [schema, id]).then(() => {
                return { err_code: 3, message: 'ไม่พบรายการวัสดุ ไม่สามารถดำเนินการยกเลิกได้..' };
              })
            }
          })
        } else {
          return { err_code: 2, message: `ใบเบิกเลขที่นี้ยังไม่ได้ทำการเบิกจ่าย หรือถูกยกเลิกการเบิกจ่ายโดยผู้อื่นแล้ว ไม่สามารถดำเนินการยกเลิกได้..` };
        }
      } else {
        return { err_code: 4, message: `ไม่พบใบเบิกนี้ หรือใบเบิกได้ถูกลบออกจากระบบแล้ว ไม่สามารถดำเนินการยกเลิกได้..` };
      }
    })
  }).then(result => {
    if (result.err_code > 0) { res.json({ err_code: result.err_code, message: result.message }) }
    else {
      res.json({ err_code: 0, message: `ยกเลิกการเบิกจ่าย ใบเบิกเลขที่ ${id} เรียบร้อยแล้ว...` })
      const data = {
        id: id, name: inv_name, inv_date: result.inv.StInvDate,
        ref: result.inv.StInvRef, update: false
      }
      req.io.emit('updateInvItem', { invType: 3, isDelete: false, depart: schema, data: [data] })
    };
  }).catch(err => { next(err); console.error(err) });
})

module.exports = router;