const express = require('express');
const router = express.Router();
// const ADODB = require('node-adodb');
const authen = require('./service/authen');

const db = require('./service/ms');
const dbuser = require('./service/dbuser');
// const ADODB = require('node-adodb');

// const db = ADODB.open(process.env.db_con);
// const dbuser = ADODB.open(process.env.dbuser_con);

router.use(authen.checkToken);

router.post('/select', (req, res, next) => {
  let sql = 'SELECT ' + req.body.field + ' FROM ' + req.body.table;
  if (req.body.where) { sql += ' WHERE ' + req.body.where; };
  if (req.body.group) { sql += ' GROUP BY ' + req.body.group; };
  if (req.body.order) { sql += ' ORDER BY ' + req.body.order; };
  db.query(sql)
    .then(data => { res.json(data); })
    .catch(err => { next(err); console.error(err) });
})

router.get('/mystate', (req, res, next) => {
  let sql = 'SELECT * FROM MyState';
  dbuser.query(sql)
    .then(data => { res.json(data); })
    .catch(err => { next(err); console.error(err) });
})

// get stock and outinvoice amount for request amount statistic
router.post('/otamount', (req, res, next) => {
  const dList = req.body.data
  const drugIdList = `("${dList.join('","')}")`
  let sql = `SELECT Sum([DtAmount]*[DtPack]) AS SumOut, DtDrugID, DrugStock, DrugExp
    FROM (OutInvoice INNER JOIN OutInvoiceDetail ON OutInvoice.StInvID = OutInvoiceDetail.DtInvID)
    INNER JOIN DrugItem ON OutInvoiceDetail.DtDrugID = DrugItem.DrugID
    WHERE (StInvUpdate = False) AND DtDrugID IN ${drugIdList}
    GROUP BY DtDrugID, DrugStock, DrugExp`;
  db.query(sql).then(ot => {
    const otList = ot.map(x => x.DtDrugID);
    let remain = []
    dList.forEach(d => {
      if (!otList.includes(d)) { remain.push(d) }
    })
    if (remain.length) {
      const remainList = `("${remain.join('","')}")`
      return db.query(`SELECT 0 AS SumOut, DrugID AS DtDrugID, DrugStock, DrugExp FROM DrugItem
      WHERE DrugItem.DrugID IN ${remainList}`).then(dt => {
        return [...ot, ...dt];
      })
    }
    return ot
  })
    .then(data => { res.json(data); })
    .catch(err => { next(err); console.error(err) });
})

router.get('/druglot', (req, res, next) => {
  db.query(`SELECT DrugCost, DrugExp FROM DrugItem WHERE DrugID = "${req.query.id}"`)
  .then(drug => {
    if (drug.length) {
      return db.query(`SELECT TOP 10 DrugDetail.*, Supplier.SupplierName 
      FROM DrugDetail INNER JOIN Supplier ON DrugDetail.DrugDSupply = Supplier.SupplierID
      WHERE DrugDID = "${req.query.id}" ORDER BY IIf([DrugDStock]=0,1000000,[DrugDExp]), DrugDExp DESC , DrugDDate`)
      .then(lot => { return [drug[0], lot] })
    }
    return [null, []]
  })
    .then(data => { res.json(data); })
    .catch(err => { next(err); console.error(err) });
})

router.get('/productlot', (req, res, next) => {
  let sql = `SELECT * FROM DrugDetail WHERE DrugDID = '${req.query.id}' AND `
  if (req.query.all === 'true') {
    sql += 'DrugDStock = 0 ORDER BY DrugDDate DESC'
  } else {
    sql += 'DrugDStock > 0 ORDER BY DrugDExp, DrugDDate'
  }
  db.query(sql)
  .then(data => { res.json(data); })
  .catch(err => { next(err); console.error(err) });
})

