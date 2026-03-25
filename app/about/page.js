import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import { Leaf, Heart, Award, Users } from 'lucide-react';

export default function AboutPage() {
  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="relative h-[400px] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <Image
            src="https://images.unsplash.com/photo-1518495973542-4542c06a5843?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDk1Nzh8MHwxfHNlYXJjaHwyfHxob2xpc3RpYyUyMHdlbGxuZXNzfGVufDB8fHx8MTc1OTgwOTQzNXww&ixlib=rb-4.1.0&q=85"
            alt="About Taste of Gratitude"
            fill
            className="object-cover brightness-50"
          />
        </div>
        <div className="absolute inset-0 bg-black/40 z-[1]" />
        <div className="container relative z-10 text-center text-white">
          <h1 className="text-5xl md:text-6xl font-bold mb-4 drop-shadow-lg">Our Story</h1>
          <p className="text-xl max-w-2xl mx-auto drop-shadow-md">
            Crafted with gratitude, rooted in wellness
          </p>
        </div>
      </section>

      {/* Mission */}
      <section className="container py-16">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">Our Mission</h2>
          <p className="text-lg text-muted-foreground leading-relaxed content-readable mx-auto">
            At Taste of Gratitude, we believe wellness should be accessible, delicious, and rooted in nature's wisdom. 
            We craft premium sea moss gel products using wildcrafted ingredients and time-honored preparation methods, 
            bringing you the ocean's most powerful superfood in its purest form.
          </p>
        </div>

        {/* Values */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="text-center">
            <CardContent className="pt-6">
              <div className="icon-container mx-auto mb-4">
                <Leaf className="h-8 w-8 text-[#D4AF37]" />
              </div>
              <h3 className="font-semibold mb-2">Natural Ingredients</h3>
              <p className="text-sm text-muted-foreground">
                Only the finest wildcrafted sea moss and organic ingredients
              </p>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardContent className="pt-6">
              <div className="icon-container mx-auto mb-4">
                <Heart className="h-8 w-8 text-[#D4AF37]" />
              </div>
              <h3 className="font-semibold mb-2">Made with Love</h3>
              <p className="text-sm text-muted-foreground">
                Hand-crafted in small batches with intention and care
              </p>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardContent className="pt-6">
              <div className="icon-container mx-auto mb-4">
                <Award className="h-8 w-8 text-[#D4AF37]" />
              </div>
              <h3 className="font-semibold mb-2">Quality First</h3>
              <p className="text-sm text-muted-foreground">
                Rigorous standards ensure every jar meets our high expectations
              </p>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardContent className="pt-6">
              <div className="icon-container mx-auto mb-4">
                <Users className="h-8 w-8 text-[#D4AF37]" />
              </div>
              <h3 className="font-semibold mb-2">Community Focus</h3>
              <p className="text-sm text-muted-foreground">
                Supporting local farmers markets, handcrafted boba at Serenbe Markets, and wellness education
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Why Sea Moss */}
      <section className="bg-muted/50 py-16">
        <div className="container">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold mb-6 text-center">Why Sea Moss?</h2>
            <div className="space-y-4 text-muted-foreground">
              <p>
                Sea moss, also known as Irish moss, is a type of red algae that grows along the rocky Atlantic coasts. 
                For centuries, coastal communities have recognized its incredible nutritional profile and healing properties.
              </p>
              <p>
                Rich in 92 of the 102 minerals our bodies need, sea moss supports:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Immune system function and overall wellness</li>
                <li>Digestive health and gut microbiome balance</li>
                <li>Thyroid function and metabolism</li>
                <li>Skin health and natural collagen production</li>
                <li>Energy levels and mental clarity</li>
              </ul>
              <p>
                Our sea moss is wildcrafted from pristine waters, ensuring the highest quality and mineral content. 
                We prepare it using traditional methods that preserve its nutritional integrity while making it delicious 
                and easy to incorporate into your daily routine.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
