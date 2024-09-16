import { Component, OnInit, Input } from '@angular/core';
import { GlobalService } from '../service/global.service';
import { MenuService } from '../service/menu.service';
import { MyMsgService } from '../service/msg.service';
import { FuncService } from '../service/xfunc.service';
import { SelectItem } from 'primeng/api';

@Component({
  selector: 'app-depart',
  template: `
    <div *ngIf="dataItem" style="margin: auto;max-width: 300px;"> 
      <form #dataForm="ngForm">
        <div class="ctx common-title">
          รายการหน่วยงาน
        </div>
        <div class="p-grid ui-fluid" style="padding-top: .5em">
          <div class="p-col-6 b0">
            <label for="depart_id">รหัสหน่วยงาน</label>
            <p-autoComplete inputId="depart_id" [(ngModel)]="dataSelect" [suggestions]="filteredResults" (completeMethod)="filterResults($event)" [size]="30"
              [minLength]="1" placeholder="ค้นหาหน่วยงาน" field="value" appendTo="body" name="dataSelect" scrollHeight="200px" (onBlur)="selectItem()" 
              [autofocus]="true" (onFocus)="$event.target.setSelectionRange(0, $event.target.value.length)" (onSelect)="selectItem()"
              [disabled]="globalService.user.depart !== 'center'" required>
              <ng-template let-item pTemplate="item">
                <div class="ui-helper-clearfix panel-1" style="width: 80vw; max-width: 260px">
                  {{item.value || ''}} : {{item.label  || ''}}
                </div>
              </ng-template>
            </p-autoComplete>
          </div>
          <div class="p-col-12 b0">
            <label for="depart_name">ชื่อหน่วยงาน</label>
            <input type="text" pInputText id="depart_name" name="depart_name" [(ngModel)]="dataItem.depart_name"
            [disabled]="!globalService.isAdmin" required />
          </div>
          <div class="p-col-12 b0">
            <label for="depart_type">ประเภทหน่วยงาน</label>
            <p-dropdown inputId="depart_type" [options]="globalService.departTypeLists" [(ngModel)]="dataItem.depart_type"
            [disabled]="globalService.user.depart !== 'center'" name="depart_type" required appendTo="body"
            placeholder="โปรดระบุ" [style]="{'width':'100%'}">
            </p-dropdown>
          </div>
          <div class="p-col-12 b0">
            <label for="depart_address">ที่อยู่</label>
            <textarea pInputTextarea id="depart_address" name="depart_address" [(ngModel)]="dataItem.depart_address"
            [disabled]="!globalService.isAdmin" style="width: 100%"></textarea>
          </div>
          <div class="p-col-12">
            <label for="depart_remark">หมายเหตุ</label>
            <textarea pInputTextarea id="depart_remark" name="depart_remark" [(ngModel)]="dataItem.depart_remark"
            [disabled]="!globalService.isAdmin" style="width: 100%"></textarea>
          </div>
          <div class="p-col-12" *ngIf="globalService.user.depart === 'center'">
            <label for="depart_line_token">Line Token</label>
            <input type="text" pInputText id="depart_line_token" name="depart_line_token" [(ngModel)]="dataItem.depart_line_token"
            [disabled]="!globalService.isAdmin" />
          </div>
          <div class="p-col-12" *ngIf="globalService.user.depart === 'center'">
            <p-checkbox [(ngModel)]="dataItem.depart_autosave" binary="true" name="depart_autosave" label="Autosave เมื่อคีย์รายการเบิก/ขอเบิก"></p-checkbox>
          </div>
          <div class="p-col-12 rtx" *ngIf="globalService.isAdmin">
            <button *ngIf="globalService.user.depart == 'center' && dataItem.depart_id !== 'center'"
            type="button" class="ui-button-danger" pButton icon="pi pi-trash"
            [disabled]="!dataForm.form.valid || !dataItem.depart_id" (click)="deleteData()"></button>
            <button type="button" pButton icon="pi pi-save" label="บันทึก" (click)="saveData()"
            [disabled]="!dataForm.form.valid || !dataItem.depart_id" style="width: auto;margin-left: .5em;"></button>
          </div>
        </div>
      </form>
    </div>`,
  styles: []
})
export class DepartComponent implements OnInit {

