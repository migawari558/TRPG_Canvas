"""Run after npm run test:pdf-pagination; requires pdfplumber."""
from pathlib import Path
import pdfplumber

root = Path('.test-output/pdf-pagination')

def positions(name):
    result = {}
    with pdfplumber.open(root / name) as pdf:
        for page_index, page in enumerate(pdf.pages):
            for word in page.extract_words():
                result[word['text']] = (page_index, int(word['x0'] > page.width / 2))
    return result

for columns in [1, 2]:
    p = positions(f'headings-{columns}.pdf')
    headings = ['FIRST_HEADING', 'SECOND_HEADING', 'CHAPTER_C', 'FOURTH_HEADING']
    expected = [(i // columns, i % columns) for i in range(4)]
    assert [p[h] if columns == 2 else (p[h][0], 0) for h in headings] == expected
    assert p['H2_STAYS'] == p['FIRST_HEADING']

for kind in ['GM', 'QUOTE']:
    p = positions(f'blocks-{kind}.pdf')
    # The short block moves intact to the right column rather than splitting.
    assert {p[f'{kind}_{i}'] for i in range(6)} == {(0, 1)}
    # Oversized blocks remain complete and are allowed to span columns/pages.
    assert len({p[f'LONG_{kind}_{i:02d}'] for i in range(36)}) > 1
    assert p[f'LONG_{kind}_00'] == (0, 1), 'Oversized information must start in the current column'
    assert f'END_{kind}' in p

print('PASS: first heading exception, subsequent column/page breaks, intact short blocks, complete oversized blocks')
