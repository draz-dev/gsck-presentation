import re

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# 1. Replace the entire <main> and <header> structure up to the first slide with reveal structure
html = re.sub(
    r'<main id=\"presentation-container\".*?<div id=\"deck\".*?(?=\s*<!-- Slide 1 -->)',
    '<div class=\"reveal\">\n    <div class=\"slides\">',
    html,
    flags=re.DOTALL
)

# 2. Replace the footer and closing main tag
html = re.sub(
    r'    </div>\s*<!-- Floating Premium Pill-Shape Control Bar -->.*?</footer>\s*</main>',
    '    </div>\n  </div>',
    html,
    flags=re.DOTALL
)

# 3. Clean up the <section> classes
# We want to change `<section class="slide absolute inset-0 w-full h-full opacity-0 pointer-events-none flex items-center justify-center" aria-hidden="true" data-slide="X">`
# to just `<section data-slide="X">`
html = re.sub(
    r'<section class=\"slide absolute inset-0 w-full h-full opacity-0 pointer-events-none flex items-center justify-center\" aria-hidden=\"true\" (data-slide=\"\d+\")>',
    r'<section \1>',
    html
)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)

print('Updated index.html successfully')
