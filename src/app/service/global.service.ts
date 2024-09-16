import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { MyMsgService } from './msg.service';
import { SelectItem } from 'primeng/api';
import { throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';

const tableArray = [
  { variable: 'departTable', tableId: 0, field: ['depart_id', 'depart_name'], order: 'depart_name', variable2: 'departs', schema: false },
  { variable: 'statusTable', tableId: 1, field: ['status_id', 'status_name'], order: 'status_id', variable2: null, schema: false },
  { variable: 'supplierTable', tableId: 2, field: ['SupplierID', 'SupplierName'], order: 'SupplierName', variable2: 'suppliers', schema: true },
  { variable: 'customerTable', tableId: 3, field: ['CustID', 'CustName'], order: 'CustName', variable2: 'customers', schema: true },
  { variable: null, tableId: 4, field: [], order: null, variable2: null, schema: true },
]

@Injectable({
  providedIn: 'root'
})
export class GlobalService {

  isLogin: boolean;
  isAdmin: boolean;
  isPrint: boolean;
  user: any;
  currentDepart = '';
  
  url = environment.API_URL;
  redirectUrl: string;
  private timeOffset = 0;
  private _token = '';

  constructor(
    private http: HttpClient,
    private router: Router,
    private myMsgService: MyMsgService
  ) { }

  timeRefresh: any;
  setRefreshToken() {
    clearInterval(this.timeRefresh);
    this.timeRefresh = setInterval(() => { this.refreshToken() }, 18 * 60000);
  }
  refreshToken() {
    const apiUrl = this.url + "apipg/token";
    this.getHttp(apiUrl).subscribe((result: string) => {
      this._token = result
      this.setRefreshToken()
    });
  }
  mixString(str: string) {
    const mix = (Date.now() + this.timeOffset).toString();
    const tail = Math.floor(Math.random() * 30000) + 10000;
    const interval = Math.floor(tail / 10000);
    let pos = 0, resultStr = '';
    for (let i = mix.length - 1; i >= 0; i--){
      resultStr += mix.charAt(i) + str.substr(pos, interval);
      pos += interval
    }
    resultStr += str.substr(pos) + tail;
    return resultStr;
  }

  get httpOptions() {
    let headers: HttpHeaders;
    if (this._token && this._token !== '') {
      headers = new HttpHeaders({ 'Content-Type': 'application/json', 'x-access-token': this.mixString(this._token) })
    } else {
      headers = new HttpHeaders({ 'Content-Type': 'application/json' })
    };
    return { headers: headers };
  }

  setUser(result) {
    this.user = result.user
    this.currentDepart = result.user.depart
    this._token = result.token
    this.timeOffset = result.s_time - Date.now()
    if (Math.abs(this.timeOffset) < 30000) this.timeOffset = 0;
  }
  
  getHttp(url) {
    return this.http.get(url, this.httpOptions).pipe(catchError(this.handleError));
  }
  postHttp(url, data) {
    return this.http.post(url, data, this.httpOptions).pipe(catchError(this.handleError));
  }
  putHttp(url, data) {
    return this.http.put(url, data, this.httpOptions).pipe(catchError(this.handleError));
  }
  deleteHttp(url) {
    return this.http.delete(url, this.httpOptions).pipe(catchError(this.handleError));
  }

  getMyUser(id) {
    const userUrl = this.url + "apipg/myuser?id=" + id;
    return this.getHttp(userUrl)
  }

  userLogin(data) {
    const userUrl = this.url + "user/login";
    return this.postHttp(userUrl, data);
  }

  userAdd(data) {
    const userUrl = this.url + "setup/useradd";
    return this.postHttp(userUrl, data);
  }
  
  passUpdate(data) {
    const userUrl = this.url + "setup/passupdate";
    return this.postHttp(userUrl, data);
  }

  userUpdate(data) {
    const userUrl = this.url + "setup/userupdate";
    return this.putHttp(userUrl, data);
  }

  userDelete(id) {
    const userUrl = this.url + "setup/userdelete?id=" + id;
    return this.deleteHttp(userUrl);
  }

  logOut() {
    this.isLogin = false;
    this.isAdmin = false;
    this._token = ''
    clearInterval(this.timeRefresh);
    this.router.navigate(['/login'])
  }

  resetDepart() {
    this.supplierTable = []; this.suppliers = [];
    this.customerTable = []; this.customers = [];
  }

  setDepartRate() {
    const url = this.url + 'apipg/departrate';
    return this.putHttp(url, { depart: this.currentDepart })
  }
  saveDepart(data) {
    const url = this.url + 'apipg/savedepart';
    return this.postHttp(url, data)
  }

  departTable: SelectItem[]; departs: any[];
  getDepart() { return this.getSelectItem(tableArray[0]) }

  statusTable: SelectItem[];
  getStatus() { return this.getSelectItem(tableArray[1]) }

  supplierTable: SelectItem[]; suppliers: any[];
  getSupplier() { return this.getSelectItem(tableArray[2]) }

  customerTable: SelectItem[]; customers: any[];
  getCustomer() { return this.getSelectItem(tableArray[3]) }

  departTypeLists: SelectItem[] = [
    { value: null, label: '-- ไม่ระบุ --' }, { value: 0, label: 'หน่วยงานภายใน' },
    { value: 1, label: 'รพ.สต.' }, { value: 9, label: 'หน่วยงานภายนอก' }
  ]

  getSelectItem({ variable, tableId, field, order, variable2, schema }) {
    return new Promise((resolve) => {
      if (this[variable] && this[variable].length > 1) { resolve(true) }
      else {
        let query = '?on=' + tableId
        if (schema) { query += '&sh=' + this.currentDepart }
        if (order) { query += '&order=' + order };
        const apiUrl = this.url + 'apipg/select' + query;
        this.getHttp(apiUrl).subscribe((result: any) => {
          if (variable2) { this[variable2] = result }
          let item = [{ value: null, label: '--ไม่ระบุ--' }];
          if (result.length > 0) {
            result.forEach(r => { item.push({ value: r[field[0]], label: r[field[1]] }) });
          }
          this[variable] = item
          resolve(true)
        }, error => { resolve([]) });
      }
    })
  }

  itemFromSocketDelete({ tableId, isDelete, data }) {
    const tbl = tableArray[tableId]
    const id = data[tbl.field[0]]
    if (isDelete) {
      if (this[tbl.variable].length) {
        const pos = this[tbl.variable].findIndex(x => x.value === id);
        if (pos > -1) { this[tbl.variable].splice(pos, 1) }
      }
      if (tbl.variable2 && this[tbl.variable2].length) {
        const pos2 = this[tbl.variable2].findIndex(x => x[tbl.field[0]] === id);
        if (pos2 > -1) { this[tbl.variable2].splice(pos2, 1) }
      }
    }
  }
  itemFromSocketUpdate({ tableId, data }) {
    const tbl = tableArray[tableId]
    if (tbl.variable && this[tbl.variable].length) {
      let item = { value: data[tbl.field[0]], label: data[tbl.field[1]] };
      const pos = this[tbl.variable].findIndex(x => x.value === item.value);
      if (pos > -1) {
        this[tbl.variable].splice(pos, 1, item);
      } else {
        this[tbl.variable].push(item);
      }
    }
    if (tbl.variable2 && this[tbl.variable2].length) {
      const pos2 = this[tbl.variable2].findIndex(x => x[tbl.field[0]] === data[tbl.field[0]]);
      if (pos2 > -1) {
        this[tbl.variable2].splice(pos2, 1, data);
      } else {
        this[tbl.variable2].push(data);
      }
    }
  }

  getProduct(id, depart) {
    const url = this.url + 'apipg/select?on=4&id=' + id + '&sh=' + depart;
    return this.getHttp(url)
  }

  getSelectId(tbl_id, id, hasSchema?: boolean) {
    const url = this.url + 'apipg/select?on=' + tbl_id + '&id=' + id + (hasSchema ? '&sh=' + this.currentDepart : '');
    return this.getHttp(url)
  }

  deleteSelectId(tbl_id, id, hasSchema?: boolean) {
    const url = this.url + 'apipg/delete?on=' + tbl_id + '&id=' + id + (hasSchema ? '&sh=' + this.currentDepart : '');
    return this.deleteHttp(url);
  }

  saveSelectId(tbl_id, data, hasSchema?: boolean) {
    const url = this.url + 'apipg/save?on=' + tbl_id + (hasSchema ? '&sh=' + this.currentDepart : '');
    return this.putHttp(url, data);
  }

  getProductLot(id, isAll) {
    const url = this.url + 'apipg/productlot?id=' + id + '&sh=' + this.currentDepart + '&all=' + isAll;
    return this.getHttp(url)
  }
  
  getPdWithLot(id) {
    const url = this.url + 'apipg/pdwlot?id=' + id + '&sh=' + this.currentDepart;
    return this.getHttp(url)
  }

  getTodayList(invType, depart?) {
    const url = this.url + 'req/todaylist?inv=' + invType + (depart ? '&depart=' + depart : '');
    return this.getHttp(url);
  }
  
  getPdWInlist(id, depart) {
    const url = this.url + 'apipg/pdwinlist?id=' + id + '&depart=' + depart;
    return this.getHttp(url);
  }

  //req & apprv module
  getInvList(query, tbl, depart?) {
    const url = this.url + 'req/invlist?inv=' + tbl + '&search=' + query + (depart ? '&depart=' + depart : '');
    return this.getHttp(url);
  }
  getInvId(id, tbl) {
    const url = this.url + 'req/invid?inv=' + tbl + '&id=' + id;
    return this.getHttp(url);
  }
  saveInv(data, tbl) {
    const url = this.url + 'req/invoice?tbl=' + tbl;
    return this.postHttp(url, data);
  }
  deleteInv(id, tbl) {
    const url = this.url + 'req/invdelete?tbl=' + tbl + '&id=' + id;
    return this.deleteHttp(url);
  }
  cancelInv(data, tbl) {
    const url = this.url + 'req/invcancel?tbl=' + tbl;
    return this.postHttp(url, data);
  }

  getRQAmount(invId, pdId) {
    const url = this.url + 'req/rqamount?invid=' + invId + '&pdid=' + pdId;
    return this.getHttp(url);
  }
  getAutoRQAmount(data) {
    const url = this.url + 'req/autorq';
    return this.postHttp(url, data);
  }
  insertOT(data) {
    const apiUrl = this.url + "api/insertot";
    return this.putHttp(apiUrl, data);
  }
  saveFromOT(data) {
    const apiUrl = this.url + "req/saveformot";
    return this.postHttp(apiUrl, data);
  }

  private handleError = (error: HttpErrorResponse) => {
    let errMessage = '';
    if (error.error instanceof ErrorEvent) {
      // A client-side or network error occurred. Handle it accordingly.
      console.error('An error occurred:', error.error.message);
    } else {
      // The backend returned an unsuccessful response code.
      // The response body may contain clues as to what went wrong,
      console.error(`Backend returned code ${error.status}`);
      console.error(error.error);
    }
    if (error.status >= 400 && error.status < 500) { errMessage = error.error.message } else
    if (error.status == 500) { errMessage = "มีปัญหาในการติดต่อฐานข้อมูล กรุณาแจ้งผู้ดูแลระบบ..." } else
    { errMessage = 'มีบางอย่างผิดปกติ กรุณาลองใหม่ในภายหลัง.. หรือติดต่อผู้ดูแลระบบ' };
    this.myMsgService.msgBox(errMessage, '', 'error', null)
    if (error.status == 401) {
      this.logOut()
    }
    // return an ErrorObservable with a user-facing error message
    return throwError(errMessage);
  };

}
