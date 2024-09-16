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

const pbudget = ['จัดซื้อเอง', 'GPO', 'ซื้อร่วม จว.', 'ซื้อร่วมเขต', 'ซื้อร่วม กสธ'];
const blankdata = {
  DrugCat: '', PBudget: 0, RQ0: 0, POAmount: 0, RIN: 0, InAmount: 0,
  RQ1: 0, RQ2: 0, RQ3: 0, RQ4: 0, RV1: 0, RV2: 0, RV3: 0, RV4: 0,
  PQ1: 0, PQ2: 0, PQ3: 0, PQ4: 0, PV1: 0, PV2: 0, PV3: 0, PV4: 0
}

@Component({
  selector: 'app-po-plan',
  templateUrl: './po-plan.component.html',
  styleUrls: ['./po-plan.component.scss']
})
export class PoPlanComponent implements OnInit, OnDestroy {

  tdate1: Date; tdate2: Date; myState: any;
  th: any;

  YearPlan: any; YearPlanTable: any;
  CoPOName = ['จัดซื้อปกติ', 'องค์การเภสัชกรรม', 'ซื้อร่วมจังหวัด', 'ซื้อร่วมเขต', 'ซื้อร่วมกระทรวง'];
  QuaterText = ['', '', '', ''];

  sizeSubscript: Subscription;
  innerWidthSize: number; innerHeightSize: number;
  paginatorSize = 0;
  contextItems: MenuItem[];

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
    this.menuService.setTitle('4-13')
    this.th = this.xfunc.getLocale('th');
    this.dataService.getDrugCat()
    this.getStateYear()
    this.contextItems = [
      { label: 'รายละเอียด', icon: 'pi pi-info', command: (event) => this.onRowShowPdItem() }
    ];
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
    if (size >= 1184) {
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
    if (this.showReport === 1 && !this.displayPoPlanData.length) {
      return false
    }
    if (this.showReport === 2 && !this.displayPoCatPlanData.length) {
      return false
    }
    if (this.showReport === 3 && !this.displayPoCoPlanData.length) {
      return false
    }
    return true
  }

  getStateYear() {
    this.dataService.getMyState().then(() => {
      const query = { field: 'DISTINCT [PYear]+2543 AS YearID', table: 'POAnnualPlan', order: '[PYear]+2543 DESC' };
      this.dataService.getData(query).subscribe((result: any) => {
        if (result.length > 0) {
          this.YearPlan = result[0].YearID;
          this.YearPlanTable = [];
          result.forEach(item => { this.YearPlanTable.push({ label: item.YearID, value: item.YearID }); });
          this.setFilterDate();
          this.setQuaterMonthText();
        }
      });
    })
  }

  setFilterDate() {
    if (this.dataService.myState) {
      this.tdate1 = new Date(); this.tdate2 = new Date();
      this.tdate1.setDate(1); this.tdate1.setMonth(this.dataService.myState.MyEndMonth); this.tdate1.setFullYear(this.YearPlan - 544);
      this.tdate2.setDate(1); this.tdate2.setMonth(this.dataService.myState.MyEndMonth - 1); this.tdate2.setFullYear(this.YearPlan - 543);
    }
  }

  setQuaterMonthText() {
    if (this.dataService.myState) {
      for (let i = 0; i < 4; i++) {
        let m1 = this.dataService.myState.MyEndMonth - (3 * i);
        if (m1 <= 0) { m1 = 12 + m1 };
        let m2 = this.dataService.myState.MyEndMonth - (3 * i) - 2;
        if (m2 <= 0) { m2 = 12 + m2 };
        this.QuaterText[3 - i] = this.th.monthNamesShort[m2 - 1] + '-' + this.th.monthNamesShort[m1 - 1];
      }
    }
  }

  DtCoPO = 99; CoPOSelect: any;
  CoPOTable = [{ CoPOID: 99, CoPOName: 'ทั้งหมด' }, { CoPOID: 0, CoPOName: 'จัดซื้อเอง' }, { CoPOID: 1, CoPOName: 'GPO' },
  { CoPOID: 2, CoPOName: 'ซื้อร่วม จว.' }, { CoPOID: 3, CoPOName: 'ซื้อร่วมเขต' }, { CoPOID: 4, CoPOName: 'ซื้อร่วม กสธ' }];

  DrugCat: any; DrugName: any; ActiveOnly = false;

