import { getEmployees, getProjects, deleteProject } from "../../data/monthly-storage.js";
import {
    getEmployeesAssignedToProject,
    calculateProjectUsedCapacity,
    calculateProjectProfit,
    calculateTotalEstimatedIncome
} from "../calc/calcProjects.js";

const projectsViewState = {
    sortBy: null,
    sortDir: "asc",
    filters: {
        companyName: "",
        projectName: ""
    }
};
let projectsFilterPopupHandler = null;

export function prepareSeeAtProject(projectName) {
    projectsViewState.filters.companyName = "";
    projectsViewState.filters.projectName = String(projectName || "").trim();
}

function sortIndicator(column) {
    if (projectsViewState.sortBy !== column) return "↕";
    return projectsViewState.sortDir === "asc" ? "↑" : "↓";
}

function normalizeText(value) {
    return String(value || "").trim().toLowerCase();
}

function calculateBenchPayments(employees) {
    return employees.reduce((total, emp) => {
        const assignments = emp.assignments || [];
        if (assignments.length === 0) {
            return total + (Number(emp.salary) * 0.5);
        }
        return total;
    }, 0);
}

export function renderProjectsTable(year, month){
    const projects = getProjects(year, month);
    const employees = getEmployees(year, month);

    let rowsData = projects.map(project => {
        const assigned = getEmployeesAssignedToProject(employees, project.id);
        const usedCap = calculateProjectUsedCapacity(employees, project.id, year, month);
        const profit = calculateProjectProfit(project, employees, year, month);
        return {
            project,
            assignedCount: assigned.length,
            usedCap,
            profit
        };
    });

    const companyFilter = normalizeText(projectsViewState.filters.companyName);
    const projectFilter = normalizeText(projectsViewState.filters.projectName);
    rowsData = rowsData.filter(({ project }) => {
        const byCompany = !companyFilter || normalizeText(project.companyName).includes(companyFilter);
        const byProject = !projectFilter || normalizeText(project.projectName).includes(projectFilter);
        return byCompany && byProject;
    });

    if (projectsViewState.sortBy) {
        const dir = projectsViewState.sortDir === "asc" ? 1 : -1;
        rowsData.sort((a, b) => {
            const sa = a.project;
            const sb = b.project;
            switch (projectsViewState.sortBy) {
                case "companyName":
                    return normalizeText(sa.companyName).localeCompare(normalizeText(sb.companyName)) * dir;
                case "projectName":
                    return normalizeText(sa.projectName).localeCompare(normalizeText(sb.projectName)) * dir;
                case "budget":
                    return (Number(sa.budget) - Number(sb.budget)) * dir;
                case "capacity":
                    return (a.usedCap - b.usedCap) * dir;
                case "profit":
                    return (a.profit - b.profit) * dir;
                default:
                    return 0;
            }
        });
    }

    const rows = rowsData.map(({ project, assignedCount, usedCap, profit }) => `
            <tr data-id="${project.id}">
                <td>${project.companyName}</td>
                <td>${project.projectName}</td>
                <td>$${project.budget.toFixed(2)}</td>
                <td class="${usedCap > project.capacity ? "over-capacity" : ""}">
                    ${usedCap}/${project.capacity}
                </td>
                <td>
                    ${assignedCount > 0 ? `
                        <button class="show-employees-btn" data-id="${project.id}">
                            Show Employees (${assignedCount})
                        </button>
                    ` : "—"}
                </td>
                <td class="${profit >= 0 ? "income-positive" : "income-negative"}">
                    $${profit.toFixed(2)}
                </td>
                <td>
                    <button class="delete-project-btn" data-id="${project.id}">
                        Delete
                    </button>
                </td>
            </tr>
        `
    ).join("");

    const activeProjectFilterEntries = Object.entries(projectsViewState.filters).filter(
        ([, value]) => String(value).trim() !== ""
    );
    const activeFilterChips = activeProjectFilterEntries
        .map(([key, value]) => {
            const label = key === "companyName" ? "Company Name" : "Project Name";
            return `
                <button type="button" class="projects-filter-chip" data-project-filter-remove="${key}">
                    ${label}: ${value}
                    <span class="projects-filter-chip__x">×</span>
                </button>
            `;
        })
        .join("");
    const projectsClearFiltersChip =
        activeProjectFilterEntries.length >= 2
            ? `<button type="button" class="projects-filter-chip projects-filter-chip--muted" data-project-filter-clear-all>Clear Filters</button>`
            : "";

    const projectsChipsRow =
        activeFilterChips || projectsClearFiltersChip
            ? `<div class="projects-filter-chips">${activeFilterChips}${projectsClearFiltersChip}</div>`
            : "";

    document.querySelector("#content").innerHTML = `
        ${projectsChipsRow}
        <table class="table">
            <thead>
                <tr>
                    <th class="projects-sortable" data-project-sort="companyName">
                        <span class="projects-sort-label">Company Name</span>
                        <span class="projects-sort-indicator">${sortIndicator("companyName")}</span>
                        <button class="projects-filter-toggle" data-project-filter-toggle="companyName">⌕</button>
                    </th>
                    <th class="projects-sortable" data-project-sort="projectName">
                        <span class="projects-sort-label">Project Name</span>
                        <span class="projects-sort-indicator">${sortIndicator("projectName")}</span>
                        <button class="projects-filter-toggle" data-project-filter-toggle="projectName">⌕</button>
                    </th>
                    <th class="projects-sortable" data-project-sort="budget">
                        <span class="projects-sort-label">Budget</span>
                        <span class="projects-sort-indicator">${sortIndicator("budget")}</span>
                    </th>
                    <th class="projects-sortable" data-project-sort="capacity">
                        <span class="projects-sort-label">Employee Capacity</span>
                        <span class="projects-sort-indicator">${sortIndicator("capacity")}</span>
                    </th>
                    <th>
                        Employees
                    </th>
                    <th class="projects-sortable" data-project-sort="profit">
                        <span class="projects-sort-label">Estimated Income</span>
                        <span class="projects-sort-indicator">${sortIndicator("profit")}</span>
                    </th>
                    <th>
                        Actions
                    </th>
                </tr>
            </thead>
            <tbody>${rows}</tbody>
        </table>
    `;

    const total = calculateTotalEstimatedIncome(projects, employees, year, month);
    const benchPayments = calculateBenchPayments(employees);

    document.querySelector("[data-summary-container]").innerHTML = `
        <div class="total-income">
            Total Estimated Income: 
            <span class="${total >= 0 ? "income-positive" : "income-negative"}">
                $${total.toFixed(2)}
            </span>
            ${benchPayments > 0
                ? `<span class="total-income__bench">(Bench payments: $${benchPayments.toFixed(2)})</span>`
                : ""}
        </div>
    `;

    attachProjectTableEvents(year, month);

    document.querySelectorAll(".show-employees-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const id = btn.dataset.id;

            document.dispatchEvent(new CustomEvent("show-project-employees", {
                detail: { projectId: id }
            }));
        });
    });

    document.querySelectorAll("[data-project-sort]").forEach((header) => {
        header.addEventListener("click", () => {
            const column = header.dataset.projectSort;
            if (projectsViewState.sortBy === column) {
                projectsViewState.sortDir = projectsViewState.sortDir === "asc" ? "desc" : "asc";
            } else {
                projectsViewState.sortBy = column;
                projectsViewState.sortDir = "asc";
            }
            renderProjectsTable(year, month);
        });
    });

    document.querySelectorAll("[data-project-filter-remove]").forEach((chip) => {
        chip.addEventListener("click", () => {
            const key = chip.dataset.projectFilterRemove;
            projectsViewState.filters[key] = "";
            renderProjectsTable(year, month);
        });
    });

    document.querySelectorAll("[data-project-filter-clear-all]").forEach((btn) => {
        btn.addEventListener("click", () => {
            projectsViewState.filters.companyName = "";
            projectsViewState.filters.projectName = "";
            renderProjectsTable(year, month);
        });
    });

    document.querySelectorAll("[data-project-filter-toggle]").forEach((button) => {
        button.addEventListener("click", (event) => {
            event.stopPropagation();
            openFilterPopup(button, year, month);
        });
    });

    function attachProjectTableEvents(year, month) {
        document.querySelectorAll(".delete-project-btn").forEach(btn => {
            btn.addEventListener("click", () => {
                const id = btn.dataset.id;
                const row = btn.closest("tr");
                const projectName = row?.cells?.[1]?.textContent?.trim() || "this project";

                if (!confirm(`Delete project "${projectName}"?`)) return;

                deleteProject(year, month, id);
                document.dispatchEvent(new CustomEvent("data-updated"));
            });
        });
    }
}

