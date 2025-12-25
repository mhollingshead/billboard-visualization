const renderDate = () => {
    const currentDate = state.weeklyCharts[timelineEl.value];
    const date = new Date(currentDate.date);
    dateEl.innerText = `${MONTH_NAMES[date.getMonth()].slice(0, 3)} ${date.getDate()}, ${date.getFullYear()}`.replaceAll('0', 'O');
};

const renderLabels = () => {
    const years = {};
    state.weeklyCharts.forEach((week, i) => {
        const year = new Date(week.date).getFullYear();
        if (year % 10 === 0 && !years[year]) {
            years[year] = true;
            const label = document.createElement('div');
            label.className = 'label';
            label.innerText = "'" + `${year}`.slice(2, 4);
            label.innerText = year;
            label.style.left = `${i / state.weeklyCharts.length * 100}%`;
            document.querySelector('#date-labels').appendChild(label);
        } else if (year % 5 === 0 && !years[year]) {
            years[year] = true;
            const line = document.createElement('div');
            line.className = 'line';
            line.style.left = `${i / state.weeklyCharts.length * 100}%`;
            document.querySelector('#date-labels').appendChild(line);
        }
    });
}

const renderRow = (id, row) => {
    const rowEl = document.createElement('div');
    rowEl.className = 'row';
    rowEl.setAttribute('data-month', state.currentWeek);
    rowEl.setAttribute('data-position', row.this_week);

    rowEl.innerHTML = `
        <div class="row__cell">
            <div class="number text-lg" data-stat="this-month">${row.this_week}</div>
        </div>
        <div class="row__cell row__cell--song">
            <div class="title text-xl">${row.title}</div>
            <div class="artist text-md">${row.artist}</div>
        </div>
        <div class="row__cell">
            <div class="number text-lg" data-stat="last-month">${row.last_week || '-'}</div>
        </div>
        <div class="row__cell">
            <div class="number text-lg" data-stat="months-on-chart">${row.weeks_on_chart}</div>
        </div>
    `;

    rowEl.style.top = `calc((5.25em - 2px) * ${Math.min(row.this_week - 1, MAX_ROWS)})`;
    rowEl.style.zIndex = 100 - row.this_week;

    chartEl.appendChild(rowEl);
    state.rowEls[id] = rowEl;
};

const updateRow = (id, row) => {
    const rowEl = state.rowEls[id];

    rowEl.setAttribute('data-month', state.currentWeek);
    rowEl.setAttribute('data-position', row.this_week);

    rowEl.style.top = `calc((5.25em - 2px) * ${Math.min(row.this_week - 1, MAX_ROWS)})`;
    rowEl.style.zIndex = 100 - row.this_week;

    animateNumber(rowEl.querySelector('[data-stat="this-month"]'), row.this_week);
    animateNumber(rowEl.querySelector('[data-stat="months-on-chart"]'), row.weeks_on_chart);
    if (row.last_week) {
        animateNumber(rowEl.querySelector('[data-stat="last-month"]'), row.last_week);
    } else {
        rowEl.querySelector('[data-stat="last-month"]').innerText = '-';
    }
}

const renderChart = () => {
    const rows = state.weeklyCharts[state.currentWeek].data;

    rows.forEach(row => {
        const id = songKey(row.title, row.artist);

        if (state.rowEls[id]) {
            updateRow(id, row);
        } else {
            renderRow(id, row);
        }
    });

    Object.entries(state.rowEls).forEach(([id, el]) => {
        const rowMonth = +el.getAttribute('data-month');

        if (rowMonth !== state.currentWeek) {
            el.style.animation = "none";
            el.style.opacity = 0;

            setTimeout(() => {
                if (chartEl.contains(el)) chartEl.removeChild(el);
                delete state.rowEls[id];
            }, 1500);
        }
    });
};

const updateAudio = () => {
    const currentSong = state.weeklyCharts[state.currentWeek].data[0];
    const id = songKey(currentSong.title, currentSong.artist);
    const previewUrl = state.songPreviews[id];

    if (state.currentSongId !== id) {
        state.currentSongId = id;
        crossfadeTo(previewUrl);
    }
};

const render = () => {
    if (!state.playing) return;

    timelineEl.value = state.currentWeek;

    renderDate();
    renderChart();
    updateAudio();

    state.currentWeek++;
};

const seekWeek = (dir) => {
    if (state.currentWeek + dir <= 0 || state.currentWeek + dir >= state.weeklyCharts.length) return;

    if (state.playing) {
        playPause();
    }

    state.currentWeek = state.currentWeek + dir;

    playPause();
};

const init = async () => {
    await initAudioDecks();

    document.body.setAttribute('data-state', 'playing');
    state.playing = true;

    render();

    state.intervalId = setInterval(render, MONTH_DURATION);
};

const playPause = () => {
    if (state.playing) {
        document.body.setAttribute('data-state', 'paused');
        state.playing = false;

        clearInterval(state.intervalId);
        state.intervalId = null;
        
        state.currentTrack.audio.pause();
        state.currentTrack.audio.src = "";
        state.currentTrack = null;
        state.currentSongId = '';

        state.currentWeek--;
    } else {
        init();
    }
};

(async() => {
    const weeklyCharts = await fetch('./data/monthly-charts.json').then(res => res.json());
    const songPreviews = await fetch('./data/song-previews.json').then(res => res.json());

    state.weeklyCharts = weeklyCharts;
    state.songPreviews = songPreviews;

    timelineEl.max = weeklyCharts.length - 1;

    renderLabels();

    startEl.addEventListener('click', playPause);

    prevEl.addEventListener('click', () => seekWeek(-1));
    nextEl.addEventListener('click', () => seekWeek(1));

    timelineEl.addEventListener('input', renderDate);

    timelineEl.addEventListener('change', e => {
        const week = Number(e.target.value);
    
        if (state.playing) {
            playPause();
        }
    
        state.currentWeek = week;
    
        playPause();
    });
})();
