import { Component, OnInit } from '@angular/core';
import { MenuService } from '../service/menu.service';
import { GlobalService } from '../service/global.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {

  logUserName: string;

  constructor(
    private menuService: MenuService,
    private globalService: GlobalService,
  ) { }

  ngOnInit() {
    this.menuService.setTitleSystem(0);
    this.logUserName = this.globalService.user.user_name;
  }

}
