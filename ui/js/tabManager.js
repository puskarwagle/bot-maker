export function showTab(tabName, element) {
    // Hide all tab contents
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.add('hidden'));
    document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('tab-active'));

    // Show selected tab
    document.getElementById(tabName + '-tab').classList.remove('hidden');
    element.classList.add('tab-active');
}

export function initializeTabs() {
    // Add event listeners to all tab elements
    document.querySelectorAll('.tab[data-tab]').forEach(tab => {
        tab.addEventListener('click', (e) => {
            e.preventDefault();
            const tabName = tab.getAttribute('data-tab');
            showTab(tabName, tab);
        });
    });
}
