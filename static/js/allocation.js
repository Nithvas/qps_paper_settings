// qps_allocation.js

(function() {
    'use strict';

    // ============================================================
    // DUMMY DATA - Replace with API calls in production
    // ============================================================
    const DUMMY_DATA = {
        examCycles: [
            { id: 1, name: 'April 2024' },
            { id: 2, name: 'August 2024' },
            { id: 3, name: 'December 2024' },
            { id: 4, name: 'April 2025' }
        ],
        courses: [
            { id: 1, code: 'CS101', title: 'Programming Fundamentals', program_type: 'UG' },
            { id: 2, code: 'CS102', title: 'Data Structures', program_type: 'UG' },
            { id: 3, code: 'CS201', title: 'Database Management', program_type: 'UG' },
            { id: 4, code: 'CS301', title: 'Software Engineering', program_type: 'PG' },
            { id: 5, code: 'CS401', title: 'Machine Learning', program_type: 'PG' }
        ],
        staff: [
            { id: 1, phone: '9876543210', name: 'Dr. A. Kumar', designation: 'Professor' },
            { id: 2, phone: '9876543211', name: 'Dr. S. Sharma', designation: 'Associate Professor' },
            { id: 3, phone: '9876543212', name: 'Dr. R. Patel', designation: 'Assistant Professor' },
            { id: 4, phone: '9876543213', name: 'Dr. M. Reddy', designation: 'Professor' },
            { id: 5, phone: '9876543214', name: 'Dr. P. Singh', designation: 'Associate Professor' },
            { id: 6, phone: '9876543215', name: 'Dr. L. Gupta', designation: 'Assistant Professor' },
            { id: 7, phone: '9876543216', name: 'Dr. N. Joshi', designation: 'Professor' },
            { id: 8, phone: '9876543217', name: 'Dr. K. Malhotra', designation: 'Associate Professor' }
        ],
        allocations: []
    };

    // Generate dummy allocations
    function generateDummyAllocations() {
        const statuses = ['DRAFT', 'PENDING', 'IN_PROGRESS', 'SUBMITTED', 'APPROVED', 'REJECTED', 'REVISION_REQUESTED'];
        const types = ['INTERNAL', 'EXTERNAL'];
        const now = new Date();
        
        for (let i = 1; i <= 25; i++) {
            const status = statuses[Math.floor(Math.random() * statuses.length)];
            const setterType = types[Math.floor(Math.random() * types.length)];
            const courseIdx = Math.floor(Math.random() * DUMMY_DATA.courses.length);
            const setterIdx = Math.floor(Math.random() * DUMMY_DATA.staff.length);
            let checkerIdx = Math.floor(Math.random() * DUMMY_DATA.staff.length);
            while (checkerIdx === setterIdx) {
                checkerIdx = Math.floor(Math.random() * DUMMY_DATA.staff.length);
            }
            const examCycleIdx = Math.floor(Math.random() * DUMMY_DATA.examCycles.length);
            
            const assignedDate = new Date(now);
            assignedDate.setDate(assignedDate.getDate() - Math.floor(Math.random() * 30));
            
            const dueDate = new Date(assignedDate);
            dueDate.setDate(dueDate.getDate() + 7 + Math.floor(Math.random() * 14));
            
            const submittedDate = status === 'SUBMITTED' || status === 'APPROVED' || status === 'REJECTED' 
                ? new Date(dueDate.getTime() + Math.floor(Math.random() * 5) * 24 * 60 * 60 * 1000)
                : null;
            
            const approvedDate = status === 'APPROVED' 
                ? new Date(submittedDate.getTime() + Math.floor(Math.random() * 3) * 24 * 60 * 60 * 1000)
                : null;
            
            DUMMY_DATA.allocations.push({
                id: i,
                exam_cycle: DUMMY_DATA.examCycles[examCycleIdx].id,
                exam_cycle_name: DUMMY_DATA.examCycles[examCycleIdx].name,
                course: DUMMY_DATA.courses[courseIdx].id,
                course_code: DUMMY_DATA.courses[courseIdx].code,
                course_title: DUMMY_DATA.courses[courseIdx].title,
                program_type: DUMMY_DATA.courses[courseIdx].program_type,
                setter: DUMMY_DATA.staff[setterIdx].id,
                setter_name: DUMMY_DATA.staff[setterIdx].name,
                setter_phone: DUMMY_DATA.staff[setterIdx].phone,
                setter_type: setterType,
                checker: DUMMY_DATA.staff[checkerIdx].id,
                checker_name: DUMMY_DATA.staff[checkerIdx].name,
                checker_phone: DUMMY_DATA.staff[checkerIdx].phone,
                status: status,
                assigned_date: assignedDate.toISOString().split('T')[0],
                due_date: dueDate.toISOString().split('T')[0],
                submitted_date: submittedDate ? submittedDate.toISOString().split('T')[0] : null,
                approved_date: approvedDate ? approvedDate.toISOString().split('T')[0] : null,
                revision_count: Math.floor(Math.random() * 3),
                remarks: Math.random() > 0.7 ? 'Additional notes for this allocation' : '',
                is_confidential_locked: Math.random() > 0.3
            });
        }
        
        // Sort by assigned date descending
        DUMMY_DATA.allocations.sort((a, b) => new Date(b.assigned_date) - new Date(a.assigned_date));
    }

    generateDummyAllocations();

    // ============================================================
    // QPS APP
    // ============================================================
    const qpsApp = {
        currentPage: 1,
        pageSize: 10,
        sortField: null,
        sortDirection: null,
        filters: {},
        searchTerm: '',
        deleteId: null,

        // ============================================================
        // INIT
        // ============================================================
        init: function() {
            this.populateSelectOptions();
            this.renderTable();
            this.bindEvents();
            this.updateStats();
        },

        // ============================================================
        // POPULATE SELECT OPTIONS
        // ============================================================
        populateSelectOptions: function() {
            const examCycleSelect = document.getElementById('drawerExamCycle');
            const courseSelect = document.getElementById('drawerCourse');
            const setterSelect = document.getElementById('drawerSetter');
            const checkerSelect = document.getElementById('drawerChecker');
            
            // Populate exam cycles
            examCycleSelect.innerHTML = '<option value="">Select Exam Cycle</option>';
            DUMMY_DATA.examCycles.forEach(ec => {
                examCycleSelect.innerHTML += `<option value="${ec.id}">${ec.name}</option>`;
            });
            
            // Populate courses
            courseSelect.innerHTML = '<option value="">Select Course</option>';
            DUMMY_DATA.courses.forEach(c => {
                courseSelect.innerHTML += `<option value="${c.id}">${c.code} - ${c.title}</option>`;
            });
            
            // Populate setters
            setterSelect.innerHTML = '<option value="">Select Setter</option>';
            DUMMY_DATA.staff.forEach(s => {
                setterSelect.innerHTML += `<option value="${s.id}">${s.name} (${s.phone})</option>`;
            });
            
            // Populate checkers
            checkerSelect.innerHTML = '<option value="">Select Checker</option>';
            DUMMY_DATA.staff.forEach(s => {
                checkerSelect.innerHTML += `<option value="${s.id}">${s.name} (${s.phone})</option>`;
            });

            // Filter selects
            this.populateFilterSelects();
        },

        populateFilterSelects: function() {
            // Exam Cycle filter
            const filterExamCycle = document.getElementById('filterExamCycle');
            filterExamCycle.innerHTML = '<option value="">All Cycles</option>';
            DUMMY_DATA.examCycles.forEach(ec => {
                filterExamCycle.innerHTML += `<option value="${ec.id}">${ec.name}</option>`;
            });

            // Course filter
            const filterCourse = document.getElementById('filterCourse');
            filterCourse.innerHTML = '<option value="">All Courses</option>';
            DUMMY_DATA.courses.forEach(c => {
                filterCourse.innerHTML += `<option value="${c.id}">${c.code}</option>`;
            });

            // Setter filter
            const filterSetter = document.getElementById('filterSetter');
            filterSetter.innerHTML = '<option value="">All Setters</option>';
            DUMMY_DATA.staff.forEach(s => {
                filterSetter.innerHTML += `<option value="${s.id}">${s.name}</option>`;
            });

            // Checker filter
            const filterChecker = document.getElementById('filterChecker');
            filterChecker.innerHTML = '<option value="">All Checkers</option>';
            DUMMY_DATA.staff.forEach(s => {
                filterChecker.innerHTML += `<option value="${s.id}">${s.name}</option>`;
            });

            // Program Type filter
            const filterProgramType = document.getElementById('filterProgramType');
            filterProgramType.innerHTML = '<option value="">All Program Types</option>';
            const programTypes = [...new Set(DUMMY_DATA.courses.map(c => c.program_type))];
            programTypes.forEach(pt => {
                filterProgramType.innerHTML += `<option value="${pt}">${pt}</option>`;
            });
        },

        // ============================================================
        // RENDER TABLE
        // ============================================================
        renderTable: function() {
            const data = this.getFilteredData();
            const total = data.length;
            const totalPages = Math.ceil(total / this.pageSize);
            const start = (this.currentPage - 1) * this.pageSize;
            const end = Math.min(start + this.pageSize, total);
            const pageData = data.slice(start, end);

            const tbody = document.getElementById('allocationTableBody');
            
            if (pageData.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="11" class="py-12 text-center">
                            <div class="flex flex-col items-center">
                                <div class="w-12 h-12 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center mb-4">
                                    <i class="bi bi-inbox text-2xl text-slate-400"></i>
                                </div>
                                <h3 class="text-lg font-black text-slate-800">No Allocations Found</h3>
                                <p class="text-sm text-slate-400 mt-1">Try adjusting your filters or search terms</p>
                            </div>
                        </td>
                    </tr>
                `;
                document.getElementById('allocationTotalCount').textContent = '0';
                this.renderPagination(0, 0);
                return;
            }

            let html = '';
            pageData.forEach((item, index) => {
                const rowNum = start + index + 1;
                const statusClass = `status-${item.status.toLowerCase().replace('_', '-')}`;
                const statusLabel = item.status.replace('_', ' ').toUpperCase();
                
                html += `
                    <tr class="staff-row group hover:bg-gradient-to-r hover:from-indigo-50/40 hover:to-transparent transition-all duration-200">
                        <td class="px-4 py-4">
                            <span class="text-[12px] font-mono font-semibold text-slate-500">${rowNum}</span>
                        </td>
                        <td class="px-4 py-4">
                            <span class="font-semibold text-slate-700">${item.exam_cycle_name}</span>
                        </td>
                        <td class="px-4 py-4">
                            <div class="flex flex-col items-center">
                                <span class="font-bold text-slate-800 text-xs">${item.course_code}</span>
                                <span class="text-[10px] text-slate-500 truncate max-w-[120px]">${item.course_title}</span>
                            </div>
                        </td>
                        <td class="px-4 py-4">
                            <div class="flex flex-col items-center">
                                <span class="font-semibold text-slate-700 text-sm">${item.setter_name}</span>
                                <span class="text-[10px] text-slate-400">${item.setter_phone}</span>
                            </div>
                        </td>
                        <td class="px-4 py-4">
                            <span class="inline-flex px-2 py-0.5 rounded text-[10px] font-bold ${item.setter_type === 'INTERNAL' ? 'bg-emerald-50 text-emerald-700' : 'bg-purple-50 text-purple-700'}">
                                ${item.setter_type}
                            </span>
                        </td>
                        <td class="px-4 py-4">
                            ${item.checker ? `
                                <div class="flex flex-col items-center">
                                    <span class="font-semibold text-slate-700 text-sm">${item.checker_name}</span>
                                    <span class="text-[10px] text-slate-400">${item.checker_phone}</span>
                                </div>
                            ` : '<span class="text-slate-400 text-xs">Not Assigned</span>'}
                        </td>
                        <td class="px-4 py-4">
                            <span class="status-badge ${statusClass}">${statusLabel}</span>
                        </td>
                        <td class="px-4 py-4 text-xs text-slate-600">${item.assigned_date}</td>
                        <td class="px-4 py-4 text-xs text-slate-600">${item.due_date}</td>
                        <td class="px-4 py-4">
                            <span class="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 text-slate-600 text-xs font-bold">${item.revision_count}</span>
                        </td>
                        <td class="px-4 py-3 sticky right-0 z-20 bg-white border-l border-slate-200/80 group-hover:bg-slate-50 transition">
                            <div class="flex items-center justify-center gap-1">
                                <button onclick="window.qpsApp.viewDetail(${item.id})" 
                                        class="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition" title="View Details">
                                    <i class="bi bi-eye text-sm"></i>
                                </button>
                                <button onclick="window.qpsApp.openDrawer(${item.id})" 
                                        class="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded transition" title="Edit">
                                    <i class="bi bi-pencil text-sm"></i>
                                </button>
                                <button onclick="window.qpsApp.openDeleteModal(${item.id})" 
                                        class="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition" title="Delete">
                                    <i class="bi bi-trash3 text-sm"></i>
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
            });

            tbody.innerHTML = html;
            document.getElementById('allocationTotalCount').textContent = total;
            this.renderPagination(totalPages, total);
            this.updateStats();
        },

        // ============================================================
        // PAGINATION
        // ============================================================
        renderPagination: function(totalPages, total) {
            const container = document.getElementById('paginationContainer');
            if (totalPages <= 1) {
                container.innerHTML = `
                    <div class="flex justify-between items-center">
                        <span class="text-sm text-slate-500">Showing all ${total} records</span>
                    </div>
                `;
                return;
            }

            const start = (this.currentPage - 1) * this.pageSize + 1;
            const end = Math.min(this.currentPage * this.pageSize, total);
            
            let html = `
                <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div class="flex items-center gap-3 text-sm">
                        <div class="flex h-9 w-9 items-center justify-center rounded-lg bg-white border">
                            <i class="bi bi-table text-slate-500"></i>
                        </div>
                        <div>
                            <p class="text-[10px] font-bold text-slate-400 uppercase">Dataset Navigation</p>
                            <p class="text-slate-500 text-sm">
                                Showing <span class="font-semibold text-slate-700">${start}</span> to 
                                <span class="font-semibold text-slate-700">${end}</span> of 
                                <span class="font-semibold text-slate-700">${total}</span> records
                            </p>
                        </div>
                    </div>
                    <div class="flex items-center gap-2 flex-wrap">
            `;

            if (this.currentPage > 1) {
                html += `
                    <button onclick="window.qpsApp.goToPage(1)" class="h-9 px-3 rounded-lg border bg-white text-sm font-medium hover:bg-slate-50 transition">First</button>
                    <button onclick="window.qpsApp.goToPage(${this.currentPage - 1})" class="w-9 h-9 rounded-lg border bg-white flex items-center justify-center hover:bg-slate-50 transition">
                        <i class="bi bi-chevron-left text-xs"></i>
                    </button>
                `;
            }

            html += `
                <div class="flex items-center gap-1.5 px-3 h-9 rounded-lg border bg-white">
                    <span class="text-sm font-semibold text-slate-700">${this.currentPage}</span>
                    <span class="text-slate-400">/</span>
                    <span class="text-sm text-slate-600">${totalPages}</span>
                </div>
            `;

            if (this.currentPage < totalPages) {
                html += `
                    <button onclick="window.qpsApp.goToPage(${this.currentPage + 1})" class="w-9 h-9 rounded-lg border bg-white flex items-center justify-center hover:bg-slate-50 transition">
                        <i class="bi bi-chevron-right text-xs"></i>
                    </button>
                    <button onclick="window.qpsApp.goToPage(${totalPages})" class="h-9 px-3 rounded-lg border bg-white text-sm font-medium hover:bg-slate-50 transition">Last</button>
                `;
            }

            html += `
                    </div>
                </div>
            `;

            container.innerHTML = html;
        },

        goToPage: function(page) {
            this.currentPage = page;
            this.renderTable();
        },

        // ============================================================
        // FILTERING & SEARCH
        // ============================================================
        getFilteredData: function() {
            let data = [...DUMMY_DATA.allocations];
            
            // Apply search
            if (this.searchTerm) {
                const term = this.searchTerm.toLowerCase();
                data = data.filter(item => 
                    item.course_code.toLowerCase().includes(term) ||
                    item.course_title.toLowerCase().includes(term) ||
                    item.setter_name.toLowerCase().includes(term) ||
                    item.checker_name?.toLowerCase().includes(term) ||
                    item.exam_cycle_name.toLowerCase().includes(term)
                );
            }
            
            // Apply filters
            if (this.filters.exam_cycle) {
                data = data.filter(item => item.exam_cycle === parseInt(this.filters.exam_cycle));
            }
            if (this.filters.status) {
                data = data.filter(item => item.status === this.filters.status);
            }
            if (this.filters.setter_type) {
                data = data.filter(item => item.setter_type === this.filters.setter_type);
            }
            if (this.filters.program_type) {
                data = data.filter(item => item.program_type === this.filters.program_type);
            }
            if (this.filters.course) {
                data = data.filter(item => item.course === parseInt(this.filters.course));
            }
            if (this.filters.setter) {
                data = data.filter(item => item.setter === parseInt(this.filters.setter));
            }
            if (this.filters.checker) {
                data = data.filter(item => item.checker === parseInt(this.filters.checker));
            }
            
            // Apply sorting
            if (this.sortField) {
                data.sort((a, b) => {
                    let valA = a[this.sortField] || '';
                    let valB = b[this.sortField] || '';
                    if (typeof valA === 'string') valA = valA.toLowerCase();
                    if (typeof valB === 'string') valB = valB.toLowerCase();
                    if (valA < valB) return this.sortDirection === 'asc' ? -1 : 1;
                    if (valA > valB) return this.sortDirection === 'asc' ? 1 : -1;
                    return 0;
                });
            }
            
            return data;
        },

        applyFilters: function() {
            this.filters = {
                exam_cycle: document.getElementById('filterExamCycle').value,
                status: document.getElementById('filterStatus').value,
                setter_type: document.getElementById('filterSetterType').value,
                program_type: document.getElementById('filterProgramType').value,
                course: document.getElementById('filterCourse').value,
                setter: document.getElementById('filterSetter').value,
                checker: document.getElementById('filterChecker').value
            };
            this.currentPage = 1;
            this.renderTable();
        },

        resetFilters: function() {
            document.getElementById('filterExamCycle').value = '';
            document.getElementById('filterStatus').value = '';
            document.getElementById('filterSetterType').value = '';
            document.getElementById('filterProgramType').value = '';
            document.getElementById('filterCourse').value = '';
            document.getElementById('filterSetter').value = '';
            document.getElementById('filterChecker').value = '';
            document.getElementById('globalSearch').value = '';
            this.filters = {};
            this.searchTerm = '';
            this.currentPage = 1;
            this.renderTable();
        },

        // ============================================================
        // STATS
        // ============================================================
        updateStats: function() {
            const data = DUMMY_DATA.allocations;
            document.getElementById('statTotal').textContent = data.length;
            document.getElementById('statPending').textContent = data.filter(d => d.status === 'PENDING').length;
            document.getElementById('statInProgress').textContent = data.filter(d => d.status === 'IN_PROGRESS').length;
            document.getElementById('statSubmitted').textContent = data.filter(d => d.status === 'SUBMITTED').length;
            document.getElementById('statApproved').textContent = data.filter(d => d.status === 'APPROVED').length;
        },

        // ============================================================
        // DRAWER OPERATIONS
        // ============================================================
        openDrawer: function(id) {
            const drawer = document.getElementById('allocationDrawer');
            const title = document.getElementById('drawer-title');
            const subtitle = document.getElementById('drawer-subtitle');
            const form = document.getElementById('allocationForm');
            form.reset();
            document.getElementById('editAllocationId').value = '';
            
            // Reset confidential checkbox
            document.getElementById('drawerConfidential').checked = true;
            
            if (id) {
                const item = DUMMY_DATA.allocations.find(d => d.id === id);
                if (item) {
                    title.textContent = 'Edit QPS Allocation';
                    subtitle.textContent = 'Modify allocation details';
                    document.getElementById('editAllocationId').value = id;
                    document.getElementById('drawerExamCycle').value = item.exam_cycle;
                    document.getElementById('drawerCourse').value = item.course;
                    document.getElementById('drawerSetter').value = item.setter;
                    document.getElementById('drawerSetterType').value = item.setter_type;
                    document.getElementById('drawerChecker').value = item.checker || '';
                    document.getElementById('drawerDueDate').value = item.due_date;
                    document.getElementById('drawerStatus').value = item.status;
                    document.getElementById('drawerConfidential').checked = item.is_confidential_locked;
                    document.getElementById('drawerRemarks').value = item.remarks || '';
                }
            } else {
                title.textContent = 'New QPS Allocation';
                subtitle.textContent = 'Assign setter and checker for question paper';
                document.getElementById('drawerStatus').value = 'DRAFT';
            }
            
            drawer.classList.remove('hidden');
            document.body.style.overflow = 'hidden';
        },

        closeDrawer: function() {
            document.getElementById('allocationDrawer').classList.add('hidden');
            document.body.style.overflow = '';
        },

        // ============================================================
        // DELETE OPERATIONS
        // ============================================================
        openDeleteModal: function(id) {
            const item = DUMMY_DATA.allocations.find(d => d.id === id);
            if (item) {
                this.deleteId = id;
                document.getElementById('deleteDrawerCourse').textContent = `${item.course_code} - ${item.course_title}`;
                document.getElementById('deleteDrawer').classList.remove('hidden');
                document.body.style.overflow = 'hidden';
            }
        },

        closeDeleteDrawer: function() {
            document.getElementById('deleteDrawer').classList.add('hidden');
            document.body.style.overflow = '';
            this.deleteId = null;
        },

        confirmDelete: function() {
            if (this.deleteId) {
                const index = DUMMY_DATA.allocations.findIndex(d => d.id === this.deleteId);
                if (index > -1) {
                    DUMMY_DATA.allocations.splice(index, 1);
                    this.closeDeleteDrawer();
                    this.renderTable();
                    this.updateStats();
                    this.showToast('Allocation deleted successfully', 'success');
                }
            }
        },

        // ============================================================
        // VIEW DETAIL
        // ============================================================
        viewDetail: function(id) {
            const item = DUMMY_DATA.allocations.find(d => d.id === id);
            if (!item) return;
            
            const content = document.getElementById('detailContent');
            const statusClass = `status-${item.status.toLowerCase().replace('_', '-')}`;
            
            content.innerHTML = `
                <div class="grid grid-cols-2 gap-4">
                    <div class="bg-slate-50 rounded-lg p-4">
                        <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Exam Cycle</p>
                        <p class="text-sm font-semibold text-slate-800">${item.exam_cycle_name}</p>
                    </div>
                    <div class="bg-slate-50 rounded-lg p-4">
                        <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Status</p>
                        <span class="status-badge ${statusClass}">${item.status.replace('_', ' ').toUpperCase()}</span>
                    </div>
                    <div class="bg-slate-50 rounded-lg p-4">
                        <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Course</p>
                        <p class="text-sm font-semibold text-slate-800">${item.course_code} - ${item.course_title}</p>
                        <p class="text-xs text-slate-500">Program Type: ${item.program_type}</p>
                    </div>
                    <div class="bg-slate-50 rounded-lg p-4">
                        <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Setter</p>
                        <p class="text-sm font-semibold text-slate-800">${item.setter_name}</p>
                        <p class="text-xs text-slate-500">${item.setter_phone} • ${item.setter_type}</p>
                    </div>
                    <div class="bg-slate-50 rounded-lg p-4">
                        <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Checker</p>
                        ${item.checker ? `
                            <p class="text-sm font-semibold text-slate-800">${item.checker_name}</p>
                            <p class="text-xs text-slate-500">${item.checker_phone}</p>
                        ` : '<p class="text-sm text-slate-400">Not Assigned</p>'}
                    </div>
                    <div class="bg-slate-50 rounded-lg p-4">
                        <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Revisions</p>
                        <p class="text-sm font-semibold text-slate-800">${item.revision_count}</p>
                    </div>
                    <div class="bg-slate-50 rounded-lg p-4">
                        <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Assigned Date</p>
                        <p class="text-sm font-semibold text-slate-800">${item.assigned_date}</p>
                    </div>
                    <div class="bg-slate-50 rounded-lg p-4">
                        <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Due Date</p>
                        <p class="text-sm font-semibold text-slate-800">${item.due_date}</p>
                    </div>
                    ${item.submitted_date ? `
                    <div class="bg-slate-50 rounded-lg p-4">
                        <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Submitted Date</p>
                        <p class="text-sm font-semibold text-slate-800">${item.submitted_date}</p>
                    </div>
                    ` : ''}
                    ${item.approved_date ? `
                    <div class="bg-slate-50 rounded-lg p-4">
                        <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Approved Date</p>
                        <p class="text-sm font-semibold text-slate-800">${item.approved_date}</p>
                    </div>
                    ` : ''}
                    <div class="bg-slate-50 rounded-lg p-4 col-span-2">
                        <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Confidentiality</p>
                        <p class="text-sm font-semibold text-slate-800">${item.is_confidential_locked ? '🔒 Locked' : '🔓 Unlocked'}</p>
                    </div>
                    ${item.remarks ? `
                    <div class="bg-slate-50 rounded-lg p-4 col-span-2">
                        <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Remarks</p>
                        <p class="text-sm text-slate-700">${item.remarks}</p>
                    </div>
                    ` : ''}
                </div>
            `;
            
            document.getElementById('detailModal').classList.remove('hidden');
            document.body.style.overflow = 'hidden';
        },

        closeDetailModal: function() {
            document.getElementById('detailModal').classList.add('hidden');
            document.body.style.overflow = '';
        },

        // ============================================================
        // SAVE ALLOCATION
        // ============================================================
        saveAllocation: function(e) {
            e.preventDefault();
            const form = document.getElementById('allocationForm');
            const formData = new FormData(form);
            
            const allocationData = {
                exam_cycle: parseInt(formData.get('exam_cycle')),
                course: parseInt(formData.get('course')),
                setter: parseInt(formData.get('setter')),
                setter_type: formData.get('setter_type'),
                checker: formData.get('checker') ? parseInt(formData.get('checker')) : null,
                due_date: formData.get('due_date'),
                status: formData.get('status'),
                is_confidential_locked: formData.get('is_confidential_locked') === 'on',
                remarks: formData.get('remarks') || ''
            };
            
            const editId = formData.get('allocation_id');
            
            if (editId) {
                // Edit existing
                const index = DUMMY_DATA.allocations.findIndex(d => d.id === parseInt(editId));
                if (index > -1) {
                    const existing = DUMMY_DATA.allocations[index];
                    DUMMY_DATA.allocations[index] = {
                        ...existing,
                        ...allocationData,
                        exam_cycle_name: DUMMY_DATA.examCycles.find(ec => ec.id === allocationData.exam_cycle)?.name || '',
                        course_code: DUMMY_DATA.courses.find(c => c.id === allocationData.course)?.code || '',
                        course_title: DUMMY_DATA.courses.find(c => c.id === allocationData.course)?.title || '',
                        program_type: DUMMY_DATA.courses.find(c => c.id === allocationData.course)?.program_type || '',
                        setter_name: DUMMY_DATA.staff.find(s => s.id === allocationData.setter)?.name || '',
                        setter_phone: DUMMY_DATA.staff.find(s => s.id === allocationData.setter)?.phone || '',
                        checker_name: allocationData.checker ? DUMMY_DATA.staff.find(s => s.id === allocationData.checker)?.name : null,
                        checker_phone: allocationData.checker ? DUMMY_DATA.staff.find(s => s.id === allocationData.checker)?.phone : null
                    };
                    this.showToast('Allocation updated successfully', 'success');
                }
            } else {
                // Create new
                const newId = DUMMY_DATA.allocations.length + 1;
                const examCycle = DUMMY_DATA.examCycles.find(ec => ec.id === allocationData.exam_cycle);
                const course = DUMMY_DATA.courses.find(c => c.id === allocationData.course);
                const setter = DUMMY_DATA.staff.find(s => s.id === allocationData.setter);
                const checker = allocationData.checker ? DUMMY_DATA.staff.find(s => s.id === allocationData.checker) : null;
                
                DUMMY_DATA.allocations.push({
                    id: newId,
                    ...allocationData,
                    exam_cycle_name: examCycle?.name || '',
                    course_code: course?.code || '',
                    course_title: course?.title || '',
                    program_type: course?.program_type || '',
                    setter_name: setter?.name || '',
                    setter_phone: setter?.phone || '',
                    checker_name: checker?.name || null,
                    checker_phone: checker?.phone || null,
                    assigned_date: new Date().toISOString().split('T')[0],
                    submitted_date: null,
                    approved_date: null,
                    revision_count: 0
                });
                this.showToast('Allocation created successfully', 'success');
            }
            
            this.closeDrawer();
            this.renderTable();
            this.updateStats();
        },

        // ============================================================
        // UPLOAD OPERATIONS
        // ============================================================
        openUploadDrawer: function() {
            document.getElementById('uploadDrawer').classList.remove('hidden');
            document.body.style.overflow = 'hidden';
            document.getElementById('uploadBtn').disabled = true;
            document.getElementById('fileInfo').classList.add('hidden');
            document.getElementById('uploadProgress').classList.add('hidden');
            document.getElementById('uploadResults').classList.add('hidden');
            document.getElementById('excelFile').value = '';
        },

        closeUploadDrawer: function() {
            document.getElementById('uploadDrawer').classList.add('hidden');
            document.body.style.overflow = '';
        },

        clearFile: function() {
            document.getElementById('excelFile').value = '';
            document.getElementById('fileInfo').classList.add('hidden');
            document.getElementById('uploadBtn').disabled = true;
        },

        toggleExcelMenu: function() {
            const menu = document.getElementById('excelMenu');
            menu.classList.toggle('hidden');
        },

        // ============================================================
        // EXPORT
        // ============================================================
        exportAllocations: function() {
            const data = this.getFilteredData();
            if (data.length === 0) {
                this.showToast('No data to export', 'warning');
                return;
            }
            
            // Create CSV
            const headers = ['ID', 'Exam Cycle', 'Course Code', 'Course Title', 'Setter', 'Setter Type', 'Checker', 'Status', 'Assigned Date', 'Due Date', 'Revisions'];
            const rows = data.map(item => [
                item.id,
                item.exam_cycle_name,
                item.course_code,
                `"${item.course_title}"`,
                item.setter_name,
                item.setter_type,
                item.checker_name || 'N/A',
                item.status,
                item.assigned_date,
                item.due_date,
                item.revision_count
            ]);
            
            let csv = headers.join(',') + '\n';
            rows.forEach(row => {
                csv += row.join(',') + '\n';
            });
            
            // Download
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `qps_allocations_${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            this.showToast('Export completed successfully', 'success');
        },

        // ============================================================
        // UPLOAD FILE HANDLING
        // ============================================================
        handleFileSelect: function(e) {
            const file = e.target.files[0];
            if (!file) return;
            
            const validTypes = ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel'];
            if (!validTypes.includes(file.type) && !file.name.match(/\.(xlsx|xls)$/)) {
                this.showToast('Please select a valid Excel file (.xlsx or .xls)', 'error');
                this.clearFile();
                return;
            }
            
            if (file.size > 5 * 1024 * 1024) {
                this.showToast('File size exceeds 5MB limit', 'error');
                this.clearFile();
                return;
            }
            
            document.getElementById('fileName').textContent = file.name;
            document.getElementById('fileInfo').classList.remove('hidden');
            document.getElementById('uploadBtn').disabled = false;
        },

        uploadFile: function() {
            const file = document.getElementById('excelFile').files[0];
            if (!file) return;
            
            const progress = document.getElementById('uploadProgress');
            const results = document.getElementById('uploadResults');
            progress.classList.remove('hidden');
            results.classList.add('hidden');
            document.getElementById('uploadBtn').disabled = true;
            
            // Simulate upload progress
            let progressValue = 0;
            const interval = setInterval(() => {
                progressValue += Math.floor(Math.random() * 10) + 1;
                if (progressValue > 100) progressValue = 100;
                document.getElementById('progressBar').style.width = progressValue + '%';
                document.getElementById('progressPercent').textContent = progressValue + '%';
                
                if (progressValue >= 100) {
                    clearInterval(interval);
                    // Simulate completion
                    setTimeout(() => {
                        this.simulateUploadComplete();
                    }, 500);
                }
            }, 200);
        },

        simulateUploadComplete: function() {
            const success = Math.floor(Math.random() * 8) + 2; // 2-10 success
            const errors = Math.floor(Math.random() * 3); // 0-2 errors
            
            document.getElementById('uploadProgress').classList.add('hidden');
            document.getElementById('uploadResults').classList.remove('hidden');
            document.getElementById('successCount').textContent = success;
            document.getElementById('errorCount').textContent = errors;
            
            const errorList = document.getElementById('errorList');
            if (errors > 0) {
                errorList.classList.remove('hidden');
                errorList.innerHTML = `
                    <div class="flex items-start gap-2 py-1">
                        <i class="bi bi-x-circle text-red-500 mt-0.5"></i>
                        <span>Row 3: Invalid examiner type</span>
                    </div>
                    <div class="flex items-start gap-2 py-1">
                        <i class="bi bi-x-circle text-red-500 mt-0.5"></i>
                        <span>Row 7: Course not found</span>
                    </div>
                `;
            } else {
                errorList.classList.add('hidden');
            }
            
            // Add some dummy allocations to simulate upload
            const newAllocations = [];
            for (let i = 0; i < success; i++) {
                const courseIdx = Math.floor(Math.random() * DUMMY_DATA.courses.length);
                const setterIdx = Math.floor(Math.random() * DUMMY_DATA.staff.length);
                let checkerIdx = Math.floor(Math.random() * DUMMY_DATA.staff.length);
                while (checkerIdx === setterIdx) {
                    checkerIdx = Math.floor(Math.random() * DUMMY_DATA.staff.length);
                }
                const examCycleIdx = Math.floor(Math.random() * DUMMY_DATA.examCycles.length);
                const types = ['INTERNAL', 'EXTERNAL'];
                
                const now = new Date();
                const assignedDate = new Date(now);
                assignedDate.setDate(assignedDate.getDate() - Math.floor(Math.random() * 10));
                const dueDate = new Date(assignedDate);
                dueDate.setDate(dueDate.getDate() + 7 + Math.floor(Math.random() * 7));
                
                newAllocations.push({
                    id: DUMMY_DATA.allocations.length + i + 1,
                    exam_cycle: DUMMY_DATA.examCycles[examCycleIdx].id,
                    exam_cycle_name: DUMMY_DATA.examCycles[examCycleIdx].name,
                    course: DUMMY_DATA.courses[courseIdx].id,
                    course_code: DUMMY_DATA.courses[courseIdx].code,
                    course_title: DUMMY_DATA.courses[courseIdx].title,
                    program_type: DUMMY_DATA.courses[courseIdx].program_type,
                    setter: DUMMY_DATA.staff[setterIdx].id,
                    setter_name: DUMMY_DATA.staff[setterIdx].name,
                    setter_phone: DUMMY_DATA.staff[setterIdx].phone,
                    setter_type: types[Math.floor(Math.random() * types.length)],
                    checker: DUMMY_DATA.staff[checkerIdx].id,
                    checker_name: DUMMY_DATA.staff[checkerIdx].name,
                    checker_phone: DUMMY_DATA.staff[checkerIdx].phone,
                    status: 'PENDING',
                    assigned_date: assignedDate.toISOString().split('T')[0],
                    due_date: dueDate.toISOString().split('T')[0],
                    submitted_date: null,
                    approved_date: null,
                    revision_count: 0,
                    remarks: '',
                    is_confidential_locked: true
                });
            }
            
            DUMMY_DATA.allocations = [...DUMMY_DATA.allocations, ...newAllocations];
            this.renderTable();
            this.updateStats();
            this.showToast(`Uploaded ${success} allocations successfully`, 'success');
            
            document.getElementById('uploadBtn').disabled = false;
        },

        // ============================================================
        // TOAST NOTIFICATION
        // ============================================================
        showToast: function(message, type = 'info') {
            const colors = {
                success: 'bg-emerald-500',
                error: 'bg-rose-500',
                warning: 'bg-amber-500',
                info: 'bg-blue-500'
            };
            
            const toast = document.createElement('div');
            toast.className = `fixed bottom-4 right-4 px-6 py-3 rounded-lg text-white text-sm font-bold shadow-lg z-50 transform transition-all duration-300 ${colors[type] || colors.info}`;
            toast.textContent = message;
            document.body.appendChild(toast);
            
            setTimeout(() => {
                toast.style.opacity = '0';
                toast.style.transform = 'translateY(20px)';
                setTimeout(() => toast.remove(), 300);
            }, 3000);
        },

        // ============================================================
        // BIND EVENTS
        // ============================================================
        bindEvents: function() {
            // Search
            const searchInput = document.getElementById('globalSearch');
            let searchTimeout;
            searchInput.addEventListener('input', function() {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    window.qpsApp.searchTerm = this.value;
                    window.qpsApp.currentPage = 1;
                    window.qpsApp.renderTable();
                }, 300);
            });
            
            // Filter buttons
            document.getElementById('applyFiltersBtn').addEventListener('click', function() {
                window.qpsApp.applyFilters();
            });
            
            document.getElementById('resetFiltersBtn').addEventListener('click', function() {
                window.qpsApp.resetFilters();
            });
            
            // Sorting
            document.querySelectorAll('.sortable-th').forEach(th => {
                th.addEventListener('click', function() {
                    const field = this.dataset.col;
                    if (window.qpsApp.sortField === field) {
                        window.qpsApp.sortDirection = window.qpsApp.sortDirection === 'asc' ? 'desc' : 'asc';
                    } else {
                        window.qpsApp.sortField = field;
                        window.qpsApp.sortDirection = 'asc';
                    }
                    
                    // Update active state
                    document.querySelectorAll('.sortable-th').forEach(el => el.classList.remove('active', 'asc', 'desc'));
                    this.classList.add('active', window.qpsApp.sortDirection);
                    
                    window.qpsApp.currentPage = 1;
                    window.qpsApp.renderTable();
                });
            });
            
            // Form submit
            document.getElementById('allocationForm').addEventListener('submit', function(e) {
                window.qpsApp.saveAllocation(e);
            });
            
            // Delete confirm
            document.getElementById('confirmDeleteBtn').addEventListener('click', function() {
                window.qpsApp.confirmDelete();
            });
            
            // File input
            document.getElementById('excelFile').addEventListener('change', function(e) {
                window.qpsApp.handleFileSelect(e);
            });
            
            // Close menus on outside click
            document.addEventListener('click', function(e) {
                const menu = document.getElementById('excelMenu');
                if (menu && !menu.classList.contains('hidden')) {
                    const btn = e.target.closest('[onclick*="toggleExcelMenu"]');
                    if (!btn && !menu.contains(e.target)) {
                        menu.classList.add('hidden');
                    }
                }
            });
            
            // Keyboard shortcuts
            document.addEventListener('keydown', function(e) {
                if (e.key === 'Escape') {
                    if (!document.getElementById('allocationDrawer').classList.contains('hidden')) {
                        window.qpsApp.closeDrawer();
                    }
                    if (!document.getElementById('deleteDrawer').classList.contains('hidden')) {
                        window.qpsApp.closeDeleteDrawer();
                    }
                    if (!document.getElementById('uploadDrawer').classList.contains('hidden')) {
                        window.qpsApp.closeUploadDrawer();
                    }
                    if (!document.getElementById('detailModal').classList.contains('hidden')) {
                        window.qpsApp.closeDetailModal();
                    }
                }
            });
        }
    };

    // ============================================================
    // EXPOSE TO GLOBAL
    // ============================================================
    window.qpsApp = qpsApp;

    // Initialize on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => qpsApp.init());
    } else {
        qpsApp.init();
    }

})();