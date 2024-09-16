import { Component, OnInit, Input, Output, EventEmitter, OnDestroy } from '@angular/core';
import { DataService } from '../service/data.service';
import { EventService } from '../service/event.service';
import { Subscription } from 'rxjs';
import { FuncService } from '../service/xfunc.service';

const compare = (a, b): number => {
  let nameA = a.id.toLowerCase()
  let nameB = b.id.toLowerCase()
  return nameA.localeCompare(nameB)
}
const now = new Date()

@Component({
  selector: 'app-left-panel',
  template: `
    <div style="padding-top: 6px">
      <div class="inv-header ctx" [ngClass]="prop[pageType].class">
        <span style="font-weight: bold">รายการวันนี้</span>
      </div>
      <div class="content-show" [ngClass]="{'popup': isPopUp}">
        <div class="ctx" *ngIf="!todayItems.length && !notUpdateItems.length">-- ไม่มีรายการ --</div>
        <div *ngIf="notUpdateItems.length" style="margin-bottom: 1em">
          <div class="ctx" [ngClass]="prop[pageType].class" style="font-weight: bold;color: #ff5722;">
            {{prop[pageType].notUpdate}} ({{notUpdateItems.length}})
          </div>
          <div *ngFor="let item of notUpdateItems" class="item-list" (click)="selectItem(item)">
            <b>{{item.id}}</b>: &nbsp; {{item.ref}}
            <div>{{item.inv_name}}</div>
          </div>
        </div>
        <div *ngIf="todayItems.length">
          <div class="ctx" [ngClass]="prop[pageType].class" style="font-weight: bold">
            {{prop[pageType].title}} ({{todayItems.length}})
          </div>
          <div *ngFor="let item of todayItems" style="color: green" class="item-list" (click)="selectItem(item)">
            <b>{{item.id}}</b>: &nbsp; {{item.ref}}
            <div>{{item.inv_name}}</div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .item-list {
      padding: .25em 0;
      cursor: pointer;
      border-bottom: 1px solid #eeeeee;
    }
    .item-list:hover {
      background-color: #ffeeee;
    }
  `]
})
export class LeftPanelComponent implements OnInit, OnDestroy {

  @Input() pageType: number;
  @Input() isPopUp: boolean;
  @Input() todayItems: any[];
  @Input() notUpdateItems: any[];
  @Output() selectId = new EventEmitter();

  prop = [
    { class: 'stinv', title: 'รายการรับวันนี้', notUpdate: 'รายการยังไม่รับเข้า' },
    { class: 'otinv', title: 'รายการเบิกวันนี้', notUpdate: 'รายการยังไม่ตัดจ่าย' },
    { class: 'posinv', title: 'ใบสั่งซื้อวันนี้', notUpdate: '' },
  ];

  itemSubscription: Subscription;

  constructor(
    private eventService: EventService,
    private dataService: DataService,
    private xfunc: FuncService) { }

  ngOnInit() {
    this.itemSubscription = this.eventService.centerInvSocketItem$.subscribe((result: any) => {
      const { invType, isDelete, data } = result;
      if (invType === this.pageType) {
        if (isDelete) {
          this.itemSocketDelete(data)
        } else {
          this.itemSocketUpdate(data)
        }
      }
    })
  }

  itemSocketDelete(data) {
    if (this.notUpdateItems.length) {
      const pos = this.notUpdateItems.findIndex(x => x.id === data.id);
      if (pos > -1) { this.notUpdateItems.splice(pos, 1) };
    }
    if (this.todayItems.length) {
      const pos = this.todayItems.findIndex(x => x.id === data.id);
      if (pos > -1) { this.todayItems.splice(pos, 1) };
    }
  }

  itemSocketUpdate(data) {
    if (data.invTpye === 1) {
      data.inv_name = this.dataService.CustomersLists.find(x => x.value === data.supp_id).label;
    } else {
      data.inv_name = this.dataService.SupplierTable.find(x => x.value === data.supp_id).label;
    }
    const pos = this.notUpdateItems.findIndex(x => x.id === data.id);
    if (pos > -1) {
      if (data.inv_update) {
        this.notUpdateItems.splice(pos, 1)
      } else {
        this.notUpdateItems.splice(pos, 1, data)
      }
    } else {
      if (!data.inv_update) {
        this.notUpdateItems.push(data)
        this.notUpdateItems.sort(compare)
      }
    }
    if (this.xfunc.dateToText(data.inv_date) === this.xfunc.dateToText(now)) {
      const pos2 = this.todayItems.findIndex(x => x.id === data.id);
      if (pos2 > -1) {
        if (data.inv_update) {
          this.todayItems.splice(pos2, 1, data)
        } else {
          this.todayItems.splice(pos2, 1)
        }
      } else {
        if (data.inv_update) {
          this.todayItems.push(data)
          this.todayItems.sort(compare)
        }
      }
    }
  }

  selectItem(item) {
    this.selectId.emit(item.id)
  }

  ngOnDestroy(): void {
    //Called once, before the instance is destroyed.
    //Add 'implements OnDestroy' to the class.
    this.itemSubscription.unsubscribe()
  }
}