import { Component, OnInit, OnDestroy, ViewChild, HostListener, ElementRef } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { GlobalService } from '../../service/global.service';
import { EventService } from '../../service/event.service';
import { DataService } from '../../service/data.service';
import { DepartService } from '../../service/depart.service';
import { MenuService } from '../../service/menu.service';
import { MyMsgService } from '../../service/msg.service';
import { FuncService } from '../../service/xfunc.service';
import { MenuItem, SelectItem } from 'primeng/api';
import { Subscription, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';

@Component({
  selector: 'app-product-apprv',
  templateUrl: './product-apprv.component.html',
  styleUrls: ['./product-apprv.component.scss']
})
export class ProductApprvComponent implements OnInit, OnDestroy {

  contextItems: MenuItem[];
  sizeSubscript: Subscription;
  departSubscript: Subscription;
  routeSubscript: Subscription;
  innerWidthSize: number; innerHeightSize: number;

  userDepart = this.globalService.user.depart === 'center' ? null : this.globalService.user.depart;
  get workDepart() { return this.globalService.currentDepart === 'center' ? null : this.globalService.currentDepart }

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
    private route: ActivatedRoute,
    private myMsgService: MyMsgService,
    private xfunc: FuncService) { }

  ngOnInit() {
    this.menuService.setTitle('0-1')
    this.th = this.xfunc.getLocale('th');
    if (this.userDepart) this.globalService.getSupplier()
    Promise.all([
      this.dataService.getDrugLists(),
      this.globalService.getStatus(),
      this.leftPanelStartData()
    ])
    .then((result: any) => {
      this.routeSubscript = this.route.paramMap.pipe(
        switchMap(params => { return of(params.get('id')) })
      ).subscribe((id) => {
        if (id) this.getStInvId(id, true)
      })
      this.notUpdateItems = result[2].filter(x => !x.update);
      this.todayItems = result[2].filter(x => x.update);
    })
    this.setBlankStInv()
    this.sizeSubscript = this.eventService.windowsSize$.subscribe((size) => {
      this.hideSideBar(size)
      this.innerHeightSize = window.innerHeight
      this.innerWidthSize = size
    })
    this.departSubscript = this.eventService.departChange$.subscribe(() => {
      this.myMsgService.showLoading()
      this.leftPanelStartData().then((result: any) => {
        this.myMsgService.clearLoading()
        this.setBlankStInv()
        this.notUpdateItems = result.filter(x => !x.update);
        this.todayItems = result.filter(x => x.update);
      })
    });
  }

  notUpdateItems = []; todayItems = [];
  leftPanelStartData() {
    return new Promise((resolve) => {
      this.globalService.getTodayList('APInvoice', this.workDepart)
      .subscribe(result => {
        resolve(result)
      }, error => {
        resolve([])
      })
    })
  }

  ngOnDestroy(): void {
    this.sizeSubscript.unsubscribe()
    this.departSubscript.unsubscribe()
    this.routeSubscript.unsubscribe()
  }

  StInv: any; StInvSelect: any;
  StInvDetail: any[] = []; StInvDetailTotal = 0;
  
  th: any; isDirty = false;
  tdate1: Date;
  isNewInv = true; isApprove = false
  
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
    this.globalService.getInvList(event.query, 'APInvoice', this.workDepart).subscribe((result: any) => {
      this.filteredResults = result;
    })
  }

  setContextMenu() {
    this.contextItems = [
      { label: 'รายละเอียด', icon: 'pi pi-info', command: (event) => this.onRowShowPdItem() },
      { label: 'แก้ไขข้อมูล', icon: 'pi pi-pencil', visible: !this.StInv.StInvUpdate && !this.userDepart, command: (event) => this.onRowSelect() },
      { label: 'หมายเหตุ', icon: 'pi pi-star-o', command: (event) => this.onRemarkSelect() },
      {
        label: 'ลบข้อมูล', icon: 'pi pi-times',
        visible: !this.StInv.StInvUpdate && !this.userDepart && this.globalService.user.role !== 99,
        command: (event) => this.deleteItemDetail()
      }
    ];
  }

  setBlankStInv() {
    this.StInv = {
      StInvID: null, StInvDate: new Date(), StInvDepart: this.workDepart, depart_name: null, StInvRef: null, StInvUpdate: false,
      StInvDateUpdate: null, StKeyUser: this.globalService.user.user_name, StInvStatus: null, StInvMemo: null, StInvApprove: false
    }
    this.tdate1 = this.xfunc.genDate(this.StInv.StInvDate);
    this.StInvDetail = []
    this.setContextMenu()
    this.isDirty = false
    this.isNewInv = true
    this.isApprove = false
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
        this.globalService.getInvId(id, 'APInvoice').subscribe(([inv, detail]: any) => {
          if (inv.length) {
            if (isFromLeftPanel) {
              this.StInvSelect = { StInvID: inv[0].StInvID }
            }
            this.StInv = inv[0];
            this.StInv.depart_name = this.globalService.departTable.find(x => x.value === this.StInv.StInvDepart).label;
            this.tdate1 = this.xfunc.genDate(this.StInv.StInvDate);
            this.isApprove = this.StInv.StInvApprove ? true : false;
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
    this.pdDetail.costUpdate = this.pdDetail.DtPrice / this.pdDetail.DtPack
    this.dataService.getDrugLot(this.StInvDetailSelect.DtDrugID).subscribe(([drug, lot]: any) => {
      this.drug = drug
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
    })
    this.productSelect = { DrugID: this.pdDetail.DtDrugID, DrugNameText: this.pdDetail.pd_name, DrugPack: this.pdDetail.DtPack };
    this.checkDuplicate(this.pdDetail.DtDID, this.pdDetail.DtDrugID)
    this.displayDialog = true;
    setTimeout(() => {
      this.did.nativeElement.focus()
    }, 0);
  }
  displayRemarkDialog = false; remarkEditFromCM = false; remark: string;
  onRemarkSelect() {
    this.isNewRow = false;
    this.pdDetail = { ...this.StInvDetailSelect }
    this.remark = this.pdDetail.DtRemark
    this.remarkEditFromCM = true
    this.displayRemarkDialog = true
  }
  onRowShowPdItem() {
    this.pdId = this.StInvDetailSelect.DtDrugID;
    this.showAppPD = true
    setTimeout(() => {
      this.displayPdItemDialog = true
    }, 300);
  }

  deleteItemDetail() {
    this.myMsgService.msgBox(`ต้องการที่จะลบ ${this.StInvDetailSelect.pd_name} ออกจากรายกานำส่งใช่หรือไม่?`, 'ลบข้อมูล', 'warning', () => {
      let index = this.StInvDetail.findIndex(x => x.DtDID === this.StInvDetailSelect.DtDID);
      this.StInvDetail.splice(index, 1);
      this.setDetailTotal();
      this.isDirty = true
      this.StInvDetailSelect = null
    });
  }

  saveData() {
    this.StInv.StInvDate = this.xfunc.dateToText(this.tdate1)
    this.StInv.depart_name = this.globalService.departTable.find(x => x.value === this.StInv.StInvDepart).label;
    this.myMsgService.msgBox(`ต้องการที่จะบันทึกใบนำส่ง${this.StInv.StInvID ? 'เลขที่ ' + this.StInv.StInvID + ' ' : 'นี้'}ลงในฐานข้อมูลใช่หรือไม่?`, 'บันทึกข้อมูล', 'question', () => {
      this.myMsgService.showLoading();
      const data = {
        inv: this.StInv,
        detail: this.StInv.StInvUpdate ? [] : this.StInvDetail,
        update: false, isNewInv: this.isNewInv,
        line_noti: !this.isApprove && this.StInv.StInvApprove
      };
      this.globalService.saveInv(data, 'APInvoice').subscribe((result: any) => {
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
    if (!this.userDepart) return;
    this.StInv.StInvDate = this.xfunc.dateToText(this.tdate1)
    this.StInv.depart_name = this.globalService.departTable.find(x => x.value === this.StInv.StInvDepart).label;
    this.myMsgService.msgBox(`ต้องการที่จะโอนใบนำส่งเลขที่ ${this.StInv.StInvID} เป็นใบรับวัสดุใช่หรือไม่?`, 'โอนเป็นใบรับวัสดุ', 'question', () => {
      setTimeout(() => {
        this.myMsgService.msgBox(`ใบนำส่งเลขที่ ${this.StInv.StInvID} จะโอนเป็นใบรับวัสดุของ ${this.StInv.depart_name}<br>
        ต้องการที่จะโอนใบนำส่งนี้เป็นใบรับวัสดุใช่หรือไม่?`, 'โอนเป็นใบรับวัสดุ', 'warning', () => {
          this.myMsgService.showLoading();
          const inv = {
            StInvID: null, StInvDate: new Date(), StInvCust: 'center',
            SupplierName: this.globalService.supplierTable.find(x => x.value === 'center').label,
            StInvRef: this.StInv.StInvID, StInvUpdate: false,
            StInvDateUpdate: null, StKeyUser: this.globalService.user.user_name, StInvStatus: null,
            StInvMemo: `สร้างจากใบนำส่ง ${this.StInv.StInvID}`
          }
          let detail = [...this.StInvDetail]
          for (let i = 0; i < detail.length; i++) {
            detail[i].DtDID = this.xfunc.genUniqueID(i * 10)
          }
          const stdata = {
            inv: inv, detail: detail, update: false, isNewInv: true
          }
          this.departService.saveInv(stdata, 0, this.StInv.StInvDepart).subscribe((rc: any) => {
            const data = {
              inv: this.StInv, detail: this.StInvDetail,
              update: true, isNewInv: this.isNewInv, line_noti: false
            };
            this.globalService.saveInv(data, 'APInvoice').subscribe((result: any) => {
              if (result.err_code === 0) {
                this.isDirty = false
                this.isNewInv = false
                this.StInv.StInvUpdate = true
                this.StInv.StInvDateUpdate = new Date()
                this.StInv.StInvApprove = true
                this.setContextMenu()
                this.myMsgService.msgBox(result.message + `<br>และโอนเข้าใบรับวัสดุเลขที่ ${rc.invId} เรียบร้อยแล้ว`, 'โอนเป็นใบรับวัสดุ', 'info', null);
              } else {
                this.myMsgService.msgBox(result.message, '', 'error', null);
                this.setBlankStInv()
                this.StInvSelect = null  
              }
            })
          })
        })
      }, 300)
    })
  }

  cancelUpdate() {
    this.myMsgService.msgBox(`ต้องการที่จะยกเลิกการโอนใบนำส่งเลขที่ ${this.StInv.StInvID} ใช่หรือไม่?`, 'ยกเลิกการโอน', 'question', () => {
      setTimeout(() => {
        this.myMsgService.msgBox(`ยืนยันที่จะยกเลิกการโอนใบนำส่งเลขที่ ${this.StInv.StInvID} นี้ใช่หรือไม่?`, 'ยืนยันการยกเลิก', 'warning', () => {
          this.myMsgService.showLoading();
          const data = { id: this.StInv.StInvID, depart_name: this.StInv.depart_name }
          this.globalService.cancelInv(data, 'APInvoice').subscribe((result: any) => {
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
              this.StInv.StKeyUser = this.globalService.user.user_name
              this.setContextMenu()
            }
            this.myMsgService.msgBox(result.message, 'ยกเลิกการโอน', type, null);
          })
        })
      }, 300);
    })
  }

  deleteData() {
    this.myMsgService.msgBox(`ต้องการที่จะลบใบนำส่งเลขที่ ${this.StInv.StInvID} ใช่หรือไม่?`, 'ลบใบนำส่ง', 'warning', () => {
      setTimeout(() => {
        this.myMsgService.msgBox(`ยืนยันที่จะลบใบนำส่งเลขที่ ${this.StInv.StInvID} นี้ใช่หรือไม่?`, 'ยืนยันการลบ', 'danger', () => {
          this.myMsgService.showLoading();
          this.globalService.deleteInv(this.StInv.StInvID, 'APInvoice').subscribe((result: any) => {
            this.setBlankStInv()
            this.StInvSelect = null
            this.oldId = ''
            this.myMsgService.msgBox(result.message, 'ลบใบนำส่ง', 'info', null);
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

  displayDialog = false; displayOtList = false
  pdDetail: any; productSelect: any; isNewRow: boolean; drug: any;
  pdLotList: SelectItem[]; pdLotSelect: any;
  setBlankPdDetail() {
    this.pdDetail = {
      DtDID: this.xfunc.genUniqueID(), DtLotID: 0, pd_name: null, pd_unit: null, costUpdate: 0,
      DtInvID: this.StInv.StInvID, DtDrugID: null, DtAmount: 1, DtPack: 1, DtPrice: 0,
      DtLot: null, DtExp: null, DtTNID: 0, DtRemark: null
    }
    this.productSelect = null;
    this.pdLotList = []
  }

  displayOtInv = false
  otInvSelect: any; filteredOtInvResults: any[];
  addFromOtInv() {
    this.otInvSelect = null
    this.displayOtInv = true
  }
  filterOtInvResults(event) {
    const query = {
      field: 'TOP 20 StInvID, StInvDate, StInvCust, StInvRef',
      table: 'OutInvoice',
      where: `StInvCust = '${this.StInv.StInvDepart}' AND StInvUpdate = True AND (StInvID Like '${event.query}%' OR StInvRef Like '${event.query}%')`,
      order: 'StInvDate DESC'
    }
    this.dataService.getData(query).subscribe((result: any) => {
      this.filteredOtInvResults = result
    })
  }

  addOtDetail() {
    this.myMsgService.msgBox(`ต้องการที่จะเพิ่มรายการจากใบเบิกเลขที่ ${this.otInvSelect.StInvID} ใช่หรือไม่?`, 'เพิ่มรายการ', 'question', () => {
      const query = {
        field: 'OutInvoiceDetail.*',
        table: 'OutInvoiceDetail',
        where: `OutInvoiceDetail.DtInvID = '${this.otInvSelect.StInvID}'`
      }
      this.displayOtInv = false
      this.myMsgService.showLoading()
      this.dataService.getData(query).subscribe((result: any) => {
        let item = [];
        for (let i = 0; i < result.length; i++){
          const dt = result[i]
          const drug = this.dataService.drugLists.find(x => x.DrugID === dt.DtDrugID);
          item.push({
            DtDID: this.xfunc.genUniqueID(i * 10),
            DtLotID: dt.DtLotID,
            DtInvID: this.StInv.StInvID,
            DtDrugID: dt.DtDrugID,
            pd_name: drug.DrugNameText || '',
            pd_unit: drug.DrugUnit || '',
            DtAmount: dt.DtAmount,
            DtPack: dt.DtPack,
            DtPrice: dt.DtPrice,
            DtLot: dt.DtLot,
            DtExp: this.xfunc.genDate(dt.DtExp),
            DtTNID: dt.DtTNID,
            DtRemark: null
          })
        }
        if (this.StInv.StInvRef) { this.StInv.StInvRef += ',' + this.otInvSelect.StInvRef }
        else { this.StInv.StInvRef = this.otInvSelect.StInvRef }
        if (this.StInv.StInvMemo) { this.StInv.StInvMemo += `,${this.otInvSelect.StInvID}` }
        else { this.StInv.StInvMemo = `จากใบเบิก ${this.otInvSelect.StInvID}` }
        this.StInvDetail = [...this.StInvDetail, ...item];
        this.setDetailTotal();
        this.isDirty = true
        this.myMsgService.msgBox(`เพิ่มรายการจากใบเบิก ${this.otInvSelect.StInvID} เรียบร้อยแล้ว..`, 'เพิ่มรายการ', 'info')
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
    this.dataService.getDrugLot(this.productSelect.DrugID).subscribe(([drug, lot]: any) => {
      this.drug = drug
      this.pdDetail.DtDrugID = this.productSelect.DrugID;
      this.pdDetail.pd_name = this.productSelect.DrugNameText;
      this.pdDetail.pd_unit = this.productSelect.DrugUnit;
      this.pdDetail.DtPack = this.productSelect.DrugPack;
      this.pdDetail.DtAmount = 1
      this.pdDetail.DtLotID = 0
      if (drug) {
        this.pdDetail.DtPrice = drug.DrugCost * this.pdDetail.DtPack
        this.pdDetail.costUpdate = drug.DrugCost
        this.pdDetail.DtLot = ''
        this.pdDetail.DtExp = this.xfunc.genDate(drug.DrugExp)
        this.pdDetail.DtTNID = 0
        this.setPdLot(lot)
      } else {
        this.myMsgService.msgBox('ไม่พบข้อมูล', '', 'error', null);
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

  setPdLot(lot) {
    this.pdLotList = [{ value: 0, label: '-- ไม่ระบุ Lot --' }]
    lot.forEach(el => {
      this.pdLotList.push({ value: el, label: el.DrugDLot ? el.DrugDLot : '-ไม่มีเลข Lot-' })
    })
  }

  setLot(lot) {
    if (lot) {
      this.pdDetail.DtLotID = lot.DrugLotID
      this.pdDetail.DtAmount = Math.ceil(this.pdDetail.DtAmount * this.pdDetail.DtPack / lot.DrugDPack)
      this.pdDetail.DtPack = lot.DrugDPack;
      this.pdDetail.DtPrice = lot.DrugDCost
      this.pdDetail.costUpdate = lot.DrugDCost / lot.DrugDPack
      this.pdDetail.DtLot = lot.DrugDLot
      this.pdDetail.DtExp = this.xfunc.genDate(lot.DrugDExp)
      this.pdDetail.DtTNID = lot.DrugTNID
    } else {
      this.pdDetail.DtLotID = 0
      this.pdDetail.DtAmount = Math.ceil(this.pdDetail.DtAmount * this.pdDetail.DtPack / this.productSelect.DrugPack)
      this.pdDetail.DtPack = this.productSelect.DrugPack;
      this.pdDetail.DtPrice = this.drug.DrugCost * this.productSelect.DrugPack
      this.pdDetail.costUpdate = this.drug.DrugCost
      this.pdDetail.DtLot = ''
      this.pdDetail.DtExp = this.xfunc.genDate(this.drug.DrugExp)
      this.pdDetail.DtTNID = 0
    }
  }

  editDtRemark() {
    this.remark = this.pdDetail.DtRemark
    this.remarkEditFromCM = false
    this.displayRemarkDialog = true
  }

  dtPackChange() {
    this.pdDetail.DtPrice = this.pdDetail.costUpdate * this.pdDetail.DtPack
  }

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
  }

  saveRemark() {
    this.pdDetail.DtRemark = this.remark
    this.displayRemarkDialog = false
    if (this.remarkEditFromCM) {
      this.saveDetail()
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
    else if (this.innerWidthSize <= 767) { viewport = 372 }
    else if (this.innerWidthSize <= 815) { viewport = 320 };
    if (this.innerHeightSize >= 480) {
      return 'calc(calc(var(--vh, 1vh) * 100) - ' + viewport + 'px)';
    } else {
      return 'calc(calc(var(--vh, 1vh) * 100) - 130px)';
    }
  }

}
