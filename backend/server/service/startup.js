const db = require('./db');
const pgp = db.$config.pgp;

const departRateUpdate = (depart) => {
  return new Promise((resolve, reject) => {
    if (depart === 'center') {
      resolve(false)
    } else {
      db.tx(t => {
        return t.any('SELECT depart_time_in FROM depart WHERE depart_id = $1', depart).then(time_in => {
          if (time_in.length) {
            const dTime = new Date(time_in[0].depart_time_in)
            const now = new Date()
            dMonth = dTime.getFullYear() + ('0' + dTime.getMonth() + 1).slice(-2);
            nowMonth = now.getFullYear() + ('0' + now.getMonth() + 1).slice(-2);
            if (dMonth + dTime.getDate() !== nowMonth + now.getDate()) {
              let task = []
              let mnt1 = new Date(); mnt1.setDate(1); mnt1.setHours(0, 0, 0, 0);
              let mnt2 = new Date(); mnt2.setMonth(mnt2.getMonth() - 1); mnt2.setDate(1); mnt2.setHours(0, 0, 0, 0);
              let mnt3 = new Date(); mnt3.setMonth(mnt3.getMonth() - 2); mnt3.setDate(1); mnt3.setHours(0, 0, 0, 0);
              task.push(t.any(
                `SELECT "DtDrugID" AS "DrugID", Sum("DtAmount" * "DtPack") AS "Out1"
                FROM $1:name."OTInvoice" T1 INNER JOIN $1:name."OTInvoiceDetail" T2 ON T1."StInvID" = T2."DtInvID"
                WHERE "StInvDateUpdate" >= $2 AND "StInvDateUpdate" < now() AND "StInvUpdate" = true
                GROUP BY "DtDrugID"`, [depart, mnt1]
              ))
              if (dMonth !== nowMonth) {
                task.push(t.any(
                  `SELECT "DtDrugID" AS "DrugID", Sum("DtAmount" * "DtPack") AS "Out2"
                  FROM $1:name."OTInvoice" T1 INNER JOIN $1:name."OTInvoiceDetail" T2 ON T1."StInvID" = T2."DtInvID"
                  WHERE "StInvDateUpdate" >= $2 AND "StInvDateUpdate" < $3 AND "StInvUpdate" = true
                  GROUP BY "DtDrugID"`, [depart, mnt2, mnt1]
                ))
                task.push(t.any(
                  `SELECT "DtDrugID" AS "DrugID", Sum("DtAmount" * "DtPack") AS "Out3"
                  FROM $1:name."OTInvoice" T1 INNER JOIN $1:name."OTInvoiceDetail" T2 ON T1."StInvID" = T2."DtInvID"
                  WHERE "StInvDateUpdate" >= $2 AND "StInvDateUpdate" < $3 AND "StInvUpdate" = true
                  GROUP BY "DtDrugID"`, [depart, mnt3, mnt2]
                ))
              }
              return t.batch(task).then((result) => {
                let task2 = []
                for (let i = 0; i < result.length; i++){
                  task2.push(t.none('UPDATE $1:name."DrugItem" SET $2:name = 0', [depart, 'Out' + (i + 1)]))
                  if (result[i].length) {
                    const outUpdate = pgp.helpers.update(result[i], ['?DrugID', 'Out' + (i + 1)], { table: 'DrugItem', schema: depart }) + ' WHERE v."DrugID" = t."DrugID"';
                    task2.push(t.none(outUpdate))
                  }
                }
                task2.push(t.none('UPDATE depart SET depart_time_in = now() WHERE depart_id = $1', depart))
                return t.batch(task2).then(() => { return true })
              })
            }
          }
          return false
        })
      })
      .then((result) => resolve(result))
      .catch(err => reject(err))
    }
  })
}

