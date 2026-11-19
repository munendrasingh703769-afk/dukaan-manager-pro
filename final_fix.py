import re

file_path = 'app/owner/page.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Purana toota hua logic aur alerts hatao
content = re.sub(r"alert\(`Owner ID.*?\);", "", content, flags=re.DOTALL)
content = re.sub(r"alert\(`✅ Logged in as.*?\);", "", content, flags=re.DOTALL)
content = re.sub(r"alert\(`❌ No user found.*?\);", "", content, flags=re.DOTALL)
content = re.sub(r"// 🔥 DEBUG ALERT.*?\);", "", content, flags=re.DOTALL)
content = re.sub(r"\{\/\* DEBUG BANNER \*\/\}.*?<\/div>\s*\)\}\s*", "", content, flags=re.DOTALL)

# 2. Toota hua if/else block fix karo aur naya logic daalo
old_logic_pattern = r"if \(subData && subData\.status === 'active'\).*?setTrialDays\(remainingDays\);"
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

      // Set Debug Info
      setDebugInfo({
        ownerId: user.id,
        plan: subData?.plan_code || 'NONE',
        status: subData?.status || 'NONE',
        expiry: subData?.current_period_end || 'NONE'
      });

      setPlanName(currentPlanName);
      setTrialDays(remainingDays);"""

content = re.sub(old_logic_pattern, new_logic, content, flags=re.DOTALL)

# 3. State add karo agar nahi hai
if "const [debugInfo, setDebugInfo]" not in content:
    content = content.replace(
        "const [planName, setPlanName] = useState('Trial');",
        "const [planName, setPlanName] = useState('Trial');\n  const [debugInfo, setDebugInfo] = useState<any>(null);"
    )

# 4. Screen par Laal box lagao (Business Overview ke thik upar)
if "{/* VISUAL DEBUG BOX */}" not in content:
    debug_ui = """
      {/* VISUAL DEBUG BOX */}
      {debugInfo && (
        <div className="bg-red-600 text-white p-3 mx-4 mt-4 rounded-lg z-50 text-xs font-mono break-all shadow-md">
          <p>Owner: {debugInfo.ownerId}</p>
          <p>Plan: {debugInfo.plan}</p>
          <p>Status: {debugInfo.status}</p>
          <p>Expiry: {debugInfo.expiry}</p>
        </div>
      )}
"""
    # Find a safe place to inject it (e.g., just before the Business Overview section)
    target = '<h2 className="text-lg font-bold text-slate-800 mb-3 px-1 tracking-tight">Business Overview</h2>'
    if target in content:
        content = content.replace(target, debug_ui + "\n" + target)
    else:
        # Fallback: put it right after the opening <div className="min-h-screen...">
        content = re.sub(r"(<div className=\"min-h-screen[^>]*>)", r"\1\n" + debug_ui, content, count=1)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print("✅ Syntax fixed and visual red box added!")
