// staff.js - Staff Directory (Full Script)

// -------------------------------------------------------------------
// Helper: Get CSRF token from cookies (used for AJAX POST requests)
// -------------------------------------------------------------------
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

// -------------------------------------------------------------------
// Global functions for Drawer (add/edit) and Delete Modal
// (called from inline onclick attributes)
// -------------------------------------------------------------------
let deleteTargetId = null;

window.openDrawer = function(staffId = null) {
    const drawer = document.getElementById('staffDrawer');
    const form = document.getElementById('staffForm');
    const editStaffId = document.getElementById('editStaffId');
    const drawerTitle = document.getElementById('drawer-title');
    const drawerSubtitle = document.getElementById('drawer-subtitle');

    if (!drawer) return;

    // Reset form
    if (form) form.reset();
    if (editStaffId) editStaffId.value = '';
    if (drawerTitle) drawerTitle.innerText = 'Register New Staff';
    if (drawerSubtitle) drawerSubtitle.innerText = 'Complete all mandatory fields';

    if (staffId) {
        // Fetch existing staff data via AJAX
        fetch(`/staff/edit/${staffId}/?format=json`, {
            headers: { 'X-Requested-With': 'XMLHttpRequest' }
        })
        .then(response => response.json())
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
                if (drawerTitle) drawerTitle.innerText = 'Update Staff Record';
                if (drawerSubtitle) drawerSubtitle.innerText = `Editing ID: ${s.staff_id}`;
                drawer.classList.remove('hidden');
            } else {
                alert('Error loading staff data');
            }
        })
        .catch(err => {
            console.error(err);
            alert('Failed to load staff details');
        });
    } else {
        drawer.classList.remove('hidden');
    }
};

window.closeDrawer = function() {
    const drawer = document.getElementById('staffDrawer');
    if (drawer) drawer.classList.add('hidden');
};

window.openDeleteModal = function(id, name) {
    deleteTargetId = id;
    const msgEl = document.getElementById('deleteModalMessage');
    if (msgEl) {
        msgEl.innerText = `Are you sure you want to delete "${name}"? This action cannot be undone.`;
    }
    const modal = document.getElementById('deleteModal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.style.display = 'flex';
    }
};

window.closeDeleteModal = function() {
    const modal = document.getElementById('deleteModal');
    if (modal) {
        modal.classList.add('hidden');
        modal.style.display = 'none';
    }
    deleteTargetId = null;
};

