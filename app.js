
/* ==========================================================================
   CONFIGURACIÓN DE FIREBASE
   ========================================================================== */
  const firebaseConfig = {
    apiKey: "AIzaSyDnQRku28HpNHf4ECR9A-MgbfQ6TGvx9P8",
    authDomain: "calendariotareas-b1dfe.firebaseapp.com",
    projectId: "calendariotareas-b1dfe",
    storageBucket: "calendariotareas-b1dfe.firebasestorage.app",
    messagingSenderId: "585502491069",
    appId: "1:585502491069:web:ed72732100ddeb0c3ad2d4"
  };

// Inicializamos Firebase y la Base de Datos (Firestore)
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();


/* ==========================================================================
   CONFIGURACIÓN BASE Y ANCLA DEL TURNO (2N-4L)
   ========================================================================== */
const ANCHOR_DATE = new Date(2026, 8, 4); // 04/09/2026 = Noche 1

const SHIFT_MAP = {
  0: { 
    code: 'N1', 
    name: 'Noche 1 (22:00 - 07:00)', 
    hours: 9,
    canWorkout: true, 
    energyLevel: '85%', 
    energyStatus: '⚡ ALTA ENERGÍA (Pre-turno)', 
    desc: 'Mañana de clase (08:00-14:00) o entreno previo. Tarde libre con siesta pre-turno obligatoria.',
    restAdvice: '💤 **Siesta Pre-Turno:** Dormir 90 min (18:30 a 20:00). Evita cafeína a partir de las 19:00.'
  },
  1: { 
    code: 'N2', 
    name: 'Noche 2 (22:00 - 07:00)', 
    hours: 9,
    canWorkout: false, 
    energyLevel: '40%', 
    energyStatus: '⚠️ TRABAJANDO / RESERVA BIOMÉTRICA', 
    desc: 'Salida del primer turno a las 07:00. Descanso tras la clase o al medio día.',
    restAdvice: '🕶️ **Fase Crítica:** Al salir a las 07:00, usa gafas de sol oscuras. Bloque de sueño de 14:30 a 21:00.'
  },
  2: { 
    code: 'L1', 
    name: 'Saliente de Noche (Libre 1)', 
    hours: 0,
    canWorkout: false, 
    energyLevel: '30%', 
    energyStatus: '🛑 RECUPERACIÓN BIOMÉTRICA', 
    desc: 'Salida del turno a las 07:00. Sueño recuperador matutino/mediodía.',
    restAdvice: '🛌 **Recuperación Saliente:** Prioriza 6h de sueño inmediato (07:30 a 13:30). Habitación a oscuras.'
  },
  3: { 
    code: 'L2', 
    name: 'Día Libre 2', 
    hours: 0,
    canWorkout: true, 
    energyLevel: '100%', 
    energyStatus: '🌟 PICO COGNITIVO & FÍSICO (10/10)', 
    desc: 'Totalmente restaurado. Entreno 06:30, clase y tarde libre.',
    restAdvice: '🌙 **Normalización Circadiana:** Dormir en horario nocturno natural (23:00 a 06:30).'
  },
  4: { 
    code: 'L3', 
    name: 'Día Libre 3', 
    hours: 0,
    canWorkout: true, 
    energyLevel: '100%', 
    energyStatus: '🌟 PICO COGNITIVO & FÍSICO (10/10)', 
    desc: 'Rendimiento máximo. Entreno 06:30, clase y tarde completa libre.',
    restAdvice: '⚡ **Consolidación:** Mantén la higiene del sueño nocturno (8h continuas).'
  },
  5: { 
    code: 'L4', 
    name: 'Día Libre 4', 
    hours: 0,
    canWorkout: true, 
    energyLevel: '90%', 
    energyStatus: '🟢 RENDIMIENTO ALTO', 
    desc: 'Último libre. Clase de 08:00 a 14:00. Tarde relajada acumulando descanso.',
    restAdvice: '😴 **Carga Previa:** Dormir al menos 8h esta noche preparando el reinicio de noches.'
  }
};

/* ==========================================================================
   ESTADO GLOBAL Y HISTORIAL (UNDO)
   ========================================================================== */
let currentDate = new Date(); 
let selectedDateStr = formatDateKey(new Date()); 

let overridesStorage = JSON.parse(localStorage.getItem('shift_planner_overrides')) || {};
let historyStack = [];
let isRangeMode = false;
let rangeStartDate = null;

/* ==========================================================================
   ELEMENTOS DEL DOM
   ========================================================================== */
const viewToday = document.getElementById('view-today');
const viewCalendar = document.getElementById('view-calendar');
const btnOpenCalendar = document.getElementById('btn-open-calendar');
const btnBackToToday = document.getElementById('btn-back-to-today');

