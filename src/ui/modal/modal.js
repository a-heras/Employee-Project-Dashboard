const modal = document.querySelector("[data-modal]");
const backdrop = document.querySelector("[data-backdrop]");
const content = document.querySelector("[data-modal-content]");

export function openModal() {
    modal.removeAttribute("hidden");
    backdrop.removeAttribute("hidden");
    document.body.style.overflow = "hidden";
}

export function closeModal() {
    modal.setAttribute("hidden", "");
    backdrop.setAttribute("hidden", "");
    content.innerHTML = "";
    modal.classList.remove("modal--wide");
    document.body.style.overflow = "";
}

document.addEventListener("click", (e) => {
    if (e.target.matches("[data-modal-close]")) closeModal();
});
backdrop.addEventListener("click", () => closeModal());
modal.addEventListener("click", (e) => {
    if (e.target.closest("[data-modal-close]")) return closeModal();
    e.stopPropagation();
});