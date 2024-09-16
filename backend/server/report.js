const express = require('express');
const router = express.Router();
const authen = require('./service/authen');

const db = require('./service/ms');

router.use(authen.checkToken);

router.put('/sumincat', (req, res, next) => {
  let sql = `SELECT IIf(Left([SupplierID],3)='GPO',0,IIf([DtCoPO]=0,99,[DtCoPO])) AS CatSupp, Count(IIf([DrugCat]='1',[DtDrugID],Null)) AS EDCountRec, 
    Count(IIf([DrugCat]='2',[DtDrugID],Null)) AS NEDCountRec, Count(IIf(Int([DrugCat])>2 And Int([DrugCat])<50,[DtDrugID],Null)) AS EXTCountRec, 
    Count(IIf(Int([DrugCat])>=50,[DtDrugID],Null)) AS OTHCountRec, 
    Sum(IIf([DrugCat]='1',[DtAmount]*IIf([StInvTaxStatus]=2,([DtPrice]-[DtDis])*(1+[StInvTaxValue]/100),[DtPrice]-[DtDis]),0)) AS EDGndTotal, 
    Sum(IIf([DrugCat]='2',[DtAmount]*IIf([StInvTaxStatus]=2,([DtPrice]-[DtDis])*(1+[StInvTaxValue]/100),[DtPrice]-[DtDis]),0)) AS NEDGndTotal, 
    Sum(IIf(Int([DrugCat])>2 And Int([DrugCat])<50,[DtAmount]*IIf([StInvTaxStatus]=2,([DtPrice]-[DtDis])*(1+[StInvTaxValue]/100),[DtPrice]-[DtDis]),0)) AS EXTGndTotal, 
    Sum(IIf(Int([DrugCat])>=50,[DtAmount]*IIf([StInvTaxStatus]=2,([DtPrice]-[DtDis])*(1+[StInvTaxValue]/100),[DtPrice]-[DtDis]),0)) AS OTHGndTotal, 
    [EDCountRec] + [NEDCountRec] + [EXTCountRec] + [OTHCountRec] AS CountAll, [EDGndTotal] + [NEDGndTotal] + [EXTGndTotal] + [OTHGndTotal] AS SumAll, 
    IIf([SumAll]=0,0,[EDGndTotal]/[SumAll]*100) AS PcnED, IIf([SumAll]=0,0,[NEDGndTotal]/[SumAll]*100) AS PcnNED, 
    IIf([SumAll]=0,0,[EXTGndTotal]/[SumAll]*100) AS PcnEXT, IIf([SumAll]=0,0,[OTHGndTotal]/[SumAll]*100) AS PcnOTH 
    FROM DrugItem INNER JOIN ((Supplier INNER JOIN StockInvoice ON Supplier.SupplierID = StockInvoice.StInvCust) 
    INNER JOIN StockInvoiceDetail ON StockInvoice.StInvID = StockInvoiceDetail.DtInvID) ON DrugItem.DrugID = StockInvoiceDetail.DtDrugID 
    WHERE ${req.body.criteria} GROUP BY IIf(Left([SupplierID],3)='GPO',0,IIf([DtCoPO]=0,99,[DtCoPO])) 
    ORDER BY IIf(Left([SupplierID],3)='GPO',0,IIf([DtCoPO]=0,99,[DtCoPO]));`
  db.query(sql).then(data => { res.json(data); }).catch(err => { next(err); console.error(err) });
})