  @Input() isDialog: boolean;

  dataItem: any;

  constructor(
    public globalService: GlobalService,
    private menuService: MenuService,
    private myMsgService: MyMsgService,
    private xfunc: FuncService) { }

  ngOnInit() {
    if (!this.isDialog) {
      this.menuService.setTitleSystem(6)
    }
    this.newItem()
    this.globalService.getDepart().then(() => {
      const found = this.globalService.departs.find(x => x.depart_id === this.globalService.user.depart)
      this.dataItem = Object.assign({}, found);
      this.dataSelect = { label: found.depart_name, value: found.depart_id };
    })
  }

  newItem() {
    this.dataItem = {
      depart_id: null, depart_name: null, depart_address: null, depart_remark: null,
      depart_line_token: null, depart_type: null, depart_autosave: false
    }
  }

  dataSelect: any; filteredResults = [];
  filterResults(event) {
    this.filteredResults = this.xfunc.filterList(event.query, this.globalService.departTable, ['label', 'value']);
  }

  selectItem() {
    if (this.dataSelect && typeof this.dataSelect !== 'object') {
      let found = this.globalService.departTable.find(x => (x.value || '').toUpperCase() === this.dataSelect.toUpperCase())
      if (found) { this.dataSelect = { ...found } };
    }
    if (this.dataSelect && typeof this.dataSelect === 'object') {
      const found = this.globalService.departs.find(x => x.depart_id === this.dataSelect.value)
      this.dataItem = Object.assign({}, found);
    } else {
      this.newItem()
      this.dataItem.depart_id = this.dataSelect
    }
  }

  deleteData() {
    this.myMsgService.msgBox(`ต้องการที่จะลบหน่วยงานนี้ใช่หรือไม่?`, 'ลบหน่วยงาน', 'warning', () => {
      setTimeout(() => {
        this.myMsgService.msgBox('ยืนยันที่จะลบหน่วยงานนี้ใช่หรือไม่?', 'ยืนยันการลบหน่วยงาน', 'warning', () => {
          this.globalService.deleteSelectId(0, this.dataItem.depart_id).subscribe((result: any) => {
            const pos = this.globalService.departTable.findIndex(x => x.value === this.dataItem.depart_id);
            if (pos > -1) { this.globalService.departTable.splice(pos, 1) }
            const empos = this.globalService.departs.findIndex(x => x.depart_id === this.dataItem.depart_id);
            if (empos > -1) { this.globalService.departs.splice(empos, 1) }
            this.newItem()
            this.myMsgService.msgBox(result.message, 'ลบหน่วยงาน', 'info', null);
          }, error => {
            this.myMsgService.msgBox('รหัสหน่วยงานนี้อาจมีการใช้งานไปก่อนแล้ว หรือ ' + error, '', 'error', null);
          })
        })
      }, 300);
    })
  }

  saveData() {
    this.myMsgService.msgBox(`ต้องการที่จะบันทึกหน่วยงานนี้ใช่หรือไม่?`, 'บันทึกหน่วยงาน', 'question', () => {
      this.myMsgService.showLoading()
      this.globalService.saveDepart({ data: this.dataItem }).subscribe((result: any) => {
        const item = {
          value: this.dataItem.depart_id,
          label: this.dataItem.depart_name
        };
        const pos = this.globalService.departTable.findIndex(x => x.value === this.dataItem.depart_id);
        if (pos > -1) {
          this.globalService.departTable.splice(pos, 1, item);
        } else {
          this.globalService.departTable.push(item);
        }
        const empos = this.globalService.departs.findIndex(x => x.depart_id === this.dataItem.depart_id);
        if (empos > -1) {
          this.globalService.departs.splice(empos, 1, this.dataItem);
        } else {
          this.globalService.departs.push(this.dataItem);
        }
        this.dataSelect = item
        this.myMsgService.msgBox(result.message, 'บันทึกหน่วยงาน', 'info', null);
      })
    })
  }

}
