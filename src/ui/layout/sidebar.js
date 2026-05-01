export function initSidebar() {
    const sidebar = document.querySelector("[data-sidebar]");
    const toggle = document.querySelector("[data-sidebar-toggle]");
    const openBtn = document.querySelector("[data-sidebar-open]");
    toggle.addEventListener("click", () => {
        sidebar.classList.add("sidebar--collapsed");
        openBtn.hidden = false;
    });
    openBtn.addEventListener("click", () => {
        sidebar.classList.remove("sidebar--collapsed");
        openBtn.hidden = true;
    });
}