const express = require('express');
const router = express.Router();
const authen = require('./service/authen');
const line = require('./service/line-notify');

const db = require('./service/db');
const pgp = db.$config.pgp;

const ms = require('./service/ms');

const { dateKeyId, genUniqueID, genDate } = require('./service/model');

const RQInvoice_cs = new pgp.helpers.ColumnSet([
  'StInvID', { name: 'StInvDate', cast: 'timestamptz' }, 'StInvDepart', 'StInvRef', 'StInvUpdate',
  { name: 'StInvDateUpdate', cast: 'timestamptz' }, 'StKeyUser', 'StInvStatus', 'StInvMemo', 'StKeyApprove'
], { table: 'RQInvoice' });

const RQInvoiceDetail_cs = new pgp.helpers.ColumnSet([
  'DtDID', 'DtInvID', 'DtDrugID', 'DtRQAmount', 'DtAmount', 'DtPack', 'DtPrice',
  'DtMonthBefore', 'DtMonth', 'DtStockNow', 'DtRemark'
], { table: 'RQInvoiceDetail' });

const APInvoice_cs = new pgp.helpers.ColumnSet([
  'StInvID', { name: 'StInvDate', cast: 'timestamptz' }, 'StInvDepart', 'StInvRef', 'StInvUpdate',
  { name: 'StInvDateUpdate', cast: 'timestamptz' }, 'StKeyUser', 'StInvStatus', 'StInvMemo', 'StInvApprove'
], { table: 'APInvoice' });

const APInvoiceDetail_cs = new pgp.helpers.ColumnSet([
  'DtDID', 'DtLotID', 'DtInvID', 'DtDrugID', 'DtAmount', 'DtPack', 'DtPrice', 'DtLot',
  { name: 'DtExp', cast: 'timestamptz' }, 'DtTNID', 'DtRemark'
], { table: 'APInvoiceDetail' });

router.use(authen.checkToken);

router.get('/todaylist', (req, res, next) => {
  const apprv = (req.query.inv === 'APInvoice') ? '"StInvApprove"' : 'true';
  let query = pgp.as.format(
    `SELECT "StInvID" AS id, "StInvDate" AS inv_date, "StInvDepart" AS depart, depart_name AS name,
    "StInvRef" AS ref, "StInvUpdate" AS update, ${apprv} AS approve
    FROM $1:name INNER JOIN depart ON $1:name."StInvDepart" = depart.depart_id`, req.query.inv
  )
  const depart = req.query.depart ? pgp.as.format(`"StInvDepart" = $1 AND`, req.query.depart) : '';
  query += ` WHERE ${depart} ("StInvDateUpdate"::date = now()::date OR "StInvUpdate" = false) ORDER BY "StInvUpdate", "StInvID"`
  db.any(query)
   .then(data => { res.json(data); })
   .catch(err => { next(err); console.error(err) });
})

router.get('/invlist', (req, res, next) => {
  const apprv = (req.query.inv === 'APInvoice') ? ',"StInvApprove"' : '';
  let query = pgp.as.format(
    `SELECT "StInvID", "StInvDate", "StInvDepart", depart_name, "StInvRef", "StInvUpdate" ${apprv}
    FROM $1:name INNER JOIN depart ON $1:name."StInvDepart" = depart.depart_id`, req.query.inv
  )
  const depart = req.query.depart ? pgp.as.format(`"StInvDepart" = $1 AND`, req.query.depart) : '';
  if (req.query.search) {
    query += pgp.as.format(
      ` WHERE ${depart} ("StInvID" ILIKE $1 OR depart_name ILIKE $1
      OR "StInvRef" ILIKE $1 OR to_char("StInvDate", 'mmyy') = $2) 
      ORDER BY "StInvUpdate", "StInvDate" DESC, "StInvID" DESC LIMIT 100`
      , [req.query.search + '%', ('0000' + req.query.search).slice(-4)]
    )
  } else {
    query += ` WHERE ${depart} true ORDER BY "StInvUpdate", "StInvDate" DESC, "StInvID" DESC LIMIT 100`
  }
  db.any(query)
    .then(data => { res.json(data); })
    .catch(err => { next(err); console.error(err) });
})