  showReport = 1; yearChange = true;
  setFilter() {
    this.yearChange = false;
    this.hasPoPlanData = false;
    this.hasSumPoCoPlanData = false;
    this.hasSumPoCatPlanData = false;
    this.reportChange()
  }
  reportChange() {
    this.leftPanel2Show = false
    if (this.showReport === 1) {
      if (!this.PoPlanData.length && !this.yearChange) {
        this.getPoPlan()
      } else {
        this.paginatorSize = 0;
        if (this.displayPoPlanData.length > 50) { this.paginatorSize = 26 }
      }
    } else if (this.showReport === 2) {
      if (!this.sumPoCatPlanData.length && !this.yearChange) {
        this.getPoCatPlan()
      } else {
        this.paginatorSize = 0;
        if (this.displayPoCatPlanData.length > 50) { this.paginatorSize = 26 }
      }
    } else {
      if (!this.sumPoCoPlanData.length && !this.yearChange) {
        this.getPoCoPlan()
      } else {
        this.paginatorSize = 0;
        if (this.displayPoCoPlanData.length > 50) { this.paginatorSize = 26 }
      }
    }
  }

  PoPlanData = []; displayPoPlanData = []; sumPValue = 0; sumVTotal = 0; hasPoPlanData = true;
  getPoPlan() {
    this.myMsgService.showLoading();
    this.hasPoPlanData = true;
    this.centerReportService.getPOPlan(this.YearPlan).subscribe((data: any) => {
      this.displayPoPlanData = []
      if (data[0].length) {
        this.PoPlanData = data[0];
        this.PoPlanData.forEach(item => {
          item.ItemName = item.DrugName2 + ' (' + pbudget[item.PBudget] + ')';
        });
        this.filterPoPlan()
        this.sumRealPoCatPlan = data[1];
        this.setSumPoCatPlanData(data[0]);
      }
      this.paginatorSize = 0;
      if (this.displayPoPlanData.length > 50) { this.paginatorSize = 26 }
      this.hideSideBar(this.innerWidthSize)  
      this.myMsgService.clearLoading();
    });
  }
  filterPoPlan() {
    if (this.PoPlanData) {
      let criteria: any = {};
      if (this.DrugCat) { criteria.DrugCat = this.DrugCat };
      if (this.DrugName) { criteria.ItemName = this.DrugName };
      if (this.DtCoPO !== 99) { criteria.PBudget = this.DtCoPO };
      if (this.ActiveOnly) { criteria.NotActive = false };
      if (Object.keys(criteria).length === 0 && criteria.constructor === Object) {
        this.displayPoPlanData = this.PoPlanData;
      } else {
        this.displayPoPlanData = this.PoPlanData.filter(item => {
          for (var key in criteria) {
            if (key === 'ItemName') {
              if (item[key] === undefined || item[key].toLowerCase().indexOf(criteria[key].toLowerCase()) === -1) {
                return false;
              }
            } else {
              if (item[key] === undefined || item[key] != criteria[key]) return false;
            }
          }
          return true;
        })
      }
      this.sumPValue = 0; this.sumVTotal = 0
      this.displayPoPlanData.forEach(item => {
        this.sumPValue += item.PValue;
        this.sumVTotal += item.VTotal;
      });
    }
  }

  rowHasSelect: boolean; drugSelect: any; pdId = ''; displayPdItemDialog = false; showAppPD = false
  onDblClick(data) {
    this.drugSelect = data;
    this.onRowShowPdItem();
  }
  onRowShowPdItem() {
    this.pdId = this.drugSelect.PDrugID;
    this.showAppPD = true
    setTimeout(() => {
      this.displayPdItemDialog = true
    }, 300);
  }
  onPdDialogHide() {
    this.displayPdItemDialog = false
    this.showAppPD = false
  }

