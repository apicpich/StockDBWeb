import { Component, OnInit, Input } from '@angular/core';
import { GlobalService } from '../../service/global.service';
import { FuncService } from '../../service/xfunc.service';

@Component({
  selector: 'app-req-print',
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
            <div style="width: 23%">{{data.pd_name}}</div>
            <div style="width: 9%" class="ctx p0">{{data.DtPack}} {{data.pd_unit}}</div>
            <div style="width: 7%" class="rtx">{{data.DtPrice | currency:'THB':''}}</div>
            <div style="width: 5%" class="ctx p0">{{(data.DtMonthBefore / data.DtPack) | number:'1.0-2'}}</div>
            <div style="width: 5%" class="ctx p0">{{(data.DtMonth / data.DtPack) | number:'1.0-2'}}</div>
            <div style="width: 5%" class="ctx p0">{{(data.DtStockNow / data.DtPack) | number:'1.0-2'}}</div>
            <div style="width: 5%" class="ctx p0">{{(data.DtRQAmount / data.DtPack) | number:'1.0-2'}}</div>
            <div style="width: 9%" class="rtx">{{(data.DtRQAmount / data.DtPack * data.DtPrice) | currency:'THB':''}}</div>
            <div style="width: 5%" class="ctx">{{data.DtAmount | number:'1.0-2'}}</div>
            <div style="width: 5%" class="ctx p0" [style.color]="((data.DtRQAmount / data.DtPack) - data.DtAmount) > 0 ? 'red' : 'inherit'">
              {{((data.DtRQAmount / data.DtPack) - data.DtAmount) | number:'1.0-2'}}
            </div>
            <div style="width: 9%;padding-right: .25em" class="rtx">{{(data.DtAmount * data.DtPrice) | currency:'THB':''}}</div>
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
          <div style="font-size: 1.5em;font-weight: bold">ใบขอเบิกวัสดุ</div>
        </div>
        <div class="p-col-4">เลขที่ขอเบิก: {{inv.StInvID}}<br>หน่วยงาน: {{inv.depart_name}}</div>
        <div class="p-col-4">วันที่: {{inv.StInvDate | shortDate:'th'}}<br>เลขที่อ้างอิง: {{inv.StInvRef}}</div>
        <div class="p-col-4 rtx" style="padding-right: 1.5em">
          <div *ngIf="!inv.StInvUpdate">รออนุมัติ</div>
          <div *ngIf="inv.StInvUpdate">ผู้โอนใบเบิก: {{inv.StKeyApprove}}<br>{{inv.StInvDateUpdate | longDate:'th'}}</div>
        </div>
        <div class="p-col-8" style="height: 42px;overflow: hidden;">หมายเหตุ: {{inv.StInvMemo}}</div>
        <div class="p-col-4 rtx" style="padding-right: 1.5em">สถานะ: {{inv.status_name}}<br>ผู้บันทึก: {{inv.StKeyUser}}</div>
      </div>
      <div class="p-grid">
        <div class="p-col-12" style="padding-right: 1.5em;font-size: 0.8em;">
          <table class="collapse ctx">
            <tr>
              <td rowspan="2" style="width:5%">ลำดับ</td><td rowspan="2" style="width:7%">รหัส</td><td rowspan="2" style="width:24%">ชื่อวัสดุ</td>
              <td rowspan="2" style="width:9%">ขนาดบรรจุ</td><td rowspan="2" style="width:7%">ต้นทุน</td><td colspan="2" style="width:10%">อัตราการใช้</td>
              <td rowspan="2" style="width:5%">คงคลัง</td><td rowspan="2" style="width:5%">ขอเบิก</td><td rowspan="2" style="width:9%">มูลค่าขอเบิก</td>
              <td rowspan="2" style="width:5%">ให้เบิก</td><td rowspan="2" style="width:5%">ขาด</td><td rowspan="2" style="width:9%">มูลค่าให้เบิก</td>
            </tr>
            <tr>
              <td>{{getThMonth(1)}}</td><td>{{getThMonth(0)}}</td>
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
              <td style="width:64%;padding-left: 0.5em">รวมทั้งสิ้น {{dt.length}} รายการ</td>
              <td class="rtx" style="width:18%;padding-right: 0.5em">{{total | currency:'THB':''}}</td>
              <td class="rtx" style="width:18%;padding-right: 0.5em">{{total2 | currency:'THB':''}}</td>
            </tr>
          </table>
        </div>
        <div class="p-col-12" style="padding-right: 1.5em">
          <table class="ctx" style="width: 100%">
            <tr class="footer-row">
              <td>
                ลงชื่อ..................................<br>
                (ผู้บันทึก)<br>
                <div class="mt5">วันที่......../............./............</div>
              </td>
              <td>
                ลงชื่อ..................................<br>
                (ผู้ขอเบิก)<br>
                <div class="mt5">วันที่......../............./............</div>
              </td>
              <td>
                ลงชื่อ..................................<br>
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
    .header, .header-space { height: 190px; }
    .footer { height: 165px; }
    .footer-space { height: 150px; }
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
      width:33%;
      padding-top: 2em;
    }
    .mt5 {
      padding-top: .5em;
    }
    @media screen {
      :host { display: none; }
    }
  `]
})
export class ProductReqPrintComponent implements OnInit {

  @Input() inv: any;
  @Input() dt: any;
  @Input() total: number;
  @Input() total2: number;

  totalText = '';

  constructor(private globalService: GlobalService, private xfunc: FuncService) { }

  ngOnInit() {
    this.inv.depart_name = this.globalService.departTable.find(x => x.value === this.inv.StInvDepart).label;
    this.inv.status_name = this.globalService.statusTable.find(x => x.value === this.inv.StInvStatus).label;
  }

  getThMonth(mnt) { return this.xfunc.getThMonth(mnt, new Date(this.inv.StInvDate)) }

}
