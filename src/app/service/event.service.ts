import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class EventService {

  private _windowsSize = new BehaviorSubject(window.innerWidth)
  windowsSize$ = this._windowsSize.asObservable()

  private _invSocketItem = new Subject()
  invSocketItem$ = this._invSocketItem.asObservable()

  private _centerInvSocketItem = new Subject()
  centerInvSocketItem$ = this._centerInvSocketItem.asObservable()

  private _startUp = new Subject()
  startUp$ = this._startUp.asObservable()

  private _departChange = new Subject()
  departChange$ = this._departChange.asObservable()

  private _notiClick = new Subject()
  notiClick$ = this._notiClick.asObservable()

  constructor() { }

  getWindowsSize(newSize) {
    this._windowsSize.next(newSize)
  }

  setInvSocketItem(data) {
    this._invSocketItem.next(data)
  }

  setCenterInvSocketItem(data) {
    this._centerInvSocketItem.next(data)
  }

  getStartUp(notiItem) {
    this._startUp.next(notiItem)
  }

  setDepart(depart) {
    this._departChange.next(depart)
  }

  onNotiClick(data) {
    this._notiClick.next(data)
  }

}
