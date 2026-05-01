import { addProject } from "../../data/monthly-storage.js";
import { getCurrentYear, getCurrentMonth } from "../../ui/period/period-state.js";

export function initProjectValidation() {
    const form = document.getElementById("form-add-project");
    if (!form) return;
    const submitBtn = form.querySelector(".form__submit");
    const rules = {
        projectName: (v) => !v
            ? "Please enter project name"
            : !/^[A-Za-z0-9 ]+$/.test(v)
            ? "Letters/numbers only"
            : v.length < 3 ? "Min 3 characters"
            : "",
        companyName: (v) => !v
            ? "Please enter company name"
            : !/^[A-Za-z0-9 ]+$/.test(v)
            ? "Letters/numbers only"
            : v.length < 2 ? "Min 2 characters"
            : "",
        budget: (v) => !v
            ? "Budget is required"
            : v <= 0 ? "Positive only"
            : !/^\d+(\.\d{1,2})?$/.test(v)
            ? "Max 2 decimals"
            : "",
        capacity: (v) => !v
            ? "Capacity is required"
            : v < 1 ? "Min 1 employee"
            : !/^\d+$/.test(v)
            ? "Integer only"
            : ""
    };
    function validate(e) {
        let isFormValid = true;
        for (const fieldName in rules) {
            const input = form.elements[fieldName];
            const errorElement = form.querySelector(`[data-error-${fieldName}]`);
            const value = input.value.trim();
            const errorMessage = rules[fieldName](value);
            if (errorMessage) isFormValid = false;
            if (e && e.target === input) {
                const isInvalidSymbol = ["Letters/numbers only", "Integer only", "Max 2 decimals"].includes(errorMessage);
                if (e.type === "blur" || (e.type === "input" && isInvalidSymbol)) {
                    errorElement.textContent = errorMessage;
                    input.classList.toggle("form__input--invalid", !!errorMessage);
                }
                if (e.type === "input" && !errorMessage) {
                    errorElement.textContent = "";
                    input.classList.remove("form__input--invalid");
                }
            }
        }
        submitBtn.disabled = !isFormValid;
    }
    function resetForm() {
        form.reset();
        form.querySelectorAll(".form__error").forEach((el) => el.textContent = "");
        form.querySelectorAll(".form__input").forEach((el) => el.classList.remove("form__input--invalid"));
        validate();
    }
    form.addEventListener("input", validate);
    form.addEventListener("blur", validate, true);
    form.addEventListener("submit", (e) => {
        e.preventDefault();
        if (submitBtn.disabled) return;
        addProject(getCurrentYear(), getCurrentMonth(), {
            id: crypto.randomUUID(),
            projectName: form.projectName.value.trim(),
            companyName: form.companyName.value.trim(),
            budget: Number(form.budget.value),
            capacity: Number(form.capacity.value)
        });
        resetForm();
        document.dispatchEvent(new CustomEvent("form-submitted"));
    });
    document.addEventListener("panel-closed", resetForm);
    validate();
}
