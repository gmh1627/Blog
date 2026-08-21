(() => {
  "use strict";

  const units = Array.isArray(window.HERITAGE_UNITS) ? window.HERITAGE_UNITS : [];
  const unitById = new Map(units.map((unit) => [unit.id, unit]));
  const runtime = window.HERITAGE_RUNTIME && typeof window.HERITAGE_RUNTIME === "object"
    ? window.HERITAGE_RUNTIME
    : {};
  const readOnly = runtime.readOnly === true;
  const storageKey = "nationalHeritageVisits.v1";
  const provinceOrder = [
    "北京市", "天津市", "河北省", "山西省", "内蒙古自治区", "辽宁省", "吉林省", "黑龙江省",
    "上海市", "江苏省", "浙江省", "安徽省", "福建省", "江西省", "山东省", "河南省", "湖北省",
    "湖南省", "广东省", "广西壮族自治区", "海南省", "重庆市", "四川省", "贵州省", "云南省",
    "西藏自治区", "陕西省", "甘肃省", "青海省", "宁夏回族自治区", "新疆维吾尔自治区",
  ];
  const periodOrder = [
    "史前", "夏商周", "秦汉", "魏晋南北朝", "隋唐五代", "宋辽金西夏",
    "元", "明", "清", "近代", "现代", "其他",
  ];
  const collator = new Intl.Collator("zh-CN", { numeric: true, sensitivity: "base" });
  const urlParams = new URLSearchParams(window.location.search);
  const isStatisticsView = urlParams.get("view") === "stats";

  function classifyPeriod(era) {
    const value = String(era || "").replaceAll(" ", "");
    if (!value || /不详|未载|未知/.test(value)) return "其他";
    if (/以前/.test(value)) return "其他";

    const groups = [
      ["史前", /旧石器|新石器|史前|更新世|古生代|旧石器时代|新石器时代/],
      ["夏商周", /先秦|(?<!西)夏|商|西周|东周|(?<!北|后)周|春秋|战国|青铜时代/],
      ["秦汉", /秦|汉|新莽/],
      ["魏晋南北朝", /三国|魏|晋|十六国|南北朝|南朝|北朝|北魏|东魏|西魏|北齐|北周|高句丽/],
      ["隋唐五代", /隋|唐|五代|后周|吐蕃|南诏|渤海/],
      ["宋辽金西夏", /宋|辽|金|西夏|大理/],
      ["元", /(?<!公)元/],
      ["明", /明/],
      ["清", /清/],
      ["近代", /民国|近现代|近代/],
      ["现代", /中华人民共和国|现代|当代|至今/],
    ];
    const earliestPeriod = groups.find(([, pattern]) => pattern.test(value));
    if (earliestPeriod) return earliestPeriod[0];

    const years = [...value.matchAll(/(?<!公元前)(\d{3,4})年?/g)].map((match) => Number(match[1]));
    if (years.length) {
      const earliest = Math.min(...years);
      if (earliest >= 1949) return "现代";
      if (earliest >= 1840) return "近代";
    }
    return "其他";
  }

  units.forEach((unit) => {
    unit.period = unit.period || classifyPeriod(unit.era);
  });

  const state = {
    query: "",
    status: "all",
    group: "province",
    batches: new Set([1, 2, 3, 4, 5, 6, 7, 8]),
    province: isStatisticsView
      ? "all"
      : (provinceOrder.includes(urlParams.get("province")) ? urlParams.get("province") : "北京市"),
    category: "all",
    period: "all",
    includeMerged: false,
    timelineGranularity: "year",
    page: 1,
    pageSize: 20,
    activeDetailId: null,
  };

  const elements = {
    totalStat: document.querySelector("#totalStat"),
    visitedStat: document.querySelector("#visitedStat"),
    provinceStat: document.querySelector("#provinceStat"),
    rateStat: document.querySelector("#rateStat"),
    searchInput: document.querySelector("#searchInput"),
    statusControl: document.querySelector("#statusControl"),
    groupControl: document.querySelector("#groupControl"),
    batchFilters: document.querySelector("#batchFilters"),
    allBatchesButton: document.querySelector("#allBatchesButton"),
    provinceFilter: document.querySelector("#provinceFilter"),
    categoryFilter: document.querySelector("#categoryFilter"),
    periodFilter: document.querySelector("#periodFilter"),
    mergedToggle: document.querySelector("#mergedToggle"),
    timelineControl: document.querySelector("#timelineControl"),
    timeCoverage: document.querySelector("#timeCoverage"),
    timelineChart: document.querySelector("#timelineChart"),
    batchChart: document.querySelector("#batchChart"),
    categoryChart: document.querySelector("#categoryChart"),
    resetFiltersButton: document.querySelector("#resetFiltersButton"),
    provinceProgress: document.querySelector("#provinceProgress"),
    resultCount: document.querySelector("#resultCount"),
    resultPageTools: document.querySelector(".result-page-tools"),
    pageSizeSelect: document.querySelector("#pageSizeSelect"),
    previousPageButton: document.querySelector("#previousPageButton"),
    nextPageButton: document.querySelector("#nextPageButton"),
    pageIndicator: document.querySelector("#pageIndicator"),
    pageJumpInput: document.querySelector("#pageJumpInput"),
    pageJumpButton: document.querySelector("#pageJumpButton"),
    resultGroups: document.querySelector("#resultGroups"),
    pagination: document.querySelector("#pagination"),
    detailDialog: document.querySelector("#detailDialog"),
    detailForm: document.querySelector("#detailForm"),
    dialogMeta: document.querySelector("#dialogMeta"),
    dialogTitle: document.querySelector("#dialogTitle"),
    dialogFacts: document.querySelector("#dialogFacts"),
    dialogVisited: document.querySelector("#dialogVisited"),
    dialogTime: document.querySelector("#dialogTime"),
    dialogNotes: document.querySelector("#dialogNotes"),
    dialogSource: document.querySelector("#dialogSource"),
    importButton: document.querySelector("#importButton"),
    importFile: document.querySelector("#importFile"),
    exportJsonButton: document.querySelector("#exportJsonButton"),
    exportCsvButton: document.querySelector("#exportCsvButton"),
    clearRecordsButton: document.querySelector("#clearRecordsButton"),
    recordsView: document.querySelector("#recordsView"),
    statisticsView: document.querySelector("#statisticsView"),
    recordsViewLink: document.querySelector("#recordsViewLink"),
    statisticsViewLink: document.querySelector("#statisticsViewLink"),
    dataMenu: document.querySelector(".data-menu"),
    saveStatus: document.querySelector("#saveStatus"),
    saveDetailButton: document.querySelector("#saveDetailButton"),
    toast: document.querySelector("#toast"),
  };

  let records = loadRecords();
  let editorConnected = false;
  let editorSaveQueue = Promise.resolve();
  let toastTimer = null;
  let searchTimer = null;

  function sanitizeRecords(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    const sanitized = {};
    Object.entries(value).forEach(([id, record]) => {
      if (!unitById.has(id) || !record || typeof record !== "object") return;
      sanitized[id] = {
        visited: Boolean(record.visited),
        time: String(record.time || "").trim(),
        notes: String(record.notes || "").trim(),
      };
    });
    return sanitized;
  }

  function loadRecords() {
    if (readOnly) return sanitizeRecords(runtime.records);
    try {
      const value = JSON.parse(localStorage.getItem(storageKey) || "{}");
      return sanitizeRecords(value);
    } catch (error) {
      return {};
    }
  }

  function saveRecords() {
    if (readOnly) return;
    localStorage.setItem(storageKey, JSON.stringify(records));
    if (!editorConnected) return;
    const payload = JSON.stringify({ version: 1, records });
    elements.saveStatus.textContent = "正在保存…";
    editorSaveQueue = editorSaveQueue
      .catch(() => {})
      .then(async () => {
        const response = await fetch("/api/records", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: payload,
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        elements.saveStatus.textContent = "已自动保存到博客数据";
      })
      .catch(() => {
        elements.saveStatus.textContent = "自动保存失败，请保留 JSON 备份";
      });
  }

  function recordFor(id) {
    return records[id] || { visited: false, time: "", notes: "" };
  }

  function updateRecord(id, patch) {
    if (readOnly) return;
    const next = { ...recordFor(id), ...patch };
    next.visited = Boolean(next.visited);
    next.time = String(next.time || "").trim();
    next.notes = String(next.notes || "").trim();
    if (!next.visited && !next.time && !next.notes) {
      delete records[id];
    } else {
      records[id] = next;
    }
    saveRecords();
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function formatNumber(value) {
    return new Intl.NumberFormat("zh-CN").format(value);
  }

  function shortProvince(value) {
    return value
      .replace("特别行政区", "")
      .replace("壮族自治区", "")
      .replace("回族自治区", "")
      .replace("维吾尔自治区", "")
      .replace("自治区", "")
      .replace(/[省市]$/, "");
  }

  function showToast(message) {
    elements.toast.textContent = message;
    elements.toast.classList.add("show");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => elements.toast.classList.remove("show"), 2600);
  }

  function initializeControls() {
    elements.recordsView.hidden = isStatisticsView;
    elements.statisticsView.hidden = !isStatisticsView;
    const currentViewLink = isStatisticsView ? elements.statisticsViewLink : elements.recordsViewLink;
    currentViewLink.classList.add("active");
    currentViewLink.setAttribute("aria-current", "page");
    document.body.classList.toggle("read-only", readOnly);
    elements.dataMenu.hidden = readOnly;
    elements.clearRecordsButton.hidden = readOnly;
    elements.dialogVisited.disabled = readOnly;
    elements.dialogTime.readOnly = readOnly;
    elements.dialogNotes.readOnly = readOnly;
    elements.saveDetailButton.hidden = readOnly;
    elements.saveStatus.textContent = readOnly ? "博客公开数据 · 只读" : "当前浏览器本地保存";

    elements.batchFilters.innerHTML = Array.from({ length: 8 }, (_, index) => {
      const batch = index + 1;
      return `<button type="button" class="batch-filter active" data-batch="${batch}" aria-pressed="true">${batch}</button>`;
    }).join("");

    const provinces = provinceOrder.filter((province) => units.some((unit) => unit.province === province));
    elements.provinceFilter.innerHTML = [
      '<option value="all">全部省份</option>',
      ...provinces.map((province) => `<option value="${escapeHtml(province)}">${escapeHtml(province)}</option>`),
    ].join("");
    elements.provinceFilter.value = state.province;

    const categories = [...new Set(units.map((unit) => unit.category))]
      .sort((a, b) => collator.compare(a, b));
    elements.categoryFilter.innerHTML = [
      '<option value="all">全部类别</option>',
      ...categories.map((category) => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`),
    ].join("");

    elements.periodFilter.innerHTML = [
      '<option value="all">全部年代</option>',
      ...periodOrder
        .filter((period) => units.some((unit) => unit.period === period))
        .map((period) => `<option value="${escapeHtml(period)}">${escapeHtml(period)}</option>`),
    ].join("");
  }

  function matchesFilters(unit) {
    if (unit.kind === "merged" && !state.includeMerged) return false;
    if (!state.batches.has(unit.batch)) return false;
    if (state.province !== "all" && unit.province !== state.province) return false;
    if (state.category !== "all" && unit.category !== state.category) return false;
    if (state.period !== "all" && unit.period !== state.period) return false;
    const record = recordFor(unit.id);
    if (state.status === "visited" && !record.visited) return false;
    if (state.status === "unvisited" && record.visited) return false;
    if (state.query) {
      const haystack = `${unit.name} ${unit.alias || ""} ${unit.code} ${unit.location} ${unit.era} ${unit.period} ${unit.category} ${unit.remark}`.toLocaleLowerCase("zh-CN");
      if (!haystack.includes(state.query)) return false;
    }
    return true;
  }

  function sortedFilteredUnits() {
    const result = units.filter(matchesFilters);
    result.sort((a, b) => {
      if (state.group === "province") {
        const provinceDifference = provinceOrder.indexOf(a.province) - provinceOrder.indexOf(b.province);
        if (provinceDifference) return provinceDifference;
        if (a.batch !== b.batch) return a.batch - b.batch;
      } else if (state.group === "batch") {
        if (a.batch !== b.batch) return a.batch - b.batch;
        const announcementDifference = announcementOrder(a) - announcementOrder(b);
        if (announcementDifference) return announcementDifference;
      } else {
        const periodDifference = periodOrder.indexOf(a.period) - periodOrder.indexOf(b.period);
        if (periodDifference) return periodDifference;
        const provinceDifference = provinceOrder.indexOf(a.province) - provinceOrder.indexOf(b.province);
        if (provinceDifference) return provinceDifference;
        if (a.batch !== b.batch) return a.batch - b.batch;
      }
      if (a.kind !== b.kind) return a.kind === "unit" ? -1 : 1;
      return collator.compare(a.name, b.name);
    });
    return result;
  }

  function announcementOrder(unit) {
    const officialMatch = String(unit.code || "").match(/^\d-(\d{4})-/);
    const officialSerial = officialMatch ? Number(officialMatch[1]) : 0;
    // Batch 7 merged projects continue as 1944-1990, followed by the
    // Babaoshan supplement numbered 1991.
    if (unit.batch === 7 && officialSerial) return officialSerial;
    if (unit.kind === "unit" && officialSerial) return officialSerial;
    const mergeSerial = Number(String(unit.id).match(/(\d+)$/)?.[1] || 0);
    return 100000 + mergeSerial;
  }

  function renderStats() {
    const independent = units.filter((unit) => unit.kind === "unit");
    const visited = independent.filter((unit) => recordFor(unit.id).visited);
    const visitedProvinces = new Set(visited.map((unit) => unit.province));
    elements.totalStat.textContent = formatNumber(independent.length);
    elements.visitedStat.textContent = formatNumber(visited.length);
    elements.provinceStat.textContent = formatNumber(visitedProvinces.size);
    elements.rateStat.textContent = `${(visited.length / independent.length * 100).toFixed(1)}%`;
  }

  function parseVisitTime(value) {
    const match = String(value || "").match(/(?:^|[^\d])((?:19|20)\d{2})(?:\s*(?:[-/.]|年)\s*(0?[1-9]|1[0-2]))?/);
    if (!match) return null;
    return {
      year: Number(match[1]),
      month: match[2] ? Number(match[2]) : null,
    };
  }

  function renderTimeline(visitedUnits) {
    const parsed = visitedUnits
      .map((unit) => parseVisitTime(recordFor(unit.id).time))
      .filter(Boolean);
    const counts = new Map();
    parsed.forEach((time) => {
      if (state.timelineGranularity === "month" && !time.month) return;
      const key = state.timelineGranularity === "year"
        ? String(time.year)
        : `${time.year}-${String(time.month).padStart(2, "0")}`;
      counts.set(key, (counts.get(key) || 0) + 1);
    });
    const points = [...counts.entries()].sort(([a], [b]) => a.localeCompare(b));
    if (!points.length) {
      const label = state.timelineGranularity === "year" ? "尚无可统计的到访年份" : "尚无精确到月份的到访时间";
      elements.timelineChart.innerHTML = `<div class="chart-empty">${label}</div>`;
      elements.timelineChart.style.removeProperty("--point-count");
      elements.timelineChart.setAttribute("aria-label", label);
      return;
    }
    const maximum = Math.max(...points.map(([, count]) => count));
    elements.timelineChart.style.setProperty("--point-count", points.length);
    elements.timelineChart.innerHTML = points.map(([label, count]) => {
      const height = Math.max(5, Math.round(count / maximum * 150));
      return `<div class="timeline-point">
        <strong>${count}</strong>
        <div class="timeline-bar" style="height:${height}px"></div>
        <span>${escapeHtml(label)}</span>
      </div>`;
    }).join("");
    elements.timelineChart.setAttribute(
      "aria-label",
      `${state.timelineGranularity === "year" ? "年度" : "月度"}到访趋势：${points.map(([label, count]) => `${label} ${count}处`).join("，")}`,
    );
  }

  function renderBatchChart(independent) {
    const rows = Array.from({ length: 8 }, (_, index) => {
      const batch = index + 1;
      const batchUnits = independent.filter((unit) => unit.batch === batch);
      const visited = batchUnits.filter((unit) => recordFor(unit.id).visited).length;
      const percent = batchUnits.length ? visited / batchUnits.length * 100 : 0;
      return { batch, total: batchUnits.length, visited, percent };
    });
    elements.batchChart.innerHTML = rows.map((row) => `<div class="horizontal-row">
      <span class="horizontal-label">第 ${row.batch} 批</span>
      <div class="bar-track"><span class="bar-fill" style="width:${row.percent.toFixed(2)}%"></span></div>
      <strong>${row.visited}<small> / ${row.total}</small></strong>
    </div>`).join("");
    elements.batchChart.setAttribute(
      "aria-label",
      `各批完成度：${rows.map((row) => `第${row.batch}批 ${row.visited}/${row.total}`).join("，")}`,
    );
  }

  function renderCategoryChart(visitedUnits) {
    const counts = new Map();
    visitedUnits.forEach((unit) => counts.set(unit.category, (counts.get(unit.category) || 0) + 1));
    const rows = [...counts.entries()].sort((a, b) => b[1] - a[1] || collator.compare(a[0], b[0]));
    if (!rows.length) {
      elements.categoryChart.innerHTML = '<div class="chart-empty compact-empty">尚无已到访项目</div>';
      elements.categoryChart.setAttribute("aria-label", "尚无已到访项目");
      return;
    }
    const maximum = rows[0][1];
    elements.categoryChart.innerHTML = rows.map(([category, count]) => `<div class="horizontal-row category-row">
      <span class="horizontal-label" title="${escapeHtml(category)}">${escapeHtml(category)}</span>
      <div class="bar-track"><span class="bar-fill category-fill" style="width:${(count / maximum * 100).toFixed(2)}%"></span></div>
      <strong>${count}</strong>
    </div>`).join("");
    elements.categoryChart.setAttribute(
      "aria-label",
      `到访类别分布：${rows.map(([category, count]) => `${category} ${count}处`).join("，")}`,
    );
  }

  function renderAnalytics() {
    const independent = units.filter((unit) => unit.kind === "unit");
    const visited = independent.filter((unit) => recordFor(unit.id).visited);
    const parsedTimes = visited.map((unit) => parseVisitTime(recordFor(unit.id).time));
    const withYear = parsedTimes.filter(Boolean).length;
    const withMonth = parsedTimes.filter((time) => time && time.month).length;
    const withoutTime = visited.length - withYear;
    elements.timeCoverage.textContent = `已到访 ${visited.length} · 有年份 ${withYear} · 含月份 ${withMonth} · 未填时间 ${withoutTime}`;
    renderTimeline(visited);
    renderBatchChart(independent);
    renderCategoryChart(visited);
  }

  function renderProvinceProgress() {
    const independent = units.filter((unit) => unit.kind === "unit");
    elements.provinceProgress.innerHTML = provinceOrder
      .filter((province) => independent.some((unit) => unit.province === province))
      .map((province) => {
        const provinceUnits = independent.filter((unit) => unit.province === province);
        const visited = provinceUnits.filter((unit) => recordFor(unit.id).visited).length;
        const active = state.province === province ? " active" : "";
        return `<button class="province-progress-button${active}" type="button" data-province="${escapeHtml(province)}">
          <span>${escapeHtml(shortProvince(province))}</span>
          <small>${visited} / ${provinceUnits.length}</small>
        </button>`;
      }).join("");
  }

  function groupLabel(unit) {
    if (state.group === "province") return unit.province;
    if (state.group === "batch") return `第 ${unit.batch} 批`;
    return unit.period;
  }

  function renderRow(unit) {
    const record = recordFor(unit.id);
    const visitedClass = record.visited ? " visited-row" : "";
    const checked = record.visited ? " checked" : "";
    const merged = unit.kind === "merged" ? '<span class="merged-label">并入既有国保</span>' : "";
    const alias = unit.alias ? `<span class="unit-alias">（${escapeHtml(unit.alias)}）</span>` : "";
    const noteClass = record.notes ? " has-note" : "";
    const disabled = readOnly ? " disabled" : "";
    const readonly = readOnly ? " readonly" : "";
    return `<tr class="${visitedClass.trim()}" data-id="${escapeHtml(unit.id)}">
      <td class="col-check"><input class="visit-checkbox" type="checkbox" aria-label="标记到访：${escapeHtml(unit.name)}"${checked}${disabled}></td>
      <td class="col-name">
        <button class="unit-name-button" type="button" data-action="detail">${escapeHtml(unit.name)}${alias}</button>
        ${merged}
      </td>
      <td class="col-batch"><span class="batch-badge">${unit.batch}</span></td>
      <td class="col-category">${escapeHtml(unit.category)}<span class="period-label">${escapeHtml(unit.era || unit.period)}</span></td>
      <td class="col-location">${escapeHtml(unit.location)}</td>
      <td class="col-time"><input class="visit-time-input" type="text" value="${escapeHtml(record.time)}" aria-label="到访时间：${escapeHtml(unit.name)}" placeholder="年 / 月 / 日"${readonly}></td>
      <td class="col-actions"><button class="note-button${noteClass}" type="button" data-action="detail">${readOnly ? "查看" : "备注"}</button></td>
    </tr>`;
  }

  function renderGroup(label, groupUnits) {
    const visited = groupUnits.filter((unit) => recordFor(unit.id).visited).length;
    return `<section class="result-group">
      <h2 class="group-heading"><span>${escapeHtml(label)}</span><small>${visited} / ${groupUnits.length} 已到访</small></h2>
      <div class="table-wrap">
        <table class="heritage-table">
          <thead><tr>
            <th class="col-check">到访</th><th class="col-name">名称</th><th class="col-batch">批次</th>
            <th class="col-category">类别 / 年代</th><th class="col-location">地址</th><th class="col-time">到访时间</th><th class="col-actions">记录</th>
          </tr></thead>
          <tbody>${groupUnits.map(renderRow).join("")}</tbody>
        </table>
      </div>
    </section>`;
  }

  function renderPagination(pageCount) {
    if (pageCount <= 1) {
      elements.pagination.innerHTML = "";
      return;
    }
    const pages = new Set([1, pageCount, state.page - 1, state.page, state.page + 1]);
    const visible = [...pages].filter((page) => page >= 1 && page <= pageCount).sort((a, b) => a - b);
    const parts = [`<button type="button" data-page="${state.page - 1}" ${state.page === 1 ? "disabled" : ""}>上一页</button>`];
    visible.forEach((page, index) => {
      if (index && page - visible[index - 1] > 1) parts.push("<span>…</span>");
      parts.push(`<button type="button" data-page="${page}" class="${page === state.page ? "active" : ""}" ${page === state.page ? 'aria-current="page"' : ""}>${page}</button>`);
    });
    parts.push(`<button type="button" data-page="${state.page + 1}" ${state.page === pageCount ? "disabled" : ""}>下一页</button>`);
    elements.pagination.innerHTML = parts.join("");
  }

  function renderResults() {
    elements.resultPageTools.hidden = false;
    const filtered = sortedFilteredUnits();
    const pageCount = Math.max(1, Math.ceil(filtered.length / state.pageSize));
    state.page = Math.min(state.page, pageCount);
    const start = (state.page - 1) * state.pageSize;
    const pageUnits = filtered.slice(start, start + state.pageSize);
    const end = Math.min(start + state.pageSize, filtered.length);
    elements.resultCount.textContent = filtered.length
      ? `符合条件 ${formatNumber(filtered.length)} 项，当前 ${formatNumber(start + 1)}-${formatNumber(end)}`
      : "没有符合条件的项目";
    elements.pageIndicator.textContent = `${state.page} / ${filtered.length ? pageCount : 1}`;
    elements.pageJumpInput.max = String(filtered.length ? pageCount : 1);
    elements.pageJumpInput.value = String(state.page);
    elements.previousPageButton.disabled = state.page <= 1 || !filtered.length;
    elements.nextPageButton.disabled = state.page >= pageCount || !filtered.length;

    if (!pageUnits.length) {
      elements.resultGroups.innerHTML = '<div class="empty-state">没有符合条件的项目</div>';
      renderPagination(0);
      return;
    }

    const groups = [];
    pageUnits.forEach((unit) => {
      const label = groupLabel(unit);
      const current = groups.at(-1);
      if (!current || current.label !== label) groups.push({ label, units: [unit] });
      else current.units.push(unit);
    });
    elements.resultGroups.innerHTML = groups.map((group) => renderGroup(group.label, group.units)).join("");
    renderPagination(pageCount);
  }

  function renderAll() {
    renderStats();
    renderAnalytics();
    renderProvinceProgress();
    renderResults();
  }

  function resetPageAndRender() {
    state.page = 1;
    renderResults();
  }

  function syncStatusButtons() {
    elements.statusControl.querySelectorAll("button").forEach((button) => {
      button.classList.toggle("active", button.dataset.status === state.status);
    });
  }

  function syncGroupButtons() {
    elements.groupControl.querySelectorAll("button").forEach((button) => {
      button.classList.toggle("active", button.dataset.group === state.group);
    });
  }

  function syncBatchButtons() {
    elements.batchFilters.querySelectorAll("button").forEach((button) => {
      const active = state.batches.has(Number(button.dataset.batch));
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    elements.allBatchesButton.textContent = "全部";
  }

  function resetFilters() {
    state.query = "";
    state.status = "all";
    state.group = "province";
    state.batches = new Set([1, 2, 3, 4, 5, 6, 7, 8]);
    state.province = "北京市";
    state.category = "all";
    state.period = "all";
    state.includeMerged = false;
    state.page = 1;
    elements.searchInput.value = "";
    elements.provinceFilter.value = "北京市";
    elements.categoryFilter.value = "all";
    elements.periodFilter.value = "all";
    elements.mergedToggle.checked = false;
    syncStatusButtons();
    syncGroupButtons();
    syncBatchButtons();
    renderProvinceProgress();
    renderResults();
  }

  function openDetail(id) {
    const unit = unitById.get(id);
    if (!unit) return;
    const record = recordFor(id);
    state.activeDetailId = id;
    elements.dialogMeta.textContent = `${unit.code || "并入项目"} · 第 ${unit.batch} 批 · ${unit.year}`;
    elements.dialogTitle.textContent = unit.name;
    const facts = [
      ["类别", unit.category, false],
      ["年代", unit.period, false],
      ["地址", unit.location, true],
    ];
    if (unit.alias) facts.splice(1, 0, ["别名", unit.alias, false]);
    if (unit.remark) facts.push(["备注", unit.remark, true]);
    elements.dialogFacts.innerHTML = facts.map(([label, value, wide]) =>
      `<div class="dialog-fact${wide ? " wide" : ""}"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`
    ).join("");
    elements.dialogVisited.checked = record.visited;
    elements.dialogTime.value = record.time;
    elements.dialogNotes.value = record.notes;
    elements.dialogSource.href = unit.source;
    if (typeof elements.detailDialog.showModal === "function") elements.detailDialog.showModal();
  }

  function saveDetail() {
    if (!state.activeDetailId) return;
    updateRecord(state.activeDetailId, {
      visited: elements.dialogVisited.checked || Boolean(elements.dialogTime.value.trim()),
      time: elements.dialogTime.value,
      notes: elements.dialogNotes.value,
    });
    renderAll();
    showToast("记录已保存");
  }

  function download(filename, content, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function exportJson() {
    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      records,
    };
    download("国保足迹-个人记录.json", JSON.stringify(payload, null, 2), "application/json;charset=utf-8");
    showToast("个人记录备份已导出");
  }

  function csvCell(value) {
    const text = String(value ?? "");
    return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
  }

  function exportCsv() {
    const filtered = sortedFilteredUnits();
    const headers = ["编号", "名称", "别名", "批次", "公布年份", "省份", "类别", "年代", "地址", "项目类型", "并入备注", "是否去过", "到访时间", "个人备注"];
    const rows = filtered.map((unit) => {
      const record = recordFor(unit.id);
      return [
        unit.code, unit.name, unit.alias || "", unit.batch, unit.year, unit.province, unit.category, unit.period, unit.location,
        unit.kind === "unit" ? "独立国保" : "并入项目", unit.remark, record.visited ? "是" : "否", record.time, record.notes,
      ].map(csvCell).join(",");
    });
    download("国保足迹-当前筛选.csv", `\ufeff${headers.join(",")}\r\n${rows.join("\r\n")}`, "text/csv;charset=utf-8");
    showToast(`已导出 ${filtered.length} 项`);
  }

  async function importJson(file) {
    try {
      const payload = JSON.parse(await file.text());
      const imported = payload && typeof payload.records === "object" ? payload.records : payload;
      if (!imported || typeof imported !== "object" || Array.isArray(imported)) throw new Error("invalid");
      let count = 0;
      Object.entries(imported).forEach(([id, value]) => {
        if (!unitById.has(id) || !value || typeof value !== "object") return;
        records[id] = {
          visited: Boolean(value.visited),
          time: String(value.time || "").trim(),
          notes: String(value.notes || "").trim(),
        };
        count += 1;
      });
      saveRecords();
      renderAll();
      showToast(`已导入 ${count} 条记录`);
    } catch (error) {
      showToast("导入失败：文件格式不正确");
    } finally {
      elements.importFile.value = "";
    }
  }

  async function connectEditor() {
    if (readOnly || !/^https?:$/.test(window.location.protocol) || !["127.0.0.1", "localhost"].includes(window.location.hostname)) return;
    try {
      const response = await fetch("/api/records", { cache: "no-store" });
      if (!response.ok) return;
      const payload = await response.json();
      records = sanitizeRecords(payload.records || payload);
      localStorage.setItem(storageKey, JSON.stringify(records));
      editorConnected = true;
      elements.saveStatus.textContent = "已连接本地编辑服务";
      renderAll();
    } catch (error) {
      elements.saveStatus.textContent = "当前浏览器本地保存";
    }
  }

  function bindEvents() {
    elements.searchInput.addEventListener("input", () => {
      window.clearTimeout(searchTimer);
      searchTimer = window.setTimeout(() => {
        state.query = elements.searchInput.value.trim().toLocaleLowerCase("zh-CN");
        resetPageAndRender();
      }, 140);
    });

    elements.statusControl.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-status]");
      if (!button) return;
      state.status = button.dataset.status;
      syncStatusButtons();
      resetPageAndRender();
    });

    elements.groupControl.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-group]");
      if (!button) return;
      state.group = button.dataset.group;
      syncGroupButtons();
      resetPageAndRender();
    });

    elements.batchFilters.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-batch]");
      if (!button) return;
      const batch = Number(button.dataset.batch);
      if (state.batches.size === 8) {
        state.batches = new Set([batch]);
      } else if (state.batches.size === 1 && state.batches.has(batch)) {
        state.batches = new Set([1, 2, 3, 4, 5, 6, 7, 8]);
      } else if (state.batches.has(batch)) {
        state.batches.delete(batch);
      } else {
        state.batches.add(batch);
      }
      syncBatchButtons();
      resetPageAndRender();
    });

    elements.allBatchesButton.addEventListener("click", () => {
      state.batches = new Set([1, 2, 3, 4, 5, 6, 7, 8]);
      syncBatchButtons();
      resetPageAndRender();
    });

    elements.provinceFilter.addEventListener("change", () => {
      state.province = elements.provinceFilter.value;
      renderProvinceProgress();
      resetPageAndRender();
    });

    elements.categoryFilter.addEventListener("change", () => {
      state.category = elements.categoryFilter.value;
      resetPageAndRender();
    });

    elements.periodFilter.addEventListener("change", () => {
      state.period = elements.periodFilter.value;
      resetPageAndRender();
    });

    elements.mergedToggle.addEventListener("change", () => {
      state.includeMerged = elements.mergedToggle.checked;
      resetPageAndRender();
    });

    elements.timelineControl.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-granularity]");
      if (!button) return;
      state.timelineGranularity = button.dataset.granularity;
      elements.timelineControl.querySelectorAll("button").forEach((item) => {
        item.classList.toggle("active", item === button);
      });
      const independent = units.filter((unit) => unit.kind === "unit");
      renderTimeline(independent.filter((unit) => recordFor(unit.id).visited));
    });

    elements.resetFiltersButton.addEventListener("click", resetFilters);

    elements.provinceProgress.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-province]");
      if (!button) return;
      if (isStatisticsView) {
        window.location.href = `./index.html?province=${encodeURIComponent(button.dataset.province)}`;
        return;
      }
      state.province = state.province === button.dataset.province ? "all" : button.dataset.province;
      elements.provinceFilter.value = state.province;
      renderProvinceProgress();
      resetPageAndRender();
      document.querySelector(".result-toolbar").scrollIntoView({ behavior: "smooth", block: "start" });
    });

    elements.resultGroups.addEventListener("click", (event) => {
      const row = event.target.closest("tr[data-id]");
      if (!row) return;
      if (event.target.closest("[data-action='detail']")) openDetail(row.dataset.id);
    });

    elements.resultGroups.addEventListener("change", (event) => {
      const row = event.target.closest("tr[data-id]");
      if (!row) return;
      if (event.target.matches(".visit-checkbox")) {
        updateRecord(row.dataset.id, { visited: event.target.checked });
        renderAll();
      }
      if (event.target.matches(".visit-time-input")) {
        updateRecord(row.dataset.id, { time: event.target.value, visited: Boolean(event.target.value.trim()) || recordFor(row.dataset.id).visited });
        renderAll();
      }
    });

    elements.pagination.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-page]");
      if (!button || button.disabled) return;
      state.page = Number(button.dataset.page);
      renderResults();
      document.querySelector(".result-toolbar").scrollIntoView({ behavior: "smooth", block: "start" });
    });

    function stepPage(direction) {
      const pageCount = Math.max(1, Math.ceil(sortedFilteredUnits().length / state.pageSize));
      state.page = Math.min(pageCount, Math.max(1, state.page + direction));
      renderResults();
      document.querySelector(".result-toolbar").scrollIntoView({ behavior: "smooth", block: "start" });
    }

    elements.previousPageButton.addEventListener("click", () => stepPage(-1));
    elements.nextPageButton.addEventListener("click", () => stepPage(1));

    elements.pageSizeSelect.addEventListener("change", () => {
      state.pageSize = Number(elements.pageSizeSelect.value);
      resetPageAndRender();
    });

    function jumpToPage() {
      const pageCount = Math.max(1, Math.ceil(sortedFilteredUnits().length / state.pageSize));
      const requested = Number.parseInt(elements.pageJumpInput.value, 10);
      if (!Number.isFinite(requested)) return;
      state.page = Math.min(pageCount, Math.max(1, requested));
      renderResults();
      document.querySelector(".result-toolbar").scrollIntoView({ behavior: "smooth", block: "start" });
    }

    elements.pageJumpButton.addEventListener("click", jumpToPage);
    elements.pageJumpInput.addEventListener("keydown", (event) => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      jumpToPage();
    });

    elements.detailForm.addEventListener("submit", (event) => {
      if (event.submitter && event.submitter.value === "cancel") return;
      event.preventDefault();
      saveDetail();
      elements.detailDialog.close();
    });

    elements.importButton.addEventListener("click", () => {
      elements.dataMenu.open = false;
      elements.importFile.click();
    });
    elements.importFile.addEventListener("change", () => {
      if (elements.importFile.files[0]) importJson(elements.importFile.files[0]);
    });
    elements.exportJsonButton.addEventListener("click", () => {
      elements.dataMenu.open = false;
      exportJson();
    });
    elements.exportCsvButton.addEventListener("click", () => {
      elements.dataMenu.open = false;
      exportCsv();
    });

    document.addEventListener("click", (event) => {
      if (elements.dataMenu.open && !elements.dataMenu.contains(event.target)) elements.dataMenu.open = false;
    });

    elements.clearRecordsButton.addEventListener("click", () => {
      if (!window.confirm("确定清空全部个人到访记录吗？此操作只能通过此前导出的备份恢复。")) return;
      records = {};
      saveRecords();
      renderAll();
      showToast("个人记录已清空");
    });
  }

  initializeControls();
  bindEvents();
  renderAll();
  connectEditor();
})();