function openFilterPopup(anchor, year, month) {
    const key = anchor.dataset.projectFilterToggle;
    const prev = document.querySelector(".projects-filter-popup");
    prev?.remove();

    const popup = document.createElement("div");
    popup.className = "projects-filter-popup";
    const label = key === "companyName" ? "Company Name" : "Project Name";
    popup.innerHTML = `
        <input class="projects-filter-input" data-popup-filter-input value="${projectsViewState.filters[key] || ""}" placeholder="Filter ${label}">
        <div class="projects-filter-popup__actions">
            <button class="projects-filter-popup__btn" data-popup-filter-clear>Cancel</button>
            <button class="projects-filter-popup__btn" data-popup-filter-apply>Apply</button>
        </div>
    `;
    document.body.appendChild(popup);

    const rect = anchor.getBoundingClientRect();
    popup.style.left = `${Math.min(window.innerWidth - popup.offsetWidth - 10, rect.left + window.scrollX)}px`;
    popup.style.top = `${rect.bottom + window.scrollY + 6}px`;

    const input = popup.querySelector("[data-popup-filter-input]");
    input?.focus();

    const closePopup = () => {
        popup.remove();
        if (projectsFilterPopupHandler) {
            document.removeEventListener("click", projectsFilterPopupHandler, true);
            projectsFilterPopupHandler = null;
        }
    };

    popup.querySelector("[data-popup-filter-apply]")?.addEventListener("click", () => {
        projectsViewState.filters[key] = input?.value || "";
        closePopup();
        renderProjectsTable(year, month);
    });
    popup.querySelector("[data-popup-filter-clear]")?.addEventListener("click", () => {
        projectsViewState.filters[key] = "";
        closePopup();
        renderProjectsTable(year, month);
    });
    input?.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            projectsViewState.filters[key] = input.value || "";
            closePopup();
            renderProjectsTable(year, month);
        }
    });

    projectsFilterPopupHandler = (e) => {
        if (!popup.contains(e.target) && e.target !== anchor) {
            closePopup();
        }
    };
    setTimeout(() => document.addEventListener("click", projectsFilterPopupHandler, true), 0);
}