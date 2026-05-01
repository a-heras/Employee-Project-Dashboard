import { getEmployees, getProjects, updateEmployee } from "../../data/monthly-storage.js";
import {
    calculateAssignmentRevenue,
    calculateProjectProfit,
    calculateProjectUsedCapacity,
    getEmployeesAssignedToProject,
    getEffectiveCapacity
} from "../calc/calcProjects.js";
import { getVacationCoefficient } from "../calc/vacation.js";
import { openModal } from "../../ui/modal/modal.js";
import { getCurrentMonth, getCurrentYear } from "../../ui/period/period-state.js";

let detailsPopupClickHandler = null;
let detailsPopupInputHandler = null;

function asNumber(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

export function openShowEmployeesPopup(projectId, year, month) {
    const project = getProjects(year, month).find((item) => item.id === projectId);
    const employees = getEmployees(year, month);
    if (!project) return;
    const assignedEmployees = getEmployeesAssignedToProject(employees, projectId).slice().sort((a, b) =>
        `${a.name} ${a.surname}`.toLowerCase().localeCompare(`${b.name} ${b.surname}`.toLowerCase())
    );
    const content = document.querySelector("[data-modal-content]");
    const modal = document.querySelector("[data-modal]");
    modal?.classList.add("modal--wide");
    content.innerHTML = `<div class="details-popup"><h2>Employees on ${project.projectName}</h2><div class="details-action-menu" data-details-action-menu hidden></div>${renderEmployeesTable(project, assignedEmployees, employees, year, month)}</div>`;
    openModal();
    attachEvents(projectId, year, month);
}

function renderEmployeesTable(project, assignedEmployees, allEmployees, year, month) {
    if (!assignedEmployees.length) return `<p class="details-empty">No employees assigned to this project.</p>`;
    const rows = assignedEmployees.map((employee) => {
        const assignment = (employee.assignments || []).find((item) => item.projectId === project.id);
        if (!assignment) return "";
        const assignmentCapacity = asNumber(assignment.capacity);
        const assignmentFit = asNumber(assignment.fit, 1);
        const vacationDays = employee.vacation?.[`${year}-${month}`] || [];
        const effectiveCapacity = getEffectiveCapacity({ ...assignment, capacity: assignmentCapacity, fit: assignmentFit }, getVacationCoefficient(vacationDays, year, month));
        const revenue = calculateAssignmentRevenue(project, allEmployees, project.id, year, month, effectiveCapacity);
        const cost = employee.salary * Math.max(0.5, assignmentCapacity);
        const profit = revenue - cost;
        return `<tr>
            <td>
                <button class="details-link-btn" data-details-employee-link data-employee-id="${employee.id}">
                    ${employee.name} ${employee.surname}
                </button>
            </td>
            <td>${assignmentCapacity.toFixed(2)}</td>
            <td>${assignmentFit.toFixed(2)}</td>
            <td>${vacationDays.length}</td>
            <td>${effectiveCapacity.toFixed(3)}</td>
            <td>$${revenue.toFixed(2)}</td>
            <td>$${cost.toFixed(2)}</td>
            <td class="${profit >= 0 ? "income-positive" : "income-negative"}">$${profit.toFixed(2)}</td>
            <td>
                <button class="details-row-btn" data-edit data-employee-id="${employee.id}">Edit</button>
                <button class="details-row-btn details-row-btn--danger" data-unassign data-employee-id="${employee.id}">Unassign</button>
            </td>
        </tr>`;
    }).join("");
    return `<div class="details-table-wrap"><table class="table details-table"><thead><tr><th>Employee</th><th>Capacity</th><th>Fit</th><th>Vacation Days</th><th>Effective Capacity</th><th>Revenue</th><th>Cost</th><th>Profit</th><th>Actions</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}

function attachEvents(projectId, year, month) {
    const content = document.querySelector("[data-modal-content]");
    const root = content.querySelector(".details-popup");
    const menu = content.querySelector("[data-details-action-menu]");
    if (!root) return;

    if (detailsPopupClickHandler) {
        root.removeEventListener("click", detailsPopupClickHandler);
    }
    if (detailsPopupInputHandler) {
        root.removeEventListener("input", detailsPopupInputHandler);
    }

    detailsPopupClickHandler = (event) => {
        const btn = event.target.closest("[data-unassign]");
        const editBtn = event.target.closest("[data-edit]");
        const nameLink = event.target.closest("[data-details-employee-link]");
        const menuAction = event.target.closest("[data-menu-see-employee], [data-menu-unassign]");
        const editSaveBtn = event.target.closest("[data-edit-assignment-save]");
        const editCancelBtn = event.target.closest("[data-edit-assignment-cancel]");
        const unassignConfirmBtn = event.target.closest("[data-unassign-confirm]");
        const unassignCancelBtn = event.target.closest("[data-unassign-cancel]");

        const hideMenu = () => {
            if (!menu) return;
            menu.hidden = true;
            menu.innerHTML = "";
        };

        if (unassignConfirmBtn) {
            const employeeId = unassignConfirmBtn.dataset.employeeId;
            const projId = unassignConfirmBtn.dataset.projectId || projectId;
            runUnassignEmployee(employeeId, projId, year, month);
            return;
        }

        if (unassignCancelBtn) {
            content.querySelector("[data-unassign-panel]")?.remove();
            return;
        }

        if (editSaveBtn) {
            const employeeId = editSaveBtn.dataset.employeeId;
            const projId = editSaveBtn.dataset.projectId || projectId;
            applyEditAssignmentSave(projId, employeeId, year, month, () =>
                openShowEmployeesPopup(projId, getCurrentYear(), getCurrentMonth())
            );
            return;
        }

        if (editCancelBtn) {
            content.querySelector("[data-edit-panel]")?.remove();
            return;
        }

        if (nameLink && menu) {
            const employeeId = nameLink.dataset.employeeId;
            const rect = nameLink.getBoundingClientRect();
            menu.innerHTML = `
                <button class="details-menu-btn" data-menu-see-employee data-employee-id="${employeeId}">See at Employees</button>
                <button class="details-menu-btn details-menu-btn--danger" data-menu-unassign data-employee-id="${employeeId}">Unassign</button>
            `;
            menu.hidden = false;
            menu.style.left = `${rect.left + window.scrollX}px`;
            menu.style.top = `${rect.bottom + window.scrollY + 6}px`;
            return;
        }

        if (menuAction) {
            const employeeId = menuAction.dataset.employeeId;
            if (menuAction.matches("[data-menu-see-employee]")) {
                document.dispatchEvent(new CustomEvent("see-at-employees", { detail: { employeeId } }));
            } else {
                openUnassignConfirmation(projectId, employeeId, year, month);
            }
            hideMenu();
            return;
        }

        if (editBtn) {
            openEditAssignment(projectId, editBtn.dataset.employeeId, editBtn, year, month);
            hideMenu();
            return;
        }

        if (btn) {
            hideMenu();
            openUnassignConfirmation(projectId, btn.dataset.employeeId, year, month);
            return;
        }

        hideMenu();
    };

    root.addEventListener("click", detailsPopupClickHandler);
    detailsPopupInputHandler = (event) => {
        if (event.target.closest("[data-edit-capacity], [data-edit-fit]")) {
            updateEditAssignmentPreview(projectId, year, month);
        }
    };
    root.addEventListener("input", detailsPopupInputHandler);
}

function unassignEmployee(employeeId, projectId, year, month) {
    openUnassignConfirmation(projectId, employeeId, year, month);
}

export function runUnassignEmployee(employeeId, projectId, year, month, reopenFn) {
    const employees = getEmployees(year, month);
    const employee = employees.find((item) => item.id === employeeId);
    if (!employee) return;
    updateEmployee(year, month, {
        ...employee,
        assignments: (employee.assignments || []).filter((a) => a.projectId !== projectId)
    });
    document.querySelector("[data-modal-content]")?.querySelector("[data-unassign-panel]")?.remove();
    document.dispatchEvent(new CustomEvent("data-updated"));
    if (typeof reopenFn === "function") reopenFn();
    else openShowEmployeesPopup(projectId, getCurrentYear(), getCurrentMonth());
}


export function applyEditAssignmentSave(projectId, employeeId, year, month, reopenFn) {
    const content = document.querySelector("[data-modal-content]");
    const capInput = content.querySelector("[data-edit-capacity]");
    const fitInput = content.querySelector("[data-edit-fit]");
    const nextCapacity = Number(capInput?.value);
    const nextFit = Number(fitInput?.value);
    const employees = getEmployees(year, month);
    const employee = employees.find((item) => item.id === employeeId);
    if (!employee) return;
    if (!Number.isFinite(nextCapacity) || nextCapacity <= 0 || nextCapacity > 1.5) return;
    if (!Number.isFinite(nextFit) || nextFit < 0 || nextFit > 1) return;

    const updatedAssignments = (employee.assignments || []).map((item) => {
        if (item.projectId !== projectId) return item;
        return {
            ...item,
            capacity: nextCapacity,
            fit: nextFit,
            effective: +(nextCapacity * nextFit).toFixed(2)
        };
    });

    updateEmployee(year, month, { ...employee, assignments: updatedAssignments });
    content.querySelector("[data-edit-panel]")?.remove();
    document.dispatchEvent(new CustomEvent("data-updated"));
    if (typeof reopenFn === "function") reopenFn();
}

export function openUnassignConfirmation(projectId, employeeId, year, month) {
    const employees = getEmployees(year, month);
    const projects = getProjects(year, month);
    const project = projects.find((item) => item.id === projectId);
    const employee = employees.find((item) => item.id === employeeId);
    if (!project || !employee) return;

    const assignment = (employee.assignments || []).find((item) => item.projectId === projectId);
    if (!assignment) return;

    const assignmentCapacity = asNumber(assignment.capacity);
    const assignmentFit = asNumber(assignment.fit, 1);
    const vacationDays = employee.vacation?.[`${year}-${month}`] || [];
    const vacationCoef = getVacationCoefficient(vacationDays, year, month);
    const effectiveCapacity = getEffectiveCapacity(
        { ...assignment, capacity: assignmentCapacity, fit: assignmentFit },
        vacationCoef
    );

    const usedBefore = calculateProjectUsedCapacity(employees, projectId, year, month);
    const incomeBefore = calculateProjectProfit(project, employees, year, month);
    const employeesAfter = employees.map((item) => (
        item.id === employeeId
            ? { ...item, assignments: (item.assignments || []).filter((a) => a.projectId !== projectId) }
            : item
    ));
    const usedAfter = calculateProjectUsedCapacity(employeesAfter, projectId, year, month);
    const incomeAfter = calculateProjectProfit(project, employeesAfter, year, month);

    const budgetShare = calculateAssignmentRevenue(project, employees, projectId, year, month, effectiveCapacity);
    const assignmentCost = employee.salary * Math.max(0.5, assignmentCapacity);
    const employeeIncome = budgetShare - assignmentCost;

    const content = document.querySelector("[data-modal-content]");
    content.querySelector("[data-unassign-panel]")?.remove();

    const panel = document.createElement("div");
    panel.className = "unassign-overlay";
    panel.dataset.unassignPanel = "";
    const formatMoney = (value) => `$${Number(value).toLocaleString("ru-RU", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    })}`;

    panel.innerHTML = `
        <div class="unassign-window" role="dialog" aria-modal="true">
            <h3>Unassign Confirmation</h3>
            <p class="unassign-question">
                You want to unassign ${employee.name} ${employee.surname} (${assignmentCapacity.toFixed(1)} capacity) from ${project.projectName}?
            </p>
            <div class="unassign-grid">
                <div>Assigned Capacity:</div><div>${assignmentCapacity.toFixed(1)}</div>
                <div>Salary Cost:</div><div>${formatMoney(assignmentCost)}</div>
                <div>Budget Share:</div><div>${formatMoney(budgetShare)}</div>
                <div>Employee Estimated Income:</div>
                <div class="${employeeIncome >= 0 ? "income-positive" : "income-negative"}">${formatMoney(employeeIncome)}</div>
                <div>Current Project Capacity:</div>
                <div>${usedBefore.toFixed(1)} / ${project.capacity}</div>
                <div>Capacity After Unassignment:</div><div>${usedAfter.toFixed(1)} / ${project.capacity}</div>
                <div>Project Income Now:</div>
                <div class="${incomeBefore >= 0 ? "income-positive" : "income-negative"}">${formatMoney(incomeBefore)}</div>
                <div>Project Income After:</div>
                <div class="${incomeAfter >= 0 ? "income-positive" : "income-negative"}">${formatMoney(incomeAfter)}</div>
            </div>
            <div class="unassign-actions">
                <button class="details-row-btn details-row-btn--secondary" data-unassign-cancel>Cancel</button>
                <button class="details-row-btn details-row-btn--danger" data-unassign-confirm data-employee-id="${employeeId}" data-project-id="${projectId}">Unassign</button>
            </div>
        </div>
    `;
    (content.querySelector(".details-popup") || content).appendChild(panel);
}

export function openEditAssignment(projectId, employeeId, anchorEl, year, month) {
    const content = document.querySelector("[data-modal-content]");
    const employees = getEmployees(year, month);
    const employee = employees.find((item) => item.id === employeeId);
    if (!employee) return;
    const current = (employee.assignments || []).find((a) => a.projectId === projectId);
    if (!current) return;
    const project = getProjects(year, month).find((item) => item.id === projectId);
    if (!project) return;

    const vacationDays = employee.vacation?.[`${year}-${month}`] || [];
    const vacationCoef = getVacationCoefficient(vacationDays, year, month);
    const initialEffective =
        asNumber(current.capacity) * asNumber(current.fit, 1) * vacationCoef;

    content.querySelector("[data-edit-panel]")?.remove();
    const panel = document.createElement("div");
    panel.className = "edit-assignment-popup";
    panel.dataset.editPanel = "";
    panel.innerHTML = `
        <div class="edit-assignment-window" role="dialog" aria-modal="true">
            <h3>Edit Assignment</h3>
            <p class="edit-assignment-subtitle">${employee.name} ${employee.surname} on ${project.projectName}</p>
            <label>
                Capacity (0.1 - 1.5):
                <span data-edit-capacity-value>${asNumber(current.capacity).toFixed(2)}</span>
            </label>
            <input type="range" min="0.1" max="1.5" step="0.1" value="${Math.max(0.1, asNumber(current.capacity)).toFixed(1)}" data-edit-capacity>
            <label>
                Project Fit (0.0 - 1.0):
                <span data-edit-fit-value>${asNumber(current.fit, 1).toFixed(2)}</span>
            </label>
            <input type="range" min="0" max="1" step="0.1" value="${Math.max(0, Math.min(1, asNumber(current.fit, 1))).toFixed(1)}" data-edit-fit>
            <div class="edit-assignment-preview">Effective Capacity:
                <span data-edit-effective>${initialEffective.toFixed(3)}</span>
            </div>
            <div class="edit-assignment-error" data-edit-error></div>
            <div class="edit-assignment-actions">
                <button class="details-row-btn details-row-btn--secondary" data-edit-assignment-cancel>Cancel</button>
                <button class="details-row-btn" data-edit-assignment-save data-employee-id="${employeeId}" data-project-id="${projectId}">Save</button>
            </div>
        </div>
    `;
    (content.querySelector(".details-popup") || content).appendChild(panel);

    const rect = anchorEl.getBoundingClientRect();
    panel.style.left = `${rect.left + window.scrollX}px`;
    panel.style.top = `${rect.bottom + window.scrollY + 6}px`;
    updateEditAssignmentPreview(projectId, year, month);
}

export function updateEditAssignmentPreview(projectId, year, month) {
    const content = document.querySelector("[data-modal-content]");
    const capInput = content.querySelector("[data-edit-capacity]");
    const fitInput = content.querySelector("[data-edit-fit]");
    const capValue = content.querySelector("[data-edit-capacity-value]");
    const fitValue = content.querySelector("[data-edit-fit-value]");
    const effectiveValue = content.querySelector("[data-edit-effective]");
    const saveBtn = content.querySelector("[data-edit-assignment-save]");
    const errorBox = content.querySelector("[data-edit-error]");
    if (!capInput || !fitInput || !saveBtn) return;

    const cap = Number(capInput.value);
    const fit = Number(fitInput.value);

    const employeeId = saveBtn.dataset.employeeId;
    const employee = getEmployees(year, month).find((item) => item.id === employeeId);
    if (!employee) return;
    const vacationDays = employee.vacation?.[`${year}-${month}`] || [];
    const vacationCoef = getVacationCoefficient(vacationDays, year, month);
    const effective = cap * fit * vacationCoef;
    if (capValue) capValue.textContent = cap.toFixed(2);
    if (fitValue) fitValue.textContent = fit.toFixed(2);
    if (effectiveValue) effectiveValue.textContent = effective.toFixed(3);
    const usedWithoutCurrent = (employee.assignments || [])
        .filter((item) => item.projectId !== projectId)
        .reduce((sum, item) => sum + asNumber(item.capacity), 0);
    const totalCapacity = Number((usedWithoutCurrent + cap).toFixed(1));

    if (totalCapacity > 1.5 + 0.0001) {
        if (errorBox) errorBox.textContent = "Employee capacity exceeded (max 1.5)";
        saveBtn.disabled = true;
        return;
    }

    if (errorBox) errorBox.textContent = "";
    saveBtn.disabled = false;
}