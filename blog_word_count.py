import requests
from bs4 import BeautifulSoup
from requests.exceptions import SSLError, ProxyError
import time
from datetime import datetime

def get_word_count_from_article(article_url):
    """从单篇文章页面获取字数和时间信息"""
    try:
        article_response = requests.get(article_url, verify=False)
        article_response.encoding = 'utf-8'
        article_soup = BeautifulSoup(article_response.text, 'html.parser')
        
        # 查找文章内容中的总字数
        word_count_element = article_soup.select_one('span.word-count')
        word_count = 0
        word_count_text = "0"
        if word_count_element:
            # 提取总字数
            word_count_text = word_count_element.text
            # 将字数转换为整数
            if 'k' in word_count_text:
                word_count = float(word_count_text.replace('k', '')) * 1000
            else:
                word_count = float(word_count_text)
        
        # 提取发表时间
        published_time_element = article_soup.select_one('time.post-meta-date-created')
        published_time = "未知"
        if published_time_element:
            published_time = published_time_element.get('datetime', '未知')
            # 转换时间格式，只保留日期部分
            if published_time != "未知":
                try:
                    dt = datetime.fromisoformat(published_time.replace('Z', '+00:00'))
                    published_time = dt.strftime('%Y-%m-%d')
                except:
                    published_time = "未知"
        
        # 提取更新时间
        updated_time_element = article_soup.select_one('time.post-meta-date-updated')
        updated_time = "未更新"
        if updated_time_element:
            updated_time = updated_time_element.get('datetime', '未更新')
            # 转换时间格式，只保留日期部分
            if updated_time != "未更新":
                try:
                    dt = datetime.fromisoformat(updated_time.replace('Z', '+00:00'))
                    updated_time = dt.strftime('%Y-%m-%d')
                except:
                    updated_time = "未更新"
        
        return word_count, word_count_text, published_time, updated_time
    except (SSLError, ProxyError) as e:
        print(f"Error occurred while fetching article {article_url}: {e}")
        return 0, "0", "未知", "未更新"

def get_articles_from_page(url):
    """从单个页面获取所有文章链接"""
    try:
        response = requests.get(url, verify=False)
        response.encoding = 'utf-8'
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # 查找所有文章链接
        articles = soup.select('a.article-sort-item-title')
        
        # 检查是否有下一页
        next_page = soup.select_one('a.extend.next')
        next_page_url = None
        if next_page and 'href' in next_page.attrs:
            next_page_url = "https://kangaroogao.com" + next_page['href']
        
        return articles, next_page_url
    except (SSLError, ProxyError) as e:
        print(f"Error occurred while fetching URL {url}: {e}")
        return [], None

def write_to_markdown(all_articles, total_word_count, filename="游记字数统计.md"):
    """将统计结果写入 Markdown 文件"""
    with open(filename, 'w', encoding='utf-8') as f:
        # 写入标题和时间
        f.write(f"# 游记类别字数统计\n\n")
        f.write(f"统计时间： {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n")
        
        # 写入总体统计
        if total_word_count >= 1000:
            total_word_count_text = f"{round(total_word_count / 1000, 1)}k"
        else:
            total_word_count_text = f"{int(total_word_count)}"
        
        f.write(f"## 总体统计\n\n")
        f.write(f"- 文章总数： {len(all_articles)} 篇\n")
        f.write(f"- 总字数： {total_word_count_text} ({int(total_word_count)} 字)\n")
        f.write(f"- 平均字数： {int(total_word_count / len(all_articles))} 字/篇\n\n")
        
        # 写入文章列表（倒序）
        f.write(f"## 文章详情\n\n")
        f.write(f"| 序号 | 文章标题 | 字数 | 发表时间 | 更新时间 | 链接 |\n")
        f.write(f"|------|----------|------|----------|----------|------|\n")
        
        # 将文章列表倒序
        reversed_articles = list(reversed(all_articles))
        for i, article in enumerate(reversed_articles, 1):
            title = article['title'].replace('|', '\\|')  # 转义管道符
            f.write(f"| {i} | {title} | {article['word_count_text']} | {article['published_time']} | {article['updated_time']} | [查看文章]({article['url']}) |\n")
        
        # 写入字数分布统计
        f.write(f"\n## 字数分布\n\n")
        
        # 按字数分组
        ranges = [
            (0, 1000, "1000字以下"),
            (1000, 3000, "1000-3000字"),
            (3000, 5000, "3000-5000字"),
            (5000, 10000, "5000-10000字"),
            (10000, float('inf'), "10000字以上")
        ]
        
        for min_count, max_count, label in ranges:
            count = len([a for a in all_articles if min_count <= a['word_count'] < max_count])
            percentage = round(count / len(all_articles) * 100, 1) if all_articles else 0
            f.write(f"- {label}： {count} 篇 ({percentage}%)\n")

# 目标URL
base_url = "https://kangaroogao.com/categories/%E6%B8%B8%E8%AE%B0/"

# 初始化总字数和文章列表
total_word_count = 0
all_articles = []

# 从第一页开始遍历
current_url = base_url
page_num = 1

while current_url:
    print(f"正在处理第 {page_num} 页: {current_url}")
    
    # 获取当前页面的文章
    articles, next_page_url = get_articles_from_page(current_url)
    
    if not articles:
        print(f"第 {page_num} 页没有找到文章，停止遍历")
        break
    
    # 处理当前页面的每篇文章
    for article in articles:
        article_url = "https://kangaroogao.com" + article['href']
        article_title = article.text.strip()
        
        # 获取文章字数和时间信息
        word_count, word_count_text, published_time, updated_time = get_word_count_from_article(article_url)
        
        if word_count > 0:
            total_word_count += word_count
            all_articles.append({
                'title': article_title,
                'url': article_url,
                'word_count': word_count,
                'word_count_text': word_count_text,
                'published_time': published_time,
                'updated_time': updated_time
            })
            print(f"文章: {article_title}, 字数: {word_count_text}, 发表: {published_time}, 更新: {updated_time}")
        
        # 添加延迟避免请求过快
        time.sleep(0.5)
    
    # 移动到下一页
    current_url = next_page_url
    page_num += 1
    
    # 添加页面间延迟
    if current_url:
        time.sleep(1)

# 输出结果到控制台
print(f"\n=== 统计结果 ===")
print(f"总共找到 {len(all_articles)} 篇文章")
if total_word_count >= 1000:
    total_word_count_text = f"{round(total_word_count / 1000, 1)}k"
else:
    total_word_count_text = f"{int(total_word_count)}"

print(f"总字数: {total_word_count_text} ({int(total_word_count)} 字)")

# 输出每篇文章的详细信息
print(f"\n=== 文章列表 ===")
for i, article in enumerate(all_articles, 1):
    print(f"{i}. {article['title']} - {article['word_count_text']} - {article['published_time']} - {article['updated_time']}")

# 写入 Markdown 文件
if all_articles:
    write_to_markdown(all_articles, total_word_count)
    print(f"\n统计结果已保存到 '游记字数统计.md' 文件")
else:
    print(f"\n没有找到任何文章，未生成文件")