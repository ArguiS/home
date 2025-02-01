let db;
let tables = [];
let inputFields = {};
let originalDbFile = null;

const initSQL = async () => {
    const SQL = await initSqlJs({
        locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/${file}`
    });
    window.SQL = SQL;
};

initSQL().then(() => {
    document.getElementById('file-upload').addEventListener('change', handleFileUpload);
}).catch((error) => {
    console.error("failed to load SQL.js:", error);
});

async function handleFileUpload(event) {
    const file = event.target.files[0];
    if (file && file.name.endsWith('.db')) {
        const arrayBuffer = await file.arrayBuffer();
        loadDatabase(arrayBuffer);
        originalDbFile = file; 
    }
}

function loadDatabase(arrayBuffer) {
    try {
        const SQL = window.SQL;
        db = new SQL.Database(new Uint8Array(arrayBuffer));
        tables = fetchTableNames();
        populateTableDropdown(tables);
    } catch (error) {
        console.error("failed to load database:", error);
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
    dropdown.addEventListener('change', (event) => {
        const selectedTable = event.target.value;
        if (selectedTable) {
            updateInputFields(selectedTable);
        } else {
            clearInputFields();
        }
    });
}

function updateInputFields(tableName) {
    clearInputFields();
    const columns = fetchColumnNames(tableName);
    const container = document.getElementById('input-fields-container');
    inputFields = {};
    columns.forEach((column, index) => {
        const label = document.createElement('label');
        label.textContent = column;
        const input = document.createElement('input');
        input.type = 'text';
        input.placeholder = `Enter ${column}`;
        inputFields[column] = input;
        const div = document.createElement('div');
        div.appendChild(label);
        div.appendChild(input);
        container.appendChild(div);
    });
}

function fetchColumnNames(tableName) {
    const result = db.exec(`PRAGMA table_info(${tableName});`);
    const columns = [];
    result[0].values.forEach(row => {
        if (row[5] !== 1) {
            columns.push(row[1]);
        }
    });
    return columns;
}

const insertRow = () => {
    const selectedTable = document.getElementById('table-dropdown').value;
    if (!selectedTable) {
        console.log('no table selected!');
        return;
    }

    const columnNames = Object.keys(inputFields);
    const values = columnNames.map(column => inputFields[column].value || null);

    try {
        const placeholders = columnNames.map(() => '?').join(', ');
        const query = `INSERT INTO ${selectedTable} (${columnNames.join(', ')}) VALUES (${placeholders})`;
        db.run(query, values);
        console.log('row inserted successfully!');
    } catch (error) {
        console.error('error inserting row:', error);
    }
};

const clearInputFields = () => {
    const container = document.getElementById('input-fields-container');
    container.innerHTML = '';
};

const saveChanges = () => {
    if (db && originalDbFile) {
        const binaryData = db.export();
        const blob = new Blob([binaryData], { type: 'application/octet-stream' });
        const originalFileName = originalDbFile.name;
        const newFileName = `updated_${originalFileName}`;
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = newFileName;
        link.click();
    } else {
        console.error("no database loaded or file reference missing.");
    }
};

document.getElementById('insert-btn').addEventListener('click', insertRow);
document.getElementById('save-btn').addEventListener('click', saveChanges);