// -------------------------------------------------------------------
// All DOM-dependent initializations run after page is fully loaded
// -------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', function() {

    // ------------------------------
    // 1. Client-side Table Sorting
    // ------------------------------
    let currentSort = { col: null, dir: 'asc' };

    function getCellValue(row, colIndex) {
        const cells = row.cells;
        if (!cells[colIndex]) return '';

        // Column 0 = S.No. (numeric)
        if (colIndex === 0) {
            return parseInt(cells[0]?.innerText?.trim(), 10) || 0;
        }
        // Column 2 = Name (contains .name-text span)
        if (colIndex === 2) {
            const nameSpan = cells[2]?.querySelector('.name-text');
            return nameSpan ? nameSpan.innerText.trim() : cells[2]?.innerText?.trim() || '';
        }
        // Columns 9 (DOJ) and 10 (DOR) - date strings
        if (colIndex === 9 || colIndex === 10) {
            let dateStr = cells[colIndex]?.innerText?.replace(/[^0-9-]/g, '') || '';
            // Return in YYYY-MM-DD format for correct sorting
            if (dateStr.match(/\d{4}-\d{1,2}-\d{1,2}/)) return dateStr;
            return dateStr || '';
        }
        // Numeric fields (Phone, Bank Account, etc.) - treat as string except phone
        let raw = cells[colIndex]?.innerText?.trim() || '';
        if (colIndex === 11) { // Phone column
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

        // Update sort icons
        document.querySelectorAll('.sortable-th .sort-icon').forEach(icon => {
            icon.classList.remove('bi-arrow-up', 'bi-arrow-down', 'sort-icon-active');
            icon.classList.add('bi-arrow-down-up');
            icon.style.color = '';
        });
        const targetIcon = thElement.querySelector('.sort-icon');
        if (targetIcon) {
            targetIcon.classList.remove('bi-arrow-down-up');
            targetIcon.classList.add(direction === 'asc' ? 'bi-arrow-up' : 'bi-arrow-down');
            targetIcon.classList.add('sort-icon-active');
            targetIcon.style.color = '#4f46e5';
        }

        // Sort rows
        rows.sort((a, b) => {
            let valA = getCellValue(a, colIndex);
            let valB = getCellValue(b, colIndex);
            if (typeof valA === 'string') valA = valA.toLowerCase();
            if (typeof valB === 'string') valB = valB.toLowerCase();
            if (valA < valB) return direction === 'asc' ? -1 : 1;
            if (valA > valB) return direction === 'asc' ? 1 : -1;
            return 0;
        });

        // Reorder DOM and renumber S.No.
        rows.forEach(row => tbody.appendChild(row));
        rows.forEach((row, idx) => {
            const slnoSpan = row.querySelector('.slno-cell span');
            if (slnoSpan) slnoSpan.innerText = (idx + 1).toString();
        });
    }

    // Attach sorting event listeners to all sortable headers
    document.querySelectorAll('.sortable-th').forEach(th => {
        th.addEventListener('click', (e) => {
            const colIdx = parseInt(th.getAttribute('data-col-index'), 10);
            if (!isNaN(colIdx)) sortTableByColumn(colIdx, th);
        });
    });

    // ------------------------------
    // 2. File Upload – Enable Submit Button
    // ------------------------------
    const fileInput = document.getElementById('fileInput');
    const submitBtn = document.getElementById('submitBtn');
    const fileNameDisplay = document.getElementById('fileNameDisplay');
    const actionIcon = document.getElementById('actionIcon');

    if (fileInput && submitBtn && fileNameDisplay) {
        fileInput.addEventListener('change', function(e) {
            const fileName = e.target.files[0]?.name || "Upload Workbook";
            fileNameDisplay.textContent = fileName;
            if (e.target.files && e.target.files.length > 0) {
                submitBtn.removeAttribute('disabled');
                submitBtn.classList.remove('cursor-not-allowed', 'opacity-60', 'bg-blue-50', 'text-blue-600');
                submitBtn.classList.add('bg-blue-600', 'text-white', 'hover:bg-blue-700', 'cursor-pointer');
                if (actionIcon) actionIcon.className = "bi bi-check-lg text-lg block animate-pulse";
            } else {
                submitBtn.setAttribute('disabled', true);
                submitBtn.classList.add('cursor-not-allowed', 'opacity-60');
                submitBtn.classList.remove('bg-blue-600', 'text-white', 'hover:bg-blue-700', 'cursor-pointer');
                if (actionIcon) actionIcon.className = "bi bi-cloud-arrow-up-fill text-lg block";
            }
        });
    }

    // ------------------------------
    // 3. Dynamic Dropdown Cascading (AJAX)
    // ------------------------------
    function updateSelect(id, values) {
        const select = document.getElementById(id);
        if (!select) return;
        const currentVal = select.value;
        let label = id.charAt(0).toUpperCase() + id.slice(1);
        select.innerHTML = `<option value="">All ${label}</option>`;
        values.forEach(v => {
            const selected = (v === currentVal) ? 'selected' : '';
            select.innerHTML += `<option value="${v}" ${selected}>${v}</option>`;
        });
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
                } else if (changedField === "college") {
                    updateSelect("name", data.names);
                }
            })
            .catch(err => console.error("Dropdown cascade error:", err));
    }

    const programSelect = document.getElementById("program");
    const deptSelect = document.getElementById("department");
    const collegeSelect = document.getElementById("college");

    if (programSelect) programSelect.addEventListener("change", () => loadDropdowns("program"));
    if (deptSelect) deptSelect.addEventListener("change", () => loadDropdowns("department"));
    if (collegeSelect) collegeSelect.addEventListener("change", () => loadDropdowns("college"));

    // ------------------------------
    // 4. Drawer Form Submit (AJAX)
    // ------------------------------
    const form = document.getElementById('staffForm');
    const editStaffId = document.getElementById('editStaffId');

    if (form) {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            const formData = new FormData(form);
            const staffId = editStaffId ? editStaffId.value : '';
            let url = '/staff/add/0/';  // create
            if (staffId) {
                url = `/staff/edit/${staffId}/`;
            }
            fetch(url, {
                method: 'POST',
                headers: {
                    'X-CSRFToken': csrftoken,
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    window.location.reload(); // refresh page to show changes
                } else {
                    alert('Error: ' + (data.error || 'Could not save staff record.'));
                }
            })
            .catch(err => {
                console.error(err);
                alert('Network error. Please try again.');
            });
        });
    }

    // ------------------------------
    // 5. Confirm Delete Button Listener
    // ------------------------------
    const confirmBtn = document.getElementById('confirmDeleteBtn');
    if (confirmBtn) {
        confirmBtn.addEventListener('click', function() {
            if (deleteTargetId) {
                fetch(`/staff/delete/${deleteTargetId}/`, {
                    method: 'POST',
                    headers: {
                        'X-CSRFToken': csrftoken,
                        'X-Requested-With': 'XMLHttpRequest'
                    }
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        window.location.reload();
                    } else {
                        alert('Delete failed: ' + (data.error || 'Unknown error'));
                    }
                })
                .catch(err => {
                    console.error(err);
                    alert('Delete error');
                });
            }
            window.closeDeleteModal();
        });
    }
});