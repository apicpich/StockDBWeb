import { NgModule } from '@angular/core';
import { SharedModule } from '../shared.module';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from '../login/auth.guard';
import { LeftPanelComponent } from './left-panel.component';
import { InvInComponent } from './inv-in/inv-in.component';
import { ProductInvInPrintComponent } from './inv-in/inv-in-print.component';
import { InvOutComponent } from './inv-out/inv-out.component';
import { ProductInvOutPrintComponent } from './inv-out/inv-out-print.component';

const invRoutes: Routes = [
  { path: 'in', component: InvInComponent, canActivate: [AuthGuard] },
  { path: 'out', component: InvOutComponent, canActivate: [AuthGuard] },
]

@NgModule({
  declarations: [
    LeftPanelComponent, InvInComponent, ProductInvInPrintComponent,
    InvOutComponent, ProductInvOutPrintComponent
  ],
  imports: [
    SharedModule,
    RouterModule.forChild(invRoutes),
  ]
})
export class InvModule { }
