import re

file_path = 'app/owner/page.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Purane saare debug boxes aur alerts hatao
content = re.sub(r"\{\/\* VISUAL DEBUG BOX \*\/\}.*?<\/div>\s*\)\}\s*", "", content, flags=re.DOTALL)
content = re.sub(r"\{\/\* DEBUG BANNER \*\/\}.*?<\/div>\s*\)\}\s*", "", content, flags=re.DOTALL)
content = re.sub(r"alert\(`.*?`\);", "", content, flags=re.DOTALL)

# 2. Purana toota hua subscription logic dhoondho aur usko naye code se replace karo
# Hum "// 3. " se shuru karke "setTrialDays(remainingDays);" tak sab replace kar denge
start_pattern = r"// 3\. (NEW|OWNER-LEVEL) SUBSCRIPTION LOGIC"
end_pattern = r"setTrialDays\(remainingDays\);"

new_logic = """// 3. OWNER-LEVEL SUBSCRIPTION LOGIC
      const { data: subData } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('owner_id', user.id)
        .maybeSingle();

      let currentPlanName = 'Trial';
      let remainingDays = 0;

      if (subData && subData.status === 'active') {
        const expiryDate = new Date(subData.current_period_end).getTime();
        const now = new Date().getTime();
        const diff = expiryDate - now;
        
        if (diff > 0) {
          remainingDays = Math.ceil(diff / (1000 * 60 * 60 * 24));
          currentPlanName = subData.plan_code.toUpperCase();
        } else {
          currentPlanName = 'Expired';
          remainingDays = 0;
        }
      } else {
        if (activeBiz.created_at) {
          const start = new Date(activeBiz.created_at).getTime();
          const now = new Date().getTime();
          const daysPassed = Math.floor((now - start) / (1000 * 60 * 60 * 24));
          remainingDays = 15 - daysPassed;
          
          if (remainingDays <= 0) {
            currentPlanName = 'Expired';
            remainingDays = 0;
          }
        }
      }

      setDebugInfo({
        ownerId: user.id,
        plan: subData?.plan_code || 'NONE',
        status: subData?.status || 'NONE',
        expiry: subData?.current_period_end || 'NONE'
      });

      setPlanName(currentPlanName);
      setTrialDays(remainingDays);"""

start_match = re.search(start_pattern, content)
if start_match:
    start_idx = start_match.start()
    end_match = re.search(end_pattern, content[start_idx:])
    if end_match:
        end_idx = start_idx + end_match.end()
        content = content[:start_idx] + new_logic + content[end_idx:]
        print("✅ Logic replaced successfully.")
    else:
        print("❌ Could not find end pattern.")
else:
    print("❌ Could not find start pattern.")

# 3. State add karo agar nahi hai
if "const [debugInfo, setDebugInfo]" not in content:
    content = content.replace(
        "const [planName, setPlanName] = useState('Trial');",
        "const [planName, setPlanName] = useState('Trial');\n  const [debugInfo, setDebugInfo] = useState<any>(null);"
    )

# 4. Screen par Laal box lagao (Header ke theek neeche)
debug_ui = """
      {/* VISUAL DEBUG BOX */}
      {debugInfo && (
        <div className="bg-red-600 text-white p-3 mx-4 mt-2 rounded-lg z-50 text-xs font-mono break-all shadow-md">
          <p>Owner: {debugInfo.ownerId}</p>
          <p>Plan: {debugInfo.plan}</p>
          <p>Status: {debugInfo.status}</p>
          <p>Expiry: {debugInfo.expiry}</p>
        </div>
      )}
"""
if "{/* VISUAL DEBUG BOX */}" not in content:
    target = r"return\s*\(\s*(<div[^>]*>)"
    match = re.search(target, content)
    if match:
        content = content.replace(match.group(0), f"{match.group(0)}\n{debug_ui}")

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print("✅ Code completely rewritten with Visual Box!")
