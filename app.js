/* ==========================================================================
   CONFIGURACIÓN BASE Y ANCLA DEL TURNO
   ========================================================================== */
const ANCHOR_DATE = new Date(2026, 8, 4); // 04/09/2026 = Noche 1

const SHIFT_MAP = {
  0: { code: 'N1', name: 'Noche 1 (22:00 - 07:00)', canWorkout: true, energyLevel: '85%', energyStatus: '⚡ ALTA ENERGÍA (Pre-turno)', desc: 'Mañana óptima a las 06:30 para entrenar. Clase/estudio por la tarde y siesta pre-turno de 19:30 a 21:30.' },
  1: { code: 'N2', name: 'Noche 2 (22:00 - 07:00)', canWorkout: false, energyLevel: '40%', energyStatus: '⚠️ TRABAJANDO / RESERVA BIOMÉTRICA', desc: 'Sin entreno matutino. Sueño de 07:30 a 15:00. Tarde para clases o reposo antes del turno.' },
  2: { code: 'L1', name: 'Saliente de Noche (Libre 1)', canWorkout: false, energyLevel: '30%', energyStatus: '🛑 RECUPERACIÓN BIOMÉTRICA', desc: 'Sueño obligado de 07:30 a 14:30. Sin entreno. Carga de estudio o descanso por la tarde.' },
  3: { code: 'L2', name: 'Día Libre 2', canWorkout: true, energyLevel: '100%', energyStatus: '🌟 PICO COGNITIVO & FÍSICO (10/10)', desc: 'Totalmente descansado. Máximo rendimiento para entreno a las 06:30 y estudio intensivo.' },
  4: { code: 'L3', name: 'Día Libre 3', canWorkout: true, energyLevel: '100%', energyStatus: '🌟 PICO COGNITIVO & FÍSICO (10/10)', desc: 'Pico de energía continuo. Excelente para deportes, proyectos y estudio pesado.' },
  5: { code: 'L4', name: 'Día Libre 4', canWorkout: true, energyLevel: '90%', energyStatus: '🟢 RENDIMIENTO ALTO', desc: 'Último día libre. Entreno matutino perfecto. Conviene acostarse pronto preparando la Noche 1.' }
};

/* ==========================================================================
   ESTADO GLOBAL Y PERSISTENCIA (LOCALSTORAGE)
   ========================================================================== */
let currentDate = new Date(2026, 8, 1);
let selectedDateStr = null;

// Tareas guardadas
let tasksStorage = JSON.parse(localStorage.getItem('shift_planner_tasks')) || {};

// Sobrescrituras manuales guardadas { 'YYYY-MM-DD': { noSchool: bool, workout: bool, cleared: bool } }
let overridesStorage = JSON.parse(localStorage.getItem('shift_planner_overrides')) || {};

/* ==========================================================================
   ELEMENTOS DEL DOM
   ========================================================================== */
const monthDisplay = document.getElementById('current-month-display');
const calendarGrid = document.getElementById('calendar-grid');
const btnPrevMonth = document.getElementById('btn-prev-month');
const btnNextMonth = document.getElementById('btn-next-month');
const btnToday = document.getElementById('btn-today');

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
   FUNCIONES AUXILIARES DE FECHA Y ALGORITMO
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

/* ==========================================================================
   EVALUACIÓN DE ESTADO REAL (ALGORITMO + SOBRESCRITURAS)
   ========================================================================== */
function getEffectiveDayState(date, autoWorkoutDays) {
  const dateKey = formatDateKey(date);
  const dayOfWeek = (date.getDay() + 6) % 7;
  const shift = getShiftInfo(date);
  const override = overridesStorage[dateKey] || {};

  // Estado base automático
  let hasSchool = (dayOfWeek >= 0 && dayOfWeek <= 4);
  let hasWorkout = autoWorkoutDays.has(dateKey);
  let isCleared = false;

  // Aplicar sobrescrituras del usuario
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
   RENDERIZADO DEL CALENDARIO
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
    
    cell.onclick = () => selectDate(date);

    let badgesHTML = '';
    if (!state.isCleared) {
      badgesHTML += `<span class="badge badge-${state.shift.code}">${state.shift.code}</span>`;
      if (state.hasWorkout) badgesHTML += `<span class="badge badge-workout">🏋️ 06:30</span>`;
      if (state.hasSchool) badgesHTML += `<span class="badge badge-school">🎓 Cole</span>`;
    } else {
      badgesHTML += `<span class="badge badge-danger-soft">🧹 Vacío</span>`;
    }

    if (Object.keys(state.override).length > 0) {
      badgesHTML += `<span class="badge badge-modified">✏️ Mod.</span>`;
    }

    cell.innerHTML = `
      <div class="day-num">${day}</div>
      <div class="badges-container">${badgesHTML}</div>
    `;

    calendarGrid.appendChild(cell);
  }
}

