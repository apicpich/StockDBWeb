import { NgModule } from '@angular/core';
import { SharedModule } from '../shared.module';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from '../login/auth.guard';
import { ProductReqComponent } from './product-req/product-req.component';
import { ProductReqPrintComponent } from './product-req/product-req-print.component';
import { LeftPanelComponent } from './left-panel.component';
import { ProductApprvComponent } from './product-apprv/product-apprv.component';
import { ProductApprvPrintComponent } from './product-apprv/product-apprv-print.component';
import { SelectOtinvComponent } from './product-apprv/select-otinv.component';

const reqRoutes: Routes = [
  { path: 'in', component: ProductReqComponent, canActivate: [AuthGuard] },
  { path: 'apprv', component: ProductApprvComponent, canActivate: [AuthGuard] },
]

@NgModule({
  declarations: [
    ProductReqComponent, ProductReqPrintComponent, LeftPanelComponent,
    ProductApprvComponent, ProductApprvPrintComponent, SelectOtinvComponent
  ],
  imports: [
    SharedModule,
    RouterModule.forChild(reqRoutes),
  ]
})
export class ReqModule { }
