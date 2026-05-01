import { renderEmployeesTable } from "../../modules/employees/renderEmployeesTable.js";
import { renderProjectsTable } from "../../modules/projects/renderProjectsTable.js";
import { openSeedDataPopup } from "../../modules/seed/openSeedDataPopup.js";
import { getCurrentYear, getCurrentMonth } from "../period/period-state.js";

export function initTabs() {
    const tabs = document.querySelectorAll("[data-view-tab]");
    const title = document.querySelector("[data-current-view-title]");
    const btnAddProject = document.querySelector("[data-open-add-project]");
    const btnSeedData = document.querySelector("[data-seed-button]");
    const btnAddEmployee = document.querySelector("[data-open-add-employee]");

    function updateButtons(view) {
        if (view === "projects") {
            btnAddProject.style.display = "block";
            btnSeedData.style.display = "block";
            btnAddEmployee.style.display = "none";
        } else {
            btnAddProject.style.display = "none";
            btnSeedData.style.display = "none";
            btnAddEmployee.style.display = "block";
        }
    }

    tabs.forEach((tab) => {
        tab.addEventListener("click", () => {
            const view = tab.dataset.viewTab;
            tabs.forEach((t) => t.classList.remove("sidebar__tab--active"));
            tab.classList.add("sidebar__tab--active");
            title.textContent = view === "projects" ? "Projects" : "Employees";
            const year = getCurrentYear();
            const month = getCurrentMonth();
            if (view === "projects") renderProjectsTable(year, month);
            else renderEmployeesTable(year, month);
            updateButtons(view);
        });
    });

    renderProjectsTable(getCurrentYear(), getCurrentMonth());
    updateButtons("projects");

    btnSeedData?.addEventListener("click", () => openSeedDataPopup());
}