  sumPoCatPlanData = []; displayPoCatPlanData = []; hasSumPoCatPlanData = true; sumRealPoCatPlan: any;
  SumCatOfRQ0 = 0; SumCatOfRIN = 0; SumCatOfPOAmount = 0; SumCatOfInAmount = 0;
  SumCatOfPQ = [0,0,0,0]; SumCatOfPV = [0,0,0,0]; SumCatOfRQ = [0,0,0,0]; SumCatOfRV = [0,0,0,0];
  getPoCatPlan() {
    this.hasSumPoCatPlanData = true;
    this.hasPoPlanData = true;
    // this.setFilterDate();
    if (!this.PoPlanData) {
      this.myMsgService.showLoading();
      this.centerReportService.getPOPlan(this.YearPlan).subscribe((data: any) => {
        this.displayPoCatPlanData = []
        if (data[0].length) {
          this.PoPlanData = data[0];
          this.sumRealPoCatPlan = data[1];
          this.setSumPoCatPlanData(data[0]);
          this.PoPlanData.forEach(item => {
            item.ItemName = item.DrugName2 + ' (' + pbudget[item.PBudget] + ')';
          });
          this.filterPoPlan()
        }
        this.paginatorSize = 0;
        if (this.displayPoCatPlanData.length > 50) { this.paginatorSize = 26 }
        this.hideSideBar(this.innerWidthSize)    
        this.myMsgService.clearLoading();
      });
    }
  }
  setSumPoCatPlanData(data) {
    let sumPOCat = [], PoPlanData = JSON.parse(JSON.stringify(data));
    PoPlanData.sort((a, b) => {
      let nameA = a.DrugCat; let nameB = b.DrugCat;
      if (nameA < nameB) { return -1; };
      if (nameA > nameB) { return 1; };
      return 0;
    })
    if (PoPlanData.length > 0) {
      let cDrugCat = PoPlanData[0].DrugCat, row = Object.assign({}, blankdata);
      row.DrugCat = PoPlanData[0].DrugCat;
      PoPlanData.forEach(item => {
        if (cDrugCat !== item.DrugCat) {
          sumPOCat.push(row);
          cDrugCat = item.DrugCat;
          row = Object.assign({}, blankdata);
          row.DrugCat = item.DrugCat;
        }
        if (item.PAmount || item.YStockX) {
          if (item.PAmount - item.YStockX > 0) { row.POAmount += Math.round(item.PAmount - item.YStockX) * item.PPricePack };
          if (item.PQ1 > 0) { row.PQ1++; row.PV1 += item.PQ1Value; };
          if (item.PQ2 > 0) { row.PQ2++; row.PV2 += item.PQ2Value; };
          if (item.PQ3 > 0) { row.PQ3++; row.PV3 += item.PQ3Value; };
          if (item.PQ4 > 0) { row.PQ4++; row.PV4 += item.PQ4Value; };
          row.RQ0++;
        }
      })
      sumPOCat.push(row);
      if (this.sumRealPoCatPlan && this.sumRealPoCatPlan.length > 0) {
        this.sumRealPoCatPlan.forEach(item => {
          let found = sumPOCat.find(x => x.DrugCat === item.DrugCat);
          if (found) {
            for (let i = 1; i <= 4; i++){
              found['RQ' + i] = item['RQ' + i]; found['RV' + i] = item['RV' + i];
            }
          } else {
            row = Object.assign({}, blankdata);
            row.DrugCat = item.DrugCat;
            for (let i = 1; i <= 4; i++) {
              row['RQ' + i] = item['RQ' + i]; row['RV' + i] = item['RV' + i];
            }
            sumPOCat.push(row);
          }
        });
      }
      this.sumPoCatPlanData = sumPOCat;
      this.sumPoCatPlanData.sort((a, b) => {
        let valA = +a.DrugCat; let valB = +b.DrugCat;
        return valA - valB;
      })
      this.filterPoCatPlan();
    }
  }
  filterPoCatPlan() {
    if (this.sumPoCatPlanData.length) {
      const cDate1 = this.tdate1.getFullYear().toString().slice(-2) + ('0' + (this.tdate1.getMonth() + 1)).slice(-2);
      const cDate2 = this.tdate2.getFullYear().toString().slice(-2) + ('0' + (this.tdate2.getMonth() + 1)).slice(-2);
      let criteria = cDate1 + '/' + cDate2;
      this.centerReportService.getFilterPOCatPlan(criteria).subscribe((data: any) => {
        this.SumCatOfRQ0 = 0; this.SumCatOfRIN = 0; this.SumCatOfPOAmount = 0; this.SumCatOfInAmount = 0;
        for (let i = 0; i < 4; i++) {
          this.SumCatOfPQ[i] = 0; this.SumCatOfPV[i] = 0;
          this.SumCatOfRQ[i] = 0; this.SumCatOfRV[i] = 0;
        }
        if (data && data.length > 0) {
          data.forEach(item => {
            let found = this.sumPoCatPlanData.find(x => x.DrugCat === item.DrugCat);
            if (found) {
              found.RIN = item.RIN
              found.InAmount = item.InAmount
            } else {
              let row = Object.assign({}, blankdata);
              row.DrugCat = item.DrugCat;
              row.RIN = item.RIN
              row.InAmount = item.InAmount
              this.sumPoCatPlanData.push(row);
            }
          })
        }
        this.sumPoCatPlanData.forEach(item => {
          this.SumCatOfRQ0 += item.RQ0; this.SumCatOfRIN += item.RIN;
          this.SumCatOfPOAmount += item.POAmount; this.SumCatOfInAmount += item.InAmount;
          for (let i = 0; i < 4; i++) {
            this.SumCatOfPQ[i] += item['PQ' + (i + 1)];
            this.SumCatOfPV[i] += item['PV' + (i + 1)];
            this.SumCatOfRQ[i] += item['RQ' + (i + 1)];
            this.SumCatOfRV[i] += item['RV' + (i + 1)];
          }
        });
        this.displayPoCatPlanData = [...this.sumPoCatPlanData];
        this.myMsgService.clearLoading();
      });
    }
  }

