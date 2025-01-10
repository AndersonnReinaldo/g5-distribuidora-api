import moment from 'moment';
import 'moment-timezone';
export function currentDate(){
    return new Date(String(moment().tz('America/Fortaleza').utc(true)))
  }