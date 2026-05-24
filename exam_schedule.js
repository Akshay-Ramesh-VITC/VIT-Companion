let is_venue = (i) => {
    i++;
    let row = document.getElementsByTagName("tbody")[0].rows;
    let empty_venue_count = 0;
    while (row[i] && row[i].children[0].className !== "panelHead-secondary") {
        if (row[i].children[11] && row[i].children[11].innerText == "-") {
            empty_venue_count++;
        }
        i++;
        if (i == row.length) {
            break;
        }
    }
    return !(empty_venue_count > 2);
};

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

let exam_schedule_sync = () => {
    let row = document.getElementsByTagName("tbody")[0].rows;
    for (let i = 0; i < row.length; i++) {
        try {
            if (row[i].children[0].className === "panelHead-secondary" && is_venue(i)) {
                let headerCell = row[i].children[0];
                // avoid adding duplicate buttons
                if (headerCell.querySelector && headerCell.querySelector('.copy-schedule-btn')) {
                    continue;
                }
                let exam_type = headerCell.innerText || "Exam";
                let copy_button = document.createElement("button");
                copy_button.innerText = `Copy ${exam_type} schedule to clipboard`;
                copy_button.id = `copy-${i}`;
                copy_button.className = "btn btn-secondary copy-schedule-btn";
                copy_button.onclick = () => copy_section(i);
                copy_button.style.marginLeft = "1%";
                headerCell.appendChild(copy_button);
            }
        } catch (e) {
            // ignore rows that don't match expected structure
        }
    }

    let get_details = (i) => {
        i = parseInt(i);
        i++;
        let row_count = document.getElementsByTagName("tbody")[0].rows.length;
        let temp_row = document.getElementsByTagName("tbody")[0].rows;
        let exam = {
            course_code: [],
            course_title: [],
            exam_date: [],
            exam_time: [],
            venue: [],
            seat_location: []
        };
        while (temp_row[i] && temp_row[i].children[0].className !== "panelHead-secondary") {
            exam.course_code.push((temp_row[i].children[1] && temp_row[i].children[1].innerText) || "");
            exam.course_title.push((temp_row[i].children[2] && temp_row[i].children[2].innerText) || "");
            exam.exam_date.push((temp_row[i].children[6] && temp_row[i].children[6].innerText) || "");
            exam.exam_time.push((temp_row[i].children[9] && temp_row[i].children[9].innerText) || "");
            exam.venue.push((temp_row[i].children[10] && temp_row[i].children[10].innerText) || "");
            exam.seat_location.push((temp_row[i].children[11] && temp_row[i].children[11].innerText) || "");
            i++;
            if (i == row_count) {
                break;
            }
        }
        return exam;
    };

    let format_markdown_table = (details) => {
        let lines = [];
        lines.push("| Course Code | Course Title | Date | Time | Venue | Seat Location |");
        lines.push("|---|---|---|---|---|---|");
        for (let j = 0; j < details.course_code.length; j++) {
            let cols = [details.course_code[j], details.course_title[j], details.exam_date[j], details.exam_time[j], details.venue[j], details.seat_location[j]];
            // escape pipe characters
            cols = cols.map(c => (c || "").replace(/\|/g, '\\|'));
            lines.push(`| ${cols.join(' | ')} |`);
        }
        return lines.join('\n');
    };

    let copyToClipboard = async (text) => {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            return navigator.clipboard.writeText(text);
        }
        // fallback
        return new Promise((resolve, reject) => {
            try {
                const ta = document.createElement('textarea');
                ta.value = text;
                ta.style.position = 'fixed';
                ta.style.left = '-9999px';
                document.body.appendChild(ta);
                ta.focus();
                ta.select();
                const ok = document.execCommand('copy');
                document.body.removeChild(ta);
                if (ok) resolve(); else reject(new Error('copy failed'));
            } catch (e) {
                reject(e);
            }
        });
    };

    let copy_section = async (i) => {
        try {
            let details = get_details(i);
            if (!details || details.course_code.length === 0) {
                alert('No exam rows found to copy.');
                return;
            }
            let md = format_markdown_table(details);
            await copyToClipboard(md);
            alert('Exam schedule copied to clipboard (Markdown table).');
        } catch (err) {
            alert('Failed to copy exam schedule: ' + (err && err.message ? err.message : err));
        }
    };
};

