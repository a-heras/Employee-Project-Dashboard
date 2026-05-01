import { getEmployees, getProjects, updateEmployee } from "../../data/monthly-storage.js";
import { calculateProjectUsedCapacity } from "../calc/calcProjects.js";
import { getVacationCoefficient } from "../calc/vacation.js";
import { getCurrentYear, getCurrentMonth } from "../../ui/period/period-state.js";

let cleanup = null;

function getExistingProjectAssignment(assignments, projectId) {
    const matches = (assignments || []).filter((item) => item.projectId === projectId);
    if (!matches.length) return null;
    const latest = matches[matches.length - 1];
    const capacity = matches.reduce((sum, item) => sum + Number(item.capacity || 0), 0);
    const fit = Number(latest.fit || 1);
    return { capacity, fit };
}

export function renderAssignPopup(employeeId, anchorBtn) {
    const year = getCurrentYear();
    const month = getCurrentMonth();
    const employees = getEmployees(year, month);
    const projects = getProjects(year, month);
    const emp = employees.find((e) => e.id === employeeId);
    if (!emp) return;
    closeAssignPopup();

    const assignments = emp.assignments || [];
    const usedCap = assignments.reduce((s, a) => s + (a.capacity || 0), 0);
    const maxCap = 1.5;
    const availableCap = Number(Math.max(0, maxCap - usedCap).toFixed(1));
    const initialCapacity = availableCap > 0 ? Math.min(0.1, availableCap) : 0;
    const popup = document.createElement("div");
    popup.className = "assign-popup";
    popup.innerHTML = `<h3>Assign - ${emp.name} ${emp.surname}</h3>
        <div class="assign-info">
            <div>Current: <b>${usedCap.toFixed(1)} / ${maxCap}</b></div>
            <div>Available: <b>${availableCap.toFixed(1)}</b></div>
        </div>
        <label>Project:</label>
            <select data-assign-project>
                <option value="">
                    Select project
                </option>
                ${projects.map((p) => { const pUsed = calculateProjectUsedCapacity(employees, p.id, year, month); 
                return `<option value="${p.id}">
                            ${p.projectName} (${pUsed.toFixed(1)} / ${p.capacity})
                        </option>`; }).join("")}
            </select>
            <div class="assign-settings">
                <label>Capacity:</label>
                <input type="range" min="0" max="${availableCap}" step="0.1" value="${initialCapacity}" data-capacity>
                <span data-capacity-value>${initialCapacity.toFixed(1)}</span>
                <label>Fit:</label>
                <input type="range" min="0" max="1" step="0.1" value="1" data-fit>
                <span data-fit-value>1.0</span>
                <div class="assign-calc">
                    <div><b>Project Capacity:</b>
                        <span data-project-capacity></span>
                    </div>
                    <div><b>Effective Capacity:</b>
                        <span data-effective>0.10</span>
                    </div>
                    <div><b>After Assignment:</b>
                        <span data-after-project></span>
                    </div>
                </div>
                <div class="assign-error" data-error></div>
                <div class="assign-actions">
                    <button data-assign-save>Assign</button>
                    <button data-assign-cancel>Cancel</button>
                </div>
            </div>
        </div>`;
    document.body.appendChild(popup);
    positionPopup(popup, anchorBtn);
    popup.addEventListener("click", (e) => e.stopPropagation());
    const onScroll = () => positionPopup(popup, anchorBtn);
    const onResize = () => positionPopup(popup, anchorBtn);
    const onClickOutside = (e) => { if (!popup.contains(e.target) && e.target !== anchorBtn) closeAssignPopup(); };
    const content = document.querySelector(".content");
    content?.addEventListener("scroll", onScroll);
    window.addEventListener("resize", onResize);
    document.addEventListener("click", onClickOutside);
    cleanup = () => {
        content?.removeEventListener("scroll", onScroll);
        window.removeEventListener("resize", onResize);
        document.removeEventListener("click", onClickOutside);
    };
    attachAssignEvents(popup, emp, projects, employees, usedCap, maxCap, year, month, anchorBtn);
}

