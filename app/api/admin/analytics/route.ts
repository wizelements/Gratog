export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { PERMISSIONS } from '@/lib/security';
import { withAdminMiddleware, AuthenticatedRequest } from '@/lib/middleware/admin';
import { logger } from '@/lib/logger';
import { queryAdminAnalytics } from '@/lib/admin/analytics-query-repository';
import { z } from 'zod';

const QUERY_TIMEOUT_MS=10000, MAX_DATE_RANGE_DAYS=365;
const AnalyticsQuerySchema=z.object({
  startDate:z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate:z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  type:z.enum(['sales','orders','customers','products','revenue']).default('sales'),
  groupBy:z.enum(['day','week','month']).default('day'),
  limit:z.coerce.number().int().min(1).max(1000).default(365),
}).strict();

export const GET=withAdminMiddleware(async(request:AuthenticatedRequest)=>{
  const {searchParams}=new URL(request.url);
  const validation=AnalyticsQuerySchema.safeParse(Object.fromEntries(searchParams.entries()));
  if(!validation.success)return NextResponse.json({success:false,error:validation.error.errors.map(e=>e.message).join('; ')},{status:400});
  const {startDate,endDate,type,groupBy,limit}=validation.data;
  let start:Date,end:Date;
  if(startDate&&endDate){
    start=new Date(startDate);end=new Date(endDate);
    if(Number.isNaN(start.getTime())||Number.isNaN(end.getTime()))return NextResponse.json({success:false,error:'Invalid date format'},{status:400});
    if(start>end)return NextResponse.json({success:false,error:'Start date must be before end date'},{status:400});
    if((end.getTime()-start.getTime())/86400000>MAX_DATE_RANGE_DAYS)return NextResponse.json({success:false,error:`Date range exceeds maximum of ${MAX_DATE_RANGE_DAYS} days`},{status:400});
  }else{end=new Date();start=new Date(end.getTime()-30*86400000);}
  let timer:ReturnType<typeof setTimeout>|undefined;
  try{
    const timeout=new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(new Error('Query timeout')),QUERY_TIMEOUT_MS);});
    const result=await Promise.race([queryAdminAnalytics(type,start,end,groupBy,limit),timeout]);
    logger.info('ANALYTICS','Analytics query executed',{type,groupBy,dateRange:`${start.toISOString()} to ${end.toISOString()}`});
    return NextResponse.json({success:true,type,dateRange:{start:start.toISOString(),end:end.toISOString()},data:result});
  }catch(error){
    if(error instanceof Error&&error.message==='Query timeout'){logger.error('ANALYTICS','Query timeout',{type,startDate,endDate});return NextResponse.json({success:false,error:'Query took too long. Try a smaller date range.'},{status:504});}
    logger.error('ANALYTICS','Analytics query failed',error);return NextResponse.json({success:false,error:'Failed to fetch analytics'},{status:500});
  }finally{if(timer)clearTimeout(timer);}
},{permission:PERMISSIONS.ANALYTICS_VIEW,resource:'analytics',action:'view',rateLimit:{maxRequests:30,windowSeconds:60}});
