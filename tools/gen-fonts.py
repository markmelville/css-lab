import json, sys
src, out = sys.argv[1], sys.argv[2]
f = json.load(open(src, encoding='utf-8'))['familyMetadataList']
cats = ['Sans Serif', 'Serif', 'Display', 'Handwriting', 'Monospace']
rows = []
for x in f:
    if 'latin' not in x['subsets'] or 'Symbols' in x['family'] or x['category'] not in cats:
        continue
    w = sorted({int(k) for k in x['fonts'] if not k.endswith('i') and 100 <= int(k) <= 900})
    if not w:
        continue
    rows.append([x['family'], cats.index(x['category']), x.get('popularity') or 9999, w])
rows.sort(key=lambda r: r[2])
with open(out, 'w', encoding='utf-8') as o:
    o.write('// Snapshot of the Google Fonts catalog (fonts.google.com/metadata/fonts), taken 2026-11-21.\n')
    o.write('// Latin-capable families only. Row: [family, categoryIndex, popularityRank, weights]\n')
    o.write('window.FONT_CATEGORIES = ' + json.dumps(cats) + ';\n')
    o.write('window.GOOGLE_FONTS = [\n')
    o.write(',\n'.join(json.dumps(r, ensure_ascii=False, separators=(',', ':')) for r in rows))
    o.write('\n];\n')
print(len(rows))
