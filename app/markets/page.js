import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MapPin, Calendar, ExternalLink } from 'lucide-react';
import { MARKETS } from '@/lib/products';

export default function MarketsPage() {
  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="relative h-[400px] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <Image
            src="https://images.unsplash.com/photo-1567306295427-94503f8300d7?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2NjZ8MHwxfHNlYXJjaHwzfHxmYXJtZXJzJTIwbWFya2V0fGVufDB8fHx8MTc1OTg5MzE4NXww&ixlib=rb-4.1.0&q=85"
            alt="Farmers Market"
            fill
            className="object-cover brightness-50"
          />
        </div>
        <div className="container relative z-10 text-center text-white">
          <h1 className="text-5xl md:text-6xl font-bold mb-4">Find Us at Local Markets</h1>
          <p className="text-xl max-w-2xl mx-auto">
            Visit us in person to sample our products and experience the Taste of Gratitude difference
          </p>
        </div>
      </section>

      {/* Markets List */}
      <section className="container py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {MARKETS.map((market) => (
            <Card key={market.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="text-2xl">{market.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-[#D4AF37] mt-0.5" />
                  <div>
                    <p className="font-semibold">When</p>
                    <p className="text-muted-foreground">{market.when}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-[#D4AF37] mt-0.5" />
                  <div>
                    <p className="font-semibold">Where</p>
                    <p className="text-muted-foreground">{market.where}</p>
                  </div>
                </div>
                <Button
                  asChild
                  className="w-full bg-[#D4AF37] hover:bg-[#B8941F] text-white"
                >
                  <a href={market.mapsUrl} target="_blank" rel="noopener noreferrer">
                    Get Directions <ExternalLink className="ml-2 h-4 w-4" />
                  </a>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Call to Action */}
        <div className="mt-16 text-center max-w-2xl mx-auto">
          <h2 className="text-3xl font-bold mb-4">Can't Make It to a Market?</h2>
          <p className="text-lg text-muted-foreground mb-6">
            Shop online and have our premium sea moss products delivered right to your door!
          </p>
          <Button
            asChild
            size="lg"
            className="bg-[#D4AF37] hover:bg-[#B8941F] text-white"
          >
            <a href="/catalog">Shop Online Now</a>
          </Button>
        </div>
      </section>
    </div>
  );
}