/* ==========================================================================
   SELECCIÓN DE DÍA Y PANEL LATERAL
   ========================================================================== */
function selectDate(date) {
  selectedDateStr = formatDateKey(date);
  const autoWorkoutDays = calculateMonthlyWorkouts(currentDate.getFullYear(), currentDate.getMonth());
  const state = getEffectiveDayState(date, autoWorkoutDays);

  renderCalendar();

  // Cabecera
  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  const weekdayOptions = { weekday: 'long' };
  selectedDateTitle.innerText = date.toLocaleDateString('es-ES', options);
  selectedWeekdaySubtitle.innerText = date.toLocaleDateString('es-ES', weekdayOptions).toUpperCase();

  shiftBadgeDetail.className = `badge badge-${state.shift.code}`;
  shiftBadgeDetail.innerText = state.isCleared ? "Día Vacío (Manual)" : state.shift.name;

  // Tarjeta de energía
  if (state.isCleared) {
    energyDescription.innerHTML = `<strong>Día despejado manualmente.</strong> Se han eliminado todas las actividades automáticas (trabajo, clase y entreno).`;
  } else {
    energyDescription.innerHTML = `<strong>Batería estimada: ${state.shift.energyLevel} (${state.shift.energyStatus})</strong><br>${state.shift.desc}`;
  }

  // Actualizar botones de control
  updateControlButtons(state);

  // Renderizar Horario y Tareas
  renderTimeline(state);
  renderTasks();
}

function updateControlButtons(state) {
  // Botón Clase
  if (state.hasSchool) {
    btnToggleSchool.className = "btn btn-toggle active";
    btnToggleSchool.innerText = "🎓 Clase: SÍ";
  } else {
    btnToggleSchool.className = "btn btn-toggle disabled-override";
    btnToggleSchool.innerText = "🎓 Clase: NO";
  }

  // Botón Entreno
  if (state.hasWorkout) {
    btnToggleWorkout.className = "btn btn-toggle active";
    btnToggleWorkout.innerText = "🏋️ Entreno: SÍ";
  } else {
    btnToggleWorkout.className = "btn btn-toggle disabled-override";
    btnToggleWorkout.innerText = "🏋️ Entreno: NO";
  }
}

function renderTimeline(state) {
  timelineContainer.innerHTML = '';

  if (state.isCleared) {
    timelineContainer.innerHTML = `<div class="empty-state">Día totalmente libre sin compromisos programados.</div>`;
    return;
  }

  let blocks = [];
  const shift = state.shift;

  if (shift.index === 0) { // Noche 1
    if (state.hasWorkout) blocks.push({ time: '06:30 - 07:30', title: '🏋️ Entrenamiento Fuerza / Cardio', type: 'workout' });
    if (state.hasSchool)  blocks.push({ time: '15:30 - 19:30', title: '🎓 Grado Superior Mantenimiento', type: 'school' });
    blocks.push({ time: '19:30 - 21:30', title: '☕ Descanso / Siesta Pre-turno', type: 'free' });
    blocks.push({ time: '22:00 - 07:00', title: '💼 Turno de Noche 1', type: 'work' });
  } 
  else if (shift.index === 1) { // Noche 2
    blocks.push({ time: '07:30 - 15:00', title: '😴 Sueño Principal Recuperador', type: 'sleep' });
    if (state.hasWorkout) blocks.push({ time: '06:30 - 07:30', title: '🏋️ Entreno Forzado (Precaución)', type: 'workout' });
    if (state.hasSchool)  blocks.push({ time: '15:30 - 20:30', title: '🎓 Grado Superior Mantenimiento', type: 'school' });
    blocks.push({ time: '22:00 - 07:00', title: '💼 Turno de Noche 2', type: 'work' });
  } 
  else if (shift.index === 2) { // Saliente
    blocks.push({ time: '07:30 - 14:30', title: '😴 Sueño Obligatorio Saliente', type: 'sleep' });
    if (state.hasWorkout) blocks.push({ time: '06:30 - 07:30', title: '🏋️ Entreno Saliente (Alto Impacto)', type: 'workout' });
    if (state.hasSchool)  blocks.push({ time: '16:00 - 19:00', title: '📖 Repaso Ligero / Clases', type: 'school' });
    blocks.push({ time: '19:00 - 23:00', title: '🎮 Ocio Bajo Impacto / Hobbies', type: 'free' });
  } 
  else { // Libres 2, 3 y 4
    if (state.hasWorkout) blocks.push({ time: '06:30 - 07:30', title: '🏋️ Entreno Máximo Rendimiento', type: 'workout' });
    if (state.hasSchool)  blocks.push({ time: '15:30 - 20:30', title: '🎓 Grado Superior Mantenimiento', type: 'school' });
    blocks.push({ time: '20:30 - 23:00', title: '🌟 Tiempo Libre / Hobbies', type: 'free' });
    blocks.push({ time: '23:00 - 06:30', title: '😴 Sueño Nocturno Reparador', type: 'sleep' });
  }

  blocks.forEach(b => {
    const div = document.createElement('div');
    div.className = `time-block ${b.type}`;
    div.innerHTML = `<div>${b.title}</div><span>${b.time}</span>`;
    timelineContainer.appendChild(div);
  });
}

