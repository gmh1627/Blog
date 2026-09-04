(() => {
  "use strict";

  const units = Array.isArray(window.HERITAGE_UNITS) ? window.HERITAGE_UNITS : [];
  const divisions = window.HERITAGE_DIVISIONS && typeof window.HERITAGE_DIVISIONS === "object"
    ? window.HERITAGE_DIVISIONS
    : {};
  const unitById = new Map(units.map((unit) => [unit.id, unit]));
  const unitByRecordId = new Map(units.flatMap((unit) =>
    (unit.record_ids || [unit.id]).map((recordId) => [recordId, unit])
  ));
  const recordIdSet = new Set(units.flatMap((unit) => unit.record_ids || [unit.id]));
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
    "跨省级行政区",
  ];
  const periodOrder = [
    "史前", "夏商周", "秦汉", "魏晋南北朝", "隋唐五代", "宋辽金西夏",
    "元", "明", "清", "近代", "现代", "其他",
  ];
  const collator = new Intl.Collator("zh-CN", { numeric: true, sensitivity: "base" });
  const urlParams = new URLSearchParams(window.location.search);
  const isStatisticsView = urlParams.get("view") === "stats";
  const requestedBatch = Number(urlParams.get("batch"));
  const requestedVisitYear = Number(urlParams.get("visitYear"));
  const requestedVisitMonth = Number(urlParams.get("visitMonth"));
  const requestedStatus = urlParams.get("status");
  const requestedGroup = urlParams.get("group");

  function classifyPeriod(era, name = "") {
    if (["京杭大运河", "大运河"].includes(name)) return "隋唐五代";
    if (name === "长城") return "其他";
    if (["高昌故城", "雅尔湖故城"].includes(name)) return "魏晋南北朝";
    if (name === "林则徐销烟池与虎门炮台旧址") return "近代";
    const value = String(era || "").replaceAll(" ", "");
    if (!value || /不详|未载|未知/.test(value)) return "其他";
    if (/以前/.test(value)) return "其他";

    const groups = [
      ["史前", /旧石器|新石器|史前|更新世|古生代|远古/],
      ["夏商周", /先秦|(?<!西)夏|商|殷|西周|东周|(?<!北|后)周|春秋|战国|青铜时代/],
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

    const periodForYear = (year) => {
      if (year <= -2071) return "史前";
      if (year <= -222) return "夏商周";
      if (year <= 219) return "秦汉";
      if (year <= 580) return "魏晋南北朝";
      if (year <= 959) return "隋唐五代";
      if (year <= 1270) return "宋辽金西夏";
      if (year <= 1367) return "元";
      if (year <= 1643) return "明";
      if (year <= 1839) return "清";
      if (year <= 1948) return "近代";
      return "现代";
    };
    const chineseNumber = (text) => {
      if (!text) return null;
      const normalized = text.replaceAll("两", "二").replaceAll("〇", "零");
      if (/^\d+$/.test(normalized)) return Number(normalized);
      const digits = { 零: 0, 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 };
      if (normalized.includes("十")) {
        const [left, right] = normalized.split("十", 2);
        return (left ? digits[left] : 1) * 10 + (right ? digits[right] : 0);
      }
      if ([...normalized].every((char) => Object.hasOwn(digits, char))) {
        return Number([...normalized].map((char) => digits[char]).join(""));
      }
      return null;
    };
    const years = [...value.matchAll(/公元前(\d{1,4})年?/g)].map((match) => -Number(match[1]));
    const withoutBce = value.replaceAll(/公元前\d{1,4}年?/g, "");
    years.push(...[...withoutBce.matchAll(/(?<!\d)(\d{3,4})年?/g)].map((match) => Number(match[1])));
    for (const match of value.matchAll(/(公元前)?([零〇一二三四五六七八九十两\d]{1,4})世纪(?:([零〇一二三四五六七八九十两\d]{1,3})年代)?/g)) {
      const century = chineseNumber(match[2]);
      const decade = chineseNumber(match[3]);
      if (!century) continue;
      years.push(match[1] ? -(century * 100) : (century - 1) * 100 + (decade ?? 1));
    }
    if (years.length) return periodForYear(Math.min(...years));
    return "其他";
  }

  function formatLocation(unit) {
    if (unit.current_location) return unit.current_location;
    const parts = [unit.province, unit.city, unit.district].filter(Boolean);
    if (unit.province === unit.city) parts.splice(1, 1);
    if (unit.district === "不设县级行政区") parts.pop();
    return parts.join(" · ");
  }

  units.forEach((unit) => {
    unit.period = unit.period || classifyPeriod(unit.era, unit.name);
  });

  const state = {
    query: "",
    status: ["all", "visited", "unvisited"].includes(requestedStatus) ? requestedStatus : "visited",
    group: ["province", "batch", "period"].includes(requestedGroup) ? requestedGroup : "province",
    batches: requestedBatch >= 1 && requestedBatch <= 8
      ? new Set([requestedBatch])
      : new Set([1, 2, 3, 4, 5, 6, 7, 8]),
    province: provinceOrder.includes(urlParams.get("province"))
      ? urlParams.get("province")
      : "all",
    city: "all",
    district: "all",
    category: urlParams.get("category") || "all",
    period: urlParams.get("period") || "all",
    visitYear: requestedVisitYear >= 1900 && requestedVisitYear <= 2100 ? requestedVisitYear : null,
    visitMonth: requestedVisitMonth >= 1 && requestedVisitMonth <= 12 ? requestedVisitMonth : null,
    timelineYear: null,
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
    cityFilter: document.querySelector("#cityFilter"),
    districtFilter: document.querySelector("#districtFilter"),
    categoryFilter: document.querySelector("#categoryFilter"),
    periodFilter: document.querySelector("#periodFilter"),
    timelineTitle: document.querySelector("#timelineTitle"),
    timelineBackButton: document.querySelector("#timelineBackButton"),
    timelineChart: document.querySelector("#timelineChart"),
    batchChart: document.querySelector("#batchChart"),
    categoryChart: document.querySelector("#categoryChart"),
    periodChart: document.querySelector("#periodChart"),
    resetFiltersButton: document.querySelector("#resetFiltersButton"),
    provinceProgress: document.querySelector("#provinceProgress"),
    resultCount: document.querySelector("#resultCount"),
    pageSizeSelect: document.querySelector("#pageSizeSelect"),
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
    recentSavesButton: document.querySelector("#recentSavesButton"),
    recentSavesDialog: document.querySelector("#recentSavesDialog"),
    recentSavesList: document.querySelector("#recentSavesList"),
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
    blogHomeLink: document.querySelector("#blogHomeLink"),
    saveStatus: document.querySelector("#saveStatus"),
    saveDetailButton: document.querySelector("#saveDetailButton"),
    toast: document.querySelector("#toast"),
  };

  let records = loadRecords();
  let recentSaves = [];
  let editorConnected = false;
  let editorSaveQueue = Promise.resolve();
  let toastTimer = null;
  let searchTimer = null;

  function sanitizeRecords(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    const sanitized = {};
    Object.entries(value).forEach(([id, record]) => {
      if (!recordIdSet.has(id) || !record || typeof record !== "object") return;
      sanitized[id] = {
        visited: Boolean(record.visited),
        time: String(record.time || "").trim(),
        notes: String(record.notes || "").trim(),
      };
    });
    return sanitized;
  }

  function sanitizeHistory(value) {
    if (!Array.isArray(value)) return [];
    return value.flatMap((entry) => {
      if (!entry || typeof entry !== "object" || !recordIdSet.has(entry.id)) return [];
      if (!["added", "updated", "removed"].includes(entry.action)) return [];
      const record = sanitizeRecords({ [entry.id]: entry.record })[entry.id];
      if (!record) return [];
      return [{
        savedAt: String(entry.savedAt || ""),
        id: entry.id,
        action: entry.action,
        record,
      }];
    }).slice(0, 50);
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
    const payload = JSON.stringify({ version: 2, records });
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
        const result = await response.json();
        recentSaves = sanitizeHistory(result.history);
        elements.saveStatus.textContent = "已自动保存到博客数据";
      })
      .catch(() => {
        elements.saveStatus.textContent = "自动保存失败，请保留 JSON 备份";
      });
  }

  function recordFor(id) {
    const ids = unitById.get(id)?.record_ids || [id];
    const values = ids.map((recordId) => records[recordId]).filter(Boolean);
    if (!values.length) return { visited: false, time: "", notes: "" };
    const combined = (field, separator) => [...new Set(values.map((record) => record[field]).filter(Boolean))].join(separator);
    return {
      visited: values.some((record) => record.visited),
      time: combined("time", "、"),
      notes: combined("notes", "；"),
    };
  }

  function updateRecord(id, patch) {
    if (readOnly) return;
    const next = { ...recordFor(id), ...patch };
    next.visited = Boolean(next.visited);
    next.time = String(next.time || "").trim();
    next.notes = String(next.notes || "").trim();
    const recordIds = unitById.get(id)?.record_ids || [id];
    recordIds.filter((recordId) => recordId !== id).forEach((recordId) => delete records[recordId]);
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

  function renderRecentSaves() {
    if (!recentSaves.length) {
      elements.recentSavesList.innerHTML = '<div class="recent-saves-empty">尚无单项保存记录</div>';
      return;
    }
    // Autosave can produce several history entries for one place. Keep the
    // newest entry per place in this compact view while preserving full
    // history on the server for recovery and audit.
    const visibleSaves = [];
    const seenUnits = new Set();
    for (const entry of recentSaves) {
      const unit = unitByRecordId.get(entry.id);
      const key = unit?.id || entry.id;
      if (seenUnits.has(key)) continue;
      seenUnits.add(key);
      visibleSaves.push(entry);
    }
    const actionLabels = { added: "新增", updated: "修改", removed: "删除" };
    elements.recentSavesList.innerHTML = visibleSaves.map((entry) => {
      const unit = unitByRecordId.get(entry.id);
      const savedDate = new Date(entry.savedAt);
      const savedText = Number.isNaN(savedDate.getTime())
        ? entry.savedAt
        : savedDate.toLocaleString("zh-CN", { hour12: false });
      const visitText = entry.action === "removed"
        ? "记录已删除"
        : entry.record.time
          ? `到访 ${entry.record.time}`
          : entry.record.visited ? "已到访" : "未到访";
      return `<button class="recent-save-item" type="button" data-id="${escapeHtml(unit?.id || entry.id)}">
        <span class="recent-save-main"><strong>${escapeHtml(unit?.name || entry.id)}</strong><small>${actionLabels[entry.action]}</small></span>
        <span class="recent-save-meta"><time datetime="${escapeHtml(entry.savedAt)}">${escapeHtml(savedText)}</time><small>${escapeHtml(visitText)}</small></span>
      </button>`;
    }).join("");
  }

  function browseCity(unit) {
    if (["省直辖县级行政区", "自治区直辖县级行政区"].includes(unit.city)) return unit.district;
    return unit.city;
  }

  function updateCityFilter() {
    if (state.province === "all") {
      state.city = "all";
      elements.cityFilter.innerHTML = '<option value="all">请先选择省级行政区</option>';
      elements.cityFilter.disabled = true;
      updateDistrictFilter();
      return;
    }

    const catalog = divisions[state.province] || { cities: [], direct: [] };
    const cities = [...new Set([
      ...catalog.cities,
      ...catalog.direct,
      ...units
      .filter((unit) => unit.province === state.province && unit.city)
      .map(browseCity),
    ])]
      .sort((a, b) => {
        if (a === "跨地级行政区") return 1;
        if (b === "跨地级行政区") return -1;
        return collator.compare(a, b);
      });
    if (!cities.includes(state.city)) state.city = "all";
    elements.cityFilter.innerHTML = [
      '<option value="all">全部地级行政区</option>',
      ...cities.map((city) => `<option value="${escapeHtml(city)}">${escapeHtml(city)}</option>`),
    ].join("");
    elements.cityFilter.value = state.city;
    elements.cityFilter.disabled = false;
    updateDistrictFilter();
  }

  function updateDistrictFilter() {
    if (state.province === "all" || state.city === "all") {
      state.district = "all";
      elements.districtFilter.innerHTML = '<option value="all">请先选择地级行政区</option>';
      elements.districtFilter.disabled = true;
      return;
    }
    const direct = divisions[state.province]?.direct || [];
    if (direct.includes(state.city)) {
      state.district = "all";
      elements.districtFilter.innerHTML = '<option value="all">不设下级行政区</option>';
      elements.districtFilter.disabled = true;
      return;
    }
    const districts = [...new Set(units
      .filter((unit) => unit.province === state.province && browseCity(unit) === state.city && unit.district)
      .map((unit) => unit.district))]
      .sort((a, b) => {
        if (a === "跨县级行政区" || a === "不设县级行政区") return 1;
        if (b === "跨县级行政区" || b === "不设县级行政区") return -1;
        return collator.compare(a, b);
      });
    if (!districts.includes(state.district)) state.district = "all";
    elements.districtFilter.innerHTML = [
      '<option value="all">全部县级行政区</option>',
      ...districts.map((district) => `<option value="${escapeHtml(district)}">${escapeHtml(district)}</option>`),
    ].join("");
    elements.districtFilter.value = state.district;
    elements.districtFilter.disabled = false;
  }

  function initializeControls() {
    elements.recordsView.hidden = isStatisticsView;
    elements.statisticsView.hidden = !isStatisticsView;
    const currentViewLink = isStatisticsView ? elements.statisticsViewLink : elements.recordsViewLink;
    currentViewLink.classList.add("active");
    currentViewLink.setAttribute("aria-current", "page");
    document.body.classList.toggle("read-only", readOnly);
    elements.dataMenu.hidden = readOnly;
    elements.blogHomeLink.hidden = !readOnly;
    elements.clearRecordsButton.hidden = readOnly;
    elements.dialogVisited.disabled = readOnly;
    elements.dialogTime.readOnly = readOnly;
    elements.dialogNotes.readOnly = readOnly;
    elements.saveDetailButton.hidden = readOnly;
    elements.saveStatus.textContent = readOnly ? "" : "当前浏览器本地保存";

    elements.batchFilters.innerHTML = Array.from({ length: 8 }, (_, index) => {
      const batch = index + 1;
      return `<button type="button" class="batch-filter active" data-batch="${batch}" aria-pressed="true">${batch}</button>`;
    }).join("");

    const provinces = provinceOrder.filter((province) => units.some((unit) => unit.province === province));
    elements.provinceFilter.innerHTML = [
      '<option value="all">全部省级行政区</option>',
      ...provinces.map((province) => `<option value="${escapeHtml(province)}">${escapeHtml(province)}</option>`),
    ].join("");
    elements.provinceFilter.value = state.province;
    updateCityFilter();

    const categories = [...new Set(units.map((unit) => unit.category))]
      .sort((a, b) => collator.compare(a, b));
    if (!categories.includes(state.category)) state.category = "all";
    elements.categoryFilter.innerHTML = [
      '<option value="all">全部类别</option>',
      ...categories.map((category) => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`),
    ].join("");
    elements.categoryFilter.value = state.category;

    if (!periodOrder.includes(state.period)) state.period = "all";
    elements.periodFilter.innerHTML = [
      '<option value="all">全部年代</option>',
      ...periodOrder
        .filter((period) => units.some((unit) => unit.period === period))
        .map((period) => `<option value="${escapeHtml(period)}">${escapeHtml(period)}</option>`),
    ].join("");
    elements.periodFilter.value = state.period;
    syncStatusButtons();
    syncGroupButtons();
    syncBatchButtons();
  }

  function matchesFilters(unit) {
    if (!state.batches.has(unit.batch)) return false;
    if (state.province !== "all" && unit.province !== state.province) return false;
    if (state.city !== "all" && browseCity(unit) !== state.city) return false;
    if (state.district !== "all" && unit.district !== state.district) return false;
    if (state.category !== "all" && unit.category !== state.category) return false;
    if (state.period !== "all" && unit.period !== state.period) return false;
    const record = recordFor(unit.id);
    if (state.status === "visited" && !record.visited) return false;
    if (state.status === "unvisited" && record.visited) return false;
    if (state.visitYear) {
      const visitTime = parseVisitTime(record.time);
      if (!visitTime || visitTime.year !== state.visitYear) return false;
      if (state.visitMonth && visitTime.month !== state.visitMonth) return false;
    }
    if (state.query) {
      const haystack = `${unit.name} ${unit.alias || ""} ${unit.search_terms || ""} ${unit.code} ${unit.province || ""} ${unit.city || ""} ${unit.district || ""} ${unit.current_location || ""} ${unit.era} ${unit.period} ${unit.category} ${unit.remark}`.toLocaleLowerCase("zh-CN");
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
    if (officialSerial) return officialSerial;
    const mergeSerial = Number(String(unit.id).match(/(\d+)$/)?.[1] || 0);
    return 100000 + mergeSerial;
  }

  function renderStats() {
    const independent = units.filter((unit) => unit.kind === "unit");
    const visited = independent.filter((unit) => recordFor(unit.id).visited);
    const visitedProvinces = new Set(
      visited.map((unit) => unit.province).filter((province) => province !== "跨省级行政区"),
    );
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

  function recordsHref(filters = {}) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") params.set(key, String(value));
    });
    return `./index.html?${params.toString()}`;
  }

  function renderTimeline(visitedUnits) {
    const parsed = visitedUnits
      .map((unit) => parseVisitTime(recordFor(unit.id).time))
      .filter(Boolean);
    const monthly = Number.isInteger(state.timelineYear);
    const counts = new Map();

    if (monthly) {
      parsed
        .filter((time) => time.year === state.timelineYear && time.month)
        .forEach((time) => counts.set(time.month, (counts.get(time.month) || 0) + 1));
      elements.timelineTitle.textContent = `${state.timelineYear} 年各月到访`;
      elements.timelineBackButton.hidden = false;
    } else {
      parsed.forEach((time) => counts.set(time.year, (counts.get(time.year) || 0) + 1));
      elements.timelineTitle.textContent = "到访趋势";
      elements.timelineBackButton.hidden = true;
    }

    const points = [...counts.entries()].sort(([a], [b]) => a - b);
    if (!points.length) {
      const label = monthly ? `${state.timelineYear} 年尚无精确到月份的记录` : "尚无可统计的到访年份";
      elements.timelineChart.innerHTML = `<div class="chart-empty">${label}</div>`;
      elements.timelineChart.style.removeProperty("--point-count");
      elements.timelineChart.setAttribute("aria-label", label);
      return;
    }
    const maximum = Math.max(1, ...points.map(([, count]) => count));
    elements.timelineChart.style.setProperty("--point-count", points.length);
    elements.timelineChart.innerHTML = points.map(([value, count]) => {
      const height = count ? Math.max(5, Math.round(count / maximum * 150)) : 0;
      const label = monthly ? `${value}月` : String(value);
      const content = `<strong>${count}</strong><span class="timeline-bar" style="height:${height}px"></span><span>${label}</span>`;
      if (monthly) {
        const href = recordsHref({ status: "visited", visitYear: state.timelineYear, visitMonth: value });
        return `<a class="timeline-point" href="${escapeHtml(href)}" aria-label="查看 ${state.timelineYear} 年 ${value} 月到访的 ${count} 项">${content}</a>`;
      }
      return `<button class="timeline-point" type="button" data-year="${value}" aria-label="查看 ${value} 年各月统计">${content}</button>`;
    }).join("");
    elements.timelineChart.setAttribute(
      "aria-label",
      `${monthly ? `${state.timelineYear}年月度` : "年度"}到访趋势：${points.map(([value, count]) => `${value}${monthly ? "月" : "年"} ${count}处`).join("，")}`,
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
    elements.batchChart.innerHTML = rows.map((row) => `<a class="horizontal-row chart-row-link" href="${escapeHtml(recordsHref({ status: "visited", batch: row.batch, group: "batch" }))}" aria-label="查看第 ${row.batch} 批已到访的 ${row.visited} 项">
      <span class="horizontal-label">第 ${row.batch} 批</span>
      <div class="bar-track"><span class="bar-fill" style="width:${row.percent.toFixed(2)}%"></span></div>
      <strong>${row.visited}<small> / ${row.total}</small></strong>
    </a>`).join("");
    elements.batchChart.setAttribute(
      "aria-label",
      `各批完成度：${rows.map((row) => `第${row.batch}批 ${row.visited}/${row.total}`).join("，")}`,
    );
  }

  const chartColors = ["#8bc9b5", "#f0a08d", "#edc86f", "#8bbbd5", "#bca5d0", "#afc58a", "#e2b487", "#a7b8c2", "#80cbc7", "#e5a0b3", "#c8ce82", "#aaade0"];

  function renderDistributionChart(element, rows, filterKey, label) {
    if (!rows.length) {
      element.innerHTML = '<div class="chart-empty compact-empty">尚无已到访项目</div>';
      element.setAttribute("aria-label", "尚无已到访项目");
      return;
    }
    const total = rows.reduce((sum, [, count]) => sum + count, 0);
    const destinations = rows.map(([name, count]) => ({
      percent: count / total * 100,
      href: recordsHref({ status: "visited", [filterKey]: name, group: filterKey === "period" ? "period" : "province" }),
    }));
    let offset = 0;
    const segments = rows.map(([name, count], index) => {
      const percent = count / total * 100;
      const segment = `<circle cx="50" cy="50" r="34" pathLength="100" fill="none" stroke="${chartColors[index % chartColors.length]}" stroke-width="22" stroke-dasharray="${percent} ${100 - percent}" stroke-dashoffset="${-offset}"></circle>`;
      offset += percent;
      return segment;
    }).join("");
    const legend = rows.map(([name, count], index) => {
      const href = recordsHref({ status: "visited", [filterKey]: name, group: filterKey === "period" ? "period" : "province" });
      return `<a class="distribution-legend-item" href="${escapeHtml(href)}">
        <span class="distribution-swatch" style="background:${chartColors[index % chartColors.length]}"></span>
        <span title="${escapeHtml(name)}">${escapeHtml(name)}</span><strong>${count}</strong>
      </a>`;
    }).join("");
    element.innerHTML = `<div class="distribution-figure">
      <svg class="donut-chart" viewBox="0 0 100 100" aria-hidden="true" data-segments="${escapeHtml(encodeURIComponent(JSON.stringify(destinations)))}">
        <g transform="rotate(-90 50 50)">${segments}</g>
        <text x="50" y="48" text-anchor="middle">${total}</text>
        <text class="donut-caption" x="50" y="59" text-anchor="middle">已到访</text>
      </svg>
      <div class="distribution-legend">${legend}</div>
    </div>`;
    element.setAttribute("aria-label", `${label}：${rows.map(([name, count]) => `${name} ${count}处`).join("，")}`);
  }

  function renderCalloutPie(element, rows, filterKey, label) {
    if (!rows.length) {
      element.innerHTML = '<div class="chart-empty compact-empty">尚无已到访项目</div>';
      element.setAttribute("aria-label", "尚无已到访项目");
      return;
    }

    const total = rows.reduce((sum, [, count]) => sum + count, 0);
    const centerX = 260;
    const centerY = 100;
    const outerRadius = 60;
    const elbowRadius = 74;
    const rotationDegrees = 29;
    const rotationRadians = rotationDegrees / 180 * Math.PI;
    let offset = 0;
    const items = rows.map(([name, count], index) => {
      const percent = count / total * 100;
      const middleAngle = (offset + percent / 2) / 100 * Math.PI * 2 - Math.PI / 2 + rotationRadians;
      const side = Math.cos(middleAngle) >= 0 ? "right" : "left";
      const item = {
        name,
        count,
        index,
        percent,
        offset,
        side,
        edgeX: centerX + Math.cos(middleAngle) * outerRadius,
        edgeY: centerY + Math.sin(middleAngle) * outerRadius,
        elbowX: centerX + Math.cos(middleAngle) * elbowRadius,
        rawY: centerY + Math.sin(middleAngle) * elbowRadius,
        href: recordsHref({ status: "visited", [filterKey]: name, group: "province" }),
      };
      offset += percent;
      return item;
    });

    ["left", "right"].forEach((side) => {
      const sideItems = items.filter((item) => item.side === side).sort((a, b) => a.rawY - b.rawY);
      const minimumY = 18;
      const maximumY = 182;
      const gap = 27;
      sideItems.forEach((item, index) => {
        item.labelY = Math.max(item.rawY, index ? sideItems[index - 1].labelY + gap : minimumY);
      });
      const overflow = sideItems.length ? sideItems[sideItems.length - 1].labelY - maximumY : 0;
      if (overflow > 0) sideItems.forEach((item) => { item.labelY -= overflow; });
      if (sideItems.length && sideItems[0].labelY < minimumY) {
        const shift = minimumY - sideItems[0].labelY;
        sideItems.forEach((item) => { item.labelY += shift; });
      }
    });

    const segments = items.map((item) => `<a class="callout-segment" href="${escapeHtml(item.href)}" aria-label="查看${escapeHtml(item.name)}已到访的 ${item.count} 项">
      <circle cx="${centerX}" cy="${centerY}" r="30" pathLength="100" fill="none" stroke="${chartColors[item.index % chartColors.length]}" stroke-width="60" stroke-dasharray="${item.percent} ${100 - item.percent}" stroke-dashoffset="${-item.offset}"></circle>
    </a>`).join("");
    const callouts = items.map((item) => {
      const lineEndX = item.side === "right" ? 348 : 172;
      const textX = item.side === "right" ? 354 : 166;
      const anchor = item.side === "right" ? "start" : "end";
      return `<a class="pie-callout" href="${escapeHtml(item.href)}">
        <polyline points="${item.edgeX.toFixed(1)},${item.edgeY.toFixed(1)} ${item.elbowX.toFixed(1)},${item.labelY.toFixed(1)} ${lineEndX},${item.labelY.toFixed(1)}" stroke="${chartColors[item.index % chartColors.length]}"></polyline>
        <text x="${textX}" y="${(item.labelY + 3).toFixed(1)}" text-anchor="${anchor}"><tspan>${escapeHtml(item.name)}</tspan><tspan class="callout-count"> ${item.count}</tspan></text>
      </a>`;
    }).join("");

    element.innerHTML = `<svg class="category-callout-chart" viewBox="0 0 520 200" role="img" aria-label="${escapeHtml(label)}">
      <g transform="rotate(${-90 + rotationDegrees} ${centerX} ${centerY})">${segments}</g>
      ${callouts}
    </svg>`;
    element.setAttribute("aria-label", `${label}：${rows.map(([name, count]) => `${name} ${count}处`).join("，")}`);
  }

  function renderCategoryChart(visitedUnits) {
    const counts = new Map();
    visitedUnits.forEach((unit) => counts.set(unit.category, (counts.get(unit.category) || 0) + 1));
    const rows = [...counts.entries()].sort((a, b) => b[1] - a[1] || collator.compare(a[0], b[0]));
    renderCalloutPie(elements.categoryChart, rows, "category", "类别分布");
  }

  function renderPeriodChart(visitedUnits) {
    const counts = new Map();
    visitedUnits.forEach((unit) => counts.set(unit.period, (counts.get(unit.period) || 0) + 1));
    const rows = [...counts.entries()].sort((a, b) => periodOrder.indexOf(a[0]) - periodOrder.indexOf(b[0]));
    renderDistributionChart(elements.periodChart, rows, "period", "年代分布");
  }

  function renderAnalytics() {
    const independent = units.filter((unit) => unit.kind === "unit");
    const visited = independent.filter((unit) => recordFor(unit.id).visited);
    renderTimeline(visited);
    renderBatchChart(independent);
    renderCategoryChart(visited);
    renderPeriodChart(visited);
  }

  function renderProvinceProgress() {
    const independent = units.filter((unit) => unit.kind === "unit");
    elements.provinceProgress.innerHTML = provinceOrder
      .filter((province) => independent.some((unit) => unit.province === province))
      .map((province) => {
        const provinceUnits = independent.filter((unit) => unit.province === province);
        const visited = provinceUnits.filter((unit) => recordFor(unit.id).visited).length;
        const active = state.province === province ? " active" : "";
        const visitedClass = visited ? " has-visits" : "";
        return `<button class="province-progress-button${active}${visitedClass}" type="button" data-province="${escapeHtml(province)}">
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
    const alias = unit.alias ? `<span class="unit-alias">（${escapeHtml(unit.alias)}）</span>` : "";
    const noteClass = record.notes ? " has-note" : " empty";
    const noteText = record.notes || "—";
    const noteTitle = record.notes ? ` title="${escapeHtml(record.notes)}"` : "";
    const disabled = readOnly ? " disabled" : "";
    const readonly = readOnly ? " readonly" : "";
    return `<tr class="${visitedClass.trim()}" data-id="${escapeHtml(unit.id)}">
      <td class="col-check"><input class="visit-checkbox" type="checkbox" aria-label="标记到访：${escapeHtml(unit.name)}"${checked}${disabled}></td>
      <td class="col-name">
        <button class="unit-name-button" type="button" data-action="detail">${escapeHtml(unit.name)}${alias}</button>
      </td>
      <td class="col-batch"><span class="batch-badge">${unit.batch}</span></td>
      <td class="col-category"><span class="category-label">${escapeHtml(unit.category)}</span><span class="period-label">${escapeHtml(unit.era || unit.period)}</span></td>
      <td class="col-location">
        <span class="location-current">${escapeHtml(formatLocation(unit))}</span>
      </td>
      <td class="col-time"><input class="visit-time-input" type="text" value="${escapeHtml(record.time)}" aria-label="到访时间：${escapeHtml(unit.name)}" placeholder="年 / 月 / 日"${readonly}></td>
      <td class="col-actions"><button class="note-button${noteClass}" type="button" data-action="detail"${noteTitle}>${escapeHtml(noteText)}</button></td>
    </tr>`;
  }

  function renderGroup(label, groupUnits) {
    return `<section class="result-group">
      <h2 class="group-heading"><span>${escapeHtml(label)}</span></h2>
      <div class="table-wrap">
        <table class="heritage-table">
          <thead><tr>
            <th class="col-check">到访</th><th class="col-name">名称</th><th class="col-batch">批次</th>
            <th class="col-category">类别 / 年代</th><th class="col-location">行政区划</th><th class="col-time">到访时间</th><th class="col-actions">备注</th>
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
    parts.push(`<label class="page-jump">前往 <input class="page-jump-input" type="number" min="1" max="${pageCount}" step="1" value="${state.page}" inputmode="numeric" aria-label="跳转页码"> 页</label>`);
    parts.push('<button class="page-jump-button" type="button" data-action="jump-page">跳转</button>');
    elements.pagination.innerHTML = parts.join("");
  }

  function renderResults() {
    const filtered = sortedFilteredUnits();
    const pageCount = Math.max(1, Math.ceil(filtered.length / state.pageSize));
    state.page = Math.min(state.page, pageCount);
    const start = (state.page - 1) * state.pageSize;
    const pageUnits = filtered.slice(start, start + state.pageSize);
    const end = Math.min(start + state.pageSize, filtered.length);
    const visitTimeLabel = state.visitYear
      ? ` · 到访时间 ${state.visitYear}${state.visitMonth ? `-${String(state.visitMonth).padStart(2, "0")}` : ""}`
      : "";
    elements.resultCount.textContent = filtered.length
      ? `符合条件 ${formatNumber(filtered.length)} 项，当前 ${formatNumber(start + 1)}-${formatNumber(end)}${visitTimeLabel}`
      : `没有符合条件的项目${visitTimeLabel}`;
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
    state.status = "visited";
    state.group = "province";
    state.batches = new Set([1, 2, 3, 4, 5, 6, 7, 8]);
    state.province = "all";
    state.city = "all";
    state.district = "all";
    state.category = "all";
    state.period = "all";
    state.visitYear = null;
    state.visitMonth = null;
    state.page = 1;
    elements.searchInput.value = "";
    elements.provinceFilter.value = "all";
    updateCityFilter();
    elements.categoryFilter.value = "all";
    elements.periodFilter.value = "all";
    syncStatusButtons();
    syncGroupButtons();
    syncBatchButtons();
    renderProvinceProgress();
    renderResults();
  }

  function openDetail(id, options = {}) {
    const unit = unitById.get(id);
    if (!unit) return;
    const record = recordFor(id);
    state.activeDetailId = id;
    elements.dialogMeta.textContent = `${unit.code ? `${unit.code} · ` : ""}第 ${unit.batch} 批 · ${unit.year}`;
    elements.dialogTitle.textContent = unit.name;
    const facts = [
      ["类别", unit.category, false],
      ["年代", unit.period, false],
      ["行政区划", formatLocation(unit), true],
    ];
    if (unit.alias) facts.splice(1, 0, ["别名", unit.alias, false]);
    if (unit.remark) facts.push(["备注", unit.remark, true]);
    const factHtml = facts.map(([label, value, wide]) =>
      `<div class="dialog-fact${wide ? " wide" : ""}"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`
    ).join("");
    const encyclopediaLinks = window.HERITAGE_ENCYCLOPEDIA_LINKS?.[unit.id] || {};
    const preferredEncyclopedia = encyclopediaLinks.baidu || encyclopediaLinks.wikipedia;
    const encyclopediaLabel = encyclopediaLinks.baidu ? "百度百科" : "维基百科";
    const linkHtml = preferredEncyclopedia
      ? `<a class="encyclopedia-link primary" href="${escapeHtml(preferredEncyclopedia.url)}" target="_blank" rel="noreferrer">${encyclopediaLabel}：${escapeHtml(preferredEncyclopedia.title)}</a>`
      : "";
    const encyclopediaHtml = linkHtml ? `
      <div class="dialog-fact wide encyclopedia-fact">
        <span>简介</span>
        <strong>${linkHtml}</strong>
      </div>` : "";
    elements.dialogFacts.innerHTML = `${factHtml}${encyclopediaHtml}`;
    elements.dialogVisited.checked = options.visited ?? record.visited;
    elements.dialogTime.value = record.time;
    elements.dialogNotes.value = record.notes;
    if (typeof elements.detailDialog.showModal === "function") elements.detailDialog.showModal();
    if (options.focusTime) elements.dialogTime.focus();
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
    const headers = ["编号", "名称", "别名", "批次", "公布年份", "现行省级", "现行地级", "现行县级", "现行区划展示", "类别", "年代", "是否去过", "到访时间", "个人备注"];
    const rows = filtered.map((unit) => {
      const record = recordFor(unit.id);
      return [
        unit.code, unit.name, unit.alias || "", unit.batch, unit.year, unit.province, unit.city || "", unit.district || "", unit.current_location || "", unit.category, unit.period,
        record.visited ? "是" : "否", record.time, record.notes,
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
        if (!recordIdSet.has(id) || !value || typeof value !== "object") return;
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
      recentSaves = sanitizeHistory(payload.history);
      localStorage.setItem(storageKey, JSON.stringify(records));
      editorConnected = true;
      elements.saveStatus.textContent = "";
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
      state.city = "all";
      state.district = "all";
      updateCityFilter();
      renderProvinceProgress();
      resetPageAndRender();
    });

    elements.cityFilter.addEventListener("change", () => {
      state.city = elements.cityFilter.value;
      state.district = "all";
      updateDistrictFilter();
      resetPageAndRender();
    });

    elements.districtFilter.addEventListener("change", () => {
      state.district = elements.districtFilter.value;
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

    elements.timelineChart.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-year]");
      if (!button) return;
      state.timelineYear = Number(button.dataset.year);
      const independent = units.filter((unit) => unit.kind === "unit");
      renderTimeline(independent.filter((unit) => recordFor(unit.id).visited));
    });

    elements.timelineBackButton.addEventListener("click", () => {
      state.timelineYear = null;
      const independent = units.filter((unit) => unit.kind === "unit");
      renderTimeline(independent.filter((unit) => recordFor(unit.id).visited));
    });

    [elements.categoryChart, elements.periodChart].forEach((chart) => {
      chart.addEventListener("click", (event) => {
        const svg = event.target.closest("svg[data-segments]");
        if (!svg) return;
        const bounds = svg.getBoundingClientRect();
        const x = (event.clientX - bounds.left) / bounds.width * 100 - 50;
        const y = (event.clientY - bounds.top) / bounds.height * 100 - 50;
        const radius = Math.hypot(x, y);
        if (radius < 23 || radius > 50) return;
        const position = ((Math.atan2(y, x) * 180 / Math.PI + 450) % 360) / 3.6;
        const segments = JSON.parse(decodeURIComponent(svg.dataset.segments));
        let end = 0;
        const segment = segments.find((item) => {
          end += item.percent;
          return position <= end;
        });
        if (segment) window.location.href = segment.href;
      });
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
      state.city = "all";
      state.district = "all";
      elements.provinceFilter.value = state.province;
      updateCityFilter();
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
        if (state.status === "unvisited" && event.target.checked && !readOnly) {
          event.target.checked = false;
          openDetail(row.dataset.id, { visited: true, focusTime: true });
          return;
        }
        updateRecord(row.dataset.id, { visited: event.target.checked });
        renderAll();
      }
      if (event.target.matches(".visit-time-input")) {
        updateRecord(row.dataset.id, { time: event.target.value, visited: Boolean(event.target.value.trim()) || recordFor(row.dataset.id).visited });
        renderAll();
      }
    });

    elements.resultGroups.addEventListener("input", (event) => {
      const row = event.target.closest("tr[data-id]");
      if (!row || !event.target.matches(".visit-time-input")) return;
      updateRecord(row.dataset.id, {
        time: event.target.value,
        visited: Boolean(event.target.value.trim()) || recordFor(row.dataset.id).visited,
      });
    });

    elements.pagination.addEventListener("click", (event) => {
      const jumpButton = event.target.closest('button[data-action="jump-page"]');
      if (jumpButton) {
        jumpToPage();
        return;
      }
      const button = event.target.closest("button[data-page]");
      if (!button || button.disabled) return;
      state.page = Number(button.dataset.page);
      renderResults();
      document.querySelector(".result-toolbar").scrollIntoView({ behavior: "smooth", block: "start" });
    });

    elements.pageSizeSelect.addEventListener("change", () => {
      state.pageSize = Number(elements.pageSizeSelect.value);
      resetPageAndRender();
    });

    function jumpToPage() {
      const pageCount = Math.max(1, Math.ceil(sortedFilteredUnits().length / state.pageSize));
      const input = elements.pagination.querySelector(".page-jump-input");
      if (!input) return;
      const requested = Number.parseInt(input.value, 10);
      if (!Number.isFinite(requested)) return;
      state.page = Math.min(pageCount, Math.max(1, requested));
      renderResults();
      document.querySelector(".result-toolbar").scrollIntoView({ behavior: "smooth", block: "start" });
    }

    elements.pagination.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" || !event.target.matches(".page-jump-input")) return;
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
    elements.recentSavesButton.addEventListener("click", () => {
      elements.dataMenu.open = false;
      renderRecentSaves();
      if (typeof elements.recentSavesDialog.showModal === "function") elements.recentSavesDialog.showModal();
    });
    elements.recentSavesList.addEventListener("click", (event) => {
      const item = event.target.closest(".recent-save-item[data-id]");
      if (!item) return;
      elements.recentSavesDialog.close();
      openDetail(item.dataset.id);
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

    window.addEventListener("pagehide", () => {
      if (readOnly || !editorConnected) return;
      if (state.activeDetailId && elements.detailDialog.open) {
        records[state.activeDetailId] = {
          visited: elements.dialogVisited.checked || Boolean(elements.dialogTime.value.trim()),
          time: elements.dialogTime.value.trim(),
          notes: elements.dialogNotes.value.trim(),
        };
        localStorage.setItem(storageKey, JSON.stringify(records));
      }
      const payload = JSON.stringify({ version: 2, records });
      navigator.sendBeacon("/api/records", new Blob([payload], { type: "application/json" }));
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
