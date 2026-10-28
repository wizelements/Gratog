/**
 * Turso-preview ONLY: merchant production batch planner.
 * Merchants can approve planned preorder caps; this route NEVER writes Square
 * inventory, enables checkout, or represents finished bottled quantities.
 * Requires an authenticated admin session + CSRF through existing middleware.
 */
export const dynamic = 'force-dynamic';
import {NextResponse} from 'next/server';
import {withAdminMiddleware} from '@/lib/middleware/admin';
import {PERMISSIONS} from '@/lib/security';
import {openTursoPreview,tursoPreviewSelected} from '@/lib/checkout/turso-preview-runtime.mjs';
import {buildWeeklyBatchPlan,BatchPlanError} from '@/lib/preorder/turso-batch-planning.mjs';

const headers={'Cache-Control':'private, no-store'};
const error=(message:string,status=400)=>NextResponse.json({success:false,error:message},{status,headers});
const table=`CREATE TABLE IF NOT EXISTS preorder_batch_plans (
  pickup_date TEXT NOT NULL,
  product_id TEXT NOT NULL,
  variation_id TEXT NOT NULL,
  product_name TEXT NOT NULL,
  planned_gallons INTEGER NOT NULL CHECK(planned_gallons IN (4,8)),
  theoretical_bottles INTEGER NOT NULL,
  preorder_cap INTEGER NOT NULL CHECK(preorder_cap>=0),
  market_target INTEGER NOT NULL,
  planning_buffer INTEGER NOT NULL,
  reserved_units INTEGER NOT NULL DEFAULT 0 CHECK(reserved_units>=0),
  merchant_approved INTEGER NOT NULL DEFAULT 1,
  checkout_enabled INTEGER NOT NULL DEFAULT 0 CHECK(checkout_enabled=0),
  approved_by TEXT NOT NULL,
  approved_at TEXT NOT NULL,
  PRIMARY KEY(pickup_date,product_id)
)`;
function nextPickupDateValid(date:string){
  if(typeof date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(date))return false;
  const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',
    year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
  const value=(x:string)=>parts.find(p=>p.type===x)?.value;
  const today=value('year')+'-'+value('month')+'-'+value('day');
  const days=Math.round((Date.parse(date+'T00:00:00Z')-Date.parse(today+'T00:00:00Z'))/86400000);
  return days>=1&&days<=35;
}
export const GET=withAdminMiddleware(async request=>{
  if(!tursoPreviewSelected())return error('PREVIEW_ONLY',404);
  const pickupDate=new URL(request.url).searchParams.get('pickupDate')||'';
  try{
    if(!nextPickupDateValid(pickupDate))return error('Choose an upcoming Saturday within 35 days.');
    const db=await openTursoPreview();
    const exists=await db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='preorder_batch_plans'");
    if(!exists)return NextResponse.json({success:true,pickupDate,rows:[],schemaReady:false,
      checkoutEnabled:false},{headers});
    const rows=await db.all('SELECT pickup_date,product_id,variation_id,product_name,planned_gallons,theoretical_bottles,preorder_cap,market_target,planning_buffer,reserved_units,approved_at FROM preorder_batch_plans WHERE pickup_date=? ORDER BY product_name',pickupDate);
    return NextResponse.json({success:true,pickupDate,rows,schemaReady:true,
      checkoutEnabled:false},{headers});
  }catch{return error('Batch planning unavailable',503);}
},{permission:PERMISSIONS.INVENTORY_VIEW,resource:'preview_batches',action:'view',skipAudit:true});

export const POST=withAdminMiddleware(async request=>{
  if(!tursoPreviewSelected())return error('PREVIEW_ONLY',404);
  try{
    const input=await request.json();
    if(!nextPickupDateValid(input?.pickupDate))return error('Select an upcoming Saturday within 35 days');
    const plan=buildWeeklyBatchPlan(input);
    const db=await openTursoPreview(); // Explicit environment/DB/Square scope guard.
    await db.run(table);
    const operation=db.transactionAsync(async tx=>{
      const prior=await tx.all('SELECT reserved_units,checkout_enabled FROM preorder_batch_plans WHERE pickup_date=?',plan.pickupDate);
      if(prior.some((r:any)=>Number(r.reserved_units)!==0||Number(r.checkout_enabled)!==0))
        throw new BatchPlanError('EXISTING_COMMITMENTS_REQUIRE_RECONCILIATION');
      // Replace only one exact pickup date atomically: unselected flavors have NO cap.
      await tx.run('DELETE FROM preorder_batch_plans WHERE pickup_date=?',plan.pickupDate);
      const at=new Date().toISOString();
      for(const row of plan.rows){
        await tx.run('INSERT INTO preorder_batch_plans (pickup_date,product_id,variation_id,product_name,planned_gallons,theoretical_bottles,preorder_cap,market_target,planning_buffer,reserved_units,merchant_approved,checkout_enabled,approved_by,approved_at) VALUES (?,?,?,?,?,?,?,?,?,0,1,0,?,?)',
          plan.pickupDate,row.productId,row.variationId,row.name,row.gallons,
          row.theoreticalBottles,row.preorderCap,row.marketTarget,row.uncertaintyBuffer,
          String(request.admin.email).slice(0,255),at);
      }
    });
    await operation.immediate();
    const rows=await db.all('SELECT product_name,planned_gallons,preorder_cap,market_target,planning_buffer FROM preorder_batch_plans WHERE pickup_date=? ORDER BY product_name',plan.pickupDate);
    return NextResponse.json({success:true,pickupDate:plan.pickupDate,rows,
      flavorCount:plan.flavorCount,containerSlots:plan.containerSlots,
      approvedPlanningCap:plan.proposedPreorderCap,
      physicalStockVerified:false,checkoutEnabled:false,
      message:'Production plan saved. Checkout remains locked pending independent certification.'},{headers});
  }catch(e){
    if(e instanceof BatchPlanError)return error(e.code,422);
    return error('Unable to save isolated production batch plan',503);
  }
},{permission:PERMISSIONS.INVENTORY_ADJUST,resource:'preview_batches',action:'approve',skipAudit:true});
