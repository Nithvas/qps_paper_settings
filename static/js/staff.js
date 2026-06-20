// staff/static/staff/js/staff_management.js
// ===================================================================
// STAFF MANAGEMENT APPLICATION - COMPLETE MODULE
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
// 9. Form Handling (Add/Edit Staff)
// 10. Delete Operations
// 11. Excel Upload Operations
// 12. Excel Menu Dropdown
// 13. Global Event Listeners
// 14. Initialization
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

        staffDrawer: null,
        deleteDrawer: null,
        uploadDrawer: null,

        init() {
            this.staffDrawer = document.getElementById('staffDrawer');
            this.deleteDrawer = document.getElementById('deleteDrawer');
            this.uploadDrawer = document.getElementById('uploadDrawer');
        },

        openStaff(staffPhone = null) {

            if (!this.staffDrawer) return;

            const form = document.getElementById('staffForm');
            const editStaffPhone = document.getElementById('editStaffPhone');
            const title = document.getElementById('drawer-title');
            const subtitle = document.getElementById('drawer-subtitle');
            const submitButton = document.querySelector('#staffForm button[type="submit"]');

            form?.reset();

            if (window.creatableSelects) {
                Object.values(window.creatableSelects).forEach(select => select.setValue(''));
            }

            if (editStaffPhone) editStaffPhone.value = '';
            if (title) title.innerText = 'Register New Staff';
            if (subtitle) subtitle.innerText = 'Complete all mandatory fields';

            if (submitButton) {
                submitButton.disabled = false;
                submitButton.classList.remove('opacity-50', 'cursor-not-allowed');
                submitButton.innerHTML = '<i class="bi bi-save"></i> Save Staff Record';
            }

            if (staffPhone) {
                this.loadStaffData(staffPhone, submitButton, editStaffPhone, title, subtitle);
            } else {
                this.staffDrawer.classList.remove('hidden');
                lockBodyScroll();
            }
        },

        loadStaffData(staffPhone, submitButton, editStaffPhone, title, subtitle) {
            if (submitButton) {
                submitButton.disabled = true;
                submitButton.innerHTML = '<i class="bi bi-hourglass-split animate-spin"></i> Loading...';
            }

            fetch(`/staff/details/${staffPhone}/`, {
                headers: { 'X-Requested-With': 'XMLHttpRequest' }
            })
                .then(res => {
                    if (!res.ok) throw new Error(`HTTP ${res.status}`);
                    return res.json();
                })
                .then(data => {
                    if (data.success) {
                        this.populateStaffForm(data.staff);
                        if (editStaffPhone) editStaffPhone.value = staffPhone;
                        if (title) title.innerText = 'Update Staff Record';
                        if (subtitle) subtitle.innerText = `Editing: ${data.staff.staff_id} - ${data.staff.name}`;
                        this.staffDrawer.classList.remove('hidden');
                        lockBodyScroll();
                    } else {
                        showToast('Error loading staff data: ' + (data.error || 'Unknown error'), 'error');
                        this.closeStaff();
                    }
                })
                .catch(err => {
                    console.error('Fetch error:', err);
                    showToast('Failed to load staff details. Staff may not exist.', 'error');
                    this.closeStaff();
                })
                .finally(() => {
                    if (submitButton) {
                        submitButton.disabled = false;
                        submitButton.innerHTML = '<i class="bi bi-save"></i> Save Staff Record';
                    }
                });
        },

        populateStaffForm(staff) {
            const fields = {
                'drawerStaffId': staff.staff_id,
                'drawerName': staff.name,
                'drawerPhone': staff.phone,
                'drawerEmail': staff.email,
                'drawerDoj': staff.doj,
                'drawerDor': staff.dor,
                'drawerBankAccount': staff.bank_account,
                'drawerIfsc': staff.ifsc_code,
                'drawerRemark': staff.remark,
                'drawerBankCode': staff.branch_code
            };

            for (const [id, value] of Object.entries(fields)) {
                const element = document.getElementById(id);
                if (element) element.value = value || '';
            }

            const editStaffPhoneField = document.getElementById('editStaffPhone');
            if (editStaffPhoneField && staff.phone) {
                editStaffPhoneField.value = staff.phone;
            }

            const selectMappings = {
                'drawerDesignation': staff.designation,
                'drawerProgram': staff.program,
                'drawerDepartment': staff.department,
                'drawerCollege': staff.college,
                'drawerCity': staff.city,
                'drawerDistrict': staff.district,
                'drawerBankName': staff.bank_name,
                'drawerProgramType': staff.program_type,
                'drawerStaffCategory': staff.staff_category,
                'drawerDeptCategory': staff.dept_category,
                'drawerExaminerType': staff.examiner_type,
                'drawerBranch': staff.branch,
                'drawerBranchFinal': staff.branch_final,
                'drawerPlace': staff.place,
                'drawerQualification': staff.qualification,
                'drawerBankCity': staff.bank_city
            };

            for (const [id, value] of Object.entries(selectMappings)) {
                if (window.creatableSelects[id] && value) {
                    window.creatableSelects[id].setValue(value);
                }
            }
        },
        closeStaff() {
            if (this.staffDrawer) {
                this.staffDrawer.classList.add('hidden');
                unlockBodyScroll();
            }
        },

        openDelete(staffPhone, staffName, onConfirmCallback) {
            if (!this.deleteDrawer) return;

            document.getElementById('deleteDrawerStaffId').innerText = staffPhone;
            const msgSpan = document.getElementById('deleteDrawerMessage');
            if (msgSpan) {
                msgSpan.innerHTML = `Are you completely certain you want to purge the record of <strong class="text-rose-700">${escapeHtml(staffName)}</strong>? This action cannot be undone.`;
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

            const resetBtn = document.getElementById('resetFiltersBtn');
            if (resetBtn) {
                resetBtn.addEventListener('click', () => {
                    const url = new URL(window.location.href);
                    const filterFields = ['designation', 'program_type', 'staff_category', 'dept_category', 'branch', 'program', 'department', 'college', 'search'];
                    filterFields.forEach(field => url.searchParams.delete(field));
                    url.searchParams.delete('page');
                    window.location.href = url.toString();
                });
            }
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
            const tbody = document.getElementById('staffTableBody');

            if (!tbody) return;

            const rows = Array.from(tbody.querySelectorAll('tr.staff-row'));
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

            const totalCountElement = document.getElementById('staffTotalCount');
            if (totalCountElement) {
                totalCountElement.textContent = visibleCount;
            }

            let noResultsRow = tbody.querySelector('tr.no-results');

            if (visibleCount === 0 && searchTerm !== '') {
                if (!noResultsRow) {
                    noResultsRow = document.createElement('tr');
                    noResultsRow.className = 'no-results';
                    noResultsRow.innerHTML = `
                        <td colspan="16" class="py-12 text-center bg-gradient-to-b from-slate-50 to-white">
                            <div class="mx-auto">
                                <div class="w-12 h-12 mx-auto rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center shadow-inner mb-4">
                                    <i class="bi bi-search text-2xl text-slate-400"></i>
                                </div>
                                <h3 class="text-lg font-black text-slate-800 tracking-tight">No Results Found</h3>
                                <p class="mt-3 text-sm text-slate-400 leading-relaxed">No staff members match "${searchTerm}"</p>
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
    // 7. TABLE MANAGEMENT & SORTING
    // ===================================================================

    const TableManager = {

        currentSort: { col: null, dir: null },

        init() {
            this.attachSortingHandlers();
            this.markOriginalRowOrder();
        },

        markOriginalRowOrder() {
            const tbody = document.getElementById('staffTableBody');
            if (!tbody) return;
            const rows = Array.from(tbody.querySelectorAll('tr.staff-row'));
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
            const tbody = document.getElementById('staffTableBody');
            if (!tbody) return;
            const rows = Array.from(tbody.querySelectorAll('tr.staff-row'));
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
    // 8. CREATABLE SELECT COMPONENT
    // ===================================================================

    class CreatableSelect {

        constructor(element, options = {}) {
            this.element = element;
            this.fieldName = options.fieldName || element.name;
            this.placeholder = options.placeholder || `Search or add ${this.fieldName.replace(/_/g, ' ')}...`;
            this.loadRemote = options.loadRemote !== false;
            this.allowCreate = options.allowCreate !== false;
            this.initialValue = options.initialValue || null;
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
            this.blurTimeout = null;

            const currentSelectedOption = this.element.options[this.element.selectedIndex];
            if (currentSelectedOption && currentSelectedOption.value) {
                this.originalSelectedValue = currentSelectedOption.value;
            } else {
                this.originalSelectedValue = null;
            }

            this.createComponent();

            if (!this.loadRemote) {
                this.initializeStaticOptions();
            }

            this.setupEventListeners();

            if (this.initialValue && this.initialValue !== '') {
                this.setValue(this.initialValue);
            } else if (this.originalSelectedValue && this.originalSelectedValue !== '') {
                this.setValue(this.originalSelectedValue);
            } else {
                this.selectedValue = '';
                this.input.value = '';
                this.element.value = '';
            }
        }

        createComponent() {
            this.element.style.display = 'none';
            this.wrapper = document.createElement('div');
            this.wrapper.className = 'creatable-select-wrapper';
            this.wrapper.style.cssText = 'position: relative; width: 100%; display: inline-block; overflow: visible;';
            this.element.parentNode.insertBefore(this.wrapper, this.element);
            this.wrapper.appendChild(this.element);

            this.container = document.createElement('div');
            this.container.className = 'creatable-select-container';
            this.container.style.cssText = 'position: relative; width: 100%; overflow: visible;';
            this.wrapper.appendChild(this.container);

            this.input = document.createElement('input');
            this.input.type = 'text';
            this.input.className = 'creatable-select-input w-full text-sm rounded-lg border border-slate-200 px-3 py-2.5 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all';
            this.input.placeholder = this.placeholder;
            this.input.autocomplete = 'off';
            this.container.appendChild(this.input);

            this.clearBtn = document.createElement('button');
            this.clearBtn.type = 'button';
            this.clearBtn.innerHTML = '✕';
            this.clearBtn.className = 'absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none';
            this.clearBtn.style.cssText = 'position: absolute; right: 10px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; display: none; z-index: 1; font-size: 14px; padding: 0 4px;';
            this.clearBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.clearInput();
            });
            this.container.appendChild(this.clearBtn);
            this.container.style.position = 'relative';
            this.input.style.paddingRight = '30px';

            this.input.addEventListener('input', () => {
                this.clearBtn.style.display = this.input.value ? 'block' : 'none';
            });

            this.dropdown = document.createElement('div');
            this.dropdown.className = 'creatable-select-dropdown';
            this.dropdown.style.cssText = `
                position: fixed;
                display: none;
                background: white;
                border: 1px solid #e2e8f0;
                border-radius: 0.5rem;
                box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04);
                max-height: 240px;
                overflow-y: auto;
                z-index: 999999;
                min-width: 200px;
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
                const url = `/staff/get-field-options/?field=${this.fieldName}&search=${encodeURIComponent(search)}`;
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
                            e.preventDefault();
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
                    const response = await fetch('/staff/save-field-option/', {
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
                        if (data.created) {
                            showToast(`New option "${value}" added successfully`, 'success');
                        }
                    } else {
                        showToast(data.error || 'Failed to save option', 'error');
                    }
                } catch (error) {
                    console.error('Error saving option:', error);
                    showToast('Network error saving option', 'error');
                }
            }

            this.selectedValue = value;
            this.input.value = value;
            this.element.value = value;
            this.clearBtn.style.display = 'block';

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
            const dropdownHeight = Math.min(this.dropdown.scrollHeight, 240);
            const viewportHeight = window.innerHeight;
            const spaceBelow = viewportHeight - rect.bottom;

            let top = rect.bottom;

            if (spaceBelow < dropdownHeight) {
                top = rect.top - dropdownHeight;
            }

            this.dropdown.style.position = 'fixed';
            this.dropdown.style.left = `${rect.left}px`;
            this.dropdown.style.top = `${top}px`;
            this.dropdown.style.width = `${rect.width}px`;
            this.dropdown.style.zIndex = '999999';
            this.dropdown.style.display = this.isOpen ? 'block' : 'none';
        }

        openDropdown() {
            if (this.isOpen) return;

            if (this.blurTimeout) {
                clearTimeout(this.blurTimeout);
                this.blurTimeout = null;
            }

            this.isOpen = true;
            this.dropdown.style.display = 'block';
            this.dropdown.style.zIndex = '999999';
            this.dropdown.style.position = 'fixed';
            this.dropdown.offsetHeight;
            this.positionDropdown();

            this.scrollHandler = () => this.positionDropdown();
            this.resizeHandler = () => this.positionDropdown();

            window.addEventListener('scroll', this.scrollHandler, true);
            window.addEventListener('resize', this.resizeHandler);

            const currentValue = this.input.value || '';
            
            if (currentValue === '') {
                this.searchTerm = '';
            } else {
                this.searchTerm = currentValue;
            }

            if (!this.hasLoaded || this.searchTerm !== '') {
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

        clearInput() {
            this.selectedValue = '';
            this.input.value = '';
            this.element.value = '';
            this.searchTerm = '';
            this.clearBtn.style.display = 'none';
            
            Array.from(this.element.options).forEach(opt => {
                opt.selected = false;
            });
            
            const event = new Event('change', { bubbles: true });
            this.element.dispatchEvent(event);
            
            this.loadOptions('');
            this.openDropdown();
            this.input.focus();
        }

        setupEventListeners() {
            let typingTimer;

            this.input.addEventListener('focus', () => {
                if (this.blurTimeout) {
                    clearTimeout(this.blurTimeout);
                    this.blurTimeout = null;
                }
                this.openDropdown();
            });
            
            this.input.addEventListener('click', (e) => {
                e.stopPropagation();
                if (!this.isOpen) {
                    this.openDropdown();
                }
            });

            this.input.addEventListener('input', (e) => {
                clearTimeout(typingTimer);
                const value = e.target.value.trim();

                if (!value) {
                    this.selectedValue = '';
                    this.element.value = '';
                    this.searchTerm = '';
                    
                    Array.from(this.element.options).forEach(opt => {
                        opt.selected = false;
                    });
                    
                    typingTimer = setTimeout(() => {
                        this.loadOptions('');
                        if (!this.isOpen) {
                            this.openDropdown();
                        }
                    }, 50);
                } else {
                    this.searchTerm = value;
                    typingTimer = setTimeout(() => {
                        this.loadOptions(this.searchTerm);
                        if (!this.isOpen) {
                            this.openDropdown();
                        }
                    }, 150);
                }
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
                this.blurTimeout = setTimeout(() => {
                    if (this.dropdown && !this.dropdown.matches(':hover') && !this.input.matches(':hover')) {
                        this.closeDropdown();
                    }
                }, 200);
            });

            this.dropdown.addEventListener('mousedown', (e) => {
                e.preventDefault();
            });
            
            this.dropdown.addEventListener('click', (e) => {
                e.stopPropagation();
            });

            document.addEventListener('click', (e) => {
                if (!this.wrapper.contains(e.target) && this.dropdown && !this.dropdown.contains(e.target)) {
                    this.closeDropdown();
                }
            });
        }

        setValue(value) {
            this.selectedValue = value || '';
            this.input.value = value || '';
            this.element.value = value || '';
            this.clearBtn.style.display = value ? 'block' : 'none';
            if (!value) {
                this.searchTerm = '';
                Array.from(this.element.options).forEach(opt => {
                    opt.selected = false;
                });
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
    // 9. FORM HANDLING (ADD/EDIT STAFF)
    // ===================================================================

    const FormManager = {

        init() {
            const form = document.getElementById('staffForm');
            if (!form) return;

            form.addEventListener('submit', this.handleSubmit.bind(this));
        },

        async handleSubmit(e) {
            e.preventDefault();

            const form = e.target;
            const submitBtn = form.querySelector('button[type="submit"]');
            const originalBtnText = submitBtn.innerHTML;
            const editStaffPhone = document.getElementById('editStaffPhone');

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

            const staffPhone = editStaffPhone?.value || '';
            const url = staffPhone ? `/staff/edit/${staffPhone}/` : '/staff/add/';

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
                    showToast(data.message || 'Staff saved successfully', 'success');
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
    // 10. DELETE OPERATIONS
    // ===================================================================

    const DeleteManager = {

        openModal(staffPhone, staffName) {
            DrawerManager.openDelete(staffPhone, staffName, () => {
                this.executeDelete(staffPhone);
            });
        },

        async executeDelete(staffPhone) {
            try {
                const response = await fetch(`/staff/delete/${staffPhone}/`, {
                    method: 'POST',
                    headers: {
                        'X-CSRFToken': csrftoken,
                        'X-Requested-With': 'XMLHttpRequest'
                    }
                });
                const data = await response.json();

                if (data.success) {
                    showToast(data.message || 'Staff deleted successfully', 'success');
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
                const response = await fetch("/staff/upload/", {
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
                    if (successCount) successCount.textContent = result.success_count || 0;
                    if (errorCount) errorCount.textContent = result.error_count || 0;

                    const newOptionsCount = document.getElementById('newOptionsCount');
                    if (newOptionsCount) newOptionsCount.textContent = result.new_options_added || 0;

                    if (result.errors && result.errors.length > 0) {
                        const errorList = document.getElementById('errorList');
                        if (errorList) {
                            errorList.innerHTML = result.errors.map(err => `<div class="text-red-600 text-sm">⚠️ ${escapeHtml(err)}</div>`).join('');
                            errorList.classList.remove('hidden');
                        }
                    }

                    if (uploadResults) uploadResults.classList.remove('hidden');

                    if (result.success_count > 0 || result.update_count > 0) {
                        showToast(`Successfully processed ${result.success_count + result.update_count} records`, 'success');
                        setTimeout(() => window.location.reload(), 2000);
                    } else if (result.error_count > 0) {
                        showToast(`Upload completed with ${result.error_count} errors`, 'error');
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
                const button = e.target.closest('[onclick="window.staffApp.toggleExcelMenu()"]');
                if (menu && !menu.classList.contains('hidden') && !button && !menu.contains(e.target)) {
                    menu.classList.add('hidden');
                }
            });
        }
    };

    // ===================================================================
    // 13. GLOBAL EVENT LISTENERS
    // ===================================================================

    const GlobalEventManager = {

        init() {
            document.addEventListener('click', (e) => {
                const addBackdrop = document.querySelector('#staffDrawer .drawer-backdrop');
                if (addBackdrop && addBackdrop === e.target) DrawerManager.closeStaff();

                const delBackdrop = document.querySelector('#deleteDrawer .drawer-backdrop');
                if (delBackdrop && delBackdrop === e.target) DrawerManager.closeDelete();

                const uploadBackdrop = document.querySelector('#uploadDrawer .drawer-backdrop');
                if (uploadBackdrop && uploadBackdrop === e.target) DrawerManager.closeUpload();
            });

            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    const deleteDrawer = document.getElementById('deleteDrawer');
                    if (deleteDrawer && !deleteDrawer.classList.contains('hidden')) {
                        DrawerManager.closeDelete();
                        return;
                    }
                    const addDrawer = document.getElementById('staffDrawer');
                    if (addDrawer && !addDrawer.classList.contains('hidden')) DrawerManager.closeStaff();
                    const uploadDrawer = document.getElementById('uploadDrawer');
                    if (uploadDrawer && !uploadDrawer.classList.contains('hidden')) DrawerManager.closeUpload();
                }
            });
        }
    };

    // ===================================================================
    // 14. CREATABLE SELECTS INITIALIZATION
    // ===================================================================

    const CreatableSelectManager = {

        init() {

            function getUrlParameter(name) {
                const urlParams = new URLSearchParams(window.location.search);
                return urlParams.get(name);
            }

            const selectFields = [
                { id: 'drawerDesignation', fieldName: 'designation', placeholder: 'Search or add designation...' },
                { id: 'drawerProgram', fieldName: 'program', placeholder: 'Search or add programme...' },
                { id: 'drawerDepartment', fieldName: 'department', placeholder: 'Search or add department...' },
                { id: 'drawerCollege', fieldName: 'college', placeholder: 'Search or add college...' },
                { id: 'drawerCity', fieldName: 'city', placeholder: 'Search or add city...' },
                { id: 'drawerDistrict', fieldName: 'district', placeholder: 'Search or add district...' },
                { id: 'drawerBankName', fieldName: 'bank_name', placeholder: 'Search or add bank...' },
                { id: 'drawerProgramType', fieldName: 'program_type', placeholder: 'Search or add program type...' },
                { id: 'drawerStaffCategory', fieldName: 'staff_category', placeholder: 'Search or add staff category...' },
                { id: 'drawerDeptCategory', fieldName: 'dept_category', placeholder: 'Search or add dept category...' },
                { id: 'drawerExaminerType', fieldName: 'examiner_type', placeholder: 'Search or add examiner type...' },
                { id: 'drawerBranch', fieldName: 'branch', placeholder: 'Search or add branch...' },
                { id: 'drawerBranchFinal', fieldName: 'branch_final', placeholder: 'Search or add branch final...' },
                { id: 'drawerPlace', fieldName: 'place', placeholder: 'Search or add place...' },
                { id: 'drawerQualification', fieldName: 'qualification', placeholder: 'Search or add qualification...' },
                { id: 'drawerBankCity', fieldName: 'bank_city', placeholder: 'Search or add bank city...' }
            ];

            window.creatableSelects = {};

            selectFields.forEach(field => {
                const element = document.getElementById(field.id);
                if (element && !element.hasAttribute('data-initialized')) {
                    window.creatableSelects[field.id] = new CreatableSelect(element, {
                        fieldName: field.fieldName,
                        placeholder: field.placeholder
                    });
                    element.setAttribute('data-initialized', 'true');
                }
            });

            document.querySelectorAll('.filter-select').forEach(element => {
                const key = element.id || `filter-${element.name}`;
                if (!element.hasAttribute('data-initialized')) {
                    const fieldName = element.name;
                    const urlValue = getUrlParameter(fieldName);

                    window.creatableSelects[key] = new CreatableSelect(element, {
                        fieldName: fieldName,
                        placeholder: `Search or select ${fieldName.replace(/_/g, ' ')}`,
                        loadRemote: true,
                        allowCreate: false
                    });
                    element.setAttribute('data-initialized', 'true');

                    if (urlValue) {
                        window.creatableSelects[key].setValue(urlValue);
                    }
                }
            });
        }
    };

    // ===================================================================
    // 15. DJANGO MESSAGES
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
    // 16. MAIN INITIALIZATION
    // ===================================================================

    function init() {
        DrawerManager.init();
        FilterManager.init();
        SearchManager.init();
        TableManager.init();
        FormManager.init();
        UploadManager.init();
        ExcelMenuManager.init();
        GlobalEventManager.init();
        CreatableSelectManager.init();
        DjangoMessageManager.init();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // ===================================================================
    // 17. PUBLIC API
    // ===================================================================

    window.staffApp = {
        openDrawer: (staffPhone) => DrawerManager.openStaff(staffPhone),
        closeDrawer: () => DrawerManager.closeStaff(),

        openDeleteDrawer: (staffPhone, staffName) => DrawerManager.openDelete(staffPhone, staffName, () => {
            DeleteManager.executeDelete(staffPhone);
        }),
        closeDeleteDrawer: () => DrawerManager.closeDelete(),
        openUploadDrawer: () => DrawerManager.openUpload(),
        closeUploadDrawer: () => DrawerManager.closeUpload(),
        openDeleteModal: (staffPhone, staffName) => DeleteManager.openModal(staffPhone, staffName),
        uploadFile: () => UploadManager.upload(),
        toggleExcelMenu: () => ExcelMenuManager.toggle()
    };

})();