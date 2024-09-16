import { Injectable } from '@angular/core';
import { GlobalService } from './global.service';

@Injectable({
  providedIn: 'root'
})
export class CenterReportService {

  constructor(private globalService: GlobalService) { }

  insertPO(data) {
    const url = this.globalService.url + "api/insertpo";
    return this.globalService.putHttp(url, data);
  }

  insertST(data) {
    const url = this.globalService.url + "api/insertst";
    return this.globalService.putHttp(url, data);
  }

  delPOList(data) {
    const url = this.globalService.url + "api/delpolist";
    return this.globalService.putHttp(url, data);
  }

  delPOInv(PONo) {
    const url = this.globalService.url + "api/deletepo/" + PONo;
    return this.globalService.deleteHttp(url);
  }

  getDrugRate(criteria) {
    const url = this.globalService.url + "api/drugrate";
    return this.globalService.putHttp(url, criteria);
  }
  
  stockReport(criteria) {
    const url = this.globalService.url + "stockreport/stock";
    return this.globalService.putHttp(url, criteria);
  }

  stockCardReport(query) {
    const url = this.globalService.url + 'stockreport/stockcard'
    return this.globalService.postHttp(url, query);
  }

  getSumINCat(criteria) {
    const url = this.globalService.url + "report/sumincat";
    return this.globalService.putHttp(url, criteria);
  }

  getSumINCatSupp(criteria) {
    const url = this.globalService.url + "report/sumincatsupp";
    return this.globalService.putHttp(url, criteria);
  }

  getSumOUTCat(criteria) {
    const url = this.globalService.url + "report/sumoutcat";
    return this.globalService.putHttp(url, criteria);
  }

  getSumOUTCatCust(criteria) {
    const url = this.globalService.url + "report/sumoutcatcust";
    return this.globalService.putHttp(url, criteria);
  }

  getSumINMonth(criteria) {
    const url = this.globalService.url + "report/suminmonth";
    return this.globalService.putHttp(url, criteria);
  }

  getSumINMonthCat(criteria) {
    const url = this.globalService.url + "report/suminmonthcat";
    return this.globalService.putHttp(url, criteria);
  }

  getSumOUTMonth(criteria) {
    const url = this.globalService.url + "report/sumoutmonth";
    return this.globalService.putHttp(url, criteria);
  }

  getSumOUTMonthCat(criteria) {
    const url = this.globalService.url + "report/sumoutmonthcat";
    return this.globalService.putHttp(url, criteria);
  }

  getSumAllMonth(criteria) {
    const url = this.globalService.url + "report/sumallmonth";
    return this.globalService.putHttp(url, criteria);
  }
  getSumOfMonth(criteria) {
    const url = this.globalService.url + "report/sumofmonth";
    return this.globalService.putHttp(url, criteria);
  }

  getPOPlan(year) {
    const url = this.globalService.url + "poplan/getpoplan/" + year;
    return this.globalService.getHttp(url);
  }
  getPOCoPlan(year) {
    const url = this.globalService.url + "poplan/getpocoplan/" + year;
    return this.globalService.getHttp(url);
  }
  getFilterPOCoPlan(criteria) {
    const url = this.globalService.url + "poplan/getfilterpocoplan/" + criteria;
    return this.globalService.getHttp(url);
  }
  getFilterPOCatPlan(criteria) {
    const url = this.globalService.url + "poplan/getfilterpocatplan/" + criteria;
    return this.globalService.getHttp(url);
  }

}