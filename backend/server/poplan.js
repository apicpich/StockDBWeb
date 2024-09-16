const express = require('express');
const router = express.Router();
// const ADODB = require('node-adodb');
const authen = require('./service/authen');

const db = require('./service/ms');
const dbuser = require('./service/dbuser');

// const db = ADODB.open(process.env.db_con);
// const dbuser = ADODB.open(process.env.dbuser_con);

router.use(authen.checkToken);

router.get('/getpoplan/:yearplan', (req, res, next) => {
  const y = +req.params.yearplan;
  myState().then(mystate => {
    const em = ('0' + mystate.MyEndMonth).slice(-2);
    let task = [];
    let sql1 = `SELECT POAnnualPlan.*, [DrugName] & " " & [TypeName] & " " & [DrugContent] AS DrugName2, DrugItem.DrugCat, UnitType.DrugUnit, DrugItem.NotActive 
      FROM ((POAnnualPlan INNER JOIN DrugItem ON POAnnualPlan.PDrugID = DrugItem.DrugID) INNER JOIN UnitType 
      ON DrugItem.DrugUnitID = UnitType.UnitID) INNER JOIN DrugTypeItem ON DrugItem.DrugType = DrugTypeItem.TypeID 
      WHERE (POAnnualPlan.PYear) = '${(y - 543).toString().slice(-2)}';`
    task.push(db.query(sql1));
    let sql2 = `SELECT MonthStock.NDrugID, MonthStock.NDrugAmount FROM MonthStock 
      WHERE (MonthStock.NPeriod) = '${em + (y - 544).toString().slice(-2)}' And (MonthStock.NDrugAmount) > 0;`
    task.push(db.query(sql2));
    for (let i = 1; i <= 3; i++){
      let sql = `SELECT StockInvoiceDetail.DtDrugID, Sum(([DtAmount]*[DtPack])+DtStock) AS ${'Y' + i} 
        FROM StockInvoice INNER JOIN StockInvoiceDetail ON StockInvoice.StInvID = StockInvoiceDetail.DtInvID 
        WHERE Int(Right([StInvCalcPeriod],2) & Left([StInvCalcPeriod],2)) > '${(y - 544 - i).toString().slice(-2) + em}' 
        And Int(Right([StInvCalcPeriod],2) & Left([StInvCalcPeriod],2)) <= '${(y - 543 - i).toString().slice(-2) + em}' 
        GROUP BY StockInvoiceDetail.DtDrugID;`
      let tk1 = db.query(sql);
      task.push(tk1);
    }
    for (let i = 1; i <= 4; i++) {
      let period1 = mystate.MyEndMonth + (3 * (i - 1)) + 1;
      if (period1 > 12) { period1 = (y - 2543) * 100 + period1 - 12 }
      else { period1 = (y - 2544) * 100 + period1 } 
      let period2 = mystate.MyEndMonth + (3 * i) + 1;
      if (period2 > 12) { period2 = (y - 2543) * 100 + period2 - 12 }
      else { period2 = (y - 2544) * 100 + period2 }  
      let sql = `SELECT DrugItem.DrugCat, StockInvoiceDetail.DtDrugID, Sum(([DtAmount]*[DtPack])+DtStock) AS ${'Q' + i}, 
        Sum(CDbl([DtAmount])*IIf([StInvTaxStatus]=2,([DtPrice]-[DtDis])*(1+[StInvTaxValue]/100),[DtPrice]-[DtDis])) AS ${'V' + i} 
        FROM (StockInvoice INNER JOIN StockInvoiceDetail ON StockInvoice.StInvID = StockInvoiceDetail.DtInvID) 
        INNER JOIN DrugItem ON StockInvoiceDetail.DtDrugID = DrugItem.DrugID 
        WHERE Int(Right([StInvCalcPeriod],2) & Left([StInvCalcPeriod],2)) >= ${period1} 
        And Int(Right([StInvCalcPeriod],2) & Left([StInvCalcPeriod],2)) < ${period2} 
        GROUP BY DrugItem.DrugCat, StockInvoiceDetail.DtDrugID;`
      let tk2 = db.query(sql);
      task.push(tk2);
    }
    Promise.all(task).then(data => {
      const blankcatdata = { DrugCat: '', RQ1: 0, RQ2: 0, RQ3: 0, RQ4: 0, RV1: 0, RV2: 0, RV3: 0, RV4: 0 };
      let sumPOCat = [];
      for (let i = 1; i <= 4; i++){
        if (data[i + 4].length > 0) {
          let cDrugCat = data[i + 4][0].DrugCat, row = Object.assign({}, blankcatdata);
          row.DrugCat = data[i + 4][0].DrugCat;
          data[i + 4].forEach(item => {
            if (cDrugCat !== item.DrugCat) {
              let found = sumPOCat.find(x => x.DrugCat === cDrugCat);
              if (found) {
                found['RQ' + i] = row['RQ' + i]; found['RV' + i] = row['RV' + i];
              } else {
                sumPOCat.push(row);
              }
              cDrugCat = item.DrugCat;
              row = Object.assign({}, blankcatdata);
              row.DrugCat = item.DrugCat;
            }
            if (item['Q' + i] > 0) { row['RQ' + i]++; row['RV' + i] += item['V' + i]; };
          })
          let found = sumPOCat.find(x => x.DrugCat === cDrugCat);
          if (found) {
            found['RQ' + i] = row['RQ' + i]; found['RV' + i] = row['RV' + i];
          } else {
            sumPOCat.push(row);
          }
        }
      }
      if (data[0].length > 0) {
        data[0].forEach(result => {
          let foundStock = data[1].find(x => x.NDrugID === result.PDrugID);
          if (foundStock) { result.YStockX = foundStock.NDrugAmount / result.PPack } else { result.YStockX = 0 };
          if (result.PAmount - result.YStockX < 0) { result.POAmount = 0 } else { result.POAmount = Math.round(result.PAmount - result.YStockX) };
          result.PValue = result.POAmount * result.PPricePack;
          result.QTotal = 0;
          result.VTotal = 0;
          for (let i = 1; i <= 4; i++){
            result['PQ' + i + 'Value'] = result['PQ' + i] * result.PPricePack;
            if (i < 4){
              let foundY = data[i + 1].find(x => x.DtDrugID === result.PDrugID);
              if (foundY) { result['Y' + i] = foundY['Y' + i] / result.PPack } else { result['Y' + i] = 0 };
            }
            let foundQ = data[i + 4].find(x => x.DtDrugID === result.PDrugID);
            if (foundQ) {
              result['Q' + i] = foundQ['Q' + i] / result.PPack; result['V' + i] = foundQ['V' + i];
            } else { result['Q' + i] = 0; result['V' + i] = 0 };
            result.QTotal += result['Q' + i];
            result.VTotal += result['V' + i];
          }
        })
      }
      res.json([data[0], sumPOCat]);
    }).catch(err => { next(err); console.error(err) });
  }).catch(err => { next(err); console.error(err) });
})

