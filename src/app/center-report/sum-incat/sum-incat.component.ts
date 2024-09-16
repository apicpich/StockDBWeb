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
  selector: 'app-sum-incat',
  templateUrl: './sum-incat.component.html',
  styleUrls: ['./sum-incat.component.scss']
})
export class SumINCatComponent implements OnInit, OnDestroy {

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
    this.menuService.setTitle('4-8')
    this.th = this.xfunc.getLocale('th');
    this.dataService.getDrugCat()
    this.dataService.getDrugGroup()
    this.dataService.getSupplier();
    this.dataService.getDrugType();
    this.dataService.getBuget();
    this.dataService.getPOMethod();
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
    if (this.showReport === 1 && !this.sumINCatSuppData.length) {
      return false
    }
    if (this.showReport === 2 && !this.sumINCatData.length) {
      return false
    }
    return true
  }

  StInvID: any; StInvID2: any; StInvSelect: any; StInvSelect2: any;
  DrugCat: any; DrugGroup: any; StInvCust: any; DrugType: any;
  StInvBudget: any; StInvMethod: any; DtCoPO: any;
  StInvUpdate = true; DtInnovate = false;

  filteredResults: any[];
  filterResults(event) {
    this.dataService.getStInvList(event).subscribe((result: any) => {
      this.filteredResults = result
    })
  }
  
  showReport = 1;
  sumINCatSuppData = []; sumCountINCatSuppData = 0; sumValINCatSuppData = 0; hasSumINCatSuppData = true;
  sumINCatData = []; EDGndTotal2 = 0; NEDGndTotal2 = 0; EXTGndTotal2 = 0; OTHGndTotal2 = 0; SumAll2 = 0; hasSumINCatData = true;
  setFilter() {
    this.hasSumINCatData = false;
    this.hasSumINCatSuppData = false;
    this.reportChange()
  }
  reportChange() {
    this.leftPanel2Show = false
    if (this.showReport === 1) {
      if (!this.hasSumINCatSuppData) {
        this.sumINCatSuppDataSearch()
      } else {
        this.paginatorSize = 0;
        if (this.sumINCatSuppData.length > 50) { this.paginatorSize = 26 }
      }
    } else {
      if (!this.hasSumINCatData) {
        this.sumINCatDataSearch()
      } else {
        this.paginatorSize = 0;
        if (this.sumINCatData.length > 50) { this.paginatorSize = 26 }
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
    if (this.StInvBudget) { criteria += "[StInvBudget] = '" + this.StInvBudget + "' And " };
    if (this.StInvMethod) { criteria += "[StInvMethod] = '" + this.StInvMethod + "' And " };
    if (this.DtCoPO || this.DtCoPO === 0) { criteria += "[DtCoPO] = " + this.DtCoPO + " And " };
    if (this.StInvUpdate) { criteria += "[StInvUpdate] = True And " };
    if (this.DtInnovate) { criteria += "[DtInnovate] = True And " };
    if (this.tdate5) { criteria += "[StInvCalcPeriod] = '" + ('0' + (this.tdate5.getMonth() + 1)).slice(-2) + this.tdate5.getFullYear().toString().slice(-2) + "' And " };
    if (this.tdate1) { criteria += "([StInvDate] Between " + this.xfunc.convertFromDate(this.tdate1) + " AND " + this.xfunc.endDate(this.tdate2) + ") AND " };
    if (this.tdate3) { criteria += "([StInvDateUpdate] Between " + this.xfunc.convertFromDate(this.tdate3) + " AND " + this.xfunc.endDate(this.tdate4) + ")" }
    else { criteria += "True" };
    return { criteria: criteria };
  }

  sumINCatSuppDataSearch() {
    this.myMsgService.showLoading();
    this.hasSumINCatSuppData = true;
    this.centerReportService.getSumINCatSupp(this.getCriteria()).subscribe((data: any) => {
      this.sumCountINCatSuppData = 0;
      this.sumValINCatSuppData = 0;
      this.paginatorSize = 0;
      if (data.length) {
        data.forEach(item => {
          this.sumCountINCatSuppData += item.CountAll;
          this.sumValINCatSuppData += item.SumAll;
        })
      }
      if (data.length > 50) { this.paginatorSize = 26 }
      this.sumINCatSuppData = data;
      this.hideSideBar(this.innerWidthSize)
      this.myMsgService.clearLoading();
    });
  }

  sumINCatDataSearch() {
    this.myMsgService.showLoading();
    this.hasSumINCatData = true;
    this.centerReportService.getSumINCat(this.getCriteria()).subscribe((data: any) => {
      this.EDGndTotal2 = 0; this.NEDGndTotal2 = 0; this.EXTGndTotal2 = 0; this.OTHGndTotal2 = 0; this.SumAll2 = 0;
      this.paginatorSize = 0;
      if (data.length) {
        data.forEach(item => {
          this.EDGndTotal2 += item.EDGndTotal;
          this.NEDGndTotal2 += item.NEDGndTotal;
          this.EXTGndTotal2 += item.EXTGndTotal;
          this.OTHGndTotal2 += item.OTHGndTotal;
          this.SumAll2 += item.SumAll;
        });
      }
      if (data.length > 50) { this.paginatorSize = 26 }
      this.sumINCatData = data;
      this.hideSideBar(this.innerWidthSize)
      this.myMsgService.clearLoading();
    });
  }

  getCoPOName(DtCoPO) { if (DtCoPO) { return ' (' + this.dataService.CoPOTable[DtCoPO + 1].label + ')' } else { return '' } }
  getCoPOSumName(CatSupp) {
    if (CatSupp === 0) { return 'องค์การเภสัชกรรม' }
    if (CatSupp === 99) { return 'ผู้จำหน่ายอื่นๆ' }
    return this.dataService.CoPOTable[CatSupp + 1].label
  }

  scrollViewPort() {
    let viewport = 198;
    if (this.innerWidthSize <= 485) { viewport = 164 } //mobile width
    else if (this.innerWidthSize <= 575) { viewport = 181 }
    else if (this.innerWidthSize <= 915) { viewport = 216 };
    if (this.innerHeightSize >= 480) {
      return 'calc(calc(var(--vh, 1vh) * 100) - ' + (viewport + this.paginatorSize) + 'px)';
    } else {
      return '300px';
    }
  }

}
