import { Component, OnInit, OnDestroy, ViewChild, HostListener, ElementRef } from '@angular/core';
import { GlobalService } from '../../service/global.service';
import { EventService } from '../../service/event.service';
import { DataService } from '../../service/data.service';
import { DepartService } from '../../service/depart.service';
import { MenuService } from '../../service/menu.service';
import { MyMsgService } from '../../service/msg.service';
import { FuncService } from '../../service/xfunc.service';
import { MenuItem, SelectItem } from 'primeng/api';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-inv-out',
  templateUrl: './inv-out.component.html',
  styleUrls: ['./inv-out.component.scss']
})
export class InvOutComponent implements OnInit, OnDestroy {

  contextItems: MenuItem[];
  sizeSubscript: Subscription;
  departSubscript: Subscription;
  innerWidthSize: number; innerHeightSize: number;
  th: any;
  isDepartUser = this.globalService.user.depart !== 'center'
  autoSave = false;

  @ViewChild('did') did: ElementRef;
  @ViewChild('addDetail') addDetail: ElementRef;
  @HostListener('document:keydown.f4')
  addPdDetailKeyDown() {
    if (!this.addDetail.nativeElement.disabled && !this.displayDialog) {
      this.addPdDetail()
    }
  }

  constructor(
    public globalService: GlobalService,
    private eventService: EventService,
    private dataService: DataService,
    private departService: DepartService,
    private menuService: MenuService,
    private myMsgService: MyMsgService,
    private xfunc: FuncService
  ) { }

  ngOnInit(): void {
    this.menuService.setTitle('2-1')
    this.th = this.xfunc.getLocale('th');
    this.autoSave = this.globalService.departs.find(x => x.depart_id === this.globalService.user.depart).depart_autosave;
    Promise.all([
      this.dataService.getDrugLists(),
      this.globalService.getCustomer(),
      this.globalService.getStatus(),
      this.leftPanelStartData()
    ])
    .then((result: any) => {
      this.notUpdateItems = result[3].filter(x => !x.update);
      this.todayItems = result[3].filter(x => x.update);
    })
    this.setBlankStInv()
    this.sizeSubscript = this.eventService.windowsSize$.subscribe((size) => {
      this.hideSideBar(size)
      this.innerHeightSize = window.innerHeight
      this.innerWidthSize = size
    })
    this.departSubscript = this.eventService.departChange$.subscribe(() => {
      this.myMsgService.showLoading()
      this.globalService.getCustomer().then(() => {
        this.setBlankStInv()
        this.leftPanelStartData().then((result: any) => {
          this.myMsgService.clearLoading()
          this.notUpdateItems = result.filter(x => !x.update);
          this.todayItems = result.filter(x => x.update);
        })
      })
    });
  }

  notUpdateItems = []; todayItems = [];
  leftPanelStartData() {
    return new Promise((resolve) => {
      this.departService.getTodayList(1).subscribe(result => {
        resolve(result)
      }, error => {
        resolve([])
      })
    })
  }

  ngOnDestroy(): void {
    this.sizeSubscript.unsubscribe()
    this.departSubscript.unsubscribe()
    clearTimeout(this.setTimeSave)
  }

  StInv: any; StInvSelect: any;
  StInvDetail: any[] = []; StInvDetailTotal = 0;

  isDirty = false;
  tdate1: Date;
  isNewInv = true

  leftPanelShow = false; leftPanel2Show = false; leftPanelCollapse = false;
  hideSideBar(size) {
    if (size >= 1074) {
      this.leftPanelCollapse = false
      this.leftPanelShow = true
      this.leftPanel2Show = false
    } else {
      this.leftPanelCollapse = true
      this.leftPanelShow = false
    }
  }
  filteredResults: any[];
  filterResults(event) {
    this.departService.getInvList(event.query, 1).subscribe((result: any) => {
      this.filteredResults = result;
    })
  }

