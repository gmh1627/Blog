(() => {
  'use strict';
  const root = document.getElementById('journey-calendar');
  if (!root || root.dataset.initialized) return;
  root.dataset.initialized = 'true';
  const element = (role) => root.querySelector(`[data-role="${role}"]`);
  const escape = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const iso = (year, month, day) => `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  let data;
  let selected;
  let year;
  let month;
  let firstYear;
  let lastYear;

  function renderDetail() {
    const record = data.days[selected];
    const date = new Date(`${selected}T00:00:00+08:00`);
    const weekday = new Intl.DateTimeFormat('zh-CN', { weekday: 'long', timeZone: 'Asia/Shanghai' }).format(date);
    const title = `<div class="jc-day-heading"><span>${selected.replaceAll('-', '.')}</span><span>${weekday}</span></div>`;
    if (!record) {
      element('detail').innerHTML = `${title}<div class="jc-empty">这一天还没有记录。<p>选一个带圆点的日期，查看行程和交通。</p></div>`;
      return;
    }
    const links = record.articles.map((article) => `<a href="${escape(article.url)}">${escape(article.title)} ↗</a>`).join('');
    const events = record.events.map((event) => {
      if (event.type === 'visit') return `<li class="jc-event visit"><span class="jc-event-kind">游览${event.city ? ` · ${escape(event.city)}` : ''}</span>${event.range ? `<small>${escape(event.range)}</small>` : ''}<p>${escape(event.details || event.city)}</p></li>`;
      const kind = event.type === 'train' ? '铁路' : '航班';
      const phase = event.phase === 'arrival' ? '抵达' : event.arrivalDate > event.date ? '出发 · 跨夜' : '';
      let time = event.time;
      if (event.phase === 'arrival') time = `${event.clock} 抵达 · ${event.departureDate.replaceAll('-', '.')} 出发`;
      else if (event.arrivalDate > event.date) time = `${event.clock} 出发 · ${event.arrivalDate.replaceAll('-', '.')} 抵达`;
      return `<li class="jc-event ${event.type}"><span class="jc-event-kind">${kind}${phase ? ` · ${phase}` : ''}</span><strong>${escape(event.origin)} <span aria-label="到">→</span> ${escape(event.destination)}</strong><p class="jc-transport-meta">${escape(event.code)} · ${event.distance.toLocaleString('zh-CN')} km${time ? `<br>${escape(time)}` : ''}</p></li>`;
    }).join('');
    element('detail').innerHTML = `${title}<div class="jc-article-links" aria-label="当天的游记">${links}</div><ol class="jc-timeline">${events}</ol>`;
  }

  function render() {
    element('year').value = String(year);
    element('month').value = String(month);
    const start = (new Date(Date.UTC(year, month - 1, 1)).getUTCDay() + 6) % 7;
    const length = new Date(Date.UTC(year, month, 0)).getUTCDate();
    let html = '<span class="jc-blank" aria-hidden="true"></span>'.repeat(start);
    let count = 0;
    for (let day = 1; day <= length; day++) {
      const date = iso(year, month, day);
      const events = data.days[date]?.events || [];
      if (events.length) count++;
      const kinds = [...new Set(events.map((event) => event.type))];
      const labels = { visit: '游览', train: '铁路', flight: '航班' };
      html += `<button type="button" class="jc-date${events.length ? ' has-events' : ''}" data-date="${date}" aria-pressed="${date === selected}" aria-label="${year}年${month}月${day}日${kinds.length ? '，' + kinds.map((kind) => labels[kind]).join('、') : '，暂无记录'}"><span>${day}</span><span class="jc-dots" aria-hidden="true">${kinds.map((kind) => `<i class="jc-dot ${kind}"></i>`).join('')}</span></button>`;
    }
    element('grid').innerHTML = html;
    element('month-summary').textContent = `本月 ${count} 天有记录`;
    root.querySelector('[data-action="previous"]').disabled = year === firstYear && month === 1;
    root.querySelector('[data-action="next"]').disabled = year === lastYear && month === 12;
    renderDetail();
  }

  function select(date, updateHash = true) {
    selected = date;
    [year, month] = date.split('-').map(Number);
    render();
    if (updateHash) history.replaceState(null, '', `#journey-${date}`);
  }

  function changeMonth(nextYear, nextMonth) {
    if (nextMonth < 1) { nextYear--; nextMonth = 12; }
    if (nextMonth > 12) { nextYear++; nextMonth = 1; }
    if (nextYear < firstYear || nextYear > lastYear) return;
    const prefix = iso(nextYear, nextMonth, 1).slice(0, 7);
    select(Object.keys(data.days).find((date) => date.startsWith(prefix)) || `${prefix}-01`);
  }

  root.addEventListener('click', (event) => {
    const dateButton = event.target.closest('[data-date]');
    if (dateButton) { select(dateButton.dataset.date); return; }
    const action = event.target.closest('[data-action]')?.dataset.action;
    if (!data) return;
    if (action === 'previous') changeMonth(year, month - 1);
    if (action === 'next') changeMonth(year, month + 1);
    if (action === 'latest') select(Object.keys(data.days).at(-1));
  });
  element('year').addEventListener('change', () => changeMonth(Number(element('year').value), month));
  element('month').addEventListener('change', () => changeMonth(year, Number(element('month').value)));
  element('grid').addEventListener('keydown', (event) => {
    const button = event.target.closest('[data-date]');
    const offset = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[event.key];
    if (!button || !offset) return;
    event.preventDefault();
    const date = new Date(`${button.dataset.date}T00:00:00Z`);
    date.setUTCDate(date.getUTCDate() + offset);
    if (date.getUTCFullYear() < firstYear || date.getUTCFullYear() > lastYear) return;
    select(date.toISOString().slice(0, 10));
    root.querySelector(`[data-date="${selected}"]`).focus();
  });

  fetch(root.dataset.calendarUrl).then((response) => {
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  }).then((payload) => {
    data = payload;
    const dates = Object.keys(data.days);
    if (!dates.length) { element('detail').textContent = '暂时没有带具体日期的行程。'; return; }
    firstYear = Number(dates[0].slice(0, 4));
    lastYear = Number(dates.at(-1).slice(0, 4));
    element('year').innerHTML = Array.from({ length: lastYear - firstYear + 1 }, (_, index) => `<option>${firstYear + index}</option>`).join('');
    element('month').innerHTML = Array.from({ length: 12 }, (_, index) => `<option value="${index + 1}">${index + 1} 月</option>`).join('');
    const hash = location.hash.match(/^#journey-(\d{4}-\d{2}-\d{2})$/)?.[1];
    select(hash && data.days[hash] ? hash : dates.at(-1), false);
  }).catch((error) => {
    element('detail').textContent = '行程暂时无法读取，请刷新页面重试。';
    console.error('旅行日历', error);
  });
})();
