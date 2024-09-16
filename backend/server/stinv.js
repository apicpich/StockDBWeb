const express = require('express');
const router = express.Router();
const authen = require('./service/authen');

const db = require('./service/db');
const pgp = db.$config.pgp;
const {
  dateKeyId, pdlot_cs, pdUpdateQuery
} = require('./service/model');

const STInvoice_cs = new pgp.helpers.ColumnSet([
  'StInvID', { name: 'StInvDate', cast: 'timestamptz' }, 'StInvCust', 'StInvRef', 'StInvUpdate',
  { name: 'StInvDateUpdate', cast: 'timestamptz' }, 'StKeyUser', 'StInvStatus', 'StInvMemo'
]);

const STInvoiceDetail_cs = new pgp.helpers.ColumnSet([
  'DtDID', 'DtInvID', 'DtDrugID', 'DtAmount', 'DtPack', 'DtPrice', 'DtLot',
  { name: 'DtExp', cast: 'timestamptz' }, 'DtTNID'
]);

const pd_update_cs = new pgp.helpers.ColumnSet([
  '?DrugID', 'DrugStock', 'DrugValue',
  { name: 'DrugExp', cast: 'timestamptz' },
  { name: 'DrugLastIn', cast: 'timestamptz' },
  'DrugSupply', 'DrugCost', 'DrugCostUpdate'
]);

const pd_in_update_cs = pd_update_cs.extend(['OrderNeed'])

router.use(authen.checkToken);

router.get('/todaylist', (req, res, next) => {
  const sql = `SELECT "StInvID" AS id, "StInvDate" AS inv_date, "SupplierName" AS name, "StInvRef" AS ref, "StInvUpdate" AS update
    FROM $1:name."STInvoice" T1 INNER JOIN $1:name."Supplier" T2 ON T1."StInvCust" = T2."SupplierID" 
    WHERE "StInvDateUpdate"::date = now()::date OR "StInvUpdate" = false ORDER BY "StInvUpdate", "StInvID"`
  db.any(sql, req.query.sh)
   .then(data => { res.json(data); })
   .catch(err => { next(err); console.error(err) });
})

