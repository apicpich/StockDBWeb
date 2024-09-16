import { Injectable } from '@angular/core';
import { GlobalService } from './global.service';

const inv = ['stinv', 'otinv']

@Injectable({
  providedIn: 'root'
})
export class DepartService {

  constructor(private globalService: GlobalService) { }

  getTodayList(tblId) {
    const url = this.globalService.url + inv[tblId] + '/todaylist?sh=' + this.globalService.currentDepart
    return this.globalService.getHttp(url);
  }
  getInvList(query, tblId) {
    const url = this.globalService.url + inv[tblId] + '/invlist?sh=' + this.globalService.currentDepart + '&search=' + query;
    return this.globalService.getHttp(url);
  }
  getInvId(id, tblId) {
    const url = this.globalService.url + inv[tblId] + '/invid?sh=' + this.globalService.currentDepart + '&id=' + id;
    return this.globalService.getHttp(url);
  }
  saveInv(data, tblId, depart = this.globalService.currentDepart) {
    const url = this.globalService.url + inv[tblId] + '/invoice?sh=' + depart
    return this.globalService.postHttp(url, data);
  }
  deleteInv(id, tblId) {
    const url = this.globalService.url + inv[tblId] + '/invdelete?sh=' + this.globalService.currentDepart + '&id=' + id;
    return this.globalService.deleteHttp(url);
  }
  cancelInv(data, tblId) {
    const url = this.globalService.url + inv[tblId] + '/invcancel?sh=' + this.globalService.currentDepart
    return this.globalService.postHttp(url, data);
  }

}