  setContextMenu() {
    this.contextItems = [
      { label: 'รายละเอียด', icon: 'pi pi-info', command: (event) => this.onRowShowPdItem() },
      { label: 'แก้ไขข้อมูล', icon: 'pi pi-pencil', visible: !this.StInv.StInvUpdate && this.isDepartUser, command: (event) => this.onRowSelect() },
      {
        label: 'ลบข้อมูล', icon: 'pi pi-times',
        visible: !this.StInv.StInvUpdate && this.isDepartUser && this.globalService.user.role !== 99,
        command: (event) => this.deleteItemDetail()
      }
    ];
  }

  setBlankStInv() {
    this.StInv = {
      StInvID: null, StInvDate: new Date(), StInvCust: null, CustName: null, StInvRef: null, StInvUpdate: false,
      StInvDateUpdate: null, StKeyUser: this.globalService.user.user_name, StInvStatus: null, StInvMemo: null
    }
    this.tdate1 = this.xfunc.genDate(this.StInv.StInvDate);
    this.StInvDetail = []
    this.setContextMenu()
    this.isDirty = false
    this.isNewInv = true
    this.oldId = ''
    this.StInvSelect = null
  }

  selectFromLeftPanel(event) {
    this.getStInvId(event, true)
    this.leftPanel2Show = false
  }

  selectItem() {
    let StInvID = '';
    if (this.StInvSelect) {
      if (typeof this.StInvSelect === 'object') {
        StInvID = this.StInvSelect.StInvID
        this.getStInvId(StInvID, false)
      } 
    } else {
      this.setBlankStInv()
    }
  }

  oldId = ''; ev: any;
  getStInvId(id, isFromLeftPanel) {
    if (this.oldId !== id) {
      this.oldId = id
      clearTimeout(this.ev)
      clearTimeout(this.setTimeSave)
      this.ev = setTimeout(() => {
        this.departService.getInvId(id, 1).subscribe(([inv, detail]: any) => {
          if (inv.length) {
            if (isFromLeftPanel) {
              this.StInvSelect = { StInvID: inv[0].StInvID }
            }
            this.StInv = inv[0];
            this.StInv.CustName = this.globalService.customerTable.find(x => x.value === this.StInv.StInvCust).label;
            this.tdate1 = this.xfunc.genDate(this.StInv.StInvDate);
            this.setContextMenu()
            // this.getStInvDetail()
            this.StInvDetailSelect = null
            detail.forEach(item => {
              const drug = this.dataService.drugLists.find(x => x.DrugID === item.DtDrugID);
              item.pd_name = drug.DrugNameText || '';
              item.pd_unit = drug.DrugUnit || '';
              if (!item.DtLotID) { item.DtLot = '-ไม่ระบุ Lot-' }
              if (!item.DtLot) { item.DtLot = '-xxxx-' }
            });
            this.StInvDetail = detail;
            this.setDetailTotal();
            this.isDirty = false
            this.isNewInv = false
          } else {
            this.setBlankStInv()
          }
        })
      }, 300);
    }
  }

  setDetailTotal() {
    let total = 0;
    for (let i = 0; i < this.StInvDetail.length; i++) {
      total += this.StInvDetail[i].DtAmount * this.StInvDetail[i].DtPrice;
    };
    this.StInvDetailTotal = total;
  }

