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
  selector: 'app-sum-all-month',
  templateUrl: './sum-all-month.component.html',
  styleUrls: ['./sum-all-month.component.scss']
})
export class SumAllMonthComponent implements OnInit, OnDestroy {

  tdate = new Date();
  th: any;

  sizeSubscript: Subscription;
  innerWidthSize: number; innerHeightSize: number;
  paginatorSize = 0;
  leftPanelCollapse = false; leftPanelShow = false; leftPanel2Show = false; isPopUp = false;

  constructor(
    public globalService: GlobalService,
    private eventService: EventService,
    public dataService: DataService,
    private centerReportService: CenterReportService,
    private menuService: MenuService,
    private myMsgService: MyMsgService,
    private xfunc: FuncService) { }

  ngOnInit() {
    this.menuService.setTitle('4-12')
    this.th = this.xfunc.getLocale('th');
    this.dataService.getDrugCat()
    this.dataService.getDrugGroup()
    this.dataService.getDrugType();
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
    if (this.showReport === 1 && !this.sumAllMonth.length) {
      return false
    }
    if (this.showReport === 2 && !this.sumOfMonth.length) {
      return false
    }
    return true
  }

  DrugCat: any;
  DrugGroup: any;
  DrugType: any;

  showReport = 1;
  sumAllMonth = []; SumStart = 0; SumIN = 0; SumOut = 0; hasSumAllMonth = true;
  sumOfMonth = []; outMonthRate: any; hasSumOfMonth = true;
  setFilter() {
    this.showReport = 1;
    this.hasSumAllMonth = false;
    this.hasSumOfMonth = false;
    this.reportChange()
  }

  reportChange() {
    this.leftPanel2Show = false
    if (this.showReport === 1) {
      if (!this.hasSumAllMonth) {
        this.sumAllMonthSearch()
      } else {
        this.paginatorSize = 0;
        if (this.sumAllMonth.length > 50) { this.paginatorSize = 26 }
      }
    } else {
      if (!this.hasSumOfMonth) {
        this.sumOfMonthSearch()
      } else {
        this.paginatorSize = 0;
        if (this.sumOfMonth.length > 50) { this.paginatorSize = 26 }
      }
    }
  }

  getCriteria() {
    let criteria = '';
    if (this.DrugType) { criteria += "[DrugType] = '" + this.DrugType + "' And " };
    if (this.DrugCat) { criteria += "[DrugCat] = '" + this.DrugCat + "' And " };
    if (this.DrugGroup) { criteria += "[DrugGroup] = '" + this.DrugGroup + "' And " };
    return criteria
  }

  sumAllMonthSearch() {
    let criteria1 = '', criteria2 = '', criteria3 = '';
    let pdate = new Date(this.tdate.valueOf());
    pdate.setMonth(pdate.getMonth() - 1);
    criteria1 = this.getCriteria() + "[NPeriod] = '" + ('0' + (pdate.getMonth() + 1)).slice(-2) + pdate.getFullYear().toString().slice(-2) + "'";
    criteria2 = this.getCriteria() + "[StInvCalcPeriod] = '" + ('0' + (this.tdate.getMonth() + 1)).slice(-2) + this.tdate.getFullYear().toString().slice(-2) + "'";
    criteria3 = this.getCriteria() + "[NPeriod] = '" + ('0' + (this.tdate.getMonth() + 1)).slice(-2) + this.tdate.getFullYear().toString().slice(-2) + "'";
    let payload = { criteria1: criteria1, criteria2: criteria2, criteria3: criteria3 };
    this.myMsgService.showLoading();
    this.hasSumAllMonth = true;
    this.centerReportService.getSumAllMonth(payload).subscribe((data: any) => {
      this.SumStart = 0; this.SumIN = 0; this.SumOut = 0;
      this.paginatorSize = 0;
      if (data && data.length > 0) {
        data.forEach(item => {
          this.SumStart += item.SumOfStartAmount;
          this.SumIN += item.SumOfInAmount;
          this.SumOut += item.SumOfOutAmount;
        })
      }
      if (data.length > 50) { this.paginatorSize = 26 }
      this.sumAllMonth = data;
      this.hideSideBar(this.innerWidthSize)
      this.myMsgService.clearLoading();
    })
  }

  sumOfMonthSearch() {
    let criteria = this.getCriteria() + "Int(Right([StInvCalcPeriod],2) & Left([StInvCalcPeriod],2)) >= " +
      (this.tdate.getFullYear() - 1).toString().slice(-2) + ('0' + (this.tdate.getMonth() + 2)).slice(-2) +
      " And Int(Right([StInvCalcPeriod],2) & Left([StInvCalcPeriod],2)) <= " +
      this.tdate.getFullYear().toString().slice(-2) + ('0' + (this.tdate.getMonth() + 1)).slice(-2);
    let payload = { criteria: criteria };
    this.myMsgService.showLoading();
    this.hasSumOfMonth = true;
    this.centerReportService.getSumOfMonth(payload).subscribe((data: any) => {
      this.paginatorSize = 0;
      if (data[0].length > 50) { this.paginatorSize = 26 }
      this.sumOfMonth = data[0];
      this.hideSideBar(this.innerWidthSize)
      this.setTotalSumOfMonth(this.sumOfMonth, false);
      if (data[1].length > 0) {
        this.outMonthRate = data[1][0];
      }
      this.myMsgService.clearLoading();
    })
  }

  sumBefore = 0; sumIN = 0; sumOUT = 0; sumAfter = 0;
  setTotalSumOfMonth(sumOfMonth, edit = true) {
    this.sumBefore = 0; this.sumIN = 0; this.sumOUT = 0; this.sumAfter = 0;
    sumOfMonth.forEach(item => {
      if (edit) {
        item.SumOfEndAmount = item.SumOfStartAmount + item.SumOfInAmount - item.OutAmount2
      }
      this.sumBefore += item.SumOfStartAmount;
      this.sumIN += item.SumOfInAmount;
      this.sumOUT += item.OutAmount2;
      this.sumAfter += item.SumOfEndAmount;
    });
  }

  departColor(mode) {
    if (mode === 1) { return '#005b9f' };
    if (mode === 2) {return '#e02365'}
    return '#333333'
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
