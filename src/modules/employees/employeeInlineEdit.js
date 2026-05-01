import { getEmployees, updateEmployee } from "../../data/monthly-storage.js";
import { getCurrentMonth, getCurrentYear } from "../../ui/period/period-state.js";
import { renderEmployeesTable } from "./renderEmployeesTable.js";

const POSITION_OPTIONS = ["Junior", "Middle", "Senior", "Lead", "Architect", "BO"];

export function initEmployeeInlineEdit() {
    document.addEventListener("edit-employee-position", (e) => {
        const { employeeId } = e.detail;
        const year = getCurrentYear();
        const month = getCurrentMonth();
        const cell = document.querySelector(`.editable-position[data-id="${employeeId}"]`);
        if (!cell || cell.querySelector("select")) return;

        const emp = getEmployees(year, month).find((item) => item.id === employeeId);
        if (!emp) return;

        cell.classList.remove("editable-cell--view");
        cell.classList.add("editable-cell--editing");

        const select = document.createElement("select");
        select.className = "form__input employees-inline-select";
        POSITION_OPTIONS.forEach((pos) => {
            const opt = document.createElement("option");
            opt.value = pos;
            opt.textContent = pos;
            if (pos === emp.position) opt.selected = true;
            select.appendChild(opt);
        });

        cell.innerHTML = "";
        cell.appendChild(select);
        select.focus();

        let committed = false;
        const commitPosition = () => {
            if (committed) return;
            committed = true;
            const next = select.value;
            if (next && next !== emp.position) {
                updateEmployee(year, month, { ...emp, position: next });
                document.dispatchEvent(new CustomEvent("data-updated"));
            } else {
                renderEmployeesTable(year, month);
            }
        };

        select.addEventListener("change", commitPosition);
        select.addEventListener("blur", () => setTimeout(commitPosition, 0));
    });

    document.addEventListener("edit-employee-salary", (e) => {
        const { employeeId } = e.detail;
        const year = getCurrentYear();
        const month = getCurrentMonth();
        const cell = document.querySelector(`.editable-salary[data-id="${employeeId}"]`);
        if (!cell || cell.querySelector("input")) return;

        const emp = getEmployees(year, month).find((item) => item.id === employeeId);
        if (!emp) return;

        cell.classList.remove("editable-cell--view");
        cell.classList.add("editable-cell--editing");

        const input = document.createElement("input");
        input.type = "number";
        input.className = "form__input employees-inline-salary";
        input.step = "0.01";
        input.min = "0.01";
        input.value = String(emp.salary);

        cell.textContent = "";
        cell.appendChild(input);
        input.focus();
        input.select();

        let cancelled = false;
        input.addEventListener("keydown", (ev) => {
            if (ev.key === "Escape") {
                ev.preventDefault();
                cancelled = true;
                renderEmployeesTable(year, month);
            }
            if (ev.key === "Enter") {
                ev.preventDefault();
                input.blur();
            }
        });

        input.addEventListener("blur", () => {
            setTimeout(() => {
                if (cancelled) return;
                const v = Number(input.value);
                if (!Number.isFinite(v) || v <= 0) {
                    renderEmployeesTable(year, month);
                    return;
                }
                const rounded = Number(v.toFixed(2));
                if (rounded !== Number(emp.salary)) {
                    updateEmployee(year, month, { ...emp, salary: rounded });
                    document.dispatchEvent(new CustomEvent("data-updated"));
                } else {
                    renderEmployeesTable(year, month);
                }
            }, 0);
        });
    });
}
