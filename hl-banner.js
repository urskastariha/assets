let dropdownEl;
const lastDropdownOptions = {};

window.addEventListener('message', (event) => {
    console.log('Parent received message:', event.data);
    if (event.data?.type === 'customDropdownOpen') {
        const iframe = document.querySelector('iframe');
        const iframeRect = iframe ? iframe.getBoundingClientRect() : { top: 0, left: 0 };
        const { top, left, width } = event.data.coords;
        const options = event.data.options || [];
        const elementId = event.data.elementId;

        if (dropdownEl) dropdownEl.remove();

        dropdownEl = document.createElement('div');
        dropdownEl.className = 'custom-dropdown';
        dropdownEl.style.top = `${iframeRect.top + top + window.scrollY}px`;
        dropdownEl.style.left = `${iframeRect.left + left + window.scrollX}px`;
        dropdownEl.style.width = `${width}px`;

        lastDropdownOptions[elementId] = options;

        dropdownEl.innerHTML = options.map(opt => {
            let label;
            if (elementId === 'dropdown-location') {
                label = opt.city;
            } else if (elementId === 'dropdown-reasons') {
                // For reasons, use name
                label = opt.name || opt.id;
            } else {
                // Fallback for any other dropdowns
                label = opt.name || opt.location_name || opt.address || opt.city || opt.id;
            }
            return `<div class="dropdown-option" data-id="${opt.id}"><span>${label}</span></div>`;
        }).join('');

        dropdownEl.addEventListener('click', (e) => {
            let target = e.target;
            // If click on child span/img, get parent div
            while (target && !target.classList.contains('dropdown-option')) {
                target = target.parentElement;
            }
            if (target && target.classList.contains('dropdown-option')) {
                const selectedId = target.getAttribute('data-id');
                event.source.postMessage({
                    type: 'customDropdownSelected',
                    value: selectedId,
                    elementId
                }, '*');
                dropdownEl.remove();
            }
        });

        document.body.appendChild(dropdownEl);
    }
    if (event.data?.type === 'customCalendarDropdownOpen') {
        renderLamCalendar({
            weekStart: event.data.weekStart,
            slots: event.data.calendarData,
            onSlotSelect: (slot) => {
                event.source.postMessage({
                    type: 'customDropdownSelected',
                    value: slot,
                    elementId: event.data.elementId
                }, '*');
                if (window.lamCalendarEl) window.lamCalendarEl.remove();
            },
            onPrev: () => {
                event.source.postMessage({
                    type: 'requestWeek',
                    weekStart: new Date(new Date(event.data.weekStart).setDate(new Date(event.data.weekStart).getDate() - 7)).toISOString()
                }, '*');
            },
            onNext: () => {
                event.source.postMessage({
                    type: 'requestWeek',
                    weekStart: new Date(new Date(event.data.weekStart).setDate(new Date(event.data.weekStart).getDate() + 7)).toISOString()
                }, '*');
            }
        });
    }
    if (event.data?.type === 'openCalendar') {
        // Remove all calendar modals/loaders
        document.querySelectorAll('.custom-dropdown.calendar-dropdown').forEach(el => el.remove());
        if (dropdownEl) dropdownEl.remove(); // Close any open dropdown
        if (event.data.showLoader) {
            console.log('Parent: Showing calendar loader');
            showLamCalendarLoader();
        }
    }
    if (event.data?.type === 'updateCalendar') {
        console.log('Parent: Rendering calendar with slots:', event.data.slots);
        if (window.lamCalendarEl) window.lamCalendarEl.remove();
        renderLamCalendar({
            weekStart: event.data.weekStart,
            slots: event.data.slots,
            onSlotSelect: (slot) => {
                window.frames[0].postMessage({
                    type: 'selectSlot',
                    slot
                }, '*');
                if (window.lamCalendarEl) window.lamCalendarEl.remove();
            },
            onPrev: () => {
                showLamCalendarLoader();
                window.frames[0].postMessage({
                    type: 'requestWeek',
                    weekStart: new Date(new Date(event.data.weekStart).setDate(new Date(event.data.weekStart).getDate() - 7)).toISOString()
                }, '*');
            },
            onNext: () => {
                // Show loader before requesting next week
                showLamCalendarLoader();
                window.frames[0].postMessage({
                    type: 'requestWeek',
                    weekStart: new Date(new Date(event.data.weekStart).setDate(new Date(event.data.weekStart).getDate() + 7)).toISOString()
                }, '*');
            }
        });
    }
    if (event.data?.type === 'closeCalendar') {
        if (window.lamCalendarEl) window.lamCalendarEl.remove();
    }
    if (event.data?.type === 'iframeClick') {
        if (window.lamCalendarEl) window.lamCalendarEl.remove();
    }
});

document.addEventListener('click', (e) => {
    if (dropdownEl && !dropdownEl.contains(e.target)) {
        dropdownEl.remove();
    }
});

