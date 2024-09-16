import { Component, OnInit } from '@angular/core';
import { MenuService } from '../service/menu.service';
import { GlobalService } from '../service/global.service';
import { MyMsgService } from '../service/msg.service';
import { sha256 } from 'js-sha256';

@Component({
  selector: 'app-change-pass',
  template: `
    <form #userChangePassForm="ngForm">
      <div class="p-grid" style="text-align: center;padding-top: 1em">
        <div class="p-col-12">
          <div style="font-size: 1.25em">เปลี่ยนรหัสผ่าน</div>
        </div>
        <div class="p-col-12">
          <div class="ui-inputgroup" style="display: inline-flex;">
            <span class="ui-inputgroup-addon"><i class="pi pi-key"></i></span>
            <input type="password" pInputText placeholder="Old Password" name="oldpass" required [(ngModel)]="oldpass">         
          </div>
        </div>
        <div class="p-col-12">
          <div class="ui-inputgroup" style="display: inline-flex;">
            <span class="ui-inputgroup-addon"><i class="pi pi-plus-circle"></i></span>
            <input type="password" pInputText placeholder="New Password" name="nwpass" required [(ngModel)]="nwpass">         
          </div>
        </div>
        <div class="p-col-12">
          <div class="ui-inputgroup" style="display: inline-flex;">
            <span class="ui-inputgroup-addon"><i class="pi pi-check-circle"></i></span>
            <input type="password" pInputText placeholder="Confirm Password" name="cfpass" required [(ngModel)]="cfpass">         
          </div>
        </div>
        <div class="p-col-12">
          <button pButton type="button" class="ui-button-raised" icon="pi pi-check" iconPos="left" label="ตกลง"
           style="margin-right: 3em" [disabled]="!userChangePassForm.form.valid" (click)="changePass()"></button>
          <button pButton type="button" class="ui-button-raised ui-button-secondary" icon="pi pi-home" iconPos="left" label="หน้าหลัก" routerLink="/home"></button>
        </div>
      </div>
    </form>
  `,
  styles: [`
    :host ::ng-deep .ui-inputgroup .ui-dropdown{
      // width: 212px;
      height: 38.5px;
      border-left: 0px;
    }
  `]
})
export class ChangePassComponent implements OnInit {

  logUser: any; oldpass: string; nwpass: string; cfpass: string;

  constructor(
    private menuService: MenuService,
    public globalService: GlobalService,
    private myMsgService: MyMsgService,
  ) { }

  ngOnInit() {
    this.menuService.setTitleSystem(4)
    this.logUser = this.globalService.user;
    this.oldpass = ''; this.nwpass = ''; this.cfpass = '';
  }

  changePass() {
    if (this.oldpass.length > 0 && this.nwpass.length > 0 && this.cfpass === this.nwpass) {
      const xpass = this.logUser.user_name + this.oldpass;
      const xnwpass = this.logUser.user_name + this.nwpass;
      this.myMsgService.msgBox('ยื่นยันการเปลี่ยนรหัสผ่านใช่หรือไม่ ?', 'เปลี่ยนรหัสผ่าน', 'question', () => {
        this.myMsgService.showLoading();
        const passhash = this.globalService.mixString(sha256(sha256(xpass)));
        const nwpasshash = sha256(sha256(xnwpass));
        const data = {user: this.logUser.user_name, pass: passhash, newpass: nwpasshash};
        this.globalService.passUpdate(data).subscribe((result: any) => {
          this.myMsgService.msgBox(result.message, 'เปลี่ยนรหัสผ่าน', 'info', null);
        });
      });
    } else {
      this.myMsgService.msgBox('ยืนยันรหัสใหม่ไม่ถูกต้อง ?', 'เปลี่ยนรหัสผ่าน', 'info', null);
    }
  }

}
