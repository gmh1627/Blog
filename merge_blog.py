import os

# 定义源目录和目标文件路径
source_dir = r'D:\Blog\source\_posts'
target_file = r'F:\Desktop\merged_blog.md'

# 定义需要排除的文件名
exclude_files = [
    '书单.md',
    '书的奇迹——我的阅读小史（大一下学期之前）.md',
    '各种网站（学习资源、常用工具及其他）.md',
    '文艺作品、活动.md',
    '我喜欢的诗.md',
    '读书笔记（大一下）.md',
    '读书笔记（大三上）.md',
    '读书笔记（大二上）.md',
    '读书笔记（大二下）.md',
    '这个博客网站是怎么搭建的？.md',
    '藏书.md'
]

# 初始化合并内容
merged_content = ""

# 遍历源目录下的所有文件
for filename in os.listdir(source_dir):
    # 检查文件是否为 Markdown 文件且不在排除列表中
    if filename.endswith('.md') and filename not in exclude_files:
        file_path = os.path.join(source_dir, filename)
        with open(file_path, 'r', encoding='utf-8') as file:
            content = file.read()
            # 去掉文件名的 .md 后缀
            title = os.path.splitext(filename)[0]
            merged_content += f"# {title}\n\n"  # 添加文件名作为标题
            # 跳过开头的两个 ---
            if content.startswith('---'):
                content = content.split('---', 2)[-1]
            merged_content += content.strip() + "\n\n"  # 添加文件内容

# 将合并后的内容写入目标文件
with open(target_file, 'w', encoding='utf-8') as file:
    file.write(merged_content)

print(f"合并完成，文件保存到: {target_file}")