router.put('/sumincatsupp', (req, res, next) => {
  let sql = `SELECT Supplier.SupplierID, Supplier.SupplierName, StockInvoiceDetail.DtCoPO, Count(IIf([DrugCat]='1',[DtDrugID],Null)) AS EDCountRec, 
    Count(IIf([DrugCat]='2',[DtDrugID],Null)) AS NEDCountRec, Count(IIf(Int([DrugCat])>2 And Int([DrugCat])<50,[DtDrugID],Null)) AS EXTCountRec, 
    Count(IIf(Int([DrugCat])>=50,[DtDrugID],Null)) AS OTHCountRec, 
    Sum(IIf([DrugCat]='1',[DtAmount]*IIf([StInvTaxStatus]=2,([DtPrice]-[DtDis])*(1+[StInvTaxValue]/100),[DtPrice]-[DtDis]),0)) AS EDGndTotal, 
    Sum(IIf([DrugCat]='2',[DtAmount]*IIf([StInvTaxStatus]=2,([DtPrice]-[DtDis])*(1+[StInvTaxValue]/100),[DtPrice]-[DtDis]),0)) AS NEDGndTotal, 
    Sum(IIf(Int([DrugCat])>2 And Int([DrugCat])<50,[DtAmount]*IIf([StInvTaxStatus]=2,([DtPrice]-[DtDis])*(1+[StInvTaxValue]/100),[DtPrice]-[DtDis]),0)) AS EXTGndTotal, 
    Sum(IIf(Int([DrugCat])>=50,[DtAmount]*IIf([StInvTaxStatus]=2,([DtPrice]-[DtDis])*(1+[StInvTaxValue]/100),[DtPrice]-[DtDis]),0)) AS OTHGndTotal, 
    [EDCountRec] + [NEDCountRec] + [EXTCountRec] + [OTHCountRec] AS CountAll, [EDGndTotal] + [NEDGndTotal] + [EXTGndTotal] + [OTHGndTotal] AS SumAll, 
    IIf([SumAll]=0,0,[EDGndTotal]/[SumAll]*100) AS PcnED, IIf([SumAll]=0,0,[NEDGndTotal]/[SumAll]*100) AS PcnNED, 
    IIf([SumAll]=0,0,[EXTGndTotal]/[SumAll]*100) AS PcnEXT, IIf([SumAll]=0,0,[OTHGndTotal]/[SumAll]*100) AS PcnOTH 
    FROM DrugItem INNER JOIN ((Supplier INNER JOIN StockInvoice ON Supplier.SupplierID = StockInvoice.StInvCust) 
    INNER JOIN StockInvoiceDetail ON StockInvoice.StInvID = StockInvoiceDetail.DtInvID) ON DrugItem.DrugID = StockInvoiceDetail.DtDrugID 
    WHERE ${req.body.criteria} GROUP BY Supplier.SupplierID, Supplier.SupplierName, StockInvoiceDetail.DtCoPO 
    ORDER BY Supplier.SupplierName, StockInvoiceDetail.DtCoPO;`
  db.query(sql).then(data => { res.json(data); }).catch(err => { next(err); console.error(err) });
})

router.put('/sumoutcatcust', (req, res, next) => {
  let sql = `SELECT Customer.CustID, Customer.CustName, CustomerType.CustTypeID, CustomerType.CustTypeName, 
    Count(IIf([DrugCat]='1',[DtDrugID],Null)) AS EDCountRec, Count(IIf([DrugCat]='2',[DtDrugID],Null)) AS NEDCountRec, 
    Count(IIf(Int([DrugCat])>2 And Int([DrugCat])<50,[DtDrugID],Null)) AS EXTCountRec, 
    Count(IIf(Int([DrugCat])>=50,[DtDrugID],Null)) AS OTHCountRec, Sum(IIf([DrugCat]='1',[DtAmount]*[DtPrice],0)) AS EDGndTotal, 
    Sum(IIf([DrugCat]='2',[DtAmount]*[DtPrice],0)) AS NEDGndTotal, Sum(IIf(Int([DrugCat])>2 And Int([DrugCat])<50,[DtAmount]*[DtPrice],0)) AS EXTGndTotal, 
    Sum(IIf(Int([DrugCat])>=50,[DtAmount]*[DtPrice],0)) AS OTHGndTotal, 
    [EDCountRec] + [NEDCountRec] + [EXTCountRec] + [OTHCountRec] AS CountAll, [EDGndTotal] + [NEDGndTotal] + [EXTGndTotal] + [OTHGndTotal] AS SumAll, 
    IIf([SumAll]=0,0,[EDGndTotal]/[SumAll]*100) AS PcnED, IIf([SumAll]=0,0,[NEDGndTotal]/[SumAll]*100) AS PcnNED, 
    IIf([SumAll]=0,0,[EXTGndTotal]/[SumAll]*100) AS PcnEXT, IIf([SumAll]=0,0,[OTHGndTotal]/[SumAll]*100) AS PcnOTH 
    FROM (Customer INNER JOIN (DrugItem INNER JOIN (OutInvoice INNER JOIN OutInvoiceDetail ON OutInvoice.StInvID = OutInvoiceDetail.DtInvID) 
    ON DrugItem.DrugID = OutInvoiceDetail.DtDrugID) ON Customer.CustID = OutInvoice.StInvCust) INNER JOIN CustomerType ON Customer.CustType = CustomerType.CustTypeID 
    WHERE ${req.body.criteria} GROUP BY Customer.CustID, Customer.CustName, CustomerType.CustTypeID, CustomerType.CustTypeName 
    ORDER BY Customer.CustName;`
  db.query(sql).then(data => { res.json(data); }).catch(err => { next(err); console.error(err) });
})