router.get('/invid', (req, res, next) => {
  db.task(t => {
    let task = [];
    task.push(t.any(`SELECT * FROM $1:name WHERE "StInvID" = $2`, [req.query.inv, req.query.id]))
    task.push(t.any(`SELECT * FROM $1:name WHERE "DtInvID" = $2 ORDER BY "DtDID"`, [req.query.inv + 'Detail', req.query.id]))
    return t.batch(task)
  })
    .then(data => { res.json(data); })
    .catch(err => { next(err); console.error(err) });
})

router.post('/invoice', (req, res, next) => {
  const inv_data = req.body.inv;
  const tbl = req.query.tbl;
  const detail_data = req.body.detail;
  let cs, cs_detail, title, title2, invType;
  if (tbl === 'RQInvoice') {
    cs = RQInvoice_cs; cs_detail = RQInvoiceDetail_cs;
    title = 'ขอเบิก'; title2 = 'อนุมัติและโอนเป็นใบเบิก'; invType = 0;
  } else {
    cs = APInvoice_cs; cs_detail = APInvoiceDetail_cs;
    title = 'นำส่ง'; title2 = 'โอนเข้าใบรับ';  invType = 1;
  }
  if (inv_data && detail_data) {
    db.tx(t => {
      let task = [];
      if (req.body.isNewInv) {
        const mntSearch = inv_data.StInvDepart + '-' + tbl.slice(0, 2) + dateKeyId();
        return t.any('SELECT Max("StInvID") AS max_id FROM $1:name WHERE "StInvID" ILike $2', [tbl, mntSearch + '%'])
        .then(invId => {
          let runId = '001';
          if (invId[0].max_id) {
            runId = ('00' + (+invId[0].max_id.slice(-3) + 1)).slice(-3)
          }
          inv_data.StInvID = mntSearch + runId
          inv_data.StKeyUser = req.decoded.user;
          detail_data.forEach(item => { item.DtInvID = inv_data.StInvID })
          const insert = pgp.helpers.insert(inv_data, cs)
          task.push(t.none(insert))
          const insert_detail = pgp.helpers.insert(detail_data, cs_detail)
          task.push(t.none(insert_detail))
          return t.batch(task).then(() => {
            return { err_code: 0 }
          })
        })
      } else {
        return t.any('SELECT "StInvID", "StInvUpdate" FROM $1:name WHERE "StInvID" = $2', [tbl, inv_data.StInvID])
        .then(inv => {
          if (inv.length) {
            if (inv[0].StInvUpdate) {
              if (req.body.update) {
                return { err_code: 1, message: `ใบ${title}เลขที่ ${inv_data.StInvID} ได้มีการ${title2}ไปก่อนหน้าแล้ว...` }
              } else {
                if (detail_data.length) {
                  return { err_code: 1, message: `ใบ${title}เลขที่ ${inv_data.StInvID} ได้มีการ${title2}ไปก่อนหน้าแล้ว...` }
                }
              }
            }
            // update inv
            if (req.body.update) {
              inv_data.StInvUpdate = true;
              inv_data.StInvDateUpdate = new Date()
              inv_data.StKeyApprove = req.decoded.user;
              inv_data.StInvApprove = true
            }
            const insert = pgp.helpers.insert(inv_data, cs) +
              ' ON CONFLICT ("StInvID") DO UPDATE SET ' +
              cs.assignColumns({ from: 'EXCLUDED', skip: 'StInvID' });
            task.push(t.none(insert))
            if (detail_data.length) {
              task.push(t.none('DELETE FROM $1:name WHERE "DtInvID" = $2', [tbl + 'Detail', inv_data.StInvID]));
              const insert_detail = pgp.helpers.insert(detail_data, cs_detail)
              task.push(t.none(insert_detail))
            }
            return t.batch(task).then(() => {
              return { err_code: 0 }
            })  
          }
        })
      }
    })
    .then((result) => {
      if (result.err_code > 0) { res.json({ err_code: result.err_code, message: result.message }) }
      else {
        res.json({ err_code: 0, invId: inv_data.StInvID, message: `บันทึกใบ${title}เลขที่ ${inv_data.StInvID} เรียบร้อยแล้ว...` })
        const data = {
          id: inv_data.StInvID, depart: inv_data.StInvDepart, name: inv_data.depart_name,
          inv_date: req.body.update ? inv_data.StInvDateUpdate : inv_data.StInvDate,
          ref: inv_data.StInvRef, update: inv_data.StInvUpdate, approve: invType === 1 ? inv_data.StInvApprove : true
        }
        req.io.emit('updateInvItem', { invType: invType, isDelete: false, stateUpdate: req.body.update, data: [data] })
        if (req.body.line_noti) {
          // const message = `${req.body.update ? 'โอน' : 'บันทึก'}ใบ${title}วัสดุ > ${inv_data.depart_name}\nเลขที่ ${inv_data.StInvID} จำนวนวัสดุ ${detail_data.length} รายการ\n${req.body.update ? title2 + 'เรียบร้อยแล้ว' : ''}`
          const message = `บันทึกใบ${title}วัสดุ > ${inv_data.depart_name}\nเลขที่ ${inv_data.StInvID} จำนวนวัสดุ ${detail_data.length} รายการ ${inv_data.StInvRef ? '(อ้างอิง ' + inv_data.StInvRef + ')' : ''}`
          line.send(message, inv_data.StInvDepart).then(response => {
            if (response) {
              req.io.emit('line1', { depart: inv_data.StInvDepart, remaining: response.headers['x-ratelimit-remaining'] })
            }
          }).catch(err => { console.error(err) });
        }
      }
    })
    .catch(err => { next(err); console.error(err) });
  } else {
    res.status(500).json({ message: `ไม่มีข้อมูลรายการใบ${title}` })
  }
})