//po-stock api
router.put('/uppoinv', (req, res, next) => {
  let st = req.body.StInv;
  let sd = req.body.editData;
  let sa = req.body.addData;
  let te = req.body.editTName;
  let addTN = [];
  let taskTN = [];
  for (let i = 0; i < te.length; i++) {
    if (te[i].DtTNID == 0) {
      if (te[i].TName) {
        let sqlTN = 'INSERT INTO TradeName ( TDrugID, TSuppID, TName, TPack, TPrice ) ' +
          'VALUES ( "' + te[i].DtDrugID + '", "' + st.StInvCust + '", "' + te[i].TName + '", ' + te[i].DtPack + ', ' + te[i].DtPrice + ' )'
        let exec = db.execute(sqlTN, 'SELECT @@Identity AS TNID');
        taskTN.push(exec);
        addTN.push({ TDrugID: te[i].DtDrugID, TPack: te[i].DtPack });
      }
    } else {
      let sqlTN = 'UPDATE TradeName SET TradeName.TName = "' + te[i].TName + '" WHERE (TradeName.TNID) = ' + te[i].DtTNID
      let exec = db.execute(sqlTN);
      taskTN.push(exec);
    }
  }
  Promise.all(taskTN).then(result => {
    if (addTN.length > 0) {
      for (let i = 0; i < addTN.length; i++) {
        sd.forEach(stDetail => {
          if (stDetail.DtTNID == 0 && stDetail.DtDrugID == addTN[i].TDrugID && stDetail.DtPack == addTN[i].TPack) {
            stDetail.DtTNID = result[i][0].TNID;
          }
        });
        sa.forEach(stDetail => {
          if (stDetail.DtTNID == 0 && stDetail.DtDrugID == addTN[i].TDrugID && stDetail.DtPack == addTN[i].TPack) {
            stDetail.DtTNID = result[i][0].TNID;
          }
        });
      }
    }
    let sql = 'UPDATE POInvoice SET StInvDate = ' + convertDate(st.StInvDate) + ', StInvCust = "' + st.StInvCust +
      '", StQuoteDate = ' + convertDate(st.StQuoteDate) + ', StAppvDate = ' + convertDate(st.StAppvDate) +
      ', StApprID = ' + (st.StApprID ? '"' + st.StApprID + '"' : 'Null') + ', StApprDate = ' + convertDate(st.StApprDate) +
      ', StInvCat = ' + (st.StInvCat ? '"' + st.StInvCat + '"' : 'Null') + ', StInvTaxStatus = ' + st.StInvTaxStatus +
      ', StInvTaxValue = ' + st.StInvTaxValue + ', StInvBudget = "' + st.StInvBudget + '", StInvMethod = "' + st.StInvMethod +
      '", StInvStatus = ' + st.StInvStatus + ', StInvTF = ' + st.StInvTF +
      ', StInvDis1 = ' + st.StInvDis1 + ', StInvDis2 = ' + st.StInvDis2 +
      ', StKeyUser = "' + req.body.user + '", StInvMemo = ' + (st.StInvMemo ? '"' + st.StInvMemo + '"' : 'Null') +
      ' WHERE StInvID = "' + st.StInvID + '"';
    db.execute(sql).then(data => {
      let taskArr = [];
      for (let i = 0; i < sd.length; i++) {
        let sqlEdit = 'UPDATE POInvoiceDetail SET DtDrugID = "' + sd[i].DtDrugID +
          '", DtInnovate = ' + (sd[i].DtInnovate ? 'True' : 'False') +
          ', DtAmount = ' + sd[i].DtAmount + ', DtPack = ' + sd[i].DtPack +
          ', DtPrice = ' + sd[i].DtPrice + ', DtStock = ' + sd[i].DtStock +
          ', DtLocation = "' + (sd[i].DtLocation || '') + '", DtCoPO = ' + sd[i].DtCoPO +
          ', DtTNID = ' + sd[i].DtTNID +
          ' WHERE (DtDID = ' + sd[i].DtDID + ') AND (DtInvID = "' + sd[i].DtInvID + '")';
        let exec = db.execute(sqlEdit);
        taskArr.push(exec);
      }
      for (let i = 0; i < sa.length; i++) {
        let sqlAdd = 'INSERT INTO POInvoiceDetail ( DtInvID, DtDrugID, DtInnovate, DtAmount, DtPack, DtPrice, DtStock, DtLocation, DtTNID, DtCoPO ) ' +
          'VALUES ( "' + sa[i].DtInvID + '", "' + sa[i].DtDrugID + '", ' + (sa[i].DtInnovate ? 'True' : 'False') + ', ' + sa[i].DtAmount + ', ' + sa[i].DtPack +
          ', ' + sa[i].DtPrice + ', ' + sa[i].DtStock + ', "' + (sa[i].DtLocation || '') + '", ' + sa[i].DtTNID + ', ' + sa[i].DtCoPO + ' )';
        let exec = db.execute(sqlAdd);
        taskArr.push(exec);
      }
      if (req.body.deleteData.length > 0) {
        let sqlDelete = 'DELETE POInvoiceDetail.*, POInvoiceDetail.DtDID FROM POInvoiceDetail ' +
          'WHERE (POInvoiceDetail.DtDID) In (' + req.body.deleteData.join() + ')'
        let exec = db.execute(sqlDelete);
        taskArr.push(exec);
      }
      Promise.all(taskArr).then(result => {
        res.json({ message: "บันทึกข้อมูลเรียบร้อย..." });
        const data = {
          id: st.StInvID, supp_id: st.StInvCust, inv_date: st.StInvDate,
          ref: st.StApprID, inv_update: true
        }
        req.io.emit('centerInvItem', { invType: 2, isDelete: false, data: data })
      }).catch(err => { next(err); console.error(err) });
    }).catch(err => { next(err); console.error(err) });
  }).catch(err => { next(err); console.error(err) });
})

