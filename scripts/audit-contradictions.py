#!/usr/bin/env python3
"""
Scrape https://tasteofgratitude.shop and assert against rendered HTML for
contradictions listed in the subagent task. Uses requests + BeautifulSoup.
No JavaScript execution; relies on server-rendered HTML from Next.js.
"""
import re
import sys
import json
import hashlib
import requests
from pathlib import Path
from urllib.parse import urljoin
from bs4 import BeautifulSoup

BASE_URL = "https://tasteofgratitude.shop"
OUT_DIR = Path("/data/data/com.termux/files/home/.openclaw/workspace/Gratog/audit-output")
OUT_DIR.mkdir(parents=True, exist_ok=True)

PAGES = {
    "homepage": BASE_URL,
    "catalog": f"{BASE_URL}/catalog",
    "contact": f"{BASE_URL}/contact",
    "policies": f"{BASE_URL}/policies",
    "faq": f"{BASE_URL}/faq",
    "terms": f"{BASE_URL}/terms",
    "privacy": f"{BASE_URL}/privacy",
    "wholesale": f"{BASE_URL}/wholesale",
    "shipping": f"{BASE_URL}/policies#shipping",
    "weekly-menu": f"{BASE_URL}/weekly-menu",
    "markets": f"{BASE_URL}/markets",
    "about": f"{BASE_URL}/about",
}

# Forbidden assertions grouped by contradiction.
ASSERTIONS = [
    # 1. SMS Language
    {"id": "sms-footer-1", "contradiction": "SMS Language", "page_keys": ["homepage"], "patterns": ["Get weekly menu drops, pickup reminders, and restock notes"], "context": "Footer newsletter CTA without email-only alternative"},
    {"id": "sms-contact-1", "contradiction": "SMS Language", "page_keys": ["contact"], "patterns": ["Text us"], "context": "Contact page CTA"},
    {"id": "sms-policies-1", "contradiction": "SMS Language", "page_keys": ["policies", "privacy", "terms"], "patterns": ["Reply STOP to opt out"], "context": "Policies SMS opt-out"},
    # 2. Placeholder Reviews
    {"id": "reviews-home-1", "contradiction": "Placeholder Reviews", "page_keys": ["homepage"], "patterns": ["Real customer reviews will appear here"], "context": "Homepage reviews placeholder"},
    # 3. Unfinished Bundles
    {"id": "bundles-product-1", "contradiction": "Unfinished Bundles", "page_keys": ["catalog"], "patterns": ["Bundle savings will apply once Square bundle SKUs are live"], "context": "Product pages bundle placeholder"},
    # 4. Shipping Promises
    {"id": "shipping-footer-1", "contradiction": "Shipping Promises", "page_keys": ["homepage"], "patterns": ["Shipping Policy"], "context": "Footer shipping link"},
    {"id": "shipping-checkout-1", "contradiction": "Shipping Promises", "page_keys": ["catalog"], "patterns": ["Shipping", "shipping"], "context": "Checkout shipping calculations (catalog/cart proxy)"},
    # 5. Wellness Claims
    {"id": "wellness-1", "contradiction": "Wellness Claims", "page_keys": ["catalog", "homepage"], "patterns": ["immune support", "detox", "alkalizing", "anti-inflammatory"], "context": "Product descriptions wellness claims"},
    # 6. Duplicate Products
    {"id": "dup-blue-lotus-1", "contradiction": "Duplicate Products", "page_keys": ["catalog"], "patterns": ["Blue Lotus Gel", "Blue Lotus"], "context": "Duplicate Blue Lotus products in catalog"},
    # 7. Pricing Conflicts
    {"id": "pricing-11-1199", "contradiction": "Pricing Conflicts", "page_keys": ["catalog"], "patterns": ["$11.00", "$11.99"], "context": "Same product conflicting prices"},
    # 8. Wholesale Links
    {"id": "wholesale-footer-1", "contradiction": "Wholesale Links", "page_keys": ["homepage"], "patterns": ["Wholesale"], "context": "Footer wholesale link"},
    # 9. Instagram Missing
    {"id": "instagram-contact-1", "contradiction": "Instagram Missing", "page_keys": ["contact"], "patterns": ["instagram.com/tasteofgratitude"], "context": "Verified Instagram link on contact page", "expect_missing": True},
    # 10. Returning-Customer Path
    {"id": "returning-home-1", "contradiction": "Returning-Customer Path", "page_keys": ["homepage"], "patterns": ["Returning customer", "I already know what I want", "Quick reorder", "Fulfillment choice"], "context": "No visible fulfillment choice before market selection", "expect_missing": True},
]

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
}


def fetch_page(url: str) -> tuple[str, int]:
    try:
        resp = requests.get(url, headers=HEADERS, timeout=30, allow_redirects=True)
        resp.raise_for_status()
        return resp.text, resp.status_code
    except requests.RequestException as e:
        return f"ERROR: {e}", 0


def text_of(html: str) -> str:
    soup = BeautifulSoup(html, "html.parser")
    # Remove script/style
    for tag in soup(["script", "style", "noscript"]):
        tag.decompose()
    return " ".join(soup.stripped_strings)


def snippet(html: str, needle: str, radius: 120) -> str:
    idx = html.lower().find(needle.lower())
    if idx == -1:
        return ""
    start = max(0, idx - radius)
    end = min(len(html), idx + len(needle) + radius)
    return html[start:end].replace("\n", " ")


