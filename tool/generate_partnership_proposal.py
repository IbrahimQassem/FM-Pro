#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
HudHud FM - Partnership Proposal DOCX Generator
Generates a formal, executive, corporate partnership proposal document
strictly based on the actual verified project scope and technical contracts of HudHud FM.
"""

import os
import sys
import io
import zipfile
import html

# Palette based on HudHud FM Brand Contract (docs/brand/brand-contract.md & lib/core/theme/app_colors.dart)
COLOR_PRIMARY = "8E3E63"        # Royal Yemeni Plum / Burgundy
COLOR_HERO_START = "8B2648"     # Deep Crimson Maroon
COLOR_HERO_END = "451222"       # Acoustic Midnight Burgundy
COLOR_SURFACE_LIGHT = "FCF8F8"   # Warm Porcelain Cream
COLOR_CONTAINER_LIGHT = "FFD8E4" # Soft Rose Tint
COLOR_ON_CONTAINER = "3B0021"   # Deep Wine Text
COLOR_OUTLINE = "D5C2C6"        # Subtle Rose Gray
COLOR_BORDER_LIGHT = "EADBDF"   # Table row border
COLOR_ALT_ROW = "FAF5F7"        # Alternating table row
COLOR_TEXT_MAIN = "1F1A1C"      # High-contrast obsidian wine text
COLOR_TEXT_MUTED = "66555C"     # Muted gray-wine
COLOR_STATUS_GREEN = "1A8F5A"   # Live Stream Broadcast Green
COLOR_CALLOUT_BG = "FFF5F8"     # Light tinted callout box background

def escape(text):
    if text is None:
        return ""
    return html.escape(str(text))

class DocxBuilder:
    def __init__(self):
        self.paragraphs_xml = []
        self.relationships = [
            ('rIdStyles', 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles', 'styles.xml'),
            ('rIdSettings', 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings', 'settings.xml'),
            ('rIdFontTable', 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/fontTable', 'fontTable.xml'),
            ('rIdHeader1', 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/header', 'header1.xml'),
            ('rIdFooter1', 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer', 'footer1.xml'),
        ]
        self.media_files = {} # target_path -> bytes
        self.image_counter = 0

    def add_image_rel(self, image_path):
        if not os.path.exists(image_path):
            return None
        self.image_counter += 1
        r_id = f"rIdImage{self.image_counter}"
        ext = os.path.splitext(image_path)[1].lower().replace('.', '')
        if ext == 'jpg': ext = 'jpeg'
        target_in_word = f"media/image{self.image_counter}.{ext}"
        with open(image_path, 'rb') as f:
            data = f.read()
        self.media_files[f"word/{target_in_word}"] = (data, ext)
        self.relationships.append((r_id, 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/image', target_in_word))
        return r_id, ext

    def add_raw_xml(self, xml_str):
        self.paragraphs_xml.append(xml_str)

    def p(self, text, style="Normal", align="right", bold=False, italic=False, color=None, size_pt=11.5, space_before=0, space_after=120, line_spacing=276):
        sz = int(size_pt * 2)
        color_xml = f'<w:color w:val="{color}"/>' if color else f'<w:color w:val="{COLOR_TEXT_MAIN}"/>'
        b_xml = '<w:b/><w:bCs/>' if bold else ''
        i_xml = '<w:i/><w:iCs/>' if italic else ''
        jc_val = align
        
        xml = f'''<w:p>
  <w:pPr>
    <w:pStyle w:val="{style}"/>
    <w:bidi/>
    <w:jc w:val="{jc_val}"/>
    <w:spacing w:before="{space_before}" w:after="{space_after}" w:line="{line_spacing}" w:lineRule="auto"/>
  </w:pPr>
  <w:r>
    <w:rPr>
      <w:rFonts w:ascii="Cairo" w:hAnsi="Cairo" w:cs="Cairo"/>
      <w:rtl/>
      {b_xml}
      {i_xml}
      <w:sz w:val="{sz}"/>
      <w:szCs w:val="{sz}"/>
      {color_xml}
    </w:rPr>
    <w:t xml:space="preserve">{escape(text)}</w:t>
  </w:r>
</w:p>'''
        self.paragraphs_xml.append(xml)

    def p_multi_runs(self, runs, align="right", space_before=0, space_after=120, line_spacing=276):
        """runs is a list of tuples: (text, bold, italic, color, size_pt)"""
        runs_xml = []
        for text, bold, italic, color, size_pt in runs:
            sz = int(size_pt * 2)
            color_xml = f'<w:color w:val="{color}"/>' if color else f'<w:color w:val="{COLOR_TEXT_MAIN}"/>'
            b_xml = '<w:b/><w:bCs/>' if bold else ''
            i_xml = '<w:i/><w:iCs/>' if italic else ''
            runs_xml.append(f'''<w:r>
    <w:rPr>
      <w:rFonts w:ascii="Cairo" w:hAnsi="Cairo" w:cs="Cairo"/>
      <w:rtl/>
      {b_xml}
      {i_xml}
      <w:sz w:val="{sz}"/>
      <w:szCs w:val="{sz}"/>
      {color_xml}
    </w:rPr>
    <w:t xml:space="preserve">{escape(text)}</w:t>
  </w:r>''')
        xml = f'''<w:p>
  <w:pPr>
    <w:bidi/>
    <w:jc w:val="{align}"/>
    <w:spacing w:before="{space_before}" w:after="{space_after}" w:line="{line_spacing}" w:lineRule="auto"/>
  </w:pPr>
  {''.join(runs_xml)}
</w:p>'''
        self.paragraphs_xml.append(xml)

    def heading_1(self, text, number_str=None):
        title = f"{number_str}  {text}" if number_str else text
        # Heading 1 styled with primary burgundy, bold, with soft bottom border line
        xml = f'''<w:p>
  <w:pPr>
    <w:pStyle w:val="Heading1"/>
    <w:bidi/>
    <w:jc w:val="right"/>
    <w:spacing w:before="360" w:after="160"/>
    <w:pBdr>
      <w:bottom w:val="single" w:sz="12" w:space="8" w:color="{COLOR_PRIMARY}"/>
    </w:pBdr>
  </w:pPr>
  <w:r>
    <w:rPr>
      <w:rFonts w:ascii="Cairo" w:hAnsi="Cairo" w:cs="Cairo"/>
      <w:rtl/>
      <w:b/><w:bCs/>
      <w:sz w:val="34"/>
      <w:szCs w:val="34"/>
      <w:color w:val="{COLOR_PRIMARY}"/>
    </w:rPr>
    <w:t>{escape(title)}</w:t>
  </w:r>
</w:p>'''
        self.paragraphs_xml.append(xml)

    def heading_2(self, text, number_str=None):
        title = f"{number_str}  {text}" if number_str else text
        xml = f'''<w:p>
  <w:pPr>
    <w:pStyle w:val="Heading2"/>
    <w:bidi/>
    <w:jc w:val="right"/>
    <w:spacing w:before="260" w:after="120"/>
  </w:pPr>
  <w:r>
    <w:rPr>
      <w:rFonts w:ascii="Cairo" w:hAnsi="Cairo" w:cs="Cairo"/>
      <w:rtl/>
      <w:b/><w:bCs/>
      <w:sz w:val="28"/>
      <w:szCs w:val="28"/>
      <w:color w:val="{COLOR_HERO_START}"/>
    </w:rPr>
    <w:t>{escape(title)}</w:t>
  </w:r>
</w:p>'''
        self.paragraphs_xml.append(xml)

    def heading_3(self, text):
        xml = f'''<w:p>
  <w:pPr>
    <w:pStyle w:val="Heading3"/>
    <w:bidi/>
    <w:jc w:val="right"/>
    <w:spacing w:before="180" w:after="80"/>
  </w:pPr>
  <w:r>
    <w:rPr>
      <w:rFonts w:ascii="Cairo" w:hAnsi="Cairo" w:cs="Cairo"/>
      <w:rtl/>
      <w:b/><w:bCs/>
      <w:sz w:val="24"/>
      <w:szCs w:val="24"/>
      <w:color w:val="{COLOR_ON_CONTAINER}"/>
    </w:rPr>
    <w:t>{escape(text)}</w:t>
  </w:r>
</w:p>'''
        self.paragraphs_xml.append(xml)

    def bullet(self, title, description=None):
        runs = []
        if title:
            runs.append((f"•  {title}", True, False, COLOR_PRIMARY, 11))
        if description:
            sep = ": " if title else "•  "
            runs.append((f"{sep}{description}", False, False, COLOR_TEXT_MAIN, 11))
        self.p_multi_runs(runs, align="right", space_before=40, space_after=80, line_spacing=260)

    def callout(self, title, lines, icon="📌"):
        # Single cell table with right thick border in primary color and light tinted background
        body_runs = []
        for line in lines:
            body_runs.append(f'''<w:p>
  <w:pPr>
    <w:bidi/>
    <w:jc w:val="right"/>
    <w:spacing w:before="30" w:after="50" w:line="260" w:lineRule="auto"/>
  </w:pPr>
  <w:r>
    <w:rPr>
      <w:rFonts w:ascii="Cairo" w:hAnsi="Cairo" w:cs="Cairo"/>
      <w:rtl/>
      <w:sz w:val="21"/>
      <w:szCs w:val="21"/>
      <w:color w:val="{COLOR_TEXT_MAIN}"/>
    </w:rPr>
    <w:t xml:space="preserve">{escape(line)}</w:t>
  </w:r>
</w:p>''')
        
        xml = f'''<w:tbl>
  <w:tblPr>
    <w:tblW w:w="5000" w:type="pct"/>
    <w:bidiVisual/>
    <w:jc w:val="center"/>
    <w:tblBorders>
      <w:top w:val="none"/>
      <w:left w:val="none"/>
      <w:bottom w:val="none"/>
      <w:right w:val="single" w:sz="36" w:space="0" w:color="{COLOR_PRIMARY}"/>
      <w:insideH w:val="none"/>
      <w:insideV w:val="none"/>
    </w:tblBorders>
  </w:tblPr>
  <w:tr>
    <w:trPr>
      <w:cantSplit/>
    </w:trPr>
    <w:tc>
      <w:tcPr>
        <w:shd w:val="clear" w:color="auto" w:fill="{COLOR_CALLOUT_BG}"/>
        <w:tcMar>
          <w:top w:w="160" w:type="dxa"/>
          <w:bottom w:w="160" w:type="dxa"/>
          <w:left w:w="220" w:type="dxa"/>
          <w:right w:w="240" w:type="dxa"/>
        </w:tcMar>
      </w:tcPr>
      <w:p>
        <w:pPr>
          <w:bidi/>
          <w:jc w:val="right"/>
          <w:spacing w:before="0" w:after="80"/>
        </w:pPr>
        <w:r>
          <w:rPr>
            <w:rFonts w:ascii="Cairo" w:hAnsi="Cairo" w:cs="Cairo"/>
            <w:rtl/>
            <w:b/><w:bCs/>
            <w:sz w:val="23"/>
            <w:szCs w:val="23"/>
            <w:color w:val="{COLOR_HERO_START}"/>
          </w:rPr>
          <w:t>{escape(icon + "  " + title)}</w:t>
        </w:r>
      </w:p>
      {''.join(body_runs)}
    </w:tc>
  </w:tr>
</w:tbl>
<w:p><w:pPr><w:spacing w:before="0" w:after="100"/></w:pPr></w:p>'''
        self.paragraphs_xml.append(xml)

    def table(self, headers, rows, col_widths=None):
        """Generates a professional corporate styled table with RTL support"""
        num_cols = len(headers)
        
        header_cells_xml = []
        for i, h in enumerate(headers):
            header_cells_xml.append(f'''<w:tc>
  <w:tcPr>
    <w:shd w:val="clear" w:color="auto" w:fill="{COLOR_PRIMARY}"/>
    <w:tcMar>
      <w:top w:w="140" w:type="dxa"/>
      <w:bottom w:w="140" w:type="dxa"/>
      <w:left w:w="140" w:type="dxa"/>
      <w:right w:w="140" w:type="dxa"/>
    </w:tcMar>
  </w:tcPr>
  <w:p>
    <w:pPr>
      <w:bidi/>
      <w:jc w:val="center"/>
      <w:spacing w:before="0" w:after="0"/>
    </w:pPr>
    <w:r>
      <w:rPr>
        <w:rFonts w:ascii="Cairo" w:hAnsi="Cairo" w:cs="Cairo"/>
        <w:rtl/>
        <w:b/><w:bCs/>
        <w:sz w:val="21"/>
        <w:szCs w:val="21"/>
        <w:color w:val="FFFFFF"/>
      </w:rPr>
      <w:t>{escape(h)}</w:t>
    </w:r>
  </w:p>
</w:tc>''')
        
        rows_xml = [f'''<w:tr>
  <w:trPr>
    <w:tblHeader/>
    <w:cantSplit/>
  </w:trPr>
  {''.join(header_cells_xml)}
</w:tr>''']

        for r_idx, row in enumerate(rows):
            fill_color = COLOR_ALT_ROW if (r_idx % 2 == 1) else "FFFFFF"
            cells_xml = []
            for c_idx, cell in enumerate(row):
                align = "center" if c_idx == 0 or len(str(cell)) <= 15 else "right"
                is_bold = (c_idx == 0)
                txt_color = COLOR_PRIMARY if is_bold else COLOR_TEXT_MAIN
                cells_xml.append(f'''<w:tc>
  <w:tcPr>
    <w:shd w:val="clear" w:color="auto" w:fill="{fill_color}"/>
    <w:tcMar>
      <w:top w:w="120" w:type="dxa"/>
      <w:bottom w:w="120" w:type="dxa"/>
      <w:left w:w="140" w:type="dxa"/>
      <w:right w:w="140" w:type="dxa"/>
    </w:tcMar>
  </w:tcPr>
  <w:p>
    <w:pPr>
      <w:bidi/>
      <w:jc w:val="{align}"/>
      <w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/>
    </w:pPr>
    <w:r>
      <w:rPr>
        <w:rFonts w:ascii="Cairo" w:hAnsi="Cairo" w:cs="Cairo"/>
        <w:rtl/>
        {'<w:b/><w:bCs/>' if is_bold else ''}
        <w:sz w:val="20"/>
        <w:szCs w:val="20"/>
        <w:color w:val="{txt_color}"/>
      </w:rPr>
      <w:t>{escape(cell)}</w:t>
    </w:r>
  </w:p>
</w:tc>''')
            rows_xml.append(f'''<w:tr>
  <w:trPr>
    <w:cantSplit/>
  </w:trPr>
  {''.join(cells_xml)}
</w:tr>''')

        xml = f'''<w:tbl>
  <w:tblPr>
    <w:tblW w:w="5000" w:type="pct"/>
    <w:bidiVisual/>
    <w:jc w:val="center"/>
    <w:tblBorders>
      <w:top w:val="single" w:sz="10" w:space="0" w:color="{COLOR_PRIMARY}"/>
      <w:bottom w:val="single" w:sz="10" w:space="0" w:color="{COLOR_PRIMARY}"/>
      <w:left w:val="none"/>
      <w:right w:val="none"/>
      <w:insideH w:val="single" w:sz="4" w:space="0" w:color="{COLOR_BORDER_LIGHT}"/>
      <w:insideV w:val="none"/>
    </w:tblBorders>
  </w:tblPr>
  {''.join(rows_xml)}
</w:tbl>
<w:p><w:pPr><w:spacing w:before="0" w:after="140"/></w:pPr></w:p>'''
        self.paragraphs_xml.append(xml)

    def page_break(self):
        self.paragraphs_xml.append('<w:p><w:r><w:br w:type="page"/></w:r></w:p>')

    def add_image_paragraph(self, r_id, cx, cy, align="center"):
        xml = f'''<w:p>
  <w:pPr>
    <w:bidi/>
    <w:jc w:val="{align}"/>
    <w:spacing w:before="100" w:after="140"/>
  </w:pPr>
  <w:r>
    <w:drawing>
      <wp:inline distT="0" distB="0" distL="0" distR="0">
        <wp:extent cx="{cx}" cy="{cy}"/>
        <wp:effectExtent l="0" t="0" r="0" b="0"/>
        <wp:docPr id="10{self.image_counter}" name="Graphic"/>
        <wp:cNvGraphicFramePr>
          <a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/>
        </wp:cNvGraphicFramePr>
        <a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
          <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">
            <pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
              <pic:nvPicPr>
                <pic:cNvPr id="10{self.image_counter}" name="Picture"/>
                <pic:cNvPicPr/>
              </pic:nvPicPr>
              <pic:blipFill>
                <a:blip r:embed="{r_id}"/>
                <a:stretch><a:fillRect/></a:stretch>
              </pic:blipFill>
              <pic:spPr>
                <a:xfrm>
                  <a:off x="0" y="0"/>
                  <a:ext cx="{cx}" cy="{cy}"/>
                </a:xfrm>
                <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
              </pic:spPr>
            </pic:pic>
          </a:graphicData>
        </a:graphic>
      </wp:inline>
    </w:drawing>
  </w:r>
</w:p>'''
        self.paragraphs_xml.append(xml)

    def save(self, output_path):
        # Build [Content_Types].xml
        types_xml = ['''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Default Extension="png" ContentType="image/png"/>
  <Default Extension="jpeg" ContentType="image/jpeg"/>
  <Default Extension="jpg" ContentType="image/jpeg"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
  <Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/>
  <Override PartName="/word/fontTable.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.fontTable+xml"/>
  <Override PartName="/word/header1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/>
  <Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/>
</Types>''']

        # Root relationships
        root_rels = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>'''

        # Document relationships
        doc_rels_xml = ['''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">''']
        for r_id, r_type, r_target in self.relationships:
            doc_rels_xml.append(f'  <Relationship Id="{r_id}" Type="{r_type}" Target="{r_target}"/>')
        doc_rels_xml.append('</Relationships>')

        # Styles.xml
        styles_xml = f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault>
      <w:rPr>
        <w:rFonts w:ascii="Cairo" w:eastAsia="Cairo" w:hAnsi="Cairo" w:cs="Cairo"/>
        <w:sz w:val="23"/>
        <w:szCs w:val="23"/>
        <w:lang w:val="ar-YE" w:bidi="ar-YE"/>
      </w:rPr>
    </w:rPrDefault>
    <w:pPrDefault>
      <w:pPr>
        <w:bidi/>
        <w:spacing w:before="0" w:after="120" w:line="276" w:lineRule="auto"/>
      </w:pPr>
    </w:pPrDefault>
  </w:docDefaults>

  <w:style w:type="paragraph" w:default="1" w:styleId="Normal">
    <w:name w:val="Normal"/>
    <w:pPr><w:bidi/><w:jc w:val="right"/></w:pPr>
    <w:rPr>
      <w:color w:val="{COLOR_TEXT_MAIN}"/>
    </w:rPr>
  </w:style>

  <w:style w:type="paragraph" w:styleId="Heading1">
    <w:name w:val="heading 1"/>
    <w:basedOn w:val="Normal"/>
    <w:next w:val="Normal"/>
    <w:pPr>
      <w:bidi/>
      <w:jc w:val="right"/>
      <w:spacing w:before="360" w:after="160"/>
    </w:pPr>
    <w:rPr>
      <w:b/><w:bCs/>
      <w:sz w:val="34"/>
      <w:szCs w:val="34"/>
      <w:color w:val="{COLOR_PRIMARY}"/>
    </w:rPr>
  </w:style>

  <w:style w:type="paragraph" w:styleId="Heading2">
    <w:name w:val="heading 2"/>
    <w:basedOn w:val="Normal"/>
    <w:next w:val="Normal"/>
    <w:pPr>
      <w:bidi/>
      <w:jc w:val="right"/>
      <w:spacing w:before="260" w:after="120"/>
    </w:pPr>
    <w:rPr>
      <w:b/><w:bCs/>
      <w:sz w:val="28"/>
      <w:szCs w:val="28"/>
      <w:color w:val="{COLOR_HERO_START}"/>
    </w:rPr>
  </w:style>

  <w:style w:type="paragraph" w:styleId="Heading3">
    <w:name w:val="heading 3"/>
    <w:basedOn w:val="Normal"/>
    <w:next w:val="Normal"/>
    <w:pPr>
      <w:bidi/>
      <w:jc w:val="right"/>
      <w:spacing w:before="180" w:after="80"/>
    </w:pPr>
    <w:rPr>
      <w:b/><w:bCs/>
      <w:sz w:val="24"/>
      <w:szCs w:val="24"/>
      <w:color w:val="{COLOR_ON_CONTAINER}"/>
    </w:rPr>
  </w:style>
</w:styles>'''

        # Settings.xml
        settings_xml = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:settings xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:mirrorMargins w:val="0"/>
  <w:compat>
    <w:compatSetting w:name="compatibilityMode" w:uri="http://schemas.microsoft.com/office/word" w:val="15"/>
  </w:compat>
</w:settings>'''

        # FontTable.xml
        font_table_xml = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:fontTable xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:font w:name="Cairo">
    <w:panose1 w:val="020B0604020202020204"/>
    <w:charset w:val="B2"/>
    <w:family w:val="swiss"/>
    <w:pitch w:val="variable"/>
  </w:font>
  <w:font w:name="Arial">
    <w:panose1 w:val="020B0604020202020204"/>
    <w:charset w:val="00"/>
    <w:family w:val="swiss"/>
    <w:pitch w:val="variable"/>
  </w:font>
</w:fontTable>'''

        # Header1.xml
        header_xml = f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:hdr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:p>
    <w:pPr>
      <w:bidi/>
      <w:jc w:val="both"/>
      <w:pBdr>
        <w:bottom w:val="single" w:sz="6" w:space="4" w:color="{COLOR_OUTLINE}"/>
      </w:pBdr>
      <w:spacing w:before="0" w:after="80"/>
    </w:pPr>
    <w:r>
      <w:rPr>
        <w:rFonts w:ascii="Cairo" w:hAnsi="Cairo" w:cs="Cairo"/>
        <w:rtl/>
        <w:sz w:val="18"/>
        <w:szCs w:val="18"/>
        <w:color w:val="{COLOR_TEXT_MUTED}"/>
      </w:rPr>
      <w:t>منصة هدهد إف إم (HudHud FM) — وثيقة مقترح الشراكة والرعاية الإعلانية</w:t>
    </w:r>
    <w:r>
      <w:rPr>
        <w:rFonts w:ascii="Cairo" w:hAnsi="Cairo" w:cs="Cairo"/>
        <w:sz w:val="18"/>
        <w:szCs w:val="18"/>
        <w:color w:val="{COLOR_PRIMARY}"/>
        <w:b/><w:bCs/>
      </w:rPr>
      <w:tab/>
      <w:t>نسخة رسمية 2026</w:t>
    </w:r>
  </w:p>
</w:hdr>'''

        # Footer1.xml
        footer_xml = f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:ftr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:p>
    <w:pPr>
      <w:bidi/>
      <w:jc w:val="both"/>
      <w:pBdr>
        <w:top w:val="single" w:sz="6" w:space="4" w:color="{COLOR_OUTLINE}"/>
      </w:pBdr>
      <w:spacing w:before="60" w:after="0"/>
    </w:pPr>
    <w:r>
      <w:rPr>
        <w:rFonts w:ascii="Cairo" w:hAnsi="Cairo" w:cs="Cairo"/>
        <w:rtl/>
        <w:sz w:val="17"/>
        <w:szCs w:val="17"/>
        <w:color w:val="{COLOR_TEXT_MUTED}"/>
      </w:rPr>
      <w:t>سري ومخصص للجهات الشريكة | Confidential &amp; Proprietary — HudHud FM</w:t>
    </w:r>
    <w:r>
      <w:rPr>
        <w:rFonts w:ascii="Cairo" w:hAnsi="Cairo" w:cs="Cairo"/>
        <w:rtl/>
        <w:sz w:val="17"/>
        <w:szCs w:val="17"/>
        <w:color w:val="{COLOR_TEXT_MUTED}"/>
      </w:rPr>
      <w:tab/>
      <w:t>صفحة </w:t>
    </w:r>
    <w:fldSimple w:instr="PAGE"/>
    <w:r>
      <w:rPr>
        <w:rFonts w:ascii="Cairo" w:hAnsi="Cairo" w:cs="Cairo"/>
        <w:rtl/>
        <w:sz w:val="17"/>
        <w:szCs w:val="17"/>
        <w:color w:val="{COLOR_TEXT_MUTED}"/>
      </w:rPr>
      <w:t> من </w:t>
    </w:r>
    <w:fldSimple w:instr="NUMPAGES"/>
  </w:p>
</w:ftr>'''

        # Document body XML
        body_xml = f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
            xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
            xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"
            xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
            xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
  <w:body>
    {''.join(self.paragraphs_xml)}
    <w:sectPr>
      <w:headerReference w:type="default" r:id="rIdHeader1"/>
      <w:footerReference w:type="default" r:id="rIdFooter1"/>
      <w:pgSz w:w="11906" w:h="16838"/>
      <w:pgMar w:top="1200" w:right="1200" w:bottom="1200" w:left="1200" w:header="600" w:footer="600" w:gutter="0"/>
      <w:bidi/>
    </w:sectPr>
  </w:body>
</w:document>'''

        # Assemble into Zip
        buf = io.BytesIO()
        with zipfile.ZipFile(buf, 'w', compression=zipfile.ZIP_DEFLATED) as z:
            z.writestr('[Content_Types].xml', ''.join(types_xml))
            z.writestr('_rels/.rels', root_rels)
            z.writestr('word/_rels/document.xml.rels', ''.join(doc_rels_xml))
            z.writestr('word/styles.xml', styles_xml)
            z.writestr('word/settings.xml', settings_xml)
            z.writestr('word/fontTable.xml', font_table_xml)
            z.writestr('word/header1.xml', header_xml)
            z.writestr('word/footer1.xml', footer_xml)
            for path_in_zip, (data, ext) in self.media_files.items():
                z.writestr(path_in_zip, data)
            z.writestr('word/document.xml', body_xml)

        data = buf.getvalue()
        os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
        with open(output_path, 'wb') as f:
            f.write(data)
        print(f"Successfully generated proposal: {output_path} ({len(data):,} bytes)")

def build_proposal_document(output_path):
    doc = DocxBuilder()

    # Image assets check
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_dir = os.path.dirname(script_dir)
    feature_graphic = os.path.join(project_dir, "store-listing-generator", "store-listing", "feature-graphic-1024x500.png")
    app_icon = os.path.join(project_dir, "store-listing-generator", "store-listing", "app-icon-512x512.png")

    # ==========================================
    # COVER / HEADER SECTION
    # ==========================================
    doc.p("الجمهورية اليمنية — قطاع الإعلام الصوتي والرقمي", align="center", size_pt=10.5, color=COLOR_TEXT_MUTED, space_before=0, space_after=60)
    doc.p("وثيقة رسمية موجهة للشركات والمؤسسات الكبرى", align="center", size_pt=11, bold=True, color=COLOR_PRIMARY, space_before=0, space_after=180)

    # Embed header graphic / icon if available
    icon_rel = doc.add_image_rel(app_icon)
    if icon_rel:
        r_id, _ = icon_rel
        # 120px equivalent in EMUs: 120 * 9525 = 1,143,000 EMUs
        doc.add_image_paragraph(r_id, 1143000, 1143000, align="center")

    doc.p("مـنـصـة هـدهـد إف إم", align="center", size_pt=26, bold=True, color=COLOR_PRIMARY, space_before=60, space_after=60)
    doc.p("HudHud FM — Digital Radio & Audio Community Platform", align="center", size_pt=14, bold=True, color=COLOR_HERO_START, space_before=0, space_after=140)

    # Proposal Main Title Box
    doc.callout(
        "وثيقة مقترح الشراكة الاستراتيجية والرعاية الإعلانية المباشرة",
        [
            "منظومة البث الإذاعي اليمني الرقمي الموحد (تطبيق الهاتف الذكي + منصة الويب العامة)",
            "نموذج الرعاية الهادئة وغير المزعجة — حماية التجربة الصوتية وتقديم أعلى قيمة للعلامة التجارية الشريكة",
            "إصدار رسمي معتمد وفق النطاق الفعلي للمشروع وعقود الإنتاج (Production Scope 2026)"
        ],
        icon="🎙️"
    )

    # Metadata Table
    meta_headers = ["البيان التعاقدي", "القيمة / التوصيف"]
    meta_rows = [
        ["الجهة المُصدِرة", "إدارة وتطوير منصة هدهد إف إم (HudHud FM Platform)"],
        ["الفئة المستهدفة", "الشركات الكبرى، البنوك، المؤسسات التنموية، ومقدمو الخدمات الوطنية"],
        ["نطاق المنظومة", "تطبيق Android (هدف الإصدار الأول) + iOS (بيئة التطوير) + منصة الويب العامة"],
        ["تاريخ الإصدار", "سبتمبر 2026 (September 2026)"],
        ["كود المرجع الإداري", "HUDHUD-PARTNER-PROP-2026-V1"],
        ["حالة التوثيق", "معتمد ومطابق لعقد الإعلانات المباشرة (Direct Advertising Contract v1)"]
    ]
    doc.table(meta_headers, meta_rows)

    doc.p("شعار المنصة الدائم: «استمع. اكتشف. شارك.» (Listen. Discover. Share.)", align="center", size_pt=11, bold=True, color=COLOR_PRIMARY, space_before=80, space_after=200)

    doc.page_break()

    # ==========================================
    # SECTION 1: EXECUTIVE SUMMARY
    # ==========================================
    doc.heading_1("الملخص التنفيذي (Executive Summary)", "1.")
    
    doc.p(
        "تُعد منصة «هدهد إف إم» (HudHud FM) منصة رقمية حديثة، عربية أولاً، صُممت خصيصاً لتوحيد وتطوير تجربة الاستماع "
        "إلى الإذاعات اليمنية عبر بيئة رقمية متكاملة فائقة الجودة. يجمع المشروع بين البث الحي المباشر للمحطات الإذاعية العاملة عبر مختلف المحافظات "
        "اليمنية، وبين أرشيف البرامج والحلقات المسجلة وفق الطلب (On-Demand Episodes)، مدعوماً بمجتمع تفاعلي منضبط يعزز التواصل الثقافي والمجتمعي.",
        size_pt=11.5, space_after=120
    )
    doc.p(
        "انطلاقاً من معمارية تقنية متطورة ومستقلة تماماً عن الأنظمة القديمة، توفر المنصة فرصة استثنائية للشراكة مع الشركات والجهات الكبرى "
        "الراغبة في تعزيز حضورها المؤسسي لدى جمهور نوعي واسع داخل اليمن وفي بلدان الاغتراب، وذلك من خلال منظومة رعاية مباشرة (First-Party Direct Sponsorship) "
        "تعتمد على مبدأ «الرعاية الهادئة وغير المزعجة»، وتضمن الظهور الحصري الراقي دون مقاطعة البث الصوتي ودون الاعتماد على شبكات إعلانية وسيطة.",
        size_pt=11.5, space_after=140
    )

    doc.callout(
        "الرؤية الثقافية وهوية «الهدهد»",
        [
            "ترتكز الهوية البصرية للمنصة على شخصية «الهدهد» المستلهمة من الموروث الحضاري لجنوب الجزيرة العربية وحضارة سبأ التاريخية كحامل للنبأ الصادق والمعرفة الموثوقة.",
            "يتطور الهدهد في المنصة ليصبح المرشد والرفيق الإذاعي الرقمي الذكي الذي يرافق المستمع بودّ ورقيّ، متسلحاً بسماعات الرأس وأجهزة البث الاستوديو العصرية.",
            "يعكس الثيم اللوني العنابي الفخم (#8E3E63 و #8B2648) والأسطح الدافئة أصالة البيئة اليمنية وأناقة الإنتاج الإذاعي الحديث."
        ],
        icon="🕊️"
    )

    # ==========================================
    # SECTION 2: PLATFORM OVERVIEW (WEB + APP)
    # ==========================================
    doc.heading_1("نظرة شاملة على المنصة: تكامل الويب والتطبيق (Web + App)", "2.")

    doc.p(
        "يقوم مشروع HudHud FM على ثلاث ركائز تقنية متكاملة تضمن وصول المحتوى لجميع فئات المستمعين بسلاسة فائقة:",
        size_pt=11.5, space_after=100
    )

    doc.heading_2("2.1 تطبيق الهاتف الذكي (Mobile Application — Flutter)", "")
    doc.bullet("بيئة التطوير والتشغيل", "تطبيق حديث مطور بنظام Flutter بدون أي ترسبات لكود legacy، يستهدف نظام Android بإصدار أول (الحد الأدنى SDK 24، والمستهدف SDK 36)، مع دعم نظام iOS في بيئة التطوير.")
    doc.bullet("محرك صوتي موحد وخلفي مرن", "استخدام مشغل صوتي مركزي موحد مدعوم بـ just_audio و audio_service لتشغيل البث المباشر والحلقات المسجلة في الخلفية بكفاءة متناهية، مع دعم كامل للتحكم عبر إشعارات النظام، ومؤقت النوم (Sleep Timer)، واستعادة الاتصال الذاتية عند تغير الشبكة.")
    doc.bullet("تصفح واكتشاف سريع بلا حواجز", "شاشة رئيسية واحدة رشيقة تتيح البحث بالاسم العربي والإنجليزي والمدينة والتردد، مع فلترة جغرافية للمحافظات اليمنية، وحفظ تفضيل العرض (شبكة / قائمة) محلياً مع دعم كامل للتكبير حتى 200%.")
    doc.bullet("بنية Cache-First", "استجابة فورية وحفظ البيانات محلياً مع التحديث عند الفتح، ما يوفر استهلاك باقات الإنترنت الضعيفة ويضمن استمرار تجربة الاستماع في جميع الظروف.")
    doc.bullet("تفاعل مجتمعي منضبط وآمن", "تصفح واستماع متاح للضيوف دون قيود أو إجبار على التسجيل، مع خيار إنشاء حساب (بريد/كلمة مرور والدخول الاجتماعي) لكتابة التعليقات على الحلقات، محمي بشروط مشاركة صامتة وآلية بلاغات وحظر فوري وطابور إشراف مركزي.")

    doc.heading_2("2.2 منصة الويب العامة (Public Web Platform — web_hudhud)", "")
    doc.bullet("واجهة ويب خفيفة وسريعة", "مبنية باستخدام أحدث معايير React و Vite و TypeScript، وتعمل بتوافق كامل مع شاشات الهواتف والأجهزة المكتبية.")
    doc.bullet("روابط وصول واكتشاف مباشرة (Deep-Linking)", "إتاحة عناوين URL مخصصة لكل محطة وبرنامج وحلقة (Canonical Parameters: ?station=&program=&episode=) تمكن الجمهور من المشاركة الفورية عبر منصات التواصل.")
    doc.bullet("مشغل صوتي مستمر", "استمرار تشغيل الإذاعة أثناء التنقل والتصفح الداخلي لصفحات الموقع دون أي انقطاع.")
    doc.bullet("تنبيهات المتصفح الموجهة (Browser Push Notifications)", "إمكانية اشتراك المستمع في تنبيهات الحلقات الجديدة والمحطات المفضلة عبر تقنيات الويب المعتمدة باختيار صريح (Opt-in).")

    doc.heading_2("2.3 لوحة التحكم والإدارة المركزية (Centralized Admin Workspace — web_admin)", "")
    doc.bullet("إدارة كاملة للمحتوى", "التحكم في المحطات الإذاعية، جداول البث الأسبوعية، الحلقات المسجلة، وطابور مراجعة البلاغات المجتمعية.")
    doc.bullet("منظومة إدارة الحملات والمعلنين", "واجهة مخصصة لإنشاء المعلنين، وجدولة الحملات المباشرة، ومتابعة الأداء اللحظي بتوقيت UTC، وتصدير التقارير الرسمية بصيغة CSV.")

    # ==========================================
    # SECTION 3: PLATFORM VALUE & PARTNERSHIP
    # ==========================================
    doc.heading_1("قيمة المنصة وفرصة الشراكة الاستراتيجية", "3.")

    doc.p(
        "تقدم HudHud FM بيئة نوعية للشراكة التجارية تتميز بالفروق الجوهرية التالية عن الوسائط الرقمية التقليدية:",
        size_pt=11.5, space_after=120
    )

    val_headers = ["محور القيمة", "ميزة المنصة للمؤسسة الشريكة", "الأثر التسويقي والمؤسسي"]
    val_rows = [
        [
            "أمان العلامة التجارية\n(100% Brand Safety)",
            "محتوى إذاعي وثقافي وإخباري يمني منتقى وموثق بعناية، مع طابور إشراف ومراجعة مجتمعية صارمة تمنع أي محتوى مسيء.",
            "حماية سمعة المؤسسة الشريكة وربط اسمها بمحتوى وطني راقٍ وموثوق."
        ],
        [
            "حصرية الحضور والتركيز\n(Clutter-Free Exclusivity)",
            "تعتمد المنصة موضع رعاية وحيد محدد في الواجهة الرئيسية لكل منصة، مع أولوية تفوق واضحة بدلاً من التناوب العشوائي بين عشرات البانرات.",
            "استحواذ بصري وذهني كامل على انتباه المستمع دون تشتت بين إعلانات متنافسة."
        ],
        [
            "احترام المستمع والولاء العالي\n(Audience Goodwill)",
            "خلو البث من المقاطعات الصوتية المزعجة والبوب-آب الإجباري يبني تقديراً عالياً من المستمعين لرعاة المنصة.",
            "تحويل التعرض الإعلاني إلى انطباع إيجابي مستدام يدعم الثقة في العلامة التجارية."
        ],
        [
            "التواجد المتزامن\n(Omnichannel Synergy)",
            "تكامل مباشر يغطي مستخدمي الهواتف الذكية عبر التطبيق ومستخدمي المتصفحات عبر الويب بنظام مركزي موحد.",
            "تغطية شرائح متعددة من الموظفين والمهنيين والمغتربين أينما كان نوع جهازهم."
        ],
        [
            "الشفافية والخصوصية\n(Privacy & Governance)",
            "نظام قياس لا يجمع أي معرّفات أجهزة دائمة أو ملفات تتبع مستخدمين، ويعتمد إيصالات رقمية آمنة لحساب الأحداث.",
            "توافق كامل مع متطلبات الخصوصية العالمية ومعايير متجري Google Play و Apple."
        ]
    ]
    doc.table(val_headers, val_rows)

    # ==========================================
    # SECTION 4: ADVERTISING SCOPE & BOUNDARIES
    # ==========================================
    doc.heading_1("نطاق التعاون الإعلاني المقترح والضوابط الصارمة", "4.")

    doc.p(
        "تلتزم منصة هدهد إف إم بنطاق تعاقدي وتشغيلي صارم محدد في عقد الإعلانات المباشرة (Direct Advertising Contract v1). "
        "يقوم هذا النطاق على فلسفة حماية نقاء البث الإذاعي ورقي واجهات المستخدم. وتتلخص الضوابط المطبقة في النقاط التالية:",
        size_pt=11.5, space_after=120
    )

    doc.callout(
        "محددات ومحظورات المنصة الصارمة (Strict Boundary Policies)",
        [
            "1. منع المقاطعة الصوتية للبث (No Audio Insertion): لا تسمح المنصة إطلاقاً بإيقاف البث الإذاعي المباشر لبث فواصل صوتية أو إعلانات مسجلة قبل أو أثناء الاستماع (No Pre-roll / Mid-roll).",
            "2. منع الإعلانات البينية والحاجبة (No Interstitials): لا توجد شاشات قفز إجبارية تحجب التطبيق أو تجبر المستمع على الانتظار للوصول إلى محطته.",
            "3. منع التغطية على أزرار التحكم (No Controls Overlays): يُمنع وضع أي عناصر إعلانية أو رسوم متحركة فوق المشغل الصوتي (Mini-Player) أو أزرار التحكم بالبث.",
            "4. منع الوسائط ذاتية التشغيل والبرمجيات المشبوهة (No Autoplay / Arbitrary Scripts): لا يُسمح بإدراج وسائط صوتية أو فيديو تعمل تلقائياً، ولا روابط مجهولة أو أكواد JavaScript خارجية.",
            "5. منع التتبع التلصصي (No Invasive Profiling): لا يتم جمع أو تخزين أرقام الهوية الإعلانية (GAID / IDFA)، ولا ملفات تعريف الارتباط التتبعية، ولا معلومات المستخدم الشخصية لأغراض إعلانية."
        ],
        icon="🛡️"
    )

    # ==========================================
    # SECTION 5: PLACEMENTS AND FORMATS
    # ==========================================
    doc.heading_1("أماكن وصيغ ظهور الإعلانات (Placements & Formats)", "5.")

    doc.p(
        "صُمم موضع الظهور ليكون جزءاً طبيعياً وأنيقاً من النسيج البصري للصفحة الرئيسية، مما يتيح للمستمع التفاعل الإرادي والواعي مع الرسالة الإعلانية:",
        size_pt=11.5, space_after=120
    )

    doc.heading_2("5.1 الموضع المعتمد: رعاية الواجهة الرئيسية (home.sponsor)", "")
    doc.bullet("الموقع في التطبيق", "يظهر كبطاقة رعاية متميزة في الجزء العلوي من الشاشة الرئيسية، أسفل شريط الترحيب والبحث وخارج نطاق المشغل الصوتي وقائمة المحطات، بما يمنحه أعلى درجات المشاهدة الطبيعية.")
    doc.bullet("الموقع في منصة الويب", "يظهر كبطاقة إعلانية مصممة بذات النسق الرفيع في الصفحة الرئيسية للموقع العام (web_hudhud)، متوافقة مع أحجام الشاشات المختلفة.")
    doc.bullet("قاعدة الفوز بالأولوية (Precedence)", "يتم اختيار إعلان واحد حصرياً لكل منصة وفق الأولوية الرقمية الأعلى (Priority 0–1000)، مما يمنح الشريك الأبرز أولوية العرض دون مشاركة شاشته مع معلنين آخرين في ذات اللحظة.")

    doc.heading_2("5.2 الصيغ الإعلانية المعتمدة (Approved Creative Kinds)", "")

    formats_headers = ["الصيغة الإعلانية", "المكونات والعناصر المرئية", "الضوابط الفنية والمواصفات", "حالة الاستخدام المثلى"]
    formats_rows = [
        [
            "الرعاية المصورة\n(Image Sponsorship)",
            "• صورة بانر بصرية أنيقة.\n• شارة: «إعلان · [اسم الشريك]».\n• عنوان الحملة (حتى 100 حرف).\n• نص توضيحي اختياري (حتى 240 حرف).\n• رابط وجهة تفاعلي مباشر (اختياري).",
            "• صورة HTTPS آمنة.\n• حجم خفيف يوصى بـ <= 300KB.\n• صياغة واضحة متوافقة مع معايير المنصة.\n• ارتفاع متجاوب (140dp بالتطبيق).",
            "إطلاق المنتجات، العروض الموسمية، الحملات البصرية، وحملات التوعية المصحوبة بهوية بصرية قوية."
        ],
        [
            "الرعاية النصية المؤسسية\n(Text Sponsorship)",
            "• بطاقة رعاية راقية قائمة على الخطوط الطباعية الرسمية.\n• شارة: «إعلان · [اسم الشريك]».\n• عنوان الرعاية المؤسسية.\n• نص الرسالة أو البيان.\n• رابط خارجي موثق.",
            "• لا تتطلب صورة بصرية.\n• نصوص ديناميكية تدعم التكبير والقراءة السلسة.\n• رابط HTTPS موثق لموقع الشريك.",
            "الرعايات المؤسسية، المسؤولية الاجتماعية، الرسائل التوجيهية للبنوك والشركات الكبرى، والإعلانات الإرشادية."
        ]
    ]
    doc.table(formats_headers, formats_rows)

    doc.heading_2("5.3 السلوك البرمجي الذكي وحالات الطوارئ (Graceful Resilience)", "")
    doc.bullet("استدعاء مقنن وآمن", "تطلب المنصة الإعلان مرة واحدة كل دقيقة كحد أقصى وفقط أثناء وجود الشاشة في الواجهة الأمامية النشطة، دون استنزاف للبطارية أو بيانات الإنترنت.")
    doc.bullet("عمر افتراضي للإيصال (TTL)", "تمنح السحابة إيصال تسليم رقمي قصير المدى (حتى 60 ثانية) يضمن دقة الجدولة الزمنية وتحديث الحالة فور إيقاف الحملة.")
    doc.bullet("الانحسار الهادئ عند التعثر", "في حال انقطاع الاتصال أو عدم وجود إعلان مخصص، تنحسر مساحة الرعاية تماماً من الواجهة دون ترك أي مساحات رمادية أو فجوات مكسورة، مع استمرار البث الإذاعي دون أدنى تأثر.")

    # ==========================================
    # SECTION 6: BENEFITS FOR THE PARTNER
    # ==========================================
    doc.heading_1("المزايا التي تحصل عليها الجهة الشريكة", "6.")

    doc.p(
        "صُممت منظومة الشراكة في هدهد إف إم لتقديم عوائد ملموسة تعزز مكانة الشريك وتدعم أهدافه التسويقية والمجتمعية:",
        size_pt=11.5, space_after=120
    )

    doc.bullet("حضور ريادي وسمعة مؤسسية رفيعة", "الارتباط كشريك رسمي ورئيسي لمنصة الراديو الرقمي اليمني الرائدة، ما يرسخ مكانة الشريك كداعم للابتكار التقني والتراث الصوتي الوطني.")
    doc.bullet("الاستحواذ الذهني الخالي من الضجيج", "الظهور الحصري في واجهة التطبيق والويب دون تنافس مع عشرات الإعلانات الصغيرة العشوائية الشائعة في التطبيقات الأخرى.")
    doc.bullet("توجيه الزيارات المؤكدة (Actionable Traffic)", "إمكانية توجيه المستمع المهتم مباشرة بنقرة واحدة إلى البوابة الرقمية للشريك، أو تطبيقه، أو صفحة الحملة المخصصة عبر رابط HTTPS آمن.")
    doc.bullet("تقارير أداء موثوقة ومطابقة للواقع", "الحصول على بيانات حقيقية حول عدد مرات الظهور الفعلي والتفاعل عبر تقارير رسمية مدققة ومستخرجة من الخادم، دون وعود خيالية أو تضخيم غير واقعي.")
    doc.bullet("مرونة كاملة في إدارة المحتوى الإعلاني", "إمكانية تحديث الرسالة الإعلانية أو الصورة أو رابط الوجهة فورياً عبر الإدارة السحابية ودون الحاجة لانتظار إصدار جديد من التطبيق.")

    # ==========================================
    # SECTION 7: PACKAGES AND PRICING MODEL
    # ==========================================
    doc.heading_1("باقات الرعاية والنموذج التجاري المقترح", "7.")

    doc.p(
        "التزاماً بمبادئ الشفافية والواقعية الموثقة في قرارات المشروع (ADR 0005)، لا تعتمد المنصة الفوترة الآلية غير المضمونة "
        "بنظام النقرة (CPC) أو نظام الألف ظهور (CPM) نظراً لعدم ملاءمتها لطبيعة الرعايات المؤسسية المباشرة وحداثة المنظومة، "
        "بل تعتمد نموذج «عقود الرعاية المباشرة محددة المدة» (Fixed-Duration Direct Sponsorship Agreements).",
        size_pt=11.5, space_after=120
    )

    pack_headers = ["باقة الرعاية", "نطاق الظهور والمنصات", "الموضع والصيغة", "المدة والجدولة", "نموذج التسعير"]
    pack_rows = [
        [
            "باقة الرعاية الرئيسية\n(Platform Home Sponsor)",
            "تطبيق الهاتف (Android + iOS)\n+\nمنصة الويب العامة (Web)",
            "الموضع الرئيسي (home.sponsor)\nصورة عالية الدقة + نص + رابط مباشر",
            "حجز زمني محدد:\n• أسبوعي\n• شهري\n• ربع سنوي",
            "مبلغ مقطوع متفق عليه تعاقدياً وفق مدة الحجز ونطاق المنصات المختارة."
        ],
        [
            "باقة الرعاية الموسمية\n(Seasonal / Event Sponsor)",
            "تطبيق الهاتف أو الويب\nأو كلاهما معاً بالتزامن",
            "الموضع الرئيسي (home.sponsor)\nصورة أو رعاية نصية مؤسسية",
            "جدولة دقيقة بمناسبة:\n• الأعياد والمواسم\n• الفعاليات الوطنية والرياضية",
            "تسعير مقطوع خاص بالحملة وفق التوقيت المجدول بالساعة واليوم بتوقيت UTC."
        ]
    ]
    doc.table(pack_headers, pack_rows)

    doc.callout(
        "ملاحظة تسعيرية وتعاقدية هامة",
        [
            "وفقاً لمعايير الحوكمة الصارمة لمنصة HudHud FM، لا يتم اختلاق أرقام تسعيرية وهمية أو تقديرات جمهور غير مثبتة قبل اكتمال خط الأساس التشغيلي.",
            "تُحدد قيمة الرعاية النهائية من خلال التفاوض والاتفاق المؤسسي المباشر مع إدارة المنصة، مستندة إلى مدة الحجز، وفترة العرض، والمنصات المطلوبة، وحجم الحضور الممنوح للشريك."
        ],
        icon="⚖️"
    )

    # ==========================================
    # SECTION 8: IMPLEMENTATION, SCHEDULING & MEASUREMENT
    # ==========================================
    doc.heading_1("آلية التنفيذ والجدولة والقياس والتقارير", "8.")

    doc.p(
        "تدار منظومة الشراكة الإعلانية عبر خط أنابيب تقني متكامل ومحكم يضمن سرعة الإطلاق ودقة القياس:",
        size_pt=11.5, space_after=120
    )

    doc.heading_2("8.1 خطوات التنفيذ والإطلاق (Campaign Activation Lifecycle)", "")
    doc.bullet("1. إنشاء هوية المعلن", "تسجيل اسم المؤسسة الشريكة ضمن سجل المعلنين المعتمدين في النظام السحابي ({root}/advertisers/) وتفعيل حالتها الرسمية.")
    doc.bullet("2. تهيئة وتخصيص الحملة", "إدخال بيانات الحملة في لوحة الإدارة: تحديد المنصات (App / Web)، اسم الحملة، الأولوية (Priority)، مرجع الاتفاق التجاري (Agreement Reference)، وملاحظات الشراكة الخاصة.")
    doc.bullet("3. جدولة التوقيت بالمللي ثانية", "تحديد نافذة البداية والنهاية بتوقيت الخادم العالمي الموحد (UTC)، لتبدأ الحملة وتتوقف بشكل آلي وفوري دون أي تدخل بشري متأخر.")
    doc.bullet("4. إدراج المادة الإبداعية والتحقق", "إدراج العنوان، النص التوضيحي، رابط الصورة الآمن (HTTPS)، ورابط الوجهة الخارجية مع إجراء فحص فني لسلامة الروابط.")
    doc.bullet("5. التفعيل السحابي المباشر", "بمجرد الحفظ، تصبح الحملة متاحة لآلاف المستمعين فورياً دون الحاجة لرفع تحديث جديد للمتجر.")

    doc.heading_2("8.2 معايير القياس الصارمة واحتساب الظهور والتفاعل", "")
    doc.bullet("معيار احتساب الظهور الموثوق (Verified Impression)", "لا يُحتسب الظهور بمجرد تحميل المادة أو استدعائها من الخادم! يشترط النظام اكتمال تحميل الصورة أو جاهزية النص، وظهور ما لا يقل عن 50% من المساحة الإعلانية على الشاشة بشكل مستمر لمدة ثانية كاملة (1 Continuous Second) أثناء نشاط التطبيق في الواجهة الأمامية. يتم قياس ذلك عبر IntersectionObserver على الويب، وفحص هندسي منتظم كل 250ms على الهاتف.")
    doc.bullet("معيار احتساب التفاعل والنقرات (User Click Interaction)", "يتم احتساب كل نقرة يقصد بها المستخدم فتح رابط الشريك، مع إلزامية ربط كل نقرة بإيصال تسليم خادمي فريد وقصير المدى، مما يمنع التكرار العبثي أو النقرات العشوائية المكررة.")

    doc.heading_2("8.3 التقارير ولوحة المتابعة الرسمية", "")
    doc.bullet("تجميع يومي بتوقيت UTC", "تسجيل إجمالي المشاهدات والنقرات لكل يوم ولكل منصة بصورة منفصلة دون أي دمج مشوش.")
    doc.bullet("تصدير ملفات CSV رسمية", "تتيح لوحة الإدارة تصدير ملف تقرير دوري مفصل بصيغة CSV (باسم: campaign-[id]-[from]-[to].csv) لتقديمه للشريك كوثيقة إثبات للأداء والشفافية.")
    doc.bullet("احترام الخصوصية التام", "التقارير إحصائية تجميعية بالكامل ولا تتضمن أي بيانات شخصية، ما يجعلها وثيقة أعمال آمنة ومطابقة لأعلى معايير الحوكمة.")

    # ==========================================
    # SECTION 9: FUTURE EXPANSION HORIZONS
    # ==========================================
    doc.heading_1("فرص وتطلعات تطوير الشراكة مستقبلاً", "9.")

    doc.p(
        "تتضمن خارطة الطريق التقنية والهندسية لمنصة هدهد إف إم آفاقاً مستقبلية واعدة لتوسيع الشراكة مع نمو المنظومة:",
        size_pt=11.5, space_after=120
    )

    doc.bullet("رعاية الأقسام والمحطات المتخصصة (Station & Section Sponsorship)", "إمكانية إتاحة مواضع رعاية مخصصة داخل شاشات محطات إذاعية بعينها أو أقسام جغرافية مستهدفة وفق طلب الشريك.")
    doc.bullet("رعاية البرامج الصوتية والحلقات عند الطلب (Program & Episode Co-Branding)", "رعاية مشتركة لبرامج حوارية أو وثائقية وثقافية مسجلة تتاح كحلقات مستمرة للمستمعين مع وضع هوية الشريك كراعٍ رئيسي للبرنامج.")
    doc.bullet("تنبيهات الفعاليات الكبرى (Sponsored Event Broadcast Alerts)", "إرسال تنبيهات موجهة باختيار مسبق من المستمع (Opt-in) للبثوث الحية الاستثنائية والفعاليات الوطنية الكبرى برعاية الجهة الشريكة.")
    doc.bullet("لوحات تحليلات متقدمة ومدققة", "تطوير أدوات التحقق الإضافية وحماية الخدمات السحابية (App Check & Device Attestation) بالتوازي مع نمو قاعدة المستمعين.")

    # ==========================================
    # SECTION 10: CALL TO ACTION & NEXT STEPS
    # ==========================================
    doc.heading_1("الخطوات التنفيذية وقنوات التواصل (Call to Action)", "10.")

    doc.p(
        "لإطلاق الشراكة وبدء جدولة حملتكم الرسمية عبر منصة هدهد إف إم، نرحب باتخاذ الخطوات التنفيذية التالية:",
        size_pt=11.5, space_after=120
    )

    cta_headers = ["المرحلة", "الإجراء التنفيذي المطلوب", "المسؤولية والتنسيق"]
    cta_rows = [
        [
            "المرحلة الأولى:\nتحديد نطاق الشراكة",
            "اختيار باقة الرعاية المرغوبة (رئيسية / موسمية)، وتحديد المنصات المستهدفة (التطبيق، الويب، أو كلاهما)، والفترة الزمنية المحددة للرعاية.",
            "إدارة التسويق والاتصال المؤسسي لدى الجهة الشريكة"
        ],
        [
            "المرحلة الثانية:\nتزويد المواد الإبداعية",
            "تسليم المواد الإعلانية المعتمدة (الشعار، الصورة بدقة متوافقة، العنوان، النص التوضيحي، ورابط الوجهة الخارجية المعتمد HTTPS) وفق الملحق الفني.",
            "الفريق الفني والإعلامي للشريك بالتنسيق مع إدارة المنصة"
        ],
        [
            "المرحلة الثالثة:\nاعتماد الاتفاق وتفعيل الحملة",
            "توقيع اتفاقية الرعاية المؤسسية، وإدراج الحملة في لوحة التحكم المركزية لـ HudHud FM، وإطلاقها فورياً أو وفق التاريخ المحدد.",
            "إدارة منصة HudHud FM والشريك الرسمي"
        ],
        [
            "المرحلة الرابعة:\nالتقارير والمتابعة",
            "تزويد الشريك بتقارير الأداء اليومية المجمعة وتصدير كشف CSV مع نهاية فترة الحملة للمطابقة والتوثيق.",
            "فريق العمليات والتقارير في هدهد إف إم"
        ]
    ]
    doc.table(cta_headers, cta_rows)

    doc.callout(
        "قنوات التواصل والتنسيق الرسمي",
        [
            "يسر فريق إدارة وتطوير منصة «هدهد إف إم» استقبال استفساراتكم وترتيب جلسة مناقشة الشراكة عبر القنوات الرسمية:",
            "• البريد الإلكتروني الرسمي: partnerships@hudhudfm.ye (أو عبر القنوات المعتمدة للمشروع)",
            "• المنصة الرقمية: hudhud-fm-admin-sanadev.web.app (بوابة الإدارة المركزية)",
            "• نطاق المشروع: HudHud FM Digital Platform — صنعاء / عدن — الجمهورية اليمنية"
        ],
        icon="📬"
    )

    doc.page_break()

    # ==========================================
    # APPENDIX: TECHNICAL SPECIFICATIONS
    # ==========================================
    doc.heading_1("الملحق الفني: المواصفات المعتمدة للمواد الإعلانية", "الملحق:")

    doc.p(
        "لضمان أعلى درجات الجودة البصرية وسرعة التحميل واستقرار تجربة المستمع، يُرجى الالتزام بالمواصفات الفنية التالية عند إعداد المادة الإعلانية:",
        size_pt=11.5, space_after=120
    )

    spec_headers = ["العنصر الإعلاني", "المواصفة المعتمدة في النظام", "الحد الأقصى / الضوابط", "ملاحظات وتوجيهات فنية"]
    spec_rows = [
        [
            "صيغ الصور المدعومة\n(Image Formats)",
            "WebP أو PNG أو JPEG",
            "ملف وحيد ثابت (Static Image)\nيُمنع الرسوم المتحركة أو GIF",
            "يُفضل استخدام WebP أو PNG عالي النقاء لتوفير جودة عالية مع حجم خفيف."
        ],
        [
            "حجم ملف الصورة\n(File Size)",
            "يوصى بـ <= 300 كيلوبايت (KB)",
            "حد أقصى مقبول تقنياً 500KB",
            "لضمان سرعة التحميل الفوري وعدم استهلاك باقة الإنترنت للمستمع في المناطق الضعيفة."
        ],
        [
            "أبعاد ونسبة العرض\n(Dimensions / Ratio)",
            "نسبة أفقية متجاوبة\n(تقريباً 16:9 أو 2:1)\nعرض 1080px كحد مثالي",
            "ارتفاع العرض داخل التطبيق:\n140 logical pixels\n(BoxFit.cover متجاوب)",
            "يجب مراعاة أن البطاقة الإعلانية متجاوبة، لذا يُفضل وضع العناصر الرئيسية في منتصف التصميم."
        ],
        [
            "عنوان الحملة الظاهر\n(Campaign Title)",
            "نص صريح واضح ومختصر",
            "حتى 100 حرف كحد أقصى",
            "يُعرض بخط بارز وواضح (titleMedium) أعلى بطاقة الرعاية."
        ],
        [
            "النص التوضيحي\n(Creative Body)",
            "نص وصفي يشرح العرض أو الرسالة",
            "حتى 240 حرفاً كحد أقصى",
            "اختياري، ويُنصح به للحملات التسويقية التي تتطلب تفاصيل أو شعاراً إرشادياً."
        ],
        [
            "اسم المعلن الشريك\n(Sponsor Name)",
            "اسم المؤسسة أو العلامة الرسمية",
            "حتى 120 حرفاً كحد أقصى",
            "يظهر دائماً مسبوقاً بوسم الرعاية الرسمي: «إعلان · [اسم المؤسسة]» لحماية الشفافية."
        ],
        [
            "رابط الوجهة الخارجية\n(Target URL)",
            "بروتوكول HTTPS آمن حصرياً\n(نطاق رسمي عام ومعتمد)",
            "حتى 2048 حرفاً\nيُمنع استخدام عناوين IP صريحة\nأو منافذ مخصصة أو روابط تتبع شخصية",
            "يفتح مباشرة في المتصفح الخارجي الآمن للهاتف أو نافذة مستقلة بالمتصفح، مع زر localised صريح: «زيارة المعلن ↗»."
        ]
    ]
    doc.table(spec_headers, spec_rows)

    doc.p("تم إعداد هذه الوثيقة وفقاً لمتطلبات الإنتاج وعقود الحوكمة الخاصة بمنصة هدهد إف إم 2026.", align="center", size_pt=10, italic=True, color=COLOR_TEXT_MUTED, space_before=160, space_after=0)

    doc.save(output_path)

if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else "HudHud_FM_Partnership_Proposal.docx"
    build_proposal_document(out)