router.get('/invlist', (req, res, next) => {
  let sql = `SELECT "StInvID", "StInvDate", "StInvCust", "SupplierName", "StInvRef", "StInvUpdate"
    FROM $1:name."STInvoice" T1 INNER JOIN $1:name."Supplier" T2 ON T1."StInvCust" = T2."SupplierID"`
    if (req.query.search) {
      sql += pgp.as.format(
        ` WHERE "StInvID" ILIKE $1 OR "StInvCust" ILIKE $1 OR "SupplierName" ILIKE $1
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
    task.push(t.any(`SELECT * FROM $1:name."STInvoice" WHERE "StInvID" = $2`, [req.query.sh, req.query.id]))
    task.push(t.any(`SELECT * FROM $1:name."STInvoiceDetail" WHERE "DtInvID" = $2 ORDER BY "DtDID"`,
      [req.query.sh, req.query.id]))
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
        const mntSearch = 'RC' + dateKeyId();
        return t.any('SELECT Max("StInvID") AS max_id FROM $1:name."STInvoice" WHERE "StInvID" ILike $2', [schema, mntSearch + '%'])
          .then(invId => {
            let runId = '001';
            if (invId[0].max_id) {
              runId = ('00' + (+invId[0].max_id.slice(-3) + 1)).slice(-3)
            }
            inv_data.StInvID = mntSearch + runId
            detail_data.forEach(item => { item.DtInvID = inv_data.StInvID })
            const insert = pgp.helpers.insert(inv_data, STInvoice_cs, { table: 'STInvoice', schema: schema })
            task.push(t.none(insert))
            const insert_detail = pgp.helpers.insert(detail_data, STInvoiceDetail_cs, { table: 'STInvoiceDetail', schema: schema })
            task.push(t.none(insert_detail))
            return t.batch(task).then(() => {
              return { err_code: 0 }
            })
          })
      } else {
        return t.any('SELECT "StInvID", "StInvUpdate" FROM $1:name."STInvoice" WHERE "StInvID" = $2', [schema, inv_data.StInvID])
        .then(st => {
          if (st.length) {
            if (st[0].StInvUpdate) {
              if (req.body.update) {
                return { err_code: 1, message: `ใบรับเลขที่ ${inv_data.StInvID} ได้มีการรับเข้าไปก่อนหน้าแล้ว...` }
              } else {
                if (detail_data.length) {
                  return { err_code: 1, message: `ใบรับเลขที่ ${inv_data.StInvID} ได้มีการรับเข้าไปก่อนหน้าแล้ว...` }
                }
              }
            }
          }
          if (req.body.update) {
            inv_data.StInvUpdate = true;
            inv_data.StInvDateUpdate = new Date()
          }
          const insert = pgp.helpers.insert(inv_data, STInvoice_cs, { table: 'STInvoice', schema: schema }) +
            ' ON CONFLICT ("StInvID") DO UPDATE SET ' +
            STInvoice_cs.assignColumns({ from: 'EXCLUDED', skip: 'StInvID' });
          task.push(t.none(insert))
          if (detail_data.length) {
            task.push(t.none('DELETE FROM $1:name."STInvoiceDetail" WHERE "DtInvID" = $2', [schema, inv_data.StInvID]));
            const insert_detail = pgp.helpers.insert(detail_data, STInvoiceDetail_cs, { table: 'STInvoiceDetail', schema: schema })
            task.push(t.none(insert_detail))
          }
          return t.batch(task).then(() => {
            if (detail_data.length) {
              let pdList = [], pdCost = [];
              if (req.body.update) {
                let pdlot_data = [];
                detail_data.forEach(item => {
                  pdlot_data.push({
                    DrugDID: item.DtDrugID, DrugDDate: new Date(), DrugInvID: item.DtInvID,
                    DrugDSupply: inv_data.StInvCust, DrugDAmount: item.DtAmount, DrugDPack: item.DtPack,
                    DrugDCost: item.DtPrice, DrugDLot: item.DtLot, DrugDExp: item.DtExp,
                    DrugDStock: item.DtAmount * item.DtPack, DrugDLast: null, DrugTNID: item.DtTNID
                  })
                  if (!pdList.includes(item.DtDrugID)) { pdList.push(item.DtDrugID) };
                  const found = pdCost.find(x => x.pd_id === item.DtDrugID);
                  if (found) {
                    found.amount_sum += item.DtAmount * item.DtPack; found.cost_sum += item.DtAmount * item.DtPrice;
                  } else {
                    pdCost.push({ pd_id: item.DtDrugID, amount_sum: item.DtAmount * item.DtPack, cost_sum: item.DtAmount * item.DtPrice });
                  }
                });
                return t.any('SELECT "DrugID", "DrugStock", "DrugCost" FROM $1:name."DrugItem" WHERE "DrugID" IN ($2:csv)', [schema, pdList])
                .then(pv => {
                  const pvList = pv.map(item => item.DrugID)
                  const pdNoList = pdList.filter(item => !pvList.includes(item))
                  let pdNoListData = [], pdNoListInsert = ''
                  if (pdNoList.length) {
                    pdNoList.forEach(noList => {
                      pdNoListData.push({ DrugID: noList });
                    })
                    pdNoListInsert = pgp.helpers.insert(pdNoListData, ['DrugID'], { table: 'DrugItem', schema: schema }) + ';'
                  }
                  const insert_pdlot = pgp.helpers.insert(pdlot_data, pdlot_cs, { table: 'DrugDetail', schema: schema })
                  return t.multi(pdNoListInsert + insert_pdlot).then(() => {
                    return t.any(pdUpdateQuery, [schema, pdList]).then((result) => {
                      result.forEach(r => {
                        r.DrugLastIn = new Date();
                        r.DrugSupply = inv_data.StInvCust;
                        const found = pdCost.find(x => x.pd_id === r.DrugID);
                        r.DrugCostUpdate = found.cost_sum / found.amount_sum;
                        const pvFound = pv.find(x => x.DrugID === r.DrugID);
                        if (pvFound) {
                          r.DrugCost = ((pvFound.DrugStock * pvFound.DrugCost) + found.cost_sum) / (pvFound.DrugStock + found.amount_sum);
                        } else {
                          r.DrugCost = r.DrugCostUpdate;
                        }
                        r.OrderNeed = false
                      });
                      const pdUpdate = pgp.helpers.update(result, pd_in_update_cs, { table: 'DrugItem', schema: schema }) + ' WHERE v."DrugID" = t."DrugID"';
                      return t.none(pdUpdate).then(() => { return { err_code: 0 } })
                    })
                  })
                })
              } else {
                return { err_code: 0 }
              }
            }
            return { err_code: 0 }
          })
        })
      }
    })
      .then((result) => {
        if (result.err_code > 0) { res.json({ err_code: result.err_code, message: result.message }) }
        else {
          res.json({ err_code: 0, invId: inv_data.StInvID, message: `บันทึกใบรับเลขที่ ${inv_data.StInvID} เรียบร้อยแล้ว...` })
          const data = {
            id: inv_data.StInvID, name: inv_data.SupplierName,
            inv_date: req.body.update ? inv_data.StInvDateUpdate : inv_data.StInvDate,
            ref: inv_data.StInvRef, update: inv_data.StInvUpdate
          }
          req.io.emit('updateInvItem', { invType: 2, isDelete: false, depart: schema, data: [data] })
        }
      })
      .catch(err => { next(err); console.error(err) });
  } else {
    res.status(500).json({ message: `ไม่มีข้อมูลรายการใบรับวัสดุ` })
  }
})

router.delete('/invdelete', (req, res, next) => {
  const schema = req.query.sh;
  db.tx(t => {
    return t.any('SELECT "StInvID", "StInvUpdate" FROM $1:name."STInvoice" WHERE "StInvID" = $2', [schema, req.query.id])
    .then(st => {
      if (st.length && st[0].StInvUpdate) {
        return { err_code: 1, message: `ไม่สามารถลบใบรับเลขที่ ${req.query.id} ได้ ใบรับนี้มีการรับเข้าเรียบร้อยแล้ว...` }
      }
      return t.none('DELETE FROM $1:name."STInvoice" WHERE "StInvID" = $2', [schema, req.query.id]).then(() => {
        return { err_code: 0 }
      })
    })
  })
  .then((result) => {
    if (result.err_code > 0) { res.status(422).json({ errcode: result.err_code, message: result.message }) }
    else {
      res.json({ message: `ลบใบรับเลขที่ ${req.query.id} เรียบร้อยแล้ว...` })
      req.io.emit('updateInvItem', { invType: 2, isDelete: true, depart: schema, data: [{ id: req.query.id }] })
    };
  })
  .catch(err => { next(err); console.error(err) });
})

router.post('/invcancel', (req, res, next) => {
  const schema = req.query.sh;
  const { id, inv_name } = req.body
  db.tx(t => {
    return t.any(`SELECT * FROM $1:name."STInvoice" WHERE "StInvID" = $2`, [schema, id])
    .then(st => {
      if (st.length) {
        if (st[0].StInvUpdate) {
          let task = []
          task.push(
            t.any(`SELECT * FROM $1:name."STInvoiceDetail" WHERE "DtInvID" = $2`, [schema, id])
          )
          task.push(t.any('SELECT * FROM $1:name."DrugDetail" WHERE "DrugInvID" = $2', [schema, id]))
          return t.batch(task).then(([stdetail, pdlot]) => {
            if (stdetail.length) {
              if (pdlot.length) {
                const stPdList = [... new Set(stdetail.map(item => item.DtDrugID))] // get unique id
                for (let i = 0; i < stdetail.length; i++) {
                  const findex = pdlot.findIndex(x => {
                    return x.DrugDID === stdetail[i].DtDrugID && x.DrugDStock === (stdetail[i].DtAmount * stdetail[i].DtPack)
                  })
                  if (findex > -1) {
                    pdlot.splice(findex, 1)
                  } else {
                    return { err_code: 1, message: 'มีวัสดุบางรายการได้เบิกออกไปแล้ว ไม่สามารถทำการยกเลิกการรับได้..' };
                  }
                }
                let task2 = []
                task2.push(t.none('DELETE FROM $1:name."DrugDetail" WHERE "DrugInvID" = $2', [schema, id]))
                task2.push(
                  t.none(`UPDATE $1:name."STInvoice" SET "StInvUpdate" = false, "StInvDateUpdate" = null, "StKeyUser" = $2
                  WHERE "StInvID" = $3`, [schema, req.decoded.user, id])
                )
                return t.batch(task2).then(() => {
                  return t.any('SELECT "DrugID", "DrugCost", "DrugStock" FROM $1:name."DrugItem" WHERE "DrugID" IN ($2:csv)', [schema, stPdList])
                  .then(dItem => {
                    return t.any(
                      `SELECT "DrugDID", "DrugDDate", "DrugDSupply", "DrugDCost", "DrugDPack" FROM $1:name."DrugDetail" WHERE "DrugLotID" IN (
                      SELECT Max("DrugLotID") FROM $1:name."DrugDetail" WHERE "DrugDID" IN ($2:csv) GROUP BY "DrugDID")`, [schema, stPdList]
                    ).then(dCost => {
                      return t.any(pdUpdateQuery, [schema, stPdList]).then((result) => {
                        stPdList.forEach(pId => {
                          const rIndex = result.findIndex(r => r.DrugID === pId)
                          if (rIndex === -1) {
                            result.push({
                              DrugID: pId, DrugStock: 0, DrugValue: 0, DrugCost: 0, DrugCostUpdate: 0,
                              DrugExp: null, DrugSupply: null, DrugLastIn: null
                            });
                          } else {
                            const pdStList = stdetail.filter(x => x.DtDrugID === pId)
                            const sumDtAmount = pdStList.reduce((sum, cur) => sum + (cur.DtAmount * cur.DtPack), 0)
                            const sumValue = pdStList.reduce((sum, cur) => sum + (cur.DtAmount * cur.DtPrice), 0)
                            const pd = dItem.find(x => x.DrugID === pId)
                            result[rIndex].DrugCost = ((pd.DrugStock * pd.DrugCost) - sumValue) / (pd.DrugStock - sumDtAmount)
                            const costData = dCost.find(x => x.DrugDID === pId)
                            if (costData) {
                              result[rIndex].DrugLastIn = costData.DrugDDate
                              result[rIndex].DrugSupply = costData.DrugDSupply
                              result[rIndex].DrugCostUpdate = costData.DrugDCost / costData.DrugDPack
                            } else {
                              result[rIndex].DrugLastIn = null
                              result[rIndex].DrugSupply = null
                              result[rIndex].DrugCostUpdate = 0
                            }
                          }
                        });
                        const pdUpdate = pgp.helpers.update(result, pd_update_cs, { table: 'DrugItem', schema: schema }) + ' WHERE v."DrugID" = t."DrugID"';
                        return t.none(pdUpdate).then(() => { return { err_code: 0, inv: st[0] } })
                      })
                    })
                  })
                })
              } else {
                return { err_code: 1, message: 'ไม่พบรายการ lot วัสดุ ไม่สามารถดำเนินการยกเลิกได้..' };
              }
            } else {
              return t.none('DELETE FROM $1:name."STInvoice" WHERE StInvID = $2', [schema, id]).then(() => {
                return { err_code: 3, message: 'ไม่พบรายการวัสดุ ไม่สามารถดำเนินการยกเลิกได้..' };
              })
            }
          })
        } else {
          return { err_code: 2, message: 'ใบรับเลขที่นี้ยังไม่ได้ทำการรับเข้า หรือถูกยกเลิกการรับโดยผู้อื่นแล้ว ไม่สามารถดำเนินการยกเลิกได้..' };
        }
      } else {
        return { err_code: 4, message: 'ไม่พบใบรับนี้ หรือใบรับได้ถูกลบออกจากระบบแล้ว ไม่สามารถดำเนินการยกเลิกได้..' };
      }
    })
  }).then(result => {
    if (result.err_code > 0) { res.json({ err_code: result.err_code, message: result.message }) }
    else {
      res.json({ err_code: 0, message: `ยกเลิกการรับเข้า ใบรับเลขที่ ${id} เรียบร้อยแล้ว...` })
      const data = {
        id: id, name: inv_name, inv_date: result.inv.StInvDate,
        ref: result.inv.StInvRef, update: false
      }
      req.io.emit('updateInvItem', { invType: 2, isDelete: false, depart: schema, data: [data] })
    };
  }).catch(err => { next(err); console.error(err) });
})

module.exports = router;