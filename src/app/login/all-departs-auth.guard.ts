import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Route, CanLoad } from '@angular/router';
import { GlobalService } from '../service/global.service';

@Injectable({
  providedIn: 'root'
})
export class AllDepartsAuthGuard implements CanActivate, CanLoad {

  constructor(private globalService: GlobalService) { }
  
  canActivate(
    next: ActivatedRouteSnapshot,
    state: RouterStateSnapshot): boolean {
    let url: string = state.url;
  
    return this.checkLogin(url);
  }

  canLoad(route: Route): boolean {
    let url = `/${route.path}`;
  
    return this.checkLogin(url);
  }

  checkLogin(url: string): boolean {
    if (this.globalService.isLogin && this.globalService.user.depart === 'center') {
      return true;
    }

    // Store the attempted URL for redirecting
    this.globalService.redirectUrl = url;

    // Navigate to the login page with extras
    // this.router.navigate(['/login']);
    this.globalService.logOut()
    return false;
  }

}
