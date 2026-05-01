import { addEmployee } from "../../data/monthly-storage.js";
import { getCurrentYear, getCurrentMonth } from "../../ui/period/period-state.js";

export function initEmployeeValidation() {
    const form = document.getElementById("form-add-employee");
    if (!form) return;
    const submitBtn = form.querySelector(".form__submit");
    const rules = {
        name: (v) => !v
            ? "Please enter your name"
            : !/^[A-Za-z]+$/.test(v)
            ? "Letters only"
            : v.length < 3
            ? "Min 3 letters"
            : "",
        surname: (v) => !v
            ? "Please enter your surname"
            : !/^[A-Za-z]+$/.test(v)
            ? "Letters only"
            : v.length < 3
            ? "Min 3 letters"
            : "",
        position: (v) => !v ? "Select position" : "",
        salary: (v) => !v
            ? "Salary is required"
            : v <= 0
            ? "Positive only"
            : !/^\d+(\.\d{1,2})?$/.test(v)
            ? "Max 2 decimals"
            : "",
        dob: (v) => {
            if (!v) return "Please select your birth date";
            const birth = new Date(v), now = new Date();
            let age = now.getFullYear() - birth.getFullYear();
            if (now < new Date(new Date(v).setFullYear(birth.getFullYear() + age))) age--;
            if (age < 18) return "Must be 18+";
            if (age > 120) return "Invalid date (too old)";
            return "";
        }
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
                if (e.type === "blur" || (e.type === "input" && ["Letters only", "Max 2 decimals", "Invalid year format"].includes(errorMessage))) {
                    if (errorElement) errorElement.textContent = errorMessage;
                    input.classList.toggle("form__input--invalid", !!errorMessage);
                }
                if (e.type === "input" && !errorMessage) {
                    if (errorElement) errorElement.textContent = "";
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
        addEmployee(getCurrentYear(), getCurrentMonth(), {
            id: crypto.randomUUID(),
            name: form.elements.name.value.trim(),
            surname: form.elements.surname.value.trim(),
            dob: form.elements.dob.value,
            position: form.elements.position.value,
            salary: Number(form.elements.salary.value),
            assignments: [],
            vacation: {}
        });
        document.dispatchEvent(new CustomEvent("data-updated"));
        resetForm();
        document.dispatchEvent(new CustomEvent("form-submitted"));
    });
    document.addEventListener("panel-closed", resetForm);
    validate();
}
