import { Injectable } from '@angular/core';

const ExpDue = 180;

@Injectable({
  providedIn: 'root'
})
export class FuncService {

  en = {
    firstDayOfWeek: 0,
    dayNames: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
    dayNamesShort: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
    dayNamesMin: ["Su","Mo","Tu","We","Th","Fr","Sa"],
    monthNames: [ "January","February","March","April","May","June","July","August","September","October","November","December" ],
    monthNamesShort: [ "Jan", "Feb", "Mar", "Apr", "May", "Jun","Jul", "Aug", "Sep", "Oct", "Nov", "Dec" ],
    today: 'Today',
    clear: 'Clear',
    dateFormat: 'mm/dd/yy',
  };

  th = {
    firstDayOfWeek: 0,
    dayNames: ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"],
    dayNamesShort: ["อา", "จ.", "อ.", "พ.", "พฤ", "ศ.", "ส."],
    dayNamesMin: ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"],
    monthNames: [ 'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม' ],
    monthNamesShort: [ "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.","ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค." ],
    today: 'วันนี้',
    clear: 'ล้างวันที่',
    dateFormat: 'dd/mm/yy'
  };

  constructor() { }

  colorExp(date) {
    if (date != "1970-01-01T00:00:00Z") {
      const d = new Date(date);
      const n = new Date();
      if ((d.valueOf() < n.valueOf())) {
        return 'red';
      }
      if ((d.valueOf() - n.valueOf()) < (ExpDue * 86400 * 1000)) {
        return '#9C27B0';
      } 
    } return 'inherit';
  }

  isExp(date) {
    if (date != "1970-01-01T00:00:00Z") {
      const d = new Date(date);
      const n = new Date();
      if ((d.valueOf() < n.valueOf())) {
        return true;
      }
    } return false;
  }

  getLocale(locale) {
    if (locale === 'en') {
      return this.en
    }
    if (locale === 'th') {
      return this.th
    }
  }

  getThFullMonth(mnt, m = new Date()) {
    m.setMonth(m.getMonth() - mnt);
    return this.getLocale('th').monthNames[m.getMonth()];
  }

  getThMonth(mnt, m = new Date()) {
    m.setMonth(m.getMonth() - mnt);
    return this.getLocale('th').monthNamesShort[m.getMonth()];
  }

  genDate(isoDateString) {
    if (isoDateString && isoDateString != "1970-01-01T00:00:00Z") {
      return new Date(isoDateString);
    } else {
      return null;
    }
  }

  govYear() {
    let dDate = new Date();
    if (dDate.getMonth() <= 8) {
      return (dDate.getFullYear() + 543).toString().slice(-2)
    } else {
      return (dDate.getFullYear() + 544).toString().slice(-2)
    }
  }
  maxBillQuery(tbl, prefix) {
    const query = {
      field: 'Max(Int(Mid([StInvID],7,4))) AS BillRun', table: tbl,
      where: '(Mid([StInvID],3,2) = "' + this.govYear() + '") AND (Left([StInvID],2) = "'
        + prefix + '") AND (Len([StInvID]) = 10)'
    };
    return query
  }
  getBillRun(billMax, prefix) {
    const billRun = (billMax ? billMax : 0) + 1;
    const d = new Date();
    return prefix + this.govYear() + ('0' + (d.getMonth() + 1)).slice(-2) + ('000' + billRun).slice(-4);
  }

  convertDate(jsISODate) {
    if (jsISODate && jsISODate != "1970-01-01T00:00:00Z") {
      let d = new Date(jsISODate);
      return (d.valueOf() / 1000 / 86400) + 25569 + (7 / 24);
      // return d.valueOf() / 1000 / 86400 + 25569 + 0.29166666666;
    } else {
      return 'Null';
    }
  }
  
  convertFromDate(dateObj) {
    if (dateObj) {
      return (dateObj.valueOf() / 1000 / 86400) + 25569 + (7 / 24);
      // return d.valueOf() / 1000 / 86400 + 25569 + 0.29166666666;
    } else {
      return null;
    }
  }

  endDate(dateObj) {
    let cDate = this.convertFromDate(dateObj);
    if (cDate) {
      if (Math.abs(cDate - Math.round(cDate)) < 0.0000115) {
        return Math.round(cDate) + 0.9999884259;
      }
    }
    return cDate;
  }

