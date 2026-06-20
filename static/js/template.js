// template.js
window.templateApp = {
    // ---------- Template CRUD ----------
    openAddDrawer: function() {
        // Fetch the add form via AJAX and show in a drawer/modal
        fetch('/template/add/')
            .then(res => res.text())
            .then(html => {
                // Assuming you have a drawer container with id "drawerContent"
                document.getElementById('drawerContent').innerHTML = html;
                document.getElementById('templateId').value = '';
                document.getElementById('templateForm').reset();
                document.getElementById('isActive').checked = true;
                // Show drawer
                this.openDrawerContainer();
            });
    },

    openDrawer: function(id) {
        fetch(`/template/edit/${id}/`)
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    const t = data.template;
                    // Load the same form via fetch or use a preloaded form
                    fetch('/template/add/')
                        .then(res => res.text())
                        .then(html => {
                            document.getElementById('drawerContent').innerHTML = html;
                            document.getElementById('templateId').value = t.id;
                            document.getElementById('templateCode').value = t.template_code;
                            document.getElementById('templateName').value = t.template_name;
                            document.getElementById('totalMarks').value = t.total_marks;
                            document.getElementById('durationMinutes').value = t.duration_minutes || '';
                            document.getElementById('isActive').checked = t.is_active;
                            this.openDrawerContainer();
                        });
                }
            });
    },

    closeDrawer: function() {
        // Hide drawer
        document.getElementById('drawerOverlay').classList.add('hidden');
        document.getElementById('drawerPanel').classList.remove('translate-x-0');
        document.getElementById('drawerPanel').classList.add('translate-x-full');
    },

    openDrawerContainer: function() {
        document.getElementById('drawerOverlay').classList.remove('hidden');
        document.getElementById('drawerPanel').classList.remove('translate-x-full');
        document.getElementById('drawerPanel').classList.add('translate-x-0');
        // Bind form submit
        document.getElementById('templateForm').onsubmit = function(e) {
            e.preventDefault();
            window.templateApp.saveTemplate();
        };
    },

    saveTemplate: function() {
        const form = document.getElementById('templateForm');
        const formData = new FormData(form);
        const id = document.getElementById('templateId').value;
        const url = id ? `/template/edit/${id}/` : '/template/add/';
        fetch(url, {
            method: 'POST',
            body: formData,
            headers: { 'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value }
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                this.closeDrawer();
                location.reload();
            } else {
                alert(data.error || 'Error saving template');
            }
        });
    },

    toggleActive: function(id) {
        fetch(`/template/toggle-active/${id}/`, {
            method: 'POST',
            headers: { 'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value }
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) location.reload();
        });
    },

    openDeleteModal: function(id, name) {
        document.getElementById('deleteItemName').textContent = name;
        document.getElementById('deleteModal').classList.remove('hidden');
        document.getElementById('confirmDeleteBtn').onclick = function() {
            fetch(`/template/delete/${id}/`, {
                method: 'DELETE',
                headers: { 'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value }
            })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    document.getElementById('deleteModal').classList.add('hidden');
                    location.reload();
                } else {
                    alert(data.error);
                }
            });
        };
    },

    closeDeleteModal: function() {
        document.getElementById('deleteModal').classList.add('hidden');
    },

    // ---------- Section CRUD ----------
    openAddSectionDrawer: function(templateId) {
        fetch(`/template/${templateId}/section/add/`)
            .then(res => res.text())
            .then(html => {
                document.getElementById('drawerContent').innerHTML = html;
                document.getElementById('sectionId').value = '';
                document.getElementById('sectionTemplateId').value = templateId;
                document.getElementById('sectionForm').reset();
                document.getElementById('sectionIsActive').checked = true;
                this.openDrawerContainer();
                document.getElementById('sectionForm').onsubmit = function(e) {
                    e.preventDefault();
                    window.templateApp.saveSection();
                };
            });
    },

    openSectionDrawer: function(id) {
        fetch(`/template/section/edit/${id}/`)
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    const s = data.section;
                    fetch(`/template/${s.template_id}/section/add/`)
                        .then(res => res.text())
                        .then(html => {
                            document.getElementById('drawerContent').innerHTML = html;
                            document.getElementById('sectionId').value = s.id;
                            document.getElementById('sectionTemplateId').value = s.template_id;
                            document.getElementById('sectionName').value = s.section_name;
                            document.getElementById('questionType').value = s.question_type;
                            document.getElementById('noOfQuestions').value = s.no_of_questions;
                            document.getElementById('questionsToAnswer').value = s.questions_to_answer;
                            document.getElementById('marksPerQuestion').value = s.marks_per_question;
                            document.getElementById('internalChoice').checked = s.internal_choice;
                            document.getElementById('sectionIsActive').checked = s.is_active;
                            this.openDrawerContainer();
                            document.getElementById('sectionForm').onsubmit = function(e) {
                                e.preventDefault();
                                window.templateApp.saveSection();
                            };
                        });
                }
            });
    },

    saveSection: function() {
        const form = document.getElementById('sectionForm');
        const formData = new FormData(form);
        const id = document.getElementById('sectionId').value;
        const templateId = document.getElementById('sectionTemplateId').value;
        const url = id ? `/template/section/edit/${id}/` : `/template/${templateId}/section/add/`;
        fetch(url, {
            method: 'POST',
            body: formData,
            headers: { 'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value }
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                this.closeDrawer();
                location.reload();
            } else {
                alert(data.error || 'Error saving section');
            }
        });
    },

    closeSectionDrawer: function() {
        this.closeDrawer();
    },

    deleteSection: function(id, name) {
        if (confirm(`Delete section "${name}"?`)) {
            fetch(`/template/section/delete/${id}/`, {
                method: 'DELETE',
                headers: { 'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value }
            })
            .then(res => res.json())
            .then(data => {
                if (data.success) location.reload();
                else alert(data.error);
            });
        }
    },

    search: function() {
        const q = document.getElementById('searchInput').value;
        window.location.href = `?search=${encodeURIComponent(q)}`;
    }
};