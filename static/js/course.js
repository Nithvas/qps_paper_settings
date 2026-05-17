// ------------------------------
// CSRF Token Helper
// ------------------------------

if (typeof csrftoken === 'undefined') {
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
    var csrftoken = getCookie('csrftoken');
}

// ------------------------------
// Drawer Scroll Locking
// ------------------------------

let openDrawerCount = 0;

function lockBodyScroll() {
    openDrawerCount++;
    if (openDrawerCount === 1) {
        document.body.classList.add('drawer-open');
    }
}

function unlockBodyScroll() {
    openDrawerCount--;
    if (openDrawerCount === 0) {
        document.body.classList.remove('drawer-open');
    }
}

// ------------------------------
// Helper: Get/set radio button value
// ------------------------------

function getSelectedProgram() {
    const selected = document.querySelector('input[name="program"]:checked');
    return selected ? selected.value : '';
}

function setSelectedProgram(value) {
    const radio = document.querySelector(`input[name="program"][value="${value}"]`);
    if (radio) radio.checked = true;
}

// ------------------------------
// Helper: Reset entire course form
// ------------------------------

function resetCourseForm() {
    const form = document.getElementById('courseForm');
    if (form) form.reset();
    document.querySelectorAll('input[name="program"]').forEach(r => r.checked = false);
    document.getElementById('editCourseId').value = '';
}

// ------------------------------
// Add/Edit Drawer Functions
// ------------------------------

function openCourseDrawer(courseCode = null) {

    const drawer = document.getElementById('courseDrawer');
    const form = document.getElementById('courseForm');
    const editCourseId = document.getElementById('editCourseId');
    const title = document.getElementById('drawer-title');
    const subtitle = document.getElementById('drawer-subtitle');

    if (!drawer) return;
    resetCourseForm();

    if (title) title.innerText = 'Register New Course';
    if (subtitle) subtitle.innerText = 'Complete all mandatory fields';

    if (courseCode) {
        fetch(`/course/edit/${courseCode}/?format=json`, {
            headers: { 'X-Requested-With': 'XMLHttpRequest' }
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                const c = data.course;
                document.getElementById('drawerCourseCode').value = c.course_code || '';
                document.getElementById('drawerCourseTitle').value = c.course_title || '';
                document.getElementById('drawerCourseId').value = c.course_id || '';
                const semesterSelect = document.getElementById('drawerSemester');
                if (semesterSelect) semesterSelect.value = c.semester || '';
                setSelectedProgram(c.program);
                document.getElementById('drawerExternalMark').value = c.external_mark || '';
                document.getElementById('drawerExaminer').value = c.examiner || '';
                if (editCourseId) editCourseId.value = courseCode;
                if (title) title.innerText = 'Update Course Record';
                if (subtitle) subtitle.innerText = `Editing Code: ${c.course_code}`;
                drawer.classList.remove('hidden');
                lockBodyScroll();
            } else {
                alert('Error loading course data: ' + (data.error || 'Unknown error'));
            }
        })
        .catch(err => {
            console.error('Fetch error:', err);
            alert('Failed to load course details. Check console.');
        });
    } else {
        drawer.classList.remove('hidden');
        lockBodyScroll();
    }
}

function closeCourseDrawer() {
    const drawer = document.getElementById('courseDrawer');
    if (drawer) {
        drawer.classList.add('hidden');
        unlockBodyScroll();
    }
}

// ------------------------------
// Delete Drawer Functions
// ------------------------------

let pendingDeleteCallback = null;

function openDeleteDrawer(courseCode, courseTitle, onConfirmCallback) {

    const drawer = document.getElementById('deleteDrawer');
    if (!drawer) return;

    document.getElementById('deleteDrawerCourseTitle').innerText = courseTitle;
    const msgSpan = document.getElementById('deleteDrawerMessage');
    if (msgSpan) {
        msgSpan.innerHTML = `Are you completely certain you want to purge the course <strong class="text-rose-700">${escapeHtml(courseTitle)}</strong> (${escapeHtml(courseCode)})? This action cannot be undone.`;
    }

    pendingDeleteCallback = onConfirmCallback;

    const confirmBtn = document.getElementById('confirmDeleteBtn');
    const newConfirmBtn = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
    newConfirmBtn.id = 'confirmDeleteBtn';
    newConfirmBtn.addEventListener('click', function() {
        if (pendingDeleteCallback) {
            pendingDeleteCallback();
            pendingDeleteCallback = null;
        }
        closeDeleteDrawer();
    });

    drawer.classList.remove('hidden');
    lockBodyScroll();
}

function closeDeleteDrawer() {
    const drawer = document.getElementById('deleteDrawer');
    if (drawer) {
        drawer.classList.add('hidden');
        unlockBodyScroll();
        pendingDeleteCallback = null;
    }
}

