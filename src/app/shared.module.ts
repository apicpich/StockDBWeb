import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ShortDatePipe, LongDatePipe } from './service/xpipe.pipe';
import { MaxValidator, MinValidator } from './service/max-validator.directive';

import { InputTextModule } from 'primeng/inputtext'
import { InputTextareaModule } from 'primeng/inputtextarea';
import { ContextMenuModule } from 'primeng/contextmenu';
import { MenuModule } from 'primeng/menu';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { RadioButtonModule } from 'primeng/radiobutton';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { MenubarModule } from 'primeng/menubar';
import { CalendarModule } from 'primeng/calendar';
import { DropdownModule } from 'primeng/dropdown';
import { TableModule } from 'primeng/table';
import { CheckboxModule } from 'primeng/checkbox';
import { SidebarModule } from 'primeng/sidebar';
import { SplitButtonModule } from 'primeng/splitbutton';
import { OverlayPanelModule } from 'primeng/overlaypanel';
import { DataViewModule } from 'primeng/dataview';
import { TriStateCheckboxModule } from 'primeng/tristatecheckbox';
import { ProgressSpinnerModule } from 'primeng/progressspinner';

import { DepartComponent } from './common/depart.component';
import { StatusComponent } from './common/status.component';
import { SupplierComponent } from './common/supplier.component';
import { CustomerComponent } from './common/customer.component';
import { ProductComponent } from './common/product/product.component';
import { ProductLotComponent } from './common/product-lot/product-lot.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    InputTextModule,
    InputTextareaModule,
    ContextMenuModule,
    MenuModule,
    ButtonModule,
    DialogModule,
    RadioButtonModule,
    AutoCompleteModule,
    MenubarModule,
    CalendarModule,
    DropdownModule,
    TableModule,
    CheckboxModule,
    SidebarModule,
    SplitButtonModule,
    OverlayPanelModule,
    DataViewModule,
    TriStateCheckboxModule,
    ProgressSpinnerModule
  ],
  declarations: [
    ShortDatePipe, LongDatePipe, MaxValidator, MinValidator,
    DepartComponent,
    StatusComponent,
    SupplierComponent,
    CustomerComponent,
    ProductComponent,
    ProductLotComponent
  ],
  exports: [
    CommonModule,
    FormsModule,
    ShortDatePipe, LongDatePipe, MaxValidator, MinValidator,
    InputTextModule,
    InputTextareaModule,
    ContextMenuModule,
    MenuModule,
    ButtonModule,
    DialogModule,
    RadioButtonModule,
    AutoCompleteModule,
    MenubarModule,
    CalendarModule,
    DropdownModule,
    TableModule,
    CheckboxModule,
    SidebarModule,
    SplitButtonModule,
    OverlayPanelModule,
    DataViewModule,
    TriStateCheckboxModule,
    DepartComponent,
    StatusComponent,
    SupplierComponent,
    CustomerComponent,
    ProductComponent,
    ProductLotComponent,
    ProgressSpinnerModule
  ]
 })
 export class SharedModule { }