const todayFullDate = document.getElementById('today-full-date');
const todayShiftBadge = document.getElementById('today-shift-badge');
const todayEnergyStatus = document.getElementById('today-energy-status');
const todayEnergyDesc = document.getElementById('today-energy-desc');
const todayToggleSchool = document.getElementById('today-toggle-school');
const todayToggleWorkout = document.getElementById('today-toggle-workout');
const todayTimeline = document.getElementById('today-timeline');
const todayTaskForm = document.getElementById('today-task-form');
const todayTaskInput = document.getElementById('today-task-input');
const todayTaskSlot = document.getElementById('today-task-slot');
const todayTaskList = document.getElementById('today-task-list');

const monthDisplay = document.getElementById('current-month-display');
const calendarGrid = document.getElementById('calendar-grid');
const btnPrevMonth = document.getElementById('btn-prev-month');
const btnNextMonth = document.getElementById('btn-next-month');

const selectedDateTitle = document.getElementById('selected-date-title');
const selectedWeekdaySubtitle = document.getElementById('selected-weekday-subtitle');
const shiftBadgeDetail = document.getElementById('shift-badge-detail');
const energyDescription = document.getElementById('energy-description');
const restRecommendationText = document.getElementById('rest-recommendation-text');
const timelineContainer = document.getElementById('timeline-container');

const btnToggleSchool = document.getElementById('btn-toggle-school');
const btnToggleWorkout = document.getElementById('btn-toggle-workout');
const btnToggleVacation = document.getElementById('btn-toggle-vacation');
const btnRangeMode = document.getElementById('btn-range-mode');
const btnUndo = document.getElementById('btn-undo');
const btnClearDay = document.getElementById('btn-clear-day');
const btnResetDay = document.getElementById('btn-reset-day');

const monthlyHoursDisplay = document.getElementById('monthly-hours-display');
const annualHoursDisplay = document.getElementById('annual-hours-display');
const vacationCountDisplay = document.getElementById('vacation-count-display');

const taskForm = document.getElementById('task-form');
const taskInput = document.getElementById('task-input');
const taskTimeSlot = document.getElementById('task-time-slot');
const taskList = document.getElementById('task-list');

// Elementos del DOM de Partes de Noche
const nightReportsSection = document.getElementById('night-reports-section');
const nightReportForm = document.getElementById('night-report-form');
const reportSecurity = document.getElementById('report-security');
const reportActas = document.getElementById('report-actas');
const reportDetenidos = document.getElementById('report-detenidos');
const reportIncidencias = document.getElementById('report-incidencias');
const btnExportExcel = document.getElementById('btn-export-excel');

/* ==========================================================================
   FUNCIONES DE HISTORIAL (DESHACER)
   ========================================================================== */
function pushStateToHistory() {
  historyStack.push(JSON.stringify(overridesStorage));
  if (historyStack.length > 30) historyStack.shift();
}

function undoLastAction() {
  if (historyStack.length === 0) return;

  const previousState = historyStack.pop();
  overridesStorage = JSON.parse(previousState);
  localStorage.setItem('shift_planner_overrides', JSON.stringify(overridesStorage));

  renderTodayView();
  if (!viewCalendar.classList.contains('hidden')) {
    const [year, month, day] = selectedDateStr.split('-').map(Number);
    selectCalendarDate(new Date(year, month - 1, day));
  }
}

/* ==========================================================================
   FUNCIONES AUXILIARES
   ========================================================================== */
