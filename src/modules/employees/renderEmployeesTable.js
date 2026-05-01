import { getEmployees, getProjects, deleteEmployee } from "../../data/monthly-storage.js";
import {
    calculateAge,
    calculateEmployeePayment,
    calculateEmployeeProjectedIncome,
    calculateEmployeeEffectiveCapacity
} from "../calc/calcEmployees.js";

const employeesViewState = {
    sortBy: null,
    sortDir: "asc",
    filters: {
        name: "",
        surname: "",
        position: ""
    }
};

const POSITION_OPTIONS = ["Junior", "Middle", "Senior", "Lead", "Architect", "BO"];

let employeesFilterPopupHandler = null;

function sortIndicator(column) {
    if (employeesViewState.sortBy !== column) return "↕";
    return employeesViewState.sortDir === "asc" ? "↑" : "↓";
}

function normalizeText(value) {
    return String(value || "").trim().toLowerCase();
}

function chipLabel(key) {
    if (key === "name") return "Name";
    if (key === "surname") return "Surname";
    return "Position";
}

export function prepareSeeAtEmployee(name, surname) {
    employeesViewState.filters.name = String(name || "").trim();
    employeesViewState.filters.surname = String(surname || "").trim();
    employeesViewState.filters.position = "";
}

export function renderEmployeesTable(year, month) {
    const employees = getEmployees(year, month);
    const projects = getProjects(year, month);

    let rowsData = employees.map((emp) => {
        const age = calculateAge(emp.dob);
        const estimatedPayment = calculateEmployeePayment(emp);
        const projectedIncome = calculateEmployeeProjectedIncome(emp, projects, employees, year, month);
        const assignments = emp.assignments || [];
        const usedCap = assignments.reduce((sum, a) => sum + a.capacity, 0);
        calculateEmployeeEffectiveCapacity(emp, year, month);
        return {
            emp,
            age,
            estimatedPayment,
            projectedIncome,
            assignments,
            usedCap
        };
    });

    const nameFilter = normalizeText(employeesViewState.filters.name);
    const surnameFilter = normalizeText(employeesViewState.filters.surname);
    const positionFilter = String(employeesViewState.filters.position || "").trim();

    rowsData = rowsData.filter(({ emp }) => {
        const byName = !nameFilter || normalizeText(emp.name).includes(nameFilter);
        const bySurname = !surnameFilter || normalizeText(emp.surname).includes(surnameFilter);
        const byPosition =
            !positionFilter ||
            normalizeText(emp.position) === normalizeText(positionFilter);
        return byName && bySurname && byPosition;
    });

    if (employeesViewState.sortBy) {
        const dir = employeesViewState.sortDir === "asc" ? 1 : -1;
        rowsData.sort((a, b) => {
            const ea = a.emp;
            const eb = b.emp;
            switch (employeesViewState.sortBy) {
                case "name":
                    return normalizeText(ea.name).localeCompare(normalizeText(eb.name)) * dir;
                case "surname":
                    return normalizeText(ea.surname).localeCompare(normalizeText(eb.surname)) * dir;
                case "age":
                    return (a.age - b.age) * dir;
                case "position":
                    return normalizeText(ea.position).localeCompare(normalizeText(eb.position)) * dir;
                case "salary":
                    return (Number(ea.salary) - Number(eb.salary)) * dir;
                case "estimatedPayment":
                    return (a.estimatedPayment - b.estimatedPayment) * dir;
                case "projectedIncome":
                    return (a.projectedIncome - b.projectedIncome) * dir;
                default:
                    return 0;
            }
        });
    }

    const maxCap = 1.5;
    const noProjects = projects.length === 0;
    const rows = rowsData.map(({ emp, age, estimatedPayment, projectedIncome, assignments, usedCap }) => {
        const projectCell = (noProjects || assignments.length === 0)
            ? `<td>—</td>`
            : `<td><button type="button" class="show-assignments-btn" data-id="${emp.id}">Show Assignments (${assignments.length}); ${usedCap.toFixed(1)}/${maxCap}</button></td>`;
        const assignDisabled = noProjects || usedCap >= maxCap;
        return `
            <tr data-id="${emp.id}">
                <td>${emp.name}</td>
                <td>${emp.surname}</td>
                <td>${age}</td>
                <td class="editable-position editable-cell--view" data-id="${emp.id}" title="Click to edit position">
                    <span class="editable-cell-row">
                        <span class="editable-cell-value">${emp.position}</span>
                        <span class="editable-cell-pencil" aria-hidden="true"></span>
                    </span>
                </td>
                <td class="editable-salary editable-cell--view" data-id="${emp.id}" title="Click to edit salary">
                    <span class="editable-cell-row editable-cell-row--salary">
                        <span class="editable-cell-value">$${emp.salary.toFixed(2)}</span>
                        <span class="editable-cell-pencil" aria-hidden="true"></span>
                    </span>
                </td>
                <td>$${estimatedPayment.toFixed(2)}</td>
                ${projectCell}
                <td class="${projectedIncome >= 0 ? "income-positive" : "income-negative"}">$${projectedIncome.toFixed(2)}</td>
                <td>
                    <button type="button" class="availability-btn" data-id="${emp.id}">Availability</button>
                    <button type="button" class="assign-btn" data-id="${emp.id}" ${assignDisabled ? "disabled" : ""}>Assign</button>
                    <button type="button" class="delete-employee-btn" data-id="${emp.id}">Delete</button>
                </td>
            </tr>`;
    }).join("");

    const activeEntries = Object.entries(employeesViewState.filters).filter(
        ([, value]) => String(value).trim() !== ""
    );
    const activeFilterChips = activeEntries
        .map(([key, value]) => `
                <button type="button" class="projects-filter-chip" data-employee-filter-remove="${key}">
                    ${chipLabel(key)}: ${value}
                    <span class="projects-filter-chip__x">×</span>
                </button>
            `)
        .join("");
    const clearFiltersChip =
        activeEntries.length >= 2
            ? `<button type="button" class="projects-filter-chip employees-filter-chip--muted" data-employee-filter-clear-all>Clear Filters</button>`
            : "";

    const chipsBlock =
        activeFilterChips || clearFiltersChip
            ? `<div class="projects-filter-chips">${activeFilterChips}${clearFiltersChip}</div>`
            : "";

    const summary = document.querySelector("[data-summary-container]");
    if (summary) summary.innerHTML = "";

    document.querySelector("#content").innerHTML = `
        ${chipsBlock}
        <table class="table">
            <thead>
                <tr>
                    <th class="projects-sortable" data-employee-sort="name">
                        <span class="projects-sort-label">Name</span>
                        <span class="projects-sort-indicator">${sortIndicator("name")}</span>
                        <button type="button" class="projects-filter-toggle" data-employee-filter-toggle="name">⌕</button>
                    </th>
                    <th class="projects-sortable" data-employee-sort="surname">
                        <span class="projects-sort-label">Surname</span>
                        <span class="projects-sort-indicator">${sortIndicator("surname")}</span>
                        <button type="button" class="projects-filter-toggle" data-employee-filter-toggle="surname">⌕</button>
                    </th>
                    <th class="projects-sortable" data-employee-sort="age">
                        <span class="projects-sort-label">Age</span>
                        <span class="projects-sort-indicator">${sortIndicator("age")}</span>
                    </th>
                    <th class="projects-sortable" data-employee-sort="position">
                        <span class="projects-sort-label">Position</span>
                        <span class="projects-sort-indicator">${sortIndicator("position")}</span>
                        <button type="button" class="projects-filter-toggle" data-employee-filter-toggle="position">⌕</button>
                    </th>
                    <th class="projects-sortable" data-employee-sort="salary">
                        <span class="projects-sort-label">Salary</span>
                        <span class="projects-sort-indicator">${sortIndicator("salary")}</span>
                    </th>
                    <th class="projects-sortable" data-employee-sort="estimatedPayment">
                        <span class="projects-sort-label">Estimated Payment</span>
                        <span class="projects-sort-indicator">${sortIndicator("estimatedPayment")}</span>
                    </th>
                    <th>
                        <span class="projects-sort-label">Project</span>
                    </th>
                    <th class="projects-sortable" data-employee-sort="projectedIncome">
                        <span class="projects-sort-label">Projected Income</span>
                        <span class="projects-sort-indicator">${sortIndicator("projectedIncome")}</span>
                    </th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>${rows}</tbody>
        </table>`;

    attachEmployeeTableEvents(year, month);

    document.querySelectorAll("[data-employee-sort]").forEach((header) => {
        header.addEventListener("click", () => {
            const column = header.dataset.employeeSort;
            if (employeesViewState.sortBy === column) {
                employeesViewState.sortDir = employeesViewState.sortDir === "asc" ? "desc" : "asc";
            } else {
                employeesViewState.sortBy = column;
                employeesViewState.sortDir = "asc";
            }
            renderEmployeesTable(year, month);
        });
    });

    document.querySelectorAll("[data-employee-filter-toggle]").forEach((button) => {
        button.addEventListener("click", (event) => {
            event.preventDefault();
            event.stopPropagation();
            openEmployeeFilterPopup(button, year, month);
        });
    });

    document.querySelectorAll("[data-employee-filter-remove]").forEach((chip) => {
        chip.addEventListener("click", () => {
            const key = chip.dataset.employeeFilterRemove;
            employeesViewState.filters[key] = "";
            renderEmployeesTable(year, month);
        });
    });

    document.querySelectorAll("[data-employee-filter-clear-all]").forEach((btn) => {
        btn.addEventListener("click", () => {
            employeesViewState.filters.name = "";
            employeesViewState.filters.surname = "";
            employeesViewState.filters.position = "";
            renderEmployeesTable(year, month);
        });
    });
}

