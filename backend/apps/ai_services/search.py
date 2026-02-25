import re
from typing import List, Dict, Optional
from urllib.parse import urlparse, parse_qs, unquote


DEFAULT_USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/121.0.0.0 Safari/537.36"
)


def _requests():
    try:
        import requests
    except Exception as exc:
        raise RuntimeError(f"Requests unavailable: {exc}") from exc
    return requests


def _html_tools():
    try:
        from bs4 import BeautifulSoup
        from readability import Document
    except Exception as exc:
        raise RuntimeError(f"HTML parsers unavailable: {exc}") from exc
    return BeautifulSoup, Document


def _resolve_duckduckgo_url(raw_url: Optional[str]) -> Optional[str]:
    if not raw_url or not raw_url.startswith("http"):
        return None
    try:
        parsed = urlparse(raw_url)
        if parsed.hostname and parsed.hostname.endswith("duckduckgo.com"):
            if parsed.path == "/y.js":
                return None
            qs = parse_qs(parsed.query or "")
            uddg = qs.get("uddg", [None])[0]
            return unquote(uddg) if uddg else None
        return raw_url
    except Exception:
        return None


def _chunk_text(text: str, max_length: int = 1000) -> List[str]:
    if not text:
        return []
    sentences = re.findall(r"[^.!?]+[.!?]*(?:\s|$)", text) or [text]
    chunks: List[str] = []
    current = ""
    for sentence in sentences:
        sentence = sentence.strip()
        if not sentence:
            continue
        if current and len(current) + 1 + len(sentence) > max_length:
            chunks.append(current)
            current = ""
        if len(sentence) > max_length:
            if current:
                chunks.append(current)
                current = ""
            for part in re.findall(rf".{{1,{max_length}}}", sentence):
                chunks.append(part)
        else:
            current = f"{current} {sentence}".strip()
    if current:
        chunks.append(current)
    return chunks


def _extract_headlines(document, limit: int = 8) -> List[str]:
    headlines: List[str] = []
    seen = set()
    for node in document.select("h1, h2, h3"):
        text = " ".join(node.get_text(" ", strip=True).split())
        if len(text) < 20:
            continue
        if len(text.split(" ")) < 4:
            continue
        if text in seen:
            continue
        seen.add(text)
        headlines.append(text)
        if len(headlines) >= limit:
            break
    return headlines


def fetch_duckduckgo_results(query: str, limit: int = 5) -> List[Dict[str, str]]:
    try:
        BeautifulSoup, _ = _html_tools()
    except Exception:
        return []
    requests = _requests()
    search_url = f"https://html.duckduckgo.com/html/?q={requests.utils.quote(query)}"
    response = requests.get(
        search_url,
        headers={"User-Agent": DEFAULT_USER_AGENT},
        timeout=10,
    )
    response.raise_for_status()
    soup = BeautifulSoup(response.text, "lxml")
    results: List[Dict[str, str]] = []
    for result in soup.select(".result"):
        anchor = result.select_one("a.result__a")
        if not anchor:
            continue
        title = anchor.get_text(strip=True)
        raw_url = anchor.get("href")
        snippet = result.select_one(".result__snippet")
        resolved_url = _resolve_duckduckgo_url(raw_url)
        if title and resolved_url:
            results.append({
                "title": title,
                "url": resolved_url,
                "snippet": snippet.get_text(strip=True) if snippet else "No description available",
            })
        if len(results) >= limit:
            break
    return results


def scrape_readable_text(url: str) -> Optional[Dict[str, object]]:
    try:
        BeautifulSoup, Document = _html_tools()
        requests = _requests()
        response = requests.get(
            url,
            headers={"User-Agent": DEFAULT_USER_AGENT},
            timeout=15,
        )
        response.raise_for_status()

        raw_html = response.text
        soup = BeautifulSoup(raw_html, "lxml")

        readable = Document(raw_html)
        summary_html = readable.summary()
        summary = BeautifulSoup(summary_html, "lxml")
        text = summary.get_text(" ", strip=True)
        title = readable.short_title() or readable.title() or url

        if not text or len(text) < 200:
            headlines = _extract_headlines(soup)
            if not headlines:
                return None
            chunks = _chunk_text(". ".join(headlines), 1000)
            return {"title": title, "url": url, "chunks": chunks}

        chunks = _chunk_text(text, 1000)
        return {"title": title, "url": url, "chunks": chunks}
    except Exception:
        return None


def search_and_scrape(query: str, limit: int = 5) -> Dict[str, object]:
    sources = fetch_duckduckgo_results(query, limit=limit)
    if not sources:
        return {"query": query, "sources": [], "content": []}

    content: List[Dict[str, object]] = []
    for source in sources:
        scraped = scrape_readable_text(source["url"])
        if scraped:
            content.append(scraped)

    return {"query": query, "sources": sources, "content": content}
