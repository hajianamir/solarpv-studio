import {z} from 'zod';
export const studyTimestamp = z.string().regex(/^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{3})?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/).refine(value=>{
  const day = new Date(`${value.slice(0,10)}T00:00:00Z`);
  return Number.isFinite(Date.parse(value)) && Number.isFinite(day.getTime()) && day.toISOString().slice(0,10)===value.slice(0,10);
},'Valid calendar timestamp and explicit UTC offset required');
