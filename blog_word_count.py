import requests
from bs4 import BeautifulSoup
from requests.exceptions import SSLError, ProxyError

# 目标URL
url = "https://kangaroogao.com/categories/%E6%B8%B8%E8%AE%B0/"

try:
    # 发送HTTP请求
    response = requests.get(url, verify=False)
    response.encoding = 'utf-8'

    # 解析HTML
    soup = BeautifulSoup(response.text, 'html.parser')

    # 查找所有文章链接
    articles = soup.select('a.article-sort-item-title')

    # 初始化总字数
    total_word_count = 0

    # 遍历每篇文章
    for article in articles:
        article_url = "https://kangaroogao.github.io" + article['href']
        try:
            article_response = requests.get(article_url, verify=False)
            article_response.encoding = 'utf-8'
            article_soup = BeautifulSoup(article_response.text, 'html.parser')
            
            # 查找文章内容中的总字数
            word_count_element = article_soup.select_one('span.word-count')
            if word_count_element:
                # 提取总字数
                word_count_text = word_count_element.text
                # 将字数转换为整数
                if 'k' in word_count_text:
                    word_count = float(word_count_text.replace('k', '')) * 1000
                else:
                    word_count = int(word_count_text)
                
                # 四舍五入并保留k
                if word_count >= 1000:
                    word_count_text = f"{round(word_count / 1000, 1)}k"
                else:
                    word_count_text = f"{round(word_count / 1000, 1)}k"
                
                total_word_count += word_count
                print(f"文章: {article.text}, 字数: {word_count_text}")
        except (SSLError, ProxyError) as e:
            print(f"Error occurred while fetching article {article_url}: {e}")

    # 输出总字数
    total_word_count_text = f"{round(total_word_count / 1000, 1)}k"
    print(f"总字数: {total_word_count_text}")

except (SSLError, ProxyError) as e:
    print(f"Error occurred while fetching URL {url}: {e}")