function normalizeDate(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function formatDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getShiftInfo(date) {
  const normAnchor = normalizeDate(ANCHOR_DATE);
  const normTarget = normalizeDate(date);
  const diffTime = normTarget - normAnchor;
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
  
  let index = diffDays % 6;
  if (index < 0) index += 6;
  
  return { index, ...SHIFT_MAP[index] };
}

function calculateMonthlyWorkouts(year, month) {
  const workoutSet = new Set();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  let currentWeek = [];
  let runner = new Date(firstDay);

  const dayOfWeek = (runner.getDay() + 6) % 7; 
  runner.setDate(runner.getDate() - dayOfWeek);

  while (runner <= lastDay || currentWeek.length > 0) {
    currentWeek.push(new Date(runner));

    if (currentWeek.length === 7) {
      const eligibleDays = currentWeek.filter(d => getShiftInfo(d).canWorkout);
      if (eligibleDays.length >= 3) {
        workoutSet.add(formatDateKey(eligibleDays[0]));
        workoutSet.add(formatDateKey(eligibleDays[Math.floor(eligibleDays.length / 2)]));
        workoutSet.add(formatDateKey(eligibleDays[eligibleDays.length - 1]));
      } else {
        eligibleDays.forEach(d => workoutSet.add(formatDateKey(d)));
      }
      currentWeek = [];
    }

    runner.setDate(runner.getDate() + 1);
    if (runner > lastDay && currentWeek.length === 0) break;
  }

  return workoutSet;
}

function getEffectiveDayState(date, autoWorkoutDays) {
  const dateKey = formatDateKey(date);
  const dayOfWeek = (date.getDay() + 6) % 7;
  const shift = getShiftInfo(date);
  const override = overridesStorage[dateKey] || {};

  let hasSchool = (dayOfWeek >= 0 && dayOfWeek <= 4);
  let hasWorkout = autoWorkoutDays.has(dateKey);
  let isCleared = false;
  let isVacation = override.isVacation || false;

  if (override.noSchool !== undefined) hasSchool = !override.noSchool;
  if (override.workout !== undefined) hasWorkout = override.workout;

  if (override.cleared === true) {
    isCleared = true;
    hasSchool = false;
    hasWorkout = false;
  }

  return { shift, hasSchool, hasWorkout, isCleared, isVacation, override };
}

/* ==========================================================================
   CÁLCULO DE HORAS Y MÉTRICAS
   ========================================================================== */
function updateMetricsDisplays() {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  let monthlyHours = 0;
  let annualVacationDaysCount = 0;

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const autoWorkoutsMonth = calculateMonthlyWorkouts(year, month);
  
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d);
    const state = getEffectiveDayState(date, autoWorkoutsMonth);

    if (!state.isVacation && !state.isCleared && (state.shift.code === 'N1' || state.shift.code === 'N2')) {
      monthlyHours += state.shift.hours;
    }
  }

  for (let m = 0; m < 12; m++) {
    const totalDays = new Date(year, m + 1, 0).getDate();
    const autoWorkoutsYearMonth = calculateMonthlyWorkouts(year, m);

    for (let d = 1; d <= totalDays; d++) {
      const date = new Date(year, m, d);
      const state = getEffectiveDayState(date, autoWorkoutsYearMonth);
      
      const isShiftDay = (state.shift.code === 'N1' || state.shift.code === 'N2');
      if (state.isVacation && isShiftDay) {
        annualVacationDaysCount++;
      }
    }
  }

  if (monthlyHoursDisplay) monthlyHoursDisplay.innerText = `${monthlyHours}h`;
  if (vacationCountDisplay) vacationCountDisplay.innerText = `${annualVacationDaysCount} días`;
  
  if (annualHoursDisplay && annualHoursDisplay.parentElement) {
    annualHoursDisplay.parentElement.style.display = 'none';
  }
}

/* ==========================================================================
   RENDERIZADO DE VISTA PRINCIPAL (HOY)
   ========================================================================== */
function renderTodayView() {
  const today = new Date();
  const dateKey = formatDateKey(today);
  const autoWorkoutDays = calculateMonthlyWorkouts(today.getFullYear(), today.getMonth());
  const state = getEffectiveDayState(today, autoWorkoutDays);

  const options = { weekday: 'long', day: 'numeric', month: 'long' };
  todayFullDate.innerText = today.toLocaleDateString('es-ES', options);

  todayShiftBadge.className = `badge badge-${state.isVacation ? 'vacation' : state.shift.code}`;
  todayShiftBadge.innerText = state.isVacation ? "🌴 VACACIONES" : (state.isCleared ? "Día Vacío" : state.shift.name);

  todayEnergyStatus.innerText = state.isVacation ? "🌴 TURNO CANCELADO (VACACIONES)" : state.shift.energyStatus;
  todayEnergyDesc.innerHTML = state.isVacation
    ? `Día de vacaciones activado. Noche de trabajo liberada.`
    : (state.isCleared ? `Día despejado manualmente.` : `<strong>Batería: ${state.shift.energyLevel}</strong> — ${state.shift.desc}`);

  todayToggleSchool.className = `btn btn-toggle ${state.hasSchool ? 'active' : 'disabled-override'}`;
  todayToggleSchool.innerText = `🎓 Clase: ${state.hasSchool ? 'SÍ' : 'NO'}`;

  todayToggleWorkout.className = `btn btn-toggle ${state.hasWorkout ? 'active' : 'disabled-override'}`;
  todayToggleWorkout.innerText = `🏋️ Entreno: ${state.hasWorkout ? 'SÍ' : 'NO'}`;

  renderBlocksIntoContainer(state, todayTimeline);
  renderTasksForDate(dateKey, todayTaskList);
  updateMetricsDisplays();

  if (nightReportsSection) {
    if (!state.isVacation && !state.isCleared && (state.shift.code === 'N1' || state.shift.code === 'N2')) {
      nightReportsSection.classList.remove('hidden');
      cargarParteNoche(dateKey); // Carga desde Firebase
    } else {
      nightReportsSection.classList.add('hidden');
    }
  }
}

