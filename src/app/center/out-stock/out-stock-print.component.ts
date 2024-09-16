import { Component, OnInit, Input } from '@angular/core';
import { DataService } from '../../service/data.service';
import { FuncService } from '../../service/xfunc.service';

@Component({
  selector: 'app-out-stock-print',
  template: `
    <table style="margin-top: -40px">
      <thead><tr><td>
        <div class="header-space">&nbsp;</div>
      </td></tr></thead>
      <tbody><tr><td style="padding: 0">
        <div class="content">
          <ng-container *ngFor="let data of dt; index as i">
          <div class="body-row">
            <div style="width: 5%" class="ctx">{{i + 1}}</div>
            <div style="width: 8%">{{data.DtDrugID}}</div>
            <div style="width: 25%">{{data.DrugNameText}}</div>
            <div style="width: 9%" class="ctx p0">{{data.DtLot}}</div>
            <div style="width: 9%" class="ctx p0" [style.color]="isExp(data.DtExp)">{{data.DtExp | shortDate}}</div>
            <div style="width: 8%" class="ctx p0">{{data.DtStock | number:'1.0-2'}}</div> 
            <div style="width: 11%" class="ctx p0">{{data.DtAmount | number:'1.0-2'}} x {{data.DtPack}}</div>
            <div style="width: 7%" class="ctx p0">{{data.DrugUnit}}</div>
            <div style="width: 8%;padding-right: .25em" class="rtx">{{data.DtPrice | currency:'THB':''}}</div>
            <div style="width: 10%;padding-right: .25em" class="rtx">{{(data.DtAmount * data.DtPrice) | currency:'THB':''}}</div>
          </div>
          </ng-container>
        </div>
      </td></tr></tbody>
      <tfoot><tr><td>
        <div class="footer-space">&nbsp;</div>
      </td></tr></tfoot>
    </table>

    <div class="header">
      <div class="p-grid" style="margin-top:0">
        <div class="p-col-12">
          <div style="font-size: 1.5em;font-weight: bold">ใบเบิกวัสดุ</div>
        </div>
        <div class="p-col-4">เลขที่เบิก: {{inv.StInvID}}<br>หน่วยเบิก: {{inv.CustName}}</div>
        <div class="p-col-4">วันที่: {{inv.StInvDate | shortDate:'th'}}<br>เลขที่อ้างอิง: {{inv.StInvRef}}</div>
        <div class="p-col-4 rtx" style="padding-right: 1.5em">
          <div *ngIf="!inv.StInvUpdate">ยังไม่ได้เบิกออก</div>
          <div *ngIf="inv.StInvUpdate">เบิกจ่ายแล้ว<br>{{inv.StInvDateUpdate | longDate:'th'}}</div>
        </div>
        <div class="p-col-8" style="height: 42px;overflow: hidden;">หมายเหตุ: {{inv.StInvMemo}}</div>
        <div class="p-col-4 rtx" style="padding-right: 1.5em">สถานะ: {{inv.status_name}}<br>ผู้บันทึก: {{inv.StKeyUser}}</div>
      </div>
      <div class="p-grid">
        <div class="p-col-12" style="padding-right: 1.5em;font-size: 0.8em;">
          <table class="collapse ctx">
            <tr>
              <td style="width:5%">ลำดับ</td><td style="width:8%">รหัส</td><td style="width:25%">ชื่อวัสดุ</td>
              <td style="width:9%">Lot No.</td><td style="width:9%">วันหมดอายุ</td>
              <td style="width:8%">คงคลัง</td><td style="width:11%">จำนวนเบิก</td>
              <td style="width:7%">หน่วย</td><td style="width:8%">ต้นทุน</td><td style="width:10%">มูลค่า</td>
            </tr>
          </table>
        </div>
      </div>
    </div>
    <div class="footer">
      <div class="p-grid" style="margin-top: 0">
        <div class="p-col-12" style="padding-right: 1.25em">
          <table class="collapse">
            <tr>
              <td style="width:50%;padding-left: 0.5em">รวมทั้งสิ้น {{dt.length}} รายการ</td>
              <td class="rtx" style="width:50%;padding-right: 0.5em">รวมมูลค่า {{total | currency:'THB':''}}</td>
            </tr>
          </table>
        </div>
        <div class="p-col-12" style="padding-right: 1.5em">
          <table class="ctx" style="width: 100%">
            <tr class="footer-row">
              <td>
                ลงชื่อ.................................................<br>
                (ผู้เบิกวัสดุ)<br>
                <div class="mt5">วันที่......../............./............</div>
              </td>
              <td>
                ลงชื่อ.................................................<br>
                (ผู้จ่ายวัสดุ)<br>
                <div class="mt5">วันที่......../............./............</div>
              </td>
            </tr>
            <tr class="footer-row">
              <td>
                ลงชื่อ.................................................<br>
                (ผู้รับวัสดุ)<br>
                <div class="mt5">วันที่......../............./............</div>
              </td>
              <td>
                ลงชื่อ.................................................<br>
                (ผู้อนุมัติ)<br>
                <div class="mt5">วันที่......../............./............</div>
              </td>
            </tr>
          </table>
        </div>
      </div>

    </div>
  `,
  styles: [`
    .header, .header-space { height: 165px; }
    .footer { height: 240px; } 
    .footer-space { height: 225px; }
    .header { position: fixed; top: 0;width: 100% }
    .footer { position: fixed; bottom: 0;width: 100% }
    .collapse td {
      border: 1px solid black;
      padding: .5em 0;
    }
    .collapse th {
      border: 1px solid black;
      padding: .25em;
    }
    .collapse {
      border-collapse: collapse;
      width: 100%
    }
    .content {
      font-size: .8em;
      width: 100vw;
    }
    .body-row {
      display: flex;
      width: 100%;
      padding: .25em 0;
    }
    .footer-row td {
      width:50%;
      padding-top: 1.5em;
    }
    .mt5 {
      padding-top: .5em;
    }
    @media screen {
      :host { display: none; }
    }
  `]
})
export class OutStockPrintComponent implements OnInit {

  @Input() inv: any;
  @Input() dt: any;
  @Input() total: number;

  totalText = '';

  constructor(private dataService: DataService, private xfunc: FuncService) { }

  ngOnInit() {
    this.inv.CustName = this.dataService.CustomersLists.find(x => x.value === this.inv.StInvCust).label;
    this.inv.status_name = this.dataService.StatusTypeTable.find(x => x.value === this.inv.StInvStatus).label;
  }

  isExp(date) {
    return this.xfunc.colorExp(date);
  }

}
