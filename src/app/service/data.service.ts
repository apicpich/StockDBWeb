import { Injectable } from '@angular/core';
import { GlobalService } from './global.service';
import { MyMsgService } from './msg.service';
import { SelectItem } from 'primeng/api';

@Injectable({
  providedIn: 'root'
})
export class DataService {

  constructor(private globalService: GlobalService, private myMsgService: MyMsgService) { }

  getData(data) {
    const apiUrl = this.globalService.url + "api/select";
    return this.globalService.postHttp(apiUrl, data)
  }

  myState: any;
  getMyState() {
    return new Promise(resolve => {
      if (this.myState) { resolve(this.myState) }
      else {
        const apiUrl = this.globalService.url + "api/mystate";
        return this.globalService.getHttp(apiUrl).subscribe((result: any) => {
          this.myState = result[0]
          resolve(this.myState)
        }, error => {
          resolve([]);
        })
      }
    })
  }

  drugLists = [];
  // drugCatItems: SelectItem[];
  // drugGroupItems: SelectItem[];
  getDrugLists() {
    return new Promise(resolve => {
      if (this.drugLists.length) { resolve(true) }
      else {
        const query = {
          field: `DrugID, [DrugName] & " " & [TypeName] & " " & [DrugContent] & IIF([NotActive]," (ยกเลิกใช้งาน)","") AS DrugNameText,
                  DrugCat, DrugGroup, DrugGeneric, DrugGeneric2, DrugPack, DrugUnit, NotActive, Category.CatName, DrugGroupItem.GroupName`,
          table: `(((DrugItem INNER JOIN DrugTypeItem ON DrugItem.DrugType = DrugTypeItem.TypeID)
                  INNER JOIN UnitType ON DrugItem.DrugUnitID = UnitType.UnitID) 
                  INNER JOIN Category ON DrugItem.DrugCat = Category.CatID) 
                  INNER JOIN DrugGroupItem ON DrugItem.DrugGroup = DrugGroupItem.GroupID`,
          order: 'DrugName'
        };
        this.getData(query).subscribe((result: any) => {
          this.drugLists = result;
          this.DrugCatTable = [{ value: null, label: '-- ไม่ระบุ --' }]
          this.DrugGroupTable = [{value: null, label: '-- ไม่ระบุ --'}]
          this.drugLists.forEach(d => {
            if (!this.DrugCatTable.some(x => x.value === d.DrugCat)) {
              this.DrugCatTable.push({ value: d.DrugCat, label: d.CatName })
            }
            if (!this.DrugGroupTable.some(x => x.value === d.DrugGroup)) {
              this.DrugGroupTable.push({ value: d.DrugGroup, label: d.GroupName })
            }
          })
          resolve(true)
        }, error => {
          resolve(false);
        })
      }
    })
  }

  getStInvList(event) {
    let query = {
      field: 'TOP 100 StInvID, StInvDate, StInvCust, SupplierName, StInvRef, StInvUpdate',
      table: 'StockInvoice INNER JOIN Supplier ON StockInvoice.StInvCust = Supplier.SupplierID',
      where: '',
      order: 'StInvUpdate DESC , StInvDate DESC'
    }
    if (event.query) {
      query.where = `StInvID Like '${event.query}%' OR StInvCust Like '${event.query}%' OR SupplierName Like '${event.query}%' OR StInvRef Like '${event.query}%' 
      OR Format([StInvDate],'mmyy') = '${isNaN(event.query) ? '0000' : ('000' + (+event.query + 43)).slice(-4)}'`
    }
    return this.getData(query)
  }

  getOutInvList(event) {
    let query = {
      field: 'TOP 100 StInvID, StInvDate, StInvCust, CustName, StInvRef, StInvUpdate',
      table: 'OutInvoice INNER JOIN Customer ON OutInvoice.StInvCust = Customer.CustID',
      where: '',
      order: 'StInvUpdate DESC , StInvDate DESC'
    }
    if (event.query) {
      query.where = `StInvID Like '${event.query}%' OR StInvCust Like '${event.query}%' OR CustName Like '${event.query}%' OR StInvRef Like '${event.query}%' 
      OR Format([StInvDate],'mmyy') = '${isNaN(event.query) ? '0000' : ('000' + (+event.query + 43)).slice(-4)}'`
    }
    return this.getData(query)
  }