/* ==========================================================================
   RENDERIZADO DE BLOQUES HORARIOS
   ========================================================================== */
function renderBlocksIntoContainer(state, targetContainer) {
  targetContainer.innerHTML = '';

  if (state.isCleared) {
    targetContainer.innerHTML = `<div class="empty-state">Sin compromisos programados para hoy.</div>`;
    return;
  }

  let blocks = [];
  const shift = state.shift;

  if (state.isVacation) {
    if (state.hasWorkout) blocks.push({ time: '06:30 - 07:30', title: '🏋️ Entreno Manteniendo Rutina', type: 'workout' });
    if (state.hasSchool)  blocks.push({ time: '08:00 - 14:00', title: '🎓 Grado Superior Mantenimiento', type: 'school' });
    blocks.push({ time: 'Todo el día', title: '🌴 VACACIONES: Noche de Trabajo Cancelada', type: 'free' });
  } 
  else if (shift.index === 0) {
    if (state.hasWorkout) blocks.push({ time: '06:30 - 07:30', title: '🏋️ Entrenamiento Fuerza / Cardio', type: 'workout' });
    if (state.hasSchool)  blocks.push({ time: '08:00 - 14:00', title: '🎓 Grado Superior Mantenimiento', type: 'school' });
    blocks.push({ time: '14:00 - 18:00', title: '📖 Estudio / Hobbies / Comida', type: 'free' });
    blocks.push({ time: '18:30 - 20:00', title: '☕ Siesta Pre-turno (90 min)', type: 'sleep' });
    blocks.push({ time: '22:00 - 07:00', title: '💼 Turno de Noche 1 (9h)', type: 'work' });
  } 
  else if (shift.index === 1) {
    if (state.hasWorkout) blocks.push({ time: '06:30 - 07:30', title: '🏋️ Entreno Matutino', type: 'workout' });
    if (state.hasSchool)  blocks.push({ time: '08:00 - 14:00', title: '🎓 Grado Superior Mantenimiento', type: 'school' });
    blocks.push({ time: '14:30 - 21:00', title: '😴 Sueño Principal Recuperador', type: 'sleep' });
    blocks.push({ time: '22:00 - 07:00', title: '💼 Turno de Noche 2 (9h)', type: 'work' });
  } 
  else if (shift.index === 2) {
    blocks.push({ time: '07:30 - 14:30', title: '😴 Sueño Obligatorio Saliente', type: 'sleep' });
    if (state.hasSchool)  blocks.push({ time: '08:00 - 14:00', title: '🎓 Clases (Conflicto de Turno)', type: 'school' });
    blocks.push({ time: '14:30 - 23:00', title: '🎮 Ocio Bajo Impacto / Hobbies', type: 'free' });
  } 
  else {
    if (state.hasWorkout) blocks.push({ time: '06:30 - 07:30', title: '🏋️ Entreno Máximo Rendimiento', type: 'workout' });
    if (state.hasSchool)  blocks.push({ time: '08:00 - 14:00', title: '🎓 Grado Superior Mantenimiento', type: 'school' });
    blocks.push({ time: '14:00 - 23:00', title: '🌟 Tarde Libre / Hobbies / Proyectos', type: 'free' });
    blocks.push({ time: '23:00 - 06:30', title: '😴 Sueño Nocturno Reparador', type: 'sleep' });
  }

  blocks.forEach(b => {
    const div = document.createElement('div');
    div.className = `time-block ${b.type}`;
    div.innerHTML = `<div>${b.title}</div><span>${b.time}</span>`;
    targetContainer.appendChild(div);
  });
}

/* ==========================================================================
   CALENDARIO
   ========================================================================== */
