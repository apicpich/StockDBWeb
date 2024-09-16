import { Injectable } from '@angular/core';
import { GlobalService } from './global.service';

@Injectable({
  providedIn: 'root'
})
export class MenuService {

  constructor(private globalService: GlobalService) { }

  currentTitle: string;
  currentMenu = '';

  menuSidebarShow = false;
  closeMenu() { this.menuSidebarShow = false };

  logItems: any[] = [
    { label: 'หน้าหลัก', visible: false, icon: 'pi pi-fw pi-home', link: '/home' },
    { label: 'เข้าสู่ระบบ', visible: false, icon: 'pi pi-fw pi-sign-in', link: '/login' },
    { label: '', icon: 'pi pi-fw pi-user' },
    { separator: true },
    { label: 'เปลี่ยนรหัสผ่าน', icon: 'pi pi-fw pi-key', routerLink: '/password' },
    { label: 'เพิ่ม/แก้ไขผู้ใช้งาน', icon: 'pi pi-fw pi-user-plus', routerLink: '/user' },
    { label: 'หน่วยงาน', icon: 'pi pi-fw pi-users', routerLink: '/depart' },
    { label: 'สถานะรายการ', icon: 'pi pi-fw pi-check-square', routerLink: '/status' },
    { label: 'ออกจากระบบ', icon: 'pi pi-fw pi-sign-out', command: () => this.globalService.logOut() }
  ]

  setLogItemMenu(user) {
    this.logItems[2].label = user.user_name
    this.logItems[5].visible = (user.role === 0 && user.depart === 'center')
    this.logItems[6].visible = user.role === 0
    this.logItems[7].visible = (user.role === 0 && user.depart === 'center')
  }

  setTitleSystem(menuPos) {
    setTimeout(() => {
      this.currentTitle = this.logItems[menuPos].label;
    }, 0);
    this.currentMenu = menuPos.toString()
  }

  menu: any[] = [
    {
      label: 'ขอเบิก|นำส่ง',
      items: [
        { label: 'รายการขอเบิก', icon: 'pi pi-fw pi-window-minimize', command: () => this.closeMenu(), routerLink: '/req/in' },
        { label: 'รายการนำส่ง', icon: 'pi pi-fw pi-external-link', command: () => this.closeMenu(), routerLink: '/req/apprv' },
      ]
    },
    {
      label: 'ข้อมูลทั่วไป',
      items: [
        { label: 'รายการวัสดุ', icon: 'pi pi-fw pi-th-large', command: () => this.closeMenu(), routerLink: '/product' },
        { label: 'ผู้จำหน่าย', icon: 'pi pi-fw pi-android', command: () => this.closeMenu(), routerLink: '/supplier' },
        { label: 'หน่วยเบิก', icon: 'pi pi-fw pi-id-card', command: () => this.closeMenu(), routerLink: '/customer' },
      ]
    },
    {
      label: 'รับ|เบิก',
      items: [
        { label: 'รายการรับวัสดุ', icon: 'pi pi-fw pi-download', command: () => this.closeMenu(), routerLink: '/inv/in' },
        { label: 'รายการเบิกวัสดุ', icon: 'pi pi-fw pi-upload', command: () => this.closeMenu(), routerLink: '/inv/out' },
      ]
    },
    {
      label: 'รายงาน',
      items: [
        { label: 'รายงานคงคลัง', icon: 'pi pi-fw pi-file', command: () => this.closeMenu(), routerLink: '/report/stock' },
        { label: 'อัตราการเบิก', icon: 'pi pi-fw pi-file', command: () => this.closeMenu(), routerLink: '/report/rate' },
        { label: 'รายการรับเข้า', icon: 'pi pi-fw pi-file', command: () => this.closeMenu(), routerLink: '/report/inv/0' },
        { label: 'รายการเบิกจ่าย', icon: 'pi pi-fw pi-file', command: () => this.closeMenu(), routerLink: '/report/inv/1' },
        { label: 'ใบคุมคลัง', icon: 'pi pi-fw pi-file', command: () => this.closeMenu(), routerLink: '/report/stockcard' },
      ]
    },
    {
      label: 'ส่วนกลาง',
      items: [
        { label: 'รายการวัสดุ', icon: 'pi pi-fw pi-th-large', command: () => this.closeMenu(), routerLink: '/center/item' },
        { label: 'รายการสั่งซื้อวัสดุ', icon: 'pi pi-fw pi-shopping-cart', command: () => this.closeMenu(), routerLink: '/center/po' },
        { label: 'รายการรับวัสดุ', icon: 'pi pi-fw pi-sign-in', command: () => this.closeMenu(), routerLink: '/center/in' },
        { label: 'รายการเบิกวัสดุ', icon: 'pi pi-fw pi-sign-out', command: () => this.closeMenu(), routerLink: '/center/out' },
        { label: 'สั่งซื้อจากอัตราเบิก', icon: 'pi pi-fw pi-list', command: () => this.closeMenu(), routerLink: '/center/rate' },
        { separator: true },
        { label: 'รายงานคงคลัง', icon: 'pi pi-fw pi-file', command: () => this.closeMenu(), routerLink: '/center-report/stock' },
        { label: 'ใบคุมคลัง', icon: 'pi pi-fw pi-file', command: () => this.closeMenu(), routerLink: '/center-report/stockcard' },
        { label: 'สรุปรับตามหมวด', icon: 'pi pi-fw pi-file', command: () => this.closeMenu(), routerLink: '/center-report/incat' },
        { label: 'สรุปเบิกตามหมวด', icon: 'pi pi-fw pi-file', command: () => this.closeMenu(), routerLink: '/center-report/outcat' },
        { label: 'สรุปรวมรับวัสดุ', icon: 'pi pi-fw pi-file', command: () => this.closeMenu(), routerLink: '/center-report/inmount' },
        { label: 'สรุปรวมเบิกวัสดุ', icon: 'pi pi-fw pi-file', command: () => this.closeMenu(), routerLink: '/center-report/outmount' },
        { label: 'สรุปประจำเดือน', icon: 'pi pi-fw pi-file', command: () => this.closeMenu(), routerLink: '/center-report/allmonth' },
        { label: 'แผนจัดซื้อ', icon: 'pi pi-fw pi-file', command: () => this.closeMenu(), routerLink: '/center-report/poplan' }
      ]
    },
    {
      label: 'รวมหน่วยงาน',
      items: [
        { label: 'คงคลังตามหมวด', icon: 'pi pi-fw pi-file', command: () => this.closeMenu(), routerLink: '/all/category' },
      ]
    }
  ]
  
  setUser(user) {
    this.menu[1].visible = this.globalService.currentDepart !== 'center'
    this.menu[2].visible = this.globalService.currentDepart !== 'center'
    this.menu[3].visible = this.globalService.currentDepart !== 'center'
    this.menu[4].visible = user.depart === 'center' && this.globalService.user.role !== 99;
    this.menu[5].visible = user.depart === 'center';
  }

  setTitle(menuPos) {
    setTimeout(() => {
      const menu = menuPos.split('-')
      this.currentTitle = this.menu[+menu[0]].items[+menu[1]].label;
    }, 0);
    this.currentMenu = menuPos
  }

}
