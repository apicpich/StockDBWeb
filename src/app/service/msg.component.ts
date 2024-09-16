import { Component, OnInit, OnDestroy } from '@angular/core';
import { ConfirmationService, MessageService } from 'primeng/api';

import { MyMsgService } from './msg.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-mymsg',
  template: `
            <p-confirmDialog key="msg" [styleClass]="type"
            rejectButtonStyleClass="ui-button-raised ui-button-secondary"
            acceptButtonStyleClass="ui-button-raised">
            </p-confirmDialog>
            <p-toast position="center" key="loading" [modal]="true" [baseZIndex]="5000">
              <ng-template let-message pTemplate="message">
                <div style="display: inline-flex;width: 100%;justify-content: center">
                  <p-progressSpinner [style]="{width: '20px', height: '20px', 'margin-top': '3px'}"
                   strokeWidth="5" animationDuration=".75s"></p-progressSpinner>
                  <div style="padding-left: .75em">
                    {{message.summary}}<br>
                    {{message.detail}}
                  </div>
                </div>
              </ng-template>
            </p-toast>
            `,
  styles: [`
            :host ::ng-deep .error .ui-dialog-titlebar {
              background-color: #ff5050;
              border-color: #ff5050;
            }
            :host ::ng-deep .error .ui-confirmdialog-icon {
              color: red;
            }
            :host ::ng-deep .warning .ui-dialog-titlebar {
              background-color: #ff7e00;
              border-color: #ff7e00;
            }
            :host ::ng-deep .warning .ui-confirmdialog-icon {
              color: #ff7e00;
            }
            :host ::ng-deep .danger .ui-dialog-titlebar {
              background-color: #e91224;
              border-color: #e91224;
            }
            :host ::ng-deep .exclamation .ui-dialog-titlebar {
              background-color: #ff7e00;
              border-color: #ff7e00;
            }
            :host ::ng-deep .danger .ui-confirmdialog-icon {
              color: #e91224;
            }
          `],
  providers: [ConfirmationService, MessageService]
})
export class MsgComponent implements OnInit, OnDestroy {

  type: string = '';

  constructor(private confirmationService: ConfirmationService,
              private messageService: MessageService,
              private msgService: MyMsgService) { }

  msgDialogSubscription: Subscription;
  msgWaitingSubscription: Subscription;
  
  ngOnInit() {
    this.subscribeToMsgDialogservice();
    this.subscribeToMsgWaitingservice();
  }

  subscribeToMsgDialogservice() {
    this.msgDialogSubscription = this.msgService.msgOptionChange.subscribe(option => {
      this.type = option.key;
      option.key = 'msg';
      if (option.rejectVisible) {
        this.confirmationService.confirm(option);
      } else {
        this.messageService.clear();
        setTimeout(() => {
          this.confirmationService.confirm(option);
        }, 300);
      }
    })
  }

  subscribeToMsgWaitingservice() {
    this.msgWaitingSubscription = this.msgService.msgWaitingChange
    .subscribe(option => {
      if (option['key'] === 'close') {
        this.messageService.clear();
      } else {
        this.messageService.clear();
        this.messageService.add(option);
      };
    })
  }

  ngOnDestroy() {
    this.msgDialogSubscription.unsubscribe();
    this.msgWaitingSubscription.unsubscribe();
  }
}