function renderCalendar() {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
  
  monthDisplay.innerText = `${monthNames[month]} ${year}`;
  calendarGrid.innerHTML = '';

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDayIndex = (firstDay.getDay() + 6) % 7;
  const autoWorkoutDays = calculateMonthlyWorkouts(year, month);
  const todayKey = formatDateKey(new Date());

  for (let i = 0; i < startDayIndex; i++) {
    const emptyCell = document.createElement('div');
    emptyCell.className = 'day-cell empty';
    calendarGrid.appendChild(emptyCell);
  }

  for (let day = 1; day <= lastDay.getDate(); day++) {
    const date = new Date(year, month, day);
    const dateKey = formatDateKey(date);
    const state = getEffectiveDayState(date, autoWorkoutDays);

    const cell = document.createElement('div');
    const isRangeStart = rangeStartDate && formatDateKey(rangeStartDate) === dateKey;
    
    cell.className = `day-cell ${selectedDateStr === dateKey ? 'selected' : ''} ${todayKey === dateKey ? 'today' : ''} ${state.isVacation ? 'vacation-day' : ''} ${isRangeStart ? 'range-selecting' : ''}`;
    cell.onclick = () => handleDateClick(date);

    let badgesHTML = '';
    if (state.isVacation) {
      badgesHTML += `<span class="badge badge-vacation">🌴</span>`;
      if (state.hasWorkout) badgesHTML += `<span class="badge badge-workout">🏋️</span>`;
      if (state.hasSchool) badgesHTML += `<span class="badge badge-school">🎓</span>`;
    } else if (!state.isCleared) {
      badgesHTML += `<span class="badge badge-${state.shift.code}">${state.shift.code}</span>`;
      if (state.hasWorkout) badgesHTML += `<span class="badge badge-workout">🏋️</span>`;
      if (state.hasSchool) badgesHTML += `<span class="badge badge-school">🎓</span>`;
    } else {
      badgesHTML += `<span class="badge badge-danger-soft">🧹</span>`;
    }

    cell.innerHTML = `
      <div class="day-num">${day}</div>
      <div class="badges-container">${badgesHTML}</div>
    `;

    calendarGrid.appendChild(cell);
  }

  updateMetricsDisplays();
}

function handleDateClick(date) {
  if (isRangeMode) {
    if (!rangeStartDate) {
      rangeStartDate = date;
      if (btnRangeMode) btnRangeMode.innerText = "👉 Haz clic en el día FIN de vacaciones";
      renderCalendar();
    } else {
      applyVacationRange(rangeStartDate, date);
      isRangeMode = false;
      rangeStartDate = null;
      if (btnRangeMode) {
        btnRangeMode.classList.remove('active');
        btnRangeMode.innerText = "🌴 Seleccionar Rango de Vacaciones";
      }
      selectCalendarDate(date);
    }
  } else {
    selectCalendarDate(date);
  }
}

function applyVacationRange(startDate, endDate) {
  pushStateToHistory();

  let start = normalizeDate(startDate);
  let end = normalizeDate(endDate);

  if (start > end) {
    const temp = start;
    start = end;
    end = temp;
  }

  let runner = new Date(start);
  while (runner <= end) {
    const key = formatDateKey(runner);
    if (!overridesStorage[key]) overridesStorage[key] = {};
    overridesStorage[key].isVacation = true;
    overridesStorage[key].cleared = false;
    runner.setDate(runner.getDate() + 1);
  }

  localStorage.setItem('shift_planner_overrides', JSON.stringify(overridesStorage));
  renderTodayView();
}

function selectCalendarDate(date) {
  selectedDateStr = formatDateKey(date);
  const autoWorkoutDays = calculateMonthlyWorkouts(currentDate.getFullYear(), currentDate.getMonth());
  const state = getEffectiveDayState(date, autoWorkoutDays);

  renderCalendar();

  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  const weekdayOptions = { weekday: 'long' };
  selectedDateTitle.innerText = date.toLocaleDateString('es-ES', options);
  selectedWeekdaySubtitle.innerText = date.toLocaleDateString('es-ES', weekdayOptions).toUpperCase();

  shiftBadgeDetail.className = `badge badge-${state.isVacation ? 'vacation' : state.shift.code}`;
  shiftBadgeDetail.innerText = state.isVacation ? "🌴 Vacaciones" : (state.isCleared ? "Día Vacío" : state.shift.name);

  energyDescription.innerHTML = state.isVacation
    ? `Día marcado como vacaciones. Noche cancelada (Horas: 0h).`
    : (state.isCleared ? `Día despejado manualmente.` : `<strong>Batería estimada: ${state.shift.energyLevel} (${state.shift.energyStatus})</strong><br>${state.shift.desc}`);

  if (restRecommendationText) {
    restRecommendationText.innerHTML = state.isVacation 
      ? `🌴 **Vacaciones:** Noche de trabajo libre. Mantienes tus rutinas de clase o entreno activas.`
      : state.shift.restAdvice;
  }

  btnToggleSchool.className = `btn btn-toggle ${state.hasSchool ? 'active' : 'disabled-override'}`;
  btnToggleSchool.innerText = `🎓 Clase: ${state.hasSchool ? 'SÍ' : 'NO'}`;

  btnToggleWorkout.className = `btn btn-toggle ${state.hasWorkout ? 'active' : 'disabled-override'}`;
  btnToggleWorkout.innerText = `🏋️ Entreno: ${state.hasWorkout ? 'SÍ' : 'NO'}`;

  if (btnToggleVacation) {
    btnToggleVacation.className = `btn btn-vacation ${state.isVacation ? 'active' : ''}`;
    btnToggleVacation.innerText = `🌴 Vacaciones: ${state.isVacation ? 'SÍ' : 'NO'}`;
  }

  renderBlocksIntoContainer(state, timelineContainer);
  renderTasksForDate(selectedDateStr, taskList);

  if (nightReportsSection) {
    if (!state.isVacation && !state.isCleared && (state.shift.code === 'N1' || state.shift.code === 'N2')) {
      nightReportsSection.classList.remove('hidden');
      cargarParteNoche(selectedDateStr); // Carga desde Firebase
    } else {
      nightReportsSection.classList.add('hidden');
    }
  }
}

