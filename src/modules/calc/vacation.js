export function getWorkingDaysInMonth(year, month) {
    let count = 0;
    const days = new Date(year, month + 1, 0).getDate();
    for (let d = 1; d <= days; d++) {
        const day = new Date(year, month, d).getDay();
        if (day !== 0 && day !== 6) count++;
    }
    return count;
}

export function getVacationWorkingDays(vacationDays, year, month) {
    let count = 0;
    vacationDays.forEach((day) => {
        const weekday = new Date(year, month, day).getDay();
        if (weekday !== 0 && weekday !== 6) count++;
    });
    return count;
}

export function getVacationCoefficient(vacationDays, year, month) {
    const workingDays = getWorkingDaysInMonth(year, month);
    const vacationWorkingDays = getVacationWorkingDays(vacationDays, year, month);
    if (workingDays <= 0) return 1;
    return (workingDays - vacationWorkingDays) / workingDays;
}