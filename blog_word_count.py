import os
import requests
from bs4 import BeautifulSoup
from requests.exceptions import SSLError, ProxyError
import time
from datetime import datetime

# 设为 True 可强制重新爬取读书笔记（即使文件已存在）
FORCE_RESCRAPE_DUSHU = False

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

def write_to_markdown(all_articles, total_word_count, filename="游记字数统计.md", title="游记类别字数统计"):
    """将统计结果写入 Markdown 文件"""
    with open(filename, 'w', encoding='utf-8') as f:
        # 写入标题和时间
        f.write(f"# {title}\n\n")
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

        # 写入按字数排序的文章列表
        f.write(f"\n## 按字数排序\n\n")
        f.write(f"| 序号 | 文章标题 | 字数 | 发表时间 | 更新时间 | 链接 |\n")
        f.write(f"|------|----------|------|----------|----------|------|\n")
        
        # 按字数从少到多排序
        sorted_by_word_count = sorted(all_articles, key=lambda x: x['word_count'])
        for i, article in enumerate(sorted_by_word_count, 1):
            title = article['title'].replace('|', '\\|')  # 转义管道符
            f.write(f"| {i} | {title} | {article['word_count_text']} | {article['published_time']} | {article['updated_time']} | [查看文章]({article['url']}) |\n")
            
def scrape_category(base_url, label=""):
    """爬取某个分类下的所有文章，返回文章列表和总字数"""
    all_articles = []
    total_word_count = 0
    current_url = base_url
    page_num = 1

    while current_url:
        print(f"[{label}] 正在处理第 {page_num} 页: {current_url}")
        articles, next_page_url = get_articles_from_page(current_url)

        if not articles:
            print(f"[{label}] 第 {page_num} 页没有找到文章，停止遍历")
            break

        for article in articles:
            article_url = "https://kangaroogao.com" + article['href']
            article_title = article.text.strip()

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
                print(f"  文章: {article_title}, 字数: {word_count_text}, 发表: {published_time}, 更新: {updated_time}")

            time.sleep(0.5)

        current_url = next_page_url
        page_num += 1
        if current_url:
            time.sleep(1)

    return all_articles, total_word_count


def scrape_specific_urls(urls, label="指定文章"):
    """爬取指定 URL 列表的文章，返回文章列表和总字数"""
    all_articles = []
    total_word_count = 0

    for url in urls:
        print(f"[{label}] 正在处理: {url}")
        word_count, word_count_text, published_time, updated_time = get_word_count_from_article(url)

        # 获取文章标题
        try:
            resp = requests.get(url, verify=False)
            resp.encoding = 'utf-8'
            soup = BeautifulSoup(resp.text, 'html.parser')
            title_el = soup.select_one('h1.post-title') or soup.select_one('h1.article-title') or soup.find('h1')
            article_title = title_el.text.strip() if title_el else url
        except Exception:
            article_title = url

        if word_count > 0:
            total_word_count += word_count
            all_articles.append({
                'title': article_title,
                'url': url,
                'word_count': word_count,
                'word_count_text': word_count_text,
                'published_time': published_time,
                'updated_time': updated_time
            })
            print(f"  文章: {article_title}, 字数: {word_count_text}, 发表: {published_time}, 更新: {updated_time}")

        time.sleep(0.5)

    return all_articles, total_word_count


def print_summary(label, all_articles, total_word_count):
    if total_word_count >= 1000:
        total_text = f"{round(total_word_count / 1000, 1)}k"
    else:
        total_text = f"{int(total_word_count)}"
    print(f"\n=== {label} 统计结果 ===")
    print(f"总共找到 {len(all_articles)} 篇文章")
    print(f"总字数: {total_text} ({int(total_word_count)} 字)")
    for i, article in enumerate(all_articles, 1):
        print(f"{i}. {article['title']} - {article['word_count_text']} - {article['published_time']} - {article['updated_time']}")


# ===== 1. 游记类别 =====
youji_articles, youji_total = scrape_category(
    "https://kangaroogao.com/categories/%E6%B8%B8%E8%AE%B0/",
    label="游记"
)
print_summary("游记", youji_articles, youji_total)

if youji_articles:
    write_to_markdown(youji_articles, youji_total,
                      filename="游记字数统计.md",
                      title="游记类别字数统计")
    print(f"\n统计结果已保存到 '游记字数统计.md' 文件")
else:
    print(f"\n没有找到游记文章，未生成文件")


# ===== 2. 指定额外文章 =====
extra_urls = [
    "https://kangaroogao.com/posts/4086/",
    "https://kangaroogao.com/posts/18e4/",
    "https://kangaroogao.com/posts/d4b0/",
    "https://kangaroogao.com/posts/4cde/",
]
extra_articles, extra_total = scrape_specific_urls(extra_urls, label="指定文章")

# 合并游记 + 指定文章 → 文章字数统计.md
combined_articles = youji_articles + extra_articles
combined_total = youji_total + extra_total
print_summary("文章（游记+指定文章）", combined_articles, combined_total)

if combined_articles:
    write_to_markdown(combined_articles, combined_total,
                      filename="文章字数统计.md",
                      title="文章字数统计（游记 + 指定文章）")
    print(f"\n统计结果已保存到 '文章字数统计.md' 文件")
else:
    print(f"\n没有找到任何文章，未生成 '文章字数统计.md'")


# ===== 3. 读书笔记类别 =====
DUSHU_FILE = "读书笔记字数统计.md"
if not FORCE_RESCRAPE_DUSHU and os.path.exists(DUSHU_FILE):
    print(f"\n[读书笔记] '{DUSHU_FILE}' 已存在，跳过爬取。")
    print(f"  如需重新统计，请将脚本顶部的 FORCE_RESCRAPE_DUSHU 设为 True。")
else:
    dushu_articles, dushu_total = scrape_category(
        "https://kangaroogao.com/categories/%E8%AF%BB%E4%B9%A6%E7%AC%94%E8%AE%B0/",
        label="读书笔记"
    )
    print_summary("读书笔记", dushu_articles, dushu_total)

    if dushu_articles:
        write_to_markdown(dushu_articles, dushu_total,
                          filename=DUSHU_FILE,
                          title="读书笔记类别字数统计")
        print(f"\n统计结果已保存到 '{DUSHU_FILE}' 文件")
    else:
        print(f"\n没有找到读书笔记文章，未生成文件")