/* ==========================================================================
   EVENTOS DE BOTONES Y MODIFICACIONES
   ========================================================================== */
function saveCalendarOverride(updateFn) {
  if (!selectedDateStr) return;
  pushStateToHistory();

  if (!overridesStorage[selectedDateStr]) overridesStorage[selectedDateStr] = {};

  updateFn(overridesStorage[selectedDateStr]);
  localStorage.setItem('shift_planner_overrides', JSON.stringify(overridesStorage));

  const [year, month, day] = selectedDateStr.split('-').map(Number);
  selectCalendarDate(new Date(year, month - 1, day));
  renderTodayView();
}

if (btnUndo) btnUndo.addEventListener('click', undoLastAction);

if (btnRangeMode) {
  btnRangeMode.addEventListener('click', () => {
    isRangeMode = !isRangeMode;
    rangeStartDate = null;
    if (isRangeMode) {
      btnRangeMode.classList.add('active');
      btnRangeMode.innerText = "👉 Haz clic en el día INICIO de vacaciones";
    } else {
      btnRangeMode.classList.remove('active');
      btnRangeMode.innerText = "🌴 Seleccionar Rango de Vacaciones";
    }
    renderCalendar();
  });
}

btnToggleSchool.addEventListener('click', () => {
  saveCalendarOverride(ov => {
    const [year, month, day] = selectedDateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    const autoWorkoutDays = calculateMonthlyWorkouts(date.getFullYear(), date.getMonth());
    const currentState = getEffectiveDayState(date, autoWorkoutDays);
    ov.cleared = false;
    ov.noSchool = currentState.hasSchool;
  });
});

btnToggleWorkout.addEventListener('click', () => {
  saveCalendarOverride(ov => {
    const [year, month, day] = selectedDateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    const autoWorkoutDays = calculateMonthlyWorkouts(date.getFullYear(), date.getMonth());
    const currentState = getEffectiveDayState(date, autoWorkoutDays);
    ov.cleared = false;
    ov.workout = !currentState.hasWorkout;
  });
});

if (btnToggleVacation) {
  btnToggleVacation.addEventListener('click', () => {
    saveCalendarOverride(ov => {
      ov.isVacation = !ov.isVacation;
      if (ov.isVacation) ov.cleared = false;
    });
  });
}

btnClearDay.addEventListener('click', () => {
  saveCalendarOverride(ov => { ov.cleared = true; ov.isVacation = false; });
});

btnResetDay.addEventListener('click', () => {
  if (!selectedDateStr) return;
  pushStateToHistory();
  delete overridesStorage[selectedDateStr];
  localStorage.setItem('shift_planner_overrides', JSON.stringify(overridesStorage));
  
  const [year, month, day] = selectedDateStr.split('-').map(Number);
  selectCalendarDate(new Date(year, month - 1, day));
  renderTodayView();
});

/* ==========================================================================
   CONEXIÓN CON FIREBASE: TAREAS Y PARTES DE NOCHE
   ========================================================================== */

// 1. Añadir tarea a Firestore
function addTaskForDate(dateStr, text, slot) {
  db.collection('tareas').add({
    fecha: dateStr,
    texto: text,
    slot: slot || 'General',
    creadoEn: firebase.firestore.FieldValue.serverTimestamp()
  })
  .then((docRef) => {
    console.log("¡Tarea guardada en la base de datos! ID: ", docRef.id);
  })
  .catch((error) => {
    console.error("Error al guardar la tarea: ", error);
  });
}

