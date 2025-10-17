/**
 * Demo script to test product ingestion with mock data
 */

const { upsertProduct } = require('./lib/database');

async function createDemoProducts() {
  console.log('🚀 Creating demo products...');
  
  const products = [
    {
      slug: 'elderberry-sea-moss-gel',
      title: 'Elderberry Sea Moss Gel',
      description: 'Premium wildcrafted sea moss gel infused with elderberry',
      brand: 'Taste of Gratitude',
      category: 'Wellness',
      images: [
        {
          url: 'https://images.unsplash.com/photo-1559181567-c3190ca9959b?w=400',
          alt: 'Elderberry Sea Moss Gel',
          position: 1
        }
      ],
      variants: [
        {
          sku: 'ESM-16OZ-001',
          options: { size: '16oz' },
          price_cents: 3600,
          currency: 'USD',
          availability: 'in_stock'
        }
      ],
      source_url: 'https://demo.com/products/elderberry-sea-moss-gel',
      handle: 'elderberry-sea-moss-gel',
      active: true
    },
    {
      slug: 'healing-harmony-soursop',
      title: 'Healing Harmony Soursop Sea Moss',
      description: 'Soursop, cinnamon, star anise, and ginger blended with sea moss',
      brand: 'Taste of Gratitude',
      category: 'Digestive Health',
      images: [
        {
          url: 'https://images.unsplash.com/photo-1587384474964-3a06ce1ce699?w=400',
          alt: 'Healing Harmony Soursop',
          position: 1
        }
      ],
      variants: [
        {
          sku: 'HHS-16OZ-001',
          options: { size: '16oz' },
          price_cents: 3500,
          currency: 'USD',
          availability: 'in_stock'
        }
      ],
      source_url: 'https://demo.com/products/healing-harmony-soursop',
      handle: 'healing-harmony-soursop',
      active: true
    }
  ];
  
  let count = 0;
  
  for (const product of products) {
    try {
      const productId = await upsertProduct(product, 'demo');
      console.log(`✅ Created: ${product.title} (${productId})`);
      count++;
    } catch (error) {
      console.error(`❌ Failed: ${product.title} - ${error.message}`);
    }
  }
  
  console.log(`\n📊 Created ${count} products`);
  return count;
}

// Run the demo
createDemoProducts()
  .then(() => {
    console.log('🎉 Demo complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });