with open('src/features/dashboard/Dashboard.jsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()
lines[763] = '          {/* Charts Row */}\n'
lines[764] = '          <div className="grid grid-cols-1 gap-6">\n'
del lines[765:1023]
with open('src/features/dashboard/Dashboard.jsx', 'w', encoding='utf-8') as f:
    f.writelines(lines)
