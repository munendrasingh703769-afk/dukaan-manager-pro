import re

file_path = 'app/owner/page.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Purana subscription fetch logic hatao (jo business_id se fetch kar raha tha)
old_fetch_pattern = r"// 3\. NEW SUBSCRIPTION LOGIC.*?setTrialDays\(remainingDays\);"
new_fetch_logic = """// 3. OWNER-LEVEL SUBSCRIPTION LOGIC
      // Ab hum business_id ki jagah owner (user) ki ID se fetch kar rahe hain
      const { data: subData } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('owner_id', user.id)
        .maybeSingle();

      // 🔥 DEBUG ALERT (Check karne ke liye)
      alert(`Owner ID: ${user.id} \\nPlan: ${subData?.plan_code || 'NONE'} \\nStatus: ${subData?.status || 'NONE'} \\nExpiry: ${subData?.current_period_end || 'NONE'}`);

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

content = re.sub(old_fetch_pattern, new_fetch_logic, content, flags=re.DOTALL)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ Owner logic updated to use owner_id!")
