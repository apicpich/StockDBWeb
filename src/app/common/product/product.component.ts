import { Component, OnInit, OnDestroy, Input, Output, EventEmitter } from '@angular/core';
import { DataService } from '../../service/data.service';
import { GlobalService } from '../../service/global.service';
import { EventService } from '../../service/event.service';
import { MenuService } from '../../service/menu.service';
import { MyMsgService } from '../../service/msg.service';
import { FuncService } from '../../service/xfunc.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-product',
  templateUrl: './product.component.html',
  styleUrls: ['./product.component.scss']
})
export class ProductComponent implements OnInit, OnDestroy {

  @Input() pdId: string;
  @Input() isDialog: boolean;
  @Input() depart: string;
  @Output() onClose = new EventEmitter()
  @Output() onSave = new EventEmitter()

  hasSupplier: boolean;

  drugItem: any; POInvID: string; RCInvID: string;
  pdItem: any; displayDrugDetail = false;

  drugSelect: any;

  departName: string;
  departSubscript: Subscription;

  filteredResults: any[];

  filterResults(event) {
    this.filteredResults = this.xfunc.filterList(event.query, this.dataService.drugLists, ['DrugID', 'DrugNameText', 'DrugGeneric', 'DrugGeneric2']);
  }

  constructor(
    private dataService: DataService,
    public globalService: GlobalService,
    private eventService: EventService,
    private menuService: MenuService,
    private myMsgService: MyMsgService,
    private xfunc: FuncService) {
  }

  ngOnInit() {
    if (!this.isDialog) { this.menuService.setTitle('1-0') }
    if (!this.depart) { this.depart = this.globalService.currentDepart }
    this.hasSupplier = this.depart === this.globalService.currentDepart
    this.departName = this.globalService.departTable.find(x => x.value === this.depart).label;
    this.dataService.getDrugLists()
    if (this.hasSupplier) {
      this.globalService.getSupplier().then(() => { this.startIfDialog() })
    } else {
      this.startIfDialog()
    }
    this.departSubscript = this.eventService.departChange$.subscribe(() => {
      this.departName = this.globalService.departTable.find(x => x.value === this.globalService.currentDepart).label;
      this.myMsgService.showLoading()
      this.globalService.getSupplier().then(() => {
        this.myMsgService.clearLoading()
        this.drugItem = null
        this.drugSelect = null
      })
    });
  }
  ngOnDestroy(): void {
    this.departSubscript.unsubscribe()
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
      const drug = this.dataService.drugLists.find(x => x.DrugID === this.drugSelect.DrugID)
      if (drug) {
        this.globalService.getPdWInlist(this.drugSelect.DrugID, this.depart)
        .subscribe(([data, rq, ap]: any) => {
          if (data.length) {
            this.pdItem = data[0]
            if (this.pdItem.DrugSupply && this.hasSupplier) {
              this.pdItem.SupplyName = this.globalService.supplierTable.find(x => x.value === this.pdItem.DrugSupply).label;
            } else {
              this.pdItem.SupplyName = null
            }
          } else {
            this.pdItem = {
              DrugID: drug.DrugID, DrugCost: 0, DrugCostUpdate: 0, DrugSupply: null, SupplyName: null,
              DrugRemark: null, DrugStock: 0, DrugValue: 0, DrugExp: null, DrugMin: 0, DrugMax: 0, MinLock: false, MaxLock: false,
              Out1: 0, Out2: 0, Out3: 0, OrderNeed: false, NotActive: false, DrugLastIn: null, DrugLastOut: null
            }
          }
          this.drugItem = { ...drug }
          this.POInvID = ''; this.RCInvID = '';
          if (rq.length) {
            this.POInvID = rq[0].StInvID;
          };
          if (ap.length) {
            this.RCInvID = ap[0].StInvID;
          };
        })
      }
    }
  }
 
  saveData() {
    this.myMsgService.msgBox(`ต้องการที่จะบันทึกรายการวัสดุนี้ใช่หรือไม่?`, 'บันทึกรายการ', 'question', () => {
      this.globalService.saveSelectId(4, { data: this.pdItem }, true).subscribe((result: any) => {
        this.myMsgService.msgBox(result.message, 'บันทึกรายการ', 'info', null);
        this.onSave.emit(this.pdItem)
      })
    })
  }

  getThMonth(mnt) { return this.xfunc.getThFullMonth(mnt) }

  isExp(date) {
    return this.xfunc.colorExp(date);
  }

  closeDialog() {
    this.onClose.emit(true)
  }
}
