import pdfplumber
from PIL import Image

positions = {}
with pdfplumber.open('.test-output/pdf-writer/writer.pdf') as pdf:
    for i, page in enumerate(pdf.pages):
        for word in page.extract_words():
            positions[word['text']] = (i, word['x0'], word['top'])
for suffix in ['A','B']:
    chapter, heading = positions['CHAPTER_'+suffix], positions['HEADING_'+suffix]
    assert chapter[0] == heading[0] and (chapter[1] > 298) == (heading[1] > 298)
assert 40 < positions['UPRIGHT_B'][2] - positions['ITALIC_A'][2] < 48
assert positions['AFTER_BLANKS'][2] - positions['UPRIGHT_B'][2] > 60
assert abs(positions['COLUMN_START'][2] - positions['FILL_18'][2]) < 2
for page in [1,2]:
    image = Image.open(f'.test-output/pdf-writer/page-{page}.png').convert('RGB')
    for point in [(0,0),(image.width-1,0),(0,image.height-1),(image.width-1,image.height-1)]:
        assert image.getpixel(point) == (28,41,54)
print('PASS: consecutive headings, italic/blank gaps, leading whitespace suppression and full-page color')