router.get('/getfilterpocatplan/:start/:end', (req, res, next) => {
  let task = [];
  let sql1 = `SELECT DrugItem.DrugCat, 
    Sum(CDbl([DtAmount])*IIf([StInvTaxStatus]=2,([DtPrice]-[DtDis])*(1+[StInvTaxValue]/100),[DtPrice]-[DtDis])) AS InAmount 
    FROM (StockInvoice INNER JOIN StockInvoiceDetail ON StockInvoice.StInvID = StockInvoiceDetail.DtInvID) 
    INNER JOIN DrugItem ON StockInvoiceDetail.DtDrugID = DrugItem.DrugID 
    WHERE Int(Right([StInvCalcPeriod],2) & Left([StInvCalcPeriod],2)) >= ${req.params.start} 
    And Int(Right([StInvCalcPeriod],2) & Left([StInvCalcPeriod],2)) <= ${req.params.end} 
    GROUP BY DrugItem.DrugCat;`
  task.push(db.query(sql1));
  let sql2 = `SELECT DISTINCT DrugItem.DrugCat, StockInvoiceDetail.DtDrugID 
    FROM (StockInvoice INNER JOIN StockInvoiceDetail ON StockInvoice.StInvID = StockInvoiceDetail.DtInvID) 
    INNER JOIN DrugItem ON StockInvoiceDetail.DtDrugID = DrugItem.DrugID 
    WHERE Int(Right([StInvCalcPeriod],2) & Left([StInvCalcPeriod],2)) >= ${req.params.start} 
    And Int(Right([StInvCalcPeriod],2) & Left([StInvCalcPeriod],2)) <= ${req.params.end};`
  task.push(db.query(sql2));
  Promise.all(task).then(data => {
    if (data[1].length > 0) {
      let nCount = 0, dDrugCat = data[1][0].DrugCat;
      data[1].forEach(item => {
        if (dDrugCat !== item.DrugCat) {
          let foundDrugCat = data[0].find(x => x.DrugCat === dDrugCat);
          if (foundDrugCat) {
            foundDrugCat.RIN = nCount;
          }
          dDrugCat = item.DrugCat;
          nCount = 0;
        }
        nCount++;
      })
      let foundDrugCat = data[0].find(x => x.DrugCat === dDrugCat);
      if (foundDrugCat) {
        foundDrugCat.RIN = nCount;
      }
    }
    res.json(data[0]);
  }).catch(err => { next(err); console.error(err) });
})

