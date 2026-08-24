import os

file_path = 'src/components/settings/AdministrativoSettings.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(r'\`', '`')
content = content.replace(r'\$', '$')

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
