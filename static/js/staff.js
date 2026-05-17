// staff.js - Modular Staff Directory Script

function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}
const csrftoken = getCookie('csrftoken');

let deleteTargetId = null;

// ------------------------------
// Drawer functions
// ------------------------------
window.openDrawer = function(staffId = null) {
    const drawer = document.getElementById('staffDrawer');
    const form = document.getElementById('staffForm');
    const editStaffId = document.getElementById('editStaffId');
    const title = document.getElementById('drawer-title');
    const subtitle = document.getElementById('drawer-subtitle');
    if (!drawer) return;
    form?.reset();
    if (editStaffId) editStaffId.value = '';
    if (title) title.innerText = 'Register New Staff';
    if (subtitle) subtitle.innerText = 'Complete all mandatory fields';

    if (staffId) {
        fetch(`/staff/edit/${staffId}/?format=json`, {
            headers: { 'X-Requested-With': 'XMLHttpRequest' }
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                const s = data.staff;
                document.getElementById('drawerSlno').value = s.slno || '';
                document.getElementById('drawerStaffId').value = s.staff_id || '';
                document.getElementById('drawerName').value = s.name || '';
                document.getElementById('drawerDesignation').value = s.designation || '';
                document.getElementById('drawerProgram').value = s.program || '';
                document.getElementById('drawerDepartment').value = s.department || '';
                document.getElementById('drawerCollege').value = s.college || '';
                document.getElementById('drawerDoj').value = s.doj || '';
                document.getElementById('drawerDor').value = s.dor || '';
                document.getElementById('drawerPhone').value = s.phone || '';
                document.getElementById('drawerEmail').value = s.email || '';
                document.getElementById('drawerCity').value = s.city || '';
                document.getElementById('drawerDistrict').value = s.district || '';
                document.getElementById('drawerBankAccount').value = s.bank_account || '';
                document.getElementById('drawerBankName').value = s.bank_name || '';
                document.getElementById('drawerIfsc').value = s.ifsc_code || '';
                document.getElementById('drawerRemark').value = s.remark || '';
                if (editStaffId) editStaffId.value = staffId;
                if (title) title.innerText = 'Update Staff Record';
                if (subtitle) subtitle.innerText = `Editing ID: ${s.staff_id}`;
                drawer.classList.remove('hidden');
            } else alert('Error loading staff data');
        })
        .catch(() => alert('Failed to load staff details'));
    } else drawer.classList.remove('hidden');
};

window.closeDrawer = () => document.getElementById('staffDrawer')?.classList.add('hidden');

// ------------------------------
// Delete modal
// ------------------------------
window.openDeleteModal = function(id, name) {
    deleteTargetId = id;
    const msgEl = document.getElementById('deleteModalMessage');
    if (msgEl) msgEl.innerText = `Are you sure you want to delete "${name}"? This action cannot be undone.`;
    const modal = document.getElementById('deleteModal');
    if (modal) modal.classList.remove('hidden');
};

window.closeDeleteModal = () => {
    const modal = document.getElementById('deleteModal');
    if (modal) modal.classList.add('hidden');
    deleteTargetId = null;
};

// ------------------------------
// Table sorting
// ------------------------------
let currentSort = { col: null, dir: 'asc' };

function getCellValue(row, colIndex) {
    const cells = row.cells;
    if (!cells[colIndex]) return '';
    if (colIndex === 0) return parseInt(cells[0]?.innerText?.trim(), 10) || 0;
    if (colIndex === 2) {
        const nameSpan = cells[2]?.querySelector('.name-text');
        return nameSpan ? nameSpan.innerText.trim() : cells[2]?.innerText?.trim() || '';
    }
    if (colIndex === 9 || colIndex === 10) {
        let dateStr = cells[colIndex]?.innerText?.replace(/[^0-9-]/g, '') || '';
        return dateStr;
    }
    let raw = cells[colIndex]?.innerText?.trim() || '';
    if (colIndex === 11) {
        let num = parseFloat(raw.replace(/[^0-9]/g, ''));
        return isNaN(num) ? raw : num;
    }
    return raw;
}

function sortTableByColumn(colIndex, thElement) {
    const tbody = document.getElementById('staffTableBody');
    if (!tbody) return;
    const rows = Array.from(tbody.querySelectorAll('tr.staff-row'));
    if (!rows.length) return;

    let direction = (currentSort.col === colIndex && currentSort.dir === 'asc') ? 'desc' : 'asc';
    currentSort = { col: colIndex, dir: direction };

    document.querySelectorAll('.sortable-th .sort-icon').forEach(icon => {
        icon.classList.remove('bi-arrow-up', 'bi-arrow-down', 'sort-icon-active');
        icon.classList.add('bi-arrow-down-up');
    });
    const targetIcon = thElement.querySelector('.sort-icon');
    if (targetIcon) {
        targetIcon.classList.remove('bi-arrow-down-up');
        targetIcon.classList.add(direction === 'asc' ? 'bi-arrow-up' : 'bi-arrow-down');
        targetIcon.style.color = '#4f46e5';
    }

    rows.sort((a, b) => {
        let valA = getCellValue(a, colIndex);
        let valB = getCellValue(b, colIndex);
        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();
        if (valA < valB) return direction === 'asc' ? -1 : 1;
        if (valA > valB) return direction === 'asc' ? 1 : -1;
        return 0;
    });

    rows.forEach(row => tbody.appendChild(row));
    rows.forEach((row, idx) => {
        const slnoSpan = row.querySelector('.slno-cell span');
        if (slnoSpan) slnoSpan.innerText = (idx + 1).toString();
    });
}

