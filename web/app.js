// app.js - AutoPitcher Rules Editor

let rulesState = [];
let activeRuleIndex = null;

// DOM Elements
const btnSave = document.getElementById('btn-save');
const btnAddRule = document.getElementById('btn-add-rule');
const rulesList = document.getElementById('rules-list');
const noSelectionMsg = document.getElementById('no-selection-msg');
const editorFormContainer = document.getElementById('editor-form-container');
const toast = document.getElementById('toast');

// Inputs
const phCheckboxes = document.querySelectorAll('.ph-checkbox');
const inputRuleName = document.getElementById('rule-name');
const condAntSilencio = document.getElementById('cond-ant-silencio');
const condProxSilencio = document.getElementById('cond-prox-silencio');
const condLengthMin = document.getElementById('cond-length-min');
const valLengthMin = document.getElementById('val-length-min');
const condDeltaAntMin = document.getElementById('cond-delta-ant-min');
const condDeltaAntMax = document.getElementById('cond-delta-ant-max');
const enableDeltaProx = document.getElementById('enable-delta-prox');
const deltaProximaContainer = document.getElementById('delta-proxima-container');
const condDeltaProxMin = document.getElementById('cond-delta-prox-min');
const condDeltaProxMax = document.getElementById('cond-delta-prox-max');

// Portamento inputs
const effectPortamentoActive = document.getElementById('effect-portamento-active');
const portamentoInputs = document.getElementById('portamento-inputs');
const portType = document.getElementById('port-type');
const portFixoFields = document.getElementById('port-fixo-fields');
const portPropFields = document.getElementById('port-prop-fields');
const portPointsContainer = document.getElementById('port-points-container');
const btnAddPortPoint = document.getElementById('btn-add-port-point');
const portPbsBase = document.getElementById('port-pbs-base');
const portPbwProp = document.getElementById('port-pbw-prop');
const portFatorPby = document.getElementById('port-fator-pby');

// PORTAMENTO HUMANIZATION INPUTS
const portRandPbs = document.getElementById('port-rand-pbs');
const portRandPbw = document.getElementById('port-rand-pbw');

// Vibrato inputs
const effectVibratoActive = document.getElementById('effect-vibrato-active');
const vibratoInputs = document.getElementById('vibrato-inputs');
const vibLg = document.getElementById('vib-lg');
const valVibLg = document.getElementById('val-vib-lg');
const vibPeriod = document.getElementById('vib-period');
const valVibPeriod = document.getElementById('val-vib-period');
const vibDepth = document.getElementById('vib-depth');
const valVibDepth = document.getElementById('val-vib-depth');
const vibFadeIn = document.getElementById('vib-fade-in');
const valVibFadeIn = document.getElementById('val-vib-fade-in');
const vibFadeOut = document.getElementById('vib-fade-out');
const valVibFadeOut = document.getElementById('val-vib-fade-out');
const vibPhase = document.getElementById('vib-phase');
const valVibPhase = document.getElementById('val-vib-phase');
const vibOffset = document.getElementById('vib-offset');
const valVibOffset = document.getElementById('val-vib-offset');

// VIBRATO HUMANIZATION INPUTS
const vibRandDepth = document.getElementById('vib-rand-depth');
const vibRandPeriod = document.getElementById('vib-rand-period');
const vibRandLength = document.getElementById('vib-rand-length');

// Canvas
const canvas = document.getElementById('preview-canvas');
const ctx = canvas.getContext('2d');

// Interactive Pitch/Portamento Editor State
let activeControlPoints = [];
let hoveredPoint = null;
let draggedPoint = null;
let isDragging = false;
let dragAxisLock = null;        // null | 'x' | 'y'  (set on first move with Shift held)
let dragStartPos = null;        // {x, y} canvas pos at drag start
let dragStartValues = null;     // {valueX, valueY} data values at drag start
// Snap modes: 'off' | 'medium' (5ms, 0.5st) | 'coarse' (10ms, 1st)
let snapMode = 'off';


// --- EVENT LISTENERS ---
window.addEventListener('DOMContentLoaded', fetchRules);
btnSave.addEventListener('click', saveRules);
btnAddRule.addEventListener('click', addRule);

// Sync inputs to state
const syncInputs = [
    inputRuleName, condAntSilencio, condProxSilencio, condLengthMin,
    condDeltaAntMin, condDeltaAntMax, enableDeltaProx, condDeltaProxMin, condDeltaProxMax,
    effectPortamentoActive, portType, portPbsBase, portPbwProp, portFatorPby,
    portRandPbs, portRandPbw,
    effectVibratoActive, vibLg, vibPeriod, vibDepth, vibFadeIn, vibFadeOut, vibPhase, vibOffset,
    vibRandDepth, vibRandPeriod, vibRandLength
];

syncInputs.forEach(input => {
    if (input) {
        input.addEventListener('input', () => {
            updateStateFromForm();
            updateLabels();
            drawPreview();
        });
    }
});

phCheckboxes.forEach(cb => {
    cb.addEventListener('change', () => {
        updateStateFromForm();
        drawPreview();
    });
});

if (enableDeltaProx) {
    enableDeltaProx.addEventListener('change', () => {
        if (enableDeltaProx.checked) {
            deltaProximaContainer.classList.remove('hidden');
        } else {
            deltaProximaContainer.classList.add('hidden');
            if (activeRuleIndex !== null) {
                delete rulesState[activeRuleIndex].condicoes.delta_proxima_min;
                delete rulesState[activeRuleIndex].condicoes.delta_proxima_max;
            }
        }
        updateStateFromForm();
        drawPreview();
    });
}

if (portType) {
    portType.addEventListener('change', () => {
        if (portType.value === 'proporcional') {
            portPropFields.classList.remove('hidden');
            portFixoFields.classList.add('hidden');
        } else {
            portPropFields.classList.add('hidden');
            portFixoFields.classList.remove('hidden');
        }
        updateStateFromForm(); 
        drawPreview();
    });
}

if (btnAddPortPoint) {
    btnAddPortPoint.addEventListener('click', () => {
        if (activeRuleIndex === null) return;
        addPointRow(0, 0); 
        updateStateFromForm();
        drawPreview();
    });
}

