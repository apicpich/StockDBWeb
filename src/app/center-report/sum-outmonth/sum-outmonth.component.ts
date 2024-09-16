import { Component, OnInit, OnDestroy } from '@angular/core';
import { GlobalService } from '../../service/global.service';
import { EventService } from '../../service/event.service';
import { DataService } from '../../service/data.service';
import { CenterReportService } from '../../service/center-report.service';
import { MenuService } from '../../service/menu.service';
import { MyMsgService } from '../../service/msg.service';
import { FuncService } from '../../service/xfunc.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-sum-outmonth',
  templateUrl: './sum-outmonth.component.html',
  styleUrls: ['./sum-outmonth.component.scss']
})
export class SumOUTMonthComponent implements OnInit, OnDestroy {

  tdate1: Date; tdate3: Date; tdate5: Date;
  tdate2 = new Date();  
  tdate4 = new Date();
  
  th: any;
  sizeSubscript: Subscription;
  innerWidthSize: number; innerHeightSize: number;
  paginatorSize = 0;
  leftPanelShow = false; leftPanel2Show = false; leftPanelCollapse = false; isPopUp = false;

  constructor(
    public globalService: GlobalService,
    private eventService: EventService,
    public dataService: DataService,
    private centerReportService: CenterReportService,
    private menuService: MenuService,
    private myMsgService: MyMsgService,
    private xfunc: FuncService) { }

  ngOnInit() {
    this.menuService.setTitle('4-11')
    this.th = this.xfunc.getLocale('th');
    this.dataService.getDrugCat()
    this.dataService.getDrugGroup()
    this.dataService.getCustomersLists();
    this.dataService.getDrugType();
    this.dataService.getCustType();
    this.dataService.getStatusType();
    this.tdate3 = new Date();
    this.tdate3.setDate(1);
    this.tdate3.setHours(0, 0, 0, 0);
    this.sizeSubscript = this.eventService.windowsSize$.subscribe((size) => {
      this.innerHeightSize = window.innerHeight
      if (this.innerWidthSize !== size) { //not execute when mobile phone keyboard appeared
        this.hideSideBar(size)
        this.innerWidthSize = size
      }
    })
  }
  ngOnDestroy(): void {
    this.sizeSubscript.unsubscribe()
  }

  hideSideBar(size) {
    if (size >= 1124) {
      this.leftPanelCollapse = false
      this.isPopUp = false
      this.leftPanelShow = true
      this.leftPanel2Show = false
    } else {
      this.leftPanelCollapse = true
      if (!this.hasPageData) {
        this.leftPanel2Show = false
        if (size <= 575) {
          this.isPopUp = true
          this.leftPanelShow = false
          setTimeout(() => {
            this.leftPanel2Show = true
          }, 200);
        } else {
          this.isPopUp = false
          this.leftPanel2Show = false
          this.leftPanelShow = true
        }
      } else {
        this.leftPanelShow = false
        this.leftPanel2Show = false
      }
    }
  }
  get hasPageData() {
    if (this.showReport === 1 && !this.sumINMonthData.length) {
      return false
    }
    if (this.showReport === 2 && !this.sumINMonthCatData.length) {
      return false
    }
    return true
  }

  StInvID: any; StInvID2: any; StInvSelect: any; StInvSelect2: any;
  DrugCat: any; DrugGroup: any; StInvCust: any;
  DrugType: any; CustTypeID: any; StInvStatus: any;

  filteredResults: any[];
  filterResults(event) {
    this.dataService.getOutInvList(event).subscribe((result: any) => {
      this.filteredResults = result
    })
  }

  showReport = 1;
  sumINMonthData = []; AllTotal = 0; GrandSTTotal = 0; hasSumINMonthData = true; allTotalNeedRefresh = true;
  sumINMonthCatData = []; GndTotal2 = 0; EXTGndTotal2 = 0; OTHGndTotal2 = 0; SumAll2 = 0; hasSumINMonthCatData = true;
  setFilter() {
    this.hasSumINMonthData = false;
    this.hasSumINMonthCatData = false;
    this.reportChange()
  }
  reportChange() {
    this.leftPanel2Show = false
    if (this.showReport === 1) {
      if (!this.hasSumINMonthData) {
        if (this.allTotalNeedRefresh) {
          this.AllTotal = 0;
          this.sumAllTotal().then((result: any) => {
            this.allTotalNeedRefresh = false;
            this.AllTotal = result;
            this.sumINMonthDataSearch()
          }).catch(error => { });
        } else {
          this.sumINMonthDataSearch()
        }
      } else {
        this.paginatorSize = 0;
        if (this.sumINMonthData.length > 50) { this.paginatorSize = 26 }
      }
    } else {
      if (!this.hasSumINMonthCatData) {
        this.sumINMonthCatDataSearch()
      } else {
        this.paginatorSize = 0;
        if (this.sumINMonthCatData.length > 50) { this.paginatorSize = 26 }
      }
    }
  }