function getLocalDateString(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const dayNum = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${dayNum}`;
}

function renderLamCalendar({ weekStart, slots, onSlotSelect, onPrev, onNext }) {
    document.querySelectorAll('.custom-dropdown.calendar-dropdown').forEach(el => el.remove());
    console.log('Parent: renderLamCalendar called', { weekStart, slots });
    if (window.lamCalendarEl) window.lamCalendarEl.remove();
    const calendarEl = document.createElement('div');
    calendarEl.className = 'custom-dropdown calendar-dropdown';
    const iframe = document.querySelector('iframe');
    if (iframe) {
        const iframeRect = iframe.getBoundingClientRect();
        calendarEl.style.position = 'absolute';
        calendarEl.style.top = (window.scrollY + iframeRect.bottom + 10) + 'px';
        calendarEl.style.left = (window.scrollX + iframeRect.left) + 'px';
        calendarEl.style.width = iframe.offsetWidth + 'px';
    }
    const header = document.createElement('div');
    header.className = 'dateHeader';
    const prevBtn = document.createElement('button');
    prevBtn.className = 'scroll-btn';
    prevBtn.innerHTML = '<span>&lt; Prejšnji teden</span>';
    prevBtn.onclick = onPrev;
    const nextBtn = document.createElement('button');
    nextBtn.className = 'scroll-btn';
    nextBtn.innerHTML = '<span>Naslednji teden &gt;</span>';
    nextBtn.onclick = onNext;
    const monthYear = document.createElement('span');
    monthYear.id = 'month-year';
    const weekStartDate = new Date(weekStart);
    const monthName = weekStartDate.toLocaleString('sl', { month: 'long' });
    const year = weekStartDate.getFullYear();
    monthYear.textContent = `${monthName.charAt(0).toUpperCase() + monthName.slice(1)} ${year}`;
    header.appendChild(prevBtn);
    header.appendChild(monthYear);
    header.appendChild(nextBtn);
    calendarEl.appendChild(header);
    const grid = document.createElement('div');
    grid.className = 'scrollWrapper';
    const dayLabels = ['Pon', 'Tor', 'Sre', 'Čet', 'Pet'];
    for (let i = 0; i < 5; i++) {
        const day = new Date(weekStartDate);
        day.setDate(weekStartDate.getDate() + i);
        const dayStr = getLocalDateString(day);
        const col = document.createElement('div');
        col.className = 'dayColumn';
        const dayLabel = document.createElement('span');
        dayLabel.className = 'calendar-day-label';
        dayLabel.textContent = dayLabels[i];
        col.appendChild(dayLabel);
        const dateLabel = document.createElement('span');
        dateLabel.id = `${dayLabels[i].toLowerCase()}-date`;
        dateLabel.className = 'calendar-date-label';
        dateLabel.textContent = day.getDate();
        col.appendChild(dateLabel);
        const timeCol = document.createElement('div');
        timeCol.className = 'timeColumn';
        const slotsForDay = (slots[dayStr] || []);
        if (slotsForDay.length > 0) {
            slotsForDay.forEach(slot => {
                if (!slot || !slot.start_datetime) return;
                const slotBtn = document.createElement('a');
                slotBtn.className = 'slot-btn';
                slotBtn.textContent = new Date(slot.start_datetime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
                slotBtn.onclick = (e) => { e.preventDefault(); onSlotSelect(slot); };
                timeCol.appendChild(slotBtn);
            });
        } else {
            const noSlot = document.createElement('div');
            noSlot.className = 'no-slots';
            noSlot.textContent = 'Ni terminov';
            col.appendChild(noSlot);
        }
        col.appendChild(timeCol);
        grid.appendChild(col);
        const sep = document.createElement('div');
        sep.className = 'separator';
        grid.appendChild(sep);
    }
    calendarEl.appendChild(grid);
    document.body.appendChild(calendarEl);
    window.lamCalendarEl = calendarEl;

    // Close calendar dropdown if user clicks anywhere else
    setTimeout(() => {
        function closeCalendarDropdown(e) {
            if (window.lamCalendarEl && !window.lamCalendarEl.contains(e.target)) {
                window.lamCalendarEl.remove();
                document.removeEventListener('mousedown', closeCalendarDropdown);
            }
        }
        document.addEventListener('mousedown', closeCalendarDropdown);
    }, 0);
}

let lamCalendarLoaderEl = null;
function showLamCalendarLoader() {
    // Remove all calendar modals/loaders before rendering loader
    document.querySelectorAll('.custom-dropdown.calendar-dropdown').forEach(el => el.remove());
    // Create calendar dropdown container
    const calendarEl = document.createElement('div');
    calendarEl.className = 'custom-dropdown calendar-dropdown';
    const iframe = document.querySelector('iframe');
    if (iframe) {
        const iframeRect = iframe.getBoundingClientRect();
        calendarEl.style.position = 'absolute';
        calendarEl.style.top = (window.scrollY + iframeRect.bottom + 10) + 'px';
        calendarEl.style.left = (window.scrollX + iframeRect.left) + 'px';
        calendarEl.style.width = iframe.offsetWidth + 'px';
        calendarEl.style.height = iframe.offsetHeight + 100 + 'px'; // Ensure height matches calendar
    }
    // Add loader inside calendar dropdown
    const loaderContainer = document.createElement('div');
    loaderContainer.className = 'loader-container';
    loaderContainer.innerHTML = '<div class="loader"></div>';
    calendarEl.appendChild(loaderContainer);
    document.body.appendChild(calendarEl);
    window.lamCalendarEl = calendarEl;
}