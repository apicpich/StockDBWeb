import { Component, OnInit } from '@angular/core';
import { MenuService } from '../service/menu.service';
import { GlobalService } from '../service/global.service';
import { MyMsgService } from '../service/msg.service';
import { sha256 } from 'js-sha256';

@Component({
  selector: 'app-user',
  template: `
    <form #userAddForm="ngForm">
      <div class="p-grid" style="text-align: center;padding-top: 1em;width: 265px;margin: auto">
        <div class="p-col-12">
          <div style="font-size: 1.25em">{{isUserAdd ? 'เพิ่ม' : 'แก้ไข'}}ผู้ใช้งาน</div>
        </div>
        <div class="p-col-12">
          <div class="ui-inputgroup" style="display: inline-flex;">
            <span class="ui-inputgroup-addon"><i class="pi pi-user"></i></span>
            <input type="text" pInputText style="width: 200px" placeholder="Username"
             name="newusername" required [(ngModel)]="newusername" (change)="getUser()">         
          </div>
        </div>
        <div class="p-col-12">
          <div class="ui-inputgroup" style="display: inline-flex;">
            <span class="ui-inputgroup-addon"><i class="pi pi-key"></i></span>
            <input type="password" pInputText style="width: 200px" placeholder="Password"
             name="newpass" required [disabled]="!isUserAdd" [(ngModel)]="newpass" #pass="ngModel">         
          </div>
        </div>
        <div class="p-col-12" *ngIf="isUserAdd && pass.dirty">
          <div class="ui-inputgroup" style="display: inline-flex;">
            <span class="ui-inputgroup-addon"><i class="pi pi-key"></i></span>
            <input type="password" pInputText style="width: 200px" placeholder="Confirmed password"
             name="confirmpass" required [disabled]="!isUserAdd" [(ngModel)]="confirmpass" #cmpass="ngModel">         
          </div>
          <div *ngIf="isUserAdd && cmpass.touched && confirmpass !== newpass" style="color: red;font-size: .95em">
            *ยืนยันรหัสผ่านไม่ถูกต้อง
          </div>
        </div>
        <div class="p-col-12" style="margin: auto;">
          <label for="newdepart">หน่วยงาน</label>
          <p-dropdown inputId="newdepart" [options]="globalService.departTable" [(ngModel)]="newdepart" required
           name="newdepart" appendTo="body" [style]="{'width':'233px'}">
          </p-dropdown>
        </div>
        <div class="p-col-12">
          <div class="ui-inputgroup" style="display: inline-flex;">
            <span class="ui-inputgroup-addon"><i class="pi pi-align-left"></i></span>
            <input type="text" pInputText style="width: 200px" placeholder="ชื่อ" name="newfirstname" required [(ngModel)]="newfirstname">         
          </div>
        </div>
        <div class="p-col-12">
          <div class="ui-inputgroup" style="display: inline-flex;">
            <span class="ui-inputgroup-addon"><i class="pi pi-align-right"></i></span>
            <input type="text" pInputText style="width: 200px" placeholder="สกุล" name="newlastname" required [(ngModel)]="newlastname">         
          </div>
        </div>
        <div class="p-col-12">
          <div class="p-grid p-nogutter" style="width: 265px;text-align: left;margin: .5em auto 0 auto">
            <div class="p-col-6" style="padding-bottom: 0.25em">
              <p-radioButton name="group1" [value]="0" label="ผู้ดูแลระบบ" [(ngModel)]="newrole" inputId="opt0"></p-radioButton>
            </div>
            <div class="p-col-6" style="padding-left: 1em;padding-bottom: 0.25em">
              <p-radioButton name="group1" [value]="10" label="ผู้ใช้งานในหน่วย" [(ngModel)]="newrole" inputId="opt1"></p-radioButton>
            </div>
            <div class="p-col-6" style="padding-bottom: 0.25em">
              <p-radioButton name="group1" [value]="99" label="ผู้สังเกตการณ์" [(ngModel)]="newrole" inputId="opt1"></p-radioButton>
            </div>
          </div>
        </div>
        <div class="p-col-12">
          <button pButton type="button" class="ui-button-raised" icon="pi pi-check" iconPos="left" label="บันทึก"
           style="margin-right: 1em" [disabled]="!userAddForm.form.valid || confirmpass !== newpass"
           (click)="addUser()"></button>
          <button *ngIf="!isUserAdd && globalService.user.user_name !== newusername" pButton type="button"
           class="ui-button-raised ui-button-danger" icon="pi pi-trash" iconPos="left" label="ลบ"
           style="margin-right: 1em" (click)="deleteUser()"></button>
          <button pButton type="button" class="ui-button-raised ui-button-secondary" icon="pi pi-home"
           iconPos="left" label="หน้าหลัก" routerLink="/home"></button>
        </div>
      </div>
    </form>
  `,
  styles: []
})
export class UserComponent implements OnInit {