router.put('/insertst', (req, res, next) => {
  myState().then(mystate => {
    let STNo = req.body.STNo, StInv = req.body.StInv, pd = req.body.insertData, MyApprID = '';
    let sqlError = 'DELETE StockInvoice.* FROM StockInvoice WHERE StInvID ="' + STNo + '"'
    const now = new Date(), nowValue = convertDate(now.toISOString());
    if (StInv.StApprID && StInv.StApprID !== mystate.MyApprNo) {
      MyApprID = StInv.StApprID || '';
    } else {
      MyApprID = (mystate.MyApprNo + STNo.toString().slice(-4)) || '';
    }
    let sql = 'INSERT INTO StockInvoice ( StInvID, StInvDate, StQuoteDate, StAppvDate, StOrderID, StOrderDate, StApprID, StApprDate, StInvCust, StInvCat, StInvMemo, ' +
      'StInvBudget, StInvMethod, StInvTaxStatus, StInvTaxValue, StInvStatus, StInvDis1, StInvDis2, StInvUpdate, StKeyUser, StInvTF ) ' +
      'VALUES ( "' + STNo + '", ' + nowValue + ', ' + convertDate(StInv.StQuoteDate) + ', ' + convertDate(StInv.StAppvDate) + ', "' + StInv.StInvID + '", ' +
      convertDate(StInv.StInvDate) + ', "' + MyApprID + '", ' + convertDate(StInv.StApprDate) + ', "' + StInv.StInvCust + '", ' + (StInv.StInvCat ? '"' + StInv.StInvCat + '"' : 'Null') +
      ', "สร้างจากใบสั่งซื้อเลขที่ ' + StInv.StInvID + '", "' + StInv.StInvBudget + '", "' + StInv.StInvMethod + '", ' + StInv.StInvTaxStatus + ', ' + StInv.StInvTaxValue +
      ', ' + StInv.StInvStatus + ', ' + StInv.StInvDis1 + ', ' + StInv.StInvDis2 + ', False, "' + req.body.user + '", 0 )'
    db.execute(sql).then(data => {
      let taskExec = [];
      for (let i = 0; i < pd.length; i++) {
        let sqlInsert = 'INSERT INTO StockInvoiceDetail ( DtLotID, DtInvID, DtDrugID, DtAmount, DtPack, DtPrice, DtStock, DtStock2, DtLocation, DtTNID, DtCoPO, DtInnovate ) ' +
          'VALUES ( 0, "' + STNo + '", "' + pd[i].DtDrugID + '", ' + pd[i].DtAmount + ', ' + pd[i].DtPack + ', ' + pd[i].DtPrice + ', ' + pd[i].DtStock + ', ' + pd[i].DtStock2 + ', ' +
          (pd[i].Location ? '"' + pd[i].Location + '"' : 'Null') + ', ' + pd[i].DtTNID + ', ' + pd[i].DtCoPO + ', ' + (pd[i].DtInnovate ? 'True' : 'False') + ' )'
        let exec = db.execute(sqlInsert);
        taskExec.push(exec);
      }
      Promise.all(taskExec).then(result => {
        res.json({ message: "สร้างใบรับวัสดุเลขที่ " + STNo + " เรียบร้อย..." });
      }).catch(err => {
        next(err);
        console.error(err);
        db.execute(sqlError).then(result => {
          console.log('delete ' + STNo);
        }).catch(err => { next(err); console.error(err) });
      })
    }).catch(err => { next(err); console.error(err) });
  }).catch(err => { next(err); console.error(err) });
})