router.delete('/invdelete', (req, res, next) => {
  const tbl = req.query.tbl;
  const inv_id = req.query.id;
  let title, title2, invType;
  if (tbl === 'RQInvoice') {
    title = 'ขอเบิก'; title2 = 'โอนเป็นใบเบิก';  invType = 0;
  } else {
    title = 'นำส่ง'; title2 = 'โอนเข้าใบรับ';  invType = 1;
  }
  db.tx(t => {
    return t.any('SELECT "StInvID", "StInvUpdate" FROM $1:name WHERE "StInvID" = $2', [tbl, inv_id])
    .then(st => {
      if (st.length && st[0].StInvUpdate) {
        return { err_code: 1, message: `ไม่สามารถลบใบ${title}เลขที่ ${inv_id} ได้ ใบ${title}นี้มีการ${title2}เรียบร้อยแล้ว...` }
      }
      return t.none('DELETE FROM $1:name WHERE "StInvID" = $2', [tbl, inv_id]).then(() => {
        return { err_code: 0 }
      })
    })
  })
  .then((result) => {
    if (result.err_code > 0) { res.status(422).json({ errcode: result.err_code, message: result.message }) }
    else {
      res.json({ message: `ลบใบ${title}เลขที่ ${inv_id} เรียบร้อยแล้ว...` })
      req.io.emit('updateInvItem', { invType: invType, isDelete: true, data: [{ id: inv_id }] })
    };
  })
  .catch(err => { next(err); console.error(err) });
})

