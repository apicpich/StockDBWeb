import { Component, OnInit, OnDestroy } from '@angular/core';
import { GlobalService } from '../../service/global.service';
import { EventService } from '../../service/event.service';
import { DataService } from '../../service/data.service';
import { DepartReportService } from '../../service/depart-report.service';
import { MenuService } from '../../service/menu.service';
import { MyMsgService } from '../../service/msg.service';
import { FuncService } from '../../service/xfunc.service';
import { Subscription } from 'rxjs';
import { MenuItem } from 'primeng/api';

@Component({
  selector: 'app-stock',
  templateUrl: './stock.component.html',
  styleUrls: ['./stock.component.scss']
})
export class StockComponent implements OnInit, OnDestroy {

  th: any;
  sizeSubscript: Subscription; departSubscript: Subscription;
  innerWidthSize: number; innerHeightSize: number;
  paginatorSize = 0;
  contextItems: MenuItem[];

  leftPanelShow = false; leftPanel2Show = false; leftPanelCollapse = false; isPopUp = false;

  data = []; lot = []; dataSelect: any; dataTotal = 0;
  catReportLists = []; showReport = 1

  query: any;
  isReady = false

  constructor(
    public globalService: GlobalService,
    private eventService: EventService,
    public dataService: DataService,
    private reportService: DepartReportService,
    private menuService: MenuService,
    private myMsgService: MyMsgService,
    private xfunc: FuncService
  ) { }

  ngOnInit(): void {
    this.menuService.setTitle('3-0')
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
    this.departSubscript = this.eventService.departChange$.subscribe(() => {
      this.setUpPage()
    });
  }

  setUpPage() {
    this.data = []; this.lot = []; this.dataSelect = null; this.dataTotal = 0; this.isReady = false;
    this.setBlankQuery()
    Promise.all([
      this.dataService.getDrugLists(),
      this.globalService.getSupplier()
    ]).then(() => { this.isReady = true });
  }

  ngOnDestroy(): void {
    this.sizeSubscript.unsubscribe()
    this.departSubscript.unsubscribe()
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
      drugIdList: null, pd_min: false, pd_max: false, pd_active: null, has_stock: true, not_active: null,
      last_in: null, last_out: null, has_exp_date: null, near_exp_date: null, exp_period: 180
    }
  }

  drugSearch = ''; catId: string = null; groupId: string = null;

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
    this.reportService.stockReport({ query: this.query }).subscribe(([result, lot]: any) => {
      this.dataTotal = 0;
      this.paginatorSize = 0;
      this.catReportLists = [];
      let tempData = [];
      if (result.length) {
        result.forEach(item => {
          const drug = this.dataService.drugLists.find(x => x.DrugID === item.DrugID)
          if (this.query.not_active === null || drug.NotActive === this.query.not_active) {
            item.pd_name = drug.DrugNameText
            item.pd_unit = drug.DrugUnit
            const detail = lot.filter(x => x.DrugDID === item.DrugID);
            item.DrugStock = 0; item.DrugValue = 0; item.DrugExp = null;
            if (detail.length) {
              let hasExp = false
              detail.forEach(dt => {
                item.DrugStock += dt.DrugDStock;
                item.DrugValue += dt.DrugDStock * dt.DrugDCost / dt.DrugDPack
                if (!hasExp && dt.DrugDExp) {
                  item.DrugExp = dt.DrugDExp
                  hasExp = true
                }
              });
              this.dataTotal += item.DrugValue
              const catFound = this.catReportLists.find(x => x.catId === drug.DrugCat);
              if (catFound) {
                catFound.total += item.DrugValue;
              } else {
                this.catReportLists.push(
                  { catId: drug.DrugCat, catName: drug.CatName, total: item.DrugValue }
                )
              }
            }
            tempData.push(item)
          }
        })
        this.catReportLists.sort((a, b) => { return +a.catId - +b.catId });
      }
      if (lot.length) {
        lot.forEach(lt => {
          lt.SupplierName = this.globalService.supplierTable.find(x => x.value === lt.DrugDSupply).label;
        });
      }
      this.lot = lot
      if (this.query.has_stock) {
        this.data = tempData.filter(x => x.DrugStock > 0);
      } else {
        this.data = tempData
      }
      if (this.data.length > 50) { this.paginatorSize = 26 }
      this.hideSideBar(this.innerWidthSize)
      this.myMsgService.clearLoading()
    })
  }

  getDetail(DrugID) {
    return this.lot.filter(x => x.DrugDID === DrugID);
  }

  rowHasSelect: boolean; pdId = ''; displayPdItemDialog = false; showAppPD = false
  selectRow(event) {
    this.rowHasSelect = true
    this.dataSelect = event.data
  }
  onDblClick(event) {
    // get row select from dblclick
    if (!this.rowHasSelect) { event.target.click() };
    this.onRowShowPdItem();
  }
  onRowShowPdItem() {
    this.pdId = this.dataSelect.DrugID;
    this.showAppPD = true
    setTimeout(() => {
      this.displayPdItemDialog = true
    }, 300);
  }

  isExp(date) {
    return this.xfunc.colorExp(date);
  }

  updateSelect(event) {
    this.dataSelect.DrugMin = event.DrugMin
    this.dataSelect.DrugRemark = event.DrugRemark
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
