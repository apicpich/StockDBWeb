import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { GlobalService } from '../service/global.service';
import { MenuService } from '../service/menu.service';
import { EventService } from '../service/event.service';
import { MyMsgService } from './../service/msg.service';
import { sha256 } from 'js-sha256';

@Component({
  selector: 'app-login',
  template: `
    <div class="login-wrapper"> 
      <form #userLoginForm="ngForm" (ngSubmit)="login()">
        <div class="p-grid" style="padding-top: 2em; text-align: center">
          <div class="p-col-12" style="font-size: 1.2em;text-align: center;color: #009688">กรุณาลงชื่อเข้าใช้งาน</div>
          <div class="p-col-12">
            <div class="ui-inputgroup" style="display: inline-flex;">
              <span class="ui-inputgroup-addon"><i class="pi pi-user"></i></span>
              <input type="text" pInputText placeholder="Username" name="username" required [(ngModel)]="username">         
            </div>
          </div>
          <div class="p-col-12">
            <div class="ui-inputgroup" style="display: inline-flex;">
              <span class="ui-inputgroup-addon"><i class="pi pi-key"></i></span>
              <input type="password" pInputText placeholder="Password" name="pass" required [(ngModel)]="pass">         
            </div>
          </div>
          <div class="p-col-12">
            <button pButton type="submit" class="ui-button-raised" icon="pi pi-check" iconPos="left" label="ตกลง"
            [disabled]="!userLoginForm.form.valid">
            </button>
          </div>
        </div>
      </form>
    </div>
  `,
  styles: [`
    .login-wrapper {
      width: 300px;
      padding-top: 35px;
      margin: auto;
    }
  `]
})
export class LoginComponent implements OnInit {

  username: string; pass: string;
  // @Input() noNavigate: boolean;
  // @Output() hasLogin = new EventEmitter();

  constructor(
    public globalService: GlobalService,
    private menuService: MenuService,
    private eventService: EventService,
    public router: Router,
    private myMsgService: MyMsgService,
  ) { }

  ngOnInit() {
    this.menuService.setTitleSystem(1);
  }

  login() {
    if (this.username.length > 0 && this.pass.length > 0) {
      const passhash = this.globalService.mixString(sha256(sha256(this.username + this.pass)));
      const data = { user: this.username, pass: passhash };
      this.myMsgService.showLoading();
      this.globalService.userLogin(data).subscribe((result: any) => {
        this.myMsgService.clearLoading();
        this.globalService.setUser(result)
        this.globalService.setRefreshToken()
        this.menuService.setUser(result.user)
        if (result.user.role === 0) { this.globalService.isAdmin = true }
        else { this.globalService.isAdmin = false };
        this.menuService.setLogItemMenu(result.user)
        this.globalService.isLogin = true;
        this.globalService.getDepart().then(() => {
          let inv = '', depart = '';
          if (result.user.depart === 'center') { inv = 'RQInvoice' }
          else { inv = 'APInvoice'; depart = result.user.depart }
          this.globalService.getTodayList(inv, depart).subscribe((data: any) => {
            this.eventService.getStartUp(data)
          }, (error) => {
            this.eventService.getStartUp([])
          })
        })

        // let redirect = this.globalService.redirectUrl ? this.router.parseUrl(this.globalService.redirectUrl) : '/asset';
        // this.router.navigateByUrl(redirect);
        // let inputRoute = [];
        // if (this.path) { inputRoute.push(this.path) };
        // if (this.param) { inputRoute.push(this.param) };
        // if (inputRoute.length) {
        //   this.router.navigate(inputRoute);
        // }
        // this.hasLogin.emit(true);
        // if (this.noNavigate) {
        //   this.globalService.setTitle(1);
        // } else {
        this.router.navigateByUrl('/home');
        // }
      })
    }
  }

}
