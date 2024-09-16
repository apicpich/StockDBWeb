import { Component, OnInit, Input } from '@angular/core';
import { GlobalService } from '../service/global.service';
import { MenuService } from '../service/menu.service';
import { MyMsgService } from '../service/msg.service';
import { FuncService } from '../service/xfunc.service';

@Component({
  selector: 'app-status',
  template: `
    <div *ngIf="statusItem" style="margin: auto;max-width: 200px;padding-bottom: .5em"> 
      <form #statusForm="ngForm">
        <div class="ctx common-title">
          สถานะรายการ
        </div>
        <div class="p-grid ui-fluid">
          <div class="p-col-12">
            <label for="statusSelect">รหัสสถานะ</label>
            <p-autoComplete inputId="statusSelect" [(ngModel)]="statusSelect" [suggestions]="filteredResults"
              (completeMethod)="filterResults($event)" [size]="30" [minLength]="1" placeholder="ค้นหาสถานะ" 
              field="value" scrollHeight="200px" appendTo="body" (onBlur)="selectItem()" [autofocus]="true"
              (onSelect)="selectItem()" name="statusSelect" type="number">
              <ng-template let-item pTemplate="item">
                <div class="ui-helper-clearfix panel-1" style="width: 80vw; max-width: 200px">
                  {{item.value || ''}} : {{item.label  || ''}}
                </div>
              </ng-template>
            </p-autoComplete>
          </div>
          <div class="p-col-12">
            <label for="status_name">ชื่อสถานะ</label>
            <input type="text" pInputText id="status_name" name="status_name" [(ngModel)]="statusItem.status_name"
            [disabled]="!globalService.isAdmin" required />
          </div>
          <div class="p-col-12 rtx" *ngIf="globalService.isAdmin">
            <button type="button" class="ui-button-danger" pButton icon="pi pi-trash"
            [disabled]="!statusForm.form.valid || !statusItem.status_id" (click)="deleteStatus()"></button>
            <button type="button" pButton icon="pi pi-save" label="บันทึก" (click)="saveStatus()"
            [disabled]="!statusForm.form.valid || !statusItem.status_id" style="width: auto;margin-left: .5em;"></button>
          </div>
        </div>
      </form>
    </div>`,
  styles: [`
    :host ::ng-deep input::-webkit-outer-spin-button,
    input::-webkit-inner-spin-button {
      /* display: none; <- Crashes Chrome on hover */
      -webkit-appearance: none !important;
      margin: 0 !important; /* <-- Apparently some margin are still there even though it's hidden */
    }

    :host ::ng-deep input[type=number] {
      -moz-appearance:textfield !important; /* Firefox */
    }
  `]
})
export class StatusComponent implements OnInit {

  @Input() isDialog: boolean;

  statusItem: any;

  constructor(
    public globalService: GlobalService,
    private menuService: MenuService,
    private myMsgService: MyMsgService,
    private xfunc: FuncService) { }

  ngOnInit() {
    if (!this.isDialog) {
      this.menuService.setTitleSystem(7)
    }
    this.globalService.getStatus()
    this.newItem()
  }

  newItem() {
    this.statusItem = {
      status_id: null, status_name: null
    }
    this.statusSelect = null
  }

  statusSelect: any; filteredResults = [];
  filterResults(event) {
    this.filteredResults = this.globalService.statusTable.filter(x => {
      return x.value == event.query || x.label.toLowerCase() == event.query
    })
  }

  selectItem() {
    if (this.statusSelect && typeof this.statusSelect !== 'object') {
      let found = this.globalService.statusTable.find(x => x.value == this.statusSelect)
      if (found) { this.statusSelect = found };
    }
    if (this.statusSelect && typeof this.statusSelect === 'object') {
      this.statusItem.status_id = this.statusSelect.value
      if (this.statusItem.status_id) {
        this.statusItem.status_name = this.statusSelect.label
      } else {
        this.statusItem.status_name = null
      }
    } else {
      this.statusItem.status_id = +this.statusSelect
      this.statusItem.status_name = null
    }
  }

  deleteStatus() {
    this.myMsgService.msgBox(`ต้องการที่จะลบสถานะนี้ใช่หรือไม่?`, 'ลบสถานะ', 'warning', () => {
      setTimeout(() => {
        this.myMsgService.msgBox('ยืนยันที่จะลบสถานะนี้ใช่หรือไม่?', 'ยืนยันการลบสถานะ', 'warning', () => {
          this.globalService.deleteSelectId(1, this.statusItem.status_id).subscribe((result: any) => {
            const pos = this.globalService.statusTable.findIndex(x => x.value === this.statusItem.status_id);
            if (pos > -1) {
              this.globalService.statusTable.splice(pos, 1);
            }
            this.newItem()
            this.myMsgService.msgBox(result.message, 'ลบสถานะ', 'info', null);
          }, error => {
            this.myMsgService.msgBox('สถานะนี้อาจมีการใช้งานไปก่อนแล้ว หรือ ' + error, '', 'error', null);
          })
        })
      }, 300);
    })
  }

  saveStatus() {
    this.myMsgService.msgBox(`ต้องการที่จะบันทึกสถานะนี้ใช่หรือไม่?`, 'บันทึกสถานะ', 'question', () => {
      this.globalService.saveSelectId(1, { data: this.statusItem }).subscribe((result: any) => {
        const item = { value: this.statusItem.status_id, label: this.statusItem.status_name };
        const pos = this.globalService.statusTable.findIndex(x => x.value === this.statusItem.status_id);
        if (pos > -1) {
          this.globalService.statusTable.splice(pos, 1, item);
        } else {
          this.globalService.statusTable.push(item);
        }
        this.statusSelect = item
        this.myMsgService.msgBox(result.message, 'บันทึกสถานะ', 'info', null);
      })
    })
  }

}
