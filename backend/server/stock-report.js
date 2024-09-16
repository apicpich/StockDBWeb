const express = require('express');
const router = express.Router();
const authen = require('./service/authen');

const db = require('./service/ms');

router.use(authen.checkToken);

router.put('/stock', (req, res, next) => {
  db.query(`SELECT DrugID, DrugCost, DrugCostUpdate, DrugRemark, DrugLastIn,
  DrugLastOut, DrugMin FROM DrugItem WHERE ${req.body.criteria} ORDER BY DrugID`)
  .then(dItem => {
    if (dItem.length) {
      const dItemList = dItem.map(x => x.DrugID);
      return db.query(`SELECT DrugDID, DrugDDate, DrugInvID, DrugDSupply, DrugDLot,
      DrugDAmount, DrugDPack, DrugDCost, DrugDStock, DrugDExp FROM DrugDetail 
      WHERE DrugDID IN ("${dItemList.join('","')}") AND ${req.body.criteria2}
      ORDER BY DrugDID, DrugDExp, DrugDDate`).then(dLot => {
        return [dItem, dLot]
      });
    }
    return [[], []]
  })
  .then(data => { res.json(data); })
  .catch(err => { next(err); console.error(err) });
})

router.post('/stockcard', (req, res, next) => {
  if (req.body.id) {
    const criteria = req.body.criteria;
    Promise.all([
      db.query(`SELECT DrugID, DrugStock, DrugValue FROM DrugItem WHERE DrugID = '${req.body.id}'`),
      db.query(`SELECT StockInvoiceDetail.*, StInvID, StInvDate, StInvCust, StInvRef, StInvDateUpdate, StKeyUser, 0 AS mode
        FROM StockInvoiceDetail INNER JOIN StockInvoice ON StockInvoiceDetail.DtInvID = StockInvoice.StInvID
        WHERE ${criteria} ORDER BY StInvDateUpdate, DtDID`),
      db.query(`SELECT OutInvoiceDetail.*, StInvID, StInvDate, StInvCust, StInvRef, StInvDateUpdate, StKeyUser, 1 AS mode
        FROM OutInvoiceDetail INNER JOIN OutInvoice ON OutInvoiceDetail.DtInvID = OutInvoice.StInvID
        WHERE ${criteria} ORDER BY StInvDateUpdate, DtDID`)
    ])
    .then(data => { res.json(data); })
    .catch(err => { next(err); console.error(err) });  
  } else {
    res.status(400).json({ errcode: 1, message: "กรุณาระบุรายการวัสดุ.." })
  }
})

module.exports = router;