router.put('/sumoutcat', (req, res, next) => {
  let sql = `SELECT CustomerType.CustTypeID, CustomerType.CustTypeName, Count(IIf([DrugCat]='1',[DtDrugID],Null)) AS EDCountRec, 
    Count(IIf([DrugCat]='2',[DtDrugID],Null)) AS NEDCountRec, Count(IIf(Int([DrugCat])>2 And Int([DrugCat])<50,[DtDrugID],Null)) AS EXTCountRec, 
    Count(IIf(Int([DrugCat])>=50,[DtDrugID],Null)) AS OTHCountRec, Sum(IIf([DrugCat]='1',[DtAmount]*[DtPrice],0)) AS EDGndTotal, 
    Sum(IIf([DrugCat]='2',[DtAmount]*[DtPrice],0)) AS NEDGndTotal, Sum(IIf(Int([DrugCat])>2 And Int([DrugCat])<50,[DtAmount]*[DtPrice],0)) AS EXTGndTotal, 
    Sum(IIf(Int([DrugCat])>=50,[DtAmount]*[DtPrice],0)) AS OTHGndTotal, [EDCountRec] + [NEDCountRec] + [EXTCountRec] + [OTHCountRec] AS CountAll, 
    [EDGndTotal] + [NEDGndTotal] + [EXTGndTotal] + [OTHGndTotal] AS SumAll, IIf([SumAll]=0,0,[EDGndTotal]/[SumAll]*100) AS PcnED, 
    IIf([SumAll]=0,0,[NEDGndTotal]/[SumAll]*100) AS PcnNED, IIf([SumAll]=0,0,[EXTGndTotal]/[SumAll]*100) AS PcnEXT, 
    IIf([SumAll]=0,0,[OTHGndTotal]/[SumAll]*100) AS PcnOTH 
    FROM (Customer INNER JOIN (DrugItem INNER JOIN (OutInvoice INNER JOIN OutInvoiceDetail ON OutInvoice.StInvID = OutInvoiceDetail.DtInvID) 
    ON DrugItem.DrugID = OutInvoiceDetail.DtDrugID) ON Customer.CustID = OutInvoice.StInvCust) INNER JOIN CustomerType ON Customer.CustType = CustomerType.CustTypeID 
    WHERE ${req.body.criteria} GROUP BY CustomerType.CustTypeID, CustomerType.CustTypeName ORDER BY CustomerType.CustTypeID;`
  db.query(sql).then(data => { res.json(data); }).catch(err => { next(err); console.error(err) });
})

router.put('/suminmonth', (req, res, next) => {
  let sumall = '0';
  if (req.body.sumall > 0) { sumall = '[GndTotal]/' + req.body.sumall };
  let sql = `SELECT StockInvoice.StInvCust, Supplier.SupplierName, DrugItem.DrugCat, Category.CatName, DrugItem.DrugGroup, DrugGroupItem.GroupName, 
    StockInvoice.StInvBudget, Budget.BudgetType, StockInvoice.StInvMethod, POMethod.MethodName, Count(StockInvoiceDetail.DtDrugID) AS CountRec, 
    Sum(CDbl([DtAmount])*IIf([StInvTaxStatus]=2,([DtPrice]-[DtDis])*(1+[StInvTaxValue]/100),[DtPrice]-[DtDis])) AS GndTotal, ${sumall}*100 AS AllPercent 
    FROM ((((DrugItem INNER JOIN ((Supplier INNER JOIN StockInvoice ON Supplier.SupplierID = StockInvoice.StInvCust) 
    INNER JOIN StockInvoiceDetail ON StockInvoice.StInvID = StockInvoiceDetail.DtInvID) ON DrugItem.DrugID = StockInvoiceDetail.DtDrugID) 
    INNER JOIN POMethod ON StockInvoice.StInvMethod = POMethod.MethodID) INNER JOIN Budget ON StockInvoice.StInvBudget = Budget.BudgetCode) 
    INNER JOIN Category ON DrugItem.DrugCat = Category.CatID) INNER JOIN DrugGroupItem ON DrugItem.DrugGroup = DrugGroupItem.GroupID 
    WHERE ${req.body.criteria} GROUP BY StockInvoice.StInvCust, Supplier.SupplierName, DrugItem.DrugCat, Category.CatName, 
    DrugItem.DrugGroup, DrugGroupItem.GroupName, StockInvoice.StInvBudget, Budget.BudgetType, StockInvoice.StInvMethod, POMethod.MethodName;`
  db.query(sql).then(data => { res.json(data); }).catch(err => { next(err); console.error(err) });
})

