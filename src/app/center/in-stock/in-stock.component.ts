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
  selector: 'app-in-stock',
  templateUrl: './in-stock.component.html',
  styleUrls: ['./in-stock.component.scss']
})
export class InStockComponent implements OnInit, OnDestroy {

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
    this.menuService.setTitle('4-2')
    this.th = this.xfunc.getLocale('th');
    this.dataService.getDrugLists().then(() => {
      this.StInvCatTable = []
      this.dataService.DrugCatTable.forEach(item => {
        this.StInvCatTable.push({ value: item.label, label: item.label });
      })
    });
    this.dataService.getSupplier();
    this.dataService.getStatusType();
    this.dataService.getBuget();
    this.dataService.getPOMethod();
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
      field: 'StInvID AS id, SupplierName AS inv_name, StInvRef AS ref, StInvUpdate AS inv_update',
      table: 'StockInvoice INNER JOIN Supplier ON StockInvoice.StInvCust = Supplier.SupplierID',
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
  tdate1: Date; tdate2: Date; tdate3: Date; tdate4: Date; tdate5: Date; tdate6: Date; tdate7: Date;

  filteredResults: any[];
  filterResults(event) {
    this.dataService.getStInvList(event).subscribe((result: any) => {
      this.filteredResults = result
    })
  }

