import { Component, OnInit } from '@angular/core';
import { GlobalService } from '../../service/global.service';
import { EventService } from '../../service/event.service';
import { DataService } from '../../service/data.service';
import { CenterReportService } from '../../service/center-report.service';
import { MenuService } from '../../service/menu.service';
import { MyMsgService } from '../../service/msg.service';
import { FuncService } from '../../service/xfunc.service';
import { SelectItem } from 'primeng/api';
import { Subscription } from 'rxjs';
import { MenuItem } from 'primeng/api';

@Component({
  selector: 'app-drug-rate',
  templateUrl: './drug-rate.component.html',
  styleUrls: ['./drug-rate.component.scss']
})
export class DrugRateComponent implements OnInit {

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
    this.menuService.setTitle('4-4')
    this.dataService.getDrugCat()
    this.dataService.getDrugGroup()
    this.dataService.getSupplier();
    this.dataService.getDrugType();
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
      if (!this.drugRateTable.length) {
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

  drugRateData = [];
  drugRateTable = [];
  drugItemsSelect = [];

  DrugID: string; DrugName: string;
  DrugCat: any; DrugGroup: any; DrugManu: any; DrugSupply: any;
  DrugType: any; CoPO: any; showINPO: boolean;

  RateState = "[DrugMin]"; RateStateSelect = { rateState: "[DrugMin]", rateName: "จุดต่ำสุด" };
  stockOper = "<";
  stockOperTable: SelectItem[] = [{ label: '<', value: '<' }, { label: '=', value: '=' }, { label: '>', value: '>' }];
  stockState: SelectItem[] = [{ value: "0", label: "0" }, { value: "[Out2]", label: "ยอดเบิกเดือนที่แล้ว" },
    { value: "[Out1]", label: "ยอดเบิกเดือนนี้" }, { value: "[OutRateAvg]", label: "ยอดเบิกเฉลี่ย" },
    { value: "[DrugMin]", label: "จุดต่ำสุด" }, { value: "[DrugMax]", label: "จุดสูงสุด" }];

  SetPOMask = 1;
  SetPOMaskTable: SelectItem[] = [{ label: 'รวมรายการที่สั่งซื้อแล้ว', value: 1 }, { label: 'ไม่รวมที่สั่งซื้อแล้ว', value: 2 }, { label: 'แสดงให้เห็น', value: 3 }];
  
  OrderNeedOpt = true; AllList = true; ShowManu = 2;

  setFilter() {
    this.drugItemsSelect = [];
    // this.drugRateTable = [];
    let criteria = '';
    if (this.DrugID) { criteria += "[DrugID] Like '" + this.DrugID + "%' And " };
    if (this.DrugName) { criteria += "[DrugName] Like '" + this.DrugName + "%' And " };
    if (this.CoPO || this.CoPO === 0) { criteria += "[CoPO] = " + this.CoPO + " And " };
    if (this.DrugType) { criteria += "[DrugType] = '" + this.DrugType + "' And " };
    if (this.DrugCat) { criteria += "[DrugCat] = '" + this.DrugCat + "' And " };
    if (this.DrugGroup) { criteria += "[DrugGroup] = '" + this.DrugGroup + "' And " };
    if (this.DrugManu) { criteria += "[DrugManu] = '" + this.DrugManu + "' And " };
    if (this.DrugSupply) { criteria += "[DrugSupply] = '" + this.DrugSupply + "' And " };
    if (this.RateState) { criteria += "[DrugStock] " + this.stockOper + " " + this.RateState + " And " };
    if (this.AllList) { criteria += "True" } else { criteria += "[NotActive] = No" };
    if (this.OrderNeedOpt) { criteria += " Or [OrderNeed] = True" };

    let payload = { criteria: criteria };
    this.myMsgService.showLoading();
    this.centerReportService.getDrugRate(payload).subscribe((data: any) => {
      this.paginatorSize = 0;
      this.drugRateData = data;
      if (data.length) {
        this.drugRateData.forEach(item => {
          item.EAmount = 1;
          item.OAmount = 1; item.OPack = item.DrugPack;
          if (item.DrugMax > item.DrugStock) {
            item.EAmount = this.roundEst(item.DrugMax, item.DrugStock, item.DrugPack);
            let OAmount = (item.DrugMax - item.DrugStock) / item.DrugPack;
            item.OAmount = this.roundOrder(OAmount);
          }
        });
      }
      this.setPoMask();
      if (data.length > 50) { this.paginatorSize = 26 }
      this.myMsgService.clearLoading();
    });
  }

  // if(Me.SetPOMask <> 2, "", "[INPO] = True And ") & _
  setPoMask() {
    // if (this.SetPOMask === 3) { this.showINPO = true } else { this.showINPO = false };
    if (this.SetPOMask === 2) {
      this.drugRateTable = this.drugRateData.filter(el => el.INPO === -1);
    } else {
      this.drugRateTable = [...this.drugRateData];
    }
    this.hideSideBar(this.innerWidthSize)
    // this.myMsgService.clearLoading();
  }
  
  getINPOColor(INPO) {
    if (this.SetPOMask === 3) {
      if (INPO === 0) { return true };
    }
    return false;
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
  onPdDialogHide() {
    this.displayPdItemDialog = false
    this.showAppPD = false
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

  createPO() {
    if (this.drugItemsSelect && this.drugItemsSelect.length > 0) {
      let catSelect = this.drugItemsSelect[0].DrugCat;
      for (let i = 0; i < this.drugItemsSelect.length; i++){
        if (catSelect !== this.drugItemsSelect[i].DrugCat) {
          this.myMsgService.msgBox('รายการวัสดุที่ถูกเลือกมีมากกว่า 1 หมวด กรุณาเลือกรายการวัสดุใหม่...', '', 'error', null);
          return;
        }
      }
      if (this.DrugSupply) {
        this.StInvCust = this.DrugSupply;
      } else {
        if (this.ShowManu == 1) {
          this.StInvCust = this.drugItemsSelect[0].DrugManu;
        } else {
          this.StInvCust = this.drugItemsSelect[0].DrugSupply;
        }
      }
      // this.StInvCustSelect = this.SupplierPOTable.filter(v => v.SupplierID === this.StInvCust)[0];
      this.PONo = '';
      this.genPO().then((po: string) => {
        if (po) { this.PONo = po; this.displayDialog = true; }
      }).catch(error => { });
    }
  }

  genPO() {
    return new Promise((resolve, reject) => {
      const query = this.xfunc.maxBillQuery('POInvoice', 'PO')
      this.dataService.getData(query).subscribe((result: any) => {
        let billRun = 0
        if (result.length) { billRun = result[0].BillRun }
        resolve(this.xfunc.getBillRun(billRun, 'PO'))
      }, error => { reject(error) });
    })
  }

  displayDialog = false;
  PONo: string;
  StInvCust: string;
  // StInvCustSelect: any;
  savePO() {
    const query = { field: 'StInvID', table: 'POInvoice', where: '[StInvID] = "' + this.PONo + '"' };
    this.dataService.getData(query).subscribe((result: any) => {
      if (result.length > 0) {
        if (result[0].StInvID) {
          this.genPO().then((po: string) => {
            if (po) { this.PONo = po; }
          }).catch(error => { });
          this.myMsgService.msgBox('เลขที่นี้เคยถูกใช้เป็นเลขที่ใบสั่งซื้อแล้ว', 'เลขที่ซ้ำ', 'error', null);
        }
      } else {
        this.myMsgService.msgBox('ต้องการที่จะสร้างใบสั่งซื้อเลขที่ ' + this.PONo + ' ใช่หรือไม่?', 'สร้างใบสั่งซื้อ', 'question', () => {
          this.displayDialog = false;
          const POInv = {
            PONo: this.PONo,
            StInvCust: this.StInvCust,
            catName: this.dataService.DrugCatTable.find(el => el.value === this.drugItemsSelect[0].DrugCat).label
          }
          const data = { POInv: POInv, insertData: this.drugItemsSelect, user: this.globalService.user.user_name };
          this.myMsgService.showLoading();
          this.centerReportService.insertPO(data).subscribe((result: any) => {
            this.drugItemsSelect.forEach(item => {
              let found = this.drugRateData.find(el => el.DrugID === item.DrugID);
              if (found) { found.INPO = 0 };
            });
            this.myMsgService.clearLoading();
            this.myMsgService.msgBox(result.message + ' ต้องการยกเลิกรายการที่สร้างใบสั่งซื้อไปแล้วหรือไม่?', 'บันทึกข้อมูล', 'question', () => {
              this.drugItemsSelect = [];
            });
            if (this.SetPOMask === 2) { this.setPoMask() };
            // need to set hasPO
          })
        })
      }
    });
  }

}
