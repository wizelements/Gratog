import Image from 'next/image';
import Link from 'next/link';
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
            alt="Jenneisha at the farmers market"
            fill
            className="object-cover brightness-50"
          />
        </div>
        <div className="absolute inset-0 bg-black/40 z-[1]" />
        <div className="container relative z-10 text-center text-white">
          <h1 className="text-5xl md:text-6xl font-bold mb-4 drop-shadow-lg">Our Story</h1>
          <p className="text-xl max-w-2xl mx-auto drop-shadow-md">
            From my kitchen to the farmers market — made with gratitude, every single jar
          </p>
        </div>
      </section>

      {/* Jenneisha's Story */}
      <section className="container py-16">
        <div className="max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-8 text-center">
            Hi, I&apos;m Jenneisha
          </h2>
          <div className="space-y-5 text-lg text-muted-foreground leading-relaxed content-readable mx-auto">
            <p>
              A few years ago, I was going through one of those seasons where everything felt heavy.
              I was exhausted, run down, and honestly just looking for something — anything — that
              would help me feel like myself again. That&apos;s when I started making sea moss gel
              in my own kitchen. Not for a business. Just for me.
            </p>
            <p>
              It became a quiet ritual. Soaking, blending, pouring — there was something grounding
              about the process. I started feeling better. More present. More grateful for the small
              things. So I made a jar for my mom. Then my sister. Then a neighbor. Before I knew it,
              people were asking, <em>&ldquo;Can you make me one too?&rdquo;</em>
            </p>
            <p>
              That&apos;s how Taste of Gratitude was born — not from a business plan, but from a
              kitchen full of mason jars and a feeling I wanted to share. The name came naturally.
              Every jar I made reminded me of what I was grateful for: my health coming back,
              my family showing up, the chance to create something with my hands.
            </p>
            <p>
              I brought my first batch to a local farmers market in Atlanta, and that changed everything.
              Watching someone try my sea moss gel for the first time at the Serenbe Market — their eyes going
              wide — that&apos;s when I knew this was bigger than me. Now you can find us at Serenbe
              and Dunwoody farmers markets, and every weekend I&apos;m still behind the table, still
              making everything in small batches, still grateful.
            </p>
          </div>
        </div>

        {/* Values */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="text-center">
            <CardContent className="pt-6">
              <div className="icon-container mx-auto mb-4">
                <Leaf className="h-8 w-8 text-[#D4AF37]" />
              </div>
              <h3 className="font-semibold mb-2">Ingredients You Can See</h3>
              <p className="text-sm text-muted-foreground">
                Real ingredients, nothing hidden. We&apos;ll always tell you exactly what&apos;s in the jar.
              </p>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardContent className="pt-6">
              <div className="icon-container mx-auto mb-4">
                <Heart className="h-8 w-8 text-[#D4AF37]" />
              </div>
              <h3 className="font-semibold mb-2">Small Batch, Big Intention</h3>
              <p className="text-sm text-muted-foreground">
                Every jar is hand-prepared in small batches — never mass-produced, always made with care.
              </p>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardContent className="pt-6">
              <div className="icon-container mx-auto mb-4">
                <Award className="h-8 w-8 text-[#D4AF37]" />
              </div>
              <h3 className="font-semibold mb-2">Wildcrafted Sourcing</h3>
              <p className="text-sm text-muted-foreground">
                Our sea moss is wildcrafted from clean ocean waters — never pool-grown, never artificial.
              </p>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardContent className="pt-6">
              <div className="icon-container mx-auto mb-4">
                <Users className="h-8 w-8 text-[#D4AF37]" />
              </div>
              <h3 className="font-semibold mb-2">Real Market Presence</h3>
              <p className="text-sm text-muted-foreground">
                We show up every weekend at Atlanta farmers markets. Come say hi — we love meeting our people.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gradient-to-r from-emerald-900 to-teal-900 py-16">
        <div className="container text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Come Find Us at the Market
          </h2>
          <p className="text-lg text-emerald-100/80 max-w-2xl mx-auto mb-8">
            The best way to experience Taste of Gratitude is in person. Try the gel,
            and let me tell you the story behind each flavor.
          </p>
          <Link
            href="/markets"
            className="inline-block bg-[#D4AF37] hover:bg-[#C5A028] text-black font-semibold px-8 py-3 rounded-full transition-colors text-lg"
          >
            See Where We&apos;ll Be
          </Link>
        </div>
      </section>
    </div>
  );
}
