document.addEventListener('DOMContentLoaded', function() {

    // ------------------------------
    // 1. Client-side Table Sorting
    // ------------------------------

    let currentSort = { col: null, dir: 'asc' };

    function getCellValue(row, colIndex) {
        
        const cells = row.cells;
        if (!cells[colIndex]) return '';
        if (colIndex === 0) return cells[0]?.innerText?.trim() || '';
        if (colIndex === 4) { 
            const nameDiv = cells[4]?.querySelector('.name-text');
            return nameDiv ? nameDiv.innerText.trim() : cells[4]?.innerText?.trim() || '';
        }
        if (colIndex === 9 || colIndex === 10) {
            let dateStr = cells[colIndex]?.innerText?.replace(/[^0-9-]/g, '') || '';
            if (dateStr.match(/\d{4}-\d{1,2}-\d{1,2}/)) return dateStr;
            return dateStr || '';
        }
        let raw = cells[colIndex]?.innerText?.trim() || '';
        if (colIndex === 0 || colIndex === 11) { 
            let num = parseFloat(raw.replace(/[^0-9.-]/g, ''));
            return isNaN(num) ? raw : num;
        }
        return raw;
    }

    function sortTableByColumn(colIndex, thElement) {

        const tbody = document.getElementById('staffTableBody');
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

    document.querySelectorAll('.sortable-th').forEach(th => {
        th.addEventListener('click', (e) => {
            const colIdx = parseInt(th.getAttribute('data-col-index'), 10);
            if (!isNaN(colIdx)) sortTableByColumn(colIdx, th);
        });
    });

    // -------------------------------------
    // 2. File Upload – Enable Submit Button
    // -------------------------------------

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

    // -------------------------------------
    // 3. Dynamic Dropdown Cascading (AJAX)
    // -------------------------------------

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
});