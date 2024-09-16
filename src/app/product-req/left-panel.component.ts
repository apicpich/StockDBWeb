import { Component, OnInit, Input, Output, EventEmitter, OnDestroy } from '@angular/core';
import { EventService } from '../service/event.service';
import { Subscription } from 'rxjs';
import { GlobalService } from '../service/global.service';

const compare = (a, b): number => {
  let nameA = a.id.toLowerCase()
  let nameB = b.id.toLowerCase()
  return nameA.localeCompare(nameB)
}
const now = new Date()

@Component({
  selector: 'app-left-req',
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
            <div>{{item.name}}</div>
            <div *ngIf="!item.approve" style="color: #ff8e20">(ยังไม่ได้ตรวจสอบ)</div>
          </div>
        </div>
        <div *ngIf="todayItems.length">
          <div class="ctx" [ngClass]="prop[pageType].class" style="font-weight: bold">
            {{prop[pageType].title}} ({{todayItems.length}})
          </div>
          <div *ngFor="let item of todayItems" style="color: green" class="item-list" (click)="selectItem(item)">
            <b>{{item.id}}</b>: &nbsp; {{item.ref}}
            <div>{{item.name}}</div>
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
    { class: 'rqinv', title: 'รายการขอเบิกวันนี้', notUpdate: 'รออนุมัติ' },
    { class: 'posinv', title: 'รายการนำส่งวันนี้', notUpdate: 'รอรับเข้า' },
  ];

  itemSubscription: Subscription;

  constructor(
    private eventService: EventService,
    private globalService: GlobalService,
  ) { }

  ngOnInit() {
    this.itemSubscription = this.eventService.invSocketItem$.subscribe((result: any) => {
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
    data.forEach(el => {
      if (this.notUpdateItems.length) {
        const pos = this.notUpdateItems.findIndex(x => x.id === el.id);
        if (pos > -1) { this.notUpdateItems.splice(pos, 1) };
      }
      if (this.todayItems.length) {
        const pos = this.todayItems.findIndex(x => x.id === el.id);
        if (pos > -1) { this.todayItems.splice(pos, 1) };
      }
    })
  }

  itemSocketUpdate(data) {
    let notUpdateSort = false, todaySort = false;
    data.forEach(el => {
      const pos = this.notUpdateItems.findIndex(x => x.id === el.id);
      if (pos > -1) {
        if (el.update) {
          this.notUpdateItems.splice(pos, 1)
        } else {
          // if (this.pageType === 1 && this.globalService.currentDepart === el.depart) {
          //   if (el.approve) {
          //     this.notUpdateItems.splice(pos, 1, el)
          //   } else {
          //     this.notUpdateItems.splice(pos, 1)
          //   }
          // } else {
            this.notUpdateItems.splice(pos, 1, el)
          // }
        }
      } else {
        // if (this.globalService.currentDepart === 'center' ||
        //   (this.globalService.currentDepart === el.depart && el.approve)) {
        if (this.globalService.currentDepart === 'center' || this.globalService.currentDepart === el.depart) {
            if (!el.update) {
            this.notUpdateItems.push(el)
            notUpdateSort = true
            // this.notUpdateItems.sort(compare)
          }
        }
      }
      const pos2 = this.todayItems.findIndex(x => x.id === el.id);
      if (pos2 > -1) {
        if (el.update) {
          this.todayItems.splice(pos2, 1, el)
        } else {
          this.todayItems.splice(pos2, 1)
        }
      } else {
        if (this.globalService.currentDepart === 'center' || this.globalService.currentDepart === el.depart) {
          if (el.update) {
            this.todayItems.push(el)
            todaySort = true
            // this.todayItems.sort(compare)
          }
        }
      }
    })
    if (notUpdateSort) this.notUpdateItems.sort(compare);
    if (todaySort) this.todayItems.sort(compare);
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