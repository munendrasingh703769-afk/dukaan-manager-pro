import re

file_path = 'app/owner/page.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Purane saare debug boxes aur alerts saaf karo
content = re.sub(r"\{\/\* (VISUAL|FORCE) DEBUG BOX \*\/\}.*?<\/div>\s*\)\}\s*", "", content, flags=re.DOTALL)
content = re.sub(r"\{\/\* DEBUG BANNER \*\/\}.*?<\/div>\s*\)\}\s*", "", content, flags=re.DOTALL)
content = re.sub(r"alert\(`.*?`\);", "", content, flags=re.DOTALL)

# 2. Debug ke liye state variables add karo
if "const [debugSubData, setDebugSubData]" not in content:
    content = content.replace(
        "const [planName, setPlanName] = useState('Trial');",
        "const [planName, setPlanName] = useState('Trial');\n  const [debugSubData, setDebugSubData] = useState<any>(null);"
    )

# 3. Database fetch logic update karo taaki error pakda ja sake
old_fetch = r"const \{ data: subData \} = await supabase\s*\.from\('subscriptions'\)\s*\.select\('\*'\)\s*\.eq\('owner_id', user\.id\)\s*\.maybeSingle\(\);"
new_fetch = """const { data: subData, error: subError } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('owner_id', user.id)
        .maybeSingle();

      // Save data to state so we can print it on screen
      setDebugSubData({ subData, subError, userId: user.id, bizId: activeBiz.id });"""
      
content = re.sub(old_fetch, new_fetch, content, flags=re.DOTALL)

# 4. Screen par Laal Box lagao
debug_ui = """
      {/* 🔥 FORCE DEBUG BOX 🔥 */}
      <div style={{ backgroundColor: '#dc2626', color: 'white', padding: '10px', fontSize: '11px', zIndex: 9999, position: 'relative', wordBreak: 'break-all' }}>
        <p><strong>State:</strong> {planName} ({trialDays} days)</p>
        <p><strong>User ID:</strong> {user?.id}</p>
        <p><strong>Biz ID:</strong> {activeBiz?.id}</p>
        <p><strong>SubData:</strong> {JSON.stringify(debugSubData?.subData)}</p>
        <p><strong>Error:</strong> {JSON.stringify(debugSubData?.subError)}</p>
      </div>
    """
if "{/* 🔥 FORCE DEBUG BOX 🔥 */}" not in content:
    match = re.search(r"(<div className=\"min-h-screen[^>]*>|<main[^>]*>)", content)
    if match:
        content = content.replace(match.group(1), match.group(1) + debug_ui)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print("✅ Force Debug Box injected with SubData!")