router.put('/suminmonthcat', (req, res, next) => {
  let sql = `SELECT StockInvoice.StInvCust, Supplier.SupplierName, 
    Sum(IIf([DrugCat]='1' Or [DrugCat]='2',[DtAmount]*IIf([StInvTaxStatus]=2,([DtPrice]-[DtDis])*(1+[StInvTaxValue]/100),[DtPrice]-[DtDis]),0)) AS GndTotal1, 
    Sum(IIf(Int([DrugCat])>2 And Int([DrugCat])<50,[DtAmount]*IIf([StInvTaxStatus]=2,([DtPrice]-[DtDis])*(1+[StInvTaxValue]/100),[DtPrice]-[DtDis]),0)) AS ExtGndTotal, 
    Sum(CDbl([DtAmount])*IIf([StInvTaxStatus]=2,([DtPrice]-[DtDis])*(1+[StInvTaxValue]/100),[DtPrice]-[DtDis])) AS GndTotalAll 
    FROM DrugItem INNER JOIN ((Supplier INNER JOIN StockInvoice ON Supplier.SupplierID = StockInvoice.StInvCust) 
    INNER JOIN StockInvoiceDetail ON StockInvoice.StInvID = StockInvoiceDetail.DtInvID) ON DrugItem.DrugID = StockInvoiceDetail.DtDrugID 
    WHERE ${req.body.criteria} GROUP BY StockInvoice.StInvCust, Supplier.SupplierName;`
  db.query(sql).then(data => { res.json(data); }).catch(err => { next(err); console.error(err) });
})

router.put('/sumoutmonth', (req, res, next) => {
  let sumall = '0';
  if (req.body.sumall > 0) { sumall = '[GndTotal]/' + req.body.sumall };
  let sql = `SELECT OutInvoice.StInvCust, Customer.CustID, Customer.CustName, CustomerType.CustTypeID, CustomerType.CustTypeName, 
    DrugItem.DrugCat, Category.CatName, DrugItem.DrugGroup, DrugGroupItem.GroupName, StatusType.StatusName, 
    Count(OutInvoiceDetail.DtDrugID) AS CountRec, Sum(CDbl([DtAmount])*[DtPrice]) AS GndTotal, ${sumall}*100 AS AllPercent 
    FROM (((((DrugItem INNER JOIN (OutInvoice INNER JOIN OutInvoiceDetail ON OutInvoice.StInvID = OutInvoiceDetail.DtInvID) 
    ON DrugItem.DrugID = OutInvoiceDetail.DtDrugID) INNER JOIN Category ON DrugItem.DrugCat = Category.CatID) 
    INNER JOIN DrugGroupItem ON DrugItem.DrugGroup = DrugGroupItem.GroupID) INNER JOIN Customer 
    ON OutInvoice.StInvCust = Customer.CustID) INNER JOIN CustomerType ON Customer.CustType = CustomerType.CustTypeID) 
    INNER JOIN StatusType ON OutInvoice.StInvStatus = StatusType.StatusID
    WHERE ${req.body.criteria} GROUP BY OutInvoice.StInvCust, Customer.CustID, Customer.CustName, CustomerType.CustTypeID, 
    CustomerType.CustTypeName, DrugItem.DrugCat, Category.CatName, DrugItem.DrugGroup, DrugGroupItem.GroupName, StatusType.StatusName;`
  db.query(sql).then(data => { res.json(data); }).catch(err => { next(err); console.error(err) });
})

