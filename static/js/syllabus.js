(function() {
    'use strict';

    // --- Utilities ---
    function escapeHtml(str) { ... } // same as pattern.js
    function getCsrfToken() { ... }  // same
    function showToast(message, type) { ... } // same
    let drawerCount = 0;
    function lockBodyScroll() { ... }
    function unlockBodyScroll() { ... }

    // --- Drawer ---
    const SyllabusDrawer = {
        openDrawer(syllabusId = null) {
            const drawer = document.getElementById('syllabusDrawer');
            const form = document.getElementById('syllabusForm');
            const editId = document.getElementById('editSyllabusId');
            const title = document.getElementById('syllabus-drawer-title');
            const subtitle = document.getElementById('syllabus-drawer-subtitle');

            form.reset();
            document.getElementById('drawerIsActive').checked = true;
            editId.value = '';
            title.innerText = 'Add Syllabus';
            subtitle.innerText = 'Attach syllabus document to a course';

            if (syllabusId) {
                this.loadSyllabus(syllabusId);
            } else {
                drawer.classList.remove('hidden');
                lockBodyScroll();
            }
        },

        loadSyllabus(syllabusId) {
            const drawer = document.getElementById('syllabusDrawer');
            fetch(`/syllabus/details/${syllabusId}/`, {
                headers: { 'X-Requested-With': 'XMLHttpRequest' }
            })
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        const s = data.syllabus;
                        document.getElementById('editSyllabusId').value = s.id;
                        document.getElementById('drawerCourse').value = s.course_id;
                        document.getElementById('drawerIsActive').checked = s.is_active;
                        document.getElementById('syllabus-drawer-title').innerText = 'Edit Syllabus';
                        document.getElementById('syllabus-drawer-subtitle').innerText = `Editing ${s.course_code} - ${s.course_title}`;
                        // Show current file link if exists
                        const fileInput = document.getElementById('drawerSyllabusFile');
                        fileInput.dataset.currentFile = s.file_url || '';
                        drawer.classList.remove('hidden');
                        lockBodyScroll();
                    } else {
                        showToast('Error loading syllabus: ' + (data.error || 'Unknown error'), 'error');
                        this.closeDrawer();
                    }
                })
                .catch(err => {
                    console.error(err);
                    showToast('Failed to load syllabus details.', 'error');
                    this.closeDrawer();
                });
        },

        closeDrawer() {
            document.getElementById('syllabusDrawer').classList.add('hidden');
            unlockBodyScroll();
        }
    };

    // --- Delete ---
    const SyllabusDelete = {
        openModal(syllabusId, info) {
            document.getElementById('syllabusDeleteInfo').innerText = info;
            document.getElementById('syllabusDeleteMessage').innerHTML =
                `Are you sure you want to delete the syllabus for <strong class="text-rose-700">${escapeHtml(info)}</strong>?`;

            window.pendingSyllabusDelete = () => {
                this.executeDelete(syllabusId);
            };

            const confirmBtn = document.getElementById('confirmSyllabusDeleteBtn');
            const newBtn = confirmBtn.cloneNode(true);
            confirmBtn.parentNode.replaceChild(newBtn, confirmBtn);
            newBtn.id = 'confirmSyllabusDeleteBtn';
            newBtn.addEventListener('click', () => {
                if (window.pendingSyllabusDelete) {
                    window.pendingSyllabusDelete();
                    window.pendingSyllabusDelete = null;
                }
                this.closeModal();
            });

            document.getElementById('syllabusDeleteDrawer').classList.remove('hidden');
            lockBodyScroll();
        },

        closeModal() {
            document.getElementById('syllabusDeleteDrawer').classList.add('hidden');
            unlockBodyScroll();
            window.pendingSyllabusDelete = null;
        },

        executeDelete(syllabusId) {
            fetch(`/syllabus/delete/${syllabusId}/`, {
                method: 'POST',
                headers: {
                    'X-CSRFToken': getCsrfToken(),
                    'X-Requested-With': 'XMLHttpRequest'
                }
            })
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        showToast(data.message || 'Syllabus deleted', 'success');
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

    // --- Toggle Status ---
    const ToggleManager = {
        toggleStatus(syllabusId) {
            // We'll use the same edit endpoint with just is_active toggle
            fetch(`/syllabus/edit/${syllabusId}/`, {
                method: 'POST',
                headers: {
                    'X-CSRFToken': getCsrfToken(),
                    'X-Requested-With': 'XMLHttpRequest',
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: `is_active=${document.querySelector(`#syllabusTableBody tr[data-id="${syllabusId}"] .toggle-status`).checked ? 'true' : 'false'}`
            })
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        showToast('Status updated', 'success');
                        setTimeout(() => window.location.reload(), 800);
                    } else {
                        showToast('Error: ' + (data.error || 'Could not update status'), 'error');
                    }
                })
                .catch(err => {
                    console.error(err);
                    showToast('Network error', 'error');
                });
        }
    };

    // --- Form Submission ---
    function handleSyllabusSubmit(e) {
        e.preventDefault();
        const form = e.target;
        const submitBtn = form.querySelector('button[type="submit"]');
        const original = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="bi bi-hourglass-split animate-spin"></i> Saving...';

        const formData = new FormData(form);
        const editId = document.getElementById('editSyllabusId').value;
        const url = editId ? `/syllabus/edit/${editId}/` : '/syllabus/add/';

        // Ensure checkbox value is sent
        formData.set('is_active', document.getElementById('drawerIsActive').checked ? 'true' : 'false');

        fetch(url, {
            method: 'POST',
            headers: {
                'X-CSRFToken': getCsrfToken(),
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: formData
        })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    showToast(data.message || 'Syllabus saved', 'success');
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
    }

    // --- Search & Sort (same as pattern) ---
    const SearchManager = { ... }; // same
    const SortManager = { ... };   // same

    // --- Init ---
    function init() {
        document.getElementById('syllabusForm').addEventListener('submit', handleSyllabusSubmit);

        // Search & Sort
        SearchManager.init();
        SortManager.init();

        // Django messages
        document.querySelectorAll('#django-messages .message').forEach(msg => {
            const text = msg.getAttribute('data-message');
            const level = msg.getAttribute('data-level');
            if (text) showToast(text, level === 'success' ? 'success' : (level === 'error' ? 'error' : 'info'));
        });

        // Global events (backdrop, ESC)
        document.addEventListener('click', (e) => {
            if (e.target.closest('#syllabusDrawer .drawer-backdrop')) SyllabusDrawer.closeDrawer();
            if (e.target.closest('#syllabusDeleteDrawer .drawer-backdrop')) SyllabusDelete.closeModal();
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (!document.getElementById('syllabusDeleteDrawer').classList.contains('hidden')) {
                    SyllabusDelete.closeModal();
                } else if (!document.getElementById('syllabusDrawer').classList.contains('hidden')) {
                    SyllabusDrawer.closeDrawer();
                }
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Public API
    window.syllabusApp = {
        openDrawer: (id) => SyllabusDrawer.openDrawer(id),
        closeDrawer: () => SyllabusDrawer.closeDrawer(),
        openDeleteModal: (id, info) => SyllabusDelete.openModal(id, info),
        closeDeleteModal: () => SyllabusDelete.closeModal(),
        toggleStatus: (id) => ToggleManager.toggleStatus(id),
    };

})();