def screenshot_placeholder(url: str, finding_id: str) -> str:
    # We cannot take real screenshots without a browser; save page HTML instead.
    safe = re.sub(r"[^A-Za-z0-9_-]", "_", finding_id)
    html_path = OUT_DIR / f"{safe}.html"
    text, status = fetch_page(url)
    html_path.write_text(text, encoding="utf-8")
    return str(html_path)


def evaluate():
    findings = []
    page_cache = {}

    for key, url in PAGES.items():
        html, status = fetch_page(url)
        page_cache[key] = {"html": html, "status": status, "url": url}
        if status != 200:
            findings.append({
                "page_url": url,
                "page_key": key,
                "contradiction": "FETCH_FAILURE",
                "assertion_id": "fetch",
                "phrase": "N/A",
                "found": False,
                "html_snippet": f"HTTP {status} - {html[:200]}",
                "screenshot_path": "",
                "context": "Page could not be fetched",
            })

    for assertion in ASSERTIONS:
        for key in assertion["page_keys"]:
            if key not in page_cache:
                continue
            cache = page_cache[key]
            html = cache["html"]
            text = text_of(html)
            found_any = False
            matched_phrases = []
            for phrase in assertion["patterns"]:
                if phrase.lower() in html.lower() or phrase.lower() in text.lower():
                    found_any = True
                    matched_phrases.append(phrase)
            expect_missing = assertion.get("expect_missing", False)
            if expect_missing:
                # For missing assertions, report a finding if the phrase IS present (contradiction)
                # or if it is missing (the desired state). The task asks to assert contradictions,
                # so we report when the forbidden state exists. For "Instagram Missing" the forbidden
                # state is "verified Instagram link present"? Actually task says "No verified Instagram link"
                # is the contradiction. So if it IS missing, that's the contradiction.
                # We will report the missing state as a finding.
                if not found_any:
                    findings.append({
                        "page_url": cache["url"],
                        "page_key": key,
                        "contradiction": assertion["contradiction"],
                        "assertion_id": assertion["id"],
                        "phrase": assertion["patterns"][0],
                        "found": False,
                        "html_snippet": "",
                        "screenshot_path": screenshot_placeholder(cache["url"], assertion["id"]),
                        "context": assertion["context"],
                    })
                continue
            if found_any:
                for phrase in matched_phrases:
                    findings.append({
                        "page_url": cache["url"],
                        "page_key": key,
                        "contradiction": assertion["contradiction"],
                        "assertion_id": assertion["id"],
                        "phrase": phrase,
                        "found": True,
                        "html_snippet": snippet(html, phrase, 120),
                        "screenshot_path": screenshot_placeholder(cache["url"], f"{assertion['id']}_{hashlib.md5(phrase.encode()).hexdigest()[:8]}"),
                        "context": assertion["context"],
                    })

    # Product pages: discover product links from catalog and run assertions.
    catalog_html = page_cache.get("catalog", {}).get("html", "")
    if catalog_html:
        soup = BeautifulSoup(catalog_html, "html.parser")
        product_links = set()
        for a in soup.find_all("a", href=True):
            href = a["href"]
            if "/products/" in href or "/product/" in href:
                product_links.add(urljoin(BASE_URL, href))
        print(f"Discovered {len(product_links)} product links", file=sys.stderr)
        for product_url in sorted(product_links)[:20]:
            html, status = fetch_page(product_url)
            if status != 200:
                continue
            text = text_of(html)
            for assertion in ASSERTIONS:
                if assertion["contradiction"] in ("Unfinished Bundles", "Wellness Claims", "Pricing Conflicts", "Duplicate Products"):
                    found_any = False
                    matched = []
                    for phrase in assertion["patterns"]:
                        if phrase.lower() in html.lower() or phrase.lower() in text.lower():
                            found_any = True
                            matched.append(phrase)
                    if found_any:
                        for phrase in matched:
                            findings.append({
                                "page_url": product_url,
                                "page_key": "product",
                                "contradiction": assertion["contradiction"],
                                "assertion_id": assertion["id"],
                                "phrase": phrase,
                                "found": True,
                                "html_snippet": snippet(html, phrase, 120),
                                "screenshot_path": screenshot_placeholder(product_url, f"{assertion['id']}_{hashlib.md5((product_url+phrase).encode()).hexdigest()[:8]}"),
                                "context": assertion["context"],
                            })

    report_path = OUT_DIR / "contradictions-report.json"
    report_path.write_text(json.dumps(findings, indent=2), encoding="utf-8")

    # Human-readable summary
    summary_lines = [
        f"# Contradictions Audit Report — {BASE_URL}",
        f"Total findings: {len(findings)}",
        "",
    ]
    for f in findings:
        summary_lines.append(f"## {f['contradiction']} | {f['page_key']} | {f['assertion_id']}")
        summary_lines.append(f"- **URL:** {f['page_url']}")
        summary_lines.append(f"- **Phrase:** `{f['phrase']}` | Found: {f['found']}")
        summary_lines.append(f"- **Context:** {f['context']}")
        if f["html_snippet"]:
            summary_lines.append(f"- **Snippet:** `{f['html_snippet'][:240]}`")
        if f["screenshot_path"]:
            summary_lines.append(f"- **Saved HTML:** `{f['screenshot_path']}`")
        summary_lines.append("")

    summary_path = OUT_DIR / "contradictions-report.md"
    summary_path.write_text("\n".join(summary_lines), encoding="utf-8")

    print(json.dumps({
        "total_findings": len(findings),
        "json_report": str(report_path),
        "markdown_report": str(summary_path),
        "output_dir": str(OUT_DIR),
    }, indent=2))


if __name__ == "__main__":
    evaluate()