if (effectPortamentoActive) {
    effectPortamentoActive.addEventListener('change', () => {
        const card = effectPortamentoActive.closest('.effect-card');
        if (card) card.classList.toggle('disabled', !effectPortamentoActive.checked);
        updateStateFromForm();
        drawPreview();
    });
}

if (effectVibratoActive) {
    effectVibratoActive.addEventListener('change', () => {
        const card = effectVibratoActive.closest('.effect-card');
        if (card) card.classList.toggle('disabled', !effectVibratoActive.checked);
        updateStateFromForm();
        drawPreview();
    });
}

window.addEventListener('resize', resizeCanvas);

// Also observe the canvas container directly (handles layout shifts, sidebar toggles, etc.)
if (typeof ResizeObserver !== 'undefined') {
    new ResizeObserver(() => resizeCanvas()).observe(canvas.parentElement);
}



// --- INTERACTIVE PITCH/PORTAMENTO CANVAS EDITING ---

function getCanvasGeometry() {
    if (activeRuleIndex === null) return null;
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.width / dpr;
    const h = canvas.height / dpr;
    const midY = h / 2;
    
    const rule = rulesState[activeRuleIndex];
    const cond = rule.condicoes || {};
    
    const startX = cond.anterior_e_silencio ? w * 0.18 : w * 0.12;
    const endX = cond.proxima_e_silencio ? w * 0.82 : w * 0.88;
    const noteWidth = endX - startX;
    
    let delta = 0;
    if (!cond.anterior_e_silencio) {
        const dMin = parseFloat(cond.delta_anterior_min);
        const dMax = parseFloat(cond.delta_anterior_max);
        delta = (isNaN(dMin) || isNaN(dMax)) ? 2 : (dMin + dMax) / 2;
    }
    
    const scaleX = 1.4;
    const scaleY = 1.6;
    const scX = noteWidth / 250;
    // Dynamic scY: maps ±24 semitones to ±(h/2), so portamentos fill the full canvas height
    const scY = (h / 2) / 24;
    
    return { w, h, midY, startX, endX, noteWidth, delta, scaleX, scaleY, scX, scY };
}

// Helper: convert a mouse event into logical canvas coordinates
// (accounts for both devicePixelRatio and any CSS scaling)
function getCanvasMousePos(e) {
    const rect = canvas.getBoundingClientRect();
    // scaleX/Y: ratio of CSS display size to the logical draw space (canvas.width/dpr)
    const dpr = window.devicePixelRatio || 1;
    const logicalW = canvas.width / dpr;
    const logicalH = canvas.height / dpr;
    const scaleX = logicalW / rect.width;
    const scaleY = logicalH / rect.height;
    return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top)  * scaleY
    };
}

canvas.addEventListener('mousemove', (e) => {
    if (activeRuleIndex === null || !effectPortamentoActive.checked) return;
    
    const { x: mouseX, y: mouseY } = getCanvasMousePos(e);
    
    const geom = getCanvasGeometry();
    if (!geom) return;
    
    if (isDragging && draggedPoint) {
        if (draggedPoint.type === 'fixed') {
            let newX = (mouseX - geom.startX) / geom.scX - 60;
            let newY = (geom.midY - mouseY) / geom.scY;
            
            newX = Math.max(-100, Math.min(200, newX));
            newY = Math.max(-24, Math.min(24, newY));
            
            newX = Math.round(newX);
            newY = parseFloat(newY.toFixed(1));
            
            draggedPoint.valueX = newX;
            draggedPoint.valueY = newY;
            
            const rows = portPointsContainer.querySelectorAll('.point-row');
            const row = rows[draggedPoint.index];
            if (row) {
                row.querySelector('.point-x-input').value = newX;
                row.querySelector('.point-y-input').value = newY.toFixed(1);
            }
            
            updateStateFromForm();
            drawPreview();
            
        } else if (draggedPoint.type === 'p1') {
            let pbsBase = (mouseX - geom.startX) / geom.scaleX;
            pbsBase = Math.max(-200, Math.min(0, pbsBase));
            pbsBase = Math.round(pbsBase / 5) * 5;
            
            portPbsBase.value = pbsBase;
            document.getElementById('val-port-pbs-base').textContent = `${pbsBase} ms`;
            
            updateStateFromForm();
            drawPreview();
            
        } else if (draggedPoint.type === 'p2') {
            const p1 = activeControlPoints.find(pt => pt.type === 'p1');
            const p1x = p1 ? p1.x : geom.startX;
            
            let pbw0 = (mouseX - p1x) / geom.scaleX;
            pbw0 = Math.max(0, Math.round(pbw0));
            
            let fator = parseFloat(portFatorPby.value);
            if (geom.delta !== 0) {
                fator = (geom.midY - mouseY) / (geom.delta * geom.scaleY);
                fator = Math.max(-5.0, Math.min(5.0, fator));
                fator = parseFloat(fator.toFixed(1));
            }
            
            portFatorPby.value = fator;
            document.getElementById('val-port-fator-pby').textContent = `${fator.toFixed(1)}x`;
            
            const currentPbw = (portPbwProp.value || "45,25").split(',');
            const pbw1 = currentPbw[1] || "25";
            portPbwProp.value = `${pbw0},${pbw1}`;
            
            updateStateFromForm();
            drawPreview();
            
        } else if (draggedPoint.type === 'p3') {
            const p2 = activeControlPoints.find(pt => pt.type === 'p2');
            const p2x = p2 ? p2.x : geom.startX;
            
            let pbw1 = (mouseX - p2x) / geom.scaleX;
            pbw1 = Math.max(0, Math.round(pbw1));
            
            const currentPbw = (portPbwProp.value || "45,25").split(',');
            const pbw0 = currentPbw[0] || "45";
            portPbwProp.value = `${pbw0},${pbw1}`;
            
            updateStateFromForm();
            drawPreview();
        }
        
    } else {
        let found = null;
        for (const pt of activeControlPoints) {
            const dist = Math.hypot(pt.x - mouseX, pt.y - mouseY);
            if (dist < 10) {
                found = pt;
                break;
            }
        }
        
        if (found) {
            hoveredPoint = found;
            canvas.style.cursor = 'pointer';
            drawPreview();
        } else if (hoveredPoint) {
            hoveredPoint = null;
            canvas.style.cursor = 'default';
            drawPreview();
        }
    }
});

