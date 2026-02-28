// ==========================================
// CHART CONFIGURATIONS
// ==========================================

function updateCharts(transactions) {
    updateSpendingChart(transactions);
    updateTrendChart(transactions);
}

function updateSpendingChart(transactions) {
    const expenses = transactions.filter(t => t.type === 'expense');
    const data = {};
    
    expenses.forEach(t => {
        data[t.category] = (data[t.category] || 0) + parseFloat(t.amount);
    });
    
    const labels = Object.keys(data).map(k => categories.expense[k]?.label || k);
    const values = Object.values(data);
    const colors = Object.keys(data).map(k => categories.expense[k]?.color || '#999');
    
    if (spendingChart) {
        spendingChart.destroy();
    }
    
    const ctx = document.getElementById('spendingChart');
    if (!ctx) return;
    
    spendingChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels,
            datasets: [{
                data: values,
                backgroundColor: colors,
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

function updateTrendChart(transactions) {
    // Group by week
    const weeks = {};
    const now = new Date();
    
    for (let i = 0; i < 4; i++) {
        const weekStart = new Date(now);
        weekStart.setDate(weekStart.getDate() - (i * 7));
        const weekKey = `Week ${4-i}`;
        weeks[weekKey] = 0;
    }
    
    transactions.filter(t => t.type === 'expense').forEach(t => {
        const tDate = new Date(t.date);
        const diffDays = Math.floor((now - tDate) / (1000 * 60 * 60 * 24));
        const weekNum = Math.floor(diffDays / 7);
        
        if (weekNum < 4) {
            const key = `Week ${4-weekNum}`;
            weeks[key] = (weeks[key] || 0) + parseFloat(t.amount);
        }
    });
    
    if (trendChart) {
        trendChart.destroy();
    }
    
    const ctx = document.getElementById('trendChart');
    if (!ctx) return;
    
    trendChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(weeks),
            datasets: [{
                label: 'Spending',
                data: Object.values(weeks),
                backgroundColor: '#4CAF50',
                borderRadius: 5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: value => '₱' + value.toLocaleString()
                    }
                }
            },
            plugins: {
                legend: { display: false }
            }
        }
    });
}

// Reports charts
function generateReport(period) {
    const select = document.getElementById('reportPeriod');
    const selectedPeriod = select ? select.value : 'month';
    
    showNotification(`Generating ${selectedPeriod} report...`, 'info');
    
    // Update report charts
    updateReportCharts(selectedPeriod);
    
    // Update report table
    updateReportTable(selectedPeriod);
}

function updateReportCharts(period) {
    let transactions;
    switch(period) {
        case 'quarter':
            transactions = getTransactionsByPeriod('month').slice(0, 3);
            break;
        case 'year':
            transactions = getTransactionsByPeriod('year');
            break;
        case 'all':
            transactions = getTransactions();
            break;
        default:
            transactions = getTransactionsByPeriod('month');
    }
    
    const income = transactions.filter(t => t.type === 'income').reduce((s, t) => s + parseFloat(t.amount), 0);
    const expenses = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + parseFloat(t.amount), 0);
    
    // Update summary cards
    const avgIncome = document.getElementById('avgIncome');
    const avgExpenses = document.getElementById('avgExpenses');
    const netSavings = document.getElementById('netSavings');
    
    if (avgIncome) avgIncome.textContent = formatPeso(income);
    if (avgExpenses) avgExpenses.textContent = formatPeso(expenses);
    if (netSavings) netSavings.textContent = formatPeso(income - expenses);
    
    // Income vs Expense chart
    if (incomeExpenseChart) incomeExpenseChart.destroy();
    const ctx1 = document.getElementById('incomeExpenseChart');
    if (ctx1) {
        incomeExpenseChart = new Chart(ctx1, {
            type: 'bar',
            data: {
                labels: ['Income', 'Expenses'],
                datasets: [{
                    data: [income, expenses],
                    backgroundColor: ['#10b981', '#ef4444'],
                    borderRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } }
            }
        });
    }
    
    // Category chart
    const catData = {};
    transactions.filter(t => t.type === 'expense').forEach(t => {
        catData[t.category] = (catData[t.category] || 0) + parseFloat(t.amount);
    });
    
    if (categoryChart) categoryChart.destroy();
    const ctx2 = document.getElementById('categoryChart');
    if (ctx2) {
        categoryChart = new Chart(ctx2, {
            type: 'doughnut',
            data: {
                labels: Object.keys(catData).map(k => categories.expense[k]?.label || k),
                datasets: [{
                    data: Object.values(catData),
                    backgroundColor: Object.keys(catData).map(k => categories.expense[k]?.color || '#999')
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false
            }
        });
    }
}

function updateReportTable(period) {
    const tbody = document.getElementById('reportTableBody');
    if (!tbody) return;
    
    const limits = getBudgetLimits();
    let html = '';
    
    Object.entries(limits).forEach(([cat, budget]) => {
        if (budget === 0) return;
        
        const transactions = getTransactionsByPeriod(period === 'all' ? 'year' : period);
        const actual = transactions
            .filter(t => t.type === 'expense' && t.category === cat)
            .reduce((s, t) => s + parseFloat(t.amount), 0);
        
        const diff = budget - actual;
        const status = diff >= 0 ? 
            '<span class="text-green-600"><i class="fas fa-check"></i> Under</span>' :
            '<span class="text-red-600"><i class="fas fa-exclamation"></i> Over</span>';
        
        html += `
            <tr class="border-b">
                <td class="px-4 py-2">${categories.expense[cat]?.icon || ''} ${categories.expense[cat]?.label || cat}</td>
                <td class="px-4 py-2 text-right">${formatPeso(budget)}</td>
                <td class="px-4 py-2 text-right">${formatPeso(actual)}</td>
                <td class="px-4 py-2 text-right ${diff >= 0 ? 'text-green-600' : 'text-red-600'}">${formatPeso(diff)}</td>
                <td class="px-4 py-2 text-center">${status}</td>
            </tr>
        `;
    });
    
    tbody.innerHTML = html || '<tr><td colspan="5" class="text-center py-4 text-gray-500">No data available</td></tr>';
}

function exportReport(format) {
    if (format === 'csv') {
        exportData('csv');
    } else {
        showNotification('PDF export coming soon!', 'info');
    }
}
