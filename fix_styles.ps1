$path = "c:\Users\berna\Documents\trae_projects\padel app\app.js"
$content = Get-Content $path -Raw

# Replace Group Table Highlight
$content = $content.Replace("const highlight = i < 2 ? 'background:#eee' : '';", "const highlightClass = i < 2 ? 'rank-highlight' : '';")
$content = $content.Replace('<tr style="${highlight}">', '<tr class="${highlightClass}">')

# Replace Final Placements Highlight
$content = $content.Replace('<tr style="${idx < 3 ? ''background: var(--bg-body);'' : ''''}">', '<tr class="${idx < 3 ? ''rank-highlight'' : ''''}">')

# Replace Main Ranking Highlight (if not already done)
# Note: The SearchReplace earlier claimed success on this one, but let's double check via Grep earlier.
# Grep found it at line 455 (Final Placements). It did NOT find it at line 1233 (Main Ranking).
# So Main Ranking (line 1233) might have been successfully updated by tool call 2 or 5?
# Let's verify line 1233 first.

Set-Content $path $content -NoNewline