canvas.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    if (hoveredPoint) {
        draggedPoint = hoveredPoint;
        isDragging = true;
        dragAxisLock = null;
        dragStartPos = getCanvasMousePos(e);
        dragStartValues = { valueX: hoveredPoint.valueX, valueY: hoveredPoint.valueY };
        canvas.style.cursor = 'grabbing';
        e.preventDefault();
        drawPreview();
    }
});

const endDragging = () => {
    if (isDragging) {
        isDragging = false;
        canvas.style.cursor = hoveredPoint ? 'pointer' : 'default';
        
        if (draggedPoint && draggedPoint.type === 'fixed') {
            const rule = rulesState[activeRuleIndex];
            if (rule && rule.efeitos && rule.efeitos.portamento && Array.isArray(rule.efeitos.portamento.pontos)) {
                rule.efeitos.portamento.pontos.sort((a, b) => a.x - b.x);
                portPointsContainer.innerHTML = '';
                rule.efeitos.portamento.pontos.forEach(ponto => {
                    addPointRow(ponto.x, ponto.y);
                });
            }
        }
        
        draggedPoint = null;
        drawPreview();
    }
};

canvas.addEventListener('mouseup', endDragging);
canvas.addEventListener('mouseleave', endDragging);

canvas.addEventListener('dblclick', (e) => {
    if (activeRuleIndex === null || !effectPortamentoActive.checked || portType.value !== 'fixo') return;
    
    const { x: mouseX, y: mouseY } = getCanvasMousePos(e);
    
    const geom = getCanvasGeometry();
    if (!geom) return;
    
    let foundIndex = -1;
    for (let i = 0; i < activeControlPoints.length; i++) {
        const pt = activeControlPoints[i];
        if (pt.type === 'fixed') {
            const dist = Math.hypot(pt.x - mouseX, pt.y - mouseY);
            if (dist < 10) {
                foundIndex = pt.index;
                break;
            }
        }
    }
    
    const rule = rulesState[activeRuleIndex];
    if (!rule.efeitos) rule.efeitos = {};
    if (!rule.efeitos.portamento) rule.efeitos.portamento = {};
    if (!Array.isArray(rule.efeitos.portamento.pontos)) {
        rule.efeitos.portamento.pontos = [];
    }
    
    if (foundIndex !== -1) {
        rule.efeitos.portamento.pontos.splice(foundIndex, 1);
        showToast('Ponto removido!', 'success');
    } else {
        let newX = (mouseX - geom.startX) / geom.scX - 60;
        let newY = (geom.midY - mouseY) / geom.scY;
        
        newX = Math.max(-100, Math.min(200, newX));
        newY = Math.max(-24, Math.min(24, newY));
        
        newX = Math.round(newX);
        newY = parseFloat(newY.toFixed(1));
        
        rule.efeitos.portamento.pontos.push({ x: newX, y: newY });
        showToast('Ponto adicionado!', 'success');
    }
    
    rule.efeitos.portamento.pontos.sort((a, b) => a.x - b.x);
    portPointsContainer.innerHTML = '';
    rule.efeitos.portamento.pontos.forEach(ponto => {
        addPointRow(ponto.x, ponto.y);
    });
    
    updateStateFromForm();
    drawPreview();
});

function addPointRow(xVal, yVal) {
    const div = document.createElement('div');
    div.className = 'point-row'; 
    div.innerHTML = `
        <span class="point-row-label">X (ms)</span>
        <input type="number" class="point-x-input" value="${Math.round(xVal)}" placeholder="Tempo (ms)">
        <span class="point-row-label">Y (st)</span>
        <input type="number" class="point-y-input" step="0.1" value="${parseFloat(yVal).toFixed(1)}" placeholder="Pitch (st)">
        <button type="button" class="btn-remove-point" title="Remover ponto">✕</button>
    `;

    div.querySelectorAll('input').forEach(inp => {
        inp.addEventListener('input', () => {
            updateStateFromForm();
            drawPreview();
        });
    });

    div.querySelector('.btn-remove-point').addEventListener('click', () => {
        div.remove();
        updateStateFromForm();
        drawPreview();
    });
    portPointsContainer.appendChild(div);
}

function resizeCanvas() {
    const container = canvas.parentElement;
    if (!container) return;
    // offsetWidth/Height gives the actual CSS rendered pixel size
    const cssW = container.offsetWidth;
    const cssH = container.offsetHeight;
    if (cssW === 0 || cssH === 0) return;
    const dpr = window.devicePixelRatio || 1;
    // Set physical (backing store) resolution
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    // Force the CSS display size to match exactly (prevents browser stretch)
    canvas.style.width  = cssW + 'px';
    canvas.style.height = cssH + 'px';
    drawPreview();
}

// --- CORE FUNCTIONS ---

async function fetchRules() {
    try {
        const response = await fetch('/api/rules');
        const data = await response.json();
        rulesState = data.filter(r => r.condicoes || r.efeitos);
        renderRulesList();
        resizeCanvas();
    } catch (error) {
        showToast('Erro ao carregar regras!', 'error');
    }
}

async function saveRules() {
    try {
        const response = await fetch('/api/rules', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(rulesState)
        });
        const resData = await response.json();
        if (resData.status === 'success') {
            showToast('Regras salvas com sucesso!');
        } else {
            showToast('Erro: ' + resData.message, 'error');
        }
    } catch (error) {
        showToast('Falha na requisição para salvar!', 'error');
    }
}

