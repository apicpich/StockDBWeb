import { NgModule } from '@angular/core';
import { SharedModule } from '../shared.module';
import { RouterModule, Routes } from '@angular/router';
import { AllDepartsAuthGuard } from '../login/all-departs-auth.guard';
import { CatStockComponent } from './cat-stock/cat-stock.component';

const allDepartsRoutes: Routes = [
  { path: 'category', component: CatStockComponent, canActivate: [AllDepartsAuthGuard] }
]

@NgModule({
  declarations: [CatStockComponent],
  imports: [
    SharedModule,
    RouterModule.forChild(allDepartsRoutes)
  ]
})
export class AllDepartsModule { }
