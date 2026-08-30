/* ==========================================================================
   CONFIGURACIÓN BASE Y ANCLA DEL TURNO
   ========================================================================== */
const ANCHOR_DATE = new Date(2026, 8, 4); // 04/09/2026 = Noche 1

const SHIFT_MAP = {
  0: { code: 'N1', name: 'Noche 1 (22:00 - 07:00)', canWorkout: true, energyLevel: '85%', energyStatus: '⚡ ALTA ENERGÍA (Pre-turno)', desc: 'Mañana de clase (08:00-14:00) o entreno previo a las 06:30. Tarde libre con siesta pre-turno obligatoria (18:00-21:00).' },
  1: { code: 'N2', name: 'Noche 2 (22:00 - 07:00)', canWorkout: false, energyLevel: '40%', energyStatus: '⚠️ TRABAJANDO / RESERVA BIOMÉTRICA', desc: 'Salida del primer turno a las 07:00. Si hay clase (08:00-14:00), el descanso principal se traslada a la tarde (14:30-21:00).' },
  2: { code: 'L1', name: 'Saliente de Noche (Libre 1)', canWorkout: false, energyLevel: '30%', energyStatus: '🛑 RECUPERACIÓN BIOMÉTRICA', desc: 'Salida del turno a las 07:00. Sueño recuperador matutino/mediodía. Tarde libre para descanso pasivo u ocio de bajo impacto.' },
  3: { code: 'L2', name: 'Día Libre 2', canWorkout: true, energyLevel: '100%', energyStatus: '🌟 PICO COGNITIVO & FÍSICO (10/10)', desc: 'Totalmente restaurado. Entreno 06:30, clase 08:00-14:00 y toda la tarde libre para hobbies, estudio o proyectos.' },
  4: { code: 'L3', name: 'Día Libre 3', canWorkout: true, energyLevel: '100%', energyStatus: '🌟 PICO COGNITIVO & FÍSICO (10/10)', desc: 'Rendimiento máximo. Entreno 06:30, clase por la mañana y tarde completa para deporte, estudio o vida social.' },
  5: { code: 'L4', name: 'Día Libre 4', canWorkout: true, energyLevel: '90%', energyStatus: '🟢 RENDIMIENTO ALTO', desc: 'Último libre. Clase de 08:00 a 14:00. Tarde relajada y descanso temprano preparando el reinicio de noche de mañana.' }
};

/* ==========================================================================
   ESTADO GLOBAL Y PERSISTENCIA
   ========================================================================== */
let currentDate = new Date(); // Fecha navegada en calendario
const todayDate = new Date(); // Día actual real
let selectedDateStr = formatDateKey(todayDate);

let tasksStorage = JSON.parse(localStorage.getItem('shift_planner_tasks')) || {};
let overridesStorage = JSON.parse(localStorage.getItem('shift_planner_overrides')) || {};

/* ==========================================================================
   ELEMENTOS DEL DOM
   ========================================================================== */
// Vistas
const viewToday = document.getElementById('view-today');
const viewCalendar = document.getElementById('view-calendar');
const btnOpenCalendar = document.getElementById('btn-open-calendar');
const btnBackToToday = document.getElementById('btn-back-to-today');

// Vista Hoy
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

// Vista Calendario
const monthDisplay = document.getElementById('current-month-display');
const calendarGrid = document.getElementById('calendar-grid');
const btnPrevMonth = document.getElementById('btn-prev-month');
const btnNextMonth = document.getElementById('btn-next-month');

const selectedDateTitle = document.getElementById('selected-date-title');
const selectedWeekdaySubtitle = document.getElementById('selected-weekday-subtitle');
const shiftBadgeDetail = document.getElementById('shift-badge-detail');
const energyDescription = document.getElementById('energy-description');
const timelineContainer = document.getElementById('timeline-container');

const btnToggleSchool = document.getElementById('btn-toggle-school');
const btnToggleWorkout = document.getElementById('btn-toggle-workout');
const btnClearDay = document.getElementById('btn-clear-day');
const btnResetDay = document.getElementById('btn-reset-day');