function renderRulesList() {
    rulesList.innerHTML = '';

    rulesState.forEach((rule, index) => {
        const li = document.createElement('li');
        li.draggable = true;
        li.dataset.index = index;
        li.className = `rule-item ${index === activeRuleIndex ? 'active' : ''}`;

        let metaDesc = 'Geral';
        if (rule.condicoes) {
            if (rule.condicoes.anterior_e_silencio && rule.condicoes.proxima_e_silencio) {
                metaDesc = 'Isolada (Silêncio antes/depois)';
            } else if (rule.condicoes.anterior_e_silencio) {
                metaDesc = 'Início de frase';
            } else if (rule.condicoes.proxima_e_silencio) {
                metaDesc = 'Fim de frase';
            } else {
                metaDesc = `Salto: [${rule.condicoes.delta_anterior_min}, ${rule.condicoes.delta_anterior_max}]`;
            }
        }

        li.innerHTML = `
            <div class="rule-drag-handle">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><line x1="9" y1="5" x2="9" y2="19"></line><line x1="15" y1="5" x2="15" y2="19"></line></svg>
            </div>
            <div class="rule-item-content">
                <span class="rule-name-span">${rule.nome || 'Sem Nome'}</span>
                <span class="rule-meta-span">${metaDesc}</span>
            </div>
            <div class="rule-item-actions">
                <button class="btn-icon-only btn-clone" title="Clonar Regra">
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                </button>
                <button class="btn-icon-only btn-delete" title="Deletar Regra">
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                </button>
            </div>
        `;

        li.addEventListener('click', (e) => {
            if (e.target.closest('.rule-item-actions') || e.target.closest('.rule-drag-handle')) return;
            selectRule(index);
        });

        li.querySelector('.btn-clone').addEventListener('click', (e) => {
            e.stopPropagation();
            cloneRule(index);
        });

        li.querySelector('.btn-delete').addEventListener('click', (e) => {
            e.stopPropagation();
            deleteRule(index);
        });

        li.addEventListener('dragstart', (e) => {
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', index);
            li.classList.add('dragging');
        });

        li.addEventListener('dragend', () => {
            li.classList.remove('dragging');
            document.querySelectorAll('.rule-item').forEach(item => item.classList.remove('drag-over'));
        });

        li.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            li.classList.add('drag-over');
        });

        li.addEventListener('dragleave', () => {
            li.classList.remove('drag-over');
        });

        li.addEventListener('drop', (e) => {
            e.preventDefault();
            const fromIndex = parseInt(e.dataTransfer.getData('text/plain'), 10);
            const toIndex = index;

            if (fromIndex !== toIndex) {
                const targetRule = rulesState.splice(fromIndex, 1)[0];
                rulesState.splice(toIndex, 0, targetRule);

                if (activeRuleIndex === fromIndex) {
                    activeRuleIndex = toIndex;
                } else if (activeRuleIndex > fromIndex && activeRuleIndex <= toIndex) {
                    activeRuleIndex--;
                } else if (activeRuleIndex < fromIndex && activeRuleIndex >= toIndex) {
                    activeRuleIndex++;
                }

                renderRulesList();
                updateStateFromForm();
            }
        });

        rulesList.appendChild(li);
    });

    if (activeRuleIndex === null) {
        noSelectionMsg.classList.remove('hidden');
        editorFormContainer.classList.add('hidden');
    } else {
        noSelectionMsg.classList.add('hidden');
        editorFormContainer.classList.remove('hidden');
    }
}

function selectRule(index) {
    activeRuleIndex = index;
    renderRulesList();
    loadFormFromState();
}

function addRule() {
    const newRule = {
        nome: `Nova Regra #${rulesState.length + 1}`,
        condicoes: {
            delta_anterior_min: -12,
            delta_anterior_max: 12,
            anterior_e_silencio: false,
            proxima_e_silencio: false,
            length_min: 0
        },
        efeitos: {
            portamento: {
                tipo: "proporcional",
                PBS_base: "-50",
                PBW: "45,25",
                fator_pby: -2.0,
                rand_pbs: 0,
                rand_pbw: 0
            },
            vibrato: {
                length: 60,
                period: 140,
                depth: 30,
                fade_in: 20,
                fade_out: 5,
                phase: 0,
                offset: 0,
                rand_depth: 0,
                rand_period: 0,
                rand_length: 0
            }
        }
    };

    rulesState.push(newRule);
    activeRuleIndex = rulesState.length - 1;
    renderRulesList();
    loadFormFromState();
    showToast('Regra adicionada!');
}

function deleteRule(index) {
    if (confirm(`Deseja mesmo remover a regra "${rulesState[index].nome}"?`)) {
        rulesState.splice(index, 1);
        if (activeRuleIndex === index) {
            activeRuleIndex = rulesState.length > 0 ? 0 : null;
        } else if (activeRuleIndex > index) {
            activeRuleIndex--;
        }
        renderRulesList();
        if (activeRuleIndex !== null) loadFormFromState();
        showToast('Regra removida.');
    }
}

function cloneRule(index) {
    const originalRule = rulesState[index];
    const clonedRule = JSON.parse(JSON.stringify(originalRule));
    clonedRule.nome = `${clonedRule.nome} (Cópia)`;
    rulesState.splice(index + 1, 0, clonedRule);
    activeRuleIndex = index + 1;
    renderRulesList();
    loadFormFromState();
    showToast('Regra clonada com sucesso!');
}