  selectItem() {
    const query = {
      field: '*',
      table: 'StockInvoice',
      where: 'StockInvoice.StInvID = "' +  this.StInvSelect.StInvID + '";'
    }
    this.dataService.getData(query).subscribe((result: any) => {
      if (result.length > 0) {
        this.editList = []; this.deleteList = []; this.editTNameList = [];
        this.StInv = result[0];
        this.tdate1 = this.xfunc.genDate(result[0].StOrderDate);
        this.tdate2 = this.xfunc.genDate(result[0].StQuoteDate);
        this.tdate3 = this.xfunc.genDate(result[0].StAppvDate);
        this.tdate4 = this.xfunc.genDate(result[0].StApprDate);
        this.tdate5 = this.xfunc.genDate(result[0].StInvDate);
        this.tdate6 = this.xfunc.genDate(result[0].StInvRefDate);

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
    });
  }

  //get StInvDetail
  StInvDetail: any[];
  StInvDetailSelect: any;
  StInvDetailTotal: number;
  getStInvDetail() {
    const query = {
      field: 'StockInvoiceDetail.*, [DrugName] & " " & [TypeName] & " " & [DrugContent] AS DrugNameText, UnitType.DrugUnit, DrugItem.DrugStock, TradeName.TName',
      table: '(((StockInvoiceDetail INNER JOIN DrugItem ON StockInvoiceDetail.DtDrugID = DrugItem.DrugID) ' +
             'INNER JOIN DrugTypeItem ON DrugItem.DrugType = DrugTypeItem.TypeID) ' +
             'INNER JOIN UnitType ON DrugItem.DrugUnitID = UnitType.UnitID) ' +
             'LEFT JOIN TradeName ON StockInvoiceDetail.DtTNID = TradeName.TNID',
      where: 'StockInvoiceDetail.DtInvID = "' + this.StInvSelect.StInvID + '"',
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
    if (this.StInv.StInvTaxStatus === 2) {
      this.StInvDetailTotal = (total - this.StInv.StInvDis1 - this.StInv.StInvDis2) * (1 + (this.StInv.StInvTaxValue / 100));
    } else {
      this.StInvDetailTotal = total - this.StInv.StInvDis1 - this.StInv.StInvDis2;
    }
  }
  setVat() {
    if (this.StInv.StInvTaxStatus > 0) { this.StInv.StInvTaxValue = 7 } else { this.StInv.StInvTaxValue = 0 }
  }
  getCoPO(DtCoPO) {
    if (DtCoPO == 1) { return 'จว.' };
    if (DtCoPO == 2) { return 'เขต' };
    if (DtCoPO == 3) { return 'กสธ.' };
    return '-'
  }
  //display detail dialog window
  displayDialog: boolean = false;
  newStDetail: boolean;
  StDetail: any;
  rowHasSelect: boolean;
  editTName: boolean;
  onDblClick(event) {
    // get row select from dblclick
    if (!this.rowHasSelect) { event.target.click() };
    this.onRowShowPdItem();
  }
  onRowSelect() {
    this.newStDetail = false;
    this.editTName = false;
    this.StDetail = Object.assign({}, this.StInvDetailSelect);
    this.tdate7 = this.xfunc.genDate(this.StDetail.DtExp);
    this.drugSelect = {};
    this.drugSelect.DrugID = this.StDetail.DtDrugID;
    this.drugSelect.DrugNameText = this.StDetail.DrugNameText;
    this.hasDup = false
    this.selectDrugItem(0);
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
    this.checkDuplicate(this.StDetail.DtDID, this.drugSelect.DrugID)
    this.dataService.getData(query).subscribe((result: any) => {
      if (result.length > 0) {
        this.drugSelectResult = result[0];
        if (onStart !== 0) {
          this.StDetail.DtDrugID = this.drugSelectResult.DrugID;
          this.StDetail.DrugNameText = this.drugSelectResult.DrugNameText;
          this.StDetail.DtAmount = 1;
          this.StDetail.DtPack = this.drugSelectResult.DrugPack;
          this.StDetail.DtTNID = 0;
          this.StDetail.TName = '';
          this.StDetail.DtInnovate = false;
          this.StDetail.DtStock = 0;
          this.StDetail.DtStock2 = this.drugSelectResult.DrugStock;
          this.StDetail.DrugUnit = this.drugSelectResult.DrugUnit;
          this.StDetail.DtLocation = this.drugSelectResult.Location;
          this.StDetail.DtCoPO = this.drugSelectResult.CoPO;
          this.getPrice();
          this.getTName().then(result => {
            this.StDetail.DtTNID = result[0].TNID;
            this.StDetail.DtPack = result[0].TPack;
            this.StDetail.DtInnovate = result[0].TInnovate;
            this.StDetail.TName = result[0].TName;
            this.getPrice();
          }).catch(err => { });
        } else {
          this.getTName().then(result => {
            let found = this.TNameData.find(x => x.TPack === this.StDetail.DtPack);
            if (found) {
              this.StDetail.DtTNID = found.TNID;
              if (!this.StDetail.TName) { this.StDetail.TName = found.TName }
            } else {
              this.StDetail.DtTNID = 0;
              // this.StDetail.TName = '';
            }
          }).catch(err => { });
        }
      }
    });
  }
  getPrice() {
    if (this.StInv.StInvTaxStatus == 2) {
      this.StDetail.DtPrice = this.drugSelectResult.DrugCostUpdate * this.StDetail.DtPack / (1 + (this.StInv.StInvTaxValue / 100))
    } else {
      this.StDetail.DtPrice = this.drugSelectResult.DrugCostUpdate * this.StDetail.DtPack
    }
  }
  TNameData: any;
  getTName() {
    return new Promise((resolve, reject) => {
      const query = {
        field: 'TNID, TName, TPack, TInnovate',
        table: 'TradeName',
        where: 'TradeName.TDrugID = "' + this.drugSelectResult.DrugID + '" And TradeName.TSuppID = "' + this.StInv.StInvCust + '"'
      }
      this.TNameData = null;
      this.dataService.getData(query).subscribe((result: any) => {
        if (result.length > 0) {
          this.TNameData = result;
          resolve(result);
        } else {
          reject(0);
        }
      }, err => {
        reject(0)  
      })
    })
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

  dtPackAfterUpdate() {
    this.StDetail.DtTNID = 0;
    this.StDetail.TName = '';
    if (this.TNameData) {
      let found = this.TNameData.find(x => x.TPack === this.StDetail.DtPack);
      if (found) {
        this.StDetail.DtTNID = found.TNID;
        this.StDetail.TName = found.TName;
      }
    }
    this.getPrice();
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
    this.editTName = false;
    this.StDetail = {};
    this.StDetail.newItem = true;
    this.tdate7 = null;
    // this.StDetail.stamp = new Date().valueOf();
    this.StDetail.DtInvID = this.StInv.StInvID
    this.drugSelect = {};
    this.hasDup = false
    this.displayDialog = true;
    setTimeout(() => {
      this.did.nativeElement.focus()
    }, 0);
  }

  editList = []; editTNameList = [];
  saveDetail() {
    if (this.editTName) {
      if (this.StDetail.DtTNID == 0) {
        let foundIndex = this.editTNameList.findIndex(x => { return x.DtDrugID === this.StDetail.DtDrugID && x.DtPack === this.StDetail.DtPack });
        if (foundIndex > -1) {
          this.editTNameList[foundIndex].TName = this.StDetail.TName;
        } else {
          this.editTNameList.push(this.StDetail);
        };
      } else {
        let foundIndex = this.editTNameList.findIndex(x => x.TNID === this.StDetail.DtTNID);
        if (foundIndex > -1) { this.editTNameList.splice(foundIndex, 1) };
        this.editTNameList.push(this.StDetail);
     }
    }
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
        StInv: this.StInv, editData: editData, addData: addData, deleteData: this.deleteList,
        editTName: this.editTNameList, user: this.globalService.user.user_name
      };
      this.myMsgService.showLoading();
      this.dataService.updateStInvoice(data).subscribe((result: any) => {
        this.editList = []; this.deleteList = []; this.editTNameList = [];
        this.StInvDetail.forEach(item => { if (item.newItem) { item.newItem = false } });
        this.myMsgService.clearLoading();
        this.myMsgService.msgBox(result.message, 'บันทึกข้อมูล', 'info', null);
      })
    })
  }

  isExp(date) {
    return this.xfunc.colorExp(date);
  }
  isBExp(date) {
    return this.xfunc.isExp(date);
  }

  scrollViewPort() {
    let viewport = 433;
    if (this.innerWidthSize <= 485) { viewport = 108 }
    else if (this.innerWidthSize <= 575) { viewport = 125 }
    else if (this.innerWidthSize <= 767) { viewport = 502 }
    else if (this.innerWidthSize <= 815) { viewport = 450 };
    if (this.innerHeightSize >= 480) {
      return 'calc(calc(var(--vh, 1vh) * 100) - ' + viewport + 'px)';
    } else {
      return 'calc(calc(var(--vh, 1vh) * 100) - 130px)';
    }
  }

}
