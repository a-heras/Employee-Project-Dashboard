const STORAGE_KEY = "monthlyData";

function loadAll() {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
}

export function saveAll(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function getMonthKey(year, month) {
    return `${year}-${month}`;
}

export function ensureMonthExists(year, month) {
    const allData = loadAll();
    const key = getMonthKey(year, month);

    if (!allData[key]) {
        allData[key] = {
            employees: [],
            projects: []
        }
        saveAll(allData);
    }
    return allData;
}

export function initSampleData() {
    const allData = loadAll();

    if (Object.keys(allData).length > 0) return;

    const sampleData = {
        "2026-0": {
            employees: [
                {
                    id: crypto.randomUUID(),
                    name: "John",
                    surname: "Doe",
                    dob: "1990-05-12",
                    position: "Senior",
                    salary: 4500,
                    assignments: [],
                    vacation: {}
                }
            ],
            projects: [
                {
                    id: crypto.randomUUID(),
                    projectName: "CRM System",
                    companyName: "Acme Corp",
                    budget: 120000,
                    capacity: 3
                }
            ]
        }
    };

    saveAll(sampleData);
}

export function getEmployees (year, month) {
    const allData = ensureMonthExists(year, month);
    return allData[getMonthKey(year, month)].employees;
}

export function getProjects (year, month) {
    const allData = ensureMonthExists(year, month);
    return allData[getMonthKey(year, month)].projects;
}

export function addEmployee (year, month, employee) {
    const allData = ensureMonthExists(year, month);
    const key = getMonthKey(year, month);

    allData[key].employees.push(employee);

    saveAll(allData);
}

export function addProject (year, month, project) {
    const allData = ensureMonthExists(year, month);
    const key = getMonthKey(year, month);

    allData[key].projects.push(project);

    saveAll(allData);

    document.dispatchEvent(new CustomEvent("data-updated"));
}

export function updateEmployee (year, month, updatedEmployee) {
    const allData = ensureMonthExists(year, month);
    const key = getMonthKey(year, month);

    allData[key].employees = allData[key].employees.map((emp) =>
        emp.id === updatedEmployee.id ? updatedEmployee : emp
    );

    saveAll(allData);
}

export function updateProject (year, month, updatedProject) {
    const allData = ensureMonthExists(year, month);
    const key = getMonthKey(year, month);

    allData[key].projects = allData[key].projects.map((proj) =>
        proj.id === updatedProject.id ? updatedProject : proj
    );

    saveAll(allData); 
}

export function deleteEmployee (year, month, employeeId) {
    const allData = ensureMonthExists(year, month);
    const key = getMonthKey(year, month);

    allData[key].employees = allData[key].employees.filter((emp) => emp.id !== employeeId);

    saveAll(allData);
}

export function deleteProject (year, month, projectId) {
    const allData = ensureMonthExists(year, month);
    const key = getMonthKey(year, month);

    allData[key].projects = allData[key].projects.filter((proj) => proj.id !== projectId);

    allData[key].employees = allData[key].employees.map((emp) => ({
        ...emp,
        assignments: emp.assignments
        ? emp.assignments.filter((a) => a.projectId !== projectId)
        : emp.assignments
    }));

    saveAll(allData);
}

const MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

export function formatMonthLabel(year, month) {
    const name = MONTH_NAMES[Number(month)] ?? `Month ${month}`;
    return `${name} ${year}`;
}

export function parseMonthKey(key) {
    const dash = key.indexOf("-");
    if (dash <= 0) return null;
    const year = Number(key.slice(0, dash));
    const month = Number(key.slice(dash + 1));
    if (!Number.isFinite(year) || !Number.isFinite(month)) return null;
    return { year, month };
}

function monthHasContent(entry) {
    if (!entry) return false;
    const projectsLen = entry.projects?.length ?? 0;
    const employeesLen = entry.employees?.length ?? 0;
    return projectsLen > 0 || employeesLen > 0;
}

export function listMonthsWithDataForSeed(currentYear, currentMonth) {
    const allData = loadAll();
    const excludeKey = getMonthKey(currentYear, currentMonth);
    const keys = Object.keys(allData).filter((key) => {
        if (key === excludeKey) return false;
        return monthHasContent(allData[key]);
    });
    keys.sort((a, b) => {
        const pa = parseMonthKey(a);
        const pb = parseMonthKey(b);
        if (!pa || !pb) return a.localeCompare(b);
        if (pa.year !== pb.year) return pa.year - pb.year;
        return pa.month - pb.month;
    });
    return keys.map((key) => {
        const parsed = parseMonthKey(key);
        const slice = allData[key];
        return {
            key,
            year: parsed.year,
            month: parsed.month,
            label: formatMonthLabel(parsed.year, parsed.month),
            projects: slice.projects || [],
            employees: slice.employees || []
        };
    });
}

export function seedMonthFromSource(targetYear, targetMonth, sourceYear, sourceMonth) {
    const allData = loadAll();
    const sourceKey = getMonthKey(sourceYear, sourceMonth);
    const targetKey = getMonthKey(targetYear, targetMonth);
    const source = allData[sourceKey];
    if (!source || !monthHasContent(source)) return false;

    const clone = JSON.parse(JSON.stringify(source));
    clone.employees = (clone.employees || []).map((emp) => {
        const vacation = { ...(emp.vacation || {}) };
        delete vacation[targetKey];
        return {
            ...emp,
            assignments: emp.assignments || [],
            vacation
        };
    });
    clone.projects = clone.projects || [];

    allData[targetKey] = clone;
    saveAll(allData);
    document.dispatchEvent(new CustomEvent("data-updated"));
    return true;
}