function loadFormFromState() {
    if (activeRuleIndex === null) return;
    const rule = rulesState[activeRuleIndex];

    inputRuleName.value = rule.nome || '';

    const cond = rule.condicoes || {};
    
    // Carrega condições básicas
    condAntSilencio.checked = !!cond.anterior_e_silencio;
    condProxSilencio.checked = !!cond.proxima_e_silencio;
    condLengthMin.value = cond.length_min || 0;
    condDeltaAntMin.value = cond.delta_anterior_min !== undefined ? cond.delta_anterior_min : 0;
    condDeltaAntMax.value = cond.delta_anterior_max !== undefined ? cond.delta_anterior_max : 0;

    // --- ATUALIZAR CHECKBOXES DE FONÉTICA ---
    const permitidos = cond.fonemas_permitidos || [];
    phCheckboxes.forEach(cb => {
        cb.checked = permitidos.includes(cb.value);
    });

    // Carrega Delta Próxima
    if (cond.delta_proxima_min !== undefined && cond.delta_proxima_max !== undefined) {
        enableDeltaProx.checked = true;
        condDeltaProxMin.value = cond.delta_proxima_min;
        condDeltaProxMax.value = cond.delta_proxima_max;
        deltaProximaContainer.classList.remove('hidden');
    } else {
        enableDeltaProx.checked = false;
        condDeltaProxMin.value = 0;
        condDeltaProxMax.value = 0;
        deltaProximaContainer.classList.add('hidden');
    }

    const ef = rule.efeitos || {};

    // --- CARREGA PORTAMENTO ---
    if (ef.portamento) {
        effectPortamentoActive.checked = true;
        portType.value = ef.portamento.tipo || 'proporcional';
        portRandPbs.value = ef.portamento.rand_pbs || 0;
        portRandPbw.value = ef.portamento.rand_pbw || 0;

        portPointsContainer.innerHTML = '';

        if (portType.value === 'proporcional') {
            portPropFields.classList.remove('hidden');
            portFixoFields.classList.add('hidden');
            portPbsBase.value = ef.portamento.PBS_base !== undefined ? ef.portamento.PBS_base : '-50';
            portPbwProp.value = ef.portamento.PBW || '45,25';
            portFatorPby.value = ef.portamento.fator_pby !== undefined ? ef.portamento.fator_pby : -2.0;
        } else {
            portPropFields.classList.add('hidden');
            portFixoFields.classList.remove('hidden');
            
            if (ef.portamento.pontos && Array.isArray(ef.portamento.pontos)) {
                ef.portamento.pontos.sort((a, b) => a.x - b.x);
                ef.portamento.pontos.forEach(ponto => {
                    addPointRow(ponto.x, ponto.y);
                });
            }
        }
    } else {
        effectPortamentoActive.checked = false;
        portPointsContainer.innerHTML = '';
        portPropFields.classList.remove('hidden');
        portFixoFields.classList.add('hidden');
    }

    // --- CARREGA VIBRATO ---
    if (ef.vibrato) {
        effectVibratoActive.checked = true;
        document.getElementById('vib-lg').value = ef.vibrato.length !== undefined ? ef.vibrato.length : 60;
        document.getElementById('vib-period').value = ef.vibrato.period !== undefined ? ef.vibrato.period : 140;
        document.getElementById('vib-depth').value = ef.vibrato.depth !== undefined ? ef.vibrato.depth : 30;
        document.getElementById('vib-fade-in').value = ef.vibrato.fade_in !== undefined ? ef.vibrato.fade_in : 20;
        document.getElementById('vib-fade-out').value = ef.vibrato.fade_out !== undefined ? ef.vibrato.fade_out : 5;
        document.getElementById('vib-phase').value = ef.vibrato.phase !== undefined ? ef.vibrato.phase : 0;
        document.getElementById('vib-offset').value = ef.vibrato.offset !== undefined ? ef.vibrato.offset : 0;
        document.getElementById('vib-rand-depth').value = ef.vibrato.rand_depth || 0;
        document.getElementById('vib-rand-period').value = ef.vibrato.rand_period || 0;
        document.getElementById('vib-rand-length').value = ef.vibrato.rand_length || 0;
    } else {
        effectVibratoActive.checked = false;
    }

    const cardPort = effectPortamentoActive.closest('.effect-card');
    if (cardPort) cardPort.classList.toggle('disabled', !effectPortamentoActive.checked);
    
    const cardVib = effectVibratoActive.closest('.effect-card');
    if (cardVib) cardVib.classList.toggle('disabled', !effectVibratoActive.checked);

    updateLabels();
    drawPreview();
}

function updateStateFromForm() {
    if (activeRuleIndex === null) return;
    const rule = rulesState[activeRuleIndex];

    rule.nome = inputRuleName.value;

    // 1. Captura quais checkboxes fonéticos estão ativos
    const fonemasPermitidos = [];
    phCheckboxes.forEach(cb => {
        if (cb.checked) fonemasPermitidos.push(cb.value);
    });

    // 2. Monta o objeto de condições unificado
    rule.condicoes = {
        delta_anterior_min: parseInt(condDeltaAntMin.value) ?? -12,
        delta_anterior_max: parseInt(condDeltaAntMax.value) ?? 12,
        anterior_e_silencio: condAntSilencio.checked,
        proxima_e_silencio: condProxSilencio.checked,
        length_min: parseInt(condLengthMin.value) || 0,
        fonemas_permitidos: fonemasPermitidos // Filtro de fonética salvo aqui
    };

    // 3. Adiciona delta_proxima de forma condicional
    if (enableDeltaProx && enableDeltaProx.checked) {
        rule.condicoes.delta_proxima_min = parseInt(condDeltaProxMin.value) || 0;
        rule.condicoes.delta_proxima_max = parseInt(condDeltaProxMax.value) || 0;
    }

    if (!rule.efeitos) rule.efeitos = {};

    // --- SALVA PORTAMENTO ---
    if (effectPortamentoActive && effectPortamentoActive.checked) {
        rule.efeitos.portamento = {
            tipo: portType.value,
            rand_pbs: parseInt(portRandPbs.value) || 0,
            rand_pbw: parseInt(portRandPbw.value) || 0
        };

        if (portType.value === 'proporcional') {
            rule.efeitos.portamento.PBS_base = String(portPbsBase.value || "-50");
            rule.efeitos.portamento.PBW = portPbwProp.value || "45,25";
            rule.efeitos.portamento.fator_pby = parseFloat(portFatorPby.value) ?? -2.0;
            delete rule.efeitos.portamento.pontos;
        } else {
            const pontos = [];
            const rows = portPointsContainer.querySelectorAll('.point-row');
            rows.forEach(row => {
                const inputX = row.querySelector('.point-x-input');
                const inputY = row.querySelector('.point-y-input');
                if (inputX && inputY) {
                    pontos.push({
                        x: parseFloat(inputX.value) || 0,
                        y: parseFloat(inputY.value) || 0
                    });
                }
            });
            rule.efeitos.portamento.pontos = pontos;
            delete rule.efeitos.portamento.PBS_base;
            delete rule.efeitos.portamento.PBW;
            delete rule.efeitos.portamento.fator_pby;
        }
    } else {
        delete rule.efeitos.portamento;
    }

    // --- SALVA VIBRATO ---
    if (effectVibratoActive && effectVibratoActive.checked) {
        rule.efeitos.vibrato = {
            length: parseInt(document.getElementById('vib-lg').value) ?? 60,
            period: parseInt(document.getElementById('vib-period').value) ?? 140,
            depth: parseInt(document.getElementById('vib-depth').value) ?? 30,
            fade_in: parseInt(document.getElementById('vib-fade-in').value) ?? 20,
            fade_out: parseInt(document.getElementById('vib-fade-out').value) ?? 5,
            phase: parseInt(document.getElementById('vib-phase').value) || 0,
            offset: parseInt(document.getElementById('vib-offset').value) || 0,
            rand_depth: parseInt(document.getElementById('vib-rand-depth').value) || 0,
            rand_period: parseInt(document.getElementById('vib-rand-period').value) || 0,
            rand_length: parseInt(document.getElementById('vib-rand-length').value) || 0
        };
    } else {
        delete rule.efeitos.vibrato;
    }

    updateLabels();
}

