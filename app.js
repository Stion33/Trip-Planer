const state = {
  data: null,
  view: "exams",
  query: "",
  filters: [],
  editMode: false,
  progressEditMode: false,
  progressSort: {
    field: "course",
    direction: "asc",
  },
  seriesVisible: {
    passed: true,
    owed: true,
    average: true,
  },
};

const STORAGE_KEY = "mpd-course-tracker-v2";
const UNIVERSIS_SETTINGS_KEY = "mpd-universis-sync-v1";

const filterDefs = {
  semester: { label: "Εξάμηνο", key: "Εξάμηνο" },
  period: { label: "Περίοδος", key: "Περίοδος" },
  status: { label: "Κατάσταση", key: "Κατάσταση" },
  group: { label: "Ομάδα", key: "Ομάδα" },
};

const els = {
  examCount: document.querySelector("#examCount"),
  passedCount: document.querySelector("#passedCount"),
  owedCount: document.querySelector("#owedCount"),
  averageGrade: document.querySelector("#averageGrade"),
  searchInput: document.querySelector("#searchInput"),
  filterField: document.querySelector("#filterField"),
  filterValue: document.querySelector("#filterValue"),
  addFilter: document.querySelector("#addFilter"),
  activeFilters: document.querySelector("#activeFilters"),
  mobileMenuToggle: document.querySelector("#mobileMenuToggle"),
  mobileNav: document.querySelector("#mobileNav"),
  courseForm: document.querySelector("#courseForm"),
  editModeToggle: document.querySelector("#editModeToggle"),
  progressEditToggle: document.querySelector("#progressEditToggle"),
  universisForm: document.querySelector("#universisForm"),
  universisUrl: document.querySelector("#universisUrl"),
  universisToken: document.querySelector("#universisToken"),
  universisStatus: document.querySelector("#universisStatus"),
  rememberUniversisToken: document.querySelector("#rememberUniversisToken"),
  autoUniversisSync: document.querySelector("#autoUniversisSync"),
  phoneNotifications: document.querySelector("#phoneNotifications"),
  notificationTopic: document.querySelector("#notificationTopic"),
  progressSortField: document.querySelector("#progressSortField"),
  progressSortDirection: document.querySelector("#progressSortDirection"),
  rewardToast: document.querySelector("#rewardToast"),
  passModal: document.querySelector("#passModal"),
  passForm: document.querySelector("#passForm"),
  passCourseName: document.querySelector("#passCourseName"),
  passGradeInput: document.querySelector("#passGradeInput"),
  passDateInput: document.querySelector("#passDateInput"),
  chartModal: document.querySelector("#chartModal"),
  chartModalContent: document.querySelector("#chartModalContent"),
  seriesToggles: document.querySelectorAll("[data-series-toggle]"),
  viewButtons: document.querySelectorAll("[data-view]"),
  panels: {
    exams: document.querySelector("#examsPanel"),
    progress: document.querySelector("#progressPanel"),
    electives: document.querySelector("#electivesPanel"),
    charts: document.querySelector("#chartsPanel"),
  },
  examList: document.querySelector("#examList"),
  progressList: document.querySelector("#progressList"),
  electiveGrid: document.querySelector("#electiveGrid"),
  timelineChart: document.querySelector("#timelineChart"),
  owedChart: document.querySelector("#owedChart"),
  gradeChart: document.querySelector("#gradeChart"),
  examMeta: document.querySelector("#examMeta"),
  progressMeta: document.querySelector("#progressMeta"),
  electiveMeta: document.querySelector("#electiveMeta"),
  timelineMeta: document.querySelector("#timelineMeta"),
  owedMeta: document.querySelector("#owedMeta"),
  gradeMeta: document.querySelector("#gradeMeta"),
};

const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const prepareData = (data) => {
  const copy = JSON.parse(JSON.stringify(data));
  copy.examCourses = copy.examCourses.map((item) => ({ ...item, id: item.id || uid() }));
  copy.progress = copy.progress.map((item) => ({ ...item, id: item.id || uid() }));
  copy.electives = copy.electives.map((item) => ({ ...item, id: item.id || uid() }));
  return copy;
};

const saveData = () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.data));
};

const loadUniversisSettings = () => {
  const settings = JSON.parse(localStorage.getItem(UNIVERSIS_SETTINGS_KEY) || "{}");
  if (settings.url) els.universisUrl.value = settings.url;
  if (settings.rememberToken && settings.token) els.universisToken.value = settings.token;
  if (settings.notificationTopic) els.notificationTopic.value = settings.notificationTopic;
  els.rememberUniversisToken.checked = Boolean(settings.rememberToken);
  els.autoUniversisSync.checked = Boolean(settings.autoSync);
  els.phoneNotifications.checked = Boolean(settings.phoneNotifications);
  return settings;
};

const saveUniversisSettings = () => {
  localStorage.setItem(
    UNIVERSIS_SETTINGS_KEY,
    JSON.stringify({
      url: els.universisUrl.value.trim(),
      rememberToken: els.rememberUniversisToken.checked,
      autoSync: els.autoUniversisSync.checked,
      phoneNotifications: els.phoneNotifications.checked,
      notificationTopic: els.notificationTopic.value.trim(),
      token: els.rememberUniversisToken.checked ? els.universisToken.value.trim() : "",
    }),
  );
};

const celebrate = (courseName) => {
  els.rewardToast.innerHTML = `
    <div class="reward-card">
      <strong>Μπράβο!</strong>
      <span>${courseName} περάστηκε.</span>
    </div>
  `;
  els.rewardToast.classList.add("show");
  window.setTimeout(() => els.rewardToast.classList.remove("show"), 2600);
};

const notifyPhone = async (courseName) => {
  if (!els.phoneNotifications.checked || !els.notificationTopic.value.trim()) return;
  saveUniversisSettings();
  try {
    await fetch("/api/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        topic: els.notificationTopic.value.trim(),
        title: "Περάστηκε μάθημα",
        message: `${courseName} περάστηκε.`,
      }),
    });
  } catch {
    els.universisStatus.textContent = "Δεν στάλθηκε ειδοποίηση στο κινητό.";
  }
};

const celebratePassed = (courseName) => {
  celebrate(courseName);
  notifyPhone(courseName);
};

