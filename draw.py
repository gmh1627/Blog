import matplotlib.pyplot as plt
from matplotlib import rcParams

# 设置字体为 SimHei（黑体），解决中文乱码问题
rcParams['font.sans-serif'] = ['SimHei']  # 设置字体为黑体
rcParams['axes.unicode_minus'] = False   # 解决负号显示问题

# 数据
years = ["大学前", "2022-2023", "2024", "2025", "2026"]
new_cities = [19, 2, 21, 21, 8]  # 新到的城市
cumulative_cities = [19, 21, 42, 63, 71]  # 累计去过的城市

# 创建图形并绘制新到的城市折线图
plt.figure(figsize=(10, 6))
plt.plot(years, new_cities, marker='o', color="blue")
for i, value in enumerate(new_cities):
    plt.text(years[i], value, str(value), fontsize=10, ha='center', va='bottom')  # 标注数字
plt.title("新到的城市数量", fontsize=16)
plt.xlabel("年份", fontsize=12)
plt.ylabel("城市数量", fontsize=12)
plt.yticks(range(0, max(new_cities) + 5, 5))  # 设置纵坐标刻度为整数
# plt.legend() 
plt.grid(alpha=0.5)
plt.savefig("new_cities.png")  # 保存为图片
plt.close()  # 关闭当前图形

# 创建图形并绘制累计去过的城市折线图
plt.figure(figsize=(10, 6))
plt.plot(years, cumulative_cities, marker='o', color="orange")
for i, value in enumerate(cumulative_cities):
    plt.text(years[i], value, str(value), fontsize=10, ha='center', va='bottom')  # 标注数字
plt.title("累计去过的城市数量", fontsize=16)
plt.xlabel("年份", fontsize=12)
plt.ylabel("城市数量", fontsize=12)
plt.yticks(range(0, max(cumulative_cities) + 5, 5))  # 设置纵坐标刻度为整数
# plt.legend()
plt.grid(alpha=0.5)
plt.savefig("cumulative_cities.png")  # 保存为图片
plt.close()  # 关闭当前图形