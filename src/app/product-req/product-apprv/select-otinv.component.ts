import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { GlobalService } from '../../service/global.service';
import { DataService } from '../../service/data.service';
import { MyMsgService } from '../../service/msg.service';
import { FuncService } from '../../service/xfunc.service';

@Component({
  selector: 'app-select-otinv',
  template: `
    <p-dataView #dv [value]="otItem" [paginator]="true" [rows]="6" [alwaysShowPaginator]="false"
    emptyMessage="ไม่พบข้อมูล" (onPage)="page = $event.first">
      <p-header>
        <div class="p-grid p-nogutter p-align-center">
          <div class="p-col b0">
            <label for="tdate1">ตั้งแต่วันที่: &nbsp;</label>
            <p-calendar inputId="tdate1" [(ngModel)]="tdate1" dateFormat="dd/mm/yy" [locale]="th"
            name="tdate1" required [minDate]="minDate" [inputStyle]="{'width': '130px'}">
            </p-calendar>
          </div>
          <div class="p-col-fixed ctx" style="font-size: .9em;width: 70px;">
            <button type="button" pButton icon="pi pi-search" label="ค้นหา" [disabled]="!tdate1"
            style="width: auto" (click)="getOtList()"></button>
          </div>
        </div>
      </p-header>
      <p-footer>
        <div class="rtx">
          <button type="button" pButton icon="pi pi-check" label="บันทึกเป็นใบนำส่ง" (click)="addToApprv()"
          *ngIf="hasSelect"></button>
          <button type="button" pButton class="ui-button-secondary ui-button-raised" icon="pi pi-times" label="ยกเลิก"
          style="margin-left: .5em" (click)="closeDialog()"></button>
        </div>
      </p-footer>
      <ng-template let-item let-rowIndex="rowIndex" pTemplate="listItem">
        <div class="p-grid p-nogutter" style="padding: 3px 0;font-size: .95em;">
          <div class="p-col-fixed ctx" style="width: 40px;">
            <p-checkbox [(ngModel)]="item.select" binary="true" name="select"></p-checkbox>
          </div>
          <div class="p-col">
            <div>{{item.StInvID}} : {{item.StInvDate | shortDate}} : {{item.StInvRef}}</div>
            <div class="p-grid p-nogutter">
              <div class="p-col-7">{{item.depart_name}}</div>
              <div class="p-col-5">
                <p-checkbox [(ngModel)]="item.StInvApprove" label="ตรวจสอบแล้ว" binary="true" name="StInvApprove"></p-checkbox>
              </div>
            </div>
          </div>
        </div>
        <hr style="width: 100%;border: 0.5px solid #d0d0d0;margin: 0;">
      </ng-template>
    </p-dataView>
  `,
  styles: [``]
})
export class SelectOtinvComponent implements OnInit {

  @Input() depart: string;
  @Output() onClose = new EventEmitter();

  th: any;
  otItem = [];
  departQuery: string;
  tdate1: Date; minDate: Date;
  page = 0;

  constructor(
    private globalService: GlobalService,
    private dataService: DataService,
    private myMsgService: MyMsgService,
    private xfunc: FuncService
  ) { }

  ngOnInit() {
    this.th = this.xfunc.getLocale('th');
    if (this.depart) {
      this.departQuery = this.depart ? `AND StInvCust = '${this.depart}'` : ''
    } else {
      const departList = this.globalService.departTable.map(x => x.value);
      this.departQuery = 'AND StInvCust IN ("' + departList.join('","') + '")';
    }
    this.tdate1 = new Date(); this.tdate1.setDate(this.tdate1.getDate() - 7);
    this.minDate = new Date(); this.minDate.setMonth(this.minDate.getMonth() - 3);
    this.getOtList()
  }

  getOtList() {
    const criteria = `[StInvDate] >= ${this.xfunc.convertFromDate(this.tdate1)} ${this.departQuery} AND StInvUpdate = True`
    const query = {
      field: 'StInvID, StInvDate, StInvCust, StInvRef',
      table: 'OutInvoice',
      where: criteria,
      order: 'StInvDate DESC'
    }
    this.myMsgService.showLoading()
    this.dataService.getData(query).subscribe((result: any) => {
      this.myMsgService.clearLoading()
      result.forEach(r => {
        r.select = false; r.StInvApprove = false;
        r.depart_name = this.globalService.departTable.find(x => x.value === r.StInvCust).label
      });
      this.otItem = result
    })
  }

  get hasSelect() { return this.otItem.some(x => x.select) }

  addToApprv() {
    this.myMsgService.msgBox(`ต้องการที่จะบันทึกใบเบิกเหล่านี้เป็นใบนำส่งวัสดุ ใช่หรือไม่?`, 'บันทึกเป็นใบนำส่ง', 'question', () => {
      setTimeout(() => {
        this.myMsgService.msgBox(`ยืนยันที่จะบันทึกใบเบิกเป็นใบนำส่งวัสดุ ใช่หรือไม่?`, 'ยืนยันการบันทึก', 'warning', () => {
          this.myMsgService.showLoading();
          const data = this.otItem.filter(x => x.select);
          this.globalService.saveFromOT({ data: data }).subscribe((result: any) => {
            if (result.err_code === 0) {
              this.myMsgService.msgBox(result.message, 'บันทึกเป็นใบนำส่ง', 'info', null);
              this.onClose.emit(true)
            } else {
              this.myMsgService.msgBox(result.message, '', 'error', null);
            }
          })
        })
      }, 300)
    })
  }

  closeDialog() {
    this.onClose.emit(false)
  }
}