const normalize = (value) =>
  String(value ?? "")
    .toLocaleLowerCase("el-GR")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");

const courseKey = (value) =>
  normalize(value)
    .replace(/[^\p{Letter}\p{Number}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

const courseAliases = new Map(
  [
    ["Διαφορικός Ι", "ΔΙΑΦΟΡΙΚΟΣ ΚΑΙ ΟΛΟΚΛΗΡΩΤΙΚΟΣ ΛΟΓΙΣΜΟΣ Ι"],
    ["Διαφορικός ΙΙ", "ΔΙΑΦΟΡΙΚΟΣ ΚΑΙ ΟΛΟΚΛΗΡΩΤΙΚΟΣ ΛΟΓΙΣΜΟΣ ΙΙ"],
    ["Συνήθεις Διαφορικές", "ΣΥΝΗΘΕΙΣ ΔΙΑΦΟΡΙΚΕΣ ΕΞΙΣΩΣΕΙΣ"],
    ["CAM", "ΔΙΚΤΥΑ ΠΑΡΑΓΩΓΗΣ (CAM)"],
  ].map(([shortName, fullName]) => [courseKey(shortName), courseKey(fullName)]),
);

const formatDate = (value, compact = false) => {
  if (!value) return "-";
  return new Intl.DateTimeFormat("el-GR", {
    day: "2-digit",
    month: compact ? "2-digit" : "short",
    year: compact ? undefined : "numeric",
  }).format(new Date(`${value}T00:00:00`));
};

const examPeriodFromDate = (value) => {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const periodMonth = month <= 3 ? "01" : month <= 7 ? "06" : "09";
  return `${year}-${periodMonth}-01`;
};

const formatExamPeriod = (value) => {
  const period = examPeriodFromDate(value) || value;
  const [year, month] = String(period).split("-");
  const names = { "01": "Ιανουαρίου", "06": "Ιουνίου", "09": "Σεπτεμβρίου" };
  return names[month] && year ? `${names[month]} ${year}` : formatDate(value);
};

const formatExamPeriodShort = (value) => {
  const period = examPeriodFromDate(value) || value;
  const [year, month] = String(period).split("-");
  const names = { "01": "Ιαν", "06": "Ιουν", "09": "Σεπ" };
  return names[month] && year ? `${names[month]} ${year}` : formatDate(value, true);
};

const statusOf = (item) => (item["Περασμένο"] ? "Περασμένο" : "Χρωστούμενο");
const withStatus = (item) => ({ ...item, Κατάσταση: statusOf(item) });
const findProgressByCourse = (courseName) => {
  const key = courseKey(courseName);
  const aliasKey = courseAliases.get(key);
  return state.data.progress.find((item) => {
    const progressKey = courseKey(item["Μάθημα"]);
    return progressKey === key || progressKey === aliasKey || (key.length > 3 && progressKey.includes(key));
  });
};

const progressForCourse = (courseName, semester = "") => {
  let progress = findProgressByCourse(courseName);
  if (progress) return progress;
  progress = {
    id: uid(),
    Μάθημα: courseName,
    Έτος: "",
    Εξάμηνο: semester,
    "Ημερομηνία Επιτυχίας": null,
    Βαθμός: null,
    Περασμένο: false,
    Χρωστούμενο: true,
  };
  state.data.progress.push(progress);
  return progress;
};

const progressForExamCourse = (courseName) => {
  const course = state.data.examCourses.find((item) => item["Μαθήματα"] === courseName);
  return progressForCourse(courseName, course?.["Εξάμηνο"] ?? "");
};

const valueFromPath = (item, path) =>
  path.split(".").reduce((value, key) => (value && typeof value === "object" ? value[key] : undefined), item);

const firstValue = (item, paths) => {
  for (const path of paths) {
    const value = valueFromPath(item, path);
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return null;
};

const numberFromGrade = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(String(value).replace(",", ".").match(/\d+(\.\d+)?/)?.[0]);
  if (!Number.isFinite(number)) return null;
  return number > 0 && number <= 1 ? Number((number * 10).toFixed(2)) : number;
};

const dateFromValue = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (!Number.isNaN(date.getTime())) return date.toISOString().slice(0, 10);
  const match = String(value).match(/(\d{4}-\d{2}-\d{2})|(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (!match) return null;
  if (match[1]) return match[1];
  return `${match[4]}-${String(match[3]).padStart(2, "0")}-${String(match[2]).padStart(2, "0")}`;
};

const rowsFromUniversis = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.value)) return payload.value;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.grades)) return payload.grades;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
};

const applyUniversisRows = (rows) => {
  let updated = 0;
  const newlyPassed = [];
  rows.forEach((row) => {
    const courseName = firstValue(row, ["course.name", "course.title", "course.displayName", "module.name", "module.title", "name", "title", "courseName", "courseTitle"]);
    const grade = numberFromGrade(firstValue(row, ["formattedGrade", "grade", "grade1", "examGrade", "result", "score", "value", "finalGrade"]));
    if (!courseName || grade === null) return;
    const date = dateFromValue(firstValue(row, ["date", "examDate", "gradeDate", "modifiedAt", "dateModified", "examPeriod.date", "courseExam.date", "courseExam.examDate"]));
    const semester = firstValue(row, ["course.semester.name", "course.semester.alternateName", "course.semester", "semester.name", "semester.alternateName", "semester", "term"]) || "";
    const progress = progressForCourse(String(courseName), String(semester));
    const wasPassed = Boolean(progress["Περασμένο"]);
    progress["Βαθμός"] = grade;
    progress["Περασμένο"] = Boolean(row.isPassed) || grade >= 5;
    progress["Χρωστούμενο"] = !progress["Περασμένο"];
    progress["Ημερομηνία Επιτυχίας"] = progress["Περασμένο"] ? date || progress["Ημερομηνία Επιτυχίας"] : null;
    if (progress["Περασμένο"] && !wasPassed) newlyPassed.push(progress["Μάθημα"]);
    updated += 1;
  });
  return { updated, newlyPassed };
};

