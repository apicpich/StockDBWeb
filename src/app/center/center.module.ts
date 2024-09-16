import { NgModule } from '@angular/core';
import { CenterSharedModule } from './center-shared.module';
import { RouterModule, Routes } from '@angular/router';
import { CenterAuthGuard } from '../login/center-auth.guard';
import { DrugItemComponent } from './drug-item/drug-item.component';
import { PoStockComponent } from './po-stock/po-stock.component';
import { InStockComponent } from './in-stock/in-stock.component';
import { OutStockComponent } from './out-stock/out-stock.component';
import { OutStockPrintComponent } from './out-stock/out-stock-print.component';
import { DrugRateComponent } from './drug-rate/drug-rate.component';
import { LeftPanelComponent } from './left-panel.component';

const centerRoutes: Routes = [
  { path: 'item', component: DrugItemComponent, canActivate: [CenterAuthGuard] },
  { path: 'po', component: PoStockComponent, canActivate: [CenterAuthGuard] },
  { path: 'in', component: InStockComponent, canActivate: [CenterAuthGuard] },
  { path: 'out', component: OutStockComponent, canActivate: [CenterAuthGuard] },
  { path: 'rate', component: DrugRateComponent, canActivate: [CenterAuthGuard] },
]

@NgModule({
  declarations: [
    PoStockComponent,
    InStockComponent,
    OutStockComponent,
    OutStockPrintComponent,
    DrugRateComponent,
    LeftPanelComponent
  ],
  imports: [
    CenterSharedModule,
    RouterModule.forChild(centerRoutes),
  ]
})
export class CenterModule { }