function attachEmployeeTableEvents(year, month) {
    document.querySelectorAll(".delete-employee-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
            const id = btn.dataset.id;
            const row = btn.closest("tr");
            const name = row?.cells?.[0]?.textContent?.trim() ?? "";
            const surname = row?.cells?.[1]?.textContent?.trim() ?? "";
            const label = [name, surname].filter(Boolean).join(" ") || "this employee";

            if (!confirm(`Delete employee "${label}"?`)) return;
            deleteEmployee(year, month, id);
            document.dispatchEvent(new CustomEvent("data-updated"));
        });
    });
    document.querySelectorAll(".show-assignments-btn").forEach((btn) => btn.addEventListener("click", () => {
        document.dispatchEvent(new CustomEvent("show-employee-assignments", { detail: { employeeId: btn.dataset.id } }));
    }));
    document.querySelectorAll(".availability-btn").forEach((btn) => btn.addEventListener("click", () => {
        document.dispatchEvent(new CustomEvent("show-employee-calendar", { detail: { employeeId: btn.dataset.id } }));
    }));
    document.querySelectorAll(".assign-btn").forEach((btn) => btn.addEventListener("click", () => {
        document.dispatchEvent(new CustomEvent("assign-employee", { detail: { employeeId: btn.dataset.id, anchor: btn } }));
    }));
    document.querySelectorAll(".editable-position").forEach((cell) => cell.addEventListener("click", () => {
        document.dispatchEvent(new CustomEvent("edit-employee-position", { detail: { employeeId: cell.dataset.id } }));
    }));
    document.querySelectorAll(".editable-salary").forEach((cell) => cell.addEventListener("click", () => {
        document.dispatchEvent(new CustomEvent("edit-employee-salary", { detail: { employeeId: cell.dataset.id } }));
    }));
}

