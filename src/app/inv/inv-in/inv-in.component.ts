import { Component, OnInit, OnDestroy, ViewChild, HostListener, ElementRef } from '@angular/core';
import { GlobalService } from '../../service/global.service';
import { EventService } from '../../service/event.service';
import { DataService } from '../../service/data.service';
import { DepartService } from '../../service/depart.service';
import { MenuService } from '../../service/menu.service';
import { MyMsgService } from '../../service/msg.service';
import { FuncService } from '../../service/xfunc.service';
import { MenuItem } from 'primeng/api';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-inv-in',
  templateUrl: './inv-in.component.html',
  styleUrls: ['./inv-in.component.scss']
})
export class InvInComponent implements OnInit, OnDestroy {

  contextItems: MenuItem[];
  sizeSubscript: Subscription;
  departSubscript: Subscription;
  notiSubscript: Subscription;
  innerWidthSize: number; innerHeightSize: number;
  th: any;
  isDepartUser = this.globalService.user.depart !== 'center'

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
    this.menuService.setTitle('2-0')
    this.th = this.xfunc.getLocale('th');
    Promise.all([
      this.dataService.getDrugLists(),
      this.globalService.getSupplier(),
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
      this.globalService.getSupplier().then(() => {
        this.setBlankStInv()
        this.leftPanelStartData().then((result: any) => {
          this.myMsgService.clearLoading()
          this.notUpdateItems = result.filter(x => !x.update);
          this.todayItems = result.filter(x => x.update);
        })
      })
    });
    this.notiSubscript = this.eventService.notiClick$.subscribe((data: any) => {
      if (!this.StInv.StInvCust) this.StInv.StInvCust = 'center'
      if (!this.StInv.StInvDate) this.StInv.StInvDate = new Date()
      this.apprvInvSelect = {
        StInvID: data.id, StInvDate: data.inv_date, StInvRef: data.ref, StInvUpdate: data.update
      }
      this.displayApprvInv = true
    })
  }

  notUpdateItems = []; todayItems = [];
  leftPanelStartData() {
    return new Promise((resolve) => {
      this.departService.getTodayList(0).subscribe(result => {
        resolve(result)
      }, error => {
        resolve([])
      })
    })
  }

  ngOnDestroy(): void {
    this.sizeSubscript.unsubscribe()
    this.departSubscript.unsubscribe()
    this.notiSubscript.unsubscribe()
  }

  StInv: any; StInvSelect: any;
  StInvDetail: any[] = []; StInvDetailTotal = 0;

  isDirty = false;
  tdate1: Date;
  isNewInv = true

  leftPanelShow = false; leftPanel2Show = false; leftPanelCollapse = false;
  hideSideBar(size) {
    if (size >= 1024) {
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
    this.departService.getInvList(event.query, 0).subscribe((result: any) => {
      this.filteredResults = result;
    });
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
      StInvID: null, StInvDate: new Date(), StInvCust: null, SupplierName: null, StInvRef: null, StInvUpdate: false,
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
      this.ev = setTimeout(() => {
        this.departService.getInvId(id, 0).subscribe(([inv, detail]: any) => {
          if (inv.length) {
            if (isFromLeftPanel) {
              this.StInvSelect = { StInvID: inv[0].StInvID }
            }
            this.StInv = inv[0];
            this.StInv.SupplierName = this.globalService.supplierTable.find(x => x.value === this.StInv.StInvCust).label;
            this.tdate1 = this.xfunc.genDate(this.StInv.StInvDate);
            this.setContextMenu()
            // this.getStInvDetail()
            this.StInvDetailSelect = null
            detail.forEach(item => {
              const drug = this.dataService.drugLists.find(x => x.DrugID === item.DtDrugID);
              item.pd_name = drug.DrugNameText || '';
              item.pd_unit = drug.DrugUnit || '';
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
    this.isNewRow = false;
    this.pdDetail = { ...this.StInvDetailSelect }
    this.tExpDate = this.xfunc.genDate(this.pdDetail.DtExp)
    this.productSelect = { DrugID: this.pdDetail.DtDrugID, DrugNameText: this.pdDetail.pd_name, DrugPack: this.pdDetail.DtPack };
    this.checkDuplicate(this.pdDetail.DtDID, this.pdDetail.DtDrugID)
    this.displayDialog = true;
    setTimeout(() => {
      this.did.nativeElement.focus()
    }, 0);
  }
  onRowShowPdItem() {
    this.pdId = this.StInvDetailSelect.DtDrugID;
    this.showAppPD = true
    setTimeout(() => {
      this.displayPdItemDialog = true
    }, 300);
  }

  deleteItemDetail() {
    this.myMsgService.msgBox(`ต้องการที่จะลบ ${this.StInvDetailSelect.pd_name} ออกจากรายการับวัสดุใช่หรือไม่?`, 'ลบข้อมูล', 'warning', () => {
      let index = this.StInvDetail.findIndex(x => x.DtDID === this.StInvDetailSelect.DtDID);
      this.StInvDetail.splice(index, 1);
      this.setDetailTotal();
      this.isDirty = true
      this.StInvDetailSelect = null
    });
  }

  saveData() {
    this.StInv.StInvDate = this.xfunc.dateToText(this.tdate1)
    this.StInv.SupplierName = this.globalService.supplierTable.find(x => x.value === this.StInv.StInvCust).label;
    this.myMsgService.msgBox(`ต้องการที่จะบันทึกใบรับวัสดุ${this.StInv.StInvID ? 'เลขที่ ' + this.StInv.StInvID + ' ' : 'นี้'}ลงในฐานข้อมูลใช่หรือไม่?`, 'บันทึกข้อมูล', 'question', () => {
      this.myMsgService.showLoading();
      const data = {
        inv: this.StInv,
        detail: this.StInv.StInvUpdate ? [] : this.StInvDetail,
        update: false, isNewInv: this.isNewInv
      };
      this.departService.saveInv(data, 0).subscribe((result: any) => {
        if (result.err_code === 0) {
          this.isDirty = false
          this.isNewInv = false
          this.setInvId(result.invId)
          this.myMsgService.msgBox(result.message, 'บันทึกข้อมูล', 'info', null);
        } else {
          this.myMsgService.msgBox(result.message, '', 'error', null);
          this.setBlankStInv()
          this.StInvSelect = null    
        }
      })
    })
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
    this.StInv.SupplierName = this.globalService.supplierTable.find(x => x.value === this.StInv.StInvCust).label;
    this.myMsgService.msgBox(`ต้องการที่จะบันทึกและรับเข้าใบรับเลขที่ ${this.StInv.StInvID} ใช่หรือไม่?`, 'บันทึกและรับเข้า', 'question', () => {
      setTimeout(() => {
        this.myMsgService.msgBox(`ภายหลังจากการรับเข้าใบรับเลขที่ ${this.StInv.StInvID} แล้ว ใบรับนี้จะไม่สามารถแก้ไขได้<br>
         ต้องการที่จะรับวัสดุเข้าใช่หรือไม่?`, 'บันทึกและรับเข้า', 'warning', () => {
          this.myMsgService.showLoading();
          const data = {
            inv: this.StInv, detail: this.StInvDetail,
            update: true, isNewInv: this.isNewInv
          };
          this.departService.saveInv(data, 0).subscribe((result: any) => {
            if (result.err_code === 0) {
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
    this.myMsgService.msgBox(`ต้องการที่จะยกเลิกการรับวัสดุเลขที่ ${this.StInv.StInvID} ใช่หรือไม่?`, 'ยกเลิกการรับ', 'question', () => {
      setTimeout(() => {
        this.myMsgService.msgBox(`ยืนยันที่จะยกเลิกการรับใบรับวัสดุเลขที่ ${this.StInv.StInvID} นี้ใช่หรือไม่?`, 'ยืนยันการยกเลิก', 'warning', () => {
          this.myMsgService.showLoading();
          const data = { id: this.StInv.StInvID, inv_name: this.StInv.SupplierName }
          this.departService.cancelInv(data, 0).subscribe((result: any) => {
            let type = ''
            if (result.err_code === 1) {
              type = 'error'
            } else {
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
            }
            this.myMsgService.msgBox(result.message, 'ยกเลิกการรับ', type, null);
          })
        })
      }, 300);
    })
  }

  deleteData() {
    this.myMsgService.msgBox(`ต้องการที่จะลบใบรับวัสดุเลขที่ ${this.StInv.StInvID} ใช่หรือไม่?`, 'ลบใบรับวัสดุ', 'warning', () => {
      setTimeout(() => {
        this.myMsgService.msgBox(`ยืนยันที่จะลบใบรับวัสดุเลขที่ ${this.StInv.StInvID} นี้ใช่หรือไม่?`, 'ยืนยันการลบ', 'danger', () => {
          this.myMsgService.showLoading();
          this.departService.deleteInv(this.StInv.StInvID, 0).subscribe((result: any) => {
            this.setBlankStInv()
            this.StInvSelect = null
            this.oldId = ''
            this.myMsgService.msgBox(result.message, 'ลบใบรับวัสดุ', 'info', null);
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
  pdDetail: any; productSelect: any; isNewRow: boolean; tExpDate: Date;
  setBlankPdDetail() {
    this.pdDetail = {
      DtDID: this.xfunc.genUniqueID(), pd_name: null, pd_unit: null, 
      DtInvID: this.StInv.StInvID, DtDrugID: null, DtAmount: 1, DtPack: 1, DtPrice: 0,
      DtLot: null, DtExp: null, DtTNID: 0
    }
    this.tExpDate = null
    this.productSelect = null;
  }

  displayApprvInv = false
  apprvInvSelect: any; filteredApprvInvResults: any[];
  addFromApprvInv() {
    this.apprvInvSelect = null
    this.displayApprvInv = true
  }
  filterApprvInvResults(event) {
    this.globalService.getInvList(event.query, 'APInvoice', this.globalService.currentDepart).subscribe((result: any) => {
      this.filteredApprvInvResults = result;
    })
  }

  addApprvDetail() {
    this.myMsgService.msgBox(`ต้องการที่จะเพิ่มรายการจากใบนำส่งเลขที่ ${this.apprvInvSelect.StInvID} ใช่หรือไม่?`, 'เพิ่มรายการ', 'question', () => {
      this.displayApprvInv = false
      this.myMsgService.showLoading()
      this.globalService.getInvId(this.apprvInvSelect.StInvID, 'APInvoice').subscribe(([inv, detail]: any) => {
        if (inv.length) {
          let item = [];
          for (let i = 0; i < detail.length; i++){
            const dt = detail[i]
            const drug = this.dataService.drugLists.find(x => x.DrugID === dt.DtDrugID);
            item.push({
              DtDID: this.xfunc.genUniqueID(i * 10),
              DtInvID: this.StInv.StInvID, DtDrugID: dt.DtDrugID,
              pd_name: drug.DrugNameText || '', pd_unit: drug.DrugUnit || '',
              DtAmount: dt.DtAmount, DtPack: dt.DtPack,
              DtPrice: dt.DtPrice, DtLot: dt.DtLot,
              DtExp: this.xfunc.genDate(dt.DtExp), DtTNID: dt.DtTNID
            })
          }
          if (this.StInv.StInvRef) { this.StInv.StInvRef += ',' + this.apprvInvSelect.StInvID }
          else { this.StInv.StInvRef = this.apprvInvSelect.StInvID }
          if (this.StInv.StInvMemo) { this.StInv.StInvMemo += `,${this.apprvInvSelect.StInvID}` }
          else { this.StInv.StInvMemo = `จากใบนำส่ง ${this.apprvInvSelect.StInvID}` }
          this.StInvDetail = [...this.StInvDetail, ...item];
          this.setDetailTotal();
          this.isDirty = true
          // update ใบนำส่ง inv[0]
          if (!inv[0].StInvUpdate) {
            inv[0].depart_name = this.globalService.departTable.find(x => x.value === inv[0].StInvDepart).label;
            const data = {
              inv: inv[0], detail: [], update: true, isNewInv: false
            };
            this.globalService.saveInv(data, 'APInvoice').subscribe((result: any) => {
              if (result.err_code === 0) {
                this.myMsgService.msgBox(`โอนรายการจากใบนำส่ง ${this.apprvInvSelect.StInvID} เข้าใบรับวัสดุนี้เรียบร้อยแล้ว..`, 'โอนรายการ', 'info');
              } else {
                this.myMsgService.msgBox(result.message, '', 'error', null);
              }
            })
          } else {
            this.myMsgService.msgBox(`เพิ่มรายการจากใบนำส่ง ${this.apprvInvSelect.StInvID} เรียบร้อยแล้ว..`, 'เพิ่มรายการ', 'info')
          }
        }
      })
    })
  }

  addPdDetail() {
    this.setBlankPdDetail()
    this.isNewRow = true
    this.hasDup = false
    this.displayDialog = true
    setTimeout(() => {
      this.did.nativeElement.focus()
    }, 0);
  }

  filteredProductResults: any[];
  filterProductResults(event) {
    this.filteredProductResults = this.xfunc.filterList(event.query, this.dataService.drugLists, ['DrugID', 'DrugNameText', 'DrugGeneric', 'DrugGeneric2']);
  }
  selectProductItem() {
    this.globalService.getProduct(this.productSelect.DrugID, this.globalService.currentDepart)
    .subscribe((data: any) => {
      this.pdDetail.DtDrugID = this.productSelect.DrugID;
      this.pdDetail.pd_name = this.productSelect.DrugNameText;
      this.pdDetail.pd_unit = this.productSelect.DrugUnit;
      this.pdDetail.DtPack = this.productSelect.DrugPack;
      this.pdDetail.DtTNID = 0
      if (data.length) {
        this.pdDetail.DtPrice = data[0].DrugCost * this.pdDetail.DtPack
      }
      this.checkDuplicate(this.pdDetail.DtDID, this.pdDetail.DtDrugID)
    })
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

  saveDetail() {
    this.pdDetail.DtExp = this.xfunc.dateToText(this.tExpDate);
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
    else if (this.innerWidthSize <= 815) { viewport = 322 };
    if (this.innerHeightSize >= 480) {
      return 'calc(calc(var(--vh, 1vh) * 100) - ' + viewport + 'px)';
    } else {
      return 'calc(calc(var(--vh, 1vh) * 100) - 130px)';
    }
  }

}
