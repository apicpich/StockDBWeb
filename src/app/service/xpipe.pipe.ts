import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'shortDate'
})
export class ShortDatePipe implements PipeTransform {

  transform(date: any, locale = ''): any {
    if (date && date != "1970-01-01T00:00:00Z") {
      const d = new Date(date);
      const y = d.getFullYear() + (locale.toLocaleLowerCase() == 'TH'.toLocaleLowerCase() ? 543 : 0);
      return ('0' + d.getDate()).slice(-2) + '/' + ('0' + (d.getMonth()+1)).slice(-2) + '/' + y;
    } else {
      //return &nbsp;
      return '\u00A0';
    }
  }

}

@Pipe({
  name: 'longDate'
})
export class LongDatePipe implements PipeTransform {

  transform(date: any, locale = ''): any {
    if (date && date != "1970-01-01T00:00:00Z") {
      const d = new Date(date);
      const y = d.getFullYear() + (locale.toLocaleLowerCase() == 'TH'.toLocaleLowerCase() ? 543 : 0);
      return d.getDate() + '/' + (d.getMonth()+1) + '/' + y + ' ' + ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2);
    } else {
      //return &nbsp;
      return '\u00A0';
    }
  }

}
