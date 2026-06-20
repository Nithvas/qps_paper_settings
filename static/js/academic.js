// ===================================================================
// ACADEMIC YEAR MANAGEMENT APPLICATION - COMPLETE MODULE
// ===================================================================

(function () {

    'use strict';

    // ===================================================================
    // 1. CORE UTILITIES & HELPERS
    // ===================================================================

    function escapeHtml(str) {
        if (!str) return '';
        return String(str).replace(/[&<>]/g, function (m) {
            if (m === '&') return '&amp;';
            if (m === '<') return '&lt;';
            if (m === '>') return '&gt;';
            return m;
        });
    }

    function lockBodyScroll() {
        window.openDrawerCount = (window.openDrawerCount || 0) + 1;
        if (window.openDrawerCount === 1) {
            const scrollY = window.scrollY;
            document.body.classList.add('drawer-open');
            document.body.style.position = 'fixed';
            document.body.style.top = `-${scrollY}px`;
            document.body.style.left = '0';
            document.body.style.right = '0';
            document.body.style.width = '100%';
            document.body.style.overflow = 'hidden';
            document.body.dataset.scrollPosition = scrollY;
        }
    }

    function unlockBodyScroll() {
        window.openDrawerCount = (window.openDrawerCount || 0) - 1;
        if (window.openDrawerCount === 0) {
            const scrollY = document.body.dataset.scrollPosition;
            document.body.classList.remove('drawer-open');
            document.body.style.position = '';
            document.body.style.top = '';
            document.body.style.left = '';
            document.body.style.right = '';
            document.body.style.width = '';
            document.body.style.overflow = '';
            if (scrollY) {
                window.scrollTo(0, parseInt(scrollY));
                delete document.body.dataset.scrollPosition;
            }
        }
    }

    // ===================================================================
    // 2. CSRF & SECURITY
    // ===================================================================

    function getCsrfToken() {
        let cookieValue = null;
        if (document.cookie && document.cookie !== '') {
            const cookies = document.cookie.split(';');
            for (let i = 0; i < cookies.length; i++) {
                const cookie = cookies[i].trim();
                if (cookie.substring(0, 'csrftoken'.length + 1) === ('csrftoken=')) {
                    cookieValue = decodeURIComponent(cookie.substring('csrftoken'.length + 1));
                    break;
                }
            }
        }
        return cookieValue;
    }

    const csrftoken = getCsrfToken();

    // ===================================================================
    // 3. TOAST NOTIFICATIONS
    // ===================================================================

    function showToast(message, type = 'info') {
        const toast = document.createElement('div');
        const bgColor = type === 'success' ? 'bg-emerald-700' : (type === 'error' ? 'bg-red-500' : 'bg-blue-500');
        toast.className = `fixed bottom-4 right-4 px-4 py-2 rounded-lg text-white text-sm z-50 animate-fade-in ${bgColor}`;
        toast.textContent = message;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }

    // ===================================================================
    // 4. DRAWER MANAGEMENT (MODAL CONTROLLERS)
    // ===================================================================

    const DrawerManager = {

        academicDrawer: null,
        deleteDrawer: null,

        init() {
            this.academicDrawer = document.getElementById('academicDrawer');
            this.deleteDrawer = document.getElementById('deleteDrawer');
        },

        openAcademic(yearId = null) {

            if (!this.academicDrawer) return;

            const form = document.getElementById('academicForm');
            const editAcademicYearId = document.getElementById('editAcademicYearId');
            const title = document.getElementById('drawer-title');
            const subtitle = document.getElementById('drawer-subtitle');
            const submitButton = document.querySelector('#academicForm button[type="submit"]');

            form?.reset();

            // Reset checkbox
            const isActiveCheckbox = document.getElementById('drawerIsActive');
            if (isActiveCheckbox) isActiveCheckbox.checked = true;

            if (editAcademicYearId) editAcademicYearId.value = '';
            if (title) title.innerText = 'Add New Academic Year';
            if (subtitle) subtitle.innerText = 'Complete all mandatory fields';

            if (submitButton) {
                submitButton.disabled = false;
                submitButton.classList.remove('opacity-50', 'cursor-not-allowed');
                submitButton.innerHTML = '<i class="bi bi-save"></i> Save Academic Year';
            }

            if (yearId) {
                this.loadAcademicYearData(yearId, submitButton, editAcademicYearId, title, subtitle);
            } else {
                this.academicDrawer.classList.remove('hidden');
                lockBodyScroll();
            }
        },

        loadAcademicYearData(yearId, submitButton, editAcademicYearId, title, subtitle) {
            if (submitButton) {
                submitButton.disabled = true;
                submitButton.innerHTML = '<i class="bi bi-hourglass-split animate-spin"></i> Loading...';
            }

            fetch(`/academic/details/${yearId}/`, {
                headers: { 'X-Requested-With': 'XMLHttpRequest' }
            })
                .then(res => {
                    if (!res.ok) throw new Error(`HTTP ${res.status}`);
                    return res.json();
                })
                .then(data => {
                    if (data.success) {
                        this.populateAcademicForm(data.academic_year);
                        if (editAcademicYearId) editAcademicYearId.value = yearId;
                        if (title) title.innerText = 'Update Academic Year';
                        if (subtitle) subtitle.innerText = `Editing: ${data.academic_year.academic_year} - ${data.academic_year.semester}`;
                        this.academicDrawer.classList.remove('hidden');
                        lockBodyScroll();
                    } else {
                        showToast('Error loading academic year data: ' + (data.error || 'Unknown error'), 'error');
                        this.closeAcademic();
                    }
                })
                .catch(err => {
                    console.error('Fetch error:', err);
                    showToast('Failed to load academic year details.', 'error');
                    this.closeAcademic();
                })
                .finally(() => {
                    if (submitButton) {
                        submitButton.disabled = false;
                        submitButton.innerHTML = '<i class="bi bi-save"></i> Save Academic Year';
                    }
                });
        },

        populateAcademicForm(academicYear) {
            const fields = {
                'drawerAcademicYear': academicYear.academic_year,
                'drawerSemester': academicYear.semester,
            };

            for (const [id, value] of Object.entries(fields)) {
                const element = document.getElementById(id);
                if (element) element.value = value || '';
            }

            // Handle semester type select
            const semesterTypeSelect = document.getElementById('drawerSemesterType');
            if (semesterTypeSelect && academicYear.semester_type) {
                semesterTypeSelect.value = academicYear.semester_type;
            }

            // Handle is_active checkbox
            const isActiveCheckbox = document.getElementById('drawerIsActive');
            if (isActiveCheckbox) {
                isActiveCheckbox.checked = academicYear.is_active || false;
            }

            const editAcademicYearId = document.getElementById('editAcademicYearId');
            if (editAcademicYearId && academicYear.id) {
                editAcademicYearId.value = academicYear.id;
            }
        },

        closeAcademic() {
            if (this.academicDrawer) {
                this.academicDrawer.classList.add('hidden');
                unlockBodyScroll();
            }
        },

        openDelete(yearId, yearInfo) {
            if (!this.deleteDrawer) return;

            document.getElementById('deleteDrawerYearInfo').innerText = yearInfo;
            const msgSpan = document.getElementById('deleteDrawerMessage');
            if (msgSpan) {
                msgSpan.innerHTML = `Are you completely certain you want to purge the academic year <strong class="text-rose-700">${escapeHtml(yearInfo)}</strong>? This action cannot be undone.`;
            }

            window.pendingDeleteCallback = () => {
                DeleteManager.executeDelete(yearId);
            };

            const confirmBtn = document.getElementById('confirmDeleteBtn');
            const newConfirmBtn = confirmBtn.cloneNode(true);
            confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
            newConfirmBtn.id = 'confirmDeleteBtn';
            newConfirmBtn.addEventListener('click', () => {
                if (window.pendingDeleteCallback) {
                    window.pendingDeleteCallback();
                    window.pendingDeleteCallback = null;
                }
                this.closeDelete();
            });

            this.deleteDrawer.classList.remove('hidden');
            lockBodyScroll();
        },

        closeDelete() {
            if (this.deleteDrawer) {
                this.deleteDrawer.classList.add('hidden');
                unlockBodyScroll();
                window.pendingDeleteCallback = null;
            }
        }
    };

    // ===================================================================
    // 5. SEARCH FUNCTIONALITY
    // ===================================================================

    const SearchManager = {
        init() {
            const globalSearch = document.getElementById('globalSearch');
            if (globalSearch) {
                let searchTimeout;
                globalSearch.addEventListener('input', (e) => {
                    clearTimeout(searchTimeout);
                    searchTimeout = setTimeout(() => {
                        SearchManager.filterTable();
                    }, 300);
                });
            }
        },

        filterTable() {
            const globalSearch = document.getElementById('globalSearch');
            const searchTerm = (globalSearch?.value || '').toLowerCase().trim();
            const tbody = document.getElementById('academicTableBody');

            if (!tbody) return;

            const rows = Array.from(tbody.querySelectorAll('tr.academic-row'));
            let visibleCount = 0;

            rows.forEach(row => {
                const cells = row.querySelectorAll('td');
                let rowContent = '';

                cells.forEach(cell => {
                    rowContent += cell.textContent + ' ';
                });

                const rowText = rowContent.toLowerCase();
                const matches = searchTerm === '' || rowText.includes(searchTerm);

                if (matches) {
                    row.style.display = 'table-row';
                    visibleCount++;
                } else {
                    row.style.display = 'none';
                }
            });

            const totalCountElement = document.getElementById('academicTotalCount');
            if (totalCountElement) {
                totalCountElement.textContent = visibleCount;
            }

            let noResultsRow = tbody.querySelector('tr.no-results');

            if (visibleCount === 0 && searchTerm !== '') {
                if (!noResultsRow) {
                    noResultsRow = document.createElement('tr');
                    noResultsRow.className = 'no-results';
                    noResultsRow.innerHTML = `
                        <td colspan="6" class="py-12 text-center bg-gradient-to-b from-slate-50 to-white">
                            <div class="mx-auto">
                                <div class="w-12 h-12 mx-auto rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center shadow-inner mb-4">
                                    <i class="bi bi-search text-2xl text-slate-400"></i>
                                </div>
                                <h3 class="text-lg font-black text-slate-800 tracking-tight">No Results Found</h3>
                                <p class="mt-3 text-sm text-slate-400 leading-relaxed">No academic years match "${searchTerm}"</p>
                            </div>
                        </td>
                    `;
                    tbody.appendChild(noResultsRow);
                }
            } else {
                if (noResultsRow) {
                    noResultsRow.remove();
                }
            }
        }
    };

    // ===================================================================
    // 6. TABLE MANAGEMENT & SORTING
    // ===================================================================

    const TableManager = {

        currentSort: { col: null, dir: null },

        init() {
            this.attachSortingHandlers();
            this.markOriginalRowOrder();
        },

        markOriginalRowOrder() {
            const tbody = document.getElementById('academicTableBody');
            if (!tbody) return;
            const rows = Array.from(tbody.querySelectorAll('tr.academic-row'));
            rows.forEach((row, index) => {
                if (typeof row.dataset.originalIndex === 'undefined') {
                    row.dataset.originalIndex = index;
                }
            });
        },

        getColumnIndex(colName) {
            const headers = document.querySelectorAll('.sortable-th');
            for (let i = 0; i < headers.length; i++) {
                if (headers[i].getAttribute('data-col') === colName) {
                    return headers[i].cellIndex;
                }
            }
            return -1;
        },

        getCellValueByIndex(row, colIndex) {
            const cells = row.cells;
            if (!cells[colIndex]) return '';
            return cells[colIndex]?.innerText?.trim() || '';
        },

        sortByColumn(colName, thElement) {
            const tbody = document.getElementById('academicTableBody');
            if (!tbody) return;
            const rows = Array.from(tbody.querySelectorAll('tr.academic-row'));
            if (!rows.length) return;
            this.markOriginalRowOrder();

            let direction;
            if (this.currentSort.col === colName) {
                if (this.currentSort.dir === 'asc') direction = 'desc';
                else if (this.currentSort.dir === 'desc') direction = null;
                else direction = 'asc';
            } else {
                direction = 'asc';
            }

            this.currentSort = { col: direction ? colName : null, dir: direction };

            document.querySelectorAll('.sortable-th .sort-icon').forEach(icon => {
                icon.classList.remove('bi-arrow-up', 'bi-arrow-down');
                icon.classList.add('bi-arrow-down-up');
                icon.style.color = '';
            });
            const targetIcon = thElement.querySelector('.sort-icon');
            if (targetIcon && direction) {
                targetIcon.classList.remove('bi-arrow-down-up');
                targetIcon.classList.add(direction === 'asc' ? 'bi-arrow-up' : 'bi-arrow-down');
                targetIcon.style.color = '#4f46e5';
            }

            if (direction === null) {
                rows.sort((a, b) => Number(a.dataset.originalIndex) - Number(b.dataset.originalIndex));
            } else {
                const colIndex = this.getColumnIndex(colName);
                if (colIndex === -1) return;

                rows.sort((a, b) => {
                    let valA = this.getCellValueByIndex(a, colIndex);
                    let valB = this.getCellValueByIndex(b, colIndex);

                    const numA = parseFloat(valA.replace(/[^0-9.-]+/g, ''));
                    const numB = parseFloat(valB.replace(/[^0-9.-]+/g, ''));
                    if (!isNaN(numA) && !isNaN(numB)) {
                        return direction === 'asc' ? numA - numB : numB - numA;
                    }

                    if (typeof valA === 'string') valA = valA.toLowerCase();
                    if (typeof valB === 'string') valB = valB.toLowerCase();
                    if (valA < valB) return direction === 'asc' ? -1 : 1;
                    if (valA > valB) return direction === 'asc' ? 1 : -1;
                    return 0;
                });
            }

            rows.forEach((row, index) => {
                const serialCell = row.querySelector('td:first-child span');
                if (serialCell) {
                    serialCell.textContent = index + 1;
                } else if (row.cells[0]) {
                    row.cells[0].textContent = index + 1;
                }
                tbody.appendChild(row);
            });
        },

        attachSortingHandlers() {
            document.querySelectorAll('.sortable-th').forEach(th => {
                th.addEventListener('click', () => {
                    const colName = th.getAttribute('data-col');
                    if (colName) this.sortByColumn(colName, th);
                });
            });
        }
    };

    // ===================================================================
    // 7. FORM HANDLING (ADD/EDIT ACADEMIC YEAR)
    // ===================================================================

    const FormManager = {

        init() {
            const form = document.getElementById('academicForm');
            if (!form) return;

            form.addEventListener('submit', this.handleSubmit.bind(this));
        },

        async handleSubmit(e) {
            e.preventDefault();

            const form = e.target;
            const submitBtn = form.querySelector('button[type="submit"]');
            const originalBtnText = submitBtn.innerHTML;
            const editAcademicYearId = document.getElementById('editAcademicYearId');

            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="bi bi-hourglass-split animate-spin"></i> Saving...';

            const formData = new FormData(form);

            // Handle checkbox properly
            const isActiveCheckbox = document.getElementById('drawerIsActive');
            if (isActiveCheckbox) {
                formData.set('is_active', isActiveCheckbox.checked ? 'true' : 'false');
            }

            const yearId = editAcademicYearId?.value || '';
            const url = yearId ? `/academic/edit/${yearId}/` : '/academic/add/';

            try {
                const response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'X-CSRFToken': csrftoken,
                        'X-Requested-With': 'XMLHttpRequest'
                    },
                    body: formData
                });

                const data = await response.json();

                if (!response.ok) throw new Error(data.error || 'Server error');

                if (data.success) {
                    showToast(data.message || 'Academic year saved successfully', 'success');
                    setTimeout(() => window.location.reload(), 1500);
                } else {
                    showToast('Error: ' + (data.error || 'Could not save.'), 'error');
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = originalBtnText;
                }
            } catch (error) {
                console.error('Fetch error:', error);
                showToast('Network error: ' + error.message, 'error');
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalBtnText;
            }
        }
    };

    // ===================================================================
    // 8. DELETE OPERATIONS
    // ===================================================================

    const DeleteManager = {

        openModal(yearId, yearInfo) {
            DrawerManager.openDelete(yearId, yearInfo);
        },

        async executeDelete(yearId) {
            try {
                const response = await fetch(`/academic/delete/${yearId}/`, {
                    method: 'POST',
                    headers: {
                        'X-CSRFToken': csrftoken,
                        'X-Requested-With': 'XMLHttpRequest'
                    }
                });
                const data = await response.json();

                if (data.success) {
                    showToast(data.message || 'Academic year deleted successfully', 'success');
                    setTimeout(() => window.location.reload(), 1000);
                } else {
                    showToast('Delete failed: ' + (data.error || 'Unknown error'), 'error');
                }
            } catch (error) {
                console.error('Delete error:', error);
                showToast('Network error while deleting', 'error');
            }
        }
    };

    // ===================================================================
    // 9. TOGGLE ACTIVE STATUS
    // ===================================================================

    const StatusManager = {

        async toggleActive(yearId) {
            try {
                const response = await fetch(`/academic/toggle-active/${yearId}/`, {
                    method: 'POST',
                    headers: {
                        'X-CSRFToken': csrftoken,
                        'X-Requested-With': 'XMLHttpRequest',
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ year_id: yearId })
                });

                const data = await response.json();

                if (data.success) {
                    showToast(data.message || 'Status updated successfully', 'success');
                    setTimeout(() => window.location.reload(), 1000);
                } else {
                    showToast('Error: ' + (data.error || 'Could not update status'), 'error');
                }
            } catch (error) {
                console.error('Toggle status error:', error);
                showToast('Network error while updating status', 'error');
            }
        }
    };

    // ===================================================================
    // 10. DJANGO MESSAGES
    // ===================================================================

    const DjangoMessageManager = {
        init() {
            const messages = document.querySelectorAll('#django-messages .message');
            messages.forEach(msg => {
                const message = msg.getAttribute('data-message');
                const level = msg.getAttribute('data-level');
                if (message) {
                    showToast(message, level === 'success' ? 'success' : (level === 'error' ? 'error' : 'info'));
                }
            });
        }
    };

    // ===================================================================
    // 11. GLOBAL EVENT LISTENERS
    // ===================================================================

    const GlobalEventManager = {

        init() {
            document.addEventListener('click', (e) => {
                const addBackdrop = document.querySelector('#academicDrawer .drawer-backdrop');
                if (addBackdrop && addBackdrop === e.target) DrawerManager.closeAcademic();

                const delBackdrop = document.querySelector('#deleteDrawer .drawer-backdrop');
                if (delBackdrop && delBackdrop === e.target) DrawerManager.closeDelete();
            });

            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    const deleteDrawer = document.getElementById('deleteDrawer');
                    if (deleteDrawer && !deleteDrawer.classList.contains('hidden')) {
                        DrawerManager.closeDelete();
                        return;
                    }
                    const addDrawer = document.getElementById('academicDrawer');
                    if (addDrawer && !addDrawer.classList.contains('hidden')) DrawerManager.closeAcademic();
                }
            });
        }
    };

    // ===================================================================
    // 12. MAIN INITIALIZATION
    // ===================================================================

    function init() {
        DrawerManager.init();
        SearchManager.init();
        TableManager.init();
        FormManager.init();
        DjangoMessageManager.init();
        GlobalEventManager.init();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // ===================================================================
    // 13. PUBLIC API
    // ===================================================================

    window.academicApp = {
        openDrawer: (yearId) => DrawerManager.openAcademic(yearId),
        closeDrawer: () => DrawerManager.closeAcademic(),
        openDeleteModal: (yearId, yearInfo) => DeleteManager.openModal(yearId, yearInfo),
        closeDeleteDrawer: () => DrawerManager.closeDelete(),
        toggleActiveStatus: (yearId) => StatusManager.toggleActive(yearId),
    };

})();