router.post('/invcancel', (req, res, next) => {
  const tbl = req.query.tbl;
  const inv_id = req.body.id;
  const depart_name = req.body.depart_name;
  let title, title2, invType, approve;
  if (tbl === 'RQInvoice') {
    title = 'ขอเบิก'; title2 = 'โอนเป็นใบเบิก'; invType = 0; approve = ''
  } else {
    title = 'นำส่ง'; title2 = 'โอนเข้าใบรับ'; invType = 1; approve = ', "StInvApprove"'
  }
  db.tx(t => {
    return t.any(`SELECT "StInvID", "StInvDate", "StInvDepart", "StInvRef", "StInvUpdate"${approve} FROM $1:name WHERE "StInvID" = $2`, [tbl, inv_id])
    .then(st => {
      if (st.length) {
        if (st[0].StInvUpdate) {
          return t.none(
            `UPDATE $1:name 
            SET "StInvUpdate" = false, "StInvDateUpdate" = null${invType === 0 ? ', "StKeyApprove" = null' : ', "StKeyUser" = $2'}
            WHERE "StInvID" = $3`,
            [tbl, req.decoded.user, inv_id]
          ).then(() => {
            return { err_code: 0, inv: st[0] }
          })
        }
        return { err_code: 2, message: `ใบ${title}เลขที่นี้ยังไม่ได้ทำการ${title2} หรือถูกยกเลิกการ${title2}โดยผู้อื่นแล้ว ไม่สามารถดำเนินการยกเลิกได้..` };
      } else {
        return { err_code: 4, message: `ไม่พบใบ${title}นี้ หรือใบ${title}ได้ถูกลบออกจากระบบแล้ว ไม่สามารถดำเนินการยกเลิกได้..` };
      }
    })
  }).then(result => {
    if (result.err_code > 0) { res.json({ err_code: result.err_code, message: result.message }) }
    else {
      res.json({ err_code: 0, message: `ยกเลิกการ${title2} ใบ${title}เลขที่ ${inv_id} เรียบร้อยแล้ว...` })
      const data = {
        id: inv_id, depart: result.inv.StInvDepart, name: depart_name, inv_date: result.inv.StInvDate,
        ref: result.inv.StInvRef, update: false, approve: invType === 1 ? result.inv.StInvApprove : true
      }
      req.io.emit('updateInvItem', { invType: invType, isDelete: false, stateUpdate: true, data: [data] })
    };
  }).catch(err => { next(err); console.error(err) });
})

router.get('/rqamount', (req, res, next) => {
  db.any(
    `SELECT "StInvID", "StInvDepart", "StInvRef", "DtAmount", "DtPack"
    FROM "RQInvoice" INNER JOIN "RQInvoiceDetail" ON "RQInvoice"."StInvID" = "RQInvoiceDetail"."DtInvID"
    WHERE "StInvUpdate" = false AND "StInvID" <> $1 AND "DtDrugID" = $2 AND "DtAmount" > 0 ORDER BY "StInvID"`
    , [req.query.invid, req.query.pdid]
  ).then(data => { res.json(data); })
   .catch(err => { next(err); console.error(err) });
})

router.post('/autorq', (req, res, next) => {
  db.any(
    `SELECT Sum("DtAmount" * "DtPack") AS apprv, "DtDrugID"
    FROM "RQInvoice" INNER JOIN "RQInvoiceDetail" ON "RQInvoice"."StInvID" = "RQInvoiceDetail"."DtInvID"
    WHERE "StInvUpdate" = false AND "StInvID" <> $1 AND "DtDrugID" IN ($2:csv) AND "DtAmount" > 0
    GROUP BY "DtDrugID"`
    , [req.body.invid, req.body.data]
  ).then(data => { res.json(data); })
   .catch(err => { next(err); console.error(err) });
})