  getCriteria() {
    let criteria = '';
    if (typeof this.StInvSelect === 'object') { criteria += "[StInvID] >= '" + this.StInvID + "' And " };
    if (typeof this.StInvSelect2 === 'object') { criteria += "[StInvID] <= '" + this.StInvID2 + "' And " };
    if (this.StInvCust) { criteria += "[StInvCust] = '" + this.StInvCust + "' And " };
    if (this.DrugType) { criteria += "[DrugType] = '" + this.DrugType + "' And " };
    if (this.DrugCat) { criteria += "[DrugCat] = '" + this.DrugCat + "' And " };
    if (this.DrugGroup) { criteria += "[DrugGroup] = '" + this.DrugGroup + "' And " };
    if (this.CustTypeID || this.CustTypeID === 0) { criteria += "[CustTypeID] = " + this.CustTypeID + " And " };
    if (this.StInvStatus || this.StInvStatus === 0) { criteria += "[StInvStatus] = " + this.StInvStatus + " And " };
    if (this.tdate5) { criteria += "[StInvCalcPeriod] = '" + ('0' + (this.tdate5.getMonth() + 1)).slice(-2) + this.tdate5.getFullYear().toString().slice(-2) + "' And " };
    if (this.tdate3) { criteria += "([StInvDateUpdate] Between " + this.xfunc.convertFromDate(this.tdate3) + " AND " + this.xfunc.endDate(this.tdate4) + ") And " }
    criteria += "[StInvUpdate] = True"
    return { criteria: criteria };
  }

  sumAllTotal() {
    return new Promise((resolve, reject) => {
      let criteria = '';
      if (typeof this.StInvSelect === 'object') { criteria += "[StInvID] >= '" + this.StInvID + "' And " };
      if (typeof this.StInvSelect2 === 'object') { criteria += "[StInvID] <= '" + this.StInvID2 + "' And " };
      if (this.tdate5) { criteria += "[StInvCalcPeriod] = '" + ('0' + (this.tdate5.getMonth() + 1)).slice(-2) + this.tdate5.getFullYear().toString().slice(-2) + "' And " };
      if (this.tdate3) { criteria += "([StInvDateUpdate] Between " + this.xfunc.convertFromDate(this.tdate3) + " AND " + this.xfunc.endDate(this.tdate4) + ") And " }
      criteria += "[StInvUpdate] = True"
      const query = {
        field: 'Sum(CDbl([DtAmount])*[DtPrice]) AS GndTotal',
        table: 'OutInvoice INNER JOIN OutInvoiceDetail ON OutInvoice.StInvID = OutInvoiceDetail.DtInvID',
        where: criteria
      }
      this.dataService.getData(query).subscribe((result: any) => {
        if (result.length > 0) {
          resolve(result[0].GndTotal);
        }
      }, error => reject(error));
    })
  }

  sumINMonthDataSearch() {
    this.myMsgService.showLoading();
    this.hasSumINMonthData = true;
    let payload = { criteria: this.getCriteria().criteria, sumall: this.AllTotal };
    this.centerReportService.getSumOUTMonth(payload).subscribe((data: any) => {
      this.GrandSTTotal = 0;
      this.paginatorSize = 0;
      if (data && data.length > 0) {
        data.forEach(item => {
          this.GrandSTTotal += item.GndTotal;
        })
      }
      if (data.length > 50) { this.paginatorSize = 26 }
      this.sumINMonthData = data;
      this.hideSideBar(this.innerWidthSize)
      this.myMsgService.clearLoading();
    });
  }

  sumINMonthCatDataSearch() {
    this.myMsgService.showLoading();
    this.hasSumINMonthCatData = true;
    this.centerReportService.getSumOUTMonthCat(this.getCriteria()).subscribe((data: any) => {
      this.GndTotal2 = 0; this.EXTGndTotal2 = 0; this.OTHGndTotal2 = 0; this.SumAll2 = 0;
      this.paginatorSize = 0;
      if (data && data.length > 0) {
        data.forEach(item => {
          this.GndTotal2 += item.GndTotal1;
          this.EXTGndTotal2 += item.ExtGndTotal;
          this.SumAll2 += item.GndTotalAll;
          item.OTHGndTotal = item.GndTotalAll - item.GndTotal1 - item.ExtGndTotal;
          item.AllPercent = 0;
        });
        if (this.SumAll2) {
          data.forEach(item => {
            item.AllPercent = item.GndTotalAll / this.SumAll2 * 100
          });
        }
        this.OTHGndTotal2 = this.SumAll2 - this.GndTotal2 - this.EXTGndTotal2;
      }
      if (data.length > 50) { this.paginatorSize = 26 }
      this.sumINMonthCatData = data;
      this.hideSideBar(this.innerWidthSize)
      this.myMsgService.clearLoading();
    });
  }

  scrollViewPort() {
    let viewport = 170;
    if (this.innerWidthSize <= 485) { viewport = 136 } //mobile width
    else if (this.innerWidthSize <= 575) { viewport = 153 }
    else if (this.innerWidthSize <= 915) { viewport = 188 };
    if (this.innerHeightSize >= 480) {
      return 'calc(calc(var(--vh, 1vh) * 100) - ' + (viewport + this.paginatorSize) + 'px)';
    } else {
      return '300px';
    }
  }

}
