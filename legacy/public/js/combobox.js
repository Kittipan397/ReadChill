/**
 * Custom Combobox / Searchable Dropdown Logic
 */

export class CustomCombobox {
    constructor(selectElement, options = {}) {
        this.select = selectElement;
        this.options = options; // e.g. { showImage: true, placeholder: "Search..." }
        this.items = [];
        this.isOpen = false;
        
        this.init();
    }

    init() {
        // Hide original select
        this.select.style.display = 'none';

        // Extract options from select
        this.extractOptions();

        // Build DOM
        this.wrapper = document.createElement('div');
        this.wrapper.className = 'custom-combobox';

        this.inputWrapper = document.createElement('div');
        this.inputWrapper.className = 'combobox-input-wrapper';

        this.input = document.createElement('input');
        this.input.type = 'text';
        this.input.className = 'combobox-input';
        this.input.placeholder = this.options.placeholder || 'ค้นหา...';

        const searchIcon = document.createElement('ion-icon');
        searchIcon.setAttribute('name', 'search-outline');
        searchIcon.className = 'combobox-icon';

        this.dropdown = document.createElement('div');
        this.dropdown.className = 'combobox-dropdown';

        this.inputWrapper.appendChild(searchIcon);
        this.inputWrapper.appendChild(this.input);
        this.wrapper.appendChild(this.inputWrapper);
        this.wrapper.appendChild(this.dropdown);

        // Insert into DOM
        this.select.parentNode.insertBefore(this.wrapper, this.select.nextSibling);

        // Event Listeners
        this.input.addEventListener('focus', () => {
            this.input.value = ''; // clear on focus to show all
            this.open();
        });
        
        this.input.addEventListener('input', (e) => this.filter(e.target.value));
        
        // Close on click outside
        document.addEventListener('click', (e) => {
            if (!this.wrapper.contains(e.target)) {
                this.close();
            }
        });

        // Setup initial text if selected
        this.updateSelectedText();
    }

    extractOptions() {
        this.items = [];
        Array.from(this.select.options).forEach(opt => {
            if (opt.value) { // Skip empty placeholder
                this.items.push({
                    value: opt.value,
                    text: opt.text,
                    image: opt.getAttribute('data-image') || null,
                    subtitle: opt.getAttribute('data-subtitle') || null
                });
            }
        });
    }

    updateOptions(newSelect) {
        this.extractOptions();
    }

    renderItems(filterText = '') {
        this.dropdown.innerHTML = '';
        const lowerFilter = filterText.toLowerCase();
        let matchCount = 0;

        this.items.forEach(item => {
            if (item.text.toLowerCase().includes(lowerFilter) || (item.subtitle && item.subtitle.toLowerCase().includes(lowerFilter))) {
                matchCount++;
                const div = document.createElement('div');
                div.className = 'combobox-item';
                if (this.select.value === item.value) {
                    div.classList.add('selected');
                }

                let html = '';
                if (item.image) {
                    html += `<img src="${item.image}" class="combobox-item-img" onerror="this.src='images/placeholder.jpg'">`;
                }
                
                html += `<div class="combobox-item-text">
                            <span class="combobox-item-title">${item.text}</span>
                            ${item.subtitle ? `<span class="combobox-item-subtitle">${item.subtitle}</span>` : ''}
                         </div>`;
                         
                html += `<ion-icon name="arrow-forward-outline" class="combobox-item-action"></ion-icon>`;

                div.innerHTML = html;
                div.addEventListener('click', (e) => {
                    e.stopPropagation(); // prevent document click
                    this.select.value = item.value;
                    this.updateSelectedText();
                    this.close();
                    // Trigger change event on original select
                    this.select.dispatchEvent(new Event('change', { bubbles: true }));
                });

                this.dropdown.appendChild(div);
            }
        });

        if (matchCount === 0) {
            this.dropdown.innerHTML = '<div class="combobox-empty">ไม่พบข้อมูล</div>';
        }
    }

    updateSelectedText() {
        const selectedOpt = this.select.options[this.select.selectedIndex];
        if (selectedOpt && selectedOpt.value) {
            this.input.value = selectedOpt.text;
        } else {
            this.input.value = '';
        }
    }

    open() {
        this.extractOptions(); // Always fresh options
        this.renderItems(this.input.value);
        this.dropdown.classList.add('active');
        this.isOpen = true;
    }

    close() {
        this.dropdown.classList.remove('active');
        this.isOpen = false;
        this.updateSelectedText();
    }

    filter(text) {
        if (!this.isOpen) this.dropdown.classList.add('active');
        this.isOpen = true;
        this.renderItems(text);
    }
}
