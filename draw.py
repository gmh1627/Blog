import matplotlib.pyplot as plt
from matplotlib import rcParams
import matplotlib.patches as mpatches

# ----------------- 配置部分 -----------------
# 设置字体为 SimHei（黑体），解决中文乱码问题
rcParams['font.sans-serif'] = ['SimHei']  
rcParams['axes.unicode_minus'] = False   
rcParams['figure.dpi'] = 300             # 提高分辨率
rcParams['savefig.bbox'] = 'tight'       # 保存时去除白边

# 统一风格设置
def set_style(ax):
    """应用精美的图表样式"""
    # 隐藏上边和右边的边框
    ax.spines['top'].set_visible(False)
    ax.spines['right'].set_visible(False)
    # 设置左边和底部的边框颜色
    ax.spines['left'].set_color('#888888')
    ax.spines['bottom'].set_color('#888888')
    # 开启网格，样式为虚线
    ax.grid(True, linestyle='--', alpha=0.4, axis='y', color='gray')
    ax.tick_params(axis='both', colors='#333333', labelsize=10)
    
def add_labels(ax, x, y, color):
    """添加带有背景框的数据标签"""
    for i, value in enumerate(y):
        ax.annotate(f"{value}", 
                    xy=(x[i], value), 
                    xytext=(0, 10), 
                    textcoords='offset points',
                    ha='center', va='bottom',
                    fontsize=10, 
                    color='white',
                    fontweight='bold',
                    bbox=dict(boxstyle="round,pad=0.3", fc=color, ec="none", alpha=0.8))

# ----------------- 数据部分 -----------------
years = ["大学前", "2022-2023", "2024", "2025", "2026"]
new_cities = [19, 2, 21, 21, 8]  
cumulative_cities = [19, 21, 42, 63, 71] 

# ----------------- 绘图1: 新到的城市 -----------------
plt.figure(figsize=(10, 6))
ax1 = plt.gca()
set_style(ax1)

# 配色: 清新的蓝绿色
line_color = '#2E86C1'
fill_color = '#AED6F1'

# 绘制折线和面积
plt.plot(years, new_cities, marker='o', markersize=8, color=line_color, linewidth=2.5, label='新增数量')
plt.fill_between(years, new_cities, color=fill_color, alpha=0.3)

# 添加数据标签
add_labels(ax1, years, new_cities, line_color)

plt.title("新到的城市数量", fontsize=16, fontweight='bold', pad=20, color='#333333')
plt.ylabel("城市数量", fontsize=12, color='#555555')

# 调整Y轴范围，留出顶部空间给标签
plt.ylim(0, max(new_cities) * 1.25)

plt.savefig("new_cities.png")
plt.close()

# ----------------- 绘图2: 累计去过的城市 -----------------
plt.figure(figsize=(10, 6))
ax2 = plt.gca()
set_style(ax2)

# 配色: 温暖的橙红色
line_color_cum = '#E67E22'
fill_color_cum = '#FAD7A0'

# 绘制折线和面积
plt.plot(years, cumulative_cities, marker='D', markersize=8, color=line_color_cum, linewidth=2.5, label='累计数量')
plt.fill_between(years, cumulative_cities, color=fill_color_cum, alpha=0.3)

# 添加数据标签
add_labels(ax2, years, cumulative_cities, line_color_cum)

plt.title("累计去过的城市数量", fontsize=16, fontweight='bold', pad=20, color='#333333')
plt.ylabel("城市数量", fontsize=12, color='#555555')

# 调整Y轴范围
plt.ylim(0, max(cumulative_cities) * 1.15)

plt.savefig("cumulative_cities.png")
plt.close()

print("图表已重新生成")