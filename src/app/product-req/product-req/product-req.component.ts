import { Component, OnInit, OnDestroy, ViewChild, HostListener, ElementRef } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { GlobalService } from '../../service/global.service';
import { EventService } from '../../service/event.service';
import { DataService } from '../../service/data.service';
import { MenuService } from '../../service/menu.service';
import { MyMsgService } from '../../service/msg.service';
import { FuncService } from '../../service/xfunc.service';
import { MenuItem } from 'primeng/api';
import { Subscription, forkJoin, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { OverlayPanel } from 'primeng/overlaypanel';

@Component({
  selector: 'app-req',
  templateUrl: './product-req.component.html',
  styleUrls: ['./product-req.component.scss']
})
export class ProductReqComponent implements OnInit, OnDestroy {

  contextItems: MenuItem[];
  sizeSubscript: Subscription;
  departSubscript: Subscription;
  routeSubscript: Subscription;
  innerWidthSize: number; innerHeightSize: number;
  autoSave = false;

  // implement close OverlayPanel when off and comeback to screen
  @ViewChild('op') op: OverlayPanel;
  @ViewChild('rght') rght: ElementRef;
  @ViewChild('did') did: ElementRef;
  @ViewChild('addDetail') addDetail: ElementRef;

  @HostListener('window:blur')
  hideOpPanel() {
    this.rght.nativeElement.focus()
    this.op.hide()
  }
  @HostListener('document:keydown.f4')
  addPdDetailKeyDown() {
    if (!this.addDetail.nativeElement.disabled && !this.displayDialog) {
      this.addPdDetail()
    }
  }
  
  userDepart = this.globalService.user.depart === 'center' ? null : this.globalService.user.depart;
  get workDepart() { return this.globalService.currentDepart === 'center' ? null : this.globalService.currentDepart }

  constructor(
    public globalService: GlobalService,
    private eventService: EventService,
    private dataService: DataService,
    private menuService: MenuService,
    private route: ActivatedRoute,
    private myMsgService: MyMsgService,
    private xfunc: FuncService) { }

  ngOnInit() {
    this.menuService.setTitle('0-0')
    this.th = this.xfunc.getLocale('th');
    this.autoSave = this.globalService.departs.find(x => x.depart_id === this.globalService.user.depart).depart_autosave;
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
      this.globalService.getTodayList('RQInvoice', this.workDepart)
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
    clearTimeout(this.setTimeSave)
  }

  StInv: any; StInvSelect: any;
  StInvDetail: any[] = []; StInvDetailTotal = 0; StInvRQDetailTotal = 0;
  
  th: any; isDirty = false;
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
    this.globalService.getInvList(event.query, 'RQInvoice', this.workDepart).subscribe((result: any) => {
      this.filteredResults = result;
    })
  }

  setContextMenu() {
    this.contextItems = [
      { label: 'รายละเอียด', icon: 'pi pi-info', command: (event) => this.onRowShowPdItem() },
      { label: 'แก้ไขข้อมูล', icon: 'pi pi-pencil', visible: !this.StInv.StInvUpdate, command: (event) => this.onRowSelect() },
      { label: 'หมายเหตุ', icon: 'pi pi-star-o', command: (event) => this.onRemarkSelect() },
      { label: 'ลบข้อมูล', icon: 'pi pi-times', visible: !this.StInv.StInvUpdate && this.globalService.user.role !== 99, command: (event) => this.deleteItemDetail() }
    ];
  }

  setBlankStInv() {
    this.StInv = {
      StInvID: null, StInvDate: new Date(), StInvDepart: this.workDepart, depart_name: null, StInvRef: null, StInvUpdate: false,
      StInvDateUpdate: null, StKeyUser: this.globalService.user.user_name, StInvStatus: null, StInvMemo: null, StKeyApprove: null
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
        this.globalService.getInvId(id, 'RQInvoice').subscribe(([inv, detail]: any) => {
          this.allStatCenter = []
          if (inv.length) {
            if (isFromLeftPanel) {
              this.StInvSelect = { StInvID: inv[0].StInvID }
            }
            this.StInv = inv[0];
            this.StInv.depart_name = this.globalService.departTable.find(x => x.value === this.StInv.StInvDepart).label;
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
    let total = 0, rqTotal = 0;
    for (let i = 0; i < this.StInvDetail.length; i++) {
      rqTotal += this.StInvDetail[i].DtRQAmount / this.StInvDetail[i].DtPack * this.StInvDetail[i].DtPrice;
      total += this.StInvDetail[i].DtAmount * this.StInvDetail[i].DtPrice;
    };
    this.StInvDetailTotal = total; this.StInvRQDetailTotal = rqTotal;
  }

  getThMonth(mnt) { return this.xfunc.getThMonth(mnt, new Date(this.StInv.StInvDate)) }

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
    this.pdDetail.rqAmount = Math.round(this.pdDetail.DtRQAmount / this.pdDetail.DtPack * 100) / 100
    this.pdDetail.costUpdate = this.pdDetail.DtPrice / this.pdDetail.DtPack
    this.productSelect = { DrugID: this.pdDetail.DtDrugID, DrugNameText: this.pdDetail.pd_name };
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

  allStatCenter = [];
  autoFillDtAmount() {
    this.myMsgService.msgBox(`ต้องการที่จะระบุจำนวนอนุมัติเบิกอัตโนมัติโดยโปรแกรม ใช่หรือไม่?`, 'อนุมัติขอเบิกอัตโนมัติ', 'question', () => {
      setTimeout(() => {
        this.myMsgService.msgBox(`ยืนยันที่จะให้โปรแกรมคำนวณจำนวนอนุมัติในใบขอเบิกเลขที่ ${this.StInv.StInvID} นี้ให้ ใช่หรือไม่?`, 'ยืนยันการคำนวณ', 'warning', () => {
          this.myMsgService.showLoading();
          const data = this.StInvDetail.map(x => x.DtDrugID);
          forkJoin([
            this.dataService.getOtAmount({ data: data }),
            this.globalService.getAutoRQAmount({invid: this.StInv.StInvID, data: data })
          ]).subscribe(([ot, apvSum]: any) => {
            this.allStatCenter = ot
            this.StInvDetail.forEach(dt => {
              let apprv = 0;
              const found = apvSum.find(x => x.DtDrugID === dt.DtDrugID);
              if (found) { apprv = found.apprv }
              const dItem = ot.find(x => x.DtDrugID === dt.DtDrugID);
              const remain = dItem.DrugStock - dItem.SumOut - apprv
              if (remain >= dt.DtRQAmount) {
                const round = Math.round(dt.DtRQAmount / dt.DtPack)
                dt.DtAmount = round * dt.DtPack > remain ? Math.floor(dt.DtRQAmount / dt.DtPack) : round
              } else {
                const round = Math.round(remain / dt.DtPack)
                dt.DtAmount = round * dt.DtPack > remain ? Math.floor(remain / dt.DtPack) : round
              }
            })
            this.myMsgService.msgBox('ปรับปรุงจำนวนอนุมัติขอเบิกเรียบร้อยแล้ว', 'ปรับปรุงข้อมูล', 'info', null);
          })
        })
      }, 300)
    })
  }

  statId = { invId: '', pdId: '', pack: 1 }; statCenter: any; statRQ = []; opShowTimeOut: any;
  dtAmountStat(event, data, op: OverlayPanel) {
    op.hide()
    clearTimeout(this.opShowTimeOut)
    this.opShowTimeOut = setTimeout(() => {
      op.show(event)
    }, 500);
    if (this.statId.invId === data.DtInvID
      && this.statId.pdId === data.DtDrugID
      && this.statId.pack === data.DtPack) { return }
    this.statCenter = null
    this.statRQ = []
    let task: any[]
    const found = this.allStatCenter.find(x => x.DtDrugID === data.DtDrugID);
    if (found) {
      task = [of([])];
    } else {
      task = [this.dataService.getOtAmount({ data: [data.DtDrugID] })];
    }
    task.push(this.globalService.getRQAmount(this.StInv.StInvID, data.DtDrugID));
    forkJoin(task).subscribe(([ot, rqData]: any) => {
      let sumApprv = 0
      rqData.forEach(rq => {
        rq.depart_name = this.globalService.departTable.find(x => x.value == rq.StInvDepart).label;
        sumApprv += rq.DtAmount * rq.DtPack
      });
      this.statRQ = rqData
      let center;
      if (found) {
        center = found
      } else {
        center = ot[0]
        this.allStatCenter.push(center)
      }
      this.statCenter = {
        DtPack: data.DtPack, DrugExp: center.DrugExp, pd_name: data.pd_name, pd_unit: data.pd_unit,
        stock: Math.round(center.DrugStock / data.DtPack * 100) / 100,
        out: Math.round(center.SumOut / data.DtPack * 100) / 100,
        apprv: Math.round(sumApprv / data.DtPack * 100) / 100,
        remain: Math.round((center.DrugStock - center.SumOut - sumApprv) / data.DtPack * 100) / 100,
      }
      this.statId.invId = data.DtInvID; this.statId.pdId = data.DtDrugID; this.statId.pack = data.DtPack;
    })
  }
  editDtAmount(event) {
    event.data.DtAmount = isNaN(+event.data.DtAmount) ? 0 : +event.data.DtAmount;
    this.isDirty = true
  }

  deleteItemDetail() {
    this.myMsgService.msgBox(`ต้องการที่จะลบ ${this.StInvDetailSelect.pd_name} ออกจากรายการขอเบิกใช่หรือไม่?`, 'ลบข้อมูล', 'warning', () => {
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
        update: false, isNewInv: this.isNewInv, line_noti: this.isNewInv
      };
      this.globalService.saveInv(data, 'RQInvoice').subscribe((result: any) => {
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
    this.StInv.depart_name = this.globalService.departTable.find(x => x.value === this.StInv.StInvDepart).label;
    if (verbose) {
      this.myMsgService.msgBox(`ต้องการที่จะบันทึกใบขอเบิก${this.StInv.StInvID ? 'เลขที่ ' + this.StInv.StInvID + ' ' : 'นี้'}ลงในฐานข้อมูลใช่หรือไม่?`, 'บันทึกข้อมูล', 'question', saveRec)
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
    if (!this.StInvDetail.filter(x => x.DtAmount > 0).length) {
      this.myMsgService.msgBox('ไม่มีรายการให้อนุมัติเบิกใดๆ ไม่สามารถโอนเป็นใบเบิกได้..', '', 'error', null);
      return
    }
    this.StInv.StInvDate = this.xfunc.dateToText(this.tdate1)
    this.StInv.depart_name = this.globalService.departTable.find(x => x.value === this.StInv.StInvDepart).label;
    this.myMsgService.msgBox(`ต้องการที่จะบันทึกและโอนใบขอเบิกเลขที่ ${this.StInv.StInvID} เป็นใบเบิกใช่หรือไม่?`, 'บันทึกและโอนเป็นใบเบิก', 'question', () => {
      this.genOT().then(otNo => {
        this.myMsgService.msgBox(`ใบขอเบิกเลขที่ ${this.StInv.StInvID} จะโอนเป็นใบเบิกเลขที่ ${otNo}<br>
        ต้องการที่จะโอนใบขอเบิกนี้ใช่หรือไม่?`, 'บันทึกและโอนเป็นใบเบิก', 'warning', () => {
          this.myMsgService.showLoading();
          clearTimeout(this.setTimeSave)
          this.saveOT(otNo).then(success => {
            if (success) {
              const data = {
                inv: this.StInv, detail: this.StInvDetail,
                update: true, isNewInv: this.isNewInv, line_noti: false
              };
              this.globalService.saveInv(data, 'RQInvoice').subscribe((result: any) => {
                if (result.err_code === 0) {
                  this.isDirty = false
                  this.isNewInv = false
                  this.StInv.StInvUpdate = true
                  this.StInv.StInvDateUpdate = new Date()
                  this.StInv.StKeyApprove = this.globalService.user.user_name;
                  this.setContextMenu()
                  this.myMsgService.msgBox(result.message + `<br>และโอนเข้าใบเบิกเลขที่ ${otNo}`, 'บันทึกและโอนเป็นใบเบิก', 'info', null);
                } else {
                  this.myMsgService.msgBox(result.message, '', 'error', null);
                  this.setBlankStInv()
                  this.StInvSelect = null
                }
              })
            }
          }).catch(error => { })
        })
      }).catch(error => { })
    })
  }

  genOT() {
    return new Promise((resolve, reject) => {
      const query = this.xfunc.maxBillQuery('OutInvoice', 'OT')
      this.dataService.getData(query).subscribe((result: any) => {
        let billRun = 0
        if (result.length) { billRun = result[0].BillRun }
        resolve(this.xfunc.getBillRun(billRun, 'OT'))
      }, error => { reject(error) });
    })
  }

  saveOT(otNo) {
    return new Promise((resolve, reject) => {
      const query = { field: 'StInvID', table: 'OutInvoice', where: '[StInvID] = "' + otNo + '"' };
      this.dataService.getData(query).subscribe((result: any) => {
        if (result.length > 0) {
          if (result[0].StInvID) {
            this.myMsgService.msgBox('เลขที่นี้เคยถูกใช้เป็นเลขที่ใบเบิกแล้ว', 'เลขที่ซ้ำ', 'error', null);
            resolve(false)
          }
        } else {
          this.displayDialog = false;
          const OTInv = {
            OTNo: otNo, StInvRef: this.StInv.StInvID,
            StInvCust: this.StInv.StInvDepart
          }
          const data = { OTInv: OTInv, insertData: this.StInvDetail, user: this.globalService.user.user_name };
          this.globalService.insertOT(data).subscribe((result: any) => {
            resolve(true)
            // need to set hasPO
          }, error => { reject(error) })
        }
      }, error => { reject(error) })
    })
  }

  cancelUpdate() {
    this.myMsgService.msgBox(`ต้องการที่จะยกเลิกการโอนใบขอเบิกเลขที่ ${this.StInv.StInvID} ใช่หรือไม่?`, 'ยกเลิกการโอน', 'question', () => {
      setTimeout(() => {
        this.myMsgService.msgBox(`ยืนยันที่จะยกเลิกการโอนใบขอเบิกเลขที่ ${this.StInv.StInvID} นี้ใช่หรือไม่?`, 'ยืนยันการยกเลิก', 'warning', () => {
          this.myMsgService.showLoading();
          const data = { id: this.StInv.StInvID, depart_name: this.StInv.depart_name }
          this.globalService.cancelInv(data, 'RQInvoice').subscribe((result: any) => {
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
            this.myMsgService.msgBox(result.message, 'ยกเลิกการโอน', type, null);
          })
        })
      }, 300);
    })
  }

  deleteData() {
    this.myMsgService.msgBox(`ต้องการที่จะลบใบขอเบิกเลขที่ ${this.StInv.StInvID} ใช่หรือไม่?`, 'ลบใบขอเบิก', 'warning', () => {
      setTimeout(() => {
        this.myMsgService.msgBox(`ยืนยันที่จะลบใบขอเบิกเลขที่ ${this.StInv.StInvID} นี้ใช่หรือไม่?`, 'ยืนยันการลบ', 'danger', () => {
          this.myMsgService.showLoading();
          clearTimeout(this.setTimeSave)
          this.globalService.deleteInv(this.StInv.StInvID, 'RQInvoice').subscribe((result: any) => {
            this.setBlankStInv()
            this.StInvSelect = null
            this.oldId = ''
            this.myMsgService.msgBox(result.message, 'ลบใบขอเบิก', 'info', null);
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
      DtDID: this.xfunc.genUniqueID(), pd_name: null, pd_unit: null, rqAmount: 1, costUpdate: 0,
      DtInvID: this.StInv.StInvID, DtDrugID: null, DtRQAmount: 1, DtAmount: 1, DtPack: 1, DtPrice: 0,
      DtMonthBefore: 0, DtMonth: 0, DtStockNow: 0, DtRemark: null
    }
    this.productSelect = null;
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
    this.globalService.getProduct(this.productSelect.DrugID, this.StInv.StInvDepart)
    .subscribe((data: any) => {
      this.pdDetail.DtDrugID = this.productSelect.DrugID;
      this.pdDetail.pd_name = this.productSelect.DrugNameText;
      this.pdDetail.pd_unit = this.productSelect.DrugUnit;
      this.pdDetail.DtPack = this.productSelect.DrugPack;
      this.pdDetail.DtAmount = 0
      if (data.length) {
        this.pdDetail.DtMonthBefore = data[0].Out2;
        this.pdDetail.DtMonth = data[0].Out1;
        this.pdDetail.DtStockNow = data[0].DrugStock;
        this.pdDetail.DtPrice = data[0].DrugCostUpdate * this.pdDetail.DtPack;
        this.pdDetail.costUpdate = data[0].DrugCostUpdate
        const rq = data[0].DrugMax - data[0].DrugStock
        this.pdDetail.rqAmount = rq > 0 ? Math.round(rq / this.pdDetail.DtPack * 100) / 100 : 1
        this.pdDetail.DtRQAmount = this.pdDetail.rqAmount * this.pdDetail.DtPack;
      } else {
        this.pdDetail.DtMonthBefore = 0;
        this.pdDetail.DtMonth = 0;
        this.pdDetail.DtStockNow = 0;
        this.pdDetail.DtPrice = 0;
        this.pdDetail.rqAmount = 1;
        this.pdDetail.DtRQAmount = this.pdDetail.rqAmount * this.pdDetail.DtPack;
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

  dtPackChange() {
    this.pdDetail.DtPrice = this.pdDetail.costUpdate * this.pdDetail.DtPack
    this.pdDetail.DtRQAmount = this.pdDetail.rqAmount * this.pdDetail.DtPack
  }

  editDtRemark() {
    this.remark = this.pdDetail.DtRemark
    this.remarkEditFromCM = false
    this.displayRemarkDialog = true
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
    let viewport = 330;
    if (this.innerWidthSize <= 485) { viewport = 156 }
    else if (this.innerWidthSize <= 575) { viewport = 419 }
    // else if (this.innerWidthSize <= 767) { viewport = 427 }
    else if (this.innerWidthSize <= 815) { viewport = 348 };
    if (this.innerHeightSize >= 480) {
      return 'calc(calc(var(--vh, 1vh) * 100) - ' + viewport + 'px)';
    } else {
      return 'calc(calc(var(--vh, 1vh) * 100) - 130px)';
    }
  }

}