  rowHasSelect: boolean; StInvDetailSelect: any; pdId = ''; displayPdItemDialog = false; showAppPD = false
  selectRow(event) {
    this.rowHasSelect = true
    this.StInvDetailSelect = event.data
  }
  onDblClick(event) {
    // get row select from dblclick
    if (!this.rowHasSelect) { event.target.click() };
    this.onRowShowPdItem();
  }
  onRowSelect() {
    this.globalService.getPdWithLot(this.StInvDetailSelect.DtDrugID).subscribe(([drug, lot]: any) => {
      if (drug.length) {
        this.isNewRow = false;
        this.setBlankPdDetail()
        this.pdDetail = { ...this.StInvDetailSelect }
        this.pdDetail.costUpdate = this.pdDetail.DtPrice / this.pdDetail.DtPack
        this.drug = drug[0]
        this.checkDuplicate(this.pdDetail.DtDID, this.pdDetail.DtDrugID)
        this.setPdLot(lot)
        if (lot) {
          const found = this.pdLotList.find(x => {
            if (x.value) {
              return x.value.DrugLotID === this.pdDetail.DtLotID
            }
            return false
          });
          this.pdLotSelect = found ? found.value : null
        }
        this.productSelect = { DrugID: this.pdDetail.DtDrugID, DrugNameText: this.pdDetail.pd_name, DrugPack: this.pdDetail.DtPack };
        this.displayDialog = true;
        setTimeout(() => {
          this.did.nativeElement.focus()
        }, 0);
      } else {
        this.myMsgService.msgBox('ไม่มีคงคลังของวัสดุนี้', '', 'error', null);
      }
    })
  }
  onRowShowPdItem() {
    this.pdId = this.StInvDetailSelect.DtDrugID;
    this.showAppPD = true
    setTimeout(() => {
      this.displayPdItemDialog = true
    }, 300);
  }

  deleteItemDetail() {
    this.myMsgService.msgBox(`ต้องการที่จะลบ ${this.StInvDetailSelect.pd_name} ออกจากรายกาเบิกวัสดุใช่หรือไม่?`, 'ลบข้อมูล', 'warning', () => {
      let index = this.StInvDetail.findIndex(x => x.DtDID === this.StInvDetailSelect.DtDID);
      this.StInvDetail.splice(index, 1);
      this.setDetailTotal();
      this.isDirty = true
      this.StInvDetailSelect = null
      if (this.autoSave) {
        clearTimeout(this.setTimeSave)
        if (this.StInvDetail.length) {
          this.setTimeSave = setTimeout(() => {
            this.saveData(false)
          }, 60000);
        }
      }
    });
  }

  saveData(verbose = true) {
    const saveRec = () => {
      this.myMsgService.showLoading();
      clearTimeout(this.setTimeSave)
      const data = {
        inv: this.StInv,
        detail: this.StInv.StInvUpdate ? [] : this.StInvDetail,
        update: false, isNewInv: this.isNewInv
      };
      this.departService.saveInv(data, 1).subscribe((result: any) => {
        if (result.err_code === 0) {
          this.isDirty = false
          this.isNewInv = false
          this.setInvId(result.invId)
          if (verbose) { this.myMsgService.msgBox(result.message, 'บันทึกข้อมูล', 'info', null) }
          else { this.myMsgService.clearLoading() };
        } else {
          this.myMsgService.msgBox(result.message, '', 'error', null);
          this.setBlankStInv()
          this.StInvSelect = null    
        }
      })
    }
    this.StInv.StInvDate = this.xfunc.dateToText(this.tdate1)
    this.StInv.CustName = this.globalService.customerTable.find(x => x.value === this.StInv.StInvCust).label;
    if (verbose) {
      this.myMsgService.msgBox(`ต้องการที่จะบันทึกใบเบิกวัสดุ${this.StInv.StInvID ? 'เลขที่ ' + this.StInv.StInvID + ' ' : 'นี้'}ลงในฐานข้อมูลใช่หรือไม่?`, 'บันทึกข้อมูล', 'question', saveRec)
    } else {
      saveRec()
    }
  }
  setInvId(id) {
    if (!this.StInv.StInvID) {
      this.StInv.StInvID = id
      this.StInvDetail.forEach(item => {
        item.DtInvID = id
      })
    };
    if (!this.StInvSelect) { this.StInvSelect = { StInvID: id } };
  }

