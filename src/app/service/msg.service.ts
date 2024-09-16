import { Injectable } from '@angular/core';
import { Confirmation } from 'primeng/api';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class MyMsgService {

  msgOptionChange: Subject<Confirmation> = new Subject<Confirmation>();
  msgWaitingChange: Subject<Object> = new Subject<Object>();
  isLoading: Subject<boolean> = new Subject<boolean>();

  constructor() { }

  msgBox(msg, hr, type, accept = null, reject = null, acceptLabel = 'ตกลง', rejectLabel = 'ยกเลิก') {
    let header, icon, acceptVisible:boolean, rejectVisible:boolean;
    if (type === 'info') {
      header = hr; icon = 'pi pi-info-circle';
      acceptVisible = true; rejectVisible = false;
    };
    if (type === 'question') {
      header = hr; icon = 'pi pi-question-circle';
      acceptVisible = true; rejectVisible = true;
    };
    if (type === 'warning') {
      header = hr; icon = 'pi pi-exclamation-triangle';
      acceptVisible = true; rejectVisible = true;
    };
    if (type === 'danger') {
      header = hr; icon = 'pi pi-times';
      acceptVisible = true; rejectVisible = true;
    };
    if (type === 'exclamation') {
      header = hr; icon = 'pi pi-exclamation-triangle';
      acceptVisible = true; rejectVisible = false;
    };
    if (type === 'error') {
      if (header) { header = hr } else { header = 'พบข้อผิดพลาด' };
      icon = 'pi pi-times-circle';
      acceptVisible = true; rejectVisible = false;
    };
    let option:Confirmation = {
      key: type, message: msg, header: header, icon: icon,
      acceptLabel: acceptLabel, rejectLabel: rejectLabel,
      acceptVisible: acceptVisible, rejectVisible: rejectVisible,
      accept: accept, reject: reject
    };
    this.msgOptionChange.next(option);
  }

  showLoading(detail = 'กรุณารอสักครู่...') {
    this.msgWaitingChange.next({ key: 'loading', sticky: true, closable: false, severity: 'info', summary: 'กำลังดำเนินการ...', detail: detail });
  }

  clearLoading() {
    this.msgWaitingChange.next({key: 'close'});
  }

  msgErr = (error) => { this.msgBox(error, '', 'error', null) }
}