router.put('/delpolist', (req, res, next) => {
  if (req.body.delLists.length > 0) {
    let sqlDelete = 'DELETE POInvoiceDetail.*, POInvoiceDetail.DtDID FROM POInvoiceDetail ' +
      'WHERE (POInvoiceDetail.DtDID) In (' + req.body.delLists.join() + ')'
    db.execute(sqlDelete)
      .then(result => { res.json({ message: "ปรับปรุงข้อมูลเรียบร้อย..." }) })
      .catch(err => { next(err); console.error(err) });
  }
})

router.delete('/deletepo/:pono', (req, res, next) => {
  let sql = 'DELETE POInvoice.* FROM POInvoice WHERE StInvID ="' + req.params.pono + '"'
  db.execute(sql)
  .then(result => {
    res.json({ message: "ลบใบสั่งซื้อเรียบร้อย..." })
    req.io.emit('centerInvItem', { invType: 2, isDelete: true, data: { id: req.params.pono } })
  })
  .catch(err => { next(err); console.error(err) });
})

//in-stock api
router.put('/upstinv', (req, res, next) => {
  let st = req.body.StInv;
  let sd = req.body.editData;
  let sa = req.body.addData;
  let te = req.body.editTName;
  let addTN = [];
  let taskTN = [];
  for (let i = 0; i < te.length; i++) {
    if (te[i].DtTNID == 0) {
      if (te[i].TName) {
        let sqlTN = 'INSERT INTO TradeName ( TDrugID, TSuppID, TName, TPack, TPrice ) ' +
          'VALUES ( "' + te[i].DtDrugID + '", "' + st.StInvCust + '", "' + te[i].TName + '", ' + te[i].DtPack + ', ' + te[i].DtPrice + ' )'
        let exec = db.execute(sqlTN, 'SELECT @@Identity AS TNID');
        taskTN.push(exec);
        addTN.push({ TDrugID: te[i].DtDrugID, TPack: te[i].DtPack });
      }
    } else {
      let sqlTN = 'UPDATE TradeName SET TradeName.TName = "' + te[i].TName + '" WHERE (TradeName.TNID) = ' + te[i].DtTNID
      let exec = db.execute(sqlTN);
      taskTN.push(exec);
    }
  }
  Promise.all(taskTN).then(result => {
    if (addTN.length > 0) {
      for (let i = 0; i < addTN.length; i++) {
        sd.forEach(stDetail => {
          if (stDetail.DtTNID == 0 && stDetail.DtDrugID == addTN[i].TDrugID && stDetail.DtPack == addTN[i].TPack) {
            stDetail.DtTNID = result[i][0].TNID;
          }
        });
        sa.forEach(stDetail => {
          if (stDetail.DtTNID == 0 && stDetail.DtDrugID == addTN[i].TDrugID && stDetail.DtPack == addTN[i].TPack) {
            stDetail.DtTNID = result[i][0].TNID;
          }
        });
      }
    }
    let sql = 'UPDATE StockInvoice SET StInvDate = ' + convertDate(st.StInvDate) + ', StInvCust = "' + st.StInvCust +
      '", StOrderID = ' + (st.StOrderID ? '"' + st.StOrderID + '"' : 'Null') + ', StOrderDate = ' + convertDate(st.StOrderDate) +
      ', StQuoteDate = ' + convertDate(st.StQuoteDate) + ', StAppvDate = ' + convertDate(st.StAppvDate) +
      ', StApprID = ' + (st.StApprID ? '"' + st.StApprID + '"' : 'Null') + ', StApprDate = ' + convertDate(st.StApprDate) +
      ', StInvRef = ' + (st.StInvRef ? '"' + st.StInvRef + '"' : 'Null') + ', StInvRefDate = ' + convertDate(st.StInvRefDate) +
      ', StInvCat = ' + (st.StInvCat ? '"' + st.StInvCat + '"' : 'Null') + ', StInvTaxStatus = ' + st.StInvTaxStatus +
      ', StInvTaxValue = ' + st.StInvTaxValue + ', StInvBudget = "' + st.StInvBudget + '", StInvMethod = "' + st.StInvMethod +
      '", StInvStatus = ' + st.StInvStatus + ', StInvPayID = ' + (st.StInvPayID ? '"' + st.StInvPayID + '"' : 'Null') +
      ', StInvDis1 = ' + st.StInvDis1 + ', StInvDis2 = ' + st.StInvDis2 +
      ', StKeyUser = "' + req.body.user + '", StInvMemo = ' + (st.StInvMemo ? '"' + st.StInvMemo + '"' : 'Null') +
      ' WHERE StInvID = "' + st.StInvID + '"';
    db.execute(sql).then(data => {
      let taskArr = [];
      for (let i = 0; i < sd.length; i++) {
        let sqlEdit = 'UPDATE StockInvoiceDetail SET DtDrugID = "' + sd[i].DtDrugID +
          '", DtInnovate = ' + (sd[i].DtInnovate ? 'True' : 'False') +
          ', DtAmount = ' + sd[i].DtAmount + ', DtPack = ' + sd[i].DtPack +
          ', DtPrice = ' + sd[i].DtPrice + ', DtStock = ' + sd[i].DtStock +
          ', DtLot = "' + (sd[i].DtLot || '') + '", DtExp = ' + convertDate(sd[i].DtExp) +
          ', DtLocation = "' + (sd[i].DtLocation || '') + '", DtCoPO = ' + sd[i].DtCoPO +
          ', DtTNID = ' + sd[i].DtTNID +
          ' WHERE (DtDID = ' + sd[i].DtDID + ') AND (DtInvID = "' + sd[i].DtInvID + '")';
        let exec = db.execute(sqlEdit);
        taskArr.push(exec);
      }
      for (let i = 0; i < sa.length; i++) {
        let sqlAdd = 'INSERT INTO StockInvoiceDetail ( DtInvID, DtDrugID, DtInnovate, DtAmount, DtPack, DtPrice, DtStock, DtLot, DtExp, DtLocation, DtTNID, DtCoPO ) ' +
          'VALUES ( "' + sa[i].DtInvID + '", "' + sa[i].DtDrugID + '", ' + (sa[i].DtInnovate ? 'True' : 'False') + ', ' + sa[i].DtAmount + ', ' + sa[i].DtPack +
          ', ' + sa[i].DtPrice + ', ' + sa[i].DtStock + ', "' + (sa[i].DtLot || '') + '", ' + convertDate(sa[i].DtExp) + ', "' + (sa[i].DtLocation || '') +
          '", ' + sa[i].DtTNID + ', ' + sa[i].DtCoPO + ' )';
        let exec = db.execute(sqlAdd);
        taskArr.push(exec);
      }
      if (req.body.deleteData.length > 0) {
        let sqlDelete = 'DELETE StockInvoiceDetail.*, StockInvoiceDetail.DtDID FROM StockInvoiceDetail ' +
          'WHERE (StockInvoiceDetail.DtDID) In (' + req.body.deleteData.join() + ')'
        let exec = db.execute(sqlDelete);
        taskArr.push(exec);
      }
      Promise.all(taskArr)
        .then(result => { res.json({ message: "บันทึกข้อมูลเรียบร้อย..." }); })
        .catch(err => { next(err); console.error(err) });
    }).catch(err => { next(err); console.error(err) });
  }).catch(err => { next(err); console.error(err) });
})