const fetchUniversisPayload = async (url, token) => {
  const canUseLocalProxy = window.location.protocol.startsWith("http") && ["localhost", "127.0.0.1"].includes(window.location.hostname);
  const response = canUseLocalProxy
    ? await fetch("/api/universis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, token }),
      })
    : await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
  const text = await response.text();
  let payload = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = null;
  }
  if (!response.ok) {
    const message = payload?.message || payload?.error || text.slice(0, 180) || response.statusText;
    throw new Error(`HTTP ${response.status}: ${message}`);
  }
  return payload;
};

const syncUniversis = async (silent = false) => {
  const url = els.universisUrl.value.trim();
  const token = els.universisToken.value.trim();
  if (!url) return;
  saveUniversisSettings();
  if (!silent) els.universisStatus.textContent = "Γίνεται συγχρονισμός...";
  try {
    const payload = await fetchUniversisPayload(url, token);
    const { updated, newlyPassed } = applyUniversisRows(rowsFromUniversis(payload));
    saveData();
    els.universisStatus.textContent = updated
      ? `Ενημερώθηκαν ${updated} μαθήματα από Universis.`
      : "Δεν βρέθηκαν βαθμοί στην απάντηση του Universis.";
    newlyPassed.forEach((courseName) => celebratePassed(courseName));
    renderView();
  } catch (error) {
    els.universisStatus.textContent = `Δεν έγινε σύνδεση: ${error.message}`;
  }
};

const openPassModal = (courseName) => {
  const progress = progressForExamCourse(courseName);
  els.passForm.dataset.course = courseName;
  els.passCourseName.textContent = courseName;
  els.passGradeInput.value = progress["Βαθμός"] ?? "";
  els.passDateInput.value = progress["Ημερομηνία Επιτυχίας"] || new Date().toISOString().slice(0, 10);
  els.passModal.classList.add("show");
  els.passModal.setAttribute("aria-hidden", "false");
  els.passGradeInput.focus();
};

const closePassModal = () => {
  els.passModal.classList.remove("show");
  els.passModal.setAttribute("aria-hidden", "true");
  els.passForm.reset();
  delete els.passForm.dataset.course;
  renderView();
};

const buildProgressSeries = (progressItems = state.data.progress) => {
  const periods = new Map();
  (state.data.progressSeries || []).forEach((row) => {
    periods.set(row["Εξεταστική"], { Εξεταστική: row["Εξεταστική"], Περασμένα: 0, Χρωστούμενα: 0, "Μέσος όρος": null });
  });
  progressItems.forEach((item) => {
    if (!item["Περασμένο"] || !item["Ημερομηνία Επιτυχίας"]) return;
    const key = examPeriodFromDate(item["Ημερομηνία Επιτυχίας"]);
    if (!key) return;
    if (!periods.has(key)) {
      periods.set(key, { Εξεταστική: key, Περασμένα: 0, Χρωστούμενα: 0, "Μέσος όρος": null });
    }
  });

  let cumulativePassed = 0;
  const total = progressItems.length;
  return [...periods.values()]
    .sort((a, b) => String(a["Εξεταστική"]).localeCompare(String(b["Εξεταστική"])))
    .map((row) => {
      const passedHere = progressItems.filter((item) => item["Περασμένο"] && examPeriodFromDate(item["Ημερομηνία Επιτυχίας"]) === row["Εξεταστική"]);
      const grades = passedHere.map((item) => item["Βαθμός"]).filter((grade) => typeof grade === "number");
      cumulativePassed += passedHere.length;
      return {
        Εξεταστική: row["Εξεταστική"],
        Περασμένα: passedHere.length,
        Χρωστούμενα: Math.max(total - cumulativePassed, 0),
        "Μέσος όρος": grades.length ? grades.reduce((sum, grade) => sum + grade, 0) / grades.length : null,
      };
    });
};

const allItemsForFilters = () => [
  ...state.data.examCourses.map((item) => ({ ...item, Κατάσταση: "Εξεταστική" })),
  ...state.data.progress.map(withStatus),
  ...state.data.electives.map(withStatus),
];

const currentItems = () => {
  if (state.view === "progress") return state.data.progress.map(withStatus);
  if (state.view === "electives") return state.data.electives.map(withStatus);
  if (state.view === "charts") return allItemsForFilters();
  return state.data.examCourses.map((item) => ({ ...item, Κατάσταση: "Εξεταστική" }));
};

const matches = (item) => {
  const query = normalize(state.query);
  const queryOk = !query || normalize(Object.values(item).join(" ")).includes(query);
  const filtersOk = state.filters.every(({ field, value }) => {
    const def = filterDefs[field];
    return def && String(item[def.key] ?? "") === value;
  });
  return queryOk && filtersOk;
};

const filteredItems = () => currentItems().filter(matches);
const bySemester = (a, b) => parseInt(a, 10) - parseInt(b, 10);

const valuesForField = (field) => {
  const def = filterDefs[field];
  const values = currentItems()
    .map((item) => item[def.key])
    .filter(Boolean);
  return [...new Set(values)].sort(field === "semester" ? bySemester : undefined);
};

const progressSortValue = (item) => {
  if (state.progressSort.field === "grade") return item["Βαθμός"] ?? -1;
  if (state.progressSort.field === "date") return item["Ημερομηνία Επιτυχίας"] || "";
  if (state.progressSort.field === "semester") return parseInt(item["Εξάμηνο"], 10) || 0;
  if (state.progressSort.field === "status") return item["Περασμένο"] ? 1 : 0;
  return courseKey(item["Μάθημα"]);
};

const sortProgressItems = (items) => {
  const direction = state.progressSort.direction === "asc" ? 1 : -1;
  return items.slice().sort((a, b) => {
    const first = progressSortValue(a);
    const second = progressSortValue(b);
    if (typeof first === "number" && typeof second === "number") return (first - second) * direction;
    return String(first).localeCompare(String(second), "el-GR") * direction;
  });
};

const fillFilterFields = () => {
  els.filterField.innerHTML = Object.entries(filterDefs)
    .map(([value, def]) => `<option value="${value}">${def.label}</option>`)
    .join("");
  fillFilterValues();
};

const fillFilterValues = () => {
  const values = valuesForField(els.filterField.value);
  els.filterValue.innerHTML = values.map((value) => `<option value="${value}">${value}</option>`).join("");
  els.addFilter.disabled = values.length === 0;
};

