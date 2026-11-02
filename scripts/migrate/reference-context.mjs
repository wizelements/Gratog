/** A legacy reference must resolve to exactly one canonical entity. */
export function bindReference(map,reference,target){
 if(reference==null||reference==='')return;
 const value=String(reference);
 if(value.length>250||/[\x00-\x1f]/.test(value))throw Error('LEGACY_REFERENCE_INVALID');
 if(map.has(value)&&map.get(value)!==target)throw Error('LEGACY_REFERENCE_AMBIGUOUS');
 map.set(value,target);
}
export function bindOrderReferences(map,document){
 const target=String(document._id);
 for(const reference of [document._id,document.id,document.squareOrderId])bindReference(map,reference,target);
}
export function bindCustomerReferences(map,document){
 const target=String(document._id);
 for(const reference of [document._id,document.id])bindReference(map,reference,target);
}
