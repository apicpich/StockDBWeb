import { NgModule } from '@angular/core';
import { SharedModule } from '../shared.module';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from '../login/auth.guard';
import { StockComponent } from './stock/stock.component';
import { RateComponent } from './rate/rate.component';
import { InvReportComponent } from './inv-report/inv-report.component';
import { StockCardComponent } from './stock-card/stock-card.component';

const reportRoutes: Routes = [
  { path: 'stock', component: StockComponent, canActivate: [AuthGuard] },
  { path: 'rate', component: RateComponent, canActivate: [AuthGuard] },
  { path: 'inv/:id', component: InvReportComponent, canActivate: [AuthGuard] },
  { path: 'stockcard', component: StockCardComponent, canActivate: [AuthGuard] }
]

@NgModule({
  declarations: [
    StockComponent,
    RateComponent,
    InvReportComponent,
    StockCardComponent
  ],
  imports: [
    SharedModule,
    RouterModule.forChild(reportRoutes),
  ]
})
export class ReportModule { }
