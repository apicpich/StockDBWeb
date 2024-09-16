import { Injectable } from '@angular/core';
import { HttpEvent, HttpInterceptor, HttpHandler, HttpRequest } from '@angular/common/http';

import { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { MyMsgService } from './msg.service';

@Injectable()
export class HttpReqInterceptor implements HttpInterceptor {

  constructor(private myMsgService: MyMsgService) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    this.myMsgService.isLoading.next(true)
    return next.handle(req).pipe(
      finalize(() => {
        this.myMsgService.isLoading.next(false)
      })
    );
  }
}