//out-stock api
router.put('/upoutinv', (req, res, next) => {
  let ot = req.body.StInv;
  let sql = 'UPDATE OutInvoice SET OutInvoice.StInvDate = ' + convertDate(ot.StInvDate) + ', OutInvoice.StInvCust = "' + ot.StInvCust +
    '", OutInvoice.StInvRef = ' + (ot.StInvRef ? '"' + ot.StInvRef + '"' : 'Null') + ', OutInvoice.StInvMemo = ' + (ot.StInvMemo ? '"' + ot.StInvMemo + '"' : 'Null') +
    ', OutInvoice.StInvStatus = ' + ot.StInvStatus + ', OutInvoice.StInvTF = ' + ot.StInvTF + ', OutInvoice.StKeyUser = "' + req.body.user + '"' +
    ' WHERE OutInvoice.StInvID = "' + ot.StInvID + '"';
  db.execute(sql).then(data => {
    let taskArr = [];
    let od = req.body.editData;
    for (let i = 0; i < od.length; i++) {
      let sqlEdit = 'UPDATE OutInvoiceDetail SET OutInvoiceDetail.DtLotID = ' + od[i].DtLotID + ', OutInvoiceDetail.DtDrugID = "' + od[i].DtDrugID +
        '", OutInvoiceDetail.DtAmount = ' + od[i].DtAmount + ', OutInvoiceDetail.DtPack = ' + od[i].DtPack +
        ', OutInvoiceDetail.DtPrice = ' + od[i].DtPrice + ', OutInvoiceDetail.DtStock = ' + od[i].DtStock +
        ', OutInvoiceDetail.DtRemain = ' + od[i].DtRemain + ', OutInvoiceDetail.DtLot = "' + (od[i].DtLot || '') +
        '", OutInvoiceDetail.DtExp = ' + convertDate(od[i].DtExp) + ', OutInvoiceDetail.DtLocation = "' + (od[i].DtLocation || '') +
        '", OutInvoiceDetail.DtTNID = ' + od[i].DtTNID +
        ' WHERE (OutInvoiceDetail.DtDID = ' + od[i].DtDID + ') AND (OutInvoiceDetail.DtInvID = "' + od[i].DtInvID + '")';
      let exec = db.execute(sqlEdit);
      taskArr.push(exec);
    }
    let oa = req.body.addData;
    for (let i = 0; i < oa.length; i++) {
      let sqlAdd = 'INSERT INTO OutInvoiceDetail ( DtLotID, DtInvID, DtDrugID, DtAmount, DtPack, DtPrice, DtStock, DtRemain, DtLot, DtExp, DtLocation, DtTNID ) ' +
        'VALUES ( ' + oa[i].DtLotID + ', "' + oa[i].DtInvID + '", "' + oa[i].DtDrugID + '", ' + oa[i].DtAmount + ', ' + oa[i].DtPack + ', ' + oa[i].DtPrice + ', ' + oa[i].DtStock + ', ' +
        oa[i].DtRemain + ', "' + (oa[i].DtLot || '') + '", ' + convertDate(oa[i].DtExp) + ', "' + (oa[i].DtLocation || '') + '", ' + oa[i].DtTNID + ' )';
      let exec = db.execute(sqlAdd);
      taskArr.push(exec);
    }
    if (req.body.deleteData.length > 0) {
      let sqlDelete = 'DELETE OutInvoiceDetail.*, OutInvoiceDetail.DtDID FROM OutInvoiceDetail ' +
        'WHERE (OutInvoiceDetail.DtDID) In (' + req.body.deleteData.join() + ')'
      let exec = db.execute(sqlDelete);
      taskArr.push(exec);
    }
    Promise.all(taskArr)
      .then(result => { res.json({ message: "บันทึกข้อมูลเรียบร้อย..." }); })
      .catch(err => { next(err); console.error(err) });
  }).catch(err => { next(err); console.error(err) });
})