function attachAssignEvents(popup, emp, projects, employees, usedCap, maxCap, year, month, anchorBtn) {
    const projectSelect = popup.querySelector("[data-assign-project]");
    const capInput = popup.querySelector("[data-capacity]");
    const fitInput = popup.querySelector("[data-fit]");
    const errorBox = popup.querySelector("[data-error]");
    const capValue = popup.querySelector("[data-capacity-value]");
    const fitValue = popup.querySelector("[data-fit-value]");
    const effectiveBox = popup.querySelector("[data-effective]");
    const projectCapacityBox = popup.querySelector("[data-project-capacity]");
    const afterProjectBox = popup.querySelector("[data-after-project]");
    const settingsBlock = popup.querySelector(".assign-settings");
    const vacationDays = emp.vacation?.[`${year}-${month}`] || [];
    const vacationCoef = getVacationCoefficient(vacationDays, year, month);
    let lastSelectedProjectId = "";

    function recalc() {
        const projectId = projectSelect.value;
        if (!projectId) return settingsBlock.classList.remove("visible");
        settingsBlock.classList.add("visible");
        requestAnimationFrame(() => positionPopup(popup, anchorBtn));
        const existingAssignment = getExistingProjectAssignment(emp.assignments || [], projectId);
        const existingCap = existingAssignment ? Number(existingAssignment.capacity || 0) : 0;
        const existingFit = existingAssignment ? Number(existingAssignment.fit || 1) : 1;
        const baseUsedCapacity = Math.max(0, usedCap - existingCap);
        const maxForSelection = Number((maxCap - baseUsedCapacity).toFixed(1));

        capInput.max = String(Math.max(0, maxForSelection));

        if (projectId !== lastSelectedProjectId) {
            lastSelectedProjectId = projectId;
            if (existingAssignment) {
                capInput.value = String(existingCap);
                fitInput.value = String(existingFit);
            } else {
                capInput.value = String(Math.min(0.1, Math.max(0, maxForSelection)));
                fitInput.value = "1";
            }
        }

        if (Number(capInput.value) > maxForSelection) {
            capInput.value = String(Math.max(0, maxForSelection));
        }

        const cap = Number(capInput.value);
        const fit = Number(fitInput.value);
        const effective = +(cap * fit * vacationCoef).toFixed(2);
        const existingEffective = +(existingCap * existingFit * vacationCoef).toFixed(2);
        capValue.textContent = cap.toFixed(1);
        fitValue.textContent = fit.toFixed(1);
        effectiveBox.textContent = effective.toFixed(2);
        const p = projects.find((item) => item.id === projectId);
        if (!p) return;
        const pUsed = calculateProjectUsedCapacity(employees, p.id, year, month);
        projectCapacityBox.textContent = `${pUsed.toFixed(1)} / ${p.capacity}`;
        afterProjectBox.textContent = `${(pUsed - existingEffective + effective).toFixed(2)} / ${p.capacity}`;
        errorBox.textContent = (baseUsedCapacity + cap) > maxCap ? "Employee capacity exceeded" : "";
    }

    projectSelect.addEventListener("change", recalc);
    capInput.addEventListener("input", recalc);
    fitInput.addEventListener("input", recalc);
    popup.querySelector("[data-assign-cancel]").addEventListener("click", closeAssignPopup);
    popup.querySelector("[data-assign-save]").addEventListener("click", () => {
        const projectId = projectSelect.value;
        const cap = Number(capInput.value);
        const fit = Number(fitInput.value);
        const existingAssignment = getExistingProjectAssignment(emp.assignments || [], projectId);
        const existingCap = existingAssignment ? Number(existingAssignment.capacity || 0) : 0;
        const baseUsedCapacity = Math.max(0, usedCap - existingCap);
        if (!projectId) return (errorBox.textContent = "Select project");
        if (cap <= 0) return (errorBox.textContent = "Capacity must be > 0");
        if ((baseUsedCapacity + cap) > maxCap) return (errorBox.textContent = "Employee capacity exceeded");
        saveAssignment(emp.id, projectId, cap, fit, year, month);
        closeAssignPopup();
        document.dispatchEvent(new CustomEvent("data-updated"));
    });
    settingsBlock.classList.remove("visible");
}

function saveAssignment(employeeId, projectId, cap, fit, year, month) {
    const employees = getEmployees(year, month);
    const emp = employees.find((e) => e.id === employeeId);
    if (!emp) return;
    if (!emp.assignments) emp.assignments = [];

    const nextAssignment = {
        projectId,
        capacity: cap,
        fit,
        effective: +(cap * fit).toFixed(2)
    };
    emp.assignments = (emp.assignments || []).filter((item) => item.projectId !== projectId);
    emp.assignments.push(nextAssignment);

    updateEmployee(year, month, emp);
}

export function closeAssignPopup() {
    document.querySelector(".assign-popup")?.remove();
    if (cleanup) cleanup();
    cleanup = null;
}

function positionPopup(popup, anchorBtn) {
    popup.style.position = "fixed";
    popup.style.zIndex = "10000";
    popup.style.maxHeight = "none";
    let popupRect = popup.getBoundingClientRect();
    const btnRect = anchorBtn.getBoundingClientRect();
    const gap = 6;
    const padding = 10;
    const spaceBelow = window.innerHeight - btnRect.bottom - gap - padding;
    const spaceAbove = btnRect.top - gap - padding;
    let top;
    if (spaceBelow >= popupRect.height) top = btnRect.bottom + gap;
    else if (spaceAbove >= popupRect.height) top = btnRect.top - popupRect.height - gap;
    else {
        if (spaceBelow >= spaceAbove) { top = btnRect.bottom + gap; popup.style.maxHeight = `${spaceBelow}px`; }
        else { popup.style.maxHeight = `${spaceAbove}px`; popupRect = popup.getBoundingClientRect(); top = btnRect.top - popupRect.height - gap; }
        popup.style.overflowY = "auto";
    }
    let left = btnRect.left + (btnRect.width / 2) - (popupRect.width / 2);
    if (left < padding) left = padding;
    if (left + popupRect.width > window.innerWidth - padding) left = window.innerWidth - popupRect.width - padding;
    if (top < padding) top = padding;
    const finalRect = popup.getBoundingClientRect();
    if (top + finalRect.height > window.innerHeight - padding) top = window.innerHeight - finalRect.height - padding;
    popup.style.top = `${top}px`;
    popup.style.left = `${left}px`;
}