// ===================================================================
// COURSE MANAGEMENT APPLICATION - COMPLETE MODULE
// ===================================================================
// Categories:
// 1. Core Utilities & Helpers
// 2. CSRF & Security
// 3. Toast Notifications
// 4. Drawer Management (Modal Controllers)
// 5. Filter Section Management
// 6. Search Functionality
// 7. Table Management & Sorting
// 8. Creatable Select Component
// 9. Form Handling (Add/Edit Course)
// 10. Delete Operations
// 11. Excel Upload Operations
// 12. Excel Menu Dropdown
// 13. View Details Operation
// 14. Load More Functionality
// 15. Global Event Listeners
// 16. Initialization
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
            document.body.classList.add('drawer-open');
            document.body.style.overflow = 'hidden';
        }
    }

    function unlockBodyScroll() {
        window.openDrawerCount = (window.openDrawerCount || 0) - 1;
        if (window.openDrawerCount === 0) {
            document.body.classList.remove('drawer-open');
            document.body.style.overflow = '';
        }
    }

    function formatDate(dateString) {
        if (!dateString) return '-';
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-IN', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
            });
        } catch (e) {
            return dateString;
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

        // Course Add/Edit Drawer
        courseDrawer: null,
        deleteDrawer: null,
        uploadDrawer: null,
        detailsDrawer: null,

        init() {
            this.courseDrawer = document.getElementById('courseDrawer');
            this.deleteDrawer = document.getElementById('deleteDrawer');
            this.uploadDrawer = document.getElementById('uploadDrawer');
            this.detailsDrawer = document.getElementById('detailsDrawer');
        },

        openCourse(courseCode = null) {

            if (!this.courseDrawer) return;

            const form = document.getElementById('courseForm');
            const editCourseId = document.getElementById('editCourseId');
            const title = document.getElementById('drawer-title');
            const subtitle = document.getElementById('drawer-subtitle');
            const submitButton = document.querySelector('#courseForm button[type="submit"]');

            form?.reset();

            // Clear all creatable selects
            if (window.creatableSelects) {
                Object.values(window.creatableSelects).forEach(select => {
                    if (select && typeof select.setValue === 'function') {
                        select.setValue('');
                    }
                });
            }

            // Reset manual input fields
            const manualFields = ['drawerCourseCode', 'drawerCourseId', 'drawerCourseTitle', 
                                  'drawerHours', 'drawerCredit', 'drawerInternalMark', 
                                  'drawerExternalMark', 'drawerTotalMark', 'drawerRemark'];
            manualFields.forEach(fieldId => {
                const field = document.getElementById(fieldId);
                if (field) field.value = '';
            });

            // Reset select dropdowns to default
            const selects = ['drawerSemester', 'drawerPart'];
            selects.forEach(selectId => {
                const select = document.getElementById(selectId);
                if (select) select.value = '';
            });

            if (editCourseId) editCourseId.value = '';
            if (title) title.innerText = 'New Course Record';
            if (subtitle) subtitle.innerText = 'Fields marked with * are required.';

            if (submitButton) {
                submitButton.disabled = false;
                submitButton.classList.remove('opacity-50', 'cursor-not-allowed');
                submitButton.innerHTML = '<i class="bi bi-save"></i> Save Course Record';
            }

            if (courseCode) {
                this.loadCourseData(courseCode, submitButton, editCourseId, title, subtitle);
            } else {
                this.courseDrawer.classList.remove('hidden');
                lockBodyScroll();
            }
        },

        loadCourseData(courseCode, submitButton, editCourseId, title, subtitle) {
            if (submitButton) {
                submitButton.disabled = true;
                submitButton.innerHTML = '<i class="bi bi-hourglass-split animate-spin"></i> Loading...';
            }

            fetch(`/courses/edit/${courseCode}/?format=json`, {
                headers: { 'X-Requested-With': 'XMLHttpRequest' }
            })
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        this.populateCourseForm(data.course);
                        if (editCourseId) editCourseId.value = data.course.id;
                        if (title) title.innerText = 'Update Course Record';
                        if (subtitle) subtitle.innerText = `Editing: ${data.course.course_code}`;
                        this.courseDrawer.classList.remove('hidden');
                        lockBodyScroll();
                    } else {
                        alert('Error loading course data: ' + (data.error || 'Unknown error'));
                    }
                })
                .catch(err => {
                    console.error('Fetch error:', err);
                    alert('Failed to load course details.');
                })
                .finally(() => {
                    if (submitButton) {
                        submitButton.disabled = false;
                        submitButton.innerHTML = '<i class="bi bi-save"></i> Save Course Record';
                    }
                });
        },

        populateCourseForm(course) {

            // Basic fields
            document.getElementById('drawerCourseCode').value = course.course_code || '';
            document.getElementById('drawerCourseId').value = course.course_id || '';
            document.getElementById('drawerCourseTitle').value = course.course_title || '';
            document.getElementById('drawerHours').value = course.hours || '';
            document.getElementById('drawerCredit').value = course.credit || '';
            document.getElementById('drawerInternalMark').value = course.internal_mark || '';
            document.getElementById('drawerExternalMark').value = course.external_mark || '';
            document.getElementById('drawerRemark').value = course.remark || '';

            // Calculate total mark
            const internal = parseFloat(course.internal_mark) || 0;
            const external = parseFloat(course.external_mark) || 0;
            const totalMarkField = document.getElementById('drawerTotalMark');
            if (totalMarkField) totalMarkField.value = internal + external;

            // Semester and Part
            if (course.semester) document.getElementById('drawerSemester').value = course.semester;
            if (course.part) document.getElementById('drawerPart').value = course.part;

            // Creatable selects mappings
            const selectMappings = {
                'drawerProgramType': course.program_type,
                'drawerDegree': course.degree,
                'drawerBranch': course.branch,
                'drawerBranchFinal': course.branch_final,
                'drawerCourseCategory': course.course_category,
                'drawerExaminerType': course.examiner_type,
                'drawerExaminer': course.examiner
            };

            for (const [id, value] of Object.entries(selectMappings)) {
                if (window.creatableSelects[id] && value) {
                    window.creatableSelects[id].setValue(value);
                }
            }
        },

        closeCourse() {
            if (this.courseDrawer) {
                this.courseDrawer.classList.add('hidden');
                unlockBodyScroll();
            }
        },

        openDelete(courseCode, courseTitle, onConfirmCallback) {

            if (!this.deleteDrawer) return;

            document.getElementById('deleteDrawerCourseCode').innerText = courseCode;
            document.getElementById('deleteDrawerCourseTitle').innerText = courseTitle;
            const msgSpan = document.getElementById('deleteDrawerMessage');
            if (msgSpan) {
                msgSpan.innerHTML = `Are you certain you want to permanently delete <strong class="text-rose-700">${escapeHtml(courseTitle)}</strong>?`;
            }

            window.pendingDeleteCallback = onConfirmCallback;

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
        },

        openUpload() {
            if (this.uploadDrawer) {
                this.uploadDrawer.classList.remove('hidden');
                lockBodyScroll();
                UploadManager.reset();
            }
        },

        closeUpload() {
            if (this.uploadDrawer) {
                this.uploadDrawer.classList.add('hidden');
                unlockBodyScroll();
                UploadManager.reset();
            }
        },

        openDetails(courseCode) {
            if (!this.detailsDrawer) return;
            
            this.detailsDrawer.classList.remove('hidden');
            lockBodyScroll();
            this.loadCourseDetails(courseCode);
        },

        loadCourseDetails(courseCode) {
            const detailsContent = document.getElementById('detailsContent');
            if (!detailsContent) return;

            detailsContent.innerHTML = `
                <div class="flex justify-center items-center py-12">
                    <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-[#8b1e3f]"></div>
                    <span class="ml-3 text-slate-500">Loading course details...</span>
                </div>
            `;

            fetch(`/courses/details/${courseCode}/?format=json`, {
                headers: { 'X-Requested-With': 'XMLHttpRequest' }
            })
                .then(res => res.json())
                .then(data => {
                    if (data.success && data.course) {
                        this.renderCourseDetails(data.course);
                    } else {
                        detailsContent.innerHTML = `
                            <div class="text-center py-12">
                                <i class="bi bi-exclamation-triangle text-4xl text-amber-500 mb-3"></i>
                                <p class="text-slate-500">Failed to load course details</p>
                            </div>
                        `;
                    }
                })
                .catch(err => {
                    console.error('Error loading details:', err);
                    detailsContent.innerHTML = `
                        <div class="text-center py-12">
                            <i class="bi bi-wifi-off text-4xl text-red-500 mb-3"></i>
                            <p class="text-slate-500">Network error. Please try again.</p>
                        </div>
                    `;
                });
        },

        renderCourseDetails(course) {
            const detailsContent = document.getElementById('detailsContent');
            if (!detailsContent) return;

            const getBadge = (text, color = 'slate') => {
                const colors = {
                    slate: 'bg-slate-100 text-slate-700',
                    purple: 'bg-purple-100 text-purple-700',
                    emerald: 'bg-emerald-100 text-emerald-700',
                    blue: 'bg-blue-100 text-blue-700',
                    amber: 'bg-amber-100 text-amber-700',
                    teal: 'bg-teal-100 text-teal-700',
                    rose: 'bg-rose-100 text-rose-700'
                };
                return `<span class="inline-flex px-2 py-1 rounded-lg text-xs font-semibold ${colors[color]}">${escapeHtml(text || '-')}</span>`;
            };

            detailsContent.innerHTML = `
                <div class="space-y-6">
                    <!-- Header Section -->
                    <div class="bg-gradient-to-r from-[#8b1e3f]/5 to-transparent rounded-xl p-5 border border-[#8b1e3f]/10">
                        <div class="flex items-start justify-between">
                            <div>
                                <div class="flex items-center gap-3 mb-2">
                                    <h3 class="text-xl font-bold text-slate-800">${escapeHtml(course.course_code)}</h3>
                                    ${getBadge(course.course_category || 'Uncategorized', 'purple')}
                                </div>
                                <p class="text-slate-600 text-sm">${escapeHtml(course.course_title || '-')}</p>
                                <p class="text-xs text-slate-400 mt-2 font-mono">ID: ${escapeHtml(course.course_id || 'N/A')}</p>
                            </div>
                            <div class="text-right">
                                <div class="text-2xl font-bold text-emerald-700">${course.credit || 0}</div>
                                <div class="text-xs text-slate-500">Credits</div>
                                <div class="text-sm font-semibold text-slate-600 mt-1">${course.hours || 0} hrs/wk</div>
                            </div>
                        </div>
                    </div>

                    <!-- Program Information -->
                    <div class="bg-white rounded-xl border border-slate-200 overflow-hidden">
                        <div class="flex items-center gap-2 bg-indigo-50 px-5 py-3 border-b border-indigo-100">
                            <i class="bi bi-mortarboard text-indigo-600"></i>
                            <h4 class="font-bold text-xs text-indigo-900 uppercase">Program Information</h4>
                        </div>
                        <div class="grid grid-cols-2 gap-4 p-5">
                            <div>
                                <label class="text-[10px] font-semibold text-slate-400 uppercase">Program Type</label>
                                <p class="text-sm font-medium text-slate-700 mt-1">${escapeHtml(course.program_type || '-')}</p>
                            </div>
                            <div>
                                <label class="text-[10px] font-semibold text-slate-400 uppercase">Degree</label>
                                <p class="text-sm font-medium text-slate-700 mt-1">${escapeHtml(course.degree || '-')}</p>
                            </div>
                        </div>
                    </div>

                    <!-- Department Information -->
                    <div class="bg-white rounded-xl border border-slate-200 overflow-hidden">
                        <div class="flex items-center gap-2 bg-emerald-50 px-5 py-3 border-b border-emerald-100">
                            <i class="bi bi-diagram-3 text-emerald-600"></i>
                            <h4 class="font-bold text-xs text-emerald-900 uppercase">Department Information</h4>
                        </div>
                        <div class="grid grid-cols-2 gap-4 p-5">
                            <div>
                                <label class="text-[10px] font-semibold text-slate-400 uppercase">Branch</label>
                                <p class="text-sm font-medium text-slate-700 mt-1">${escapeHtml(course.branch || '-')}</p>
                            </div>
                            <div>
                                <label class="text-[10px] font-semibold text-slate-400 uppercase">Branch Final</label>
                                <p class="text-sm font-medium text-slate-700 mt-1">${escapeHtml(course.branch_final || '-')}</p>
                            </div>
                        </div>
                    </div>

                    <!-- Academic Information -->
                    <div class="bg-white rounded-xl border border-slate-200 overflow-hidden">
                        <div class="flex items-center gap-2 bg-blue-50 px-5 py-3 border-b border-blue-100">
                            <i class="bi bi-calendar-week text-blue-600"></i>
                            <h4 class="font-bold text-xs text-blue-900 uppercase">Academic Information</h4>
                        </div>
                        <div class="grid grid-cols-2 gap-4 p-5">
                            <div>
                                <label class="text-[10px] font-semibold text-slate-400 uppercase">Semester</label>
                                <p class="text-sm font-medium text-slate-700 mt-1">${course.semester ? `Semester ${course.semester}` : '-'}</p>
                            </div>
                            <div>
                                <label class="text-[10px] font-semibold text-slate-400 uppercase">Part</label>
                                <p class="text-sm font-medium text-slate-700 mt-1">${course.part ? `Part ${course.part}` : '-'}</p>
                            </div>
                        </div>
                    </div>

                    <!-- Marks Distribution -->
                    <div class="bg-white rounded-xl border border-slate-200 overflow-hidden">
                        <div class="flex items-center gap-2 bg-amber-50 px-5 py-3 border-b border-amber-100">
                            <i class="bi bi-bar-chart-steps text-amber-600"></i>
                            <h4 class="font-bold text-xs text-amber-900 uppercase">Marks Distribution</h4>
                        </div>
                        <div class="grid grid-cols-3 gap-4 p-5">
                            <div class="text-center">
                                <label class="text-[10px] font-semibold text-slate-400 uppercase">Internal</label>
                                <p class="text-lg font-bold text-indigo-600">${course.internal_mark || 0}</p>
                            </div>
                            <div class="text-center">
                                <label class="text-[10px] font-semibold text-slate-400 uppercase">External</label>
                                <p class="text-lg font-bold text-indigo-600">${course.external_mark || 0}</p>
                            </div>
                            <div class="text-center">
                                <label class="text-[10px] font-semibold text-slate-400 uppercase">Total</label>
                                <p class="text-lg font-bold text-emerald-600">${course.total_mark || 0}</p>
                            </div>
                        </div>
                    </div>

                    <!-- Examiner Information -->
                    <div class="bg-white rounded-xl border border-slate-200 overflow-hidden">
                        <div class="flex items-center gap-2 bg-teal-50 px-5 py-3 border-b border-teal-100">
                            <i class="bi bi-person-check text-teal-600"></i>
                            <h4 class="font-bold text-xs text-teal-900 uppercase">Examiner Information</h4>
                        </div>
                        <div class="grid grid-cols-2 gap-4 p-5">
                            <div>
                                <label class="text-[10px] font-semibold text-slate-400 uppercase">Examiner Type</label>
                                <p class="text-sm font-medium text-slate-700 mt-1">${escapeHtml(course.examiner_type || '-')}</p>
                            </div>
                            <div>
                                <label class="text-[10px] font-semibold text-slate-400 uppercase">Examiner</label>
                                <p class="text-sm font-medium text-slate-700 mt-1">${escapeHtml(course.examiner || '-')}</p>
                            </div>
                        </div>
                    </div>

                    ${course.remark ? `
                    <!-- Remarks -->
                    <div class="bg-white rounded-xl border border-slate-200 overflow-hidden">
                        <div class="flex items-center gap-2 bg-slate-100 px-5 py-3 border-b border-slate-200">
                            <i class="bi bi-chat-left-text text-slate-600"></i>
                            <h4 class="font-bold text-xs text-slate-800 uppercase">Remarks</h4>
                        </div>
                        <div class="p-5">
                            <p class="text-sm text-slate-600">${escapeHtml(course.remark)}</p>
                        </div>
                    </div>
                    ` : ''}

                    <!-- Metadata -->
                    <div class="text-center text-[10px] text-slate-400 pt-4 border-t border-slate-100">
                        <p>Created: ${formatDate(course.created_at)} | Last Modified: ${formatDate(course.updated_at)}</p>
                    </div>
                </div>
            `;
        },

        closeDetails() {
            if (this.detailsDrawer) {
                this.detailsDrawer.classList.add('hidden');
                unlockBodyScroll();
            }
        }
    };

    // ===================================================================
    // 5. FILTER SECTION MANAGEMENT
    // ===================================================================

    const FilterManager = {
        init() {
            const applyBtn = document.getElementById('applyFiltersBtn');
            const filterForm = document.getElementById('filterForm');

            if (applyBtn && filterForm) {
                applyBtn.addEventListener('click', () => filterForm.submit());
            }

            // Auto-submit on filter select change
            document.querySelectorAll('.filter-select').forEach(select => {
                select.addEventListener('change', () => {
                    if (filterForm) filterForm.submit();
                });
            });
        }
    };

    // ===================================================================
    // 6. SEARCH FUNCTIONALITY
    // ===================================================================

    const SearchManager = {
        init() {
            const globalSearch = document.getElementById('globalSearch');
            if (globalSearch) {
                let searchTimeout;
                globalSearch.addEventListener('input', function () {
                    clearTimeout(searchTimeout);
                    searchTimeout = setTimeout(() => {
                        const url = new URL(window.location.href);
                        if (this.value) {
                            url.searchParams.set('search', this.value);
                        } else {
                            url.searchParams.delete('search');
                        }
                        url.searchParams.delete('page');
                        window.location.href = url.toString();
                    }, 500);
                });
            }
        }
    };

    // ===================================================================
    // 7. TABLE MANAGEMENT & SORTING
    // ===================================================================

    const TableManager = {

        currentSort: { col: null, dir: 'asc' },

        init() {
            this.attachSortingHandlers();
        },

        getCellValue(row, colName) {
            // Find cell by data attribute or column name
            const cells = row.cells;
            const colIndex = this.getColumnIndex(colName);
            if (colIndex === -1) return '';
            return cells[colIndex]?.innerText?.trim() || '';
        },

        getColumnIndex(colName) {
            const headers = document.querySelectorAll('.sortable-th');
            for (let i = 0; i < headers.length; i++) {
                if (headers[i].getAttribute('data-col') === colName) {
                    // +1 because first column is S.No
                    return i + 1;
                }
            }
            return -1;
        },

        sortByColumn(colName, thElement) {

            const tbody = document.getElementById('courseTableBody');
            if (!tbody) return;
            const rows = Array.from(tbody.querySelectorAll('tr.course-row'));
            if (!rows.length) return;

            let direction = (this.currentSort.col === colName && this.currentSort.dir === 'asc') ? 'desc' : 'asc';
            this.currentSort = { col: colName, dir: direction };

            // Update sort icons
            document.querySelectorAll('.sortable-th .sort-icon').forEach(icon => {
                icon.classList.remove('bi-arrow-up', 'bi-arrow-down');
                icon.classList.add('bi-arrow-down-up');
                icon.style.color = '';
            });
            const targetIcon = thElement.querySelector('.sort-icon');
            if (targetIcon) {
                targetIcon.classList.remove('bi-arrow-down-up');
                targetIcon.classList.add(direction === 'asc' ? 'bi-arrow-up' : 'bi-arrow-down');
                targetIcon.style.color = '#4f46e5';
            }

            const colIndex = this.getColumnIndex(colName);

            // Sort rows
            rows.sort((a, b) => {
                let valA = this.getCellValueByIndex(a, colIndex);
                let valB = this.getCellValueByIndex(b, colIndex);
                
                // Try numeric comparison first
                const numA = parseFloat(valA);
                const numB = parseFloat(valB);
                if (!isNaN(numA) && !isNaN(numB)) {
                    return direction === 'asc' ? numA - numB : numB - numA;
                }
                
                if (typeof valA === 'string') valA = valA.toLowerCase();
                if (typeof valB === 'string') valB = valB.toLowerCase();
                if (valA < valB) return direction === 'asc' ? -1 : 1;
                if (valA > valB) return direction === 'asc' ? 1 : -1;
                return 0;
            });

            rows.forEach(row => tbody.appendChild(row));
        },

        getCellValueByIndex(row, colIndex) {
            const cells = row.cells;
            if (!cells[colIndex]) return '';
            return cells[colIndex]?.innerText?.trim() || '';
        },

        attachSortingHandlers() {
            document.querySelectorAll('.sortable-th').forEach(th => {
                th.addEventListener('click', (e) => {
                    const colName = th.getAttribute('data-col');
                    if (colName) this.sortByColumn(colName, th);
                });
            });
        }
    };

    // ===================================================================
    // 8. CREATABLE SELECT COMPONENT
    // ===================================================================

    class CreatableSelect {

        constructor(element, options = {}) {
            this.element = element;
            this.fieldName = options.fieldName || element.name;
            this.placeholder = options.placeholder || `Search or add ${this.fieldName.replace(/_/g, ' ')}...`;
            this.loadRemote = options.loadRemote !== false;
            this.allowCreate = options.allowCreate !== false;
            this.optionsList = [];
            this.filteredOptions = [];
            this.selectedIndex = -1;
            this.isOpen = false;
            this.searchTerm = '';
            this.selectedValue = '';
            this.isLoading = false;
            this.hasLoaded = false;
            this.scrollHandler = null;
            this.resizeHandler = null;
            this.createComponent();
            if (!this.loadRemote) {
                this.initializeStaticOptions();
            }
            this.setupEventListeners();
        }

        createComponent() {

            this.element.style.display = 'none';
            this.wrapper = document.createElement('div');
            this.wrapper.className = 'creatable-select-wrapper';
            this.wrapper.style.cssText = 'position: relative; width: 100%;';
            this.element.parentNode.insertBefore(this.wrapper, this.element);
            this.wrapper.appendChild(this.element);

            this.container = document.createElement('div');
            this.container.className = 'creatable-select-container';
            this.container.style.cssText = 'position: relative; width: 100%;';
            this.wrapper.appendChild(this.container);

            this.input = document.createElement('input');
            this.input.type = 'text';
            this.input.className = 'creatable-select-input w-full text-sm rounded-lg border border-slate-200 px-3 py-2.5 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all';
            this.input.placeholder = this.placeholder;
            this.input.autocomplete = 'off';
            this.container.appendChild(this.input);

            this.dropdown = document.createElement('div');
            this.dropdown.className = 'creatable-select-dropdown';
            this.dropdown.style.cssText = `
                position: absolute;
                display: none;
                background: white;
                border: 1px solid #e2e8f0;
                border-radius: 0.5rem;
                box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1);
                max-height: 200px;
                overflow-y: auto;
                z-index: 999999;
                min-width: 200px;
                margin: 0;
                padding: 4px 0;
            `;
            document.body.appendChild(this.dropdown);
        }

        initializeStaticOptions() {
            const options = [];
            let selectedValue = '';

            Array.from(this.element.options).forEach(option => {
                const value = option.value !== null && option.value !== undefined ? String(option.value).trim() : '';
                if (value !== '') {
                    options.push(value);
                }
                if (option.selected && value !== '') {
                    selectedValue = value;
                }
            });

            this.optionsList = Array.from(new Set(options));

            if (selectedValue) {
                this.selectedValue = selectedValue;
                const selectedOption = Array.from(this.element.options).find(opt => opt.selected);
                this.input.value = selectedOption ? selectedOption.textContent.trim() : selectedValue;
                this.element.value = selectedValue;
            }

            this.hasLoaded = true;
        }

        async loadOptions(search = '') {

            if (!this.loadRemote) {
                this.filterOptions(search);
                return;
            }

            if (this.isLoading) return;

            this.isLoading = true;
            this.showLoading();

            try {
                const url = `/courses/get-field-options/?field=${this.fieldName}&search=${encodeURIComponent(search)}`;
                const response = await fetch(url, {
                    headers: { 'X-Requested-With': 'XMLHttpRequest' }
                });

                if (!response.ok) throw new Error(`HTTP ${response.status}`);

                const data = await response.json();

                if (data.success) {
                    this.optionsList = data.options || [];
                    this.hasLoaded = true;
                    this.filterOptions(search);
                } else {
                    console.error('API error:', data.error);
                    this.optionsList = [];
                    this.renderDropdown();
                }
            } catch (error) {
                console.error('Error loading options:', error);
                this.optionsList = [];
                this.renderDropdown();
            } finally {
                this.isLoading = false;
            }
        }

        filterOptions(search) {
            if (!search || search === '') {
                this.filteredOptions = [...this.optionsList];
            } else {
                const searchLower = search.toLowerCase();
                this.filteredOptions = this.optionsList.filter(opt =>
                    opt && opt.toLowerCase && opt.toLowerCase().includes(searchLower)
                );
            }
            this.renderDropdown();
        }

        renderDropdown() {

            if (!this.dropdown) return;
            this.dropdown.innerHTML = '';
            this.dropdown.style.padding = '4px 0';
            const searchTerm = this.searchTerm || '';
            const hasSearchTerm = searchTerm.trim() !== '';

            if (hasSearchTerm) {
                const exists = this.filteredOptions.some(opt =>
                    opt && opt.toLowerCase && opt.toLowerCase() === searchTerm.toLowerCase()
                );

                if (!exists && this.allowCreate) {
                    const createOption = this.createOptionElement(searchTerm, true);
                    createOption.style.cssText = 'border-bottom: 1px solid #e2e8f0; padding: 10px 12px;';
                    this.dropdown.appendChild(createOption);
                }
            }

            if (this.filteredOptions.length > 0) {
                this.filteredOptions.forEach((option) => {
                    if (option && typeof option === 'string') {
                        const optionElement = this.createOptionElement(option, false);
                        optionElement.style.padding = '10px 12px';
                        optionElement.addEventListener('click', (e) => {
                            e.stopPropagation();
                            this.selectOption(option);
                        });
                        this.dropdown.appendChild(optionElement);
                    }
                });
            } else {
                if (!hasSearchTerm) {
                    const noResults = document.createElement('div');
                    noResults.className = 'px-3 py-2 text-sm text-slate-400 text-center';
                    noResults.style.padding = '10px 12px';
                    noResults.innerHTML = '<i class="bi bi-info-circle"></i> No options available';
                    this.dropdown.appendChild(noResults);
                } else if (!this.allowCreate) {
                    const noResults = document.createElement('div');
                    noResults.className = 'px-3 py-2 text-sm text-slate-400 text-center';
                    noResults.style.padding = '10px 12px';
                    noResults.innerHTML = '<i class="bi bi-x-circle"></i> No matching results';
                    this.dropdown.appendChild(noResults);
                }
            }

            this.positionDropdown();
            if (document.activeElement !== this.input) {
                this.input.focus({ preventScroll: true });
            }
        }

        createOptionElement(value, isNew) {

            const div = document.createElement('div');
            div.className = `cursor-pointer text-sm flex items-center justify-between transition-colors ${isNew ? 'bg-green-50 hover:bg-green-100' : 'hover:bg-indigo-50'}`;

            if (isNew) {
                if (this.allowCreate) {
                    div.innerHTML = `
                        <div class="flex items-center gap-2 text-green-600 w-full">
                            <i class="bi bi-plus-circle text-sm"></i>
                            <span>Add "<strong class="text-green-700">${this.escapeHtml(value)}</strong>"</span>
                        </div>
                    `;
                    div.addEventListener('click', (e) => {
                        e.stopPropagation();
                        this.selectOption(value);
                    });
                } else {
                    div.className = 'px-3 py-2 text-sm text-slate-400 text-center';
                    div.textContent = 'No matching option';
                }
            } else {
                div.innerHTML = `
                    <span>${this.escapeHtml(value)}</span>
                    <i class="bi bi-check text-indigo-600 ${this.selectedValue === value ? 'opacity-100' : 'opacity-0'}"></i>
                `;
            }

            return div;
        }

        async selectOption(value) {

            if (!value) return;

            const exists = this.optionsList.some(opt => opt && opt.toLowerCase && opt.toLowerCase() === value.toLowerCase());

            if (!exists) {
                if (!this.allowCreate) {
                    return;
                }
                try {
                    const response = await fetch('/courses/save-field-option/', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-CSRFToken': csrftoken,
                            'X-Requested-With': 'XMLHttpRequest'
                        },
                        body: JSON.stringify({
                            field_name: this.fieldName,
                            value: value
                        })
                    });
                    const data = await response.json();
                    if (data.success) {
                        this.optionsList.push(value);
                        this.optionsList.sort();
                    }
                } catch (error) {
                    console.error('Error saving option:', error);
                }
            }

            this.selectedValue = value;
            this.input.value = value;
            this.element.value = value;

            let optionExists = false;
            for (let i = 0; i < this.element.options.length; i++) {
                if (this.element.options[i].value === value) {
                    optionExists = true;
                    this.element.options[i].selected = true;
                    break;
                }
            }

            if (!optionExists) {
                const newOption = document.createElement('option');
                newOption.value = value;
                newOption.textContent = value;
                newOption.selected = true;
                this.element.appendChild(newOption);
            }

            const event = new Event('change', { bubbles: true });
            this.element.dispatchEvent(event);

            this.searchTerm = '';
            this.closeDropdown();
        }

        positionDropdown() {

            if (!this.input || !this.dropdown) return;

            const rect = this.input.getBoundingClientRect();
            const dropdownHeight = Math.min(this.dropdown.scrollHeight, 200);
            const viewportHeight = window.innerHeight;
            const spaceBelow = viewportHeight - rect.bottom;
            const spaceAbove = rect.top;

            let top = rect.bottom + window.scrollY;

            if (spaceBelow < dropdownHeight && spaceAbove > dropdownHeight) {
                top = rect.top + window.scrollY - dropdownHeight;
            }

            this.dropdown.style.width = `${rect.width}px`;
            this.dropdown.style.top = `${top}px`;
            this.dropdown.style.left = `${rect.left + window.scrollX}px`;
        }

        updateDropdownPosition() { if (this.isOpen) this.positionDropdown() }

        openDropdown() {

            if (this.isOpen) return;

            this.isOpen = true;
            this.dropdown.style.display = 'block';

            this.scrollHandler = () => this.updateDropdownPosition();
            this.resizeHandler = () => this.updateDropdownPosition();

            window.addEventListener('scroll', this.scrollHandler, true);
            window.addEventListener('resize', this.resizeHandler);

            this.searchTerm = this.input.value || '';

            if (!this.hasLoaded || this.searchTerm) {
                this.loadOptions(this.searchTerm);
            } else {
                this.filterOptions('');
                this.renderDropdown();
                this.positionDropdown();
            }
        }

        closeDropdown() {

            if (!this.isOpen) return;
            this.isOpen = false;
            this.dropdown.style.display = 'none';
            this.selectedIndex = -1;

            if (this.scrollHandler) {
                window.removeEventListener('scroll', this.scrollHandler, true);
                this.scrollHandler = null;
            }
            if (this.resizeHandler) {
                window.removeEventListener('resize', this.resizeHandler);
                this.resizeHandler = null;
            }
        }

        showLoading() {
            if (!this.dropdown) return;
            this.dropdown.innerHTML = '';
            const loadingDiv = document.createElement('div');
            loadingDiv.className = 'px-3 py-2 text-sm text-slate-400 text-center';
            loadingDiv.style.padding = '10px 12px';
            loadingDiv.innerHTML = '<i class="bi bi-hourglass-split animate-spin"></i> Loading options...';
            this.dropdown.appendChild(loadingDiv);
            this.positionDropdown();
            this.dropdown.style.display = 'block';
            if (document.activeElement !== this.input) {
                this.input.focus({ preventScroll: true });
            }
        }

        navigateOptions(direction) {

            if (!this.isOpen) {
                this.openDropdown();
                return;
            }

            const items = this.dropdown.querySelectorAll('.cursor-pointer');
            if (items.length === 0) return;

            if (this.selectedIndex >= 0 && items[this.selectedIndex]) {
                items[this.selectedIndex].classList.remove('bg-indigo-50', 'bg-green-100');
            }

            if (direction === 'down') {
                this.selectedIndex = Math.min(this.selectedIndex + 1, items.length - 1);
            } else if (direction === 'up') {
                this.selectedIndex = Math.max(this.selectedIndex - 1, 0);
            }

            if (items[this.selectedIndex]) {
                items[this.selectedIndex].classList.add('bg-indigo-50');
                items[this.selectedIndex].scrollIntoView({ block: 'nearest' });
            }
        }

        selectHighlighted() {
            if (!this.isOpen) return;
            const items = this.dropdown.querySelectorAll('.cursor-pointer');
            if (this.selectedIndex >= 0 && items[this.selectedIndex]) {
                items[this.selectedIndex].click();
            } else if (this.searchTerm && this.searchTerm.trim() !== '') {
                this.selectOption(this.searchTerm);
            }
        }

        setupEventListeners() {

            let typingTimer;

            this.input.addEventListener('focus', () => this.openDropdown());
            this.input.addEventListener('click', (e) => {
                e.stopPropagation();
                this.openDropdown();
            });

            this.input.addEventListener('input', (e) => {
                clearTimeout(typingTimer);
                this.searchTerm = e.target.value;
                typingTimer = setTimeout(() => this.loadOptions(this.searchTerm), 150);
            });

            this.input.addEventListener('keydown', (e) => {
                if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    this.navigateOptions('down');
                } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    this.navigateOptions('up');
                } else if (e.key === 'Enter') {
                    e.preventDefault();
                    this.selectHighlighted();
                } else if (e.key === 'Escape') {
                    this.closeDropdown();
                }
            });

            this.input.addEventListener('blur', () => {
                setTimeout(() => {
                    if (!this.dropdown.matches(':hover')) this.closeDropdown();
                }, 200);
            });

            document.addEventListener('click', (e) => {
                if (!this.wrapper.contains(e.target) && !this.dropdown.contains(e.target)) {
                    this.closeDropdown();
                }
            });
        }

        setValue(value) {
            if (value) {
                this.selectedValue = value;
                this.input.value = value;
                this.element.value = value;
            }
        }

        getValue() {
            return this.selectedValue || this.input.value || '';
        }

        escapeHtml(str) {
            if (!str) return '';
            return String(str).replace(/[&<>]/g, function (m) {
                if (m === '&') return '&amp;';
                if (m === '<') return '&lt;';
                if (m === '>') return '&gt;';
                return m;
            });
        }
    }

    // ===================================================================
    // 9. FORM HANDLING (ADD/EDIT COURSE)
    // ===================================================================

    const FormManager = {

        init() {
            const form = document.getElementById('courseForm');
            if (!form) return;

            // Auto-calculate total mark
            const internalField = document.getElementById('drawerInternalMark');
            const externalField = document.getElementById('drawerExternalMark');
            const totalField = document.getElementById('drawerTotalMark');

            const updateTotal = () => {
                const internal = parseFloat(internalField?.value) || 0;
                const external = parseFloat(externalField?.value) || 0;
                if (totalField) totalField.value = internal + external;
            };

            if (internalField) internalField.addEventListener('input', updateTotal);
            if (externalField) externalField.addEventListener('input', updateTotal);

            form.addEventListener('submit', this.handleSubmit.bind(this));
        },

        async handleSubmit(e) {
            e.preventDefault();

            const form = e.target;
            const submitBtn = form.querySelector('button[type="submit"]');
            const originalBtnText = submitBtn.innerHTML;
            const editCourseId = document.getElementById('editCourseId');

            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="bi bi-hourglass-split animate-spin"></i> Saving...';

            const formData = new FormData(form);

            if (window.creatableSelects) {
                for (const [id, select] of Object.entries(window.creatableSelects)) {
                    const value = select.getValue();
                    const fieldName = select.fieldName;
                    if (fieldName && value) {
                        formData.set(fieldName, value);
                    }
                }
            }

            const courseId = editCourseId?.value || '';
            const url = courseId ? `/courses/edit/${courseId}/` : '/courses/add/';

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
                    showToast(data.message || 'Course saved successfully', 'success');
                    setTimeout(() => window.location.reload(), 1000);
                } else {
                    alert('Error: ' + (data.error || 'Could not save course.'));
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = originalBtnText;
                }
            } catch (error) {
                console.error('Fetch error:', error);
                alert('Network error: ' + error.message);
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalBtnText;
            }
        }
    };

    // ===================================================================
    // 10. DELETE OPERATIONS
    // ===================================================================

    const DeleteManager = {

        openModal(courseCode, courseTitle) {
            DrawerManager.openDelete(courseCode, courseTitle, () => {
                this.executeDelete(courseCode);
            });
        },

        async executeDelete(courseCode) {
            try {
                const response = await fetch(`/courses/delete/${courseCode}/`, {
                    method: 'POST',
                    headers: {
                        'X-CSRFToken': csrftoken,
                        'X-Requested-With': 'XMLHttpRequest'
                    }
                });
                const data = await response.json();

                if (data.success) {
                    showToast(data.message || 'Course deleted successfully', 'success');
                    setTimeout(() => window.location.reload(), 1000);
                } else {
                    alert('Delete failed: ' + (data.error || 'Unknown error'));
                }
            } catch (error) {
                console.error('Delete error:', error);
                alert('Network error while deleting');
            }
        }
    };

    // ===================================================================
    // 11. EXCEL UPLOAD OPERATIONS
    // ===================================================================

    const UploadManager = {

        selectedFile: null,

        init() {
            const fileInput = document.getElementById('excelFile');
            if (fileInput) {
                fileInput.addEventListener('change', this.handleFileSelect.bind(this));
            }
        },

        reset() {
            this.selectedFile = null;
            const fileInput = document.getElementById('excelFile');
            if (fileInput) fileInput.value = '';
            const fileInfo = document.getElementById('fileInfo');
            if (fileInfo) fileInfo.classList.add('hidden');
            const uploadProgress = document.getElementById('uploadProgress');
            if (uploadProgress) uploadProgress.classList.add('hidden');
            const uploadResults = document.getElementById('uploadResults');
            if (uploadResults) uploadResults.classList.add('hidden');
            const uploadBtn = document.getElementById('uploadBtn');
            if (uploadBtn) uploadBtn.disabled = true;
        },

        clear() {
            this.selectedFile = null;
            const fileInput = document.getElementById('excelFile');
            if (fileInput) fileInput.value = '';
            const fileInfo = document.getElementById('fileInfo');
            if (fileInfo) fileInfo.classList.add('hidden');
            const uploadBtn = document.getElementById('uploadBtn');
            if (uploadBtn) uploadBtn.disabled = true;
        },

        handleFileSelect(e) {

            if (e.target.files && e.target.files[0]) {
                this.selectedFile = e.target.files[0];

                const validTypes = ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel'];
                if (!validTypes.includes(this.selectedFile.type)) {
                    showToast('Please select a valid Excel file (.xlsx or .xls)', 'error');
                    this.clear();
                    return;
                }

                if (this.selectedFile.size > 5 * 1024 * 1024) {
                    showToast('File size must be less than 5MB', 'error');
                    this.clear();
                    return;
                }

                const fileName = document.getElementById('fileName');
                if (fileName) fileName.textContent = this.selectedFile.name;
                const fileInfo = document.getElementById('fileInfo');
                if (fileInfo) fileInfo.classList.remove('hidden');
                const uploadBtn = document.getElementById('uploadBtn');
                if (uploadBtn) uploadBtn.disabled = false;
            }
        },

        async upload() {

            if (!this.selectedFile) {
                showToast('Please select a file first', 'error');
                return;
            }

            const formData = new FormData();
            formData.append('file', this.selectedFile);

            const uploadProgress = document.getElementById('uploadProgress');
            const uploadResults = document.getElementById('uploadResults');
            const uploadBtn = document.getElementById('uploadBtn');

            if (uploadProgress) uploadProgress.classList.remove('hidden');
            if (uploadResults) uploadResults.classList.add('hidden');
            if (uploadBtn) uploadBtn.disabled = true;

            let progress = 0;
            const progressInterval = setInterval(() => {
                if (progress < 90) {
                    progress += 10;
                    const progressBar = document.getElementById('progressBar');
                    const progressPercent = document.getElementById('progressPercent');
                    if (progressBar) progressBar.style.width = progress + '%';
                    if (progressPercent) progressPercent.textContent = progress + '%';
                }
            }, 200);

            try {
                const response = await fetch("/courses/upload/", {
                    method: 'POST',
                    body: formData,
                    headers: { 'X-CSRFToken': csrftoken }
                });

                clearInterval(progressInterval);
                const progressBar = document.getElementById('progressBar');
                const progressPercent = document.getElementById('progressPercent');
                const uploadStatus = document.getElementById('uploadStatus');

                if (progressBar) progressBar.style.width = '100%';
                if (progressPercent) progressPercent.textContent = '100%';
                if (uploadStatus) uploadStatus.textContent = 'Processing complete!';

                const result = await response.json();

                if (result.success) {
                    const successCount = document.getElementById('successCount');
                    const errorCount = document.getElementById('errorCount');
                    const newOptionsCount = document.getElementById('newOptionsCount');
                    
                    if (successCount) successCount.textContent = result.success_count || 0;
                    if (errorCount) errorCount.textContent = result.error_count || 0;
                    if (newOptionsCount) newOptionsCount.textContent = result.new_options_count || 0;

                    if (result.errors && result.errors.length > 0) {
                        const errorList = document.getElementById('errorList');
                        if (errorList) {
                            errorList.innerHTML = result.errors.map(err => `<div>⚠️ ${escapeHtml(err)}</div>`).join('');
                            errorList.classList.remove('hidden');
                        }
                    }

                    if (uploadResults) uploadResults.classList.remove('hidden');

                    if (result.success_count > 0) {
                        showToast(`Successfully uploaded ${result.success_count} courses`, 'success');
                        setTimeout(() => window.location.reload(), 2000);
                    } else if (result.error_count > 0) {
                        showToast(`Upload failed with ${result.error_count} errors`, 'error');
                    }
                } else {
                    throw new Error(result.error || 'Upload failed');
                }
            } catch (error) {
                clearInterval(progressInterval);
                showToast(error.message, 'error');
                if (uploadProgress) uploadProgress.classList.add('hidden');
                if (uploadBtn) uploadBtn.disabled = false;
            }
        }
    };

    // ===================================================================
    // 12. EXCEL MENU DROPDOWN
    // ===================================================================

    const ExcelMenuManager = {

        toggle() {
            const menu = document.getElementById('excelMenu');
            if (menu) {
                menu.classList.toggle('hidden');
            }
        },

        init() {
            document.addEventListener('click', (e) => {
                const menu = document.getElementById('excelMenu');
                const button = e.target.closest('[onclick="window.courseApp.toggleExcelMenu()"]');
                if (menu && !menu.classList.contains('hidden') && !button && !menu.contains(e.target)) {
                    menu.classList.add('hidden');
                }
            });
        }
    };

    // ===================================================================
    // 13. VIEW DETAILS OPERATION
    // ===================================================================

    const ViewDetailsManager = {
        open(courseCode) {
            DrawerManager.openDetails(courseCode);
        }
    };

    // ===================================================================
    // 14. LOAD MORE FUNCTIONALITY
    // ===================================================================

    const LoadMoreManager = {
        init() {
            const loadMoreBtn = document.getElementById('loadMoreBtn');
            if (loadMoreBtn) {
                loadMoreBtn.addEventListener('click', this.loadMore.bind(this));
            }
        },

        async loadMore(e) {
            const btn = e.target.closest('#loadMoreBtn');
            if (!btn) return;

            const nextPage = btn.getAttribute('data-next-page');
            if (!nextPage) return;

            btn.disabled = true;
            btn.innerHTML = '<i class="bi bi-hourglass-split animate-spin"></i> Loading...';

            // Preserve current filters and search
            const urlParams = new URLSearchParams(window.location.search);
            urlParams.set('page', nextPage);
            
            // If it's an AJAX request, we want to append content
            urlParams.set('ajax', '1');

            try {
                const response = await fetch(`${window.location.pathname}?${urlParams.toString()}`, {
                    headers: { 'X-Requested-With': 'XMLHttpRequest' }
                });
                const html = await response.text();
                
                // Parse the HTML to extract new rows
                const parser = new DOMParser();
                const doc = parser.parseFromString(html, 'text/html');
                const newRows = doc.querySelectorAll('#courseTableBody tr.course-row');
                const tbody = document.getElementById('courseTableBody');
                
                if (tbody && newRows.length) {
                    newRows.forEach(row => tbody.appendChild(row));
                }
                
                // Update pagination info
                const hasNext = doc.querySelector('#loadMoreBtn');
                if (hasNext) {
                    const newNextPage = hasNext.getAttribute('data-next-page');
                    btn.setAttribute('data-next-page', newNextPage);
                    btn.disabled = false;
                    btn.innerHTML = '<i class="bi bi-arrow-repeat"></i> Load More Courses';
                    
                    // If no more pages, hide the button
                    if (!newNextPage || newNextPage === 'None') {
                        btn.style.display = 'none';
                    }
                } else {
                    btn.style.display = 'none';
                }
                
                // Update total count display
                const totalCountSpan = document.querySelector('.font-mono.bg-white.shadow-sm');
                const newTotalCount = doc.querySelector('.font-mono.bg-white.shadow-sm');
                if (totalCountSpan && newTotalCount) {
                    totalCountSpan.textContent = newTotalCount.textContent;
                }
                
            } catch (error) {
                console.error('Error loading more courses:', error);
                showToast('Failed to load more courses', 'error');
                btn.disabled = false;
                btn.innerHTML = '<i class="bi bi-arrow-repeat"></i> Load More Courses';
            }
        }
    };

    // ===================================================================
    // 15. GLOBAL EVENT LISTENERS
    // ===================================================================

    const GlobalEventManager = {

        init() {

            // Backdrop clicks
            document.addEventListener('click', (e) => {
                const addBackdrop = document.querySelector('#courseDrawer .drawer-backdrop');
                if (addBackdrop && addBackdrop === e.target) DrawerManager.closeCourse();

                const delBackdrop = document.querySelector('#deleteDrawer .drawer-backdrop');
                if (delBackdrop && delBackdrop === e.target) DrawerManager.closeDelete();

                const uploadBackdrop = document.querySelector('#uploadDrawer .drawer-backdrop');
                if (uploadBackdrop && uploadBackdrop === e.target) DrawerManager.closeUpload();

                const detailsBackdrop = document.querySelector('#detailsDrawer .drawer-backdrop');
                if (detailsBackdrop && detailsBackdrop === e.target) DrawerManager.closeDetails();
            });

            // ESC key
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    const deleteDrawer = document.getElementById('deleteDrawer');
                    if (deleteDrawer && !deleteDrawer.classList.contains('hidden')) {
                        DrawerManager.closeDelete();
                        return;
                    }
                    const addDrawer = document.getElementById('courseDrawer');
                    if (addDrawer && !addDrawer.classList.contains('hidden')) DrawerManager.closeCourse();
                    const uploadDrawer = document.getElementById('uploadDrawer');
                    if (uploadDrawer && !uploadDrawer.classList.contains('hidden')) DrawerManager.closeUpload();
                    const detailsDrawer = document.getElementById('detailsDrawer');
                    if (detailsDrawer && !detailsDrawer.classList.contains('hidden')) DrawerManager.closeDetails();
                }
            });
        }
    };

    // ===================================================================
    // 16. CREATABLE SELECTS INITIALIZATION
    // ===================================================================

    const CreatableSelectManager = {
        init() {
            const selectFields = [
                { id: 'drawerProgramType', fieldName: 'program_type', placeholder: 'Search or add program type...', allowCreate: true },
                { id: 'drawerDegree', fieldName: 'degree', placeholder: 'Search or add degree...', allowCreate: true },
                { id: 'drawerBranch', fieldName: 'branch', placeholder: 'Search or add branch...', allowCreate: true },
                { id: 'drawerBranchFinal', fieldName: 'branch_final', placeholder: 'Search or add branch final...', allowCreate: true },
                { id: 'drawerCourseCategory', fieldName: 'course_category', placeholder: 'Search or add course category...', allowCreate: true },
                { id: 'drawerExaminerType', fieldName: 'examiner_type', placeholder: 'Search or add examiner type...', allowCreate: true },
                { id: 'drawerExaminer', fieldName: 'examiner', placeholder: 'Search or add examiner...', allowCreate: true }
            ];

            window.creatableSelects = {};

            selectFields.forEach(field => {
                const element = document.getElementById(field.id);
                if (element && !element.hasAttribute('data-initialized')) {
                    window.creatableSelects[field.id] = new CreatableSelect(element, {
                        fieldName: field.fieldName,
                        placeholder: field.placeholder,
                        allowCreate: field.allowCreate
                    });
                    element.setAttribute('data-initialized', 'true');
                }
            });
        }
    };

    // ===================================================================
    // 17. DJANGO MESSAGES
    // ===================================================================

    const DjangoMessageManager = {
        init() {
            document.querySelectorAll('#django-messages .message').forEach(msg => {
                showToast(msg.dataset.message, msg.dataset.level);
            });
        }
    };

    // ===================================================================
    // 18. MAIN INITIALIZATION
    // ===================================================================

    function init() {
        DrawerManager.init();
        FilterManager.init();
        SearchManager.init();
        TableManager.init();
        FormManager.init();
        UploadManager.init();
        ExcelMenuManager.init();
        LoadMoreManager.init();
        GlobalEventManager.init();
        CreatableSelectManager.init();
        DjangoMessageManager.init();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else { init() }

    // ===================================================================
    // 19. PUBLIC API
    // ===================================================================

    window.courseApp = {

        // Drawer Management
        openDrawer: (courseCode) => DrawerManager.openCourse(courseCode),
        closeDrawer: () => DrawerManager.closeCourse(),
        openDeleteDrawer: (courseCode, courseTitle, callback) => DrawerManager.openDelete(courseCode, courseTitle, callback),
        closeDeleteDrawer: () => DrawerManager.closeDelete(),
        openUploadDrawer: () => DrawerManager.openUpload(),
        closeUploadDrawer: () => DrawerManager.closeUpload(),
        openDetailsDrawer: (courseCode) => DrawerManager.openDetails(courseCode),
        closeDetailsDrawer: () => DrawerManager.closeDetails(),

        // View Details
        viewDetails: (courseCode) => ViewDetailsManager.open(courseCode),

        // Delete Operations
        deleteCourse: (courseCode, courseTitle) => DeleteManager.openModal(courseCode, courseTitle),

        // Edit Operations
        editCourse: (courseCode) => DrawerManager.openCourse(courseCode),

        // Upload Operations
        clearFile: () => UploadManager.clear(),
        uploadFile: () => UploadManager.upload(),

        // Excel Menu
        toggleExcelMenu: () => ExcelMenuManager.toggle()
    };

})();