import { Component, OnInit, OnDestroy, ViewChild, HostListener, ElementRef } from '@angular/core';
import { GlobalService } from '../../service/global.service';
import { EventService } from '../../service/event.service';
import { DataService } from '../../service/data.service';
import { MenuService } from '../../service/menu.service';
import { MyMsgService } from '../../service/msg.service';
import { FuncService } from '../../service/xfunc.service';
import { MenuItem, SelectItem } from 'primeng/api';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-out-stock',
  templateUrl: './out-stock.component.html',
  styleUrls: ['./out-stock.component.scss']
})
export class OutStockComponent implements OnInit, OnDestroy {

  contextItems: MenuItem[];
  sizeSubscript: Subscription;
  innerWidthSize: number; innerHeightSize: number;

  @ViewChild('did') did: ElementRef;
  @ViewChild('addDetail') addDetail: ElementRef;
  @HostListener('document:keydown.f4')
  addPdDetailKeyDown() {
    if (this.addDetail && !this.addDetail.nativeElement.disabled && !this.displayDialog) {
      this.addStDetail()
    }
  }

  constructor(
    public globalService: GlobalService,
    private eventService: EventService,
    public dataService: DataService,
    private menuService: MenuService,
    private myMsgService: MyMsgService,
    private xfunc: FuncService
  ) { }

  StInvCatTable: SelectItem[];
  ngOnInit() {
    this.menuService.setTitle('4-3')
    this.th = this.xfunc.getLocale('th');
    this.dataService.getDrugLists().then(() => {
      this.StInvCatTable = []
      this.dataService.DrugCatTable.forEach(item => {
        this.StInvCatTable.push({ value: item.label, label: item.label });
      })
    });
    this.dataService.getCustomersLists();
    this.dataService.getStatusType();
    this.leftPanelStartData()
    this.sizeSubscript = this.eventService.windowsSize$.subscribe((size) => {
      this.hideSideBar(size)
      this.innerHeightSize = window.innerHeight
      this.innerWidthSize = size
    })
  }

  notUpdateItems = []; todayItems = [];
  leftPanelStartData() {
    const query = {
      field: 'StInvID AS id, CustName AS inv_name, StInvRef AS ref, StInvUpdate AS inv_update',
      table: 'OutInvoice INNER JOIN Customer ON OutInvoice.StInvCust = Customer.CustID',
      where: 'Int([StInvDate]+0.0000001) = Date() OR StInvUpdate = False',
      order: 'StInvUpdate, StInvID'
    }
    this.dataService.getData(query).subscribe((result: any) => {
      this.notUpdateItems = result.filter(x => !x.inv_update);
      this.todayItems = result.filter(x => x.inv_update);
    })
  }

  ngOnDestroy(): void {
    this.sizeSubscript.unsubscribe()
  }

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

  selectFromLeftPanel(event) {
    this.StInvSelect = { StInvID: event }
    this.selectItem()
    this.leftPanel2Show = false
  }

  //StInv autocomplete model
  StInv: any; 
  StInvSelect: any;
  th: any;
  tdate: Date;
  filteredResults: any[];
  filterResults(event) {
    this.dataService.getOutInvList(event).subscribe((result: any) => {
      this.filteredResults = result
    })
  }

  selectItem() {
    const query = {
      field: '*',
      table: 'OutInvoice',
      where: 'OutInvoice.StInvID = "' +  this.StInvSelect.StInvID + '";'
    }
    this.dataService.getData(query).subscribe((result: any) => {
      if (result.length > 0) {
        this.editList = []; this.deleteList = [];
        this.StInv = result[0];
        this.tdate = new Date(result[0].StInvDate);
        this.TFSelect = this.TFModel.filter(x => x.StoreID === result[0].StInvTF)[0];
        if (result[0].StInvUpdate) {
          this.contextItems = [
            { label: 'รายละเอียดวัสดุ', icon: 'pi pi-info', command: (event) => this.onRowShowPdItem() },
            { label: 'แสดงข้อมูล', icon: 'pi pi-info', command: (event) => this.onRowSelect() }
          ];
        } else {
          this.contextItems = [
            { label: 'รายละเอียดวัสดุ', icon: 'pi pi-info', command: (event) => this.onRowShowPdItem() },
            { label: 'แก้ไขข้อมูล', icon: 'pi pi-pencil' , command: (event) => this.onRowSelect() },
            { label: 'ลบข้อมูล', icon: 'pi pi-times', command: (event) => this.deleteItemDetail(this.StInvDetailSelect) }
          ];
        };
        this.getStInvDetail();
      }
      //this.myMsgService.clearLoading();
    });
  }

  //StInvTF model
  TFModel = [{ StoreID: 0, StoreName: '-----' }, { StoreID: 2, StoreName: 'คลังย่อย1' }, { StoreID: 3, StoreName: 'คลังย่อย2' }];
  TFSelect: any;
  selectStInvTF() { this.StInv.StInvTF = this.TFSelect.StoreID };