const taskForm = document.getElementById('task-form');
const taskInput = document.getElementById('task-input');
const taskTimeSlot = document.getElementById('task-time-slot');
const taskList = document.getElementById('task-list');

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

  if (override.noSchool !== undefined) hasSchool = !override.noSchool;
  if (override.workout !== undefined) hasWorkout = override.workout;
  if (override.cleared === true) {
    isCleared = true;
    hasSchool = false;
    hasWorkout = false;
  }

  return { shift, hasSchool, hasWorkout, isCleared, override };
}

/* ==========================================================================
   RENDERIZADO DE LA PANTALLA PRINCIPAL (HOY)
   ========================================================================== */
function renderTodayView() {
  const today = new Date();
  const dateKey = formatDateKey(today);
  const autoWorkoutDays = calculateMonthlyWorkouts(today.getFullYear(), today.getMonth());
  const state = getEffectiveDayState(today, autoWorkoutDays);

  const options = { weekday: 'long', day: 'numeric', month: 'long' };
  todayFullDate.innerText = today.toLocaleDateString('es-ES', options);

  todayShiftBadge.className = `badge badge-${state.shift.code}`;
  todayShiftBadge.innerText = state.isCleared ? "Día Vacío" : state.shift.name;

  todayEnergyStatus.innerText = state.shift.energyStatus;
  todayEnergyDesc.innerHTML = state.isCleared 
    ? `Día despejado manualmente.`
    : `<strong>Batería: ${state.shift.energyLevel}</strong> — ${state.shift.desc}`;

  // Botones de conmutación
  todayToggleSchool.className = `btn btn-toggle ${state.hasSchool ? 'active' : 'disabled-override'}`;
  todayToggleSchool.innerText = `🎓 Clase: ${state.hasSchool ? 'SÍ' : 'NO'}`;

  todayToggleWorkout.className = `btn btn-toggle ${state.hasWorkout ? 'active' : 'disabled-override'}`;
  todayToggleWorkout.innerText = `🏋️ Entreno: ${state.hasWorkout ? 'SÍ' : 'NO'}`;

  // Timeline
  renderBlocksIntoContainer(state, todayTimeline);

  // Tareas
  renderTasksForDate(dateKey, todayTaskList);
}

/* ==========================================================================
   RENDERIZADO DE TIMELINE
   ========================================================================== */
