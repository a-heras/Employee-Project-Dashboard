import { getVacationCoefficient } from "../calc/vacation.js";
import {
    calculateAssignmentRevenue,
    getEffectiveCapacity
} from "./calcProjects.js";

export function calculateAge(dob) {
    const birth = new Date(dob);
    const now = new Date();
    let age = now.getFullYear() - birth.getFullYear();
    const m = now.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
    return age;
}

export function calculateEmployeeEffectiveCapacity(emp, year, month) {
    const vacationDays = emp.vacation?.[`${year}-${month}`] || [];
    const vacationCoef = getVacationCoefficient(vacationDays, year, month);
    let total = 0;
    emp.assignments?.forEach((a) => {
        total += getEffectiveCapacity(a, vacationCoef);
    });
    return Number(total.toFixed(3));
}

export function calculateEmployeePayment(emp) {
    if (!emp.assignments || emp.assignments.length === 0) return Number((emp.salary * 0.5).toFixed(2));
    let total = 0;
    emp.assignments.forEach((assignment) => {
        total += emp.salary * Math.max(0.5, assignment.capacity);
    });
    return Number(total.toFixed(2));
}

export function calculateEmployeeProjectedIncome(emp, projects, employees, year, month) {
    if (!emp.assignments || emp.assignments.length === 0) return Number((-emp.salary * 0.5).toFixed(2));
    let total = 0;
    emp.assignments?.forEach((a) => {
        const project = projects.find((p) => p.id === a.projectId);
        if (!project) return;
        const vacationDays = emp.vacation?.[`${year}-${month}`] || [];
        const vacationCoef = getVacationCoefficient(vacationDays, year, month);
        const effective = getEffectiveCapacity(a, vacationCoef);
        const revenue = calculateAssignmentRevenue(project, employees, project.id, year, month, effective);
        const cost = emp.salary * Math.max(0.5, a.capacity);
        total += revenue - cost;
    });
    return Number(total.toFixed(2));
}