
const STORAGE_KEY = "habitpro_data_v1";
const THEME_KEY = "habitpro_theme";

let habits = [];

try {
  const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  habits = Array.isArray(saved) ? saved : [];
} catch {
  habits = [];
}

const $ = (id) => document.getElementById(id);

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(habits));
}

function todayKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}

function getDateOffset(offset) {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return date;
}

// نمایش تاریخ امروز
function showDate() {
  $("todayDate").textContent = new Intl.DateTimeFormat(
    "fa-AF",
    {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric"
    }
  ).format(new Date());
}

// محاسبه زنجیره روزهای متوالی
function getCurrentStreak(habit) {
  const completed = new Set(habit.completedDates || []);
  const date = new Date();

  // اگر امروز انجام نشده، از دیروز شروع می‌کنیم
  if (!completed.has(todayKey(date))) {
    date.setDate(date.getDate() - 1);
  }

  let streak = 0;

  while (completed.has(todayKey(date))) {
    streak++;
    date.setDate(date.getDate() - 1);
  }

  return streak;
}

// بهترین زنجیره تاریخی
function getBestStreak(habit) {
  const dates = [...new Set(habit.completedDates || [])].sort();
  let best = 0;
  let current = 0;
  let previous = null;

  dates.forEach(key => {
    const date = new Date(key + "T12:00:00");

    if (previous) {
      const difference = Math.round(
        (date - previous) / 86400000
      );

      current = difference === 1 ? current + 1 : 1;
    } else {
      current = 1;
    }

    best = Math.max(best, current);
    previous = date;
  });

  return best;
}

// بررسی انجام عادت امروز
function isCompleted(habit) {
  return (habit.completedDates || []).includes(todayKey());
}

// نمایش عادت‌ها
function renderHabits() {
  const list = $("habitsList");
  const empty = $("emptyState");

  if (habits.length === 0) {
    list.innerHTML = "";
    empty.classList.remove("hidden");
    return;
  }

  empty.classList.add("hidden");

  list.innerHTML = habits.map(habit => {
    const done = isCompleted(habit);
    const streak = getCurrentStreak(habit);

    return `
      <div class="habit-card">
        <div class="habit-emoji">
          ${escapeHTML(habit.emoji || "⭐")}
        </div>

        <div class="habit-info">
          <h4>${escapeHTML(habit.title)}</h4>
          <p>${escapeHTML(habit.category)}</p>
          <div class="habit-streak">
            🔥 ${streak} روز متوالی
          </div>
        </div>

        <div class="habit-actions">
          <button
            class="small-btn"
            data-action="edit"
            data-id="${escapeHTML(habit.id)}"
            aria-label="ویرایش"
          >✏️</button>

          <button
            class="small-btn"
            data-action="delete"
            data-id="${escapeHTML(habit.id)}"
            aria-label="حذف"
          >🗑️</button>

          <button
            class="check-btn ${done ? "done" : ""}"
            data-action="toggle"
            data-id="${escapeHTML(habit.id)}"
            aria-label="ثبت انجام عادت"
            aria-pressed="${done}"
          >${done ? "✓" : ""}</button>
        </div>
      </div>
    `;
  }).join("");
}

// نمایش آمار
function renderStats() {
  const total = habits.length;
  const completed = habits.filter(isCompleted).length;

  const percent = total === 0
    ? 0
    : Math.round((completed / total) * 100);

  $("totalHabits").textContent = total;
  $("completedHabits").textContent = completed;
  $("progressPercent").textContent = percent + "%";

  $("progressFill").style.width = percent + "%";

  let caption = "هنوز شروع نکرده‌ای! 🌱";

  if (percent === 100 && total > 0) {
    caption = "عالی! تمام عادت‌های امروز انجام شدند! 🎉";
  } else if (percent > 0) {
    caption = `${completed} عادت از ${total} عادت انجام شده است.`;
  }

  $("progressCaption").textContent = caption;

  const best = habits.reduce(
    (max, habit) => Math.max(max, getBestStreak(habit)),
    0
  );

  $("bestStreak").textContent = best;
}