router.get('/getpocoplan/:yearplan', (req, res, next) => {
  const y = +req.params.yearplan;
  myState().then(mystate => {
    const em = ('0' + mystate.MyEndMonth).slice(-2);
    let task = [];
    let sql1 = `SELECT POAnnualPlan.* FROM POAnnualPlan WHERE (POAnnualPlan.PYear) = '${(y - 543).toString().slice(-2)}' ORDER BY POAnnualPlan.PBudget;`
    task.push(db.query(sql1));
    let sql2 = `SELECT MonthStock.NDrugID, MonthStock.NDrugAmount FROM MonthStock 
      WHERE (MonthStock.NPeriod) = '${em + (y - 544).toString().slice(-2)}' And (MonthStock.NDrugAmount) > 0;`
    task.push(db.query(sql2));
    for (let i = 1; i <= 4; i++) {
      let period1 = mystate.MyEndMonth + (3 * (i - 1)) + 1;
      if (period1 > 12) { period1 = (y - 2543) * 100 + period1 - 12 }
      else { period1 = (y - 2544) * 100 + period1 } 
      let period2 = mystate.MyEndMonth + (3 * i) + 1;
      if (period2 > 12) { period2 = (y - 2543) * 100 + period2 - 12 }
      else { period2 = (y - 2544) * 100 + period2 }  
      let sqlvalue = `SELECT IIf(Left([StInvCust],3)='GPO',1,IIf([DtCoPO]=0,0,[DtCoPO]+1)) AS PBudget, 
        Sum(CDbl([DtAmount])*IIf([StInvTaxStatus]=2,([DtPrice]-[DtDis])*(1+[StInvTaxValue]/100),[DtPrice]-[DtDis])) AS ${'Q' + i} 
        FROM StockInvoice INNER JOIN StockInvoiceDetail ON StockInvoice.StInvID = StockInvoiceDetail.DtInvID 
        WHERE Int(Right([StInvCalcPeriod],2) & Left([StInvCalcPeriod],2)) >= ${period1} 
        And Int(Right([StInvCalcPeriod],2) & Left([StInvCalcPeriod],2)) < ${period2} 
        GROUP BY IIf(Left([StInvCust],3)='GPO',1,IIf([DtCoPO]=0,0,[DtCoPO]+1));`
      let tk1 = db.query(sqlvalue);
      task.push(tk1);
      let sqlcount = `SELECT DISTINCT IIf(Left([StInvCust],3)='GPO',1,IIf([DtCoPO]=0,0,[DtCoPO]+1)) AS PBudget, StockInvoiceDetail.DtDrugID 
        FROM StockInvoice INNER JOIN StockInvoiceDetail ON StockInvoice.StInvID = StockInvoiceDetail.DtInvID 
        WHERE Int(Right([StInvCalcPeriod],2) & Left([StInvCalcPeriod],2)) >= ${period1} 
        And Int(Right([StInvCalcPeriod],2) & Left([StInvCalcPeriod],2)) < ${period2};`
      let tk2 = db.query(sqlcount);
      task.push(tk2);
    }
    Promise.all(task).then(data => {
      let sumPOCo = [];
      if (data[0].length > 0) {
        const blankdata = {
          PBudget: 0, RQ0: 0, POAmount: 0, RIN: 0, InAmount: 0,
          RQ1: 0, RQ2: 0, RQ3: 0, RQ4: 0, RV1: 0, RV2: 0, RV3: 0, RV4: 0,
          PQ1: 0, PQ2: 0, PQ3: 0, PQ4: 0, PV1: 0, PV2: 0, PV3: 0, PV4: 0
        }
        let cPBudget = data[0][0].PBudget, row = Object.assign({}, blankdata);
        row.PBudget = data[0][0].PBudget;
        data[0].forEach(item => {
          if (cPBudget !== item.PBudget) {
            sumPOCo.push(row);
            cPBudget = item.PBudget;
            row = Object.assign({}, blankdata);
            row.PBudget = item.PBudget;
          }
          let YStockX = 0;
          let foundStock = data[1].find(x => x.NDrugID === item.PDrugID);
          if (foundStock) { YStockX = foundStock.NDrugAmount / item.PPack };
          if (item.PAmount || YStockX) {
            if (item.PAmount - YStockX > 0) { row.POAmount += Math.round(item.PAmount - YStockX) * item.PPricePack };
            if (item.PQ1 > 0) { row.PQ1++; row.PV1 += item.PQ1 * item.PPricePack; };
            if (item.PQ2 > 0) { row.PQ2++; row.PV2 += item.PQ2 * item.PPricePack; };
            if (item.PQ3 > 0) { row.PQ3++; row.PV3 += item.PQ3 * item.PPricePack; };
            if (item.PQ4 > 0) { row.PQ4++; row.PV4 += item.PQ4 * item.PPricePack; };
            row.RQ0++;
          }
        })
        sumPOCo.push(row);
        for (let i = 1; i <= 4; i++) {
          data[i * 2].forEach(item => {
            let foundPBudget = sumPOCo.find(x => x.PBudget === item.PBudget);
            if (foundPBudget) {
              foundPBudget['RV' + i] = item['Q' + i]
            } else {
              let newRow = Object.assign({}, blankdata);
              newRow.PBudget = item.PBudget; newRow['RV' + i] = item['Q' + i];
              sumPOCo.push(newRow);
            }
          })
          if (data[(i * 2) + 1].length > 0) {
            let nCount = 0, dPBudget = data[(i * 2) + 1][0].PBudget;
            data[(i * 2) + 1].forEach(item => {
              if (dPBudget !== item.PBudget) {
                let foundPBudget = sumPOCo.find(x => x.PBudget === dPBudget);
                if (foundPBudget) {
                  foundPBudget['RQ' + i] = nCount;
                } else {
                  let newRow = Object.assign({}, blankdata);
                  newRow.PBudget = item.PBudget; newRow['RQ' + i] = nCount;
                  sumPOCo.push(newRow);
                }
                dPBudget = item.PBudget;
                nCount = 0;
              }
              nCount++;
            })
            let foundPBudget = sumPOCo.find(x => x.PBudget === dPBudget);
            if (foundPBudget) {
              foundPBudget['RQ' + i] = nCount;
            } else {
              let newRow = Object.assign({}, blankdata);
              newRow.PBudget = item.PBudget; newRow['RQ' + i] = nCount;
              sumPOCo.push(newRow);
            }
          }
        }
      }
      res.json(sumPOCo);
    }).catch(err => { next(err); console.error(err) });
  }).catch(err => { next(err); console.error(err) });
})