const gradeClassification = (average) => {
  if (typeof average !== "number") return { label: "-", range: "Χωρίς βαθμούς ακόμα" };
  if (average >= 8.5) return { label: "Άριστα", range: "περίπου 8.5 έως 10" };
  if (average >= 6.5) return { label: "Λίαν Καλώς", range: "περίπου 6.5 έως 8.49" };
  if (average >= 5) return { label: "Καλώς", range: "περίπου 5 έως 6.49" };
  return { label: "Κάτω από τη βάση", range: "κάτω από 5" };
};

const gradeScaleHtml = (average) => {
  const active = gradeClassification(average).label;
  return `
    <div class="average-scale" aria-label="Κατηγορίες μέσου όρου">
      ${[
        ["Καλώς", "περίπου 5 έως 6.49"],
        ["Λίαν Καλώς", "περίπου 6.5 έως 8.49"],
        ["Άριστα", "περίπου 8.5 έως 10"],
      ]
        .map(
          ([label, range]) => `
            <span class="average-band ${active === label ? "active" : ""}">
              <strong>${label}</strong>
              <small>${range}</small>
            </span>
          `,
        )
        .join("")}
    </div>
  `;
};

const renderStats = () => {
  const progress = state.data.progress.map(withStatus).filter(matches);
  const passed = progress.filter((item) => item["Περασμένο"]);
  const owed = progress.filter((item) => item["Χρωστούμενο"]);
  const grades = passed.map((item) => item["Βαθμός"]).filter((grade) => typeof grade === "number");
  const averageValue = grades.length ? grades.reduce((sum, grade) => sum + grade, 0) / grades.length : null;
  const average = averageValue === null ? "-" : averageValue.toFixed(2);
  const completion = passed.length + owed.length ? Math.round((passed.length / (passed.length + owed.length)) * 100) : 0;

  els.examCount.textContent = `${completion}%`;
  els.passedCount.textContent = passed.length;
  els.owedCount.textContent = owed.length;
  els.averageGrade.textContent = averageValue === null ? "-" : `${average} · ${gradeClassification(averageValue).label}`;
};

const renderFilterChips = () => {
  els.activeFilters.innerHTML =
    state.filters
      .map(
        (filter, index) => `
        <button class="filter-chip" type="button" data-filter-index="${index}">
          ${filterDefs[filter.field].label}: ${filter.value}
          <span aria-hidden="true">×</span>
        </button>
      `,
      )
      .join("") || `<span class="muted-note">Χωρίς ενεργά φίλτρα.</span>`;
};

const empty = (text) => `<div class="empty">${text}</div>`;

