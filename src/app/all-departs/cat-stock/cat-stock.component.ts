import { Component, OnInit, OnDestroy } from '@angular/core';
import { GlobalService } from '../../service/global.service';
import { EventService } from '../../service/event.service';
import { DataService } from '../../service/data.service';
import { DepartReportService } from '../../service/depart-report.service';
import { MenuService } from '../../service/menu.service';
import { FuncService } from '../../service/xfunc.service';
import { MyMsgService } from '../../service/msg.service';
import { Subscription } from 'rxjs';
import { SelectItem } from 'primeng/api';

@Component({
  selector: 'app-cat-stock',
  templateUrl: './cat-stock.component.html',
  styleUrls: ['./cat-stock.component.scss']
})
export class CatStockComponent implements OnInit, OnDestroy {

  th: any;
  sizeSubscript: Subscription;
  innerWidthSize: number; innerHeightSize: number;
  paginatorSize = 0;

  leftPanelShow = false; leftPanel2Show = false; leftPanelCollapse = false; isPopUp = false;

  data = []; dataTotals: any; drugCatLists = []; isReady = false;

  query: any;
  departSelectItems: SelectItem[]; departs: any; cols = []; colsCountArray = [];
  
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
    this.menuService.setTitle('5-0')
    this.th = this.xfunc.getLocale('th');
    this.sizeSubscript = this.eventService.windowsSize$.subscribe((size) => {
      this.innerHeightSize = window.innerHeight
      if (this.innerWidthSize !== size) { //not execute when mobile phone keyboard appeared
        this.hideSideBar(size)
        this.innerWidthSize = size
      }
    })
    this.setupReport()
  }

  setupReport() {
    this.setBlankQuery()
    this.dataService.getDrugLists().then(() => {
      this.drugCatLists = this.dataService.drugLists.map(x => { return { drug_id: x.DrugID, cat_id: x.DrugCat } });
      this.departSelectItems = this.globalService.departTable.filter(x => x.value !== 'center');
      this.departs = this.globalService.departs.filter(x => x.depart_id !== 'center');
      this.isReady = true
    });
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
      departs: [], catId: null, last_in: null, last_out: null,
      has_exp_date: null, near_exp_date: null, exp_period: 180, firstQuery: true
    };
  }

  depart: null; departType: null;

  selectFromLeftPanel() {
    let departLists = []
    if (this.depart) {
      departLists.push(this.depart)
    } else {
      if (this.departType || this.departType === 0) {
        this.departs.forEach(depart => {
          if (depart.depart_type === this.departType) {
            departLists.push(depart.depart_id)
          }
        });
      } else {
        departLists = this.departs.map(x => x.depart_id);
      }
    }
    this.query.departs = departLists
    const payload = { query: this.query, catData: this.query.firstQuery ? this.drugCatLists : [] };
    this.myMsgService.showLoading()
    this.reportService.catAllDepartReport(payload).subscribe((result: any) => {
      this.query.firstQuery = false
      this.dataTotals = { depart_id: '', depart_name: 'รวม' };
      this.paginatorSize = 0;
      let pivotResult = [], catCols = []
      if (result.length) {
        result.forEach(item => {
          // column category add
          if (!catCols.some(x => x.field === item.cat_id)) {
            catCols.push({
              field: item.cat_id,
              header: this.dataService.DrugCatTable.find(x => x.value === item.cat_id).label
            })
          }
          // pivot data add
          let found = pivotResult.find(x => x.depart_id === item.depart_id);
          if (found) {
            found[item.cat_id] = item.sum_value; found.total += item.sum_value;
          } else {
            const depart_name = this.globalService.departTable.find(x => x.value === item.depart_id).label;
            pivotResult.push(
              { depart_id: item.depart_id, depart_name: depart_name, [item.cat_id]: item.sum_value, total: item.sum_value }
            )
          }
          if (this.dataTotals[item.cat_id]) {
            this.dataTotals[item.cat_id] += item.sum_value
          } else {
            this.dataTotals[item.cat_id] = item.sum_value
          }
        })
        catCols.sort((a, b) => { return +a.field - +b.field });
        this.cols = [
          { field: 'depart_id', header: 'รหัส' },
          { field: 'depart_name', header: 'หน่วยงาน' },
          ...catCols,
          { field: 'total', header: 'รวม' }
        ];
        this.colsCountArray = Array(this.cols.length - 2).fill(0)
        pivotResult.sort((a, b) => { return a.depart_id.localeCompare(b.depart_id) });
        this.dataTotals.total = 0
        pivotResult.forEach(r => { this.dataTotals.total += r.total });
      }
      if (pivotResult.length > 50) { this.paginatorSize = 26 }
      this.data = pivotResult
      this.hideSideBar(this.innerWidthSize)
      this.myMsgService.clearLoading()
    })
  }

  scrollViewPort() {
    let viewport = 199;
    if (this.innerWidthSize <= 485) { viewport = 165 } //mobile width
    else if (this.innerWidthSize <= 575) { viewport = 182 }
    else if (this.innerWidthSize <= 915) { viewport = 217 };
    if (this.innerHeightSize >= 480) {
      return 'calc(calc(var(--vh, 1vh) * 100) - ' + (viewport + this.paginatorSize) + 'px)';
    } else {
      return '300px';
    }
  }

}