function openEmployeeFilterPopup(anchor, year, month) {
    const key = anchor.dataset.employeeFilterToggle;
    document.querySelector(".projects-filter-popup")?.remove();

    const popup = document.createElement("div");
    popup.className = "projects-filter-popup";

    if (key === "position") {
        const current = employeesViewState.filters.position || "";
        const optionsHtml = [
            `<option value="">All positions</option>`,
            ...POSITION_OPTIONS.map(
                (opt) =>
                    `<option value="${opt}" ${opt === current ? "selected" : ""}>${opt}</option>`
            )
        ].join("");
        popup.innerHTML = `
            <label class="employees-filter-popup__label">Position</label>
            <select class="projects-filter-input" data-employee-filter-select>${optionsHtml}</select>
            <div class="projects-filter-popup__actions">
                <button type="button" class="projects-filter-popup__btn" data-employee-filter-cancel>Cancel</button>
            </div>`;
    } else {
        const label = key === "name" ? "Name" : "Surname";
        popup.innerHTML = `
            <input type="text" class="projects-filter-input" data-popup-filter-input value="${employeesViewState.filters[key] || ""}" placeholder="Filter ${label}">
            <div class="projects-filter-popup__actions">
                <button type="button" class="projects-filter-popup__btn" data-popup-filter-clear>Cancel</button>
                <button type="button" class="projects-filter-popup__btn" data-popup-filter-apply>Apply</button>
            </div>`;
    }

    document.body.appendChild(popup);

    const rect = anchor.getBoundingClientRect();
    popup.style.left = `${Math.min(window.innerWidth - popup.offsetWidth - 10, rect.left + window.scrollX)}px`;
    popup.style.top = `${rect.bottom + window.scrollY + 6}px`;

    const closePopup = () => {
        popup.remove();
        if (employeesFilterPopupHandler) {
            document.removeEventListener("click", employeesFilterPopupHandler, true);
            employeesFilterPopupHandler = null;
        }
    };

    if (key === "position") {
        const select = popup.querySelector("[data-employee-filter-select]");
        select?.focus();
        select?.addEventListener("change", () => {
            employeesViewState.filters.position = select.value || "";
            closePopup();
            renderEmployeesTable(year, month);
        });
        popup.querySelector("[data-employee-filter-cancel]")?.addEventListener("click", () => {
            employeesViewState.filters.position = "";
            closePopup();
            renderEmployeesTable(year, month);
        });
    } else {
        const input = popup.querySelector("[data-popup-filter-input]");
        input?.focus();
        popup.querySelector("[data-popup-filter-apply]")?.addEventListener("click", () => {
            employeesViewState.filters[key] = input?.value || "";
            closePopup();
            renderEmployeesTable(year, month);
        });
        popup.querySelector("[data-popup-filter-clear]")?.addEventListener("click", () => {
            employeesViewState.filters[key] = "";
            closePopup();
            renderEmployeesTable(year, month);
        });
        input?.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                employeesViewState.filters[key] = input.value || "";
                closePopup();
                renderEmployeesTable(year, month);
            }
        });
    }

    employeesFilterPopupHandler = (e) => {
        if (!popup.contains(e.target) && e.target !== anchor) {
            closePopup();
        }
    };
    setTimeout(() => document.addEventListener("click", employeesFilterPopupHandler, true), 0);
}