const lineChart = (target, labels, series, options = {}) => {
  const visibleSeries = series.filter((item) => item.values.some((value) => typeof value === "number"));
  if (!labels.length || !visibleSeries.length) {
    target.innerHTML = empty("Δεν υπάρχουν στοιχεία για αυτό το γράφημα.");
    return;
  }

  const width = 760;
  const height = 320;
  const pad = { top: 24, right: 24, bottom: 72, left: 58 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;
  const allValues = visibleSeries.flatMap((item) => item.values).filter((value) => typeof value === "number");
  const minValue = options.minValue ?? Math.min(0, ...allValues);
  const maxValue = Math.max(options.maxValue ?? 0, ...allValues, 1);
  const tickCount = 4;
  const x = (index) => pad.left + (labels.length === 1 ? plotW / 2 : (plotW / (labels.length - 1)) * index);
  const y = (value) => pad.top + plotH - ((value - minValue) / Math.max(maxValue - minValue, 1)) * plotH;
  const palette = ["#2f6fbe", "#d9654f", "#0f766e", "#a06b16"];

  const ticks = Array.from({ length: tickCount + 1 }, (_, index) => minValue + ((maxValue - minValue) / tickCount) * index);
  const paths = visibleSeries
    .map((item, seriesIndex) => {
      const points = item.values
        .map((value, index) => (typeof value === "number" ? `${x(index)},${y(value)}` : null))
        .filter(Boolean);
      const color = item.color || palette[seriesIndex % palette.length];
      const circles = item.values
        .map((value, index) => {
          if (typeof value !== "number") return "";
          return `<circle class="chart-point" cx="${x(index)}" cy="${y(value)}" r="4.5" style="--series-color:${color}"></circle>`;
        })
        .join("");
      return `
        <polyline class="chart-line" points="${points.join(" ")}" style="--series-color:${color}"></polyline>
        ${circles}
      `;
    })
    .join("");

  const xLabels = labels
    .map((label, index) => {
      const shortLabel = label.length > 12 ? `${label.slice(0, 11)}…` : label;
      return `<text class="chart-x-label" x="${x(index)}" y="${height - 34}" text-anchor="end" transform="rotate(-32 ${x(index)} ${height - 34})">${shortLabel}</text>`;
    })
    .join("");

  const grid = ticks
    .map((tick) => {
      const yy = y(tick);
      const label = options.valueFormatter ? options.valueFormatter(tick) : Number.isInteger(tick) ? tick : tick.toFixed(1);
      return `
        <line class="chart-grid" x1="${pad.left}" x2="${width - pad.right}" y1="${yy}" y2="${yy}"></line>
        <text class="chart-y-label" x="${pad.left - 12}" y="${yy + 4}" text-anchor="end">${label}</text>
      `;
    })
    .join("");

  const legend = visibleSeries
    .map((item, index) => {
      const color = item.color || palette[index % palette.length];
      return `<span class="chart-legend-item"><i style="background:${color}"></i>${item.name}</span>`;
    })
    .join("");

  target.innerHTML = `
    <div class="chart-legend">${legend}</div>
    <svg class="chart-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="${options.title ?? "Διάγραμμα"}">
      ${grid}
      <line class="chart-axis" x1="${pad.left}" x2="${width - pad.right}" y1="${height - pad.bottom}" y2="${height - pad.bottom}"></line>
      <line class="chart-axis" x1="${pad.left}" x2="${pad.left}" y1="${pad.top}" y2="${height - pad.bottom}"></line>
      ${paths}
      ${xLabels}
      <text class="chart-axis-title" x="${pad.left + plotW / 2}" y="${height - 6}" text-anchor="middle">${options.xTitle ?? "Χ"}</text>
      <text class="chart-axis-title" x="16" y="${pad.top + plotH / 2}" text-anchor="middle" transform="rotate(-90 16 ${pad.top + plotH / 2})">${options.yTitle ?? "Υ"}</text>
    </svg>
  `;
};

const comboChart = (target, labels, series, options = {}) => {
  const visibleSeries = series.filter(
    (item) => item.visible && item.values.some((value) => typeof value === "number"),
  );
  if (!labels.length || !visibleSeries.length) {
    target.innerHTML = empty("Δεν υπάρχουν στοιχεία για αυτό το γράφημα.");
    return;
  }

  const width = 1100;
  const height = 520;
  const pad = { top: 34, right: 70, bottom: 92, left: 68 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;
  const columnSeries = visibleSeries.filter((item) => item.type === "column");
  const countSeries = visibleSeries.filter((item) => item.type === "line" && item.axis !== "grade");
  const gradeSeries = visibleSeries.filter((item) => item.axis === "grade");
  const columnValues = columnSeries.flatMap((item) => item.values).filter((value) => typeof value === "number");
  const countValues = countSeries.flatMap((item) => item.values).filter((value) => typeof value === "number");
  const rightValues = [...columnValues, ...gradeSeries.flatMap((item) => item.values).filter((value) => typeof value === "number")];
  const rawMaxRight = Math.max(Math.ceil(Math.max(...rightValues, 1)), 1);
  const rightTickStep = Math.max(1, Math.ceil(rawMaxRight / 5));
  const maxRight = Math.max(rightTickStep, Math.ceil(rawMaxRight / rightTickStep) * rightTickStep);
  const maxLeft = Math.max(Math.ceil(Math.max(...countValues, 1) / 5) * 5, 5);
  const x = (index) => pad.left + (labels.length === 1 ? plotW / 2 : (plotW / (labels.length - 1)) * index);
  const yLeft = (value) => pad.top + plotH - (value / maxLeft) * plotH;
  const yRight = (value) => pad.top + plotH - (value / maxRight) * plotH;

  const columnWidth = Math.min(34, Math.max(16, plotW / labels.length / Math.max(columnSeries.length + 1, 2)));
  const columns = columnSeries
    .map((item, seriesIndex) =>
      item.values
        .map((value, index) => {
          if (typeof value !== "number") return "";
          const xPos = x(index) - (columnWidth * columnSeries.length) / 2 + columnWidth * seriesIndex;
          const yPos = yRight(value);
          return `
            <rect class="chart-column" x="${xPos}" y="${yPos}" width="${columnWidth}" height="${pad.top + plotH - yPos}" rx="5" style="--series-color:${item.color}"></rect>
            <text class="chart-column-label" x="${xPos + columnWidth / 2}" y="${yPos - 8}" text-anchor="middle">${value}</text>
          `;
        })
        .join(""),
    )
    .join("");

  const lines = visibleSeries
    .filter((item) => item.type === "line")
    .map((item) => {
      const yScale = item.axis === "grade" ? yRight : yLeft;
      const formatter = item.axis === "grade" ? (value) => value.toFixed(2) : (value) => Math.round(value);
      const points = item.values
        .map((value, index) => (typeof value === "number" ? `${x(index)},${yScale(value)}` : null))
        .filter(Boolean);
      const pointDetails = item.values
        .map((value, index) => {
          if (typeof value !== "number") return "";
          const labelY = Math.max(pad.top + 14, yScale(value) - 10);
          return `
            <circle class="chart-point" cx="${x(index)}" cy="${yScale(value)}" r="5" style="--series-color:${item.color}"></circle>
            <text class="chart-point-label" x="${x(index)}" y="${labelY}" text-anchor="middle" style="--series-color:${item.color}">${formatter(value)}</text>
          `;
        })
        .join("");
      return `
        <polyline class="chart-line" points="${points.join(" ")}" style="--series-color:${item.color}"></polyline>
        ${pointDetails}
      `;
    })
    .join("");

  const countTicks = Array.from({ length: 6 }, (_, index) => (maxLeft / 5) * index);
  const leftGrid = countTicks
    .map((tick) => {
      const yy = yLeft(tick);
      return `
        <line class="chart-grid" x1="${pad.left}" x2="${width - pad.right}" y1="${yy}" y2="${yy}"></line>
        <text class="chart-y-label" x="${pad.left - 12}" y="${yy + 4}" text-anchor="end">${Math.round(tick)}</text>
      `;
    })
    .join("");
  const rightTicks = Array.from({ length: Math.ceil(maxRight / rightTickStep) + 1 }, (_, index) => index * rightTickStep)
    .map((tick) => {
      const yy = yRight(tick);
      return `<text class="chart-y-label" x="${width - pad.right + 12}" y="${yy + 4}" text-anchor="start">${tick}</text>`;
    })
    .join("");
  const xLabels = labels
    .map((label, index) => `<text class="chart-x-label" x="${x(index)}" y="${height - 42}" text-anchor="end" transform="rotate(-35 ${x(index)} ${height - 42})">${label}</text>`)
    .join("");
  const legend = visibleSeries
    .map(
      (item) => `<span class="chart-legend-item"><i style="background:${item.color}"></i>${item.name}</span>`,
    )
    .join("");

  target.innerHTML = `
    <div class="chart-legend">${legend}</div>
    <svg class="chart-svg chart-svg-large" viewBox="0 0 ${width} ${height}" role="img" aria-label="${options.title ?? "Διάγραμμα"}">
      ${leftGrid}
      <line class="chart-axis" x1="${pad.left}" x2="${width - pad.right}" y1="${height - pad.bottom}" y2="${height - pad.bottom}"></line>
      <line class="chart-axis" x1="${pad.left}" x2="${pad.left}" y1="${pad.top}" y2="${height - pad.bottom}"></line>
      <line class="chart-axis secondary" x1="${width - pad.right}" x2="${width - pad.right}" y1="${pad.top}" y2="${height - pad.bottom}"></line>
      ${columns}
      ${lines}
      ${xLabels}
      ${rightTicks}
      <text class="chart-axis-title" x="${pad.left + plotW / 2}" y="${height - 8}" text-anchor="middle">${options.xTitle ?? "Εξεταστικές"}</text>
      <text class="chart-axis-title" x="18" y="${pad.top + plotH / 2}" text-anchor="middle" transform="rotate(-90 18 ${pad.top + plotH / 2})">Χρωστούμενα</text>
      <text class="chart-axis-title" x="${width - 18}" y="${pad.top + plotH / 2}" text-anchor="middle" transform="rotate(90 ${width - 18} ${pad.top + plotH / 2})">Περασμένα / Μέσος όρος</text>
    </svg>
  `;
};

const pieChart = (target, slices, options = {}) => {
  const visibleSlices = slices.filter((slice) => slice.visible && slice.value > 0);
  if (!visibleSlices.length) {
    target.innerHTML = empty("Δεν υπάρχουν στοιχεία για αυτό το γράφημα.");
    return;
  }

  const total = visibleSlices.reduce((sum, slice) => sum + slice.value, 0);
  const width = 520;
  const height = 420;
  const cx = 230;
  const cy = 190;
  const r = 128;
  let start = -Math.PI / 2;
  const paths = visibleSlices
    .map((slice) => {
      const angle = (slice.value / total) * Math.PI * 2;
      const end = start + angle;
      const large = angle > Math.PI ? 1 : 0;
      const x1 = cx + Math.cos(start) * r;
      const y1 = cy + Math.sin(start) * r;
      const x2 = cx + Math.cos(end) * r;
      const y2 = cy + Math.sin(end) * r;
      const mid = start + angle / 2;
      const lx = cx + Math.cos(mid) * (r + 32);
      const ly = cy + Math.sin(mid) * (r + 32);
      start = end;
      return `
        <path class="pie-slice" d="M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z" style="--series-color:${slice.color}"></path>
        <text class="pie-label" x="${lx}" y="${ly}" text-anchor="middle">${slice.value}</text>
      `;
    })
    .join("");
  const legend = visibleSlices
    .map((slice) => `<span class="chart-legend-item"><i style="background:${slice.color}"></i>${slice.name}</span>`)
    .join("");

  target.innerHTML = `
    <div class="chart-legend">${legend}</div>
    <svg class="chart-svg pie-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="${options.title ?? "Pie chart"}">
      ${paths}
      <circle class="pie-hole" cx="${cx}" cy="${cy}" r="70"></circle>
      <text class="pie-total" x="${cx}" y="${cy - 4}" text-anchor="middle">${total}</text>
      <text class="pie-total-label" x="${cx}" y="${cy + 20}" text-anchor="middle">σύνολο</text>
    </svg>
  `;
};

const renderCharts = () => {
  const progressItems = state.data.progress.map(withStatus).filter(matches);
  const seriesRows = buildProgressSeries(progressItems);
  const labels = seriesRows.map((row) => formatExamPeriodShort(row["Εξεταστική"]));
  const passedGrades = progressItems
    .filter((item) => item["Περασμένο"])
    .map((item) => item["Βαθμός"])
    .filter((grade) => typeof grade === "number");
  const overallAverage = passedGrades.length
    ? passedGrades.reduce((sum, grade) => sum + grade, 0) / passedGrades.length
    : null;
  const averageClass = gradeClassification(overallAverage);

  els.timelineMeta.textContent = `${seriesRows.length} εξεταστικές`;
  comboChart(
    els.timelineChart,
    labels,
    [
      { name: "Περασμένα", values: seriesRows.map((row) => row["Περασμένα"]), color: "#2f6fbe", type: "column", visible: state.seriesVisible.passed },
      { name: "Χρωστούμενα", values: seriesRows.map((row) => row["Χρωστούμενα"]), color: "#d9654f", type: "line", visible: state.seriesVisible.owed },
      { name: "Μέσος όρος", values: seriesRows.map((row) => row["Μέσος όρος"]), color: "#0f766e", type: "line", axis: "grade", visible: state.seriesVisible.average },
    ],
    { title: "Πρόοδος ανά εξεταστική", xTitle: "Εξεταστικές" },
  );

  const passedTotal = progressItems.filter((item) => item["Περασμένο"]).length;
  const owedTotal = progressItems.filter((item) => item["Χρωστούμενο"]).length;
  els.owedMeta.textContent = `${passedTotal + owedTotal} μαθήματα`;
  pieChart(els.owedChart, [
    { name: "Περασμένα", value: passedTotal, color: "#2f6fbe", visible: state.seriesVisible.passed },
    { name: "Χρωστούμενα", value: owedTotal, color: "#d9654f", visible: state.seriesVisible.owed },
  ], { title: "Περασμένα και χρωστούμενα" });

  els.gradeMeta.textContent = overallAverage === null ? "Χωρίς βαθμούς" : `${averageClass.label} · ${overallAverage.toFixed(2)}`;
  lineChart(
    els.gradeChart,
    labels,
    [
      {
        name: "Μέσος όρος",
        values: state.seriesVisible.average ? seriesRows.map((row) => row["Μέσος όρος"]) : [],
        color: "#0f766e",
      },
    ],
    {
      title: "Μέσος όρος ανά εξεταστική",
      xTitle: "Εξεταστικές",
      yTitle: "Μέσος βαθμός",
      maxValue: 10,
      valueFormatter: (value) => value.toFixed(0),
    },
  );
  els.gradeChart.insertAdjacentHTML("beforeend", gradeScaleHtml(overallAverage));
};

const renderExams = () => {
  const items = state.view === "exams" ? filteredItems() : state.data.examCourses;
  els.examMeta.textContent = `${items.length} μαθήματα`;
  els.panels.exams.classList.toggle("editing", state.editMode);
  els.editModeToggle.textContent = state.editMode ? "Τέλος" : "Επεξεργασία";
  els.examList.innerHTML =
    items
      .slice()
      .sort((a, b) => String(a["Ημερομηνίες"]).localeCompare(String(b["Ημερομηνίες"])))
      .map(
        (item) => {
          const progress = findProgressByCourse(item["Μαθήματα"]);
          const passed = Boolean(progress?.["Περασμένο"]);
          return `
        <article class="course-card exam-card ${passed ? "passed" : ""}">
          <label class="pass-check" title="Περάστηκε" aria-label="Περάστηκε">
            <input data-action="passed-check" data-course="${item["Μαθήματα"]}" type="checkbox" ${passed ? "checked" : ""} />
          </label>
          <div class="date-box">
            <span>${formatDate(item["Ημερομηνίες"], true)}</span>
            <strong>${item["Ώρα"] ?? "-"}</strong>
          </div>
          <div>
            <h3>${item["Μαθήματα"]}</h3>
            <div class="tag-row">
              <span class="tag">${item["Εξάμηνο"]}</span>
              <span class="tag gold">${item["Περίοδος"] ?? "-"}</span>
              ${passed ? '<span class="tag">Περασμένο</span>' : ""}
            </div>
            <div class="details">
              <span><b>Αίθουσα:</b> ${item["Αίθουσα"] ?? "-"}</span>
            </div>
            <div class="details edit-tools">
              <label><b>Ημερομηνία:</b><input data-action="field" data-id="${item.id}" data-field="Ημερομηνίες" type="date" value="${item["Ημερομηνίες"] ?? ""}" /></label>
              <label><b>Ώρα:</b><input data-action="field" data-id="${item.id}" data-field="Ώρα" type="time" value="${item["Ώρα"] ?? ""}" /></label>
              <label><b>Αίθουσα:</b><input data-action="field" data-id="${item.id}" data-field="Αίθουσα" value="${item["Αίθουσα"] ?? ""}" /></label>
              <button class="danger-button" type="button" data-action="delete-course" data-id="${item.id}" data-course="${item["Μαθήματα"]}">Αφαίρεση</button>
            </div>
          </div>
        </article>
      `;
        },
      )
      .join("") || empty("Δεν βρέθηκαν μαθήματα με αυτά τα φίλτρα.");
};

const renderProgress = () => {
  const items = sortProgressItems(state.view === "progress" ? filteredItems() : state.data.progress.map(withStatus));
  els.progressMeta.textContent = `${items.length} μαθήματα`;
  els.panels.progress.classList.toggle("editing", state.progressEditMode);
  els.progressEditToggle.classList.toggle("active", state.progressEditMode);
  els.progressSortField.value = state.progressSort.field;
  els.progressSortDirection.textContent = state.progressSort.direction === "asc" ? "Αύξουσα" : "Φθίνουσα";
  els.progressList.innerHTML = items
    .map(
      (item) => `
      <article class="progress-card ${item["Περασμένο"] ? "passed" : ""}">
        <div class="progress-course">
          <h3>${item["Μάθημα"]}</h3>
          <div class="tag-row">
            <span class="tag">${item["Εξάμηνο"] ?? "-"}</span>
            <span class="tag ${item["Περασμένο"] ? "" : "coral"}">${statusOf(item)}</span>
          </div>
        </div>
        <div class="progress-facts">
          <div>
            <span>Βαθμός</span>
            <strong class="read-cell">${item["Βαθμός"] ?? "-"}</strong>
            <input class="edit-cell grade-input" data-action="grade" data-id="${item.id}" type="number" min="0" max="10" step="0.5" value="${item["Βαθμός"] ?? ""}" />
          </div>
          <div>
            <span>Εξεταστική</span>
            <strong>${item["Ημερομηνία Επιτυχίας"] ? formatExamPeriod(item["Ημερομηνία Επιτυχίας"]) : "-"}</strong>
          </div>
          <div>
            <span>Κατάσταση</span>
            <strong class="read-cell">${statusOf(item)}</strong>
          <select class="edit-cell" data-action="progress-status" data-id="${item.id}">
            <option value="owed" ${item["Χρωστούμενο"] ? "selected" : ""}>Χρωστούμενο</option>
            <option value="passed" ${item["Περασμένο"] ? "selected" : ""}>Περασμένο</option>
          </select>
          </div>
        </div>
      </article>
    `,
    )
    .join("") || empty("Δεν βρέθηκαν μαθήματα με αυτά τα φίλτρα.");
};

const renderElectives = () => {
  const items = state.view === "electives" ? filteredItems() : state.data.electives.map(withStatus);
  els.electiveMeta.textContent = `${items.length} μαθήματα`;
  els.electiveGrid.innerHTML =
    items
      .map(
        (item) => `
        <article class="elective-card">
          <h3>${item["Μάθημα"]}</h3>
          <div class="tag-row">
            <span class="tag">${item["Εξάμηνο"]}</span>
            <span class="tag gold">Ομάδα ${item["Ομάδα"] ?? "-"}</span>
            <span class="tag ${item["Χρωστούμενο"] ? "coral" : ""}">${statusOf(item)}</span>
          </div>
        </article>
      `,
      )
      .join("") || empty("Δεν βρέθηκαν μαθήματα επιλογής με αυτά τα φίλτρα.");
};

const renderView = () => {
  Object.entries(els.panels).forEach(([view, panel]) => {
    panel.classList.toggle("active", view === state.view);
  });
  els.viewButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.view === state.view);
  });
  fillFilterValues();
  renderFilterChips();
  renderStats();
  renderCharts();
  renderExams();
  renderProgress();
  renderElectives();
};

