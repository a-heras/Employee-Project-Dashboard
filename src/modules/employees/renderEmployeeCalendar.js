import { getWorkingDaysInMonth, getVacationWorkingDays } from "../calc/vacation.js";
import { getEmployees, updateEmployee } from "../../data/monthly-storage.js";
import { getCurrentYear, getCurrentMonth } from "../../ui/period/period-state.js";
import { openModal, closeModal } from "../../ui/modal/modal.js";

export function renderEmployeeCalendar(employeeId) {
    const year = getCurrentYear();
    const month = getCurrentMonth();
    const employees = getEmployees(year, month);
    const emp = employees.find((e) => e.id === employeeId);
    const vacationDays = emp.vacation?.[`${year}-${month}`] || [];
    const container = document.querySelector("[data-modal-content]");
    container.innerHTML = `
        <div class="calendar-popup"><h2>${emp.name} ${emp.surname} - Availability</h2>
            <div class="calendar-header">${formatMonthYear(year, month)}</div>
            <div class="calendar-weekdays">${renderWeekdays()}</div>
            <div class="calendar-grid">${renderCalendarGrid(year, month, vacationDays)}</div>
            <div class="calendar-info">
                <p>Working Days: 
                    <span data-working-info>
                        ${getWorkingDaysInMonth(year, month) - getVacationWorkingDays(vacationDays, year, month)} / ${getWorkingDaysInMonth(year, month)}
                    </span>
                </p>
            </div>
            <div class="calendar-actions">
                <p>Vacation Days:
                    <span data-vacation-info>
                        ${formatVacationRanges(vacationDays, year, month)}
                    </span>
                </p>
                <button class="calendar-save-btn" data-save-calendar>Set Vacation</button>
            </div>
        </div>`;
    openModal();
    attachCalendarEvents(emp, year, month);
}

function formatMonthYear(year, month) {
    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    return `${months[month]} ${year}`;
}
function renderWeekdays() {
    return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => `<div class="calendar-weekday">${d}</div>`).join("");
}
function renderCalendarGrid(year, month, vacationDays) {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    let html = "";
    const offset = new Date(year, month, 1).getDay();
    for (let i = 0; i < offset; i++) html += `<div class="calendar-day calendar-day--empty"></div>`;
    for (let d = 1; d <= daysInMonth; d++) {
        const date = new Date(year, month, d);
        const day = date.getDay();
        const isToday = (() => { const t = new Date(); return t.getFullYear() === year && t.getMonth() === month && t.getDate() === d; })();
        html += `<div class="calendar-day ${day === 0 || day === 6 ? " weekend" : ""}${vacationDays.includes(d) ? " vacation" : ""}${isToday ? " today" : ""}" data-day="${d}">${d}</div>`;
    }
    return html;
}
function updateCalendarInfo(container, year, month) {
    const selected = [...container.querySelectorAll(".calendar-day.vacation")].map((el) => Number(el.dataset.day));
    const workingDays = getWorkingDaysInMonth(year, month);
    const vacationWorking = getVacationWorkingDays(selected, year, month);
    container.querySelector("[data-working-info]").textContent = `${workingDays - vacationWorking} / ${workingDays}`;
    container.querySelector("[data-vacation-info]").textContent = formatVacationRanges(selected, year, month);
}
function attachCalendarEvents(emp, year, month) {
    const container = document.querySelector("[data-modal-content]");
    container.querySelectorAll(".calendar-day").forEach((dayEl) => {
        if (dayEl.classList.contains("calendar-day--empty")) return;
        dayEl.addEventListener("click", () => { dayEl.classList.toggle("vacation"); updateCalendarInfo(container, year, month); });
    });
    container.querySelector("[data-save-calendar]").addEventListener("click", () => {
        const selected = [...container.querySelectorAll(".calendar-day.vacation")].map((el) => Number(el.dataset.day));
        const employees = getEmployees(year, month);
        const source = employees.find((e) => e.id === emp.id);
        if (!source) return;
        updateEmployee(year, month, { ...source, vacation: { ...(source.vacation || {}), [`${year}-${month}`]: selected } });
        closeModal();
        document.dispatchEvent(new CustomEvent("data-updated"));
    });
}
function formatVacationRanges(days, year, month) {
    if (!days.length) return "None";
    days.sort((a, b) => a - b);
    const ranges = [];
    let start = days[0], prev = days[0];
    for (let i = 1; i < days.length; i++) {
        if (days[i] !== prev + 1) { ranges.push(formatRange(start, prev, month)); start = days[i]; }
        prev = days[i];
    }
    ranges.push(formatRange(start, prev, month));
    return ranges.join(", ");
}
function formatRange(start, end, month) {
    const m = String(month + 1).padStart(2, "0");
    if (start === end) return `${String(start).padStart(2, "0")}.${m}`;
    return `${String(start).padStart(2, "0")}.${m}-${String(end).padStart(2, "0")}.${m}`;
}