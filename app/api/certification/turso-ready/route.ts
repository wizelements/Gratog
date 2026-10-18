export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
import {NextResponse} from 'next/server';
import {assertTursoPreviewEnvironment,openTursoPreview,
  tursoPreviewSelected} from '@/lib/checkout/turso-preview-runtime.mjs';

const noCache={'Cache-Control':'no-store'};
/**
 * Read-only proof that the EXACT deployed preview can access the isolated
 * Turso database and Square Sandbox. Does NOT assert successful checkout.
 * No secrets, identities, DB URLs, or customer records are returned.
 */
export async function GET() {
  if(process.env.VERCEL_ENV!=='preview') {
    return NextResponse.json({ready:false},{status:404,headers:noCache});
  }
  let step='routing';
  try{
    if(!tursoPreviewSelected())return NextResponse.json({
      ready:false,code:'TURSO_PREVIEW_NOT_ENABLED'},{status:503,headers:noCache});
    step='isolation';
    assertTursoPreviewEnvironment();
    step='turso_read';
    const db=await openTursoPreview();
    const integrity=await db.get(
      'SELECT COUNT(*) AS n FROM products WHERE active=1'
    );
    const priced=await db.get(
      'SELECT v.price_cents,i.current_stock FROM products p '+
      'JOIN product_variations v ON v.product_id=p.id '+
      'JOIN inventory i ON i.product_id=p.id WHERE p.id=? AND v.id=?',
      'KZXEV24XZ2UCQUJ64BH7ZUJP','HYODQWXIJJVAPRIZ66SVUYE5'
    );
    const isolatedRead=Number(integrity?.n)>0&&
      Number(priced?.price_cents)===1199&&
      Number(priced?.current_stock)>0;
    if(!isolatedRead)return NextResponse.json({
      ready:false,code:'TURSO_PREVIEW_CATALOG_NOT_CERTIFIED',
    },{status:503,headers:noCache});
    step='square_sandbox_read';
    const response=await fetch('https://connect.squareupsandbox.com/v2/locations',{
      redirect:'error',signal:AbortSignal.timeout(12000),cache:'no-store',
      headers:{Authorization:'Bearer '+process.env.SQUARE_ACCESS_TOKEN,
        'Square-Version':'2026-09-16'},
    });
    if(!response.ok)throw Error('SQUARE_SANDBOX_PROVIDER_UNAVAILABLE');
    const provider=await response.json();
    const validSandboxLocation=Array.isArray(provider.locations)&&
      provider.locations.some((x:any)=>x.id===process.env.SQUARE_LOCATION_ID&&x.status==='ACTIVE');
    return NextResponse.json({
      ready:validSandboxLocation,
      code:validSandboxLocation?'READ_ONLY_STAGING_READY':'SQUARE_SANDBOX_LOCATION_MISMATCH',
      isolatedTursoRead:true,
      sandboxLocationVerified:validSandboxLocation,
      signedSquareWebhookDelivered:false,
      orderEmailDelivered:false,
      buyerCheckoutCertified:false,
      productionCutoverAuthorized:false,
    },{status:validSandboxLocation?200:503,headers:noCache});
  }catch(error){
    // Expose stage only. Do not log or disclose tokens, database URL, or driver error.
    return NextResponse.json({
      ready:false,code:'TURSO_PREVIEW_READINESS_BLOCKED',blockedAt:step,
      buyerCheckoutCertified:false,productionCutoverAuthorized:false,
    },{status:503,headers:noCache});
  }
}