// 2. Renderizar tareas en tiempo real desde Firestore
function renderTasksForDate(dateKey, listElement) {
  listElement.innerHTML = `<li style="font-size:0.8rem; color:var(--text-dim); text-align:center;">Cargando tareas...</li>`;

  db.collection('tareas')
    .where("fecha", "==", dateKey)
    .onSnapshot((querySnapshot) => {
      listElement.innerHTML = '';

      if (querySnapshot.empty) {
        listElement.innerHTML = `<li style="font-size:0.8rem; color:var(--text-dim); text-align:center;">No hay tareas ni hobbies guardados.</li>`;
        return;
      }

      querySnapshot.forEach((doc) => {
        const task = doc.data();
        const docId = doc.id;

        const li = document.createElement('li');
        li.className = 'task-item';
        li.innerHTML = `
          <div>
            <span>${task.texto}</span>
            <span class="task-tag">${task.slot || 'General'}</span>
          </div>
          <button class="delete-btn" onclick="deleteTaskFromFirebase('${docId}')">&times;</button>
        `;
        listElement.appendChild(li);
      });
    }, (error) => {
      console.error("Error al escuchar las tareas: ", error);
      listElement.innerHTML = `<li style="font-size:0.8rem; color:red; text-align:center;">Error al cargar tareas.</li>`;
    });
}

// 3. Borrar tarea de Firestore
function deleteTaskFromFirebase(docId) {
  db.collection('tareas').doc(docId).delete()
    .then(() => {
      console.log("Tarea eliminada de la base de datos.");
    })
    .catch((error) => {
      console.error("Error al eliminar la tarea: ", error);
    });
}

// 4. Cargar Parte de Noche desde Firestore
function cargarParteNoche(dateKey) {
  if (!nightReportsSection) return;

  db.collection('partes_noche').doc(dateKey).get()
    .then((doc) => {
      if (doc.exists) {
        const report = doc.data();
        reportSecurity.value = report.security || '';
        reportActas.value = report.actas || 0;
        reportDetenidos.value = report.detenidos || 0;
        reportIncidencias.value = report.incidencias || '';
      } else {
        reportSecurity.value = '';
        reportActas.value = 0;
        reportDetenidos.value = 0;
        reportIncidencias.value = '';
      }
    })
    .catch((error) => {
      console.error("Error al cargar el parte de noche: ", error);
    });
}

// 5. Guardar Parte de Noche en Firestore
nightReportForm.addEventListener('submit', (e) => {
  e.preventDefault();
  if (!selectedDateStr) return;

  const reportData = {
    security: reportSecurity.value.trim(),
    actas: parseInt(reportActas.value) || 0,
    detenidos: parseInt(reportDetenidos.value) || 0,
    incidencias: reportIncidencias.value.trim(),
    actualizadoEn: firebase.firestore.FieldValue.serverTimestamp()
  };

  db.collection('partes_noche').doc(selectedDateStr).set(reportData)
    .then(() => {
      alert('✅ Parte de noche guardado correctamente en Firebase');
    })
    .catch((error) => {
      console.error("Error al guardar el parte: ", error);
    });
});

/* ==========================================================================
   NAVEGACIÓN Y FORMULARIOS
   ========================================================================== */
btnOpenCalendar.addEventListener('click', () => {
  viewToday.classList.add('hidden');
  viewCalendar.classList.remove('hidden');
  currentDate = new Date();
  renderCalendar();
  selectCalendarDate(new Date());
});

btnBackToToday.addEventListener('click', () => {
  viewCalendar.classList.add('hidden');
  viewToday.classList.remove('hidden');
  renderTodayView();
});

todayTaskForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const text = todayTaskInput.value.trim();
  const slot = todayTaskSlot.value;
  if (text) {
    addTaskForDate(formatDateKey(new Date()), text, slot);
    todayTaskInput.value = '';
  }
});

taskForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const text = taskInput.value.trim();
  const slot = taskTimeSlot.value;
  if (text && selectedDateStr) {
    addTaskForDate(selectedDateStr, text, slot);
    taskInput.value = '';
  }
});

todayToggleSchool.addEventListener('click', () => toggleOverrideForDate(new Date(), 'noSchool'));
todayToggleWorkout.addEventListener('click', () => toggleOverrideForDate(new Date(), 'workout'));

function toggleOverrideForDate(date, field) {
  pushStateToHistory();
  const dateKey = formatDateKey(date);
  if (!overridesStorage[dateKey]) overridesStorage[dateKey] = {};
  
  const autoWorkoutDays = calculateMonthlyWorkouts(date.getFullYear(), date.getMonth());
  const state = getEffectiveDayState(date, autoWorkoutDays);

  if (field === 'noSchool') overridesStorage[dateKey].noSchool = state.hasSchool;
  if (field === 'workout') overridesStorage[dateKey].workout = !state.hasWorkout;
  overridesStorage[dateKey].cleared = false;

  localStorage.setItem('shift_planner_overrides', JSON.stringify(overridesStorage));
  renderTodayView();
}

btnPrevMonth.addEventListener('click', () => { 
  currentDate.setMonth(currentDate.getMonth() - 1); 
  renderCalendar(); 
});

btnNextMonth.addEventListener('click', () => { 
  currentDate.setMonth(currentDate.getMonth() + 1); 
  renderCalendar(); 
});