chrome.runtime.onMessage.addListener((request) => {
    if (request.message === "exam_schedule") {
        try {
            exam_schedule_sync();
        } catch (error) {
            // console.log(error);
        }
    }
});

if (/exam|schedule|ExamSchedule/i.test(document.URL)) {
    const ensure_init = (attempts = 0) => {
        try {
            const tb = document.getElementsByTagName('tbody')[0];
            if (tb && tb.rows && tb.rows.length > 0) {
                exam_schedule_sync();
                return;
            }
        } catch (e) {
            // ignore
        }
        if (attempts < 10) {
            setTimeout(() => ensure_init(attempts + 1), 500);
        }
    };

    // Debounced initializer used by MutationObserver
    const debouncedEnsure = (() => {
        let t = null;
        return () => {
            if (t) clearTimeout(t);
            t = setTimeout(() => ensure_init(), 200);
        };
    })();

    // Observe DOM changes and run initializer when table/rows are added
    try {
        const observer = new MutationObserver((mutations) => {
            for (const m of mutations) {
                if (m.addedNodes && m.addedNodes.length) {
                    // quick check for tbody or rows in added nodes
                    for (const n of m.addedNodes) {
                        if (n.nodeType === 1 && (n.tagName.toLowerCase() === 'tbody' || n.querySelector && n.querySelector('tbody'))) {
                            debouncedEnsure();
                            return;
                        }
                        if (n.nodeType === 1 && n.classList && n.classList.contains('panelHead-secondary')) {
                            debouncedEnsure();
                            return;
                        }
                    }
                }
            }
        });
        observer.observe(document.documentElement || document.body, { childList: true, subtree: true });
    } catch (e) {
        // ignore if MutationObserver not available
    }

    // Add a small debug overlay so you can see this script is running in the frontend
    const create_debug_overlay = () => {
        try {
            if (document.getElementById('vit-exam-debug-overlay')) return;
            const wrap = document.createElement('div');
            wrap.id = 'vit-exam-debug-overlay';
            wrap.style.position = 'fixed';
            wrap.style.right = '12px';
            wrap.style.top = '12px';
            wrap.style.zIndex = 2147483647;
            wrap.style.background = 'rgba(0,0,0,0.75)';
            wrap.style.color = 'white';
            wrap.style.padding = '6px';
            wrap.style.borderRadius = '6px';
            wrap.style.fontSize = '12px';
            wrap.style.fontFamily = 'sans-serif';
            wrap.style.boxShadow = '0 2px 8px rgba(0,0,0,0.5)';

            const title = document.createElement('div');
            title.innerText = 'VIT Exam Script';
            title.style.fontWeight = '700';
            title.style.marginBottom = '6px';
            wrap.appendChild(title);

            const status = document.createElement('div');
            status.id = 'vit-exam-debug-status';
            status.innerText = 'status: idle';
            status.style.marginBottom = '6px';
            wrap.appendChild(status);

            const runBtn = document.createElement('button');
            runBtn.innerText = 'Run inject';
            runBtn.style.display = 'block';
            runBtn.style.width = '100%';
            runBtn.style.padding = '6px';
            runBtn.style.cursor = 'pointer';
            runBtn.onclick = () => {
                try {
                    document.getElementById('vit-exam-debug-status').innerText = 'status: running';
                    console.log('[VIT] manual run inject');
                    exam_schedule_sync();
                    setTimeout(() => {
                        const tb = document.getElementsByTagName('tbody')[0];
                        const count = tb && tb.rows ? tb.rows.length : 0;
                        document.getElementById('vit-exam-debug-status').innerText = 'rows: ' + count;
                    }, 400);
                } catch (e) {
                    console.error('[VIT] run inject failed', e);
                }
            };
            wrap.appendChild(runBtn);

            const hide = document.createElement('a');
            hide.href = '#';
            hide.innerText = 'hide';
            hide.style.display = 'block';
            hide.style.marginTop = '6px';
            hide.style.color = '#ddd';
            hide.onclick = (ev) => { ev.preventDefault(); wrap.style.display = 'none'; };
            wrap.appendChild(hide);

            document.body.appendChild(wrap);
        } catch (e) {
            // ignore overlay errors
        }
    };

    window.addEventListener("load", () => {
        try { create_debug_overlay(); } catch(e){}
        ensure_init();
    });
    // In case script is injected after load
    try { create_debug_overlay(); } catch(e){}
    ensure_init();
}