const departSqlCreate = `CREATE SCHEMA $1:name
  CREATE TABLE "Customer" (
    "CustID" text NOT NULL PRIMARY KEY,
    "CustName" text NOT NULL,
    "CustAddress" text ,
    "CustPhone" text
  )
  CREATE TABLE "Supplier" (
    "SupplierID" text NOT NULL PRIMARY KEY,
    "SupplierName" text NOT NULL,
    "SupplierAddress" text,
    "SupplierPhone" text
  )
  CREATE TABLE "DrugItem" (
    "DrugID" text NOT NULL PRIMARY KEY,
    "DrugCost" numeric(15,6) NOT NULL DEFAULT 0,
    "DrugCostUpdate" numeric(15,6) NOT NULL DEFAULT 0,
    "DrugSupply" text,
    "DrugRemark" text,
    "DrugStock" numeric(12,2) NOT NULL DEFAULT 0,
    "DrugValue" numeric(15,6) NOT NULL DEFAULT 0,
    "DrugLastIn" timestamp with time zone,
    "DrugLastOut" timestamp with time zone,
    "DrugExp" date,
    "DrugMin" integer NOT NULL DEFAULT 0,
    "DrugMax" integer NOT NULL DEFAULT 0,
    "Out1" integer NOT NULL DEFAULT 0,
    "Out2" integer NOT NULL DEFAULT 0,
    "Out3" integer NOT NULL DEFAULT 0,
    "OrderNeed" boolean NOT NULL DEFAULT false,
    "NotActive" boolean NOT NULL DEFAULT false,
    "MinLock" boolean NOT NULL DEFAULT false,
    "MaxLock" boolean NOT NULL DEFAULT false,
    CONSTRAINT drug_supply_fk FOREIGN KEY ("DrugSupply")
      REFERENCES "Supplier" ("SupplierID") MATCH SIMPLE
      ON UPDATE CASCADE
      ON DELETE RESTRICT
      NOT VALID
  )
  CREATE INDEX drugexp_idx ON "DrugItem" ("DrugExp" ASC NULLS LAST)
  CREATE INDEX fki_drug_supply_fk ON "DrugItem" ("DrugSupply" ASC NULLS LAST)
  CREATE TABLE "DrugDetail" (
    "DrugLotID" serial PRIMARY KEY,
    "DrugInvID" text NOT NULL,
    "DrugDID" text NOT NULL,
    "DrugDSupply" text NOT NULL,
    "DrugDDate" timestamp with time zone NOT NULL,
    "DrugDLot" text,
    "DrugDAmount" numeric(12,2) NOT NULL DEFAULT 1,
    "DrugDPack" integer NOT NULL DEFAULT 1,
    "DrugDCost" numeric(15,6) NOT NULL DEFAULT 0,
    "DrugDStock" numeric(12,2) NOT NULL DEFAULT 0,
    "DrugDExp" date,
    "DrugDLast" timestamp with time zone,
    "DrugTNID" integer NOT NULL DEFAULT 0,
    CONSTRAINT lot_drugid_fk FOREIGN KEY ("DrugDID")
      REFERENCES "DrugItem" ("DrugID") MATCH SIMPLE
      ON UPDATE CASCADE
      ON DELETE RESTRICT
      NOT VALID,
    CONSTRAINT lot_supply_fk FOREIGN KEY ("DrugDSupply")
      REFERENCES "Supplier" ("SupplierID") MATCH SIMPLE
      ON UPDATE CASCADE
      ON DELETE RESTRICT
      NOT VALID
  )
  CREATE INDEX fki_lot_drugid_fk ON "DrugDetail" ("DrugDID" ASC NULLS LAST)
  CREATE INDEX fki_lot_supply_fk ON "DrugDetail" ("DrugDSupply" ASC NULLS LAST)
  CREATE INDEX lot_exp_idx ON "DrugDetail" ("DrugDExp" ASC NULLS LAST)
  CREATE INDEX lot_stock_pidx ON "DrugDetail" ("DrugDStock" ASC NULLS LAST) WHERE "DrugDStock" > 0::numeric
  CREATE TABLE "STInvoice" (
    "StInvID" text NOT NULL PRIMARY KEY,
    "StInvDate" timestamp with time zone NOT NULL,
    "StInvCust" text NOT NULL,
    "StInvRef" text,
    "StInvMemo" text,
    "StInvUpdate" boolean NOT NULL,
    "StInvDateUpdate" timestamp with time zone,
    "StInvStatus" integer,
    "StKeyUser" text NOT NULL,
    CONSTRAINT st_statud_fk FOREIGN KEY ("StInvStatus")
      REFERENCES public.status (status_id) MATCH SIMPLE
      ON UPDATE CASCADE
      ON DELETE RESTRICT,
    CONSTRAINT st_invcust_fk FOREIGN KEY ("StInvCust")
      REFERENCES "Supplier" ("SupplierID") MATCH SIMPLE
      ON UPDATE CASCADE
      ON DELETE RESTRICT
  )
  CREATE INDEX fki_st_status_fk ON "STInvoice" ("StInvStatus" ASC NULLS LAST)
  CREATE INDEX fki_st_invcust_fk ON "STInvoice" ("StInvCust" ASC NULLS LAST)
  CREATE INDEX st_invdate_idx ON "STInvoice" ("StInvDate" ASC NULLS LAST)
  CREATE INDEX st_invref_idx ON "STInvoice" ("StInvRef" ASC NULLS LAST)
  CREATE INDEX st_update_date_idx ON "STInvoice" ("StInvDateUpdate" ASC NULLS LAST)
  CREATE INDEX st_update_idx ON "STInvoice" ("StInvUpdate" ASC NULLS LAST) WHERE "StInvUpdate" = false
  CREATE TABLE "STInvoiceDetail" (
    "DtDID" bigint NOT NULL PRIMARY KEY,
    "DtInvID" text NOT NULL,
    "DtDrugID" text NOT NULL,
    "DtAmount" real NOT NULL,
    "DtPack" integer NOT NULL DEFAULT 1,
    "DtPrice" numeric(15,6) NOT NULL DEFAULT 0,
    "DtLot" text,
    "DtExp" date,
    "DtTNID" integer NOT NULL DEFAULT 0,
    CONSTRAINT st_invid_fk FOREIGN KEY ("DtInvID")
      REFERENCES "STInvoice" ("StInvID") MATCH SIMPLE
      ON UPDATE CASCADE
      ON DELETE CASCADE
  )
  CREATE INDEX fki_st_invid_fk ON "STInvoiceDetail" ("DtInvID" ASC NULLS LAST)
  CREATE INDEX st_drugid_idx ON "STInvoiceDetail" ("DtDrugID" ASC NULLS LAST)
  CREATE TABLE "OTInvoice" (
    "StInvID" text NOT NULL PRIMARY KEY,
    "StInvDate" timestamp with time zone NOT NULL,
    "StInvCust" text NOT NULL,
    "StInvRef" text,
    "StInvMemo" text,
    "StInvUpdate" boolean NOT NULL,
    "StInvDateUpdate" timestamp with time zone,
    "StInvStatus" integer,
    "StKeyUser" text NOT NULL,
    CONSTRAINT ot_statud_fk FOREIGN KEY ("StInvStatus")
      REFERENCES public.status (status_id) MATCH SIMPLE
      ON UPDATE CASCADE
      ON DELETE RESTRICT,
    CONSTRAINT ot_invcust_fk FOREIGN KEY ("StInvCust")
      REFERENCES "Customer" ("CustID") MATCH SIMPLE
      ON UPDATE CASCADE
      ON DELETE RESTRICT
  )
  CREATE INDEX fki_ot_status_fk ON "OTInvoice" ("StInvStatus" ASC NULLS LAST)
  CREATE INDEX fki_ot_invcust_fk ON "OTInvoice" ("StInvCust" ASC NULLS LAST)
  CREATE INDEX ot_invdate_idx ON "OTInvoice" ("StInvDate" ASC NULLS LAST)
  CREATE INDEX ot_invref_idx ON "OTInvoice" ("StInvRef" ASC NULLS LAST)
  CREATE INDEX ot_update_date_idx ON "OTInvoice" ("StInvDateUpdate" ASC NULLS LAST)
  CREATE INDEX ot_update_idx ON "OTInvoice" ("StInvUpdate" ASC NULLS LAST) WHERE "StInvUpdate" = false
  CREATE TABLE "OTInvoiceDetail" (
    "DtDID" bigint NOT NULL PRIMARY KEY,
    "DtLotID" integer NOT NULL,
    "DtInvID" text NOT NULL,
    "DtDrugID" text NOT NULL,
    "DtAmount" real NOT NULL,
    "DtPack" integer NOT NULL DEFAULT 1,
    "DtPrice" numeric(15,6) NOT NULL DEFAULT 0,
    "DtStock" numeric(12,2) NOT NULL DEFAULT 0,
    "DtRemain" numeric(12,2) NOT NULL DEFAULT 0,
    CONSTRAINT ot_invid_fk FOREIGN KEY ("DtInvID")
      REFERENCES "OTInvoice" ("StInvID") MATCH SIMPLE
      ON UPDATE CASCADE
      ON DELETE CASCADE
  )
  CREATE INDEX fki_ot_invid_fk ON "OTInvoiceDetail" ("DtInvID" ASC NULLS LAST)
  CREATE INDEX ot_drugid_idx ON "OTInvoiceDetail" ("DtDrugID" ASC NULLS LAST)
  CREATE INDEX ot_lotid_idx ON "OTInvoiceDetail" ("DtLotID" ASC NULLS LAST);`

module.exports = { departRateUpdate, departSqlCreate }