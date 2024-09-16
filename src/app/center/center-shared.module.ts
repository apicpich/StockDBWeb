import { NgModule } from '@angular/core';
import { SharedModule } from '../shared.module';
import { DrugItemComponent } from './drug-item/drug-item.component';
import { DrugLotComponent } from './drug-lot/drug-lot.component';

@NgModule({
  declarations: [
    DrugItemComponent,
    DrugLotComponent
  ],
  imports: [
    SharedModule
  ],
  exports: [SharedModule, DrugItemComponent, DrugLotComponent]
})
export class CenterSharedModule { }