function updateLabels() {
    if (document.getElementById('cond-length-min')) {
        document.getElementById('val-cond-length-min').textContent = `${document.getElementById('cond-length-min').value} ticks`;
    }
    if (document.getElementById('cond-delta-ant-min')) {
        document.getElementById('val-cond-delta-ant-min').textContent = `${document.getElementById('cond-delta-ant-min').value} semitons`;
    }
    if (document.getElementById('cond-delta-ant-max')) {
        document.getElementById('val-cond-delta-ant-max').textContent = `${document.getElementById('cond-delta-ant-max').value} semitons`;
    }
    
    if (enableDeltaProx && enableDeltaProx.checked) {
        document.getElementById('val-cond-delta-prox-min').textContent = `${document.getElementById('cond-delta-prox-min').value} semitons`;
        document.getElementById('val-cond-delta-prox-max').textContent = `${document.getElementById('cond-delta-prox-max').value} semitons`;
    }

    const pbsBaseEl = document.getElementById('port-pbs-base');
    if (pbsBaseEl) {
        document.getElementById('val-port-pbs-base').textContent = `${pbsBaseEl.value} ms`;
    }
    const fatorPbyEl = document.getElementById('port-fator-pby');
    if (fatorPbyEl) {
        document.getElementById('val-port-fator-pby').textContent = `${fatorPbyEl.value}x`;
    }
    
    document.getElementById('val-port-rand-pbs').textContent = `${document.getElementById('port-rand-pbs').value} ms`;
    document.getElementById('val-port-rand-pbw').textContent = `${document.getElementById('port-rand-pbw').value} ms`;

    document.getElementById('val-vib-rand-depth').textContent = `${document.getElementById('vib-rand-depth').value} cents`;
    document.getElementById('val-vib-rand-period').textContent = `${document.getElementById('vib-rand-period').value} ms`;
    document.getElementById('val-vib-rand-length').textContent = `${document.getElementById('vib-rand-length').value}%`;

    document.getElementById('val-vib-lg').textContent = `${document.getElementById('vib-lg').value}%`;
    document.getElementById('val-vib-period').textContent = `${document.getElementById('vib-period').value}ms`;
    document.getElementById('val-vib-depth').textContent = `${document.getElementById('vib-depth').value} cents`;
    document.getElementById('val-vib-fade-in').textContent = `${document.getElementById('vib-fade-in').value}%`;
    document.getElementById('val-vib-fade-out').textContent = `${document.getElementById('vib-fade-out').value}%`;
    document.getElementById('val-vib-phase').textContent = `${document.getElementById('vib-phase').value}°`;
    document.getElementById('val-vib-offset').textContent = `${document.getElementById('vib-offset').value}%`;
}

// --- CANVAS PREVIEW RENDER ---