  saveAndUpdate() {
    this.StInv.StInvDate = this.xfunc.dateToText(this.tdate1)
    this.StInv.CustName = this.globalService.customerTable.find(x => x.value === this.StInv.StInvCust).label;
    this.myMsgService.msgBox(`ต้องการที่จะบันทึกและเบิกจ่ายใบเบิกเลขที่ ${this.StInv.StInvID} ใช่หรือไม่?`, 'บันทึกและเบิกออก', 'question', () => {
      setTimeout(() => {
        this.myMsgService.msgBox(`ภายหลังจากการเบิกจ่ายใบเบิกเลขที่ ${this.StInv.StInvID} แล้ว ใบเบิกนี้จะไม่สามารถแก้ไขได้<br>
         ต้องการที่จะเบิกวัสดุออกใช่หรือไม่?`, 'บันทึกและเบิกออก', 'warning', () => {
          this.myMsgService.showLoading();
          clearTimeout(this.setTimeSave)
          const data = {
            inv: this.StInv, detail: this.StInvDetail,
            update: true, isNewInv: this.isNewInv
          };
          this.departService.saveInv(data, 1).subscribe((result: any) => {
            if (result.err_code === 0) {
              if (result.otDetail.length) {
                result.otDetail.forEach(item => {
                  if (!item.DtLotID) { item.DtLot = '-ไม่ระบุ Lot-' }
                  if (!item.DtLot) { item.DtLot = '-xxxx-' }
                });
                this.StInvDetail = result.otDetail;
                this.setDetailTotal();
              }
              this.isDirty = false
              this.isNewInv = false
              this.StInv.StInvUpdate = true
              this.StInv.StInvDateUpdate = new Date()
              this.setContextMenu()
              this.myMsgService.msgBox(result.message, 'บันทึกข้อมูล', 'info', null);
            } else {
              this.myMsgService.msgBox(result.message, '', 'error', null);
              this.setBlankStInv()
              this.StInvSelect = null    
            }
          })
        })
      }, 300);
    })
  }

  cancelUpdate() {
    this.myMsgService.msgBox(`ต้องการที่จะยกเลิกการเบิกวัสดุเลขที่ ${this.StInv.StInvID} ใช่หรือไม่?`, 'ยกเลิกการเบิก', 'question', () => {
      setTimeout(() => {
        this.myMsgService.msgBox(`ยืนยันที่จะยกเลิกการเบิกใบเบิกวัสดุเลขที่ ${this.StInv.StInvID} นี้ใช่หรือไม่?`, 'ยืนยันการยกเลิก', 'warning', () => {
          this.myMsgService.showLoading();
          const data = { id: this.StInv.StInvID, inv_name: this.StInv.CustName }
          this.departService.cancelInv(data, 1).subscribe((result: any) => {
            let type = ''
            if (result.err_code >= 3) {
              type = 'error'
              this.setBlankStInv()
              this.StInvSelect = null
            } else {
              if (result.err_code === 0) {
                type = 'info'
              } else {
                type = 'error'
              }
              this.StInv.StInvUpdate = false
              this.StInv.StInvDateUpdate = null
              this.setContextMenu()
            }
            this.myMsgService.msgBox(result.message, 'ยกเลิกการเบิก', type, null);
          })
        })
      }, 300);
    })
  }

  deleteData() {
    this.myMsgService.msgBox(`ต้องการที่จะลบใบเบิกวัสดุเลขที่ ${this.StInv.StInvID} ใช่หรือไม่?`, 'ลบใบเบิกวัสดุ', 'warning', () => {
      setTimeout(() => {
        this.myMsgService.msgBox(`ยืนยันที่จะลบใบเบิกวัสดุเลขที่ ${this.StInv.StInvID} นี้ใช่หรือไม่?`, 'ยืนยันการลบ', 'danger', () => {
          this.myMsgService.showLoading();
          clearTimeout(this.setTimeSave)
          this.departService.deleteInv(this.StInv.StInvID, 1).subscribe((result: any) => {
            this.setBlankStInv()
            this.StInvSelect = null
            this.oldId = ''
            this.myMsgService.msgBox(result.message, 'ลบใบเบิกวัสดุ', 'info', null);
          })
        })
      }, 300)
    })
  }