// نمودار هفتگی
function renderWeeklyChart() {
  const chart = $("weeklyChart");
  const days = [];

  const dayNames = [
    "یکشنبه",
    "دوشنبه",
    "سه‌شنبه",
    "چهارشنبه",
    "پنجشنبه",
    "جمعه",
    "شنبه"
  ];

  for (let i = 6; i >= 0; i--) {
    const date = getDateOffset(-i);
    const key = todayKey(date);

    const count = habits.filter(habit =>
      (habit.completedDates || []).includes(key)
    ).length;

    const percent = habits.length
      ? Math.round(count / habits.length * 100)
      : 0;

    days.push({
      name: dayNames[date.getDay()],
      count,
      percent
    });
  }

  chart.innerHTML = days.map(day => `
    <div class="chart-column">
      <small class="chart-value">${day.count}</small>
      <div class="chart-bar-area">
        <div
          class="chart-bar"
          style="height:${day.percent}%"
          title="${day.percent}%"
        ></div>
      </div>
      <small>${day.name}</small>
    </div>
  `).join("");
}

// بروزرسانی کامل صفحه
function render() {
  renderHabits();
  renderStats();
  renderWeeklyChart();
}

// نمایش فرم
function openForm(habit = null) {
  $("habitForm").classList.remove("hidden");

  $("formTitle").textContent = habit
    ? "ویرایش عادت"
    : "افزودن عادت جدید";

  $("editId").value = habit ? habit.id : "";
  $("habitName").value = habit ? habit.title : "";
  $("habitCategory").value = habit
    ? habit.category
    : "شخصی";

  $("habitEmoji").value = habit
    ? habit.emoji
    : "⭐";

  $("habitName").focus();
  $("habitForm").scrollIntoView({
    behavior: "smooth",
    block: "center"
  });
}

// بستن فرم
function closeForm() {
  $("habitForm").classList.add("hidden");
  $("habitForm").reset();
  $("editId").value = "";
}

// افزودن و ویرایش عادت
$("habitForm").addEventListener("submit", function(event) {
  event.preventDefault();

  const title = $("habitName").value.trim();
  const category = $("habitCategory").value;
  const emoji = $("habitEmoji").value.trim() || "⭐";
  const editId = $("editId").value;

  if (!title) {
    alert("لطفاً نام عادت را وارد کن.");
    return;
  }

  if (editId) {
    const habit = habits.find(h => h.id === editId);

    if (habit) {
      habit.title = title;
      habit.category = category;
      habit.emoji = emoji;
    }
  } else {
    habits.push({
      id: Date.now().toString() + Math.random().toString(36).slice(2, 7),
      title,
      category,
      emoji,
      completedDates: [],
      createdAt: todayKey()
    });
  }

  saveData();
  closeForm();
  render();
});

// کلیک روی دکمه‌های فرم
$("openFormBtn").addEventListener("click", () => openForm());

$("emptyAddBtn").addEventListener("click", () => openForm());

$("cancelFormBtn").addEventListener("click", closeForm);

// عملیات عادت‌ها
$("habitsList").addEventListener("click", function(event) {
  const button = event.target.closest("button[data-action]");

  if (!button) return;

  const id = button.dataset.id;
  const action = button.dataset.action;

  const habit = habits.find(h => h.id === id);

  if (!habit) return;

  if (action === "toggle") {
    if (!Array.isArray(habit.completedDates)) {
      habit.completedDates = [];
    }

    const today = todayKey();

    if (habit.completedDates.includes(today)) {
      habit.completedDates =
        habit.completedDates.filter(date => date !== today);
    } else {
      habit.completedDates.push(today);
    }

    saveData();
    render();
  }

  if (action === "edit") {
    openForm(habit);
  }

  if (action === "delete") {
    const confirmDelete = confirm(
      `آیا می‌خواهی عادت «${habit.title}» را حذف کنی؟`
    );

    if (confirmDelete) {
      habits = habits.filter(h => h.id !== id);
      saveData();
      render();
    }
  }
});

// حالت تاریک و روشن
function applyTheme(theme) {
  document.body.classList.toggle("dark", theme === "dark");

  $("themeBtn").textContent =
    theme === "dark" ? "☀️" : "🌙";

  localStorage.setItem(THEME_KEY, theme);
}

const savedTheme = localStorage.getItem(THEME_KEY) || "light";
applyTheme(savedTheme);

$("themeBtn").addEventListener("click", () => {
  const nextTheme = document.body.classList.contains("dark")
    ? "light"
    : "dark";

  applyTheme(nextTheme);
});

// اجرای اولیه اپلیکیشن
showDate();
render();
