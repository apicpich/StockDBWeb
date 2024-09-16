import { Component, OnInit, Input } from '@angular/core';
import { GlobalService } from '../../service/global.service';
import { MyMsgService } from '../../service/msg.service';
import { FuncService } from '../../service/xfunc.service';

@Component({
  selector: 'app-product-lot',
  templateUrl: './product-lot.component.html',
  styleUrls: ['./product-lot.component.scss']
})
export class ProductLotComponent implements OnInit {

  @Input() drugItem: any;

  drugDetail = []; drugDetailZero = []; drugDetailNonZero = [];
  hasData = false; hasAllData = false;
  totalAmount = 0;
  totalValue = 0;
  page = 0;

  constructor(
    private globalService: GlobalService,
    private myMsgService: MyMsgService,
    private xfunc: FuncService) { }

  ngOnInit() {
    this.resolveNonZeroData().then((nonZero: any) => {
      this.drugDetail = [...nonZero]
    }).catch((error) => { console.error(error) });
  }

  resolveNonZeroData() {
    return new Promise((resolve, reject) => {
      if (this.hasData) {
        resolve(this.drugDetailNonZero)
      } else {
        this.getLot(false).then((data: any) => {
          this.hasData = true
          this.drugDetailNonZero = data
          resolve(this.drugDetailNonZero)
        }).catch((error) => { reject(error) });
      }
    })
  }

  getLot(isAll) {
    return new Promise((resolve, reject) => {
      this.myMsgService.showLoading()
      this.globalService.getProductLot(this.drugItem.DrugID, isAll).subscribe((result: any) => {
        this.myMsgService.clearLoading()
        if (result.length) {
          result.forEach(item => {
            const supp = this.globalService.supplierTable.find(x => x.value === item.DrugDSupply)
            if (supp) { item.SupplierName = supp.label } else { item.SupplierName = 'อื่นๆ' };
            item.DrugDValue = item.DrugDStock * item.DrugDCost / item.DrugDPack
            if (!isAll) {
              this.totalAmount += item.DrugDStock;
              this.totalValue += item.DrugDValue;
            }
          });
        }
        resolve(result)
      }, error => { reject(error) });
    })
  }

  isAllLot = false
  toggleAllLot(dv) {
    if (this.isAllLot) {
      if (this.hasAllData) {
        dv.filter('')
        this.page = 0
      } else {
        Promise.all([
          this.resolveNonZeroData(),
          this.getLot(true)
        ]).then(([nonZero, zero]: any) => {
          this.hasAllData = true
          this.drugDetailZero = zero
          this.drugDetail = [...nonZero, ...zero];
        }).catch((error) => { console.error(error) });
      }
    } else {
      if (this.hasData) {
        dv.filter("0", "gt")
        this.page = 0
      } else {
        this.resolveNonZeroData().then((nonZero: any) => {
          this.drugDetail = [...nonZero]
        }).catch((error) => { console.error(error) });
      }
    }
  }

  isExp(item) {
    if (item.DrugDStock) {
      return this.xfunc.colorExp(item.DrugDExp);
    }
    return '#a0a0a0'
  }
}