function drawPreview() {
    if (!canvas || !ctx) return;

    activeControlPoints = [];

    const dpr = window.devicePixelRatio || 1;
    
    // Reseta a transformação e aplica a escala do DPR no contexto para máxima nitidez e evitar acúmulos
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);

    const w = canvas.width / dpr;
    const h = canvas.height / dpr;
    if (w === 0 || h === 0) return;
    const midY = h / 2;

    ctx.clearRect(0, 0, w, h);

    // --- PITCH GRID (±6, ±12, ±18, ±24 st reference lines) ---
    ctx.save();
    const scYGrid = (h / 2) / 24;
    ctx.font = '9px monospace';
    [24, 18, 12, 6, 0, -6, -12, -18, -24].forEach(st => {
        const gy = midY - st * scYGrid;
        if (gy < 0 || gy > h) return;
        ctx.strokeStyle = st === 0 ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.04)';
        ctx.lineWidth = st === 0 ? 1.5 : 1;
        ctx.setLineDash(st === 0 ? [] : [3, 4]);
        ctx.beginPath();
        ctx.moveTo(0, gy);
        ctx.lineTo(w, gy);
        ctx.stroke();
        ctx.setLineDash([]);
        if (st !== 0) {
            ctx.fillStyle = 'rgba(100,116,139,0.6)';
            ctx.fillText((st > 0 ? '+' : '') + st + ' st', 4, gy - 2);
        }
    });
    ctx.restore();

    if (activeRuleIndex === null) return;

    const rule = rulesState[activeRuleIndex];
    const cond = rule.condicoes || {};
    const ef = rule.efeitos || {};

    if (cond.anterior_e_silencio) {
        ctx.save();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
        ctx.fillRect(0, 0, w * 0.18, h);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.strokeRect(0, 0, w * 0.18, h);
        ctx.fillStyle = '#64748b';
        ctx.font = '11px sans-serif';
        ctx.fillText('SILÊNCIO', 5, 20);
        ctx.restore();
    }
    if (cond.proxima_e_silencio) {
        ctx.save();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
        ctx.fillRect(w * 0.82, 0, w * 0.18, h);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.strokeRect(w * 0.82, 0, w * 0.18, h);
        ctx.fillStyle = '#64748b';
        ctx.font = '11px sans-serif';
        ctx.fillText('SILÊNCIO', w - 58, 20);
        ctx.restore();
    }

    const startX = cond.anterior_e_silencio ? w * 0.18 : w * 0.12;
    const endX = cond.proxima_e_silencio ? w * 0.82 : w * 0.88;
    const noteWidth = endX - startX;

    ctx.save();
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(startX, midY);
    ctx.lineTo(endX, midY);
    ctx.stroke();
    ctx.restore();

    let delta = 0;
    if (!cond.anterior_e_silencio) {
        const dMin = parseFloat(cond.delta_anterior_min);
        const dMax = parseFloat(cond.delta_anterior_max);
        delta = (isNaN(dMin) || isNaN(dMax)) ? 2 : (dMin + dMax) / 2;
    }

    const scaleX = 1.4;
    const scaleY = 1.6;

    const clampY = y => isNaN(y) ? midY : Math.max(4, Math.min(h - 4, y));
    const clampX = x => isNaN(x) ? startX : Math.max(startX, Math.min(endX, x));

    let getBaseYAtX = (x) => midY;

    // --- REGION: DESENHO DO PORTAMENTO ---
    if (effectPortamentoActive && effectPortamentoActive.checked && ef.portamento) {
        const port = ef.portamento;
        const ajuste = -delta * 10;

        ctx.save();
        ctx.strokeStyle = '#00e5ff'; 
        ctx.lineWidth = 2.5;
        ctx.lineJoin = 'round';

        if (port.tipo === 'proporcional') {
            const pbsBase = parseFloat(port.PBS_base) || -50;
            const pbw = (port.PBW || '45,25').split(',').map(v => Math.abs(parseFloat(v) || 0));
            const fator = parseFloat(port.fator_pby) !== undefined ? parseFloat(port.fator_pby) : -2.0;

            const p1x = clampX(startX + pbsBase * scaleX);
            const p1y = clampY(midY - ajuste * scaleY);
            const p2x = clampX(p1x + pbw[0] * scaleX);
            const p2y = clampY(midY - (delta * fator) * scaleY);
            const p3x = clampX(p2x + (pbw[1] || 0) * scaleX);
            const p3y = clampY(midY);

            ctx.beginPath();
            ctx.moveTo(startX, p1y);
            ctx.lineTo(p1x, p1y);
            ctx.quadraticCurveTo(p1x, p2y, p2x, p2y);
            ctx.quadraticCurveTo(p2x, p3y, p3x, p3y);
            ctx.lineTo(endX, p3y);
            ctx.stroke();

            getBaseYAtX = (x) => {
                if (x < p1x) return p1y;
                if (x >= p1x && x < p2x) {
                    const t = (x - p1x) / (p2x - p1x || 1);
                    return (1-t)*(1-t)*p1y + 2*(1-t)*t*p2y + t*t*p2y;
                }
                if (x >= p2x && x < p3x) {
                    const t = (x - p2x) / (p3x - p2x || 1);
                    return (1-t)*(1-t)*p2y + 2*(1-t)*t*p3y + t*t*p3y;
                }
                return p3y;
            };

            // Registra os pontos de controle proporcionais
            activeControlPoints.push({ x: p1x, y: p1y, type: 'p1', valueX: pbsBase, valueY: 0 });
            activeControlPoints.push({ x: p2x, y: p2y, type: 'p2', valueX: pbw[0], valueY: fator });
            activeControlPoints.push({ x: p3x, y: p3y, type: 'p3', valueX: pbw[1], valueY: 0 });

            activeControlPoints.forEach(pt => {
                const isHovered = (hoveredPoint && hoveredPoint.type === pt.type) || (draggedPoint && draggedPoint.type === pt.type);
                ctx.beginPath();
                ctx.arc(pt.x, pt.y, isHovered ? 6 : 4, 0, Math.PI * 2);
                ctx.fillStyle = isHovered ? '#ffffff' : '#00e5ff';
                ctx.fill();
                ctx.strokeStyle = '#00e5ff';
                ctx.lineWidth = 1.5;
                ctx.stroke();
            });

        } else {
            // MODO MULTIPONTO (Tratamento seguro se não existirem pontos salvos no JSON)
            const pontosValidos = port.pontos && Array.isArray(port.pontos) ? port.pontos : [];
            
            if (pontosValidos.length === 0) {
                // Desenha linha de portamento neutra se a lista estiver vazia
                ctx.beginPath();
                ctx.moveTo(startX, midY);
                ctx.lineTo(endX, midY);
                ctx.stroke();
                getBaseYAtX = (x) => midY;
            } else {
                const pontosOrdenados = [...pontosValidos].sort((a, b) => a.x - b.x);
                const scX = noteWidth / 250;
                const scY = (h / 2) / 24; // ±24 st maps to full canvas half-height

                const mappedPoints = pontosOrdenados.map((p, idx) => {
                    const px = clampX(startX + (p.x + 60) * scX);
                    const py = clampY(midY - (p.y * scY));
                    activeControlPoints.push({
                        x: px,
                        y: py,
                        type: 'fixed',
                        index: idx,
                        valueX: p.x,
                        valueY: p.y
                    });
                    return { x: px, y: py };
                });

                ctx.beginPath();
                ctx.moveTo(startX, mappedPoints[0].y);
                ctx.lineTo(mappedPoints[0].x, mappedPoints[0].y);

                for (let i = 0; i < mappedPoints.length; i++) {
                    ctx.lineTo(mappedPoints[i].x, mappedPoints[i].y);
                }
                ctx.lineTo(endX, mappedPoints[mappedPoints.length - 1].y);
                ctx.stroke();

                getBaseYAtX = (targetX) => {
                    if (targetX <= mappedPoints[0].x) return mappedPoints[0].y;
                    if (targetX >= mappedPoints[mappedPoints.length - 1].x) return mappedPoints[mappedPoints.length - 1].y;

                    for (let i = 0; i < mappedPoints.length - 1; i++) {
                        const p1 = mappedPoints[i];
                        const p2 = mappedPoints[i + 1];
                        if (targetX >= p1.x && targetX <= p2.x) {
                            const pct = (targetX - p1.x) / (p2.x - p1.x || 1);
                            return p1.y + (p2.y - p1.y) * pct;
                        }
                    }
                    return midY;
                };

                mappedPoints.forEach((pt, idx) => {
                    const isHovered = (hoveredPoint && hoveredPoint.type === 'fixed' && hoveredPoint.index === idx) || 
                                      (draggedPoint && draggedPoint.type === 'fixed' && draggedPoint.index === idx);
                    ctx.beginPath();
                    ctx.arc(pt.x, pt.y, isHovered ? 6 : 4, 0, Math.PI * 2);
                    ctx.fillStyle = isHovered ? '#00e5ff' : '#ffffff';
                    ctx.fill();
                    ctx.strokeStyle = '#00e5ff';
                    ctx.lineWidth = 1.5;
                    ctx.stroke();
                });
            }
        }
        ctx.restore();
    }

    // --- REGION: DESENHO DO VIBRATO ---
    if (effectVibratoActive && effectVibratoActive.checked && ef.vibrato) {
        const vib = ef.vibrato;
        
        const lengthPct = Math.max(0, Math.min(100, parseInt(vib.length) ?? 60));
        const period = Math.max(10, parseInt(vib.period) || 140);
        const depth = parseFloat(vib.depth) || 30;
        const fadeInPct = parseInt(vib.fade_in) ?? 20;
        const fadeOutPct = parseInt(vib.fade_out) ?? 5;
        const phaseDeg = parseInt(vib.phase) || 0;
        const offsetPct = parseInt(vib.offset) || 0;

        const vibWidth = noteWidth * (lengthPct / 100);
        const offsetLeft = noteWidth * (offsetPct / 100);
        
        const vibStartX = Math.max(startX, startX + (noteWidth - vibWidth) / 2 + offsetLeft);
        const vibEndX = Math.min(endX, vibStartX + vibWidth);

        if (vibEndX > vibStartX) {
            ctx.save();
            ctx.strokeStyle = '#e040fb'; 
            ctx.lineWidth = 2;
            ctx.beginPath();

            let firstPoint = true;
            const stepPx = 2; 

            for (let x = vibStartX; x <= vibEndX; x += stepPx) {
                const progress = (x - vibStartX) / (vibEndX - vibStartX || 1);
                
                let envelope = 1.0;
                if (progress < (fadeInPct / 100)) {
                    envelope = progress / ((fadeInPct / 100) || 1);
                } else if (progress > (1 - (fadeOutPct / 100))) {
                    envelope = (1 - progress) / ((fadeOutPct / 100) || 1);
                }
                envelope = Math.max(0, Math.min(1, envelope));

                const frequency = (2 * Math.PI) / (period * 0.4 || 1);
                const phaseRad = (phaseDeg * Math.PI) / 180;
                
                const amplitudeY = (depth * 0.4) * envelope * Math.sin(frequency * (x - vibStartX) + phaseRad);
                
                const baseY = getBaseYAtX(x);
                const finalY = clampY(baseY + amplitudeY);

                if (firstPoint) {
                    ctx.moveTo(x, finalY);
                    firstPoint = false;
                } else {
                    ctx.lineTo(x, finalY);
                }
            }
            ctx.stroke();
            ctx.restore();
        }
    }

    // --- DRAW HOVER/DRAG TOOLTIP HUD ---
    if ((hoveredPoint || draggedPoint) && effectPortamentoActive && effectPortamentoActive.checked) {
        const pt = draggedPoint || hoveredPoint;
        ctx.save();
        ctx.font = '10px sans-serif';
        
        let text = '';
        if (pt.type === 'fixed') {
            text = `Tempo: ${Math.round(pt.valueX)} ms | Pitch: ${parseFloat(pt.valueY).toFixed(1)} st`;
        } else if (pt.type === 'p1') {
            text = `PBS Base: ${Math.round(pt.valueX)} ms`;
        } else if (pt.type === 'p2') {
            text = `PBW 1: ${Math.round(pt.valueX)} ms | Fator PBY: ${parseFloat(pt.valueY).toFixed(1)}x`;
        } else if (pt.type === 'p3') {
            text = `PBW 2: ${Math.round(pt.valueX)} ms`;
        }

        const textWidth = ctx.measureText(text).width;
        const paddingX = 8;
        const paddingY = 6;
        const rectW = textWidth + paddingX * 2;
        const rectH = 14 + paddingY * 2;
        
        const rx = pt.x - rectW / 2;
        const ry = pt.y - rectH - 10;
        
        const clampedRx = Math.max(5, Math.min(w - rectW - 5, rx));
        const clampedRy = Math.max(5, Math.min(h - rectH - 5, ry));

        ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
        ctx.strokeStyle = '#00e5ff';
        ctx.lineWidth = 1.5;
        
        ctx.beginPath();
        if (ctx.roundRect) {
            ctx.roundRect(clampedRx, clampedRy, rectW, rectH, 6);
        } else {
            ctx.rect(clampedRx, clampedRy, rectW, rectH);
        }
        ctx.fill();
        ctx.stroke();
        
        ctx.fillStyle = '#ffffff';
        ctx.fillText(text, clampedRx + paddingX, clampedRy + paddingY + 10);
        
        ctx.strokeStyle = 'rgba(0, 229, 255, 0.3)';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(pt.x, pt.y);
        ctx.lineTo(pt.x, midY);
        ctx.stroke();
        
        ctx.restore();
    }
}

function showToast(message, type = 'success') {
    toast.textContent = message;
    toast.className = `toast ${type}`;
    toast.classList.remove('hidden');
    toast.style.opacity = '1';
    toast.style.transform = 'translateX(-50%) translateY(0)';

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(-50%) translateY(20px)';
        setTimeout(() => toast.classList.add('hidden'), 300);
    }, 3000);
}