  printData() {
    this.globalService.isPrint = true;
    setTimeout(() => {
      window.print()
    }, 300);
  }

  isExp(date) {
    return this.xfunc.colorExp(date);
  }

  trackByFn(index, item) { return item.DtDID }

  displayDialog = false;
  pdDetail: any; productSelect: any; isNewRow: boolean;
  setBlankPdDetail() {
    this.pdDetail = {
      DtDID: this.xfunc.genUniqueID(), DtLotID: 0, pd_name: null, pd_unit: null, costUpdate: 0,
      DtInvID: this.StInv.StInvID, DtDrugID: null, DtAmount: 0, DtPack: 0, DtPrice: 0,
      DtStock: 0, DtRemain: 0, DtLot: '-ไม่ระบุ Lot-', DtExp: null, DtTNID: 0
    }
    this.productSelect = null; this.hasDup = false; this.dupAmount = 0;
  }

  addPdDetail() {
    this.setBlankPdDetail()
    this.isNewRow = true
    this.pdLotList = []
    this.pdLotSelect = null
    this.hasDup = false
    this.displayDialog = true
    setTimeout(() => {
      this.did.nativeElement.focus()
    }, 0);
  }

  drug: any;  pdLotList: SelectItem[]; pdLotSelect: any;
  filteredProductResults: any[];
  filterProductResults(event) {
    this.filteredProductResults = this.xfunc.filterList(event.query, this.dataService.drugLists, ['DrugID', 'DrugNameText', 'DrugGeneric', 'DrugGeneric2']);
  }
  selectProductItem() {
    this.globalService.getPdWithLot(this.productSelect.DrugID).subscribe(([drug, lot]: any) => {
      if (drug.length) {
        this.pdDetail.DtDrugID = this.productSelect.DrugID;
        this.pdDetail.pd_name = this.productSelect.DrugNameText;
        this.pdDetail.pd_unit = this.productSelect.DrugUnit;
        this.pdDetail.DtLotID = 0
        this.drug = drug[0]
        this.pdDetail.costUpdate = this.drug.DrugCost
        this.pdDetail.DtStock = this.drug.DrugStock
        this.pdDetail.DtRemain = this.drug.DrugStock
        this.pdDetail.DtAmount = 1
        this.pdDetail.DtPack = this.productSelect.DrugPack;
        this.pdDetail.DtPrice = this.drug.DrugCost * this.productSelect.DrugPack
        this.checkDuplicate(this.pdDetail.DtDID, this.pdDetail.DtDrugID)
        this.setPdLot(lot)
      } else {
        this.myMsgService.msgBox('ไม่มีคงคลังของวัสดุนี้', '', 'error', null);
        this.setBlankPdDetail()
      }
    })
  }

  setPdLot(lot) {
    this.pdLotList = [{ value: 0, label: '-- ไม่ระบุ Lot --' }]
    lot.forEach(el => {
      this.pdLotList.push({ value: el, label: el.DrugDLot ? el.DrugDLot : '-xxxx-' })
    })
  }

