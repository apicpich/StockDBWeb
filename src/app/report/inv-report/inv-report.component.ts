import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { GlobalService } from '../../service/global.service';
import { EventService } from '../../service/event.service';
import { DataService } from '../../service/data.service';
import { DepartService } from '../../service/depart.service';
import { DepartReportService } from '../../service/depart-report.service';
import { MenuService } from '../../service/menu.service';
import { MyMsgService } from '../../service/msg.service';
import { FuncService } from '../../service/xfunc.service';
import { Subscription, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { MenuItem } from 'primeng/api';

@Component({
  selector: 'app-inv-in-report',
  templateUrl: './inv-report.component.html',
  styleUrls: ['./inv-report.component.scss']
})
export class InvReportComponent implements OnInit, OnDestroy {

  th: any;
  sizeSubscript: Subscription; routeSubscript: Subscription; departSubscript: Subscription;
  innerWidthSize: number; innerHeightSize: number;
  paginatorSize = 0;
  contextItems: MenuItem[];

  leftPanelShow = false; leftPanel2Show = false; leftPanelCollapse = false; isPopUp = false;

  data = []; detail = []; dataSelect: any; dataTotal = 0;
  query: any; minDate: Date;

  isReady = false;
  pageId = 0;
  pageText = ['รับ', 'เบิก'];
  pageText2 = ['รับเข้า', 'เบิกจ่าย'];
  pageText3 = ['ผู้จำหน่าย', 'หน่วยเบิก'];

  constructor(
    public globalService: GlobalService,
    private eventService: EventService,
    private route: ActivatedRoute,
    public dataService: DataService,
    public departService: DepartService,
    private reportService: DepartReportService,
    private menuService: MenuService,
    private myMsgService: MyMsgService,
    private xfunc: FuncService) { }

  ngOnInit() {
    this.th = this.xfunc.getLocale('th');
    this.globalService.getStatus()
    this.minDate = new Date()
    this.minDate.setFullYear(this.minDate.getFullYear() - 1);
    this.contextItems = [
      { label: 'รายละเอียด', icon: 'pi pi-info', command: (event) => this.onRowShowPdItem(this.dataSelect.DtDrugID) },
    ]
    this.routeSubscript = this.route.paramMap.pipe(
      switchMap(params => { return of(params.get('id')) })
    ).subscribe((id) => {
      this.setUpPage(id)
    })
    this.sizeSubscript = this.eventService.windowsSize$.subscribe((size) => {
      this.innerHeightSize = window.innerHeight
      if (this.innerWidthSize !== size) { //not execute when mobile phone keyboard appeared
        this.hideSideBar(size)
        this.innerWidthSize = size
      }
    })
    this.departSubscript = this.eventService.departChange$.subscribe(() => {
      this.setUpPage(this.pageId)
    });
  }
  ngOnDestroy(): void {
    this.sizeSubscript.unsubscribe()
    this.routeSubscript.unsubscribe()
    this.departSubscript.unsubscribe()
  }

  setUpPage(id) {
    this.pageId = +id
    this.menuService.setTitle('3-' + (this.pageId + 2))
    this.data = []; this.detail = []; this.dataSelect = null; this.dataTotal = 0; this.isReady = false;
    this.setBlankQuery()
    let task = [this.dataService.getDrugLists()];
    if (this.pageId === 0) {
      task.push(this.globalService.getSupplier())
    } else {
      task.push(this.globalService.getCustomer())
    }
    Promise.all(task).then(() => { this.isReady = true });
  }

  hideSideBar(size) {
    if (size >= 1124) {
      this.leftPanelCollapse = false
      this.isPopUp = false
      this.leftPanelShow = true
      this.leftPanel2Show = false
    } else {
      this.leftPanelCollapse = true
      if (!this.data.length) {
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

  setBlankQuery() {
    this.query = {
      drugIdList: null, stInv: null, stInv2: null, stInvDate: new Date(), stInvDate2: new Date(),
      stInvCust: null, stInvDateUpdate: null, stInvDateUpdate2: null, status: null
    }
    this.query.stInvDate.setDate(1);
    this.query.stInvDate.setHours(0, 0, 0, 0);
    this.query.stInvDate2.setHours(0, 0, 0, 0);
  }

  drugSearch = ''; catId: string = null; groupId: string = null;
  stInvSelect: any; stInvSelect2: any;

  filteredResults: any[];
  filterResults(event) {
    this.departService.getInvList(event.query, this.pageId).subscribe((result: any) => {
      this.filteredResults = result;
    });
  }

  rawData = []; rawDetail = [];
  selectFromLeftPanel() {
    this.myMsgService.showLoading()
    let drugFilter = []
    if (this.drugSearch) {
      drugFilter = this.xfunc.filterList(this.drugSearch, this.dataService.drugLists, ['DrugID', 'DrugNameText', 'DrugGeneric', 'DrugGeneric2']);
    } else {
      drugFilter = this.dataService.drugLists
    }
    if (this.catId) drugFilter = drugFilter.filter(x => x.DrugCat === this.catId);
    if (this.groupId) drugFilter = drugFilter.filter(x => x.DrugGroup === this.groupId);
    if (drugFilter.length === this.dataService.drugLists.length) { drugFilter = [] }
    this.query.drugIdList = drugFilter.map(x => x.DrugID);
    this.query.stInv = this.stInvSelect?.StInvID
    this.query.stInv2 = this.stInvSelect2?.StInvID
    this.reportService.invReport({ query: this.query }, this.pageId).subscribe((result: any) => {
      this.rawData = []; this.rawDetail = [];
      if (result.length) {
        let curInv = '', total = 0
        result.forEach(item => {
          if (curInv !== item.StInvID) {
            if (this.rawData.length) this.rawData[this.rawData.length - 1].total = total;
            if (this.pageId === 0) {
              item.SupplierName = this.globalService.supplierTable.find(x => x.value === item.StInvCust).label;
            } else {
              item.SupplierName = this.globalService.customerTable.find(x => x.value === item.StInvCust).label;
            }
            item.StatusName = this.globalService.statusTable.find(x => x.value === item.StInvStatus).label;
            if (this.pageId === 1) {
              if (item.DtLotID) {
                if (!item.DtLot) item.DtLot = '-xxxx-';
              } else {
                item.DtLot = '-ไม่ระบุ Lot-'
              }
            }
            this.rawData.push(item)
            total = 0
            curInv = item.StInvID
          }
          const drug = this.dataService.drugLists.find(x => x.DrugID === item.DtDrugID)
          item.pd_name = drug.DrugNameText
          item.pd_unit = drug.DrugUnit
          total += item.DtAmount * item.DtPrice
        })
        this.rawData[this.rawData.length - 1].total = total;
        this.rawDetail = result
      }
      this.showStUpdate()
      this.reportChange()
      this.hideSideBar(this.innerWidthSize)
      this.myMsgService.clearLoading()
    })
  }

  getDetail(StInvID) {
    return this.detail.filter(x => x.DtInvID === StInvID);
  }
  
  stInvUpdate: null; showReport = 1;
  showStUpdate() {
    if (this.stInvUpdate) {
      this.data = this.rawData.filter(x => x.StInvUpdate);
      this.detail = this.rawDetail.filter(x => x.StInvUpdate);
    } else {
      if (this.stInvUpdate === false) {
        this.data = this.rawData.filter(x => !x.StInvUpdate);
        this.detail = this.rawDetail.filter(x => !x.StInvUpdate);
      } else {
        this.data = this.rawData
        this.detail = this.rawDetail
      }
    }
    this.dataTotal = 0
    this.data.forEach(item => { this.dataTotal += item.total })
    if (!this.data.length && this.leftPanel2Show) this.hideSideBar(this.innerWidthSize);
    if (this.leftPanelShow) this.hideSideBar(this.innerWidthSize);
  }

  reportChange() {
    this.paginatorSize = 0;
    if (this.showReport === 1) {
      if (this.data.length > 50) { this.paginatorSize = 26 }
    } else {
      if (this.detail.length > 50) { this.paginatorSize = 26 }
    }
  }

  rowHasSelect: boolean; pdId = ''; displayPdItemDialog = false; showAppPD = false
  selectRow(event) {
    this.rowHasSelect = true
    this.dataSelect = event.data
  }
  onDblClick(event) {
    // get row select from dblclick
    if (!this.rowHasSelect) { event.target.click() };
    this.onRowShowPdItem(this.dataSelect.DtDrugID);
  }
  onDblClickExpand(item) {
    this.onRowShowPdItem(item.DtDrugID);
  }
  onRowShowPdItem(pdId) {
    this.pdId = pdId;
    this.showAppPD = true
    setTimeout(() => {
      this.displayPdItemDialog = true
    }, 300);
  }

  isExp(date) {
    return this.xfunc.colorExp(date);
  }

  onPdDialogHide() {
    this.displayPdItemDialog = false
    this.showAppPD = false
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
