import re

file_path = 'app/owner/page.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. planName state add karo (agar nahi hai)
if "const [planName, setPlanName]" not in content:
    content = content.replace(
        "const [trialDays, setTrialDays] = useState(15);",
        "const [trialDays, setTrialDays] = useState(15);\n  const [planName, setPlanName] = useState('Trial');"
    )

# 2. Purana Trial calculate logic hatao
pattern = r"// 3\. Calculate Trial Days.*?setTrialDays\(daysLeft > 0 \? daysLeft : 0\);\s*\}"
new_logic = """// 3. NEW SUBSCRIPTION LOGIC
      const { data: subData } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('business_id', activeBiz.id)
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

      setPlanName(currentPlanName);
      setTrialDays(remainingDays);"""

content = re.sub(pattern, new_logic, content, flags=re.DOTALL)

# 3. UI Text update karo
content = re.sub(
    r"Trial:\s*\{trialDays\}\s*days\s*left", 
    "{planName === 'Trial' ? `Trial: ${trialDays} days left` : planName === 'Expired' ? 'Trial Expired' : `${planName} Plan Active`}", 
    content
)

content = re.sub(
    r"Upgrade to unlock all features", 
    "{planName === 'Expired' ? 'Upgrade to unlock all features' : `Expires in ${trialDays} days`}", 
    content
)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ File app/owner/page.tsx successfully updated!")