  setLot(lot) {
    let amount = this.pdDetail.DtAmount, pack = this.pdDetail.DtPack;
    this.pdDetail.DtAmount = 0;
    this.pdDetail.DtPack = 0;
    setTimeout(() => { // force DtAmount & DtPack [max] validator to recalculate
      if (lot) {
        this.pdDetail.DtLotID = lot.DrugLotID
        this.pdDetail.DtAmount = Math.ceil(amount * pack / lot.DrugDPack)
        this.pdDetail.DtPack = lot.DrugDPack;
        this.pdDetail.DtPrice = lot.DrugDCost
        this.pdDetail.costUpdate = lot.DrugDCost / lot.DrugDPack
        this.pdDetail.DtStock = lot.DrugDStock
        this.pdDetail.DtLot = lot.DrugDLot ? lot.DrugDLot : '-xxxx-'
        this.pdDetail.DtExp = this.xfunc.genDate(lot.DrugDExp)
        this.pdDetail.DtTNID = lot.DrugTNID
      } else {
        this.pdDetail.DtLotID = 0
        this.pdDetail.DtAmount = Math.ceil(amount * pack / this.productSelect.DrugPack)
        this.pdDetail.DtPack = this.productSelect.DrugPack;
        this.pdDetail.DtPrice = this.drug.DrugCost * this.productSelect.DrugPack
        this.pdDetail.costUpdate = this.drug.DrugCost
        this.pdDetail.DtStock = this.drug.DrugStock
        this.pdDetail.DtLot = '-ไม่ระบุ Lot-'
        this.pdDetail.DtExp = this.xfunc.genDate(this.drug.DrugExp)
        this.pdDetail.DtTNID = 0
      }
    }, 0);
  }

  hasDup = false; dupAmount = 0;
  checkDuplicate(dtDID, pdId) {
    this.hasDup = false; this.dupAmount = 0;
    const dubList = this.StInvDetail.filter(x => x.DtDrugID === pdId && x.DtDID !== dtDID);
    if (dubList.length) {
      this.hasDup = true
      this.dupAmount = dubList.reduce((sum, cur) => sum += cur.DtAmount * cur.DtPack, 0);
    }
  }
  get maxAmount() {
    const validAmount = this.drug?.DrugStock - this.dupAmount;
    if (validAmount <= 0) return 0;
    if (this.pdDetail.DtLotID && validAmount > this.pdDetail.DtStock) return this.pdDetail.DtStock;
    return validAmount;
  }

  dtAmountChange() { // tigger max validate
    const temp = this.pdDetail.DtPack
    this.pdDetail.DtPack = 0
    setTimeout(() => { this.pdDetail.DtPack = temp }, 0);
  }

  dtPackChange() {
    this.pdDetail.DtPrice = this.pdDetail.costUpdate * this.pdDetail.DtPack
    const temp = this.pdDetail.DtAmount
    this.pdDetail.DtAmount = 0
    setTimeout(() => { this.pdDetail.DtAmount = temp }, 0); // tigger max validate
  }

  setTimeSave: any;
  saveDetail() {
    let StInvDetailTemp = [...this.StInvDetail];
    if (this.isNewRow) {
      StInvDetailTemp.push(this.pdDetail);
    } else {
      const index = this.StInvDetail.findIndex(x => x.DtDID === this.pdDetail.DtDID);
      StInvDetailTemp[index] = this.pdDetail;
    };
    this.isDirty = true
    this.StInvDetail = StInvDetailTemp;
    this.rowHasSelect = false
    this.StInvDetailSelect = null
    this.setDetailTotal();
    this.pdDetail = null;
    this.displayDialog = false;
    if (this.autoSave) {
      clearTimeout(this.setTimeSave)
      this.setTimeSave = setTimeout(() => {
        this.saveData(false)
      }, 60000);
    }
  }

  onPdDialogHide() {
    this.displayPdItemDialog = false
    this.showAppPD = false
  }

  scrollViewPort() {
    let viewport = 304;
    if (this.innerWidthSize <= 485) { viewport = 130 }
    else if (this.innerWidthSize <= 575) { viewport = 390 }
    // else if (this.innerWidthSize <= 767) { viewport = 427 }
    else if (this.innerWidthSize <= 865) { viewport = 322 };
    if (this.innerHeightSize >= 480) {
      return 'calc(calc(var(--vh, 1vh) * 100) - ' + viewport + 'px)';
    } else {
      return 'calc(calc(var(--vh, 1vh) * 100) - 130px)';
    }
  }

}
