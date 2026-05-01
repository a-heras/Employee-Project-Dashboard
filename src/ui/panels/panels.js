export function initPanels() {
    const panelProject = document.querySelector('[data-panel="add-project"]');
    const panelEmployee = document.querySelector('[data-panel="add-employee"]');
    const btnProject = document.querySelector("[data-open-add-project]");
    const btnEmployee = document.querySelector("[data-open-add-employee]");
    const closeButtons = document.querySelectorAll("[data-panel-close]");
    const backdrop = document.querySelector("[data-panel-backdrop]");

    function openPanel(panel) {
        panel.hidden = false;
        panel.classList.add("panel--open");
        backdrop.hidden = false;
        backdrop.classList.add("panel-backdrop--visible");
    }

    function closePanels() {
        [panelProject, panelEmployee].forEach((panel) => {
            panel.classList.remove("panel--open");
            panel.hidden = true;
            backdrop.classList.remove("panel-backdrop--visible");
            backdrop.hidden = true;
            document.dispatchEvent(new CustomEvent("panel-closed"));
        });
    }

    btnProject.addEventListener("click", () => openPanel(panelProject));
    btnEmployee.addEventListener("click", () => openPanel(panelEmployee));
    closeButtons.forEach((btn) => btn.addEventListener("click", closePanels));
    backdrop.addEventListener("click", closePanels);
    document.addEventListener("form-submitted", closePanels);
}