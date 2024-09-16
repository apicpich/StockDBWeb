import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { DataService } from '../../service/data.service';
import { MenuService } from '../../service/menu.service';
import { MyMsgService } from '../../service/msg.service';
import { FuncService } from '../../service/xfunc.service';

@Component({
  selector: 'app-drug-item',
  templateUrl: './drug-item.component.html',
  styleUrls: ['./drug-item.component.scss']
})
export class DrugItemComponent implements OnInit {

  @Input() pdId: string;
  @Input() isDialog: boolean;
  @Output() onClose = new EventEmitter()

  drugItem: any; POInvID: string; RCInvID: string;
  displayDrugDetail = false;
  
  drugSelect: any;

  filteredResults: any[];

  filterResults(event) {
    this.filteredResults = this.xfunc.filterList(event.query, this.dataService.drugLists, ['DrugID', 'DrugNameText', 'DrugGeneric', 'DrugGeneric2']);
  }

  constructor(
    public dataService: DataService,
    private menuService: MenuService,
    private myMsgService: MyMsgService,
    private xfunc: FuncService) {
  }

  ngOnInit() {
    if (!this.isDialog) { this.menuService.setTitle('4-0') }
    this.dataService.getDrugLists()
    this.startIfDialog()
  }

  startIfDialog() {
    if (this.isDialog) {
      this.drugSelect = { DrugID: this.pdId }
      this.selectItem()
    }
  }

  refreshItem() {
    this.dataService.drugLists = [];
    this.dataService.getDrugLists()
  }

  selectItem() {
    if (this.drugSelect.DrugID) {
      const query = {
        field: 'DrugItem.*, [DrugName] & " " & [TypeName] & " " & [DrugContent] AS DrugNameText, ' +
               'Category.CatName, UnitType.DrugUnit, DrugGroupItem.GroupName, ' +
               'Supplier_1.SupplierName AS SupplyName, Supplier.SupplierName AS ManuName',
        table: '(((((DrugItem INNER JOIN DrugTypeItem ON DrugItem.DrugType = DrugTypeItem.TypeID) ' +
               'INNER JOIN Category ON DrugItem.DrugCat = Category.CatID) INNER JOIN UnitType ON ' +
               'DrugItem.DrugUnitID = UnitType.UnitID) INNER JOIN DrugGroupItem ON ' +
               'DrugItem.DrugGroup = DrugGroupItem.GroupID) INNER JOIN Supplier ON ' +
               'DrugItem.DrugManu = Supplier.SupplierID) INNER JOIN Supplier AS Supplier_1 ON ' +
               'DrugItem.DrugSupply = Supplier_1.SupplierID',
        where: 'DrugItem.DrugID ="' + this.drugSelect.DrugID + '";'
      };
      this.dataService.getData(query).subscribe((result: any) => {
        if (result.length > 0) {
          this.drugItem = result[0];
          const query2 = {
            field: 'TOP 1 POInvoiceDetail.DtInvID',
            table: 'POInvoiceDetail',
            where: 'POInvoiceDetail.DtDrugID = "' + this.drugSelect.DrugID + '"',
            order: 'POInvoiceDetail.DtInvID DESC;'
          };
          this.POInvID = '';
          this.dataService.getData(query2).subscribe((result: any) => {
            if (result.length > 0) {
              this.POInvID = result[0].DtInvID;
              //console.log(result[0]);
            };
          });
          const query3 = {
            field: 'TOP 1 StockInvoiceDetail.DtInvID',
            table: 'StockInvoice INNER JOIN StockInvoiceDetail ON StockInvoice.StInvID = StockInvoiceDetail.DtInvID',
            where: 'StockInvoiceDetail.DtDrugID = "' + this.drugSelect.DrugID + '" AND StockInvoice.StInvUpdate = False;'
          };
          this.RCInvID = '';
          this.dataService.getData(query3).subscribe((result: any) => {
            if (result.length > 0) {
              this.RCInvID = result[0].DtInvID;
              //console.log(result[0]);
            };
          });
        };
      });
    }
  }
 
  getThMonth(mnt) { return this.xfunc.getThFullMonth(mnt) }

  isExp(date) {
    return this.xfunc.colorExp(date);
  }
  
  closeDialog() {
    this.onClose.emit(true)
  }

}
