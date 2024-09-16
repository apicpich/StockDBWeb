import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class UserServiceService {

  httpOptions = { headers: new HttpHeaders({ 'Content-Type': 'application/json' }) };
  url = environment.API_URL;
  
  constructor(private http: HttpClient) {  }

  userLogin(data) {
    const userUrl = this.url + "user/login";
    return this.http.post<any>(userUrl, data, this.httpOptions)
    .pipe(
      catchError(this.handleError)
    );
  }

  userAdd(data) {
    const userUrl = this.url + "user/add";
    return this.http.post<any>(userUrl, data, this.httpOptions)
    .pipe(
      catchError(this.handleError)
    );
  }
  
  userUpdate(data) {
    const userUrl = this.url + "user/update";
    return this.http.post<any>(userUrl, data, this.httpOptions)
    .pipe(
      catchError(this.handleError)
    );
  }

  private handleError(error: HttpErrorResponse) {
    let errMessage = '';
    if (error.error instanceof ErrorEvent) {
      // A client-side or network error occurred. Handle it accordingly.
      console.error('An error occurred:', error.error.message);
    } else {
      // The backend returned an unsuccessful response code.
      // The response body may contain clues as to what went wrong,
      console.error(`Backend returned code ${error.status}`);
      console.error(error.error);
    }
    if (error.status === 400 || error.status === 401 || error.status === 403 || error.status === 500) {
      errMessage = error.error.message;
    } else {
      errMessage = 'มีบางอย่างผิดปกติ กรุณาลองใหม่ในภายหลัง.. หรือติดต่อผู้ดูแลระบบ';
    }
    // return an ErrorObservable with a user-facing error message
    return throwError(errMessage);
  };

}
