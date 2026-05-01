import { getVacationCoefficient } from "../calc/vacation.js";

export function getEffectiveCapacity(assignment, vacationCoef) {
    return Number(assignment.capacity * assignment.fit * vacationCoef);
}

export function getEmployeesAssignedToProject(employees, projectId) {
    return employees.filter((emp) => emp.assignments?.some((a) => a.projectId === projectId));
}

function sumEffectiveCapacityOnProject(employees, projectId, year, month) {
    let total = 0;
    employees.forEach((emp) => {
        const vacationDays = emp.vacation?.[`${year}-${month}`] || [];
        const vacationCoef = getVacationCoefficient(vacationDays, year, month);
        emp.assignments?.forEach((a) => {
            if (a.projectId === projectId) total += getEffectiveCapacity(a, vacationCoef);
        });
    });
    return total;
}

export function calculateProjectUsedCapacity(employees, projectId, year, month) {
    return Number(sumEffectiveCapacityOnProject(employees, projectId, year, month).toFixed(3));
}

export function calculateProjectUsedCapacityRaw(employees, projectId, year, month) {
    return sumEffectiveCapacityOnProject(employees, projectId, year, month);
}

export function calculateAssignmentRevenue(project, employees, projectId, year, month, assignmentEffectiveCapacity) {
    const usedRaw = calculateProjectUsedCapacityRaw(employees, projectId, year, month);
    const capacityForRevenue = Math.max(Number(project.capacity), usedRaw);
    const revenuePerCap = Number(project.budget) / capacityForRevenue;
    return Number((revenuePerCap * assignmentEffectiveCapacity).toFixed(2));
}

export function calculateProjectCost(employees, projectId) {
    let total = 0;
    employees.forEach((emp) => {
        emp.assignments?.forEach((a) => {
            if (a.projectId === projectId) total += emp.salary * Math.max(0.5, a.capacity);
        });
    });
    return Number(total.toFixed(2));
}

export function calculateProjectProfit(project, employees, year, month) {
    const usedRaw = calculateProjectUsedCapacityRaw(employees, project.id, year, month);
    const capacityForRevenue = Math.max(Number(project.capacity), usedRaw);
    const revenuePerCap = Number(project.budget) / capacityForRevenue;
    const totalRevenue = Number((revenuePerCap * usedRaw).toFixed(2));
    const totalCost = calculateProjectCost(employees, project.id);
    return Number((totalRevenue - totalCost).toFixed(2));
}

export function calculateTotalEstimatedIncome(projects, employees, year, month) {
    let total = 0;
    projects.forEach((project) => {
        total += calculateProjectProfit(project, employees, year, month);
    });
    employees.forEach((emp) => {
        const assigns = emp.assignments || [];
        if (assigns.length === 0) total -= emp.salary * 0.5;
    });
    return Number(total.toFixed(2));
}