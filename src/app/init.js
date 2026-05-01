import { initSidebar } from "../ui/layout/sidebar.js";
import { initTabs } from "../ui/tabs/tabs.js";
import { initPeriod } from "../ui/period/period.js";
import { initPanels } from "../ui/panels/panels.js";

import { initEmployeeValidation } from "../modules/forms/add-employee-validation.js";
import { initProjectValidation } from "../modules/forms/add-project-validation.js";

import { renderProjectsTable } from "../modules/projects/renderProjectsTable.js";
import { renderEmployeesTable, prepareSeeAtEmployee } from "../modules/employees/renderEmployeesTable.js";
import { initEmployeeInlineEdit } from "../modules/employees/employeeInlineEdit.js";
import { renderEmployeeCalendar } from "../modules/employees/renderEmployeeCalendar.js";
import { renderAssignPopup } from "../modules/employees/renderAssignPopup.js";

import { openShowEmployeesPopup } from "../modules/projects/showEmployeesPopup.js";
import { prepareSeeAtProject } from "../modules/projects/renderProjectsTable.js";
import { openShowAssignmentsPopup } from "../modules/employees/showAssignmentsPopup.js";
import { closeModal } from "../ui/modal/modal.js";

import { getEmployees, getProjects, initSampleData } from "../data/monthly-storage.js";
import { getCurrentYear, getCurrentMonth } from "../ui/period/period-state.js";

export function initApp() {
    initSampleData();
    initSidebar();
    initPeriod();
    initTabs();
    initPanels();
    initEmployeeValidation();
    initProjectValidation();
    initEmployeeInlineEdit();
    renderProjectsTable(getCurrentYear(), getCurrentMonth());

    document.addEventListener("data-updated", () => {
        const activeTab = document.querySelector(".sidebar__tab--active").dataset.viewTab;
        const year = getCurrentYear();
        const month = getCurrentMonth();

        if (activeTab === "projects") {
            renderProjectsTable(year, month);
        } else if (activeTab === "employees") {
            renderEmployeesTable(year, month);
        }
    });

    document.addEventListener("period-changed", () => {
        const year = getCurrentYear();
        const month = getCurrentMonth();
        const activeTab = document.querySelector(".sidebar__tab--active").dataset.viewTab;

        if (activeTab === "projects") {
            renderProjectsTable(year, month);
        } else if (activeTab === "employees") {
            renderEmployeesTable(year, month);
        }
    });

    document.addEventListener("view-projects", () => {
        renderProjectsTable(getCurrentYear(), getCurrentMonth());
    });

    document.addEventListener("view-employees", () => {
        renderEmployeesTable(getCurrentYear(), getCurrentMonth());
    });

    document.addEventListener("show-employee-calendar", (e) => {
        renderEmployeeCalendar(e.detail.employeeId);
    });

    document.addEventListener("assign-employee", (e) => {
        const { employeeId, anchor } = e.detail;
        renderAssignPopup(employeeId, anchor);
    });

    document.addEventListener("show-project-employees", (e) => {
        const { projectId } = e.detail;
        const year = getCurrentYear();
        const month = getCurrentMonth();
        openShowEmployeesPopup(projectId, year, month);
    });

    document.addEventListener("show-employee-assignments", (e) => {
        const { employeeId } = e.detail;
        openShowAssignmentsPopup(employeeId, getCurrentYear(), getCurrentMonth());
    });

    document.addEventListener("see-at-projects", (e) => {
        const { projectId } = e.detail;
        closeModal();
        const year = getCurrentYear();
        const month = getCurrentMonth();
        const project = getProjects(year, month).find((p) => p.id === projectId);
        prepareSeeAtProject(project?.projectName || "");
        document.querySelector('[data-view-tab="projects"]')?.click();
    });

    document.addEventListener("see-at-employees", (e) => {
        const { employeeId } = e.detail;
        closeModal();
        const year = getCurrentYear();
        const month = getCurrentMonth();
        const emp = getEmployees(year, month).find((item) => item.id === employeeId);
        if (emp) prepareSeeAtEmployee(emp.name, emp.surname);
        document.querySelector('[data-view-tab="employees"]')?.click();
    });
}