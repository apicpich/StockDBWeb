import { Injectable } from '@angular/core';
import { GlobalService } from './global.service';

@Injectable({
  providedIn: 'root'
})
export class DepartReportService {

  constructor(private globalService: GlobalService) { }

  stockReport(query) {
    const url = this.globalService.url + 'departreport/stock?sh=' + this.globalService.currentDepart
    return this.globalService.postHttp(url, query);
  }

  rateReport(query) {
    const url = this.globalService.url + 'departreport/rate?sh=' + this.globalService.currentDepart
    return this.globalService.postHttp(url, query);
  }

  invReport(query, inv) {
    const url = this.globalService.url + 'departreport/inv?sh=' + this.globalService.currentDepart + '&inv=' + inv;
    return this.globalService.postHttp(url, query);
  }

  stockCardReport(query) {
    const url = this.globalService.url + 'departreport/stockcard?sh=' + this.globalService.currentDepart
    return this.globalService.postHttp(url, query);
  }

  catAllDepartReport(query) {
    const url = this.globalService.url + 'departreport/catallreport'
    return this.globalService.postHttp(url, query);
  }

}