import { Component, OnInit, OnDestroy } from '@angular/core';
import { GlobalService } from '../../service/global.service';
import { EventService } from '../../service/event.service';
import { DataService } from '../../service/data.service';
import { CenterReportService } from '../../service/center-report.service';
import { MenuService } from '../../service/menu.service';
import { MyMsgService } from '../../service/msg.service';
import { FuncService } from '../../service/xfunc.service';
import { Subscription } from 'rxjs';
import { MenuItem } from 'primeng/api';

@Component({
  selector: 'app-stock-card',
  templateUrl: './stock-card.component.html',
  styleUrls: ['./stock-card.component.scss']
})
export class StockCardCenterComponent implements OnInit, OnDestroy {

  th: any;
  sizeSubscript: Subscription;
  innerWidthSize: number; innerHeightSize: number;
  paginatorSize = 0;
  contextItems: MenuItem[];

  leftPanelShow = false; leftPanel2Show = false; leftPanelCollapse = false; isPopUp = false;

  drugItem: any; data = []; sumIn = 0; sumOut = 0;
  query: any;
  isReady = false

  constructor(
    public globalService: GlobalService,
    private eventService: EventService,
    private dataService: DataService,
    private centerReportService: CenterReportService,
    private menuService: MenuService,
    private myMsgService: MyMsgService,
    private xfunc: FuncService
  ) { }

  ngOnInit(): void {
    this.menuService.setTitle('3-4')
    this.th = this.xfunc.getLocale('th');
    this.setUpPage()
    this.contextItems = [
      { label: 'รายละเอียด', icon: 'pi pi-info', command: (event) => this.onRowShowPdItem() },
    ]
    this.sizeSubscript = this.eventService.windowsSize$.subscribe((size) => {
      this.innerHeightSize = window.innerHeight
      if (this.innerWidthSize !== size) { //not execute when mobile phone keyboard appeared
        this.hideSideBar(size)
        this.innerWidthSize = size
      }
    })
  }

  setUpPage() {
    this.drugItem = null; this.data = []; this.sumIn = 0; this.sumOut = 0; this.isReady = false;
    this.setBlankQuery()
    Promise.all([
      this.dataService.getDrugLists(),
      this.dataService.getSupplier(),
      this.dataService.getCustomersLists()
    ]).then(() => { this.isReady = true });
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
    this.query = { DrugID: null, stInvDateUpdate: new Date() }
    this.query.stInvDateUpdate.setDate(1)
    this.query.stInvDateUpdate.setHours(0, 0, 0, 0)
    this.productSelect = null
  }

  filteredProductResults: any[]; productSelect: any;
  filterProductResults(event) {
    this.filteredProductResults = this.xfunc.filterList(event.query, this.dataService.drugLists, ['DrugID', 'DrugNameText', 'DrugGeneric', 'DrugGeneric2']);
  }

  selectFromLeftPanel() {
    this.myMsgService.showLoading()
    this.query.DrugID = this.productSelect.DrugID
    let criteria = `[DtDrugID] = '${this.query.DrugID}' AND [StInvUpdate] = True`
    if (this.query.stInvDateUpdate) { criteria += " AND [StInvDateUpdate] >= " + this.xfunc.convertFromDate(this.query.stInvDateUpdate) }
    this.centerReportService.stockCardReport({ id: this.query.DrugID, criteria: criteria }).subscribe(([drugItem, st, ot]: any) => {
      this.drugItem = null; this.data = []; this.sumIn = 0; this.sumOut = 0; this.paginatorSize = 0;
      if (drugItem.length) {
        const drug = this.dataService.drugLists.find(x => x.DrugID === drugItem[0].DrugID)
        this.drugItem = { ...drug, ...drugItem[0] }
        let data = [...st, ...ot]
        data.sort((a, b) => {
          let valueA = new Date(a.StInvDateUpdate)
          let valueB = new Date(b.StInvDateUpdate)
          return valueA.valueOf() - valueB.valueOf()
        })
        let curAmount = this.drugItem.DrugStock, curValue = this.drugItem.DrugValue;
        for (let i = data.length - 1; i >= 0; i--) { // loop from bottom
          const rec = data[i]
          if (!rec.DtLot) rec.DtLot = '-xxxx-';
          rec.remainAmount = curAmount; rec.remainValue = curValue;
          if (rec.mode) {
            rec.invName = this.dataService.CustomersLists.find(x => x.value === rec.StInvCust).label;
            rec.out = rec.DtAmount * rec.DtPack
            this.sumOut += rec.out
            curAmount += rec.out
            curValue += rec.DtAmount * rec.DtPrice
          } else {
            rec.invName = this.dataService.SupplierTable.find(x => x.value === rec.StInvCust).label;
            rec.in = rec.DtAmount * rec.DtPack
            this.sumIn += rec.in
            curAmount -= rec.in
            curValue -= rec.DtAmount * rec.DtPrice
          }
        }
        data.unshift({ StInvDateUpdate: this.query.stInvDateUpdate, invName: 'ยอดยกมา', remainAmount: curAmount, remainValue: curValue })
        this.data = data
      }
      if (this.data.length > 50) { this.paginatorSize = 26 }
      this.hideSideBar(this.innerWidthSize)
      this.myMsgService.clearLoading()
    })
  }

  pdId: string; displayPdItemDialog = false; showAppPD = false
  onRowShowPdItem() {
    this.pdId = this.query.DrugID;
    this.showAppPD = true
    setTimeout(() => {
      this.displayPdItemDialog = true
    }, 300);
  }

  onPdDialogHide() {
    this.displayPdItemDialog = false
    this.showAppPD = false
  }

  scrollViewPort() {
    let viewport = 200;
    if (this.innerWidthSize <= 485) { viewport = 165 } //mobile width
    else if (this.innerWidthSize <= 575) { viewport = 183 }
    else if (this.innerWidthSize <= 915) { viewport = 218 };
    if (this.innerHeightSize >= 480) {
      return 'calc(calc(var(--vh, 1vh) * 100) - ' + (viewport + this.paginatorSize) + 'px)';
    } else {
      return '300px';
    }
  }

}
