import {
    formatMonthLabel,
    listMonthsWithDataForSeed,
    seedMonthFromSource
} from "../../data/monthly-storage.js";
import { calculateTotalEstimatedIncome } from "../calc/calcProjects.js";
import { openModal, closeModal } from "../../ui/modal/modal.js";
import { getCurrentMonth, getCurrentYear } from "../../ui/period/period-state.js";

function renderSeedRows(months) {
    if (!months.length) {
        return `<p class="seed-data-popup__empty">No other months with data. Switch period or add data to another month first.</p>`;
    }
    const rows = months.map((m) => {
        const income = calculateTotalEstimatedIncome(m.projects, m.employees, m.year, m.month);
        const incomeClass = income >= 0 ? "income-positive" : "income-negative";
        return `<tr>
            <td>${m.label}</td>
            <td>${m.projects.length}</td>
            <td>${m.employees.length}</td>
            <td class="${incomeClass}">$${income.toFixed(2)}</td>
            <td>
                <button type="button" class="seed-data-popup__seed-btn sidebar__button"
                    data-seed-from="${m.year}" data-seed-month="${m.month}">
                    Seed
                </button>
            </td>
        </tr>`;
    }).join("");
    return `
        <div class="seed-data-popup__table-wrap">
            <table class="table seed-data-popup__table">
                <thead>
                    <tr>
                        <th>Month</th>
                        <th>Projects</th>
                        <th>Employees</th>
                        <th>Total estimated income</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
        </div>
    `;
}

export function openSeedDataPopup() {
    const year = getCurrentYear();
    const month = getCurrentMonth();
    const targetLabel = formatMonthLabel(year, month);
    const months = listMonthsWithDataForSeed(year, month);

    const content = document.querySelector("[data-modal-content]");
    const modal = document.querySelector("[data-modal]");
    modal?.classList.add("modal--wide");
    content.innerHTML = `
        <div class="seed-data-popup">
            <h2>Seed data</h2>
            <p class="seed-data-popup__hint">Choose a month to copy into <strong>${targetLabel}</strong> (current period).</p>
            ${renderSeedRows(months)}
        </div>
    `;
    openModal();

    content.querySelectorAll("[data-seed-from]").forEach((btn) => {
        btn.addEventListener("click", () => {
            const sourceYear = Number(btn.dataset.seedFrom);
            const sourceMonth = Number(btn.dataset.seedMonth);
            const sourceLabel = formatMonthLabel(sourceYear, sourceMonth);
            const msg = `Copy all projects and employees from ${sourceLabel} into ${targetLabel}?`;
            if (!confirm(msg)) return;

            const ok = seedMonthFromSource(year, month, sourceYear, sourceMonth);
            if (!ok) {
                alert("Could not seed from that month.");
                return;
            }
            closeModal();
        });
    });
}