  newusername: string; newpass: string; newrole: number; newdepart: string;
  newfirstname: string; newlastname: string;
  confirmpass: string;
  isUserAdd = true;

  constructor(
    private menuService: MenuService,
    public globalService: GlobalService,
    private myMsgService: MyMsgService
  ) { }

  ngOnInit() {
    this.menuService.setTitleSystem(5)
    this.globalService.getDepart()
    this.newusername = ''; this.newpass = ''; this.newrole = 10; this.newdepart = null;
    this.newfirstname = ''; this.newlastname = ''; this.confirmpass = ''
  }

  getUser() {
    this.globalService.getMyUser(this.newusername).subscribe((data: any) => {
      this.newpass = '';
      this.confirmpass = '';
      this.newfirstname = '';
      this.newlastname = '';
      this.newrole = 10;
      this.newdepart = null;
      this.isUserAdd = true;
      if (data && data.length > 0) {
        this.newpass = 'xxxxxxxx';
        this.confirmpass = 'xxxxxxxx';
        this.newfirstname = data[0].first_name;
        this.newlastname = data[0].last_name;
        this.newrole = data[0].role;
        this.newdepart = data[0].depart;
        this.isUserAdd = false;
      } 
    })
  }

  addUser() {
    if (this.isUserAdd) {
      if (this.newusername.length > 0 && this.newpass.length > 0) {
        const xpass = this.newusername + this.newpass;
        this.myMsgService.msgBox('ต้องการที่จะเพิ่มผู้ใช้งานใช่หรือไม่ ?', 'เพิ่มผู้ใช้งาน', 'question', () => {
          this.myMsgService.showLoading();
          const passhash = sha256(sha256(xpass));
          const data = {
            user_name: this.newusername,
            first_name: this.newfirstname,
            last_name: this.newlastname,
            role: this.newrole,
            depart: this.newdepart,
            pass: passhash
          };
          this.globalService.userAdd(data).subscribe((result: any) => {
            this.isUserAdd = false
            this.myMsgService.msgBox(result.message, 'เพิ่มผู้ใช้งาน', 'info', null);
          });
        });
      }
    } else {
      this.myMsgService.msgBox('ต้องการที่จะแก้ไขผู้ใช้งานใช่หรือไม่ ?', 'แก้ไขผู้ใช้งาน', 'question', () => {
        this.myMsgService.showLoading();
        const data = {
          user_name: this.newusername,
          first_name: this.newfirstname,
          last_name: this.newlastname,
          role: this.newrole,
          depart: this.newdepart
        };
        this.globalService.userUpdate(data).subscribe((result: any) => {
          this.myMsgService.msgBox(result.message, 'แก้ไขผู้ใช้งาน', 'info', null);
        });
      });
    }
  }

  deleteUser() {
    this.myMsgService.msgBox(`ต้องการที่จะลบผู้ใช้งาน ${this.newusername} ใช่หรือไม่ ?`, 'ลบผู้ใช้งาน', 'warning', () => {
      this.myMsgService.showLoading();
      this.globalService.userDelete(this.newusername).subscribe((result: any) => {
        this.myMsgService.msgBox(result.message, 'ลบผู้ใช้งาน', 'info', null);
      });
    });
  }

}