  sumPoCoPlanData = []; displayPoCoPlanData = []; hasSumPoCoPlanData = true;
  SumOfRQ0 = 0; SumOfRIN = 0; SumOfPOAmount = 0; SumOfInAmount = 0;
  SumOfPQ = [0,0,0,0]; SumOfPV = [0,0,0,0]; SumOfRQ = [0,0,0,0]; SumOfRV = [0,0,0,0];
  getPoCoPlan() {
    this.myMsgService.showLoading();
    this.hasSumPoCoPlanData = true;
    // this.setFilterDate();
    this.centerReportService.getPOCoPlan(this.YearPlan).subscribe((data: any) => {
      if (data.length) {
        this.sumPoCoPlanData = data;
        this.filterPoCoPlan()
      }
    });
  }
  filterPoCoPlan() {
    if (this.sumPoCoPlanData.length) {
      const cDate1 = this.tdate1.getFullYear().toString().slice(-2) + ('0' + (this.tdate1.getMonth() + 1)).slice(-2);
      const cDate2 = this.tdate2.getFullYear().toString().slice(-2) + ('0' + (this.tdate2.getMonth() + 1)).slice(-2);
      let criteria = cDate1 + '/' + cDate2;
      this.centerReportService.getFilterPOCoPlan(criteria).subscribe((data: any) => {
        this.displayPoCoPlanData = []
        this.SumOfRQ0 = 0; this.SumOfRIN = 0; this.SumOfPOAmount = 0; this.SumOfInAmount = 0;
        for (let i = 0; i < 4; i++) {
          this.SumOfPQ[i] = 0; this.SumOfPV[i] = 0;
          this.SumOfRQ[i] = 0; this.SumOfRV[i] = 0;
        }
        if (data && data.length > 0) {
          data.forEach(item => {
            let found = this.sumPoCoPlanData.find(x => x.PBudget === item.PBudget);
            if (found) {
              found.RIN = item.RIN
              found.InAmount = item.InAmount
            } else {
              let row = Object.assign({}, blankdata);
              row.PBudget = item.PBudget;
              row.RIN = item.RIN
              row.InAmount = item.InAmount
              this.sumPoCoPlanData.push(row);
            }
          })
        }
        this.sumPoCoPlanData.forEach(item => {
          this.SumOfRQ0 += item.RQ0; this.SumOfRIN += item.RIN;
          this.SumOfPOAmount += item.POAmount; this.SumOfInAmount += item.InAmount;
          for (let i = 0; i < 4; i++) {
            this.SumOfPQ[i] += item['PQ' + (i + 1)];
            this.SumOfPV[i] += item['PV' + (i + 1)];
            this.SumOfRQ[i] += item['RQ' + (i + 1)];
            this.SumOfRV[i] += item['RV' + (i + 1)];
          }
        });
        this.displayPoCoPlanData = [...this.sumPoCoPlanData];
        this.paginatorSize = 0;
        if (this.displayPoCoPlanData.length > 50) { this.paginatorSize = 26 }
        this.hideSideBar(this.innerWidthSize)    
        this.myMsgService.clearLoading();
      });
    }
  }

  getMonthRangeText() {
    return ('0' + (this.tdate1.getMonth() + 1)).slice(-2) + '/' + this.tdate1.getFullYear().toString().slice(-2) + ' - ' +
      ('0' + (this.tdate2.getMonth() + 1)).slice(-2) + '/' + this.tdate2.getFullYear().toString().slice(-2);
  }

  getCatname(catId) {
    return this.dataService.DrugCatTable.find(x => x.value === catId).label;
  }

  scrollViewPort() {
    let viewport = 194;
    if (this.innerWidthSize <= 485) { viewport = 158 } //mobile width
    else if (this.innerWidthSize <= 575) { viewport = 158 }
    if (this.innerHeightSize >= 480) {
      return 'calc(calc(var(--vh, 1vh) * 100) - ' + (viewport + this.paginatorSize) + 'px)';
    } else {
      return '300px';
    }
  }

}