/* ==========================================================================
   MANEJO DE SOBRESCRITURAS MANUALES (BOTONES)
   ========================================================================== */
function saveOverride(updateFn) {
  if (!selectedDateStr) return;
  if (!overridesStorage[selectedDateStr]) {
    overridesStorage[selectedDateStr] = {};
  }

  updateFn(overridesStorage[selectedDateStr]);

  localStorage.setItem('shift_planner_overrides', JSON.stringify(overridesStorage));
  
  // Recargar vista actual
  const [year, month, day] = selectedDateStr.split('-').map(Number);
  selectDate(new Date(year, month - 1, day));
}

btnToggleSchool.addEventListener('click', () => {
  saveOverride(ov => {
    const autoWorkoutDays = calculateMonthlyWorkouts(currentDate.getFullYear(), currentDate.getMonth());
    const [year, month, day] = selectedDateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    const currentState = getEffectiveDayState(date, autoWorkoutDays);

    ov.cleared = false;
    ov.noSchool = currentState.hasSchool; // Invertir estado
  });
});

btnToggleWorkout.addEventListener('click', () => {
  saveOverride(ov => {
    const autoWorkoutDays = calculateMonthlyWorkouts(currentDate.getFullYear(), currentDate.getMonth());
    const [year, month, day] = selectedDateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    const currentState = getEffectiveDayState(date, autoWorkoutDays);

    ov.cleared = false;
    ov.workout = !currentState.hasWorkout; // Invertir estado
  });
});

btnClearDay.addEventListener('click', () => {
  saveOverride(ov => {
    ov.cleared = true;
  });
});

btnResetDay.addEventListener('click', () => {
  if (!selectedDateStr) return;
  delete overridesStorage[selectedDateStr];
  localStorage.setItem('shift_planner_overrides', JSON.stringify(overridesStorage));
  
  const [year, month, day] = selectedDateStr.split('-').map(Number);
  selectDate(new Date(year, month - 1, day));
});

/* ==========================================================================
   GESTIÓN DE TAREAS Y HOBBIES
   ========================================================================== */
function renderTasks() {
  taskList.innerHTML = '';
  if (!selectedDateStr) return;

  const currentTasks = tasksStorage[selectedDateStr] || [];

  if (currentTasks.length === 0) {
    taskList.innerHTML = `<li style="font-size:0.8rem; color:var(--text-dim); text-align:center;">No hay hobbies ni tareas anotadas para este día.</li>`;
    return;
  }

  currentTasks.forEach((task, index) => {
    const li = document.createElement('li');
    li.className = 'task-item';
    li.innerHTML = `
      <div>
        <span>${task.text}</span>
        <span class="task-tag">${task.slot}</span>
      </div>
      <button class="delete-btn" onclick="deleteTask(${index})">&times;</button>
    `;
    taskList.appendChild(li);
  });
}

taskForm.addEventListener('submit', (e) => {
  e.preventDefault();
  if (!selectedDateStr) return alert("Selecciona un día del calendario.");

  const text = taskInput.value.trim();
  const slot = taskTimeSlot.value;

  if (text) {
    if (!tasksStorage[selectedDateStr]) tasksStorage[selectedDateStr] = [];
    tasksStorage[selectedDateStr].push({ text, slot });
    localStorage.setItem('shift_planner_tasks', JSON.stringify(tasksStorage));
    
    taskInput.value = '';
    renderTasks();
  }
});

function deleteTask(index) {
  if (selectedDateStr && tasksStorage[selectedDateStr]) {
    tasksStorage[selectedDateStr].splice(index, 1);
    if (tasksStorage[selectedDateStr].length === 0) delete tasksStorage[selectedDateStr];
    localStorage.setItem('shift_planner_tasks', JSON.stringify(tasksStorage));
    renderTasks();
  }
}

/* ==========================================================================
   NAVEGACIÓN DE MES E INICIALIZACIÓN
   ========================================================================== */
btnPrevMonth.addEventListener('click', () => {
  currentDate.setMonth(currentDate.getMonth() - 1);
  renderCalendar();
});

btnNextMonth.addEventListener('click', () => {
  currentDate.setMonth(currentDate.getMonth() + 1);
  renderCalendar();
});

btnToday.addEventListener('click', () => {
  currentDate = new Date();
  selectDate(currentDate);
});

(function init() {
  renderCalendar();
  selectDate(new Date(2026, 8, 4)); // Seleccionar por defecto el 4 de Septiembre de 2026
})();