import re

file_path = 'app/owner/page.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Toote hue variables ko fix karo
content = content.replace("{user?.id}", "{debugSubData?.userId || 'Loading...'}")
content = content.replace("{activeBiz?.id}", "{debugSubData?.bizId || 'Loading...'}")

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print("✅ User variable error fixed!")
