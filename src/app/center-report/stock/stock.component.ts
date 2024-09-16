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
  selector: 'app-stock',
  templateUrl: './stock.component.html',
  styleUrls: ['./stock.component.scss']
})
export class StockCenterComponent implements OnInit, OnDestroy {

  th: any;
  sizeSubscript: Subscription;
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
    private centerReportService: CenterReportService,
    private menuService: MenuService,
    private myMsgService: MyMsgService,
    private xfunc: FuncService
  ) { }

  ngOnInit(): void {
    this.menuService.setTitle('4-6')
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
    this.data = []; this.lot = []; this.dataSelect = null; this.dataTotal = 0; this.isReady = false;
    this.setBlankQuery()
    Promise.all([
      this.dataService.getDrugLists(),
      this.dataService.getSupplier()
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
    this.query = {
      drugId: null, drugName: null, CoPO: null, catName: null, groupName: null,
      last_in: null, last_out: null,
      pd_min: false, pd_max: false, pd_active: null, has_stock: true,
      has_exp_date: null, near_exp_date: null, exp_period: 180
    }
  }

  selectFromLeftPanel() {
    let criteria = '', criteria2 = '';
    if (this.query.drugId) { criteria += "[DrugID] Like '" + this.query.drugId + "%' And " };
    if (this.query.drugName) { criteria += "[DrugName] Like '" + this.query.drugName + "%' And " };
    if (this.query.CoPO || this.query.CoPO === 0) { criteria += "[CoPO] = " + this.query.CoPO + " And " };
    if (this.query.catName) { criteria += "[DrugCat] = '" + this.query.catName + "' And " };
    if (this.query.groupName) { criteria += "[DrugGroup] = '" + this.query.groupName + "' And " };
    if (this.query.last_in) { criteria += "[DrugLastIn] < " + this.xfunc.convertFromDate(this.query.last_in) + " And " }
    if (this.query.last_out) { criteria += "([DrugLastOut] Is Null OR [DrugLastOut] < " + this.xfunc.convertFromDate(this.query.last_out) + ") And " }
    if (this.query.pd_min) { criteria += "[DrugStock] <= [DrugMin] AND " };
    if (this.query.pd_max) { criteria += "[DrugStock] >= [DrugMax] AND " };
    if (this.query.pd_active) { criteria += "[NotActive] = No AND " }
    else if (this.query.pd_active === false) { criteria += "[NotActive] = Yes AND " };
    if (this.query.has_stock) { criteria += "[DrugStock] > 0" } else { criteria += "True" };

    if (this.query.has_exp_date) { criteria2 += "[DrugDExp] <= Now() AND " }
    else if (this.query.has_exp_date === false) { criteria2 += "[DrugDExp] > Now() AND " };
    if (this.query.near_exp_date) { criteria2 += `[DrugDExp] <= (Now() + ${this.query.exp_period}) AND ` }
    else if (this.query.near_exp_date === false) { criteria2 += `[DrugDExp] > (Now() + ${this.query.exp_period}) AND ` };
    criteria2 += "[DrugDStock] > 0"

    let payload = { criteria: criteria, criteria2: criteria2 };
    this.myMsgService.showLoading()
    this.centerReportService.stockReport(payload).subscribe(([result, lot]: any) => {
      this.dataTotal = 0;
      this.paginatorSize = 0;
      this.catReportLists = [];
      if (result.length) {
        result.forEach(item => {
          const drug = this.dataService.drugLists.find(x => x.DrugID === item.DrugID)
          item.pd_name = drug?.DrugNameText
          item.pd_unit = drug?.DrugUnit
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
        })
        this.catReportLists.sort((a, b) => { return +a.catId - +b.catId });
      }
      if (lot.length) {
        lot.forEach(lt => {
          lt.SupplierName = this.dataService.SupplierTable.find(x => x.value === lt.DrugDSupply).label;
        });
      }
      if (this.query.has_stock) {
        this.data = result.filter(x => x.DrugStock > 0);
      } else {
        this.data = result
      }
      if (this.data.length > 50) { this.paginatorSize = 26 }
      this.lot = lot
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
