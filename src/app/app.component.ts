import { Component, ElementRef, Renderer2, HostListener, ViewChild } from '@angular/core';
import { GlobalService } from './service/global.service';
import { EventService } from './service/event.service';
import { MenuService } from './service/menu.service';
import { environment } from './../environments/environment';
import * as io from 'socket.io-client';

import { Router, RouterEvent, RouteConfigLoadStart, RouteConfigLoadEnd } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { MyMsgService } from './service/msg.service';
import { Subscription } from 'rxjs';
import { FuncService } from './service/xfunc.service';
import { OverlayPanel } from 'primeng/overlaypanel';

const audio = new Audio('assets/sounds/beep.mp3');
const refreshTokenTime = 15 * 60000;
const resizeTime = 400;

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {

  mainItems: MenuItem[];
  resizeTask: any;

  isLoadSubscript: Subscription;
  isLoading = false;

  socket: any;
  startUpSubscript: Subscription;
  notiItems = [];
  notiState0Count = 0;
  flipStart = false;
  lnRemain = 0; lnDepart = ''

  dpOpen = false;
  page = 0; opOpen = false;
  @ViewChild('dp') dp: OverlayPanel;
  @ViewChild('op') op: OverlayPanel;
  idleTime: number; isIdleTimeOut = false;
  resizeTime: number; isResizeTimeOut = false; 

  @HostListener('window:scroll')
  hideInvalidItemPanel() {
    if (this.dpOpen) {
      this.dp.hide()
      this.dpOpen = false
    }
    if (this.opOpen) {
      this.op.hide()
      this.opOpen = false
    }
  }

  @HostListener('window:mousemove')
  @HostListener('window:mousedown')
  @HostListener('window:touchstart')
  @HostListener('window:click')
  @HostListener('window:keypress')
  resetTimer() {
    this.idleTime = Date.now()
    if (this.isIdleTimeOut === false) {
      this.isIdleTimeOut = true
      setTimeout(() => { this.timeOut() }, refreshTokenTime);
    }
    // 1000 milliseconds = 1 second
  }

  timeOut() {
    if (Date.now() - this.idleTime < refreshTokenTime) {
      setTimeout(() => { this.timeOut() }, refreshTokenTime);
    } else {
      this.isIdleTimeOut = false
      this.globalService.logOut()
    }
  }

  @HostListener('window:resize')
  resetResize() {
    this.resizeTime = Date.now()
    if (this.isResizeTimeOut === false) {
      this.isResizeTimeOut = true
      setTimeout(() => { this.endResize() }, resizeTime);
    }
  };

  endResize() {
    if (Date.now() - this.resizeTime < resizeTime) {
      setTimeout(() => { this.endResize() }, resizeTime);
    } else {
      this.isResizeTimeOut = false
      const vh = window.innerHeight * 0.01;
      this.renderer.setProperty(this.elementRef.nativeElement, 'style', `--vh: ${vh}px`);
      this.eventService.getWindowsSize(window.innerWidth)
    }
  }
  
  get isCenterUser() { return this.globalService.user.depart === 'center' }

  constructor(
    public globalService: GlobalService,
    private eventService: EventService,
    public menuService: MenuService,
    private myMsgService: MyMsgService,
    public router: Router,
    private elementRef: ElementRef,
    private renderer: Renderer2,
    private xfunc: FuncService
  ) {
    this.socket = io(environment.API_URL);
  }

  ngOnInit() {
    this.mainItems = this.menuService.menu;
    let vh = window.innerHeight * 0.01;
    this.renderer.setProperty(this.elementRef.nativeElement, 'style', `--vh: ${vh}px`);
    this.onPrint()
    this.eventSubscription()
    this.socketRegister()
  }

  eventSubscription() {
    //lazy load indicator
    this.router.events.subscribe((event: RouterEvent): void => {
      if (event instanceof RouteConfigLoadStart) {
        this.myMsgService.showLoading();
      } else if (event instanceof RouteConfigLoadEnd) {
        this.myMsgService.clearLoading();
      }
    });
    this.isLoadSubscript = this.myMsgService.isLoading.subscribe(result => {
      setTimeout(() => {
        this.isLoading = result
      });
    })
    this.startUpSubscript = this.eventService.startUp$.subscribe((data: any) => {
      //startup noti
      if (!this.isCenterUser) {
        this.notiItems = data.filter(x => x.approve);
      } else {
        this.notiItems = data
      }
      this.notiState0Count = this.notiItems.filter(x => !x.update).length;
    })
  }

  socketRegister() {
    this.socket.on('updateItem', (data) => {
      if (this.globalService.isLogin) {
        if (data.isDelete) {
          this.globalService.itemFromSocketDelete(data)
        } else {
          this.globalService.itemFromSocketUpdate(data)
        }
      }
    })
    this.socket.on('updateInvItem', (data) => {
      if (this.globalService.isLogin) {
        this.eventService.setInvSocketItem(data)
        if (this.isCenterUser) {
          if (data.invType === 0) {
            this.setNotiItemsFromSocket(data)
          }
        } else {
          if (data.invType === 1) {
            this.setNotiItemsFromSocket(data)
          }
        }
      }
    })
    this.socket.on('line1', (data) => {
      if (this.globalService.isLogin) {
        this.lnDepart = data.depart
        this.lnRemain = data.remaining
      }
    })
    this.socket.on('centerInvItem', (data) => {
      if (this.globalService.isLogin) {
        this.eventService.setCenterInvSocketItem(data)
      }
    })
  }

  setNotiItemsFromSocket(result) {
    const { invType, isDelete, stateUpdate, data } = result;
    let needSort = false, needPlaySound = false;
    data.forEach(el => {
      const posIndex = this.notiItems.findIndex(x => x.id === el.id);
      if (posIndex > -1) {
        if (isDelete) {
          this.notiItems.splice(posIndex, 1);
        } else {
          if (invType === 1) {
            if (stateUpdate) {
              Object.assign(this.notiItems[posIndex], el)
              // this.sortNotiItems()
              needSort = true
            } else {
              if (!el.approve) {
                this.notiItems.splice(posIndex, 1);
              }
            }
          } else {
            Object.assign(this.notiItems[posIndex], el)
            if (stateUpdate) {
              // this.sortNotiItems()
              needSort = true
            }
          }
        }
      } else {
        if (this.isCenterUser || el.depart === this.globalService.user.depart) {
          const now = new Date()
          if (el.update) {
            if (this.xfunc.dateToText(el.inv_date) === this.xfunc.dateToText(now)) {
              this.notiItems.push(el)
              // this.sortNotiItems()
              needSort = true
            }
          } else {
            if (invType === 0 || el.approve) {
              this.notiItems.push(el)
              needSort = true
              if (el.approve) { needPlaySound = true };
              // this.sortNotiItems()
              if (this.xfunc.dateToText(el.inv_date) === this.xfunc.dateToText(now)) {
                needPlaySound = true
              }
            }
          }
        }
      }
    });
    this.notiState0Count = this.notiItems.filter(x => !x.update).length;
    if (needSort) this.sortNotiItems();
    if (needPlaySound) {
      audio.play()
      if (!this.flipStart) this.flipStart = true
      setTimeout(() => {
        this.flipStart = false
      }, 4000);
    }
  }
  sortNotiItems() {
    let tempItem = [...this.notiItems];
    tempItem.sort((a, b): number => {
      return a.id.localeCompare(b.id, 'th', {sensitivity: 'base'})
    })
    const state0Items = tempItem.filter(x => !x.update);
    const state1Items = tempItem.filter(x => x.update);
    this.notiState0Count = state0Items.length
    this.notiItems = [...state0Items, ...state1Items];
  }

  get notiNumDisplay() {
    if (this.notiState0Count) {
      return this.notiState0Count.toString()
    } else {
      return this.notiItems.length.toString()
    }
  }
  
  openOrderDialog(item) {
    if (this.isCenterUser) {
      this.router.navigate(['/req/in', { id: item.id }]);
    } else {
      if (this.router.url === '/inv/in') {
        this.eventService.onNotiClick(item)
      } else {
        this.router.navigate(['/req/apprv', { id: item.id }]);
      }
    }
  }

  dpToggle(event) {
    if (this.dpOpen) {
      this.dp.hide()
      this.dpOpen = false
    } else {
      if (this.globalService.isLogin && this.isCenterUser) {
        this.dp.show(event)
      }
    }
  }

  setDepart(item) {
    if (item.depart_id !== this.globalService.currentDepart) {
      this.globalService.currentDepart = item.depart_id
      this.menuService.setUser(this.globalService.user)
      if (item.depart_id !== 'center') {
        this.globalService.resetDepart()
        this.globalService.setDepartRate().subscribe(result => { })
      }
      const menuPath = this.menuService.currentMenu.split('-')
      if (menuPath.length > 1 && item.depart_id === 'center' && ['1', '2', '3'].includes(menuPath[0])) {
        this.router.navigate(['/home'])
      } else {
        this.eventService.setDepart(item.depart_id)
      }
    }
  }

  onPrint() {
    let beforePrint = () => {
      // console.log('Functionality to run before printing.');
      this.globalService.isPrint = true;
    };
    let afterPrint = () => {
      // console.log('Functionality to run after printing');
      this.globalService.isPrint = false;
    };
    window.onbeforeprint = beforePrint;
    window.onafterprint = afterPrint;
  }

  ngOnDestroy(): void {
    //Called once, before the instance is destroyed.
    //Add 'implements OnDestroy' to the class.
    this.isLoadSubscript.unsubscribe()
    this.startUpSubscript.unsubscribe()
    this.socket.off()
    this.socket.close()
  }

}
