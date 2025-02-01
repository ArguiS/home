let db;
let tables = [];
let originalDbFile = null;

const initSQL = async () => {
    const SQL = await initSqlJs({
        locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/${file}`
    });
    window.SQL = SQL;
};

const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (file && file.name.endsWith('.db')) {
        const arrayBuffer = await file.arrayBuffer();
        loadDatabase(arrayBuffer);
        originalDbFile = file;
    }
};

function loadDatabase(arrayBuffer) {
    try {
        const SQL = window.SQL;
        db = new SQL.Database(new Uint8Array(arrayBuffer));
        tables = fetchTableNames();
        populateTableDropdown(tables);
    } catch (error) {
        console.error("failed to load db:", error);
    }
}

function fetchTableNames() {
    const result = db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name != 'sqlite_sequence' AND name != 'table_name';");
    if (result.length > 0) {
        return result[0].values.map(row => row[0]);
    }
    return [];
}

function populateTableDropdown(tables) {
    const dropdown = document.getElementById('table-dropdown');
    dropdown.innerHTML = '';
    const emptyOption = document.createElement('option');
    emptyOption.value = '';
    emptyOption.textContent = 'select a table';
    dropdown.appendChild(emptyOption);
    tables.forEach(table => {
        const option = document.createElement('option');
        option.value = table;
        option.textContent = table;
        dropdown.appendChild(option);
    });
    dropdown.disabled = false;
    dropdown.addEventListener('change', (event) => {
        const selectedTable = event.target.value;
        if (selectedTable) {
            displayTableData(selectedTable);
        }
    });
}

function displayTableData(tableName) {
    const container = document.getElementById('table-data');
    container.innerHTML = '';
    const result = db.exec(`SELECT * FROM ${tableName}`);
    if (result.length > 0) {
        const columns = result[0].columns;
        const rows = result[0].values;
        const table = document.createElement('table');
        const thead = document.createElement('thead');
        const tbody = document.createElement('tbody');
        const headerRow = document.createElement('tr');
        columns.forEach(col => {
            const th = document.createElement('th');
            th.textContent = col;
            headerRow.appendChild(th);
        });
        thead.appendChild(headerRow);
        rows.forEach(row => {
            const tr = document.createElement('tr');
            row.forEach(value => {
                const td = document.createElement('td');
                td.textContent = value;
                tr.appendChild(td);
            });
            tbody.appendChild(tr);
        });
        table.appendChild(thead);
        table.appendChild(tbody);
        container.appendChild(table);
    } else {
        container.innerHTML = 'no data found in this table.';
    }
}

initSQL().then(() => {
    document.getElementById('file-upload').addEventListener('change', handleFileUpload);
}).catch((error) => {
    console.error("failed to load SQL.js:", error);
});
