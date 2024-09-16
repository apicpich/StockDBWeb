import { Component, OnInit, Input, OnDestroy } from '@angular/core';
import { GlobalService } from '../service/global.service';
import { EventService } from '../service/event.service';
import { MenuService } from '../service/menu.service';
import { MyMsgService } from '../service/msg.service';
import { FuncService } from '../service/xfunc.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-supplier',
  template: `
    <div *ngIf="dataItem" style="margin: auto;max-width: 300px;"> 
      <form #dataForm="ngForm">
        <div class="ctx common-title">
          รายการผู้จำหน่าย
        </div>
        <div class="p-grid ui-fluid" style="padding-top: .5em">
          <div class="p-col-6 b0">
            <label for="SupplierID">รหัสผู้จำหน่าย</label>
            <p-autoComplete inputId="SupplierID" [(ngModel)]="dataSelect" [suggestions]="filteredResults"
              (completeMethod)="filterResults($event)" [size]="30" [minLength]="1" placeholder="ค้นหาผู้จำหน่าย"
              field="value" appendTo="body" name="dataSelect" scrollHeight="200px" (onBlur)="selectItem()" 
              [autofocus]="true" (onFocus)="$event.target.setSelectionRange(0, $event.target.value.length)"
              (onSelect)="selectItem()" required>
              <ng-template let-item pTemplate="item">
                <div class="ui-helper-clearfix panel-1" style="width: 80vw; max-width: 260px">
                  {{item.value || ''}} : {{item.label  || ''}}
                </div>
              </ng-template>
            </p-autoComplete>
          </div>
          <div class="p-col-12 b0">
            <label for="SupplierName">ชื่อผู้จำหน่าย</label>
            <input type="text" pInputText id="SupplierName" name="SupplierName" [(ngModel)]="dataItem.SupplierName"
            [disabled]="!globalService.isAdmin" required />
          </div>
          <div class="p-col-12 b0">
            <label for="SupplierAddress">ที่อยู่</label>
            <textarea pInputTextarea id="SupplierAddress" name="SupplierAddress" [(ngModel)]="dataItem.SupplierAddress"
            [disabled]="!globalService.isAdmin" style="width: 100%"></textarea>
          </div>
          <div class="p-col-12 b0">
            <label for="SupplierPhone">เบอร์โทรศัพท์</label>
            <input type="text" pInputText id="SupplierPhone" name="SupplierPhone" [(ngModel)]="dataItem.SupplierPhone"
            [disabled]="!globalService.isAdmin" />
          </div>
          <div class="p-col-12 rtx" *ngIf="globalService.isAdmin">
            <button type="button" class="ui-button-danger" pButton icon="pi pi-trash" *ngIf="dataItem.SupplierID !== 'center'"
            [disabled]="!dataForm.form.valid || !dataItem.SupplierID" (click)="deleteData()"></button>
            <button type="button" pButton icon="pi pi-save" label="บันทึก" (click)="saveData()"
            [disabled]="!dataForm.form.valid || !dataItem.SupplierID" style="width: auto;margin-left: .5em;"></button>
          </div>
        </div>
      </form>
    </div>`,
  styles: []
})
export class SupplierComponent implements OnInit, OnDestroy {

  @Input() isDialog: boolean;

  dataItem: any;
  departSubscript: Subscription

  constructor(
    public globalService: GlobalService,
    private eventService: EventService,
    private menuService: MenuService,
    private myMsgService: MyMsgService,
    private xfunc: FuncService) { }

  ngOnInit() {
    if (!this.isDialog) {
      this.menuService.setTitle('1-1')
    }
    this.globalService.getSupplier()
    this.newItem()
    this.departSubscript = this.eventService.departChange$.subscribe(() => {
      this.myMsgService.showLoading()
      this.globalService.getSupplier().then(() => {
        this.myMsgService.clearLoading()
        this.newItem()
        this.dataSelect = null
      })
    });
  }
  ngOnDestroy(): void {
    this.departSubscript.unsubscribe()
  }

  newItem() {
    this.dataItem = {
      SupplierID: null, SupplierName: null, SupplierAddress: null, SupplierPhone: null
    }
  }

  dataSelect: any; filteredResults = [];
  filterResults(event) {
    this.filteredResults = this.xfunc.filterList(event.query, this.globalService.supplierTable, ['label', 'value']);
  }

  selectItem() {
    if (this.dataSelect && typeof this.dataSelect !== 'object') {
      let found = this.globalService.supplierTable.find(x => (x.value || '').toUpperCase() === this.dataSelect.toUpperCase())
      if (found) { this.dataSelect = found };
    }
    if (this.dataSelect && typeof this.dataSelect === 'object') {
      const found = this.globalService.suppliers.find(x => x.SupplierID === this.dataSelect.value)
      this.dataItem = Object.assign({}, found);
    } else {
      this.newItem()
      this.dataItem.SupplierID = this.dataSelect
    }
  }

  deleteData() {
    this.myMsgService.msgBox(`ต้องการที่จะลบผู้จำหน่ายนี้ใช่หรือไม่?`, 'ลบผู้จำหน่าย', 'warning', () => {
      setTimeout(() => {
        this.myMsgService.msgBox('ยืนยันที่จะลบผู้จำหน่ายนี้ใช่หรือไม่?', 'ยืนยันการลบผู้จำหน่าย', 'warning', () => {
          this.globalService.deleteSelectId(2, this.dataItem.SupplierID, true).subscribe((result: any) => {
            const pos = this.globalService.supplierTable.findIndex(x => x.value === this.dataItem.SupplierID);
            if (pos > -1) { this.globalService.supplierTable.splice(pos, 1) }
            const empos = this.globalService.suppliers.findIndex(x => x.SupplierID === this.dataItem.SupplierID);
            if (empos > -1) { this.globalService.suppliers.splice(empos, 1) }
            this.newItem()
            this.myMsgService.msgBox(result.message, 'ลบผู้จำหน่าย', 'info', null);
          }, error => {
            this.myMsgService.msgBox('รหัสผู้จำหน่ายนี้อาจมีการใช้งานไปก่อนแล้ว หรือ ' + error, '', 'error', null);
          })
        })
      }, 300);
    })
  }

  saveData() {
    this.myMsgService.msgBox(`ต้องการที่จะบันทึกผู้จำหน่ายนี้ใช่หรือไม่?`, 'บันทึกผู้จำหน่าย', 'question', () => {
      this.globalService.saveSelectId(2, { data: this.dataItem }, true).subscribe((result: any) => {
        const item = {
          value: this.dataItem.SupplierID,
          label: this.dataItem.SupplierName
        };
        const pos = this.globalService.supplierTable.findIndex(x => x.value === this.dataItem.SupplierID);
        if (pos > -1) {
          this.globalService.supplierTable.splice(pos, 1, item);
        } else {
          this.globalService.supplierTable.push(item);
        }
        const empos = this.globalService.suppliers.findIndex(x => x.SupplierID === this.dataItem.SupplierID);
        if (empos > -1) {
          this.globalService.suppliers.splice(empos, 1, this.dataItem);
        } else {
          this.globalService.suppliers.push(this.dataItem);
        }
        this.dataSelect = item
        this.myMsgService.msgBox(result.message, 'บันทึกผู้จำหน่าย', 'info', null);
      })
    })
  }

}
