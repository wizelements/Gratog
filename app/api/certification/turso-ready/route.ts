export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
import {NextResponse} from 'next/server';
import {assertTursoPreviewEnvironment,openTursoPreview,
  tursoPreviewSelected,readTursoSandboxCatalogStatus} from '@/lib/checkout/turso-preview-runtime.mjs';

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
    const catalog=await readTursoSandboxCatalogStatus(db);
    if(!catalog.catalogVerified)return NextResponse.json({
      ready:false,code:'TURSO_PREVIEW_CATALOG_NOT_CERTIFIED',...catalog,
      buyerCheckoutCertified:false,productionCutoverAuthorized:false,
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
    step='square_subscription_list';
    const subscriptions=await fetch('https://connect.squareupsandbox.com/v2/webhooks/subscriptions',{
      redirect:'error',signal:AbortSignal.timeout(12000),cache:'no-store',
      headers:{Authorization:'Bearer '+process.env.SQUARE_ACCESS_TOKEN,'Square-Version':'2026-09-16'},
    });
    if(subscriptions.status!==200)throw Error('SQUARE_SANDBOX_SUBSCRIPTION_LIST_UNAVAILABLE');
    return NextResponse.json({
      squareWebhookSubscriptionListHttp:subscriptions.status,
      squareWebhookSubscriptionListVerified:true,
      ready:validSandboxLocation,
      commit:process.env.VERCEL_GIT_COMMIT_SHA || null,
      code:validSandboxLocation?'READ_ONLY_STAGING_READY':'SQUARE_SANDBOX_LOCATION_MISMATCH',
      stagingTursoRead:true,
      credentialScopeCertified:false,
      ...catalog,
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
