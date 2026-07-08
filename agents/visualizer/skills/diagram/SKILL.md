---
name: diagram
description: |
  Generates high-fidelity, editable Excalidraw diagrams (.excalidraw.svg) for architecture/system/infrastructure diagrams and service maps, run in an isolated subagent so the main conversation's context doesn't absorb the generation code and iteration.
trigger: User asks for an architecture diagram, system diagram, layered diagram, infrastructure diagram, service map, flowchart, visual overview, or "big picture" diagram.
execution: subagent
---

# Diagram

Generate Excalidraw-compatible diagrams as `.excalidraw.svg` files, built
programmatically via Python for precise control over layout, z-order, and
fonts. Runs fully inside an isolated subagent (root `AGENTS.md` → **Skills**
→ **Execution**) — no delegation to a separate skill, no generator code or
iteration leaking into the main conversation.

## Before generating

1. If the request is ambiguous (what the diagram should show, what level of
   detail, which components/relationships) ask the user before spawning the
   subagent — don't guess architecture that isn't confirmed or in
   memory/context.
2. Hand the subagent: this `SKILL.md` path, the raw request, and an
   instruction to read `agents/visualizer/AGENTS.md`'s style guide for the
   color palette (semantic mapping in **Color palette** below).
3. If the output's destination (which repo/folder) isn't obvious from
   context, ask — don't default to saving inside this `cortex` repo unless
   explicitly asked to archive it as reference material.
4. Return to the caller only: the artifact path (or inline content) plus a
   one-line description of what it shows. Discard generator scripts,
   verification output, and iteration — none of that goes back to the main
   conversation.

## Output format

