document.addEventListener('DOMContentLoaded', function () {
    // Import jsPDF from the global window object
    const { jsPDF } = window.jspdf;

    // --- Element Selections ---
    const app = document.getElementById('app');
    const cashFlowValueEl = document.getElementById('cash-flow-value');
    const invoiceModal = document.getElementById('invoice-modal');
    
    // --- Data Storage (same as before) ---
    const db = {
        get: (key) => JSON.parse(localStorage.getItem(key) || '[]'),
        set: (key, data) => localStorage.setItem(key, JSON.stringify(data)),
    };

    // --- Screen Navigation (same as before) ---
    const showScreen = (screenId) => { /* ... (no changes) ... */ };
    document.querySelectorAll('.back-button').forEach(btn => btn.addEventListener('click', (e) => showScreen(e.currentTarget.dataset.target)));

    // --- Action Sheet (same as before) ---
    app.querySelector('#fab').addEventListener('click', () => app.querySelector('#action-sheet').classList.add('show'));
    app.querySelector('#action-sheet').addEventListener('click', (e) => {
        if(e.target === e.currentTarget || e.target.id === 'cancel-action') {
            e.currentTarget.classList.remove('show');
        } else if (e.target.dataset.action) {
            e.currentTarget.classList.remove('show');
            const formId = e.target.dataset.action.replace('new-', '') + '-form';
            const form = document.getElementById(formId);
            if(form) form.reset();
            // Handle invoice-specific reset
            if(e.target.dataset.action === 'new-invoice'){
                document.getElementById('line-items').innerHTML = '';
                calculateTotal();
                addLineItem();
                document.getElementById('invoice-date').valueAsDate = new Date();
            }
            showScreen(e.target.dataset.action.replace('new-', '') + '-screen');
        }
    });

    // --- Invoice Creation & Data Saving ---
    const invoiceForm = document.getElementById('invoice-form');
    const lineItemsContainer = document.getElementById('line-items');
    const invoiceTotalEl = document.getElementById('invoice-total');
    
    // Function to add a new line item row to the form
    const addLineItem = () => { /* ... (no changes) ... */ };
    document.getElementById('add-item-btn').addEventListener('click', addLineItem);
    lineItemsContainer.addEventListener('click', (e) => { if (e.target.classList.contains('line-item-delete')) { e.target.parentElement.remove(); calculateTotal(); } });
    lineItemsContainer.addEventListener('input', () => calculateTotal());

    const calculateTotal = () => { /* ... (no changes) ... */ };
    
    invoiceForm.addEventListener('submit', (event) => {
        event.preventDefault();
        const invoices = db.get('invoices');
        
        // **FIXED**: Save line items along with the invoice
        const lineItems = [];
        lineItemsContainer.querySelectorAll('.line-item').forEach(item => {
            const name = item.querySelector('.line-item-name').value;
            const qty = parseFloat(item.querySelector('.line-item-qty').value);
            const price = parseFloat(item.querySelector('.line-item-price').value);
            if (name && qty > 0 && price > 0) {
                lineItems.push({ name, qty, price });
            }
        });

        if(lineItems.length === 0) {
            showToast('Please add at least one valid item.', 'danger');
            return;
        }

        const newInvoice = {
            id: `INV-${Date.now().toString().slice(-4)}`,
            customer: document.getElementById('customer').value,
            date: document.getElementById('invoice-date').value,
            total: parseFloat(invoiceTotalEl.textContent.replace('₹', '')),
            items: lineItems, // Save the items array
            status: Math.random() < 0.5 ? 'Paid' : 'Pending' // Randomize status for demo
        };
        db.set('invoices', [newInvoice, ...invoices]);
        showToast(`✅ Invoice ${newInvoice.id} saved!`);
        updateDashboard();
        showScreen('dashboard-screen');
    });

    // --- Expense & Customer Forms (unchanged) ---
    document.getElementById('expense-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const newExpense = { category: e.target.elements['expense-category'].value, amount: parseFloat(e.target.elements['expense-amount'].value) };
        db.set('expenses', [newExpense, ...db.get('expenses')]);
        showToast('💸 Expense saved!'); updateDashboard(); showScreen('dashboard-screen');
    });
    // ... customer form logic is similar

    // --- Dashboard Rendering ---
    const updateDashboard = () => {
        const invoices = db.get('invoices');
        const expenses = db.get('expenses');
        
        // **NEW**: Dynamic Cash Flow Calculation
        const totalIncome = invoices.filter(inv => inv.status === 'Paid').reduce((sum, inv) => sum + inv.total, 0);
        const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
        cashFlowValueEl.textContent = `₹${(totalIncome - totalExpenses).toFixed(2)}`;

        // **NEW**: Render Dashboard Chart
        const chartContainer = document.getElementById('activity-chart');
        chartContainer.innerHTML = `
            <div class="chart-bar"><div class="bar" style="height: ${Math.min(100, (totalIncome/5000)*100)}%;"></div><div class="label">Income</div></div>
            <div class="chart-bar"><div class="bar expense" style="height: ${Math.min(100, (totalExpenses/5000)*100)}%;"></div><div class="label">Expenses</div></div>`;
        
        // Render Recent Invoices
        renderInvoiceList('recent-invoices-list', invoices.slice(0, 3));
    };

    const renderInvoiceList = (containerId, invoiceList) => {
        const container = document.getElementById(containerId);
        container.innerHTML = '';
        if (invoiceList.length === 0) { container.innerHTML = `<li>No invoices yet.</li>`; return; }
        invoiceList.forEach(inv => {
            const item = document.createElement('li');
            item.className = 'list-item';
            item.dataset.invoiceId = inv.id; // Add data-id for click handling
            item.innerHTML = `<div><strong>${inv.id}</strong><br><small>${inv.customer}</small></div><span class="status ${inv.status.toLowerCase()}">₹${inv.total.toFixed(2)}</span>`;
            container.appendChild(item);
        });
    };
    
    // --- **NEW**: Invoice Modal Logic ---
    app.addEventListener('click', (e) => {
        const listItem = e.target.closest('.list-item');
        if (listItem && listItem.dataset.invoiceId) {
            openInvoiceModal(listItem.dataset.invoiceId);
        }
    });

    const openInvoiceModal = (invoiceId) => {
        const invoice = db.get('invoices').find(inv => inv.id === invoiceId);
        if (!invoice) return;

        // Populate modal
        invoiceModal.querySelector('#modal-invoice-id').textContent = invoice.id;
        invoiceModal.querySelector('#modal-customer-name').textContent = invoice.customer;
        invoiceModal.querySelector('#modal-invoice-date').textContent = new Date(invoice.date).toLocaleDateString('en-IN');
        invoiceModal.querySelector('#modal-total-amount').textContent = `₹${invoice.total.toFixed(2)}`;
        
        // **FIXED**: Display line items
        const itemList = invoiceModal.querySelector('#modal-item-list');
        itemList.innerHTML = '';
        invoice.items.forEach(item => {
            const li = document.createElement('li');
            li.innerHTML = `<span>${item.name} (${item.qty} x ₹${item.price})</span> <span>₹${(item.qty * item.price).toFixed(2)}</span>`;
            itemList.appendChild(li);
        });

        invoiceModal.querySelector('#download-pdf-btn').onclick = () => downloadPDF(invoice);
        invoiceModal.classList.add('show');
    };

    invoiceModal.addEventListener('click', (e) => {
        if (e.target.id === 'modal-close-btn' || e.target === invoiceModal) {
            invoiceModal.classList.remove('show');
        }
    });

    // --- **NEW**: PDF Download Logic ---
    const downloadPDF = (invoice) => {
        const doc = new jsPDF();
        
        doc.setFontSize(22);
        doc.text("Zenith Books", 14, 22);
        doc.setFontSize(16);
        doc.text("Invoice", 14, 32);
        doc.line(14, 35, 196, 35);

        doc.setFontSize(11);
        doc.text(`Invoice ID: ${invoice.id}`, 14, 45);
        doc.text(`Date: ${new Date(invoice.date).toLocaleDateString('en-IN')}`, 14, 52);
        doc.text(`Bill To: ${invoice.customer}`, 14, 59);
        
        const tableColumn = ["Item Description", "Qty", "Price", "Total"];
        const tableRows = [];
        invoice.items.forEach(item => {
            const itemData = [
                item.name,
                item.qty,
                `Rs. ${item.price.toFixed(2)}`,
                `Rs. ${(item.qty * item.price).toFixed(2)}`
            ];
            tableRows.push(itemData);
        });

        doc.autoTable(tableColumn, tableRows, { startY: 70 });
        
        const finalY = doc.lastAutoTable.finalY;
        doc.setFontSize(14);
        doc.text(`Total Amount: Rs. ${invoice.total.toFixed(2)}`, 140, finalY + 15);
        
        doc.save(`Invoice-${invoice.id}.pdf`);
    };

    // --- Toast & Initial Load ---
    const showToast = (message, type = 'success') => { /* ... (no changes) ... */ };
    updateDashboard(); // Initial load of data
    
    // (Helper functions like showScreen are defined above but hidden for brevity)
    // Re-declaring for clarity
    function showScreen(screenId) {
        const activeScreen = document.querySelector('.screen.active');
        if (activeScreen) activeScreen.classList.remove('active');
        document.getElementById(screenId).classList.add('active');
    }
});
