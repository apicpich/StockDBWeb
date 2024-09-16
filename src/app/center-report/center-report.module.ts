import { NgModule } from '@angular/core';
import { CenterSharedModule } from '../center/center-shared.module';
import { RouterModule, Routes } from '@angular/router';
import { CenterAuthGuard } from '../login/center-auth.guard';
import { StockCenterComponent } from './stock/stock.component';
import { StockCardCenterComponent } from './stock-card/stock-card.component';
import { SumINCatComponent } from './sum-incat/sum-incat.component';
import { SumOUTCatComponent } from './sum-outcat/sum-outcat.component';
import { SumINMonthComponent } from './sum-inmonth/sum-inmonth.component';
import { SumOUTMonthComponent } from './sum-outmonth/sum-outmonth.component';
import { SumAllMonthComponent } from './sum-all-month/sum-all-month.component';
import { PoPlanComponent } from './po-plan/po-plan.component';

const centerReportRoutes: Routes = [
  { path: 'stock', component: StockCenterComponent, canActivate: [CenterAuthGuard] },
  { path: 'stockcard', component: StockCardCenterComponent, canActivate: [CenterAuthGuard] },
  { path: 'incat', component: SumINCatComponent, canActivate: [CenterAuthGuard] },
  { path: 'outcat', component: SumOUTCatComponent, canActivate: [CenterAuthGuard] },
  { path: 'inmount', component: SumINMonthComponent, canActivate: [CenterAuthGuard] },
  { path: 'outmount', component: SumOUTMonthComponent, canActivate: [CenterAuthGuard] },
  { path: 'allmonth', component: SumAllMonthComponent, canActivate: [CenterAuthGuard] },
  { path: 'poplan', component: PoPlanComponent, canActivate: [CenterAuthGuard] },
]

@NgModule({
  declarations: [
    StockCenterComponent,
    StockCardCenterComponent,
    SumINCatComponent,
    SumOUTCatComponent,
    SumINMonthComponent,
    SumOUTMonthComponent,
    SumAllMonthComponent,
    PoPlanComponent
  ],
  imports: [
    CenterSharedModule,
    RouterModule.forChild(centerReportRoutes),
  ]
})
export class CenterReportModule { }
