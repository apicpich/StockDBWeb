import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { GlobalService } from '../service/global.service';

@Injectable({
  providedIn: 'root'
})
export class DepartAuthGuard implements CanActivate {

  constructor(private globalService: GlobalService, private router: Router) { }
  
  canActivate(
    next: ActivatedRouteSnapshot,
    state: RouterStateSnapshot): boolean {
    let url: string = state.url;

    return this.checkLogin(url);
  }

  checkLogin(url: string): boolean {
    if (this.globalService.isLogin) {
      if (this.globalService.currentDepart !== 'center') {
        return true;
      } else {
        this.router.navigate(['/home'])
        return true;
      }
    }

    // Store the attempted URL for redirecting
    this.globalService.redirectUrl = url;

    // Navigate to the login page with extras
    // this.router.navigate(['/login']);
    this.globalService.logOut()
    return false;
  }

}
