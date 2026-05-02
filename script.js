const themeSelect = document.getElementById("themeSelect");
const menuBtn = document.getElementById("menuBtn");
const navRight = document.getElementById("navRight");
const navList = document.querySelector("nav ul");
const tabs = document.querySelectorAll(".tab-btn");
const panels = document.querySelectorAll(".panel");
const subjectsDiv = document.getElementById("subjects");
const searchSubject = document.getElementById("searchSubject");
const filterMarks = document.getElementById("filterMarks");
const targetInput = document.getElementById("targetInput");
const targetMsg = document.getElementById("targetMsg");
const goalFill = document.getElementById("goalFill");
const goalText = document.getElementById("goalText");
const smartInsight = document.getElementById("smartInsight");
const categoryBreakdown = document.getElementById("categoryBreakdown");
const attemptHistoryEl = document.getElementById("attemptHistory");
const reportBody = document.querySelector("#reportTable tbody");
const badges = document.getElementById("badges");
const toastContainer = document.getElementById("toastContainer");
const meterFill = document.getElementById("meterFill");
const subjectProgress = document.getElementById("subjectProgress");

const totalEl = document.getElementById("total");
const percentEl = document.getElementById("percent");
const gradeEl = document.getElementById("grade");
const statusEl = document.getElementById("status");
const levelTag = document.getElementById("levelTag");
const trendText = document.getElementById("trendText");
const highestEl = document.getElementById("highest");
const lowestEl = document.getElementById("lowest");
const averageEl = document.getElementById("average");
const vsClassEl = document.getElementById("vsClass");

const printBtn = document.getElementById("printBtn");
const resetBtn = document.getElementById("resetBtn");

let barChart;
let attemptHistory = JSON.parse(localStorage.getItem("attemptHistory") || "[]");

function showToast(message) {
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.textContent = message;
    toastContainer.appendChild(toast);
    setTimeout(() => toast.remove(), 2200);
}

function gradeFromPercent(percent) {
    if (percent >= 90) return "A";
    if (percent >= 75) return "B";
    if (percent >= 50) return "C";
    return "F";
}

function levelFromPercent(percent) {
    if (percent >= 90) return { text: "🟢 Excellent", cls: "level-excellent" };
    if (percent >= 75) return { text: "🟡 Good", cls: "level-good" };
    if (percent >= 50) return { text: "🟠 Average", cls: "level-average" };
    return { text: "🔴 Poor", cls: "level-poor" };
}