  genUniqueID(seed?) {
    let _seed = seed ? seed : 0
    const _now = Date.now() + _seed
    return +(_now.toString() + Math.floor(Math.random() * 1000).toString())
  }

  dateToText(input) {
    if (input) {
      const d = new Date(input)
      return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
    }
    return null
  }

  filterList(findString: string, arrObjSource: any[], arrKeyToFind?: any[]) {
    const condition = (v) => {
      let test = false;
      if (arrKeyToFind) {
        for (let i = 0; i < arrKeyToFind.length; i++) {
          test = (v[arrKeyToFind[i]] || '').toLowerCase().indexOf(findString.toLowerCase()) > -1;
          if (test) { break };
        }
      } else {
        for (let key in v) {
          test = (v[key] || '').toLowerCase().indexOf(findString.toLowerCase()) > -1;
          if (test) { break };
        }
      }
      return test;
    }
    function* filter(array, condition, maxSize) {
      if (!maxSize || maxSize > array.length) {
        maxSize = array.length;
      }
      let count = 0;
      let i = 0;
      while ( count< maxSize && i < array.length ) {
        if (condition(array[i])) {
          yield array[i];
          count++;
        }
        i++;
      }
    }
    return Array.from(filter(arrObjSource, condition, 30));
  }

  //  /**
  //  * @name BAHTTEXT.js
  //  * @version 1.1.5
  //  * @update May 1, 2017
  //  * @website: https://github.com/earthchie/BAHTTEXT.js
  //  * @author Earthchie http://www.earthchie.com/
  //  * @license WTFPL v.2 - http://www.wtfpl.net/
  //  **/
  bahtText(num, suffix?) {
    if (typeof suffix === 'undefined') {
      suffix = 'บาทถ้วน';
    }
    num = num || 0;
    num = num.toString().replace(/[, ]/g, ''); // remove commas, spaces
    if (isNaN(num) || (Math.round(parseFloat(num) * 100) / 100) === 0) {
      return 'ศูนย์บาทถ้วน';
    } else {
      let t = ['', 'สิบ', 'ร้อย', 'พัน', 'หมื่น', 'แสน', 'ล้าน'],
        n = ['', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า'],
        len, digit, text = '', parts, i;
      if (num.indexOf('.') > -1) { // have decimal
        /* 
        * precision-hack
        * more accurate than parseFloat the whole number 
        */
        parts = num.toString().split('.');
        
        num = parts[0];
        parts[1] = parseFloat('0.' + parts[1]);
        parts[1] = (Math.round(parts[1] * 100) / 100).toString(); // more accurate than toFixed(2)
        parts = parts[1].split('.');
        
        if (parts.length > 1 && parts[1].length === 1) {
            parts[1] = parts[1].toString() + '0';
        }
        num = parseInt(num, 10) + parseInt(parts[0], 10);
        /* 
        * end - precision-hack
        */
        text = num ? this.bahtText(num) : '';
        if (parseInt(parts[1], 10) > 0) {
            text = text.replace('ถ้วน', '') + this.bahtText(parts[1], 'สตางค์');
        }
        return text;
      } else {
        if (num.length > 7) { // more than (or equal to) 10 millions
          var overflow = num.substring(0, num.length - 6);
          var remains = num.slice(-6);
          return this.bahtText(overflow).replace('บาทถ้วน', 'ล้าน') + this.bahtText(remains).replace('ศูนย์', '');
        } else {
          len = num.length;
          for (i = 0; i < len; i = i + 1) {
            digit = parseInt(num.charAt(i), 10);
            if (digit > 0) {
              if (len > 2 && i === len - 1 && digit === 1 && suffix !== 'สตางค์') {
                  text += 'เอ็ด' + t[len - 1 - i];
              } else {
                  text += n[digit] + t[len - 1 - i];
              }
            }
          }
          // grammar correction
          text = text.replace('หนึ่งสิบ', 'สิบ');
          text = text.replace('สองสิบ', 'ยี่สิบ');
          text = text.replace('สิบหนึ่ง', 'สิบเอ็ด');
          return text + suffix;
        }
      }
    }
  }

}