// Nota: La exportación a Excel sigue funcionando recopilando lo que esté visible o se puede adaptar si guardas todo en Firebase, pero de momento mantiene la estructura local para generar el archivo de forma instantánea.
btnExportExcel.addEventListener('click', () => {
  db.collection('partes_noche').get().then((querySnapshot) => {
    const dataToExport = [];
    querySnapshot.forEach((doc) => {
      const report = doc.data();
      dataToExport.push({
        "Fecha": doc.id,
        "Seguridad / Novedades": report.security || 'Sin datos',
        "Actas": report.actas || 0,
        "Detenidos": report.detenidos || 0,
        "Incidencias Reseñables": report.incidencias || 'Sin incidencias'
      });
    });

    if (dataToExport.length === 0) {
      alert("No hay partes de noche guardados para exportar.");
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Partes Nocturnos");
    XLSX.writeFile(workbook, `Partes_Nocturnos_${formatDateKey(new Date())}.xlsx`);
  });
});

/* ==========================================================================
   SISTEMA DE RESUMEN EMERGENTE NOCTURNO
   ========================================================================== */
function showTomorrowSummary() {
  const modalElem = document.getElementById('summary-modal');
  const dateElem = document.getElementById('summary-date-text');
  const listElem = document.getElementById('summary-list');

  if (!modalElem || !dateElem || !listElem) return;

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  const tomorrowKey = formatDateKey(tomorrow);
  const autoWorkouts = calculateMonthlyWorkouts(tomorrow.getFullYear(), tomorrow.getMonth());
  const state = getEffectiveDayState(tomorrow, autoWorkouts);

  const options = { weekday: 'long', day: 'numeric', month: 'long' };
  dateElem.innerText = `Mañana, ${tomorrow.toLocaleDateString('es-ES', options)}`;

  listElem.innerHTML = '';
  let items = [];

  if (state.isVacation) {
    items.push({ text: '🌴 Vacaciones (Noche Cancelada)', time: 'Todo el día', type: 'workout' });
  } else if (!state.isCleared) {
    if (state.shift.code === 'N1') {
      items.push({ text: '💼 Turno de Noche 1 (9h)', time: '22:00 - 07:00', type: 'work' });
      items.push({ text: '☕ Siesta Pre-turno', time: '18:30 - 20:00', type: 'work' });
    } else if (state.shift.code === 'N2') {
      items.push({ text: '💼 Turno de Noche 2 (9h)', time: '22:00 - 07:00', type: 'work' });
    } else if (state.shift.code === 'L1') {
      items.push({ text: '🛌 Saliente de Noche (Descanso)', time: '07:30 - 14:30', type: 'work' });
    } else {
      items.push({ text: `🌟 ${state.shift.name}`, time: 'Libre', type: 'workout' });
    }
  }

  if (state.hasSchool && !state.isCleared) {
    items.push({ text: '🎓 Grado Superior Mantenimiento', time: '08:00 - 14:00', type: 'school' });
  }
  if (state.hasWorkout && !state.isCleared) {
    items.push({ text: '🏋️ Entrenamiento Programado', time: '06:30 - 07:30', type: 'workout' });
  }

  if (items.length === 0) {
    listElem.innerHTML = `<div class="empty-state">No hay nada programado para mañana. ¡Día totalmente libre!</div>`;
  } else {
    items.forEach(item => {
      const div = document.createElement('div');
      div.className = `summary-item ${item.type}`;
      div.innerHTML = `<span>${item.text}</span><strong>${item.time}</strong>`;
      listElem.appendChild(div);
    });
  }

  modalElem.classList.remove('hidden');
}

const btnCloseModal = document.getElementById('btn-close-modal');
const btnAckModal = document.getElementById('btn-ack-modal');
const summaryModal = document.getElementById('summary-modal');

if (btnCloseModal && summaryModal) btnCloseModal.onclick = () => summaryModal.classList.add('hidden');
if (btnAckModal && summaryModal) btnAckModal.onclick = () => summaryModal.classList.add('hidden');

function checkNightlySummaryTrigger() {
  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes();

  const isNightTime = (hours > 22) || (hours === 22 && minutes >= 30);
  if (!isNightTime) return;

  const todayKey = formatDateKey(now);
  const lastShown = localStorage.getItem('last_nightly_summary_date');

  if (lastShown !== todayKey) {
    showTomorrowSummary();
    localStorage.setItem('last_nightly_summary_date', todayKey);
  }
}

setInterval(checkNightlySummaryTrigger, 60000);

/* ==========================================================================
   INICIALIZACIÓN
   ========================================================================== */
(function init() {
  renderTodayView();
  checkNightlySummaryTrigger(); 
})();