//drug-rate api
router.put('/drugrate', (req, res, next) => {
  let sql = `SELECT DrugItem.DrugID, DrugItem.DrugName, DrugItem.DrugCat, DrugItem.DrugGroup, DrugItem.DrugManu, DrugItem.DrugSupply, 
    DrugItem.DrugType, DrugItem.DrugCostUpdate, DrugItem.CoPO, DrugItem.DrugPack, DrugItem.DrugStock, DrugItem.Out1, DrugItem.Out2, DrugItem.Out3, 
    DrugItem.DrugMin, DrugItem.DrugMax, DrugItem.Location, DrugItem.OrderNeed, DrugItem.NotActive, DrugItem.Innovate, 
    [DrugName] & " " & [TypeName] & " " & [DrugContent] AS DrugNameText, UnitType.DrugUnit, Supplier_1.SupplierName AS ManuName, 
    Supplier.SupplierName AS SupplyName, ([Out2] + [Out3]) / 2 AS OutRateAvg, 
    IsNull(DLookUp("[DtDrugID]", "POInvoiceDetail", "[DtDrugID]='" & [DrugID] & "'")) AS INPO 
    FROM Supplier INNER JOIN (UnitType INNER JOIN (DrugTypeItem INNER JOIN (DrugItem INNER JOIN Supplier AS Supplier_1 
    ON DrugItem.DrugManu = Supplier_1.SupplierID) ON DrugTypeItem.TypeID = DrugItem.DrugType) 
    ON UnitType.UnitID = DrugItem.DrugUnitID) ON Supplier.SupplierID = DrugItem.DrugSupply 
    WHERE ${req.body.criteria} ORDER BY DrugItem.DrugName;`
  db.query(sql)
    .then(data => { res.json(data); })
    .catch(err => { next(err); console.error(err) });
})