router.put('/sumoutmonthcat', (req, res, next) => {
  let sql = `SELECT OutInvoice.StInvCust, Customer.CustName, CustomerType.CustTypeName, 
    Sum(IIf([DrugCat]='1' Or [DrugCat]='2',[DtAmount]*[DtPrice],0)) AS GndTotal1, 
    Sum(IIf(Int([DrugCat])>2 And Int([DrugCat])<50,[DtAmount]*[DtPrice],0)) AS ExtGndTotal, 
    Sum(CDbl([DtAmount])*[DtPrice]) AS GndTotalAll 
    FROM (DrugItem INNER JOIN ((Customer INNER JOIN OutInvoice ON Customer.CustID = OutInvoice.StInvCust) 
    INNER JOIN OutInvoiceDetail ON OutInvoice.StInvID = OutInvoiceDetail.DtInvID) ON DrugItem.DrugID = OutInvoiceDetail.DtDrugID) 
    INNER JOIN CustomerType ON Customer.CustType = CustomerType.CustTypeID 
    WHERE ${req.body.criteria} GROUP BY OutInvoice.StInvCust, Customer.CustName, CustomerType.CustTypeName;`
  db.query(sql).then(data => { res.json(data); }).catch(err => { next(err); console.error(err) });
})

router.put('/sumallmonth', (req, res, next) => {
  let sqlDel = "DELETE SumOfMonth.* FROM SumOfMonth;"
  let taskexe = [];
  db.execute(sqlDel).then(result => {
    let sql1 = `INSERT INTO SumOfMonth ( CatID, Mode, Depart, StartAmount, InAmount, OutAmount, EndAmount, CountRec ) 
      SELECT DrugItem.DrugCat AS CatID, 0 AS Mode, 'ยอดยกมา' AS Depart, Sum(MonthStock.NDrugValue) AS StartAmount, 
      0 AS InAmount, 0 AS OutAmount, 0 AS EndAmount, 0 AS CountRec 
      FROM MonthStock INNER JOIN DrugItem ON MonthStock.NDrugID = DrugItem.DrugID 
      WHERE ${req.body.criteria1} GROUP BY DrugItem.DrugCat;`
    taskexe.push(db.execute(sql1));
    let sql2 = `INSERT INTO SumOfMonth ( CatID, Mode, Depart, StartAmount, InAmount, OutAmount, EndAmount, CountRec ) 
      SELECT DrugItem.DrugCat AS CatID, 1 AS Mode, IIf([DtCoPO]=0,'ผู้จำหน่ายอื่นๆ',DLookUp('[CoPOName]','CoPO','[CoPOID]=' & [DtCoPO])) AS Depart, 0 AS StartAmount, 
      Sum(CDbl([DtAmount])*IIf([StInvTaxStatus]=2,([DtPrice]-[DtDis])*(1+[StInvTaxValue]/100),[DtPrice]-[DtDis])) AS InAmount, 
      0 AS OutAmount, 0 AS EndAmount, Count(*) AS CountRec 
      FROM (StockInvoice INNER JOIN StockInvoiceDetail ON StockInvoice.StInvID = StockInvoiceDetail.DtInvID) 
      INNER JOIN DrugItem ON StockInvoiceDetail.DtDrugID = DrugItem.DrugID 
      WHERE ${req.body.criteria2} GROUP BY DrugItem.DrugCat, StockInvoiceDetail.DtCoPO;`
    taskexe.push(db.execute(sql2));
    let sql3 = `INSERT INTO SumOfMonth ( CatID, Mode, Depart, StartAmount, InAmount, OutAmount, EndAmount, CountRec, CustType ) 
      SELECT DrugItem.DrugCat AS CatID, 2 AS Mode, Customer.CustName AS Depart, 0 AS StartAmount, 
      0 AS InAmount, Sum(CDbl([DtAmount])*[DtPrice]) AS OutAmount, 0 AS EndAmount, Count(*) AS CountRec, Customer.CustType 
      FROM ((OutInvoice INNER JOIN OutInvoiceDetail ON OutInvoice.StInvID = OutInvoiceDetail.DtInvID) 
      INNER JOIN DrugItem ON OutInvoiceDetail.DtDrugID = DrugItem.DrugID) INNER JOIN Customer ON OutInvoice.StInvCust = Customer.CustID 
      WHERE ${req.body.criteria2} GROUP BY DrugItem.DrugCat, Customer.CustName, Customer.CustType;`
    taskexe.push(db.execute(sql3));
    let sql4 = `INSERT INTO SumOfMonth ( CatID, Mode, Depart, StartAmount, InAmount, OutAmount, EndAmount, CountRec ) 
      SELECT DrugItem.DrugCat AS CatID, 3 AS Mode, 'ยอดสิ้นเดือน' AS Depart, 0 AS StartAmount, 
      0 AS InAmount, 0 AS OutAmount, Sum(MonthStock.NDrugValue) AS EndAmount, 0 AS CountRec 
      FROM MonthStock INNER JOIN DrugItem ON MonthStock.NDrugID = DrugItem.DrugID 
      WHERE ${req.body.criteria3} GROUP BY DrugItem.DrugCat;`
    taskexe.push(db.execute(sql4));
    Promise.all(taskexe).then(resultexe => {
      let sql = `SELECT SumOfMonth.CatID, SumOfMonth.Mode, Category.CatName, SumOfMonth.CustType, SumOfMonth.Depart, 
        Sum(SumOfMonth.CountRec) AS SumOfCountRec, Sum(SumOfMonth.StartAmount) AS SumOfStartAmount, 
        Sum(SumOfMonth.InAmount) AS SumOfInAmount, Sum(SumOfMonth.OutAmount) AS SumOfOutAmount 
        FROM SumOfMonth INNER JOIN Category ON SumOfMonth.CatID = Category.CatID 
        WHERE SumOfMonth.Mode <> 3 
        GROUP BY SumOfMonth.CatID, SumOfMonth.Mode, Category.CatName, SumOfMonth.CustType, SumOfMonth.Depart
        ORDER BY SumOfMonth.CatID, SumOfMonth.Mode, SumOfMonth.CustType, SumOfMonth.Depart;`
      db.query(sql).then(data => { res.json(data); }).catch(err => { next(err); console.error(err) });
    }).catch(err => { next(err); console.error(err) });
  }).catch(err => { next(err); console.error(err) });
})

