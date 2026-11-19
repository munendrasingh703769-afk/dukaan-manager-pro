import re

file_path = 'app/owner/page.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Remove the old alert
content = re.sub(r"alert\(`Owner ID.*?\);", "", content, flags=re.DOTALL)

# 2. Insert Debug UI directly before the return statement of the component
# We will look for the main return statement
if "if (loading)" in content:
    # We need to find the main return block. A safe way is to add a div inside the main container.
    # Let's find the `<main` or `<div` that wraps the dashboard and inject a red box right at the start.
    
    # We will inject a state to hold the debug string first
    if "const [debugInfo, setDebugInfo] = useState('')" not in content:
        content = content.replace(
            "const [planName, setPlanName] = useState('Trial');",
            "const [planName, setPlanName] = useState('Trial');\n  const [debugInfo, setDebugInfo] = useState<any>(null);"
        )
        
    # Now set the debug info instead of alert
    old_fetch = r"// 🔥 DEBUG ALERT \(Check karne ke liye\).*?alert\(`Owner ID.*?\);"
    new_fetch = """// 🔥 DEBUG STATE SET
      setDebugInfo({
        ownerId: user.id,
        plan: subData?.plan_code || 'NONE',
        status: subData?.status || 'NONE',
        expiry: subData?.current_period_end || 'NONE'
      });"""
      
    content = re.sub(old_fetch, new_fetch, content, flags=re.DOTALL)

    # Inject the red banner right after `<div className="min-h-screen` or similar
    # Let's find `<div className="bg-slate-50` or the main return wrapper
    # Since I don't know the exact wrapper, I'll put it right before `{/* Business Overview */}` or similar
    # Actually, the safest is to put it right after `return (`
    
    if "{/* DEBUG BANNER */}" not in content:
        # Find the first return (
        return_match = re.search(r"return\s*\(\s*(<[a-zA-Z]+)", content)
        if return_match:
            tag = return_match.group(1)
            # Insert debug banner right inside the wrapper
            debug_ui = """
      {/* DEBUG BANNER */}
      {debugInfo && (
        <div className="bg-red-600 text-white p-4 m-2 rounded-lg z-50 text-xs font-mono break-all">
          <p><strong>Owner ID:</strong> {debugInfo.ownerId}</p>
          <p><strong>Plan:</strong> {debugInfo.plan}</p>
          <p><strong>Status:</strong> {debugInfo.status}</p>
          <p><strong>Expiry:</strong> {debugInfo.expiry}</p>
        </div>
      )}
"""
            content = content.replace(return_match.group(0), f"{return_match.group(0)}\n{debug_ui}")
            print("✅ Debug banner injected!")
        else:
            print("❌ Could not find return statement.")
    else:
        print("✅ Debug banner already exists.")
else:
    print("❌ Loading state not found.")

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
