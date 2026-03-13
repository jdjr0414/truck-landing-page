"""Word count audit for indexable HTML pages. Flags pages under 900 words."""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MIN_WORDS = 900
EXCLUDE = {'sitemap.html', '404.html'}

def count_words(html: str) -> int:
    # Remove script and style blocks
    html = re.sub(r'<script[^>]*>.*?</script>', ' ', html, flags=re.DOTALL | re.IGNORECASE)
    html = re.sub(r'<style[^>]*>.*?</style>', ' ', html, flags=re.DOTALL | re.IGNORECASE)
    html = re.sub(r'<!--.*?-->', ' ', html, flags=re.DOTALL)
    # Strip tags
    text = re.sub(r'<[^>]+>', ' ', html)
    text = ' '.join(text.split())
    return len(text.split()) if text.strip() else 0

results = []
for f in ROOT.rglob('*.html'):
    rel = str(f.relative_to(ROOT)).replace('\\', '/')
    if f.name in EXCLUDE:
        continue
    try:
        content = f.read_text(encoding='utf-8', errors='ignore')
        words = count_words(content)
        results.append((rel, words))
    except Exception as e:
        print(f"Error {rel}: {e}")

short = [(p, w) for p, w in results if w < MIN_WORDS]
short.sort(key=lambda x: x[1])

sections = {
    'index': [], 'vehicles': [], 'vehicle-index': [], 'business-guides': [],
    'equipment-costs': [], 'guides': [], 'industries': [], 'questions': [],
    'data': [], 'glossary': [], 'comparisons': [], 'hubs': [], 'other': []
}

for path, words in short:
    first = path.split('/')[0] if '/' in path else 'index' if path == 'index.html' else 'other'
    if path == 'index.html':
        first = 'index'
    elif first not in sections:
        first = 'other'
    sections[first].append((path, words))

report = f"""# Word Count Audit - Pages Under {MIN_WORDS} Words

## Summary
- Total short pages: {len(short)}
- Threshold: {MIN_WORDS} words minimum

## By Section
"""

for sec in ['index', 'vehicles', 'vehicle-index', 'business-guides', 'equipment-costs',
            'guides', 'industries', 'questions', 'data', 'glossary', 'comparisons', 'hubs', 'other']:
    items = sections[sec]
    if not items:
        continue
    report += f"\n### {sec} ({len(items)} pages)\n"
    for path, words in sorted(items, key=lambda x: x[1]):
        report += f"- {path} ({words} words)\n"

out = ROOT / 'word-count-audit-report.md'
out.write_text(report, encoding='utf-8')
print(f"Report saved to: {out}")
print(f"Short pages: {len(short)}")
for path, words in short[:20]:
    print(f"  {path}: {words}")