function animateValue(el, start, end, suffix = "") {
    const duration = 600;
    const begin = performance.now();
    function step(now) {
        const progress = Math.min((now - begin) / duration, 1);
        const value = start + (end - start) * progress;
        el.textContent = `${value.toFixed(2)}${suffix}`;
        if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
}

function collectData() {
    const rows = document.querySelectorAll(".row");
    const names = [];
    const marks = [];
    rows.forEach((row, index) => {
        const inputs = row.querySelectorAll("input");
        const name = inputs[0].value.trim() || `Subject ${index + 1}`;
        const mark = Number(inputs[1].value);
        if (!Number.isNaN(mark) && mark >= 0 && mark <= 100) {
            names.push(name);
            marks.push(mark);
        }
    });
    return { names, marks };
}

function applySearchFilter() {
    const q = searchSubject.value.trim().toLowerCase();
    const mode = filterMarks.value;
    document.querySelectorAll(".row").forEach((row) => {
        const inputs = row.querySelectorAll("input");
        const name = inputs[0].value.toLowerCase();
        const mark = Number(inputs[1].value);
        const nameMatch = !q || name.includes(q);
        const filterMatch = mode === "all" || (mode === "high" ? mark >= 75 : mark < 50);
        row.style.display = nameMatch && filterMatch ? "grid" : "none";
    });
}

function clampMarkInput(input) {
    const value = Number(input.value);
    if (input.value === "" || Number.isNaN(value)) return;
    const clamped = Math.max(0, Math.min(100, Math.round(value)));
    input.value = clamped;
}

function renderCharts(labels, data) {
    const ctx = document.getElementById("chart").getContext("2d");
    if (barChart) barChart.destroy();
    barChart = new Chart(ctx, {
        type: "bar",
        data: {
            labels,
            datasets: [{ label: "Marks", data, backgroundColor: "rgba(37,99,235,0.6)" }]
        },
        options: { animation: { duration: 900 }, scales: { y: { beginAtZero: true, max: 100 } } }
    });
}

function renderProgress(labels, data) {
    subjectProgress.innerHTML = "";
    const high = Math.max(...data);
    const low = Math.min(...data);
    labels.forEach((label, i) => {
        const item = document.createElement("div");
        item.className = "progress-item";
        if (data[i] === high) item.classList.add("best");
        if (data[i] === low) item.classList.add("weak");
        item.innerHTML = `<div class="progress-label">${label}: ${data[i]}</div><div class="progress-bar"><div style="width:${data[i]}%"></div></div>`;
        subjectProgress.appendChild(item);
    });
}

function renderReport(labels, data) {
    reportBody.innerHTML = "";
    labels.forEach((label, i) => {
        const grade = gradeFromPercent(data[i]);
        const tr = document.createElement("tr");
        tr.innerHTML = `<td>${label}</td><td>${data[i]}</td><td>${grade}</td>`;
        reportBody.appendChild(tr);
    });
}

function renderHistory() {
    attemptHistoryEl.innerHTML = "";
    if (!attemptHistory.length) {
        attemptHistoryEl.innerHTML = "<li>No attempts yet.</li>";
        return;
    }
    attemptHistory.forEach((item, idx) => {
        const li = document.createElement("li");
        li.textContent = `Attempt ${idx + 1} → ${item}%`;
        attemptHistoryEl.appendChild(li);
    });
}

function smartFeedback(labels, data, avg) {
    const lowCritical = data.some((m) => m < 40);
    const gap = Math.max(...data) - Math.min(...data);
    const strong = labels.filter((_, i) => data[i] >= 75);
    const weak = labels.filter((_, i) => data[i] < 50);
    const messages = [];

    if (avg > 85) messages.push("Excellent consistency.");
    if (lowCritical) messages.push("Critical improvement needed in one or more subjects.");
    if (gap > 35) messages.push("Performance imbalance detected.");
    if (!messages.length) messages.push("Stable performance, keep practicing.");

    smartInsight.textContent = messages.join(" ");
    categoryBreakdown.textContent = `Strong subjects: ${strong.join(", ") || "-"} | Weak subjects: ${weak.join(", ") || "-"}`;
}

function renderBadges(avg, previousAvg) {
    badges.innerHTML = "";
    const list = [];
    if (avg >= 90) list.push("🥇 Top Performer");
    if (previousAvg !== null && avg > previousAvg) list.push("📈 Improved Student");
    if (avg < 50) list.push("⚠ Needs Attention");
    if (!list.length) list.push("🎯 Keep Going");
    list.forEach((b) => {
        const span = document.createElement("span");
        span.className = "badge";
        span.textContent = b;
        badges.appendChild(span);
    });
}

function updateGoal(avg) {
    const target = Number(targetInput.value) || 0;
    const progress = target > 0 ? Math.min((avg / target) * 100, 100) : 0;
    goalFill.style.width = `${progress}%`;
    goalText.textContent = `Target: ${target}% | Current: ${avg.toFixed(2)}% | Progress: ${progress.toFixed(2)}%`;
    const diff = avg - target;
    targetMsg.textContent = diff >= 0
        ? `You are above target by ${diff.toFixed(2)}%.`
        : `You are below target by ${Math.abs(diff).toFixed(2)}%.`;
}

function calculate() {
    const { names, marks } = collectData();
    document.querySelectorAll(".row").forEach((r) => r.classList.remove("best-row", "weak-row"));
    if (!marks.length) {
        totalEl.textContent = "0";
        percentEl.textContent = "0%";
        gradeEl.textContent = "-";
        statusEl.textContent = "-";
        levelTag.textContent = "-";
        trendText.textContent = "-";
        smartInsight.textContent = "Add marks to view smart analysis.";
        renderCharts(["No Data"], [0]);
        renderProgress([], []);
        renderReport([], []);
        updateGoal(0);
        saveState();
        return;
    }

    const total = marks.reduce((a, b) => a + b, 0);
    const avg = total / marks.length;
    const grade = gradeFromPercent(avg);
    const level = levelFromPercent(avg);
    const highest = Math.max(...marks);
    const lowest = Math.min(...marks);
    const trend = highest - lowest <= 20 ? "↑ Improving" : "↓ Needs improvement";
    const prev = attemptHistory.length ? Number(attemptHistory[attemptHistory.length - 1]) : null;

    animateValue(totalEl, 0, total);
    animateValue(percentEl, 0, avg, "%");
    gradeEl.textContent = grade;
    gradeEl.className = grade;
    statusEl.textContent = grade === "F" ? "Fail ❌" : "Pass ✅";
    levelTag.textContent = level.text;
    levelTag.className = `level-tag ${level.cls}`;
    trendText.textContent = trend;

    highestEl.textContent = highest.toFixed(0);
    lowestEl.textContent = lowest.toFixed(0);
    averageEl.textContent = avg.toFixed(2);
    vsClassEl.textContent = `${(avg - 70 >= 0 ? "+" : "")}${(avg - 70).toFixed(2)}`;
    meterFill.style.width = `${avg}%`;

    const bestIndex = marks.indexOf(highest);
    const weakIndex = marks.indexOf(lowest);
    const rows = document.querySelectorAll(".row");
    rows[bestIndex]?.classList.add("best-row");
    rows[weakIndex]?.classList.add("weak-row");

    renderCharts(names, marks);
    renderProgress(names, marks);
    renderReport(names, marks);
    smartFeedback(names, marks, avg);
    renderBadges(avg, prev);
    updateGoal(avg);

    attemptHistory.push(avg.toFixed(2));
    attemptHistory = attemptHistory.slice(-3);
    localStorage.setItem("attemptHistory", JSON.stringify(attemptHistory));
    renderHistory();

    showToast("Calculation complete!");
    saveState();
}

function addSubject(name = "", marks = "") {
    const div = document.createElement("div");
    div.className = "row";
    div.innerHTML = `<input type="text" placeholder="Subject Name" value="${name}"><input type="number" placeholder="Marks (0-100)" min="0" max="100" step="1" value="${marks}"><button class="remove-btn" type="button" onclick="removeSubject(this)">✕</button>`;
    subjectsDiv.appendChild(div);
    div.querySelectorAll("input").forEach((i) => i.addEventListener("input", () => {
        applySearchFilter();
        calculate();
    }));
    const markInput = div.querySelector('input[type="number"]');
    markInput.addEventListener("blur", () => {
        clampMarkInput(markInput);
        calculate();
    });
    showToast("New subject added.");
}

function removeSubject(btn) {
    if (document.querySelectorAll(".row").length <= 1) return;
    btn.parentElement.remove();
    calculate();
}

function saveState() {
    const rows = [...document.querySelectorAll(".row")].map((row) => {
        const inputs = row.querySelectorAll("input");
        return { name: inputs[0].value, marks: inputs[1].value };
    });
    localStorage.setItem("resultAnalyzerState", JSON.stringify({
        theme: themeSelect.value,
        subjects: rows,
        target: targetInput.value
    }));
}

function loadState() {
    const raw = localStorage.getItem("resultAnalyzerState");
    if (!raw) {
        document.querySelectorAll(".row input").forEach((i) => i.addEventListener("input", calculate));
        calculate();
        renderHistory();
        return;
    }
    const state = JSON.parse(raw);
    if (state.theme) {
        themeSelect.value = state.theme;
        applyTheme(state.theme);
    }
    if (state.subjects?.length) {
        subjectsDiv.innerHTML = "";
        state.subjects.forEach((s) => addSubject(s.name || "", s.marks || ""));
    } else {
        document.querySelectorAll(".row input").forEach((i) => i.addEventListener("input", calculate));
    }
    if (state.target) targetInput.value = state.target;
    calculate();
    renderHistory();
}

function applyTheme(theme) {
    document.body.classList.remove("theme-green", "theme-dark");
    if (theme === "green") document.body.classList.add("theme-green");
    if (theme === "dark") document.body.classList.add("theme-dark");
}

function addCardTiltEffect() {
    const cards = document.querySelectorAll(".card");
    const disableTilt = window.matchMedia("(max-width: 760px)").matches;
    if (disableTilt) return;

    cards.forEach((card) => {
        card.addEventListener("mousemove", (event) => {
            const rect = card.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;
            const rotateY = ((x / rect.width) - 0.5) * 6;
            const rotateX = (0.5 - (y / rect.height)) * 6;
            card.style.transform = `translateY(-4px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
        });
        card.addEventListener("mouseleave", () => {
            card.style.transform = "";
        });
    });
}

themeSelect.addEventListener("change", () => {
    applyTheme(themeSelect.value);
    saveState();
});

menuBtn.addEventListener("click", () => {
    navRight.classList.toggle("show");
});

document.querySelectorAll("nav a").forEach((a) => {
    a.addEventListener("click", () => {
        navRight.classList.remove("show");
    });
});

tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
        tabs.forEach((t) => t.classList.remove("active"));
        panels.forEach((p) => p.classList.remove("active"));
        tab.classList.add("active");
        document.getElementById(tab.dataset.tab).classList.add("active");
    });
});

document.querySelectorAll("a[data-tab-link]").forEach((link) => {
    link.addEventListener("click", (event) => {
        event.preventDefault();
        const target = link.getAttribute("data-tab-link");
        tabs.forEach((t) => t.classList.toggle("active", t.dataset.tab === target));
        panels.forEach((p) => p.classList.toggle("active", p.id === target));
        window.scrollTo({ top: 0, behavior: "smooth" });
    });
});

searchSubject.addEventListener("input", applySearchFilter);
filterMarks.addEventListener("change", applySearchFilter);
targetInput.addEventListener("input", calculate);

printBtn.addEventListener("click", () => window.print());
resetBtn.addEventListener("click", () => {
    if (!window.confirm("Reset all subjects and results?")) return;
    subjectsDiv.innerHTML = "";
    addSubject();
    targetInput.value = 85;
    calculate();
});

document.addEventListener("keydown", (event) => {
    if (event.ctrlKey && event.key === "Enter") calculate();
});

loadState();
addCardTiltEffect();
window.addSubject = addSubject;
window.removeSubject = removeSubject;
window.calculate = calculate;
