const now = new Date();
let currentYear = now.getFullYear();
let currentMonth = now.getMonth();

export function setCurrentPeriod(year, month) {
    currentYear = Number(year);
    currentMonth = Number(month);
}

export function getCurrentYear() {
    return currentYear;
}

export function getCurrentMonth() {
    return currentMonth;
}