router.put('/insertpo', (req, res, next) => {
  myState().then(mystate => {
    let po = req.body.POInv;
    let sqlError = 'DELETE POInvoice.* FROM POInvoice WHERE StInvID ="' + po.PONo + '"'
    const now = new Date(), nowValue = convertDate(now.toISOString());
    let sql = 'INSERT INTO POInvoice ( StInvID, StInvDate, StOrderID, StOrderDate, StApprID, StApprDate, StInvCust, ' +
      'StInvCat, StInvMemo, StInvBudget, StInvMethod, StInvUpdate, StInvCalc, StKeyUser, StInvTF ) ' +
      'VALUES ( "' + po.PONo + '", ' + nowValue + ', "' + po.PONo + '", ' + nowValue + ', "' + mystate.MyApprNo + '", ' +
      (convertDate(now.toISOString()) + mystate.MyApprDay - mystate.MyOrderDay) + ', "' + po.StInvCust + '", "' +
      po.catName + '", "สร้างจากรายงานอัตราการใช้", "30", "01", False, False, "' + req.body.user + '", 0 )'
    db.execute(sql).then(data => {
      let pd = req.body.insertData, DrugIDList = [];
      for (let i = 0; i < pd.length; i++) {
        pd[i].DtTNID = 0;
        pd[i].DtInnovate = false;
        DrugIDList.push("'" + pd[i].DrugID + "'");
      }
      let sqlTname = "SELECT TNID, TDrugID, TPack, TInnovate FROM TradeName WHERE [TSuppID] = '" + po.StInvCust + "' And [TDrugID] In (" + DrugIDList.join(",") + ")";
      db.query(sqlTname).then(tnameResult => {
        let taskExec = [];
        for (let i = 0; i < pd.length; i++) {
          if (tnameResult && tnameResult.length > 0) {
            let found = tnameResult.find(item => { return item.TDrugID === pd[i].DrugID && item.TPack === pd[i].OPack });
            if (found) {
              pd[i].DtTNID = found.TNID;
              pd[i].DtInnovate = found.TInnovate;
            }
          }
          let sqlInsert = 'INSERT INTO POInvoiceDetail ( DtInvID, DtLotID, DtDrugID, DtPack, DtAmount, DtPrice, DtStock2, DtLocation, DtTNID, DtCoPO, DtInnovate ) ' +
            'VALUES ( "' + po.PONo + '", 0, "' + pd[i].DrugID + '", ' + pd[i].OPack + ', ' + pd[i].OAmount + ', ' + (pd[i].DrugCostUpdate * pd[i].OPack) + ', ' +
            pd[i].DrugStock + ', ' + (pd[i].Location ? '"' + pd[i].Location + '"' : 'Null') + ', ' + pd[i].DtTNID + ', ' + pd[i].CoPO + ', ' + (pd[i].DtInnovate ? 'True' : 'False') + ' )'
          let exec = db.execute(sqlInsert);
          taskExec.push(exec);
        }
        Promise.all(taskExec).then(result => {
          res.json({ message: "สร้างใบสั่งซื้อเลขที่ " + po.PONo + " เรียบร้อย..." })
        }).catch(err => {
          next(err); console.error(err);
          db.execute(sqlError)
            .then(result => { console.log('delete' + po.PONo); })
            .catch(err => { next(err); console.error(err); })
        });
      }).catch(err => {
        next(err);
        console.error(err);
        db.execute(sqlError)
          .then(result => { console.log('delete' + po.PONo) })
          .catch(err => { next(err); console.error(err) });
      })
    }).catch(err => { next(err); console.error(err) });
  }).catch(err => { next(err); console.error(err) });
})

