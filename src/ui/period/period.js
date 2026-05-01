import { getCurrentYear, getCurrentMonth, setCurrentPeriod } from "./period-state.js";

export function initPeriod() {
    const yearSelect = document.querySelector("[data-year-select]");
    const monthSelect = document.querySelector("[data-month-select]");
    const label = document.querySelector("[data-current-period-label]");
    yearSelect.value = getCurrentYear();
    monthSelect.value = getCurrentMonth();
    const months = ["January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"];

    function updateLabel() {
        const year = yearSelect.value;
        const monthIndex = Number(monthSelect.value);
        label.textContent = `${months[monthIndex]} ${year}`;
        setCurrentPeriod(year, monthIndex);
        document.dispatchEvent(new CustomEvent("period-changed"));
    }
    yearSelect.addEventListener("change", updateLabel);
    monthSelect.addEventListener("change", updateLabel);
    updateLabel();
}