  //get StInvDetail
  StInvDetail: any[];
  StInvDetailSelect: any;
  StInvDetailTotal: number;
  getStInvDetail() {
    const query = {
      field: 'OutInvoiceDetail.*, [DrugName] & " " & [TypeName] & " " & [DrugContent] AS DrugNameText, UnitType.DrugUnit, DrugItem.DrugStock, TradeName.TName',
      table: '(((OutInvoiceDetail INNER JOIN DrugItem ON OutInvoiceDetail.DtDrugID = DrugItem.DrugID) ' +
             'INNER JOIN DrugTypeItem ON DrugItem.DrugType = DrugTypeItem.TypeID) ' +
             'INNER JOIN UnitType ON DrugItem.DrugUnitID = UnitType.UnitID) ' +
             'LEFT JOIN TradeName ON OutInvoiceDetail.DtTNID = TradeName.TNID',
      where: 'OutInvoiceDetail.DtInvID = "' + this.StInvSelect.StInvID + '"',
      order: '[DrugName] & " " & [TypeName] & " " & [DrugContent];'
    }
    this.dataService.getData(query).subscribe((result: any) => {
      if (result.length > 0) {
        this.StInvDetail = result;
        this.setDetailTotal();
      }
    });
  }
  setDetailTotal() {
    let total = 0;
    for (let i = 0; i < this.StInvDetail.length; i++) {
      total += this.StInvDetail[i].DtAmount * this.StInvDetail[i].DtPrice;
    };
    this.StInvDetailTotal = total;
  }

