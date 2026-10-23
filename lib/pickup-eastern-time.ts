
const ZONE = 'America/New_York';
export function easternDisplayInput(value: string): string {
  if (!value) return '';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '';
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: ZONE, year:'numeric',month:'2-digit',day:'2-digit',
    hour:'2-digit',minute:'2-digit',hourCycle:'h23'
  }).formatToParts(date);
  const p = Object.fromEntries(parts.filter(x=>x.type!=='literal').map(x=>[x.type,x.value]));
  return [p.year,p.month,p.day].join('-')+'T'+[p.hour,p.minute].join(':');
}
export function easternInputToUtc(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) throw new Error('Invalid Eastern appointment time');
  const [dayPart,timePart] = value.split('T');
  const [year,month,day] = dayPart.split('-').map(Number);
  const [hour,minute] = timePart.split(':').map(Number);
  if (month<1||month>12||day<1||day>31||hour>23||minute>59) throw new Error('Invalid Eastern appointment time');
  const wallUtc = Date.UTC(year,month-1,day,hour,minute);
  const matches = [4,5].map(offset=>new Date(wallUtc+offset*3600000))
    .filter(utc=>easternDisplayInput(utc.toISOString())===value);
  if (matches.length!==1) throw new Error('Eastern appointment time is missing or repeated at daylight saving change. Choose another time.');
  return matches[0].toISOString();
}