router.post('/saveformot', (req, res, next) => {
  const req_data = req.body.data
  const id_list = req_data.map(x => x.StInvID);
  const depart_list = [... new Set(req_data.map(x => x.StInvCust))]
  const sql = `SELECT OutInvoiceDetail.* FROM OutInvoiceDetail WHERE DtInvID IN ("${id_list.join('","')}") ORDER BY DtInvID, DtDID;`
  ms.query(sql).then(detail => {
    if (detail.length) {
      return db.tx(t => {
        return t.any(
          `SELECT "StInvDepart", Max("StInvID") AS max_id FROM "APInvoice"
          WHERE "StInvDepart" IN ($1:csv) GROUP BY "StInvDepart"`, [depart_list]
        ).then(maxList => {
          const dateKey = dateKeyId()
          req_data.forEach(r => {
            r.StInvDepart = r.StInvCust; r.StInvDate = genDate(r.StInvDate);
            r.StInvMemo = 'จากใบเบิก ' + r.StInvID;
            r.OldStInvID = r.StInvID; r.StInvUpdate = false; r.StInvDateUpdate = null;
            r.StInvStatus = null; r.StKeyUser = req.decoded.user;
            r.hasDetail = false
            const dpFind = maxList.find(x => x.StInvDepart === r.StInvDepart)
            if (dpFind) {
              if (!dpFind.running) {
                if (dpFind.max_id.slice(-7).slice(0, 4) === dateKey) {
                  dpFind.running = +dpFind.max_id.slice(-3) + 1
                } else {
                  dpFind.running = 1
                }
              }
              r.StInvID = dpFind.StInvDepart + '-AP' + dateKey + ('00' + dpFind.running).slice(-3)
              dpFind.running++
            } else {
              r.StInvID = r.StInvDepart + '-AP' + dateKey + '001'
              maxList.push({ StInvDepart: r.StInvDepart, running: 2 })
            }
          })
          let curInvId = '', invid = '', rq, recCount = 0;
          for (let i = 0; i < detail.length; i++){
            let dt = detail[i]
            if (curInvId !== dt.DtInvID) {
              if (rq) rq.recCount = recCount;
              rq = req_data.find(x => x.OldStInvID === dt.DtInvID)
              rq.hasDetail = true
              invid = rq.StInvID
              curInvId = dt.DtInvID
              recCount = 0
            }
            dt.DtDID = genUniqueID(i * 10)
            dt.DtInvID = invid
            dt.DtExp = genDate(dt.DtExp)
            dt.DtRemark = null
            recCount++
          }
          rq.recCount = recCount
          const inv = req_data.filter(x => x.hasDetail);
          const insert = pgp.helpers.insert(inv, APInvoice_cs)
          const insert_detail = pgp.helpers.insert(detail, APInvoiceDetail_cs)
          return t.batch([t.none(insert), t.none(insert_detail)])
            .then(() => { return { err_code: 0, inv: inv } })
        })
      })
    } else {
      // no detail
      return { err_code: 1, message: `ไม่พบรายการวัสดุในใบเบิกที่ต้องการ...` }
    }
  }).then(result => {
    if (result.err_code > 0) { res.json({ err_code: result.err_code, message: result.message }) }
    else {
      const inv = result.inv;
      res.json({ err_code: 0, message: `บันทึกใบเบิกจำนวน ${inv.length} รายการเป็นใบนำส่ง เรียบร้อยแล้ว...` })
      let data = []
      inv.forEach(inv_data => {
        data.push({
          id: inv_data.StInvID, depart: inv_data.StInvDepart, name: inv_data.depart_name,
          inv_date: inv_data.StInvDate, ref: inv_data.StInvRef, update: inv_data.StInvUpdate,
          approve: inv_data.StInvApprove
        })
      })
      req.io.emit('updateInvItem', { invType: 1, isDelete: false, stateUpdate: false, data: data })
      const lineInv = inv.filter(x => x.StInvApprove);
      const departToSend = lineInv.map(x => x.StInvDepart);
      db.any(`SELECT depart_id, depart_line_token FROM depart WHERE depart_id IN ($1:csv) AND depart_line_token <> ''`, [departToSend])
      .then(lineDepart => {
        if (lineDepart.length) {
          let lineTask = []
          inv.forEach(inv_data => {
            if (inv_data.StInvApprove) {
              const found = lineDepart.find(x => x.depart_id === inv_data.StInvDepart)
              if (found) {
                const message = `บันทึกใบนำส่งวัสดุ > ${inv_data.depart_name}\nเลขที่ ${inv_data.StInvID} จำนวนวัสดุ ${inv_data.recCount} รายการ ${inv_data.StInvRef ? '(อ้างอิง ' + inv_data.StInvRef + ')' : ''}`
                lineTask.push(line.sendWithToken(message, found.depart_line_token))
              }
            }
          })
          Promise.all(lineTask).then(()=>{}).catch(err => { console.error(err) })
        }
      }).catch(err => { console.error(err) })
    }
  })
    .catch(err => { next(err); console.error(err) });
})

module.exports = router;