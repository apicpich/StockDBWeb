import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { AuthGuard } from './login/auth.guard';
import { CenterAuthGuard } from './login/center-auth.guard';
import { DepartAuthGuard } from './login/depart-auth.guard';
import { AllDepartsAuthGuard } from './login/all-departs-auth.guard';
import { LoginComponent } from './login/login.component';
import { HomeComponent } from './home/home.component';
import { UserComponent } from './user/user.component';
import { ChangePassComponent } from './user/change-pass.component';
import { DepartComponent } from './common/depart.component';
import { StatusComponent } from './common/status.component';
import { SupplierComponent } from './common/supplier.component';
import { CustomerComponent } from './common/customer.component';
import { ProductComponent } from './common/product/product.component';

const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'home', component: HomeComponent, canActivate: [AuthGuard] },
  { path: 'user', component: UserComponent, canActivate: [CenterAuthGuard] },
  { path: 'password', component: ChangePassComponent, canActivate: [AuthGuard] },
  { path: 'depart', component: DepartComponent, canActivate: [AuthGuard] },
  { path: 'status', component: StatusComponent, canActivate: [CenterAuthGuard] },
  { path: 'product', component: ProductComponent, canActivate: [DepartAuthGuard] },
  { path: 'supplier', component: SupplierComponent, canActivate: [DepartAuthGuard] },
  { path: 'customer', component: CustomerComponent, canActivate: [DepartAuthGuard] },
  {
    path: 'req',
    loadChildren: () => import('./product-req/req.module').then(m => m.ReqModule),
    canLoad: [AuthGuard]
  },
  {
    path: 'inv',
    loadChildren: () => import('./inv/inv.module').then(m => m.InvModule),
    canLoad: [AuthGuard]
  },
  {
    path: 'report',
    loadChildren: () => import('./report/report.module').then(m => m.ReportModule),
    canLoad: [AuthGuard]
  },
  {
    path: 'center',
    loadChildren: () => import('./center/center.module').then(m => m.CenterModule),
    canLoad: [CenterAuthGuard]
  },
  {
    path: 'center-report',
    loadChildren: () => import('./center-report/center-report.module').then(m => m.CenterReportModule),
    canLoad: [CenterAuthGuard]
  },
  {
    path: 'all',
    loadChildren: () => import('./all-departs/all-departs.module').then(m => m.AllDepartsModule),
    canLoad: [AllDepartsAuthGuard]
  },
  // { path: '', redirectTo: '/login', pathMatch: 'full' }
  { path: '**', redirectTo: '/login' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
