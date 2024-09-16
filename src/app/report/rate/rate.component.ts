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
  selector: 'app-rate',
  templateUrl: './rate.component.html',
  styleUrls: ['./rate.component.scss']
})
export class RateComponent implements OnInit {

  th: any;
  sizeSubscript: Subscription; departSubscript: Subscription;
  innerWidthSize: number; innerHeightSize: number;
  paginatorSize = 0;
  contextItems: MenuItem[];

  leftPanelShow = false; leftPanel2Show = false; leftPanelCollapse = false; isPopUp = false;

  data = []; dataSelect = []; dataTotal = 0;
  isUserDepart = this.globalService.user.depart !== 'center'

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
    this.menuService.setTitle('3-1')
    this.th = this.xfunc.getLocale('th');
    this.setUpPage()
    this.globalService.getStatus()
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
    this.data = []; this.dataSelect = []; this.dataTotal = 0; this.isReady = false;
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
      drugIdList: null, pd_min: true, below_max: false, below_rate: false,
      not_active: false, on_orderneed: null, in_stock: null
    }
  }

  resultData = []; drugSearch = ''; catId: string = null; groupId: string = null;

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
    this.reportService.rateReport({ query: this.query }).subscribe(([result, po]: any) => {
      this.paginatorSize = 0;
      let tempData = [];
      if (result.length) {
        result.forEach(item => {
          const drug = this.dataService.drugLists.find(x => x.DrugID === item.DrugID)
          if (this.query.not_active === null || drug.NotActive === this.query.not_active) {
            item.pd_name = drug.DrugNameText
            item.pd_unit = drug.DrugUnit
            item.DrugPack = drug.DrugPack
            item.SupplierName = this.globalService.supplierTable.find(x => x.value === item.DrugSupply)?.label || '';
            item.OutRateAvg = (item.Out3 + item.Out2) / 2
            item.EAmount = 1;
            item.OAmount = 1; item.OPack = item.DrugPack;
            if (item.DrugMax > item.DrugStock) {
              item.EAmount = this.roundEst(item.DrugMax, item.DrugStock, item.DrugPack);
              let OAmount = (item.DrugMax - item.DrugStock) / item.DrugPack;
              item.OAmount = this.roundOrder(OAmount);
            }
            item.INPO = po.includes(item.DrugID);
            tempData.push(item)
          }
        })
      }
      if (tempData.length > 50) { this.paginatorSize = 26 }
      this.resultData = tempData
      this.showINPO()
      this.hideSideBar(this.innerWidthSize)
      this.myMsgService.clearLoading()
    })
  }

  selectData: any; pdId = ''; displayPdItemDialog = false; showAppPD = false
  onDblClick(data) {
    // get row select from dblclick
    this.selectData = data
    this.onRowShowPdItem();
  }
  onRowShowPdItem() {
    this.pdId = this.selectData.DrugID;
    this.showAppPD = true
    setTimeout(() => {
      this.displayPdItemDialog = true
    }, 300);
  }

  inPO = null
  showINPO() {
    if (this.inPO) {
      this.data = this.resultData.filter(x => x.INPO);
    } else {
      if (this.inPO === false) {
        this.data = this.resultData.filter(x => !x.INPO);
      } else {
        this.data = this.resultData
      }
    }
  }
  onPdDialogHide() {
    this.displayPdItemDialog = false
    this.showAppPD = false
  }

  updateSelect(event) {
    this.selectData.DrugMin = event.DrugMin
    this.selectData.DrugMax = event.DrugMax
    this.selectData.OrderNeed = event.OrderNeed
    if (this.selectData.DrugMax > this.selectData.DrugStock) {
      this.selectData.EAmount = this.roundEst(this.selectData.DrugMax, this.selectData.DrugStock, this.selectData.DrugPack);
    }
  }

  getThMonth(mnt) { return this.xfunc.getThMonth(mnt) }

  roundEst(DrugMax, DrugStock, DrugPack) {
    let DAmount = Math.round((DrugMax - DrugStock) / DrugPack);
    if (DAmount > 0) { return DAmount } else { return 1 };
  }

  roundOrder(NAmount) {
    let nOrder = 1, nResult = 1;
    if (NAmount > 1) {
      for (let i = 4; i >= 0; i--) {
        nOrder = Math.floor(NAmount / (10 ** i))
        if (nOrder >= 1) {
          let nMod = Math.floor(NAmount) % (10 ** i)
          if (i > 0) {
            nResult = (nOrder * (10 ** i))
            if (nMod >= (8 * (10 ** (i - 1)))) {
              nResult = nResult + (10 ** i)
            } else if (nMod >= (3 * (10 ** (i - 1)))) {
              nResult = nResult + ((10 ** i) / 2)
            }
            if (nOrder === 9) {
              nResult = Math.round(nResult / (10 ** i)) * (10 ** i)
            }
          } else {
            nResult = Math.round(NAmount)
          }
          break
        }
      }
    }
    return nResult
  }

  displayDialog = false; StInvRef: string; StInvMemo: string; StInvStatus: number;
  openDialog() {
    this.StInvRef = null; this.StInvMemo = 'สร้างจากอัตราการเบิก'; this.StInvStatus = null;
    this.displayDialog = true;
  }
  createRQ() {
    this.myMsgService.msgBox(`ต้องการที่จะสร้างใบขอเบิกจากข้อมูลนี้ใช่หรือไม่?`, 'สร้างใบขอเบิก', 'question', () => {
      setTimeout(() => {
        this.myMsgService.msgBox(`ยืนยันที่จะสร้างใบขอเบิกจากข้อมูลนี้ใช่หรือไม่?`, 'ยืนยันสร้างใบขอเบิก', 'question', () => {
          this.myMsgService.showLoading();
          let StInv = {
            StInvID: null, StInvDate: new Date(), StInvDepart: this.globalService.currentDepart,
            depart_name: this.globalService.departTable.find(x => x.value === this.globalService.currentDepart).label,
            StInvRef: this.StInvRef, StInvUpdate: false, StInvDateUpdate: null,
            StKeyUser: this.globalService.user.user_name, StInvStatus: this.StInvStatus,
            StInvMemo: this.StInvMemo, StKeyApprove: null
          }
          let detail = []
          for (let i = 0; i < this.dataSelect.length; i++) {
            const dt = this.dataSelect[i]
            detail.push({
              DtDID: this.xfunc.genUniqueID(i * 10),
              DtInvID: null,
              DtDrugID: dt.DrugID,
              DtRQAmount: dt.OAmount * dt.OPack,
              DtAmount: 0, DtPack: dt.OPack,
              DtPrice: dt.DrugCostUpdate * dt.OPack,
              DtMonthBefore: dt.Out2,
              DtMonth: dt.Out1,
              DtStockNow: dt.DrugStock,
              DtRemark: null
            })
          }
          const data = {
            inv: StInv, detail: detail, update: false, isNewInv: true, line_noti: true
          };
          this.globalService.saveInv(data, 'RQInvoice').subscribe((result: any) => {
            if (result.err_code === 0) {
              this.myMsgService.msgBox(`ได้ทำการสร้างใบขอเบิกเลขที่ ${result.invId} เรียบร้อยแล้ว`, 'สร้างใบขอเบิก', 'info', null);
              this.dataSelect.forEach(item => {
                item.INPO = true
              })
              this.showINPO()
              this.dataSelect = []
              this.displayDialog = false;
            } else {
              this.myMsgService.msgBox(result.message, '', 'error', null);
            }
          })
        })
      }, 300);
    })

  }

  scrollViewPort() {
    let viewport = 182;
    if (this.innerWidthSize <= 485) { viewport = 147 } //mobile width
    else if (this.innerWidthSize <= 575) { viewport = 165 }
    else if (this.innerWidthSize <= 915) { viewport = 200 };
    if (this.innerHeightSize >= 480) {
      return 'calc(calc(var(--vh, 1vh) * 100) - ' + (viewport + this.paginatorSize) + 'px)';
    } else {
      return '300px';
    }
  }

}