The deliverable is an `.excalidraw.svg` file — a standard SVG that:
- Renders inline in Markdown via `![alt](./path/to/diagram.excalidraw.svg)`
- Displays correctly in Docusaurus, GitHub, and any SVG-capable viewer
- Can be opened in [excalidraw.com](https://excalidraw.com) or the VS Code
  Excalidraw extension for further editing (if the scene was embedded during
  export)

Optionally, also produce a `.excalidraw` JSON source file that can be
drag-dropped into Excalidraw for editing and re-export (see **Generating
.excalidraw JSON**).

## How to build diagrams

Generate diagrams by writing a Python script that constructs SVG elements
directly. This gives precise control over layout, z-order, fonts, and
spacing — all of which matter for professional-quality output.

### SVG structure

```python
FONT = 'Georgia, "Times New Roman", serif'  # or user-specified font

svg_parts = []
svg_parts.append(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}" width="{width}" height="{height}">')

# 1. Background
svg_parts.append(f'<rect x="0" y="0" width="{width}" height="{height}" fill="#ffffff"/>')

# 2. Layer backgrounds (large rects, painted first)
# 3. Cross-layer elements (must come AFTER backgrounds they overlap)
# 4. Sub-group rects (dashed borders for categories)
# 5. Service boxes (solid rects inside sub-groups)
# 6. Arrows and lines
# 7. Text labels (painted last so they're always on top)

svg_parts.append('</svg>')
```

### Element helpers

Create reusable helper functions for each element type. This keeps the main
layout code clean and consistent:

```python
def rect(x, y, w, h, fill, stroke="#0A5060", sw=2, dash=False, rx=12, opacity=1.0):
    d = ' stroke-dasharray="8 4"' if dash else ""
    return (f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{rx}" '
            f'fill="{fill}" stroke="{stroke}" stroke-width="{sw}"{d} opacity="{opacity}"/>')

def text(x, y, content, size=12, color="#fff", anchor="middle"):
    return (f'<text x="{x}" y="{y}" font-family=\'{FONT}\' font-size="{size}px" '
            f'fill="{color}" text-anchor="{anchor}" '
            f'dominant-baseline="auto">{content}</text>')

def multiline_text(x, y, lines, size=12, color="#fff", anchor="start", line_height=1.4):
    """Render multiple lines of text using <tspan> elements.

    IMPORTANT: SVG <text> elements do NOT support automatic line wrapping.
    Newline characters (\\n) inside a <text> element are ignored by most
    SVG renderers even with white-space:pre. You MUST use <tspan> elements
    with dy offsets to create multi-line text.

    Args:
        x, y: position of the first line baseline
        lines: list of strings, one per line
        size: font size in px
        color: fill color
        anchor: text-anchor (start, middle, end)
        line_height: multiplier for line spacing (1.4 = 140% of font size)
    """
    dy = size * line_height
    parts = [f'<text x="{x}" y="{y}" font-family=\'{FONT}\' font-size="{size}px" '
             f'fill="{color}" text-anchor="{anchor}" dominant-baseline="auto">']
    for i, line in enumerate(lines):
        if i == 0:
            parts.append(f'<tspan x="{x}" dy="0">{line}</tspan>')
        else:
            parts.append(f'<tspan x="{x}" dy="{dy:.1f}">{line}</tspan>')
    parts.append('</text>')
    return '\n'.join(parts)

def arrow(x1, y1, x2, y2, color, marker_id):
    # Define arrowhead marker + dashed line
    ...
```

### Common diagram patterns

**Layered architecture** (most common): Horizontal bands stacked vertically,
each representing an abstraction level. Boxes inside each band represent
services or components.

**Side pillars**: Vertical bars spanning all layers for cross-cutting
concerns (e.g., "Security & Compliance", "Developer Experience"). Place
these to the left and/or right of the main stack.

**Sub-groups**: Dashed-border rectangles within a layer that group related
services into categories. Use `stroke-dasharray="8 4"` and reduced opacity
(0.6) to visually distinguish them from solid service boxes.

**Cross-layer elements**: Components that span multiple layers (e.g., a
"GitHub" bar bridging two layers). These require careful z-order handling —
see **Z-order**.

**Legends**: Small rectangles with labels at the bottom of the diagram
explaining visual conventions (dashed = optional, solid = mandatory, etc.).

## Critical rules

### Z-order (paint order)

SVG renders elements in document order — later elements paint on top of
earlier ones. This is the most common source of visual bugs in generated
diagrams.

**The rule**: If element A should appear on top of element B, element A must
come AFTER element B in the SVG markup.

**Practical ordering**:
1. Canvas background rect
2. Layer background rects (large, colored bands)
3. Cross-layer elements (these MUST come after any layer background they
   overlap, otherwise the background will cover them)
4. Sub-group rects (dashed category boundaries)
5. Service box rects
6. Lines and arrows
7. Text elements

A cross-layer element like a GitHub bar spanning two layers needs to appear
in the SVG after BOTH layer backgrounds have been written. If you write the
GitHub rect between the two layer backgrounds, the second layer background
will paint over it.

### Overflow prevention

Every child element must fit entirely within its parent container. Check
both right edge and bottom edge.

**After generating the SVG, always run a verification script:**

```python
import xml.etree.ElementTree as ET

tree = ET.parse('output.excalidraw.svg')
root = tree.getroot()
ns = {'svg': 'http://www.w3.org/2000/svg'}

rects = []
for r in root.findall('.//svg:rect', ns):
    x, y = float(r.get('x', 0)), float(r.get('y', 0))
    w, h = float(r.get('width', 0)), float(r.get('height', 0))
    rects.append({
        'x': x, 'y': y, 'w': w, 'h': h,
        'r': x + w, 'b': y + h,
        'dashed': 'stroke-dasharray' in r.attrib
    })

# Check: child boxes fit inside dashed sub-groups
subgroups = [r for r in rects if r['dashed'] and r['w'] > 50]
solid = [r for r in rects if not r['dashed'] and 50 < r['w'] < 1000 and r['h'] < 200]

for sg in subgroups:
    children = [b for b in solid
                if b['x'] >= sg['x'] and b['y'] >= sg['y']
                and b['x'] < sg['r'] and b['y'] < sg['b']]
    for c in children:
        if c['r'] > sg['r'] + 1:
            print(f"OVERFLOW right: box at ({c['x']},{c['y']}) exceeds sub-group by {c['r']-sg['r']:.0f}px")
        if c['b'] > sg['b'] + 1:
            print(f"OVERFLOW bottom: box at ({c['x']},{c['y']}) exceeds sub-group by {c['b']-sg['b']:.0f}px")

# Check: sub-groups fit inside layer backgrounds
layers = [r for r in rects if r['w'] > 1000 and 100 < r['h'] < 500 and not r['dashed']]
for layer in layers:
    sgs = [sg for sg in subgroups if sg['y'] >= layer['y'] and sg['y'] < layer['b']]
    for sg in sgs:
        if sg['b'] > layer['b'] + 1 or sg['r'] > layer['r'] + 1:
            print(f"Sub-group overflows layer at y={layer['y']}")

# Check: text doesn't overlap pillar titles
# (compare text y-positions against title bottom y)

# Check: multi-line text fits inside its containing box
for t in root.findall('.//svg:text', ns):
    tx, ty = float(t.get('x', 0)), float(t.get('y', 0))
    tspans = t.findall('svg:tspan', ns)
    if tspans:
        font_size = float(t.get('font-size', '12').replace('px', ''))
        # Calculate the bottom of the last tspan
        cumulative_dy = 0
        for ts in tspans:
            dy_val = ts.get('dy', '0')
            cumulative_dy += float(dy_val)
        text_bottom = ty + cumulative_dy + font_size * 0.3  # descender allowance
        # Find the smallest containing rect
        for r in rects:
            if (r['x'] <= tx <= r['r'] and r['y'] <= ty <= r['b']):
                if text_bottom > r['b']:
                    print(f"TEXT OVERFLOW: multi-line text at ({tx},{ty}) "
                          f"extends to y={text_bottom:.0f}, "
                          f"box bottom at y={r['b']:.0f}")
                break
```

Run this check after every generation and fix any issues before presenting
the result. When fixing overflows, prefer expanding the parent container by
a few pixels rather than shrinking the child — it preserves the intended
layout.

### Text overlap prevention

For vertical pillars or columns with multiple items, verify that:
- The first item starts below the title text (title baseline + at least
  20px gap)
- Consecutive items don't overlap
  (`item_n.y + item_n.height + gap <= item_n+1.y`)
- All items fit within the pillar bounds

### Multi-line text in SVG

**This is a critical rule.** SVG `<text>` elements do NOT support automatic
line wrapping or newline characters (`\n`). Even with `white-space: pre`,
most SVG renderers (browsers, Docusaurus, GitHub) will collapse all text
onto a single line, causing it to overflow its containing box.

**Always use `<tspan>` elements for multi-line text:**

```python
# WRONG — newlines are ignored, text renders on one line and overflows:
text(x, y, "Line 1\nLine 2\nLine 3")

# CORRECT — each line gets its own <tspan> with a dy offset:
multiline_text(x, y, ["Line 1", "Line 2", "Line 3"], size=10)
```

Use the `multiline_text()` helper for any text block that contains more than
one line, such as:
- Numbered lists inside annotation/note boxes (e.g., rollback procedures,
  checklists)
- Multi-line descriptions or subtitles
- Legend entries with wrapped text

**Sizing the parent box**: When placing multi-line text inside a box,
calculate the required height:
```python
num_lines = len(lines)
text_block_height = size + (num_lines - 1) * (size * line_height)
# Ensure the box has enough padding:
box_height = title_height + top_padding + text_block_height + bottom_padding
```

Always verify that the last line's baseline
(`y + (num_lines - 1) * dy`) plus a bottom margin fits within the parent
box's bottom edge.

### Heading placement

When a layer contains a cross-layer element on its left side, the layer
heading text must be positioned to the right of that element. Check that
heading x-coordinates don't fall within the bounds of any overlapping
element.

## Color palette

Map the named colors from `agents/visualizer/AGENTS.md`'s style guide to
these roles (mirrors that skill's own usage column):
- **Dark/primary** (layer backgrounds, strokes, heading text): Petrol Deep
  (`#0A5060` — already the default `stroke` in the `rect()` helper above)
- **Secondary** (service boxes, sub-group fills): Petrol / Teal
- **Highlight/accent** (special elements, cross-layer components): Teal-Mid
- **Light/neutral** (sub-group backgrounds w/ reduced opacity, pillar item
  backgrounds): Sage
- **Warning/alert** (side pillar backgrounds for security/compliance
  concerns): Warm Amber

If the user supplies a different palette for a specific request, apply that
instead — confirm the mapping above still applies to it, adjusting roles as
needed. Never fall back to Excalidraw's default hand-drawn "Virgil"
style/colors — see **Font handling**.

## Font handling

Excalidraw's default font is "Virgil" (a hand-drawn style). For professional
diagrams, replace it with a clean system font.

**When generating SVG directly**: set `font-family` in every `<text>`
element:
```
font-family='Georgia, "Times New Roman", serif, Segoe UI Emoji'
```

**When modifying an exported `.excalidraw.svg`**: the exported SVG embeds
the Virgil font as base64 data in a `@font-face` block and references it in
`font-family` attributes on every `<text>` element. To replace it:

1. Remove the `@font-face` block containing the embedded Virgil base64 data
   (saves ~13KB)
2. Replace all `font-family="Virgil, sans-serif, Segoe UI Emoji"`
   attributes with your chosen font stack

```python
# Remove embedded font
content = re.sub(r'@font-face\s*\{[^}]*?Virgil[^}]*?\}', '', content)

# Replace font-family attributes on text elements
content = content.replace(
    'font-family="Virgil, sans-serif, Segoe UI Emoji"',
    'font-family="Georgia, Times New Roman, serif, Segoe UI Emoji"'
)
```

**Common font choices**:
- Serif (formal): `Georgia, "Times New Roman", serif`
- Sans-serif (modern): `"Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`
- Monospace (technical): `"Cascadia Code", "Fira Code", "Courier New", monospace`

Always keep `Segoe UI Emoji` as the last fallback for emoji support.

## Generating .excalidraw JSON (optional)

If the user also wants the editable `.excalidraw` source file, generate it
alongside the SVG. The format is:

```json
{
  "type": "excalidraw",
  "version": 2,
  "source": "description",
  "elements": [...],
  "appState": {
    "gridSize": null,
    "viewBackgroundColor": "#ffffff"
  },
  "files": {}
}
```

Each element needs: `id`, `type` ("rectangle"/"text"/"arrow"/"line"), `x`,
`y`, `width`, `height`, `strokeColor`, `backgroundColor`, `fillStyle`,
`strokeWidth`, `roughness` (0 for clean), `opacity`, `roundness`,
`groupIds`, and type-specific fields. Text elements also need `text`,
`fontSize`, `fontFamily` (1=Virgil, 2=Helvetica, 3=Cascadia), `textAlign`,
`verticalAlign`.

The `.excalidraw` file is the editable source; the `.excalidraw.svg` is the
rendered output. Both can coexist in a project.

## Workflow summary

1. **Understand the diagram requirements**: what layers, components,
   relationships, and visual style does the user want? (Ask if unclear —
   see **Before generating**.)
2. **Write a Python generator script**: build the SVG programmatically with
   helper functions for each element type.
3. **Run the generator** to produce the `.excalidraw.svg` file.
4. **Run the overflow/overlap verification script** and fix any issues.
5. **Return the result** — artifact path/content + one-line description
   only (see **Before generating**, step 4).
6. **Iterate**: apply tweaks by editing the SVG directly (for small changes
   like text edits, font swaps, color changes) or re-running the generator
   (for structural changes).

For small, targeted edits (rename a label, adjust a color, fix a font),
modify the SVG file directly rather than regenerating from scratch. For
structural changes (add/remove layers, reorganize categories, move elements
between layers), regenerate using the Python script to ensure consistent
spacing and alignment.

## Notes

- Never fabricate components, relationships, or architecture not confirmed
  by the user or found in memory/context.