  DrugCatTable: SelectItem[];
  getDrugCat() {
    const query = { field: 'CatID,CatName', table: 'Category' };
    return this.getSelectItem('DrugCatTable', query, null)
  }

  DrugGroupTable: SelectItem[];
  getDrugGroup() {
    const query = { field: 'GroupID,GroupName', table: 'DrugGroupItem' };
    return this.getSelectItem('DrugGroupTable', query, null)
  }

  SupplierTable: SelectItem[]; 
  getSupplier() {
    const query = { field: 'SupplierID,SupplierName', table: 'Supplier', where: '(Supplier.SupplierID)<>"@@@"', order: 'SupplierName' };
    return this.getSelectItem('SupplierTable', query, null)
  }

  CustomersLists: SelectItem[];
  getCustomersLists() {
    const query = { field: 'CustID,CustName', table: 'Customer', order: 'CustName' };
    return this.getSelectItem('CustomersLists', query, null)
  }

  DrugTypeTable: SelectItem[];
  getDrugType() {
    const query = { field: 'TypeID,TypeName', table: 'DrugTypeItem', where: '(DrugTypeItem.TypeID)<>"@@"', order: 'TypeID' };
    return this.getSelectItem('DrugTypeTable', query, null)
  }

  BudgetTable: SelectItem[];
  getBuget() {
    const query = { field: 'BudgetCode,BudgetType', table: ' Budget' };
    return this.getSelectItem('BudgetTable', query, null)
  }

  POMethodTable: SelectItem[];
  getPOMethod() {
    const query = { field: 'MethodID,MethodName', table: ' POMethod' };
    return this.getSelectItem('POMethodTable', query, null)
  }

  CustTypeTable: SelectItem[];
  getCustType() {
    const query = { field: 'CustTypeID,CustTypeName', table: 'CustomerType' };
    return this.getSelectItem('CustTypeTable', query, null)
  }
  
  StatusTypeTable: SelectItem[];
  getStatusType() {
    const query = { field: 'StatusID,StatusName', table: 'StatusType' };
    return this.getSelectItem('StatusTypeTable', query, null)
  }

  CoPOTable: SelectItem[] = [{ value: null, label: '--ไม่ระบุ--' }, { value: 0, label: 'จัดซื้อปกติ' },
    { value: 1, label: 'ซื้อร่วม จว.' }, { value: 2, label: 'ซื้อร่วมเขต' }, { value: 3, label: 'ซื้อร่วม กสธ' }];
  
  taxType: SelectItem[] = [{ label: 'ไม่มี VAT', value: 0 }, { label: 'VAT ใน', value: 1 }, { label: 'VAT นอก', value: 2 }];

  getSelectItem(variable, query, variable2) {
    return new Promise(resolve => {
      if (this[variable] && this[variable].length) { resolve(true) }
      else {
        const field = query.field.split(',')
        const apiUrl = this.globalService.url + "api/select";
        this.globalService.postHttp(apiUrl, query).subscribe((result: any) => {
          if (variable2) { this[variable2] = result }
          let item = [];
          if (result.length > 0) {
            item.push({ value: null, label: '--ไม่ระบุ--' })
            result.forEach(r => { item.push({ value: r[field[0]], label: r[field[1]] }) });
          }
          this[variable] = item
          resolve(true)
        }, error => { resolve(false) });
      }
    })
  }

  updatePoInvoice(data) {
    const apiUrl = this.globalService.url + "api/uppoinv";
    return this.globalService.putHttp(apiUrl, data);
  }

  updateStInvoice(data) {
    const apiUrl = this.globalService.url + "api/upstinv";
    return this.globalService.putHttp(apiUrl, data);
  }

  updateOutInvoice(data) {
    const apiUrl = this.globalService.url + "api/upoutinv";
    return this.globalService.putHttp(apiUrl, data);
  }

  getOtAmount(data) {
    const apiUrl = this.globalService.url + "api/otamount";
    return this.globalService.postHttp(apiUrl, data);
  }

  getDrugLot(id) {
    const apiUrl = this.globalService.url + "api/druglot?id=" + id;
    return this.globalService.getHttp(apiUrl);
  }

  getProductLot(id, isAll) {
    const url = this.globalService.url + 'api/productlot?id=' + id + '&all=' + isAll;
    return this.globalService.getHttp(url)
  }

}