function openDeleteModal(courseCode, courseTitle) {
    openDeleteDrawer(courseCode, courseTitle, function() {
        fetch(`/course/delete/${courseCode}/`, {
            method: 'POST',
            headers: {
                'X-CSRFToken': csrftoken,
                'X-Requested-With': 'XMLHttpRequest'
            }
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) window.location.reload();
            else alert('Delete failed: ' + (data.error || 'Unknown error'));
        })
        .catch(() => alert('Network error while deleting'));
    });
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

// ------------------------------
// Form Submission (AJAX) – collects radio & select values correctly
// ------------------------------

function initCourseForm() {

    const form = document.getElementById('courseForm');
    const editCourseId = document.getElementById('editCourseId');
    if (!form) return;

    form.addEventListener('submit', function(e) {
        e.preventDefault();

        const courseCode = document.getElementById('drawerCourseCode').value;
        const courseTitle = document.getElementById('drawerCourseTitle').value;
        const courseId = document.getElementById('drawerCourseId').value;
        const semester = document.getElementById('drawerSemester').value;
        const program = getSelectedProgram();
        const externalMark = document.getElementById('drawerExternalMark').value;
        const examiner = document.getElementById('drawerExaminer').value;

        if (!courseCode || !courseTitle || !courseId || !semester || !program) {
            alert('Please fill all required fields (Course Code, Title, ID, Semester, Program).');
            return;
        }

        const formData = new FormData();
        formData.append('course_code', courseCode);
        formData.append('course_title', courseTitle);
        formData.append('course_id', courseId);
        formData.append('semester', semester);
        formData.append('program', program);
        formData.append('external_mark', externalMark);
        formData.append('examiner', examiner);

        const isEdit = editCourseId && editCourseId.value !== '';
        const url = isEdit ? `/course/edit/${courseCode}/` : '/course/add/';

        fetch(url, {
            method: 'POST',
            headers: {
                'X-CSRFToken': csrftoken,
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: formData
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) window.location.reload();
            else alert('Error : ' + (data.error || 'Could not save.'));
        })
        .catch(() => alert('Network error. Please try again.'));
    });
}

// ------------------------------
// Table Sorting (unchanged but works with new structure)
// ------------------------------

let currentSort = { col: null, dir: 'asc' };

function getCellValue(row, colIndex) {
    const cells = row.cells;
    if (!cells[colIndex]) return '';
    if (colIndex === 0) return parseInt(cells[0]?.innerText?.trim(), 10) || 0;
    let text = cells[colIndex]?.innerText?.trim() || '';
    if (colIndex === 7) {
        let num = parseFloat(text.replace(/[^0-9.-]/g, ''));
        return isNaN(num) ? text : num;
    }
    return text.toLowerCase();
}

function sortTableByColumn(colIndex, thElement) {

    const tbody = document.getElementById('courseTableBody');
    if (!tbody) return;
    const rows = Array.from(tbody.querySelectorAll('tr.course-row'));
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

function initSorting() {
    document.querySelectorAll('.sortable-th').forEach(th => {
        th.addEventListener('click', (e) => {
            const colIdx = parseInt(th.getAttribute('data-col-index'), 10);
            if (!isNaN(colIdx)) sortTableByColumn(colIdx, th);
        });
    });
}

// ------------------------------
// File Upload Handler
// ------------------------------

function initFileUpload() {

    const fileInput = document.getElementById('courseFileInput');
    const submitBtn = document.getElementById('courseUploadBtn');
    const fileNameDisplay = document.getElementById('courseFileNameDisplay');
    const actionIcon = document.getElementById('actionIcon');
    if (!fileInput || !submitBtn) return;

    fileInput.addEventListener('change', function(e) {
        const fileName = e.target.files[0]?.name || "Upload Course Workbook";
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
// Close Drawers on Backdrop Click & ESC
// ------------------------------

document.addEventListener('click', function(e) {
    const addBackdrop = document.querySelector('#courseDrawer .absolute.inset-0');
    if (addBackdrop && addBackdrop === e.target) closeCourseDrawer();
    const delBackdrop = document.querySelector('#deleteDrawer .absolute.inset-0');
    if (delBackdrop && delBackdrop === e.target) closeDeleteDrawer();
});

document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        const deleteDrawer = document.getElementById('deleteDrawer');
        if (deleteDrawer && !deleteDrawer.classList.contains('hidden')) {
            closeDeleteDrawer();
            return;
        }
        const addDrawer = document.getElementById('courseDrawer');
        if (addDrawer && !addDrawer.classList.contains('hidden')) closeCourseDrawer();
    }
});

// ------------------------------
// DOM Ready
// ------------------------------

document.addEventListener('DOMContentLoaded', () => {
    initFileUpload();
    initCourseForm();
    initSorting();
});

window.openCourseDrawer = openCourseDrawer;
window.closeCourseDrawer = closeCourseDrawer;
window.openDeleteDrawer = openDeleteDrawer;
window.closeDeleteDrawer = closeDeleteDrawer;
window.openDeleteModal = openDeleteModal;