const bindEvents = () => {
  els.searchInput.addEventListener("input", (event) => {
    state.query = event.target.value;
    renderView();
  });

  els.filterField.addEventListener("change", fillFilterValues);

  els.addFilter.addEventListener("click", () => {
    const field = els.filterField.value;
    const value = els.filterValue.value;
    if (!value || state.filters.some((filter) => filter.field === field && filter.value === value)) return;
    state.filters.push({ field, value });
    renderView();
  });

  els.activeFilters.addEventListener("click", (event) => {
    const chip = event.target.closest("[data-filter-index]");
    if (!chip) return;
    state.filters.splice(Number(chip.dataset.filterIndex), 1);
    renderView();
  });

  els.courseForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const form = new FormData(els.courseForm);
    const name = String(form.get("name") || "").trim();
    if (!name) return;
    const semester = String(form.get("semester") || "1ο");
    const course = {
      id: uid(),
      Μαθήματα: name,
      Περίοδος: ["2ο", "4ο", "6ο", "8ο"].includes(semester) ? "Εαρινό" : "Χειμερινό",
      Εξάμηνο: semester,
      Επιλογή: "Εξεταστική",
      Ημερομηνίες: form.get("date") || null,
      Ώρα: form.get("time") || null,
      Αίθουσα: String(form.get("room") || "").trim() || null,
      Διάβασμα: null,
    };
    state.data.examCourses.push(course);
    state.data.progress.push({
      id: uid(),
      Μάθημα: name,
      Έτος: "",
      Εξάμηνο: semester,
      "Ημερομηνία Επιτυχίας": null,
      Βαθμός: null,
      Περασμένο: false,
      Χρωστούμενο: true,
    });
    els.courseForm.reset();
    saveData();
    renderView();
  });

  els.editModeToggle.addEventListener("click", () => {
    state.editMode = !state.editMode;
    renderView();
  });

  els.progressEditToggle.addEventListener("click", () => {
    state.progressEditMode = !state.progressEditMode;
    renderView();
  });

  els.progressSortField.addEventListener("change", (event) => {
    state.progressSort.field = event.target.value;
    renderView();
  });

  els.progressSortDirection.addEventListener("click", () => {
    state.progressSort.direction = state.progressSort.direction === "asc" ? "desc" : "asc";
    renderView();
  });

  els.rememberUniversisToken.addEventListener("change", saveUniversisSettings);
  els.autoUniversisSync.addEventListener("change", saveUniversisSettings);
  els.phoneNotifications.addEventListener("change", saveUniversisSettings);
  els.notificationTopic.addEventListener("change", saveUniversisSettings);
  els.universisUrl.addEventListener("change", saveUniversisSettings);
  els.universisToken.addEventListener("change", saveUniversisSettings);

  els.universisForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    syncUniversis();
  });

  els.examList.addEventListener("change", (event) => {
    const target = event.target;
    if (target.dataset.action !== "field") return;
    const course = state.data.examCourses.find((item) => item.id === target.dataset.id);
    if (!course) return;
    course[target.dataset.field] = target.value || null;
    saveData();
    renderView();
  });

  els.examList.addEventListener("change", (event) => {
    const target = event.target;
    if (target.dataset.action !== "passed-check") return;
    const passed = target.checked;
    const progress = progressForExamCourse(target.dataset.course);
    if (passed) {
      openPassModal(target.dataset.course);
      return;
    }
    progress["Περασμένο"] = false;
    progress["Χρωστούμενο"] = true;
    progress["Ημερομηνία Επιτυχίας"] = null;
    progress["Βαθμός"] = null;
    saveData();
    renderView();
  });

  els.passForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const courseName = els.passForm.dataset.course;
    if (!courseName) return;
    const progress = progressForExamCourse(courseName);
    progress["Περασμένο"] = true;
    progress["Χρωστούμενο"] = false;
    progress["Βαθμός"] = Number(els.passGradeInput.value);
    progress["Ημερομηνία Επιτυχίας"] = els.passDateInput.value;
    saveData();
    closePassModal();
    celebratePassed(courseName);
  });

  els.passModal.addEventListener("click", (event) => {
    if (!event.target.closest("[data-close-pass]")) return;
    closePassModal();
  });

  els.examList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-action='delete-course']");
    if (!button) return;
    const progress = findProgressByCourse(button.dataset.course);
    state.data.examCourses = state.data.examCourses.filter((item) => item.id !== button.dataset.id);
    state.data.progress = state.data.progress.filter((item) => item.id !== progress?.id);
    saveData();
    renderView();
  });

  els.progressList.addEventListener("change", (event) => {
    const target = event.target;
    const progress = state.data.progress.find((item) => item.id === target.dataset.id);
    if (!progress) return;
    if (target.dataset.action === "progress-status") {
      const passed = target.value === "passed";
      if (passed) {
        openPassModal(progress["Μάθημα"]);
        return;
      }
      progress["Περασμένο"] = passed;
      progress["Χρωστούμενο"] = !passed;
      progress["Ημερομηνία Επιτυχίας"] = null;
      progress["Βαθμός"] = null;
    }
    saveData();
    renderView();
  });

  els.progressList.addEventListener("change", (event) => {
    const target = event.target;
    if (target.dataset.action !== "grade") return;
    const progress = state.data.progress.find((item) => item.id === target.dataset.id);
    if (!progress) return;
    progress["Βαθμός"] = target.value === "" ? null : Number(target.value);
    saveData();
    renderView();
  });

  els.viewButtons.forEach((button) => {
    button.addEventListener("click", () => {
      state.view = button.dataset.view;
      state.filters = [];
      els.mobileNav.classList.remove("open");
      els.mobileMenuToggle.setAttribute("aria-expanded", "false");
      renderView();
    });
  });

  els.mobileMenuToggle.addEventListener("click", () => {
    const open = !els.mobileNav.classList.contains("open");
    els.mobileNav.classList.toggle("open", open);
    els.mobileMenuToggle.setAttribute("aria-expanded", String(open));
  });

  els.seriesToggles.forEach((toggle) => {
    toggle.addEventListener("change", () => {
      state.seriesVisible[toggle.dataset.seriesToggle] = toggle.checked;
      renderView();
    });
  });

  document.querySelector("#chartsPanel").addEventListener("click", (event) => {
    const card = event.target.closest("[data-expand-chart]");
    if (!card || event.target.closest("input, button, select, label")) return;
    els.chartModalContent.innerHTML = card.innerHTML;
    els.chartModal.classList.add("show");
    els.chartModal.setAttribute("aria-hidden", "false");
  });

  els.chartModal.addEventListener("click", (event) => {
    if (!event.target.closest("[data-close-chart]")) return;
    els.chartModal.classList.remove("show");
    els.chartModal.setAttribute("aria-hidden", "true");
    els.chartModalContent.innerHTML = "";
  });
};

const registerServiceWorker = () => {
  if (!("serviceWorker" in navigator) || !window.location.protocol.startsWith("http")) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js?v=6").catch(() => {});
  });
};

const boot = () => {
  const saved = localStorage.getItem(STORAGE_KEY);
  state.data = saved ? prepareData(JSON.parse(saved)) : prepareData(window.COURSE_DATA);
  const universisSettings = loadUniversisSettings();
  saveData();
  fillFilterFields();
  bindEvents();
  renderView();
  if (universisSettings.autoSync && (universisSettings.token || els.universisToken.value.trim())) {
    window.setTimeout(() => syncUniversis(true), 300);
  }
  registerServiceWorker();
};

boot();
