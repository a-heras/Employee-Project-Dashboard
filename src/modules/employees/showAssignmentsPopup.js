import { getEmployees, getProjects } from "../../data/monthly-storage.js";
import { calculateAssignmentRevenue, getEffectiveCapacity } from "../calc/calcProjects.js";
import { getVacationCoefficient } from "../calc/vacation.js";
import { openModal } from "../../ui/modal/modal.js";
import { getCurrentMonth, getCurrentYear } from "../../ui/period/period-state.js";
import {
    applyEditAssignmentSave,
    openEditAssignment,
    openUnassignConfirmation,
    runUnassignEmployee,
    updateEditAssignmentPreview
} from "../projects/showEmployeesPopup.js";

function asNumber(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

let assignmentsPopupClickHandler = null;
let assignmentsPopupInputHandler = null;

export function openShowAssignmentsPopup(employeeId, year, month) {
    const employees = getEmployees(year, month);
    const projects = getProjects(year, month);
    const employee = employees.find((e) => e.id === employeeId);
    if (!employee) return;

    const assignments = employee.assignments || [];
    const sorted = assignments.slice().sort((a, b) => {
        const pa = projects.find((p) => p.id === a.projectId)?.projectName || "";
        const pb = projects.find((p) => p.id === b.projectId)?.projectName || "";
        return pa.localeCompare(pb);
    });

    const content = document.querySelector("[data-modal-content]");
    const modal = document.querySelector("[data-modal]");
    modal?.classList.add("modal--wide");
    content.innerHTML = `
        <div class="details-popup"><h2>Assignments — ${employee.name} ${employee.surname}</h2>
            <div class="details-action-menu" data-assignments-action-menu hidden></div>
            ${renderAssignmentsTable(
                employee,
                sorted,
                projects,
                employees,
                year,
                month
            )}
        </div>`;
    openModal();
    attachAssignmentsEvents(employeeId, year, month);
}

function renderAssignmentsTable(employee, sortedAssignments, projects, allEmployees, year, month) {
    if (!sortedAssignments.length) {
        return `<p class="details-empty">No assignments for this employee.</p>`;
    }
    const vacationDays = employee.vacation?.[`${year}-${month}`] || [];
    const vacationCount = vacationDays.length;

    const rows = sortedAssignments.map((assignment) => {
        const project = projects.find((p) => p.id === assignment.projectId);
        if (!project) return "";
        const assignmentCapacity = asNumber(assignment.capacity);
        const assignmentFit = asNumber(assignment.fit, 1);
        const vacationCoef = getVacationCoefficient(vacationDays, year, month);
        const effectiveCapacity = getEffectiveCapacity(
            { ...assignment, capacity: assignmentCapacity, fit: assignmentFit },
            vacationCoef
        );
        const revenue = calculateAssignmentRevenue(project, allEmployees, project.id, year, month, effectiveCapacity);
        const cost = employee.salary * Math.max(0.5, assignmentCapacity);
        const profit = revenue - cost;

        return `<tr>
            <td>
                <button type="button" class="details-link-btn" data-assignments-project-link data-project-id="${project.id}">
                    ${project.projectName}
                </button>
            </td>
            <td>${assignmentCapacity.toFixed(2)}</td>
            <td>${assignmentFit.toFixed(2)}</td>
            <td>${vacationCount}</td>
            <td>${effectiveCapacity.toFixed(3)}</td>
            <td>$${revenue.toFixed(2)}</td>
            <td>$${cost.toFixed(2)}</td>
            <td class="${profit >= 0 ? "income-positive" : "income-negative"}">$${profit.toFixed(2)}</td>
            <td>
                <button type="button" class="details-row-btn" data-edit data-employee-id="${employee.id}" data-project-id="${project.id}">Edit</button>
                <button type="button" class="details-row-btn details-row-btn--danger" data-unassign data-employee-id="${employee.id}" data-project-id="${project.id}">Unassign</button>
            </td>
        </tr>`;
    }).join("");

    return `
        <div class="details-table-wrap">
            <table class="table details-table">
                <thead>
                    <tr>
                        <th>Project</th>
                        <th>Capacity</th>
                        <th>Fit</th>
                        <th>Vacation Days</th>
                        <th>Effective Capacity</th>
                        <th>Revenue</th>
                        <th>Cost</th>
                        <th>Profit</th>
                        <th>Actions</th>
                    </tr><
                </thead>
                <tbody>${rows}</tbody>
            </table>
        </div>`;
}

function attachAssignmentsEvents(employeeId, year, month) {
    const content = document.querySelector("[data-modal-content]");
    const root = content.querySelector(".details-popup");
    const menu = content.querySelector("[data-assignments-action-menu]");
    if (!root) return;

    if (assignmentsPopupClickHandler) {
        root.removeEventListener("click", assignmentsPopupClickHandler);
    }
    if (assignmentsPopupInputHandler) {
        root.removeEventListener("input", assignmentsPopupInputHandler);
    }

    assignmentsPopupClickHandler = (event) => {
        const btn = event.target.closest("[data-unassign]");
        const editBtn = event.target.closest("[data-edit]");
        const projectLink = event.target.closest("[data-assignments-project-link]");
        const menuSeeProject = event.target.closest("[data-assignments-see-project]");
        const menuUnassign = event.target.closest("[data-assignments-menu-unassign]");
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
            const projId = unassignConfirmBtn.dataset.projectId;
            runUnassignEmployee(unassignConfirmBtn.dataset.employeeId, projId, year, month, () =>
                openShowAssignmentsPopup(employeeId, getCurrentYear(), getCurrentMonth())
            );
            return;
        }

        if (unassignCancelBtn) {
            content.querySelector("[data-unassign-panel]")?.remove();
            return;
        }

        if (editSaveBtn) {
            applyEditAssignmentSave(
                editSaveBtn.dataset.projectId,
                editSaveBtn.dataset.employeeId,
                year,
                month,
                () => openShowAssignmentsPopup(employeeId, getCurrentYear(), getCurrentMonth())
            );
            return;
        }

        if (editCancelBtn) {
            content.querySelector("[data-edit-panel]")?.remove();
            return;
        }

        if (projectLink && menu) {
            const projectId = projectLink.dataset.projectId;
            const rect = projectLink.getBoundingClientRect();
            menu.innerHTML = `
                <button type="button" class="details-menu-btn" data-assignments-see-project data-project-id="${projectId}">See at Projects</button>
                <button type="button" class="details-menu-btn details-menu-btn--danger" data-assignments-menu-unassign data-project-id="${projectId}">Unassign</button>
            `;
            menu.hidden = false;
            menu.style.left = `${rect.left + window.scrollX}px`;
            menu.style.top = `${rect.bottom + window.scrollY + 6}px`;
            return;
        }

        if (menuSeeProject) {
            document.dispatchEvent(
                new CustomEvent("see-at-projects", {
                    detail: { projectId: menuSeeProject.dataset.projectId }
                })
            );
            hideMenu();
            return;
        }

        if (menuUnassign) {
            openUnassignConfirmation(menuUnassign.dataset.projectId, employeeId, year, month);
            hideMenu();
            return;
        }

        if (editBtn) {
            openEditAssignment(editBtn.dataset.projectId, employeeId, editBtn, year, month);
            hideMenu();
            return;
        }

        if (btn) {
            hideMenu();
            openUnassignConfirmation(btn.dataset.projectId, employeeId, year, month);
            return;
        }

        hideMenu();
    };

    root.addEventListener("click", assignmentsPopupClickHandler);
    assignmentsPopupInputHandler = (event) => {
        const saveBtn = content.querySelector("[data-edit-assignment-save]");
        const projId = saveBtn?.dataset.projectId;
        if (projId && event.target.closest("[data-edit-capacity], [data-edit-fit]")) {
            updateEditAssignmentPreview(projId, year, month);
        }
    };
    root.addEventListener("input", assignmentsPopupInputHandler);
}