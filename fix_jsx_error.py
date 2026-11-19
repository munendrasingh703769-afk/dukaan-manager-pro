import re

file_path = 'app/owner/page.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Toota hua Debug Banner hatao (jo <main> tag ke andar chala gaya tha)
content = re.sub(r"\{\/\* DEBUG BANNER \*\/\}.*?<\/div>\s*\)\}\s*", "", content, flags=re.DOTALL)

# 2. Debug State hatao
content = re.sub(r"const \[debugInfo, setDebugInfo\] = useState<any>\(null\);", "", content)

# 3. Ek naya Alert lagao (User Login check karne ke liye)
if "const { data: { user } } = await supabase.auth.getUser();" in content:
    content = content.replace(
        "const { data: { user } } = await supabase.auth.getUser();",
        """const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        alert(`✅ Logged in as: ${user.email} \\nUser ID: ${user.id}`);
      } else {
        alert(`❌ No user found! You are not logged in.`);
      }"""
    )

# 4. Purane saare faltu alerts hatao
content = re.sub(r"// 🔥 DEBUG ALERT.*?\);", "", content, flags=re.DOTALL)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print("✅ JSX error fixed and User Login Alert added!")
