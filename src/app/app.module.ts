import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { NgModule } from '@angular/core';
import { SharedModule } from './shared.module';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http'
import { HttpReqInterceptor } from './service/http-interceptor';
import { AppRoutingModule } from './app-routing.module';

import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';

import { AppComponent } from './app.component';
import { MsgComponent } from './service/msg.component';
import { LoginComponent } from './login/login.component';
import { UserComponent } from './user/user.component';
import { ChangePassComponent } from './user/change-pass.component';
import { HomeComponent } from './home/home.component';

@NgModule({
  declarations: [
    AppComponent,
    MsgComponent,
    LoginComponent,
    UserComponent,
    ChangePassComponent,
    HomeComponent,
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    SharedModule,
    HttpClientModule,
    AppRoutingModule,
    ConfirmDialogModule,
    ToastModule,
  ],
  providers: [
    { provide: HTTP_INTERCEPTORS, useClass: HttpReqInterceptor, multi: true }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
