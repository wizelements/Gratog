import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

describe('Website Message us routing regression', () => {
  it('routes the floating website action directly to its actual contact form', () => {
    const button = source('components/WebsiteMessageButton.tsx');
    expect(button).toContain('"/contact?source=message-us#send-message"');
    expect(button).toContain('href="/contact?source=message-us#send-message"');
    expect(button).not.toContain('smsHref ? "/text-us"');
    expect(button).toContain('sm:right-6');
    expect(button).toContain('Message us');
    expect(button).toContain("href={smsHref}");
  });

  it('redirects old /text-us bookmarks when no verified Square destination exists', () => {
    const page = source('app/text-us/page.tsx');
    expect(page).toContain('if (!smsHref && !hosted)');
    expect(page).toContain("redirect('/contact?source=message-us#send-message')");
    expect(page).not.toContain("href=\"https://tasteofgratitude.shop\"");
  });

  it('shows an anchored, accessible and working form with truthful messaging', () => {
    const page = source('app/contact/page.js');
    const api = source('app/api/contact/route.ts');
    expect(page).toContain('id="send-message"');
    expect(page).toContain("params.get('source') === 'message-us'");
    expect(page).toContain("scrollIntoView({ block: 'start' })");
    expect(page).toContain('Sending a message doesn’t place an order or charge you.');
    expect(page).toContain("fetch('/api/contact'");
    expect(api).toContain("db.collection('contact_messages').insertOne");
    expect(api).toContain("export async function POST");
  });
});
