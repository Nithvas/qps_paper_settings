// ===================================================================
// QUESTION PATTERN MANAGEMENT - COMPLETE MODULE
// ===================================================================

(function () {

    'use strict';

    // ===================================================================
    // UTILITIES
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

    let drawerCount = 0;

    function lockBodyScroll() {
        drawerCount++;
        if (drawerCount === 1) {
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
        drawerCount--;
        if (drawerCount === 0) {
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

    function showToast(message, type = 'info') {
        const toast = document.createElement('div');
        const bgColor = type === 'success' ? 'bg-emerald-700' : (type === 'error' ? 'bg-red-500' : 'bg-blue-500');
        toast.className = `fixed bottom-4 right-4 px-4 py-2 rounded-lg text-white text-sm z-50 animate-fade-in ${bgColor}`;
        toast.textContent = message;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }

    // ===================================================================
    // PATTERN DRAWERS
    // ===================================================================

    const PatternDrawer = {

        openDrawer(patternId = null) {
            const drawer = document.getElementById('patternDrawer');
            const form = document.getElementById('patternForm');
            const editId = document.getElementById('editPatternId');
            const title = document.getElementById('pattern-drawer-title');
            const subtitle = document.getElementById('pattern-drawer-subtitle');
            const submitBtn = form.querySelector('button[type="submit"]');

            form.reset();
            document.getElementById('drawerPatternIsActive').checked = true;
            editId.value = '';
            title.innerText = 'New Question Pattern';
            subtitle.innerText = 'Complete all mandatory fields';
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="bi bi-save"></i> Save Pattern';

            if (patternId) {
                this.loadPattern(patternId, submitBtn, editId, title, subtitle);
            } else {
                drawer.classList.remove('hidden');
                lockBodyScroll();
            }
        },

        loadPattern(patternId, submitBtn, editId, title, subtitle) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="bi bi-hourglass-split animate-spin"></i> Loading...';

            fetch(`/pattern/details/${patternId}/`, {
                headers: { 'X-Requested-With': 'XMLHttpRequest' }
            })
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        const p = data.pattern;
                        document.getElementById('drawerPatternCode').value = p.pattern_code || '';
                        document.getElementById('drawerPatternName').value = p.pattern_name || '';
                        document.getElementById('drawerTotalMarks').value = p.total_marks || '';
                        document.getElementById('drawerDurationMinutes').value = p.duration_minutes || '';
                        document.getElementById('drawerPatternIsActive').checked = p.is_active || false;
                        editId.value = patternId;
                        title.innerText = 'Edit Question Pattern';
                        subtitle.innerText = `Editing: ${p.pattern_code} - ${p.pattern_name}`;
                        document.getElementById('patternDrawer').classList.remove('hidden');
                        lockBodyScroll();
                    } else {
                        showToast('Error loading pattern: ' + (data.error || 'Unknown error'), 'error');
                        this.closeDrawer();
                    }
                })
                .catch(err => {
                    console.error(err);
                    showToast('Failed to load pattern details.', 'error');
                    this.closeDrawer();
                })
                .finally(() => {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = '<i class="bi bi-save"></i> Save Pattern';
                });
        },

        closeDrawer() {
            const drawer = document.getElementById('patternDrawer');
            drawer.classList.add('hidden');
            unlockBodyScroll();
        }
    };

    // ===================================================================
    // PATTERN DELETE
    // ===================================================================

    const PatternDelete = {

        openModal(patternId, patternInfo) {
            document.getElementById('patternDeleteInfo').innerText = patternInfo;
            document.getElementById('patternDeleteMessage').innerHTML =
                `Are you completely certain you want to purge the pattern <strong class="text-rose-700">${escapeHtml(patternInfo)}</strong>? This action cannot be undone.`;

            window.pendingPatternDelete = () => {
                this.executeDelete(patternId);
            };

            const confirmBtn = document.getElementById('confirmPatternDeleteBtn');
            const newBtn = confirmBtn.cloneNode(true);
            confirmBtn.parentNode.replaceChild(newBtn, confirmBtn);
            newBtn.id = 'confirmPatternDeleteBtn';
            newBtn.addEventListener('click', () => {
                if (window.pendingPatternDelete) {
                    window.pendingPatternDelete();
                    window.pendingPatternDelete = null;
                }
                this.closeModal();
            });

            document.getElementById('patternDeleteDrawer').classList.remove('hidden');
            lockBodyScroll();
        },

        closeModal() {
            document.getElementById('patternDeleteDrawer').classList.add('hidden');
            unlockBodyScroll();
            window.pendingPatternDelete = null;
        },

        executeDelete(patternId) {
            fetch(`/pattern/delete/${patternId}/`, {
                method: 'POST',
                headers: {
                    'X-CSRFToken': csrftoken,
                    'X-Requested-With': 'XMLHttpRequest'
                }
            })
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        showToast(data.message || 'Pattern deleted successfully', 'success');
                        setTimeout(() => window.location.reload(), 1000);
                    } else {
                        showToast('Delete failed: ' + (data.error || 'Unknown error'), 'error');
                    }
                })
                .catch(err => {
                    console.error(err);
                    showToast('Network error while deleting', 'error');
                });
        }
    };

    // ===================================================================
    // PATTERN VIEW (with sections)
    // ===================================================================

    const PatternView = {

        openView(patternId) {
            const drawer = document.getElementById('patternViewDrawer');
            const content = document.getElementById('patternViewContent');
            content.innerHTML = '<div class="text-center py-12"><i class="bi bi-hourglass-split animate-spin text-3xl text-indigo-500"></i><p class="mt-4 text-slate-500">Loading pattern details...</p></div>';
            drawer.classList.remove('hidden');
            lockBodyScroll();

            fetch(`/pattern/details/${patternId}/`, {
                headers: { 'X-Requested-With': 'XMLHttpRequest' }
            })
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        this.renderPattern(data.pattern);
                        document.getElementById('pattern-view-title').innerText = `Pattern: ${data.pattern.pattern_code}`;
                        document.getElementById('pattern-view-subtitle').innerText = `${data.pattern.pattern_name} (${data.pattern.total_marks} marks)`;
                    } else {
                        showToast('Error loading pattern: ' + (data.error || 'Unknown error'), 'error');
                        this.closeView();
                    }
                })
                .catch(err => {
                    console.error(err);
                    showToast('Failed to load pattern details.', 'error');
                    this.closeView();
                });
        },

        renderPattern(pattern) {
            const container = document.getElementById('patternViewContent');
            const sectionsHtml = pattern.sections.map(s => `
                <tr class="section-row group hover:bg-slate-50/80 transition-colors">
                    <td class="px-4 py-3 text-center font-mono text-sm text-slate-600">${s.section_name}</td>
                    <td class="px-4 py-3 text-center"><span class="inline-flex px-2 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-100 text-xs font-bold">${s.question_type_display}</span></td>
                    <td class="px-4 py-3 text-center font-mono text-sm">${s.no_of_questions}</td>
                    <td class="px-4 py-3 text-center font-mono text-sm">${s.questions_to_answer}</td>
                    <td class="px-4 py-3 text-center font-mono text-sm">${s.marks_per_question}</td>
                    <td class="px-4 py-3 text-center font-mono text-sm font-bold text-indigo-600">${s.total_section_marks}</td>
                    <td class="px-4 py-3 text-center">
                        <div class="flex items-center justify-center gap-2">
                            <button onclick="window.patternApp.toggleSectionStatus(${s.id})"
                                    class="relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${s.is_active ? 'bg-emerald-500' : 'bg-slate-300'}">
                                <span class="pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${s.is_active ? 'translate-x-4' : 'translate-x-0'}"></span>
                            </button>
                        </div>
                    </td>
                    <td class="px-4 py-3 text-center">
                        <div class="inline-flex gap-1">
                            <button onclick="window.patternApp.openSectionDrawer(${s.id}, ${pattern.id})"
                                    class="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors" title="Edit Section">
                                <i class="bi bi-pencil text-sm"></i>
                            </button>
                            <button onclick="window.patternApp.openSectionDeleteModal(${s.id}, '${escapeHtml(s.section_name)}')"
                                    class="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors" title="Delete Section">
                                <i class="bi bi-trash3 text-sm"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `).join('');

            container.innerHTML = `
                <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div class="px-5 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                        <div class="flex items-center gap-2">
                            <i class="bi bi-layers text-indigo-600"></i>
                            <h3 class="font-bold text-xs tracking-wider text-slate-700 uppercase">Sections (${pattern.sections.length})</h3>
                        </div>
                        <button onclick="window.patternApp.openSectionDrawer(null, ${pattern.id})"
                                class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#8b1e3f] text-white text-xs font-bold rounded-lg hover:bg-[#721833] transition-colors">
                            <i class="bi bi-plus-circle"></i> Add Section
                        </button>
                    </div>
                    <div class="overflow-x-auto">
                        <table class="w-full text-sm">
                            <thead class="bg-slate-50/70 text-[11px] uppercase tracking-[0.1em] text-slate-500 font-bold">
                                <tr>
                                    <th class="px-4 py-3 text-center">Section Name</th>
                                    <th class="px-4 py-3 text-center">Question Type</th>
                                    <th class="px-4 py-3 text-center">Total Qs</th>
                                    <th class="px-4 py-3 text-center">To Answer</th>
                                    <th class="px-4 py-3 text-center">Marks/Q</th>
                                    <th class="px-4 py-3 text-center">Section Marks</th>
                                    <th class="px-4 py-3 text-center">Status</th>
                                    <th class="px-4 py-3 text-center w-20">Actions</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-slate-100">
                                ${sectionsHtml || `<tr><td colspan="8" class="py-8 text-center text-slate-400">No sections defined yet.</td></tr>`}
                            </tbody>
                        </table>
                    </div>
                </div>
                <div class="flex justify-end gap-4 mt-4">
                    <button onclick="window.patternApp.closeViewDrawer()"
                            class="px-6 py-2 bg-white border border-slate-200 text-slate-700 font-bold text-sm rounded-lg hover:bg-slate-50 transition-colors">
                        Close
                    </button>
                </div>
            `;
        },

        closeView() {
            document.getElementById('patternViewDrawer').classList.add('hidden');
            unlockBodyScroll();
        }
    };

    // ===================================================================
    // SECTION DRAWERS
    // ===================================================================

    const SectionDrawer = {

        openDrawer(sectionId = null, patternId) {
            const drawer = document.getElementById('sectionDrawer');
            const form = document.getElementById('sectionForm');
            const editId = document.getElementById('editSectionId');
            const patId = document.getElementById('sectionPatternId');
            const title = document.getElementById('section-drawer-title');
            const subtitle = document.getElementById('section-drawer-subtitle');
            const submitBtn = form.querySelector('button[type="submit"]');

            form.reset();
            document.getElementById('drawerSectionIsActive').checked = true;
            document.getElementById('drawerInternalChoice').checked = false;
            editId.value = '';
            patId.value = patternId;
            title.innerText = 'New Section';
            subtitle.innerText = 'Configure section details';
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="bi bi-save"></i> Save Section';

            if (sectionId) {
                this.loadSection(sectionId, submitBtn, editId, title, subtitle);
            } else {
                drawer.classList.remove('hidden');
                lockBodyScroll();
            }
        },

        loadSection(sectionId, submitBtn, editId, title, subtitle) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="bi bi-hourglass-split animate-spin"></i> Loading...';

            fetch(`/pattern/sections/edit/${sectionId}/`, {
                headers: { 'X-Requested-With': 'XMLHttpRequest' }
            })
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        const s = data.section;
                        document.getElementById('drawerSectionName').value = s.section_name || '';
                        document.getElementById('drawerQuestionType').value = s.question_type || '';
                        document.getElementById('drawerNoOfQuestions').value = s.no_of_questions || '';
                        document.getElementById('drawerQuestionsToAnswer').value = s.questions_to_answer || '';
                        document.getElementById('drawerMarksPerQuestion').value = s.marks_per_question || '';
                        document.getElementById('drawerInternalChoice').checked = s.internal_choice || false;
                        document.getElementById('drawerSectionIsActive').checked = s.is_active || false;
                        editId.value = sectionId;
                        document.getElementById('sectionPatternId').value = s.pattern_id;
                        title.innerText = 'Edit Section';
                        subtitle.innerText = `Editing: ${s.section_name}`;
                        drawer.classList.remove('hidden');
                        lockBodyScroll();
                    } else {
                        showToast('Error loading section: ' + (data.error || 'Unknown error'), 'error');
                        this.closeDrawer();
                    }
                })
                .catch(err => {
                    console.error(err);
                    showToast('Failed to load section details.', 'error');
                    this.closeDrawer();
                })
                .finally(() => {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = '<i class="bi bi-save"></i> Save Section';
                });
        },

        closeDrawer() {
            document.getElementById('sectionDrawer').classList.add('hidden');
            unlockBodyScroll();
        }
    };

    // ===================================================================
    // SECTION DELETE
    // ===================================================================

    const SectionDelete = {

        openModal(sectionId, sectionName) {
            document.getElementById('sectionDeleteInfo').innerText = sectionName;
            document.getElementById('sectionDeleteMessage').innerHTML =
                `Are you certain you want to permanently delete the section <strong class="text-rose-700">${escapeHtml(sectionName)}</strong>?`;

            window.pendingSectionDelete = () => {
                this.executeDelete(sectionId);
            };

            const confirmBtn = document.getElementById('confirmSectionDeleteBtn');
            const newBtn = confirmBtn.cloneNode(true);
            confirmBtn.parentNode.replaceChild(newBtn, confirmBtn);
            newBtn.id = 'confirmSectionDeleteBtn';
            newBtn.addEventListener('click', () => {
                if (window.pendingSectionDelete) {
                    window.pendingSectionDelete();
                    window.pendingSectionDelete = null;
                }
                this.closeModal();
            });

            document.getElementById('sectionDeleteDrawer').classList.remove('hidden');
            lockBodyScroll();
        },

        closeModal() {
            document.getElementById('sectionDeleteDrawer').classList.add('hidden');
            unlockBodyScroll();
            window.pendingSectionDelete = null;
        },

        executeDelete(sectionId) {
            fetch(`/pattern/sections/delete/${sectionId}/`, {
                method: 'POST',
                headers: {
                    'X-CSRFToken': csrftoken,
                    'X-Requested-With': 'XMLHttpRequest'
                }
            })
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        showToast(data.message || 'Section deleted successfully', 'success');
                        // Refresh view drawer
                        const viewDrawer = document.getElementById('patternViewDrawer');
                        if (!viewDrawer.classList.contains('hidden')) {
                            const patternId = document.getElementById('sectionPatternId')?.value;
                            if (patternId) {
                                PatternView.openView(parseInt(patternId));
                            } else {
                                window.location.reload();
                            }
                        } else {
                            window.location.reload();
                        }
                    } else {
                        showToast('Delete failed: ' + (data.error || 'Unknown error'), 'error');
                    }
                })
                .catch(err => {
                    console.error(err);
                    showToast('Network error while deleting section', 'error');
                });
        }
    };

    // ===================================================================
    // TOGGLE STATUS
    // ===================================================================

    const ToggleManager = {

        togglePattern(patternId) {
            fetch(`/pattern/toggle-active/${patternId}/`, {
                method: 'POST',
                headers: {
                    'X-CSRFToken': csrftoken,
                    'X-Requested-With': 'XMLHttpRequest',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({})
            })
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        showToast(data.message || 'Status updated', 'success');
                        setTimeout(() => window.location.reload(), 800);
                    } else {
                        showToast('Error: ' + (data.error || 'Could not update status'), 'error');
                    }
                })
                .catch(err => {
                    console.error(err);
                    showToast('Network error while updating status', 'error');
                });
        },

        toggleSection(sectionId) {
            fetch(`/pattern/sections/toggle-active/${sectionId}/`, {
                method: 'POST',
                headers: {
                    'X-CSRFToken': csrftoken,
                    'X-Requested-With': 'XMLHttpRequest',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({})
            })
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        showToast(data.message || 'Section status updated', 'success');
                        // Refresh view if open
                        const viewDrawer = document.getElementById('patternViewDrawer');
                        if (!viewDrawer.classList.contains('hidden')) {
                            const patternId = document.getElementById('sectionPatternId')?.value;
                            if (patternId) {
                                PatternView.openView(parseInt(patternId));
                            }
                        } else {
                            window.location.reload();
                        }
                    } else {
                        showToast('Error: ' + (data.error || 'Could not update section status'), 'error');
                    }
                })
                .catch(err => {
                    console.error(err);
                    showToast('Network error while updating section status', 'error');
                });
        }
    };

    // ===================================================================
    // SEARCH & SORT
    // ===================================================================

    const SearchManager = {
        init() {
            const input = document.getElementById('globalSearch');
            if (input) {
                let timeout;
                input.addEventListener('input', () => {
                    clearTimeout(timeout);
                    timeout = setTimeout(() => this.filterTable(), 300);
                });
            }
        },

        filterTable() {
            const searchTerm = (document.getElementById('globalSearch')?.value || '').toLowerCase().trim();
            const tbody = document.getElementById('patternTableBody');
            if (!tbody) return;
            const rows = Array.from(tbody.querySelectorAll('tr.pattern-row'));
            let visible = 0;

            rows.forEach(row => {
                const text = row.innerText.toLowerCase();
                const match = searchTerm === '' || text.includes(searchTerm);
                row.style.display = match ? 'table-row' : 'none';
                if (match) visible++;
            });

            document.getElementById('patternTotalCount').textContent = visible;

            let noResult = tbody.querySelector('tr.no-results');
            if (visible === 0 && searchTerm !== '') {
                if (!noResult) {
                    noResult = document.createElement('tr');
                    noResult.className = 'no-results';
                    noResult.innerHTML = `
                        <td colspan="7" class="py-12 text-center bg-gradient-to-b from-slate-50 to-white">
                            <div class="mx-auto">
                                <div class="w-12 h-12 mx-auto rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center shadow-inner mb-4">
                                    <i class="bi bi-search text-2xl text-slate-400"></i>
                                </div>
                                <h3 class="text-lg font-black text-slate-800 tracking-tight">No Results Found</h3>
                                <p class="mt-3 text-sm text-slate-400 leading-relaxed">No patterns match "${searchTerm}"</p>
                            </div>
                        </td>
                    `;
                    tbody.appendChild(noResult);
                }
            } else {
                if (noResult) noResult.remove();
            }
        }
    };

    const SortManager = {
        currentSort: { col: null, dir: null },

        init() {
            document.querySelectorAll('.sortable-th').forEach(th => {
                th.addEventListener('click', () => {
                    const col = th.getAttribute('data-col');
                    if (col) this.sortTable(col, th);
                });
            });
            // Mark original order
            const tbody = document.getElementById('patternTableBody');
            if (tbody) {
                const rows = Array.from(tbody.querySelectorAll('tr.pattern-row'));
                rows.forEach((row, i) => row.dataset.originalIndex = i);
            }
        },

        sortTable(col, th) {
            const tbody = document.getElementById('patternTableBody');
            if (!tbody) return;
            const rows = Array.from(tbody.querySelectorAll('tr.pattern-row'));
            if (!rows.length) return;

            let dir;
            if (this.currentSort.col === col) {
                if (this.currentSort.dir === 'asc') dir = 'desc';
                else if (this.currentSort.dir === 'desc') dir = null;
                else dir = 'asc';
            } else {
                dir = 'asc';
            }
            this.currentSort = { col: dir ? col : null, dir: dir };

            // Update icons
            document.querySelectorAll('.sortable-th .sort-icon').forEach(icon => {
                icon.classList.remove('bi-arrow-up', 'bi-arrow-down');
                icon.classList.add('bi-arrow-down-up');
                icon.style.color = '';
            });
            if (dir) {
                const icon = th.querySelector('.sort-icon');
                icon.classList.remove('bi-arrow-down-up');
                icon.classList.add(dir === 'asc' ? 'bi-arrow-up' : 'bi-arrow-down');
                icon.style.color = '#4f46e5';
            }

            // Get column index
            const colIndex = Array.from(th.parentElement.children).indexOf(th);

            if (dir === null) {
                rows.sort((a, b) => Number(a.dataset.originalIndex) - Number(b.dataset.originalIndex));
            } else {
                rows.sort((a, b) => {
                    let valA = a.cells[colIndex]?.innerText?.trim() || '';
                    let valB = b.cells[colIndex]?.innerText?.trim() || '';
                    const numA = parseFloat(valA.replace(/[^0-9.-]+/g, ''));
                    const numB = parseFloat(valB.replace(/[^0-9.-]+/g, ''));
                    if (!isNaN(numA) && !isNaN(numB)) {
                        return dir === 'asc' ? numA - numB : numB - numA;
                    }
                    valA = valA.toLowerCase();
                    valB = valB.toLowerCase();
                    if (valA < valB) return dir === 'asc' ? -1 : 1;
                    if (valA > valB) return dir === 'asc' ? 1 : -1;
                    return 0;
                });
            }

            rows.forEach((row, idx) => {
                const serialCell = row.querySelector('td:first-child span');
                if (serialCell) serialCell.textContent = idx + 1;
                tbody.appendChild(row);
            });
        }
    };

    // ===================================================================
    // FORM HANDLING
    // ===================================================================

    const FormManager = {
        init() {
            document.getElementById('patternForm')?.addEventListener('submit', this.handlePatternSubmit.bind(this));
            document.getElementById('sectionForm')?.addEventListener('submit', this.handleSectionSubmit.bind(this));
        },

        handlePatternSubmit(e) {
            e.preventDefault();
            const form = e.target;
            const submitBtn = form.querySelector('button[type="submit"]');
            const original = submitBtn.innerHTML;
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="bi bi-hourglass-split animate-spin"></i> Saving...';

            const formData = new FormData(form);
            const editId = document.getElementById('editPatternId').value;
            const url = editId ? `/pattern/edit/${editId}/` : '/pattern/add/';

            // Ensure checkbox value
            const isActive = document.getElementById('drawerPatternIsActive').checked;
            formData.set('is_active', isActive ? 'true' : 'false');

            fetch(url, {
                method: 'POST',
                headers: { 'X-CSRFToken': csrftoken, 'X-Requested-With': 'XMLHttpRequest' },
                body: formData
            })
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        showToast(data.message || 'Pattern saved successfully', 'success');
                        setTimeout(() => window.location.reload(), 1000);
                    } else {
                        showToast('Error: ' + (data.error || 'Could not save.'), 'error');
                        submitBtn.disabled = false;
                        submitBtn.innerHTML = original;
                    }
                })
                .catch(err => {
                    console.error(err);
                    showToast('Network error: ' + err.message, 'error');
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = original;
                });
        },

        handleSectionSubmit(e) {
            e.preventDefault();
            const form = e.target;
            const submitBtn = form.querySelector('button[type="submit"]');
            const original = submitBtn.innerHTML;
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="bi bi-hourglass-split animate-spin"></i> Saving...';

            const formData = new FormData(form);
            const editId = document.getElementById('editSectionId').value;
            const patternId = document.getElementById('sectionPatternId').value;

            // Ensure checkbox values
            formData.set('internal_choice', document.getElementById('drawerInternalChoice').checked ? 'true' : 'false');
            formData.set('is_active', document.getElementById('drawerSectionIsActive').checked ? 'true' : 'false');

            let url;
            if (editId) {
                url = `/pattern/sections/edit/${editId}/`;
            } else {
                url = `/pattern/sections/add/${patternId}/`;
            }

            fetch(url, {
                method: 'POST',
                headers: { 'X-CSRFToken': csrftoken, 'X-Requested-With': 'XMLHttpRequest' },
                body: formData
            })
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        showToast(data.message || 'Section saved successfully', 'success');
                        // Refresh view drawer
                        const viewDrawer = document.getElementById('patternViewDrawer');
                        if (!viewDrawer.classList.contains('hidden')) {
                            PatternView.openView(parseInt(patternId));
                        } else {
                            window.location.reload();
                        }
                        SectionDrawer.closeDrawer();
                    } else {
                        showToast('Error: ' + (data.error || 'Could not save section.'), 'error');
                        submitBtn.disabled = false;
                        submitBtn.innerHTML = original;
                    }
                })
                .catch(err => {
                    console.error(err);
                    showToast('Network error: ' + err.message, 'error');
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = original;
                });
        }
    };

    // ===================================================================
    // DJANGO MESSAGES
    // ===================================================================

    const DjangoMessages = {
        init() {
            document.querySelectorAll('#django-messages .message').forEach(msg => {
                const text = msg.getAttribute('data-message');
                const level = msg.getAttribute('data-level');
                if (text) {
                    showToast(text, level === 'success' ? 'success' : (level === 'error' ? 'error' : 'info'));
                }
            });
        }
    };

    // ===================================================================
    // GLOBAL EVENTS (backdrop clicks, ESC)
    // ===================================================================

    function initGlobalEvents() {
        // Backdrop clicks
        document.addEventListener('click', (e) => {
            if (e.target.closest('#patternDrawer .drawer-backdrop')) PatternDrawer.closeDrawer();
            if (e.target.closest('#patternDeleteDrawer .drawer-backdrop')) PatternDelete.closeModal();
            if (e.target.closest('#patternViewDrawer .drawer-backdrop')) PatternView.closeView();
            if (e.target.closest('#sectionDrawer .drawer-backdrop')) SectionDrawer.closeDrawer();
            if (e.target.closest('#sectionDeleteDrawer .drawer-backdrop')) SectionDelete.closeModal();
        });

        // ESC key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (!document.getElementById('sectionDeleteDrawer').classList.contains('hidden')) {
                    SectionDelete.closeModal();
                } else if (!document.getElementById('sectionDrawer').classList.contains('hidden')) {
                    SectionDrawer.closeDrawer();
                } else if (!document.getElementById('patternViewDrawer').classList.contains('hidden')) {
                    PatternView.closeView();
                } else if (!document.getElementById('patternDeleteDrawer').classList.contains('hidden')) {
                    PatternDelete.closeModal();
                } else if (!document.getElementById('patternDrawer').classList.contains('hidden')) {
                    PatternDrawer.closeDrawer();
                }
            }
        });
    }

    // ===================================================================
    // INIT
    // ===================================================================

    function init() {
        SearchManager.init();
        SortManager.init();
        FormManager.init();
        DjangoMessages.init();
        initGlobalEvents();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // ===================================================================
    // PUBLIC API
    // ===================================================================

    window.patternApp = {
        // Patterns
        openPatternDrawer: (id) => PatternDrawer.openDrawer(id),
        closePatternDrawer: () => PatternDrawer.closeDrawer(),
        openPatternDeleteModal: (id, info) => PatternDelete.openModal(id, info),
        closePatternDeleteDrawer: () => PatternDelete.closeModal(),
        togglePatternStatus: (id) => ToggleManager.togglePattern(id),
        viewPattern: (id) => PatternView.openView(id),
        closeViewDrawer: () => PatternView.closeView(),

        // Sections
        openSectionDrawer: (sectionId, patternId) => SectionDrawer.openDrawer(sectionId, patternId),
        closeSectionDrawer: () => SectionDrawer.closeDrawer(),
        openSectionDeleteModal: (id, name) => SectionDelete.openModal(id, name),
        closeSectionDeleteDrawer: () => SectionDelete.closeModal(),
        toggleSectionStatus: (id) => ToggleManager.toggleSection(id),
    };

})();