router.put('/sumofmonth', (req, res, next) => {
  db.execute('DROP TABLE OutMonthRate;').then(() => {
    let sql = `SELECT OutInvoice.StInvCalcPeriod, Sum(CDbl([DtAmount])*[DtPrice]) AS OutAmount INTO OutMonthRate 
    FROM OutInvoice INNER JOIN (DrugItem INNER JOIN OutInvoiceDetail ON DrugItem.DrugID = OutInvoiceDetail.DtDrugID) 
    ON OutInvoice.StInvID = OutInvoiceDetail.DtInvID WHERE ${req.body.criteria} GROUP BY OutInvoice.StInvCalcPeriod;`
    db.execute(sql).then(() => {
      let taskexe = [];
      let sql1 = `SELECT SumOfMonth.CatID, Category.CatName, Sum(SumOfMonth.CountRec) AS SumOfCountRec, 
      Sum(SumOfMonth.StartAmount) AS SumOfStartAmount, Sum(SumOfMonth.InAmount) AS SumOfInAmount, 
      Sum(SumOfMonth.EndAmount) AS SumOfEndAmount, [SumOfStartAmount]+[SumOfInAmount]-[SumOfEndAmount] AS OutAmount2 
      FROM SumOfMonth INNER JOIN Category ON SumOfMonth.CatID = Category.CatID
      GROUP BY SumOfMonth.CatID, Category.CatName ORDER BY SumOfMonth.CatID;`
      taskexe.push(db.query(sql1));
      let sql2 = `SELECT Count(*) AS CountMonth, Sum(OutMonthRate.OutAmount) AS SumYear FROM OutMonthRate 
      WHERE OutMonthRate.OutAmount <> 0;`
      taskexe.push(db.query(sql2));
      Promise.all(taskexe).then(result => {
        res.json(result);
      }).catch(err => { next(err); console.error(err) });
    }).catch(err => { next(err); console.error(err) });
  }).catch(err => { next(err); console.error(err) });
})

module.exports = router;