router.put('/insertot', async (req, res, next) => {
  let ot = req.body.OTInv;
  let sqlError = 'DELETE OutInvoice.* FROM OutInvoice WHERE StInvID ="' + ot.OTNo + '"'
  const now = new Date(), nowValue = convertDate(now.toISOString());
  let sql = 'INSERT INTO OutInvoice ( StInvID, StInvDate, StInvCust, ' +
    'StInvRef, StInvMemo, StInvUpdate, StInvCalc, StKeyUser, StInvTF, StInvSend ) ' +
    'VALUES ( "' + ot.OTNo + '", ' + nowValue + ', "' + ot.StInvCust + '", "' +
    ot.StInvRef + '", "' + `สร้างจากใบขอเบิก ${ot.StInvRef}` + '", False, False, "' + req.body.user + '", 0, False )';
  try {
    await db.execute(sql);
    let pd = req.body.insertData, DrugIDList = [];
    let taskExec = [];
    pd.forEach(item => { DrugIDList.push("'" + item.DtDrugID + "'") })
    let sqlDrugItem = "SELECT DrugID, DrugStock, DrugCost, DrugExp, Location FROM DrugItem WHERE [DrugID] In (" + DrugIDList.join(",") + ")";
    const drugItem = await db.query(sqlDrugItem);
    pd.forEach(p => {
      if (p.DtAmount > 0) {
        let found = drugItem.find(item => item.DrugID === p.DtDrugID);
        if (found) {
          p.DtStock = found.DrugStock;
          p.DtRemain = found.DrugStock - (p.DtAmount * p.DtPack)
          p.DtPrice = found.DrugCost * p.DtPack
          p.DtExp = found.DrugExp
          p.DtLocation = found.Location
          let sqlInsert = 'INSERT INTO OutInvoiceDetail ( DtInvID, DtLotID, DtDrugID, DtPack, DtAmount, DtPrice, DtStock, DtRemain, DtExp, DtLocation, DtTNID ) ' +
            'VALUES ( "' + ot.OTNo + '", 0, "' + p.DtDrugID + '", ' + p.DtPack + ', ' + p.DtAmount + ', ' + p.DtPrice + ', ' +
            p.DtStock + ', ' + p.DtRemain + ', ' + convertDate(p.DtExp) + ', ' + (p.DtLocation ? '"' + p.DtLocation + '"' : 'Null') + ', 0 );'
          taskExec.push(sqlInsert);
        }
      }
    })
    if (taskExec.length) {
      const batchSize = 30;
      const numberOfLoop = Math.ceil(taskExec.length / batchSize);
      for (let i = 0; i < numberOfLoop; i++) {
        const taskRun = taskExec.filter((_, index) => index >= (i * batchSize) && index < ((i + 1) * batchSize));
        await Promise.all(taskRun.map(x => db.execute(x)));
        await delayForWork(5000);
      }
      res.json({ message: "สร้างใบเบิกเลขที่ " + ot.OTNo + " เรียบร้อย..." });
    } else {
      await db.execute(sqlError);
      console.log('delete' + ot.OTNo);
      res.json({ message: "ไม่มีรายการที่สามารถสร้างใบเบิก " + ot.OTNo + " ได้..." })
    }
  } catch (error) {
    console.error(error);
    db.execute(sqlError).then(result => {
      console.log('delete' + ot.OTNo);
      next(error);
    }).catch(err => { next(err); console.error(err) });
  }
})

function delayForWork(time) {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve(true);
    }, time);
  })
}

function convertDate(jsISODate) {
  if (jsISODate && jsISODate != "1970-01-01T00:00:00Z") {
    let d = new Date(jsISODate);
    return (d.valueOf() / 1000 / 86400) + 25569 + (7 / 24);
    // return d.valueOf() / 1000 / 86400 + 25569 + 0.29166666666;
  } else {
    return 'Null';
  }
}

function myState() {
  return new Promise((resolve, reject) => {
    let sql = 'SELECT * FROM MyState';
    dbuser.query(sql).then(data => {
      if (data && data.length > 0) { resolve(data[0]) }
      else { reject(0) };
    })
    .catch(error => { reject(error); })
  });
}

module.exports = router;