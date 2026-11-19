import re

file_path = 'app/owner/page.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Inject Debug Alert right after subscription fetch
pattern = r"(const \{ data: subData \} = await supabase\s*\.from\('subscriptions'\)\s*\.select\('\*'\)\s*\.eq\('business_id', activeBiz\.id\)\s*\.maybeSingle\(\);)"

replacement = r"""\1
      // 🔥 DEBUG ALERT: Yeh check karne ke liye ki DB se kya aa raha hai
      alert(`Business ID: ${activeBiz.id} \nPlan Found: ${subData?.plan_code || 'NONE'} \nStatus: ${subData?.status || 'NONE'} \nExpiry: ${subData?.current_period_end || 'NONE'}`);"""

content = re.sub(pattern, replacement, content, flags=re.DOTALL)

# 2. Force UI replacement for the Trial Banner (just in case previous script missed it)
ui_pattern = r"<div className=\"bg-green-50.*?</div>\s*</div>"
ui_replacement = """<div className={`p-4 rounded-2xl border flex items-center justify-between ${planName === 'Trial' ? 'bg-orange-50 border-orange-200' : planName === 'Expired' ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
        <div className="flex items-center gap-3">
          <div className="text-3xl">{planName === 'Trial' ? '⏳' : planName === 'Expired' ? '⚠️' : '👑'}</div>
          <div>
            <h3 className={`font-bold ${planName === 'Trial' ? 'text-orange-800' : planName === 'Expired' ? 'text-red-800' : 'text-green-800'}`}>
              {planName === 'Trial' ? `Trial: ${trialDays} days left` : planName === 'Expired' ? 'Trial Expired' : `${planName} Plan Active`}
            </h3>
            <p className={`text-xs ${planName === 'Trial' ? 'text-orange-600' : planName === 'Expired' ? 'text-red-600' : 'text-green-600'}`}>
              {planName === 'Expired' ? 'Upgrade to unlock all features' : `Expires in ${trialDays} days`}
            </p>
          </div>
        </div>
        {(planName === 'Trial' || planName === 'Expired') && (
          <Link href="/pricing" className="bg-blue-600 text-white text-xs font-bold px-3 py-2 rounded-lg">Upgrade →</Link>
        )}
      </div>"""

# Only replace if the exact old text is found
if 'Trial: {trialDays} days left' in content or 'Trial: ${trialDays} days left' in content:
    content = re.sub(ui_pattern, ui_replacement, content, flags=re.DOTALL)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ Debug alert added and UI updated!")