router.get('/getfilterpocoplan/:start/:end', (req, res, next) => {
  let task = [];
  let sql1 = `SELECT IIf(Left([StInvCust],3)='GPO',1,IIf([DtCoPO]=0,0,[DtCoPO]+1)) AS PBudget, 
    Sum(CDbl([DtAmount])*IIf([StInvTaxStatus]=2,([DtPrice]-[DtDis])*(1+[StInvTaxValue]/100),[DtPrice]-[DtDis])) AS InAmount 
    FROM StockInvoice INNER JOIN StockInvoiceDetail ON StockInvoice.StInvID = StockInvoiceDetail.DtInvID 
    WHERE Int(Right([StInvCalcPeriod],2) & Left([StInvCalcPeriod],2)) >= ${req.params.start} 
    And Int(Right([StInvCalcPeriod],2) & Left([StInvCalcPeriod],2)) <= ${req.params.end} 
    GROUP BY IIf(Left([StInvCust],3)='GPO',1,IIf([DtCoPO]=0,0,[DtCoPO]+1));`
  task.push(db.query(sql1));
  let sql2 = `SELECT DISTINCT IIf(Left([StInvCust],3)='GPO',1,IIf([DtCoPO]=0,0,[DtCoPO]+1)) AS PBudget, StockInvoiceDetail.DtDrugID 
    FROM StockInvoice INNER JOIN StockInvoiceDetail ON StockInvoice.StInvID = StockInvoiceDetail.DtInvID 
    WHERE Int(Right([StInvCalcPeriod],2) & Left([StInvCalcPeriod],2)) >= ${req.params.start} 
    And Int(Right([StInvCalcPeriod],2) & Left([StInvCalcPeriod],2)) <= ${req.params.end};`
  task.push(db.query(sql2));
  Promise.all(task).then(data => {
    if (data[1].length > 0) {
      let nCount = 0, dPBudget = data[1][0].PBudget;
      data[1].forEach(item => {
        if (dPBudget !== item.PBudget) {
          let foundPBudget = data[0].find(x => x.PBudget === dPBudget);
          if (foundPBudget) {
            foundPBudget.RIN = nCount;
          }
          dPBudget = item.PBudget;
          nCount = 0;
        }
        nCount++;
      })
      let foundPBudget = data[0].find(x => x.PBudget === dPBudget);
      if (foundPBudget) {
        foundPBudget.RIN = nCount;
      }
    }
    res.json(data[0]);
  }).catch(err => { next(err); console.error(err) });
})

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