// ------------------------------
// File upload enable button
// ------------------------------
function initFileUpload() {
    const fileInput = document.getElementById('fileInput');
    const submitBtn = document.getElementById('submitBtn');
    const fileNameDisplay = document.getElementById('fileNameDisplay');
    const actionIcon = document.getElementById('actionIcon');
    if (!fileInput || !submitBtn) return;
    fileInput.addEventListener('change', function(e) {
        const fileName = e.target.files[0]?.name || "Upload Workbook";
        if (fileNameDisplay) fileNameDisplay.textContent = fileName;
        if (e.target.files && e.target.files.length > 0) {
            submitBtn.disabled = false;
            submitBtn.classList.remove('cursor-not-allowed', 'opacity-60', 'bg-blue-50', 'text-blue-600');
            submitBtn.classList.add('bg-blue-600', 'text-white', 'hover:bg-blue-700');
            if (actionIcon) actionIcon.className = "bi bi-check-lg text-lg animate-pulse";
        } else {
            submitBtn.disabled = true;
            submitBtn.classList.add('cursor-not-allowed', 'opacity-60');
            submitBtn.classList.remove('bg-blue-600', 'text-white', 'hover:bg-blue-700');
            if (actionIcon) actionIcon.className = "bi bi-cloud-arrow-up-fill text-lg";
        }
    });
}

// ------------------------------
// Cascade dropdowns
// ------------------------------
function updateSelect(id, values) {
    const select = document.getElementById(id);
    if (!select) return;
    const currentVal = select.value;
    select.innerHTML = `<option value="">All ${id.charAt(0).toUpperCase() + id.slice(1)}</option>`;
    values.forEach(v => select.innerHTML += `<option value="${v}" ${v === currentVal ? 'selected' : ''}>${v}</option>`);
}

function loadDropdowns(changedField) {
    const program = document.getElementById("program")?.value || '';
    const department = document.getElementById("department")?.value || '';
    const college = document.getElementById("college")?.value || '';
    const name = document.getElementById("name")?.value || '';
    fetch(`/staff/ajax/filter/?program=${encodeURIComponent(program)}&department=${encodeURIComponent(department)}&college=${encodeURIComponent(college)}&name=${encodeURIComponent(name)}`)
        .then(res => res.json())
        .then(data => {
            if (changedField === "program") {
                updateSelect("department", data.departments);
                updateSelect("college", data.colleges);
                updateSelect("name", data.names);
            } else if (changedField === "department") {
                updateSelect("college", data.colleges);
                updateSelect("name", data.names);
            } else if (changedField === "college") updateSelect("name", data.names);
        })
        .catch(err => console.error("Dropdown error:", err));
}

// ------------------------------
// Form submission (AJAX)
// ------------------------------
function initStaffForm() {
    const form = document.getElementById('staffForm');
    const editStaffId = document.getElementById('editStaffId');
    if (!form) return;
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        const formData = new FormData(form);
        const staffId = editStaffId?.value || '';
        const url = staffId ? `/staff/edit/${staffId}/` : '/staff/add/0/';
        fetch(url, {
            method: 'POST',
            headers: { 'X-CSRFToken': csrftoken, 'X-Requested-With': 'XMLHttpRequest' },
            body: formData
        })
        .then(res => res.json())
        .then(data => data.success ? window.location.reload() : alert('Error: ' + (data.error || 'Could not save.')))
        .catch(() => alert('Network error. Please try again.'));
    });
}

// ------------------------------
// Delete confirmation
// ------------------------------
function initDeleteButton() {
    const confirmBtn = document.getElementById('confirmDeleteBtn');
    if (!confirmBtn) return;
    confirmBtn.addEventListener('click', function() {
        if (!deleteTargetId) return;
        fetch(`/staff/delete/${deleteTargetId}/`, {
            method: 'POST',
            headers: { 'X-CSRFToken': csrftoken, 'X-Requested-With': 'XMLHttpRequest' }
        })
        .then(res => res.json())
        .then(data => data.success ? window.location.reload() : alert('Delete failed: ' + (data.error || 'Unknown error')))
        .catch(() => alert('Delete error'));
        closeDeleteModal();
    });
}

// ------------------------------
// Attach sorting listeners
// ------------------------------
function initSorting() {
    document.querySelectorAll('.sortable-th').forEach(th => {
        th.addEventListener('click', (e) => {
            const colIdx = parseInt(th.getAttribute('data-col-index'), 10);
            if (!isNaN(colIdx)) sortTableByColumn(colIdx, th);
        });
    });
}

// ------------------------------
// Event listeners for dropdowns
// ------------------------------
function initDropdownListeners() {
    const programSelect = document.getElementById("program");
    const deptSelect = document.getElementById("department");
    const collegeSelect = document.getElementById("college");
    if (programSelect) programSelect.addEventListener("change", () => loadDropdowns("program"));
    if (deptSelect) deptSelect.addEventListener("change", () => loadDropdowns("department"));
    if (collegeSelect) collegeSelect.addEventListener("change", () => loadDropdowns("college"));
}

// ------------------------------
// DOM Ready
// ------------------------------
document.addEventListener('DOMContentLoaded', () => {
    initFileUpload();
    initStaffForm();
    initDeleteButton();
    initSorting();
    initDropdownListeners();
});