function renderBlocksIntoContainer(state, targetContainer) {
  targetContainer.innerHTML = '';

  if (state.isCleared) {
    targetContainer.innerHTML = `<div class="empty-state">Sin compromisos programados para hoy.</div>`;
    return;
  }

  let blocks = [];
  const shift = state.shift;

  if (shift.index === 0) { // Noche 1
    if (state.hasWorkout) blocks.push({ time: '06:30 - 07:30', title: '🏋️ Entrenamiento Fuerza / Cardio', type: 'workout' });
    if (state.hasSchool)  blocks.push({ time: '08:00 - 14:00', title: '🎓 Grado Superior Mantenimiento', type: 'school' });
    blocks.push({ time: '14:00 - 18:00', title: '📖 Estudio / Hobbies / Comida', type: 'free' });
    blocks.push({ time: '18:00 - 21:00', title: '☕ Descanso / Siesta Pre-turno', type: 'free' });
    blocks.push({ time: '22:00 - 07:00', title: '💼 Turno de Noche 1', type: 'work' });
  } 
  else if (shift.index === 1) { // Noche 2
    if (state.hasWorkout) blocks.push({ time: '06:30 - 07:30', title: '🏋️ Entreno Matutino', type: 'workout' });
    if (state.hasSchool)  blocks.push({ time: '08:00 - 14:00', title: '🎓 Grado Superior Mantenimiento', type: 'school' });
    blocks.push({ time: '14:30 - 21:00', title: '😴 Sueño Principal Recuperador', type: 'sleep' });
    blocks.push({ time: '22:00 - 07:00', title: '💼 Turno de Noche 2', type: 'work' });
  } 
  else if (shift.index === 2) { // Saliente
    blocks.push({ time: '07:30 - 14:30', title: '😴 Sueño Obligatorio Saliente', type: 'sleep' });
    if (state.hasSchool)  blocks.push({ time: '08:00 - 14:00', title: '🎓 Clases (Conflicto de Turno)', type: 'school' });
    blocks.push({ time: '14:30 - 23:00', title: '🎮 Ocio Bajo Impacto / Hobbies', type: 'free' });
  } 
  else { // Libres 2, 3 y 4
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
   RENDERIZADO DE CALENDARIO
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
    cell.className = `day-cell ${selectedDateStr === dateKey ? 'selected' : ''} ${todayKey === dateKey ? 'today' : ''} ${state.isCleared ? 'cleared-day' : ''}`;
    
    cell.onclick = () => selectCalendarDate(date);

    let badgesHTML = '';
    if (!state.isCleared) {
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

  shiftBadgeDetail.className = `badge badge-${state.shift.code}`;
  shiftBadgeDetail.innerText = state.isCleared ? "Día Vacío" : state.shift.name;

  energyDescription.innerHTML = state.isCleared 
    ? `Día despejado manualmente.` 
    : `<strong>Batería estimada: ${state.shift.energyLevel} (${state.shift.energyStatus})</strong><br>${state.shift.desc}`;

  btnToggleSchool.className = `btn btn-toggle ${state.hasSchool ? 'active' : 'disabled-override'}`;
  btnToggleSchool.innerText = `🎓 Clase: ${state.hasSchool ? 'SÍ' : 'NO'}`;

  btnToggleWorkout.className = `btn btn-toggle ${state.hasWorkout ? 'active' : 'disabled-override'}`;
  btnToggleWorkout.innerText = `🏋️ Entreno: ${state.hasWorkout ? 'SÍ' : 'NO'}`;

  renderBlocksIntoContainer(state, timelineContainer);
  renderTasksForDate(selectedDateStr, taskList);
}

/* ==========================================================================
   GESTIÓN DE TAREAS
   ========================================================================== */
function renderTasksForDate(dateKey, listElement) {
  listElement.innerHTML = '';
  const tasks = tasksStorage[dateKey] || [];

  if (tasks.length === 0) {
    listElement.innerHTML = `<li style="font-size:0.8rem; color:var(--text-dim); text-align:center;">No hay tareas ni hobbies guardados.</li>`;
    return;
  }

  tasks.forEach((task, index) => {
    const li = document.createElement('li');
    li.className = 'task-item';
    li.innerHTML = `
      <div>
        <span>${task.text}</span>
        <span class="task-tag">${task.slot}</span>
      </div>
      <button class="delete-btn" onclick="deleteTask('${dateKey}', ${index})">&times;</button>
    `;
    listElement.appendChild(li);
  });
}

function addTaskForDate(dateKey, text, slot) {
  if (!tasksStorage[dateKey]) tasksStorage[dateKey] = [];
  tasksStorage[dateKey].push({ text, slot });
  localStorage.setItem('shift_planner_tasks', JSON.stringify(tasksStorage));
  renderTodayView();
  if (!viewCalendar.classList.contains('hidden')) renderTasksForDate(selectedDateStr, taskList);
}

function deleteTask(dateKey, index) {
  if (tasksStorage[dateKey]) {
    tasksStorage[dateKey].splice(index, 1);
    if (tasksStorage[dateKey].length === 0) delete tasksStorage[dateKey];
    localStorage.setItem('shift_planner_tasks', JSON.stringify(tasksStorage));
    renderTodayView();
    if (!viewCalendar.classList.contains('hidden')) renderTasksForDate(selectedDateStr, taskList);
  }
}

/* ==========================================================================
   EVENTOS Y CAMBIO DE VISTAS
   ========================================================================== */
btnOpenCalendar.addEventListener('click', () => {
  viewToday.classList.add('hidden');
  viewCalendar.classList.remove('hidden');
  renderCalendar();
  selectCalendarDate(new Date());
});

btnBackToToday.addEventListener('click', () => {
  viewCalendar.classList.add('hidden');
  viewToday.classList.remove('hidden');
  renderTodayView();
});

// Formularios
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

// Conmutadores vista de Hoy
todayToggleSchool.addEventListener('click', () => toggleOverrideForDate(new Date(), 'noSchool'));
todayToggleWorkout.addEventListener('click', () => toggleOverrideForDate(new Date(), 'workout'));

function toggleOverrideForDate(date, field) {
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

// Navegación de meses
btnPrevMonth.addEventListener('click', () => { currentDate.setMonth(currentDate.getMonth() - 1); renderCalendar(); });
btnNextMonth.addEventListener('click', () => { currentDate.setMonth(currentDate.getMonth() + 1); renderCalendar(); });

/* Inicialización */
(function init() {
  renderTodayView();
})();