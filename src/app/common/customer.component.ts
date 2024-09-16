import { Component, OnInit, Input, OnDestroy } from '@angular/core';
import { GlobalService } from '../service/global.service';
import { EventService } from '../service/event.service';
import { MenuService } from '../service/menu.service';
import { MyMsgService } from '../service/msg.service';
import { FuncService } from '../service/xfunc.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-customer',
  template: `
    <div *ngIf="dataItem" style="margin: auto;max-width: 300px;"> 
      <form #dataForm="ngForm">
        <div class="ctx common-title">
          รายการหน่วยเบิก
        </div>
        <div class="p-grid ui-fluid" style="padding-top: .5em">
          <div class="p-col-6 b0">
            <label for="CustID">รหัสหน่วยเบิก</label>
            <p-autoComplete inputId="CustID" [(ngModel)]="dataSelect" [suggestions]="filteredResults"
              (completeMethod)="filterResults($event)" [size]="30" [minLength]="1" placeholder="ค้นหาหน่วยเบิก"
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
            <label for="CustName">ชื่อหน่วยเบิก</label>
            <input type="text" pInputText id="CustName" name="CustName" [(ngModel)]="dataItem.CustName"
            [disabled]="!globalService.isAdmin" required />
          </div>
          <div class="p-col-12 b0">
            <label for="CustAddress">ที่อยู่</label>
            <textarea pInputTextarea id="CustAddress" name="CustAddress" [(ngModel)]="dataItem.CustAddress"
            [disabled]="!globalService.isAdmin" style="width: 100%"></textarea>
          </div>
          <div class="p-col-12 b0">
            <label for="CustPhone">เบอร์โทรศัพท์</label>
            <input type="text" pInputText id="CustPhone" name="CustPhone" [(ngModel)]="dataItem.CustPhone"
            [disabled]="!globalService.isAdmin" />
          </div>
          <div class="p-col-12 rtx" *ngIf="globalService.isAdmin">
            <button type="button" class="ui-button-danger" pButton icon="pi pi-trash"
            [disabled]="!dataForm.form.valid || !dataItem.CustID" (click)="deleteData()"></button>
            <button type="button" pButton icon="pi pi-save" label="บันทึก" (click)="saveData()"
            [disabled]="!dataForm.form.valid || !dataItem.CustID" style="width: auto;margin-left: .5em;"></button>
          </div>
        </div>
      </form>
    </div>`,
  styles: []
})
export class CustomerComponent implements OnInit, OnDestroy {

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
      this.menuService.setTitle('1-2')
    }
    this.globalService.getCustomer()
    this.newItem()
    this.departSubscript = this.eventService.departChange$.subscribe(() => {
      this.myMsgService.showLoading()
      this.globalService.getCustomer().then(() => {
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
      CustID: null, CustName: null, CustAddress: null, CustPhone: null
    }
  }

  dataSelect: any; filteredResults = [];
  filterResults(event) {
    this.filteredResults = this.xfunc.filterList(event.query, this.globalService.customerTable, ['label', 'value']);
  }

  selectItem() {
    if (this.dataSelect && typeof this.dataSelect !== 'object') {
      let found = this.globalService.customerTable.find(x => (x.value || '').toUpperCase() === this.dataSelect.toUpperCase())
      if (found) { this.dataSelect = found };
    }
    if (this.dataSelect && typeof this.dataSelect === 'object') {
      const found = this.globalService.customers.find(x => x.CustID === this.dataSelect.value)
      this.dataItem = Object.assign({}, found);
    } else {
      this.newItem()
      this.dataItem.CustID = this.dataSelect
    }
  }

  deleteData() {
    this.myMsgService.msgBox(`ต้องการที่จะลบหน่วยเบิกนี้ใช่หรือไม่?`, 'ลบหน่วยเบิก', 'warning', () => {
      setTimeout(() => {
        this.myMsgService.msgBox('ยืนยันที่จะลบหน่วยเบิกนี้ใช่หรือไม่?', 'ยืนยันการลบหน่วยเบิก', 'warning', () => {
          this.globalService.deleteSelectId(3, this.dataItem.CustID, true).subscribe((result: any) => {
            const pos = this.globalService.customerTable.findIndex(x => x.value === this.dataItem.CustID);
            if (pos > -1) { this.globalService.customerTable.splice(pos, 1) }
            const empos = this.globalService.customers.findIndex(x => x.CustID === this.dataItem.CustID);
            if (empos > -1) { this.globalService.customers.splice(empos, 1) }
            this.newItem()
            this.myMsgService.msgBox(result.message, 'ลบหน่วยเบิก', 'info', null);
          }, error => {
            this.myMsgService.msgBox('รหัสหน่วยเบิกนี้อาจมีการใช้งานไปก่อนแล้ว หรือ ' + error, '', 'error', null);
          })
        })
      }, 300);
    })
  }

  saveData() {
    this.myMsgService.msgBox(`ต้องการที่จะบันทึกหน่วยเบิกนี้ใช่หรือไม่?`, 'บันทึกหน่วยเบิก', 'question', () => {
      this.globalService.saveSelectId(3, { data: this.dataItem }, true).subscribe((result: any) => {
        const item = {
          value: this.dataItem.CustID,
          label: this.dataItem.CustName
        };
        const pos = this.globalService.customerTable.findIndex(x => x.value === this.dataItem.CustID);
        if (pos > -1) {
          this.globalService.customerTable.splice(pos, 1, item);
        } else {
          this.globalService.customerTable.push(item);
        }
        const empos = this.globalService.customers.findIndex(x => x.CustID === this.dataItem.CustID);
        if (empos > -1) {
          this.globalService.customers.splice(empos, 1, this.dataItem);
        } else {
          this.globalService.customers.push(this.dataItem);
        }
        this.dataSelect = item
        this.myMsgService.msgBox(result.message, 'บันทึกหน่วยเบิก', 'info', null);
      })
    })
  }

}