  //display detail dialog window
  displayDialog: boolean = false;
  newStDetail: boolean;
  StDetail: any;
  rowHasSelect: boolean;
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
    this.newStDetail = false;
    this.StDetail = {}
    this.hasDup = false; this.dupAmount = 0;
    setTimeout(() => {
      this.StDetail = Object.assign({}, this.StInvDetailSelect);
      this.drugSelect = {};
      this.drugSelect.DrugID = this.StDetail.DtDrugID;
      this.drugSelect.DrugNameText = this.StDetail.DrugNameText;
      this.selectDrugItem(0);
      this.DrugLotNoSelect = {};
      this.DrugLotNoSelect.DrugLotID = this.StDetail.DtLotID;
      this.DrugLotNoSelect.DrugDLot = this.StDetail.DtLot;
      this.checkDuplicate(this.StDetail.DtDID, this.StDetail.DtDrugID)
      if (!this.StInv.StInvUpdate) {
        this.getLotNo(this.StDetail.DtDrugID);
      }
    }, 0);
    this.hasDup = false
    this.displayDialog = true;
    setTimeout(() => {
      this.did.nativeElement.focus()
    }, 0);
  }
  pdId = ''; displayPdItemDialog = false; showAppPD = false
  onRowShowPdItem() {
    this.pdId = this.StInvDetailSelect.DtDrugID;
    this.showAppPD = true
    setTimeout(() => {
      this.displayPdItemDialog = true
    }, 300);
  }
  onPdDialogHide() {
    this.displayPdItemDialog = false
    this.showAppPD = false
  }

  //get drugSelect from dialog
  drugSelect: any;
  filteredDrugResults: any[];
  filterDrugResults(event) {
    this.filteredDrugResults = this.xfunc.filterList(event.query, this.dataService.drugLists, ['DrugID', 'DrugNameText', 'DrugGeneric', 'DrugGeneric2']);
  }
  drugSelectResult: any = {};
  selectDrugItem(onStart: number) {
    const query = {
      field: 'DrugItem.*, [DrugName] & " " & [TypeName] & " " & [DrugContent] AS DrugNameText, UnitType.DrugUnit',
      table: '(DrugItem INNER JOIN DrugTypeItem ON DrugItem.DrugType = DrugTypeItem.TypeID) ' +
             'INNER JOIN UnitType ON DrugItem.DrugUnitID = UnitType.UnitID',
      where: 'DrugItem.DrugID ="' + this.drugSelect.DrugID + '";'
    }
    this.dataService.getData(query).subscribe((result: any) => {
      if (result.length > 0) {
        this.drugSelectResult = result[0];
        if (onStart !== 0) {
          if (this.drugSelectResult.DrugStock === 0) {
            this.myMsgService.msgBox('จำนวนไม่พอจ่าย ไม่มีของในคลัง..', 'คำเตือน', 'error', null);
            this.drugSelect = {};
            this.drugSelect.DrugID = this.StDetail.DtDrugID;
            this.drugSelect.DrugNameText = this.StDetail.DrugNameText;
          } else {
            this.StDetail.DtDrugID = this.drugSelectResult.DrugID;
            this.StDetail.DrugNameText = this.drugSelectResult.DrugNameText;
            this.StDetail.DtLotID = 0;
            this.StDetail.DtLot = null;
            this.StDetail.DtStock = this.drugSelectResult.DrugStock;
            this.StDetail.DtAmount = 0;
            this.StDetail.DtPack = 0;
            setTimeout(() => {
              this.StDetail.DtAmount = 1;
              if (this.drugSelectResult.DrugStock / this.drugSelectResult.DrugPack < 1) { this.StDetail.DtPack = 1 }
              else { this.StDetail.DtPack = this.drugSelectResult.DrugPack }
              this.StDetail.DtRemain = this.drugSelectResult.DrugStock - (this.StDetail.DtAmount * this.StDetail.DtPack);
              this.StDetail.DrugUnit = this.drugSelectResult.DrugUnit;
              this.StDetail.DtPrice = this.drugSelectResult.DrugCost * this.StDetail.DtPack;
              this.StDetail.DtExp = this.drugSelectResult.DrugExp;
              this.StDetail.DtLocation = this.drugSelectResult.Location;
              this.StDetail.DtTNID = 0;
              this.StDetail.TName = '';
              this.checkDuplicate(this.StDetail.DtDID, this.StDetail.DtDrugID)
              this.getLotNo(this.drugSelectResult.DrugID);
            }, 0);
          }
        }
      }
    });
  }

  // get lot no. form dialog
  DrugLotNo: any;
  DrugLotNoSelect: any;
  filteredLotNoResults: any[];
  filterDrugLotNo(event) {
    this.filteredLotNoResults = this.xfunc.filterList(event.query, this.DrugLotNo, ['DrugDLot', 'SupplierName', 'TName']);
  }
  getLotNo(drugID) {
    const query = {
      field: 'DrugDetail.*, Supplier.SupplierName, TradeName.TName',
      table: '(DrugDetail INNER JOIN Supplier ON DrugDetail.DrugDSupply = Supplier.SupplierID) LEFT JOIN TradeName ON DrugDetail.DrugTNID = TradeName.TNID',
      where: 'DrugDetail.DrugDID = "' + drugID + '" AND DrugDetail.DrugDStock > 0',
      order: 'DrugDetail.DrugDExp, DrugDetail.DrugDDate;'
    }
    this.dataService.getData(query).subscribe((result: any) => {
      if (result.length > 0) {
        this.DrugLotNo = result.slice();
        if (this.StDetail.DtLotID && this.StDetail.DtLotID !== 0) {
          this.DrugLotNoSelect = this.DrugLotNo.filter(el => el.DrugLotID === this.StDetail.DtLotID)[0];
        };
      }
    });
  }
  refreshLotNo() {
    if (!this.DrugLotNo || this.DrugLotNo.length === 0) {
      if (!this.StInv.StInvUpdate) {
        this.getLotNo(this.StDetail.DtDrugID);
      }
    }
  }
  selectLotNo() {
    const temp = this.StDetail.DtAmount;
    this.StDetail.DtAmount = 0;
    this.StDetail.DtPack = 0;
    setTimeout(() => {
      this.StDetail.DtAmount = temp;
      this.StDetail.DtLotID = this.DrugLotNoSelect.DrugLotID;
      this.StDetail.DtLot = this.DrugLotNoSelect.DrugDLot;
      this.StDetail.DtStock = this.DrugLotNoSelect.DrugDStock;
      if (this.DrugLotNoSelect.DrugDStock / this.DrugLotNoSelect.DrugDPack < 1) {
        this.StDetail.DtPrice = this.DrugLotNoSelect.DrugDCost / this.DrugLotNoSelect.DrugDPack;
        this.StDetail.DtPack = 1;
      } else {
        this.StDetail.DtPrice = this.DrugLotNoSelect.DrugDCost;
        this.StDetail.DtPack = this.DrugLotNoSelect.DrugDPack;
      }
      this.StDetail.DtExp = this.DrugLotNoSelect.DrugDExp;
      this.StDetail.DtLocation = this.DrugLotNoSelect.DrugDLocation;
      this.StDetail.DtTNID = this.DrugLotNoSelect.DrugTNID;
      this.StDetail.TName = this.DrugLotNoSelect.TName;
    }, 0);
  }

  hasDup = false; dupAmount = 0;
  checkDuplicate(dtDID, pdId) {
    this.hasDup = false; this.dupAmount = 0;
    let dubList: any[];
    if (this.newStDetail) {
      dubList = this.StInvDetail.filter(x => x.DtDrugID === pdId);
    } else {
      dubList = this.StInvDetail.filter(x => x.DtDrugID === pdId && x.DtDID !== dtDID);
    }
    if (dubList.length) {
      this.hasDup = true
      this.dupAmount = dubList.reduce((sum, cur) => sum += cur.DtAmount * cur.DtPack, 0);
    }
  }
  get maxAmount() {
    const validAmount = this.drugSelectResult.DrugStock - this.dupAmount;
    if (validAmount <= 0) return 0;
    if (this.StDetail.DtLotID && validAmount > this.StDetail.DtStock) return this.StDetail.DtStock;
    return validAmount;
  }

  dtAmountAfterUpdate() {
    this.StDetail.DtRemain = this.drugSelectResult.DrugStock - (this.StDetail.DtAmount * this.StDetail.DtPack);
    const temp = this.StDetail.DtPack
    this.StDetail.DtPack = 0
    setTimeout(() => { this.StDetail.DtPack = temp }, 0);
  }
  dtPackAfterUpdate() {
    if (this.StDetail.DtLotID && this.StDetail.DtLotID !== 0) {
      this.StDetail.DtPrice = this.DrugLotNoSelect.DrugDCost / this.DrugLotNoSelect.DrugDPack * this.StDetail.DtPack;
    } else {
      this.StDetail.DtPrice = this.drugSelectResult.DrugCost * this.StDetail.DtPack;
    }
    this.StDetail.DtRemain = this.drugSelectResult.DrugStock - (this.StDetail.DtAmount * this.StDetail.DtPack);
    const temp = this.StDetail.DtAmount
    this.StDetail.DtAmount = 0
    setTimeout(() => { this.StDetail.DtAmount = temp }, 0);
  }

  deleteList = [];
  deleteItemDetail(item) {
    this.myMsgService.msgBox(`ต้องการที่จะลบ ${item.DrugNameText} ออกจากรายการเบิกใช่หรือไม่?`, 'ลบข้อมูล', 'warning', () => {
      let index = this.StInvDetail.indexOf(this.StInvDetailSelect);
      if (this.StInvDetailSelect.DtDID) {
        this.deleteList.push(this.StInvDetailSelect.DtDID)
      }
      this.StInvDetail = this.StInvDetail.filter((val, i) => i != index);
      this.setDetailTotal();
    });
  }

  trackByFn(index, item) { return item.DtDID }

  addStDetail() {
    this.newStDetail = true;
    this.StDetail = {};
    this.StDetail.newItem = true;
    this.StDetail.DtInvID = this.StInv.StInvID
    this.drugSelect = {};
    this.DrugLotNo = null;
    this.DrugLotNoSelect = null;
    this.hasDup = false
    this.displayDialog = true;
    setTimeout(() => {
      this.did.nativeElement.focus()
    }, 0);
  }

  editList = []; 
  saveDetail() {
    let StInvDetailTemp = [...this.StInvDetail];
    if (this.newStDetail) {
      StInvDetailTemp.push(this.StDetail);
    } else {
      StInvDetailTemp[this.StInvDetail.indexOf(this.StInvDetailSelect)] = this.StDetail;
      if (this.StDetail.DtDID && this.editList.indexOf(this.StDetail.DtDID) === -1) {
        this.editList.push(this.StDetail.DtDID);
      }
    };
    this.StInvDetail = StInvDetailTemp;
    this.rowHasSelect = false
    this.StInvDetailSelect = null
    this.setDetailTotal();
    this.StDetail = null;
    this.displayDialog = false;
  }

  saveData() {
    this.myMsgService.msgBox(`ต้องการที่จะบันทึกใบเบิก ${this.StInv.StInvID} ลงในฐานข้อมูลใช่หรือไม่?`, 'บันทึกข้อมูล', 'question', () => {
      let editData = [], addData = [];
      if (this.editList.length > 0) {
        editData = this.StInvDetail.filter(el => this.editList.indexOf(el.DtDID) > -1);
      }
      addData = this.StInvDetail.filter(el => el.newItem === true);
      const data = {
        StInv: this.StInv, editData: editData, addData: addData,
        deleteData: this.deleteList, user: this.globalService.user.user_name
      };
      this.myMsgService.showLoading();
      this.dataService.updateOutInvoice(data).subscribe((result: any) => {
        this.editList = []; this.deleteList = [];
        this.StInvDetail.forEach(item => { if (item.newItem) { item.newItem = false } });
        this.myMsgService.clearLoading();
        this.myMsgService.msgBox(result.message, 'บันทึกข้อมูล', 'info', null);
      })
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

  scrollViewPort() {
    let viewport = 330;
    if (this.innerWidthSize <= 485) { viewport = 108 }
    else if (this.innerWidthSize <= 575) { viewport = 125 }
    else if (this.innerWidthSize <= 815) { viewport = 346 };
    if (this.innerHeightSize >= 480) {
      return 'calc(calc(var(--vh, 1vh) * 100) - ' + viewport + 'px)';
    } else {
      return 'calc(calc(var(--vh, 1vh) * 100) - 130px)';
    }
  }
}
