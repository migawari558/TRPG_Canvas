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

for columns in [1, 2]:
    locations, speakers = set(), set()
    with pdfplumber.open(root / f'dialogue-{columns}.pdf') as pdf:
        for page_index, page in enumerate(pdf.pages):
            for word in page.extract_words():
                location = (page_index, int(columns == 2 and word['x0'] > page.width / 2))
                if word['text'].startswith('DIALOGUE_') and word['text'] not in ['DIALOGUE_START', 'DIALOGUE_END']:
                    locations.add(location)
                if word['text'] == 'SPEAKER':
                    speakers.add(location)
    assert len(locations) > 1, 'The dialogue fixture must span pages or columns'
    assert locations <= speakers, f'Speaker name must repeat at each dialogue continuation: {locations - speakers}'

print('PASS: heading breaks, intact/oversized blocks and repeated dialogue speakers')
