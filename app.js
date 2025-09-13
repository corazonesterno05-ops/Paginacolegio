/* app.js
 Prototipo de front-end para plataforma escolar.
 Usa localStorage como "backend" simulado para aprender.
*/

(() => {
  // ======== Utilidades ========
  const $ = sel => document.querySelector(sel);
  const create = (tag, attrs = {}, text = '') => {
    const el = document.createElement(tag);
    Object.entries(attrs).forEach(([k,v]) => el.setAttribute(k,v));
    if (text) el.textContent = text;
    return el;
  };
  const genId = (prefix='id') => prefix + '_' + Math.random().toString(36).slice(2,9);
  const todayISO = () => new Date().toISOString();

  // ======== DB Simulado ========
  const DB_KEY = 'school_db_v1';
  const SESSION_KEY = 'school_session_v1';

  function seedData() {
    if (localStorage.getItem(DB_KEY)) return;
    const users = [
      { id: 'u_admin', name: 'Admin Institución', email: 'admin@colegio.com', password: 'admin123', role:'admin' },
      { id: 'u_teacher1', name: 'Profa. Martínez', email: 'teacher1@colegio.com', password: 'teach123', role:'teacher' },
      { id: 'u_student1', name: 'Juan Pérez', email: 'student1@colegio.com', password: 'stud123', role:'student', classroom:'5A' },
      { id: 'u_guardian1', name: 'Mamá Pérez', email: 'parent1@colegio.com', password: 'parent123', role:'guardian', wards:['u_student1'] }
    ];
    const news = [
      { id: genId('news'), title:'Inicio de semestre', content:'Bienvenidos al ciclo 2025-2026', authorId:'u_admin', date:todayISO() }
    ];
    const assignments = [
      { id: genId('asg'), title:'Matemáticas - Tarea 1', description:'Ejercicios 1 a 10', authorId:'u_teacher1', due: new Date(Date.now()+7*24*3600*1000).toISOString() }
    ];
    const grades = []; // {id, assignmentId, studentId, teacherId, grade, date}
    const submissions = []; // {id, assignmentId, studentId, fileName, contentDataURL, date}

    localStorage.setItem(DB_KEY, JSON.stringify({ users, news, assignments, grades, submissions }));
  }

  function loadDB(){ return JSON.parse(localStorage.getItem(DB_KEY) || '{"users":[],"news":[],"assignments":[],"grades":[],"submissions":[]}')}
  function saveDB(db){ localStorage.setItem(DB_KEY, JSON.stringify(db)); }

  // ======== Auth & Session ========
  function getCurrentUser() {
    const sid = localStorage.getItem(SESSION_KEY);
    if (!sid) return null;
    const db = loadDB();
    return db.users.find(u => u.id === sid) || null;
  }
  function setCurrentUser(userId){
    if(userId) localStorage.setItem(SESSION_KEY, userId);
    else localStorage.removeItem(SESSION_KEY);
    renderApp();
  }

  function attemptLogin(email, password){
    const db = loadDB();
    const user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
    if(user) {
      setCurrentUser(user.id);
      return { ok:true, user };
    } else {
      return { ok:false, message:'Credenciales inválidas' };
    }
  }

  function requireRole(roles){
    // roles puede ser string o array
    const user = getCurrentUser();
    if(!user) return false;
    if(typeof roles === 'string') roles = [roles];
    return roles.includes(user.role);
  }

  // ======== Render: header + sidebar + content ========
  function renderHeader(){
    const user = getCurrentUser();
    const userArea = $('#userArea');
    userArea.innerHTML = '';
    if(user){
      const welcome = create('span', {}, `${user.name} · ${user.role}`);
      const logout = create('button', { class:'button btn-ghost' }, 'Cerrar sesión');
      logout.onclick = () => { setCurrentUser(null); showAuth('login'); };
      userArea.appendChild(welcome);
      userArea.appendChild(document.createTextNode(' '));
      userArea.appendChild(logout);
    } else {
      const loginBtn = create('button', { class:'button' }, 'Iniciar / Registrar');
      loginBtn.onclick = () => showAuth('login');
      userArea.appendChild(loginBtn);
    }
  }

  function navLink(label, id, visible = true){
    if(!visible) return null;
    const a = create('a', { href:'#', class:'nav-item', 'data-id': id }, label);
    a.addEventListener('click', e => { e.preventDefault(); router(id); });
    return a;
  }

  function renderSidebar(){
    const sb = $('#sidebar'); sb.innerHTML = '';
    const user = getCurrentUser();
    sb.appendChild(create('div',{class:'card'},'Navegación'));
    if (!user) {
      sb.appendChild(navLink('Noticias', 'news', true));
      sb.appendChild(navLink('Tareas', 'assignments', true));
      return;
    }

    sb.appendChild(navLink('Dashboard', 'dashboard', true));
    sb.appendChild(navLink('Noticias', 'news', true));
    sb.appendChild(navLink('Tareas', 'assignments', true));
    if (requireRole(['teacher','admin'])) {
      sb.appendChild(navLink('Crear noticia', 'create_news', true));
      sb.appendChild(navLink('Crear tarea', 'create_assignment', true));
      sb.appendChild(navLink('Ingresar notas', 'enter_grades', true));
    }
    if (requireRole(['student'])) {
      sb.appendChild(navLink('Mis notas', 'my_grades', true));
      sb.appendChild(navLink('Mis entregas', 'my_submissions', true));
    }
    if (requireRole(['guardian'])) {
      sb.appendChild(navLink('Ver alumno', 'guardian_view', true));
    }
    if (requireRole(['admin'])) {
      sb.appendChild(navLink('Usuarios (admin)', 'manage_users', true));
    }
  }

  // ======== Routes / Renderers ========
  function router(route='dashboard'){
    const content = $('#content'); content.innerHTML = '';
    switch(route){
      case 'dashboard': return renderDashboard(content);
      case 'news': return renderNews(content);
      case 'create_news': return renderCreateNews(content);
      case 'assignments': return renderAssignments(content);
      case 'create_assignment': return renderCreateAssignment(content);
      case 'enter_grades': return renderEnterGrades(content);
      case 'my_grades': return renderMyGrades(content);
      case 'my_submissions': return renderMySubmissions(content);
      case 'guardian_view': return renderGuardianView(content);
      case 'manage_users': return renderManageUsers(content);
      default: return renderDashboard(content);
    }
  }

  function renderApp(){
    renderHeader();
    renderSidebar();
    const user = getCurrentUser();
    if (!user) router('news');
    else router('dashboard');
  }

  // ======== Dashboard ========
  function renderDashboard(root){
    const db = loadDB();
    const user = getCurrentUser();
    const c = create('div');
    c.appendChild(create('h2', {}, 'Dashboard'));
    c.appendChild(create('div', {class:'small'}, `Bienvenido${user ? ' ' + user.name : ''}. Rol: ${user ? user.role : 'visitante'}`));
    // quick stats
    const stats = create('div', {class:'card'});
    stats.innerHTML = `
      <strong>Estadísticas rápidas</strong>
      <div class="small" style="margin-top:8px">Noticias: ${db.news.length} · Tareas: ${db.assignments.length} · Usuarios: ${db.users.length}</div>
    `;
    root.appendChild(c); root.appendChild(stats);

    // Últimas noticias
    root.appendChild(create('div',{class:'card'}, '<strong>Últimas noticias</strong>'));
    const newsList = create('div', {class:'card'});
    db.news.slice().reverse().forEach(n => {
      const author = db.users.find(u=>u.id===n.authorId)?.name||'Anónimo';
      const el = create('div', {}, '');
      el.innerHTML = `<strong>${n.title}</strong> <span class="small">(${new Date(n.date).toLocaleString()})</span><div class="small">Publicado por: ${author}</div><p>${n.content}</p>`;
      newsList.appendChild(el);
    });
    root.appendChild(newsList);
  }

  // ======== Noticias ========
  function renderNews(root){
    const db = loadDB();
    root.appendChild(create('h2', {}, 'Noticias'));
    const container = create('div',{class:'card'});
    db.news.slice().reverse().forEach(n => {
      const author = db.users.find(u=>u.id===n.authorId)?.name || 'Anónimo';
      const item = create('div');
      item.innerHTML = `<h3>${n.title}</h3><div class="small">Publicado: ${new Date(n.date).toLocaleString()} · ${author}</div><p>${n.content}</p>`;
      container.appendChild(item);
    });
    root.appendChild(container);
  }

  function renderCreateNews(root){
    if(!requireRole(['teacher','admin'])) {
      root.appendChild(create('div',{},'No tienes permiso para crear noticias.'));
      return;
    }
    root.appendChild(create('h2', {}, 'Crear noticia'));
    const form = create('div',{class:'card'});
    form.innerHTML = `
      <div class="form-row"><label>Título</label><input id="news_title"></div>
      <div class="form-row"><label>Contenido</label><textarea id="news_content"></textarea></div>
      <button id="saveNews" class="button">Publicar noticia</button>
    `;
    root.appendChild(form);
    $('#saveNews').onclick = () => {
      const title = $('#news_title').value.trim();
      const content = $('#news_content').value.trim();
      if(!title || !content) return alert('Completa título y contenido');
      const db = loadDB();
      const user = getCurrentUser();
      db.news.push({ id: genId('news'), title, content, authorId: user.id, date: todayISO() });
      saveDB(db);
      alert('Noticia publicada ✅');
      router('news');
    };
  }

  // ======== Assignments ========
  function renderAssignments(root){
    const db = loadDB();
    root.appendChild(create('h2', {}, 'Tareas / Assignments'));
    const list = create('div',{class:'card'});
    db.assignments.slice().reverse().forEach(a => {
      const author = db.users.find(u=>u.id===a.authorId)?.name || 'Docente';
      const el = create('div');
      el.innerHTML = `<strong>${a.title}</strong> <div class="small">Por: ${author} · Vence: ${new Date(a.due).toLocaleString()}</div><p>${a.description}</p>`;
      // actions según rol
      const user = getCurrentUser();
      if(user && user.role === 'student'){
        const btn = create('button',{class:'button'}, 'Entregar tarea');
        btn.onclick = () => showSubmitAssignment(a.id);
        el.appendChild(btn);
      }
      list.appendChild(el);
    });
    root.appendChild(list);
  }

  function renderCreateAssignment(root){
    if(!requireRole(['teacher','admin'])) {
      root.appendChild(create('div',{},'No tienes permiso para crear tareas.'));
      return;
    }
    root.appendChild(create('h2', {}, 'Crear tarea'));
    const form = create('div',{class:'card'});
    form.innerHTML = `
      <div class="form-row"><label>Título</label><input id="asg_title"></div>
      <div class="form-row"><label>Descripción</label><textarea id="asg_desc"></textarea></div>
      <div class="form-row"><label>Fecha de entrega</label><input id="asg_due" type="date"></div>
      <button id="createAsg" class="button">Crear tarea</button>
    `;
    root.appendChild(form);
    $('#createAsg').onclick = () => {
      const title = $('#asg_title').value.trim();
      const desc = $('#asg_desc').value.trim();
      const due = $('#asg_due').value;
      if(!title || !desc || !due) return alert('Rellena todos los campos');
      const db = loadDB();
      const user = getCurrentUser();
      db.assignments.push({ id: genId('asg'), title, description: desc, authorId: user.id, due: new Date(due).toISOString() });
      saveDB(db);
      alert('Tarea creada ✅');
      router('assignments');
    };
  }

  // ======== Submit assignment (alumno) ========
  function showSubmitAssignment(assignmentId){
    // modal con formulario de subida
    const modal = $('#modalAuth'); modal.classList.remove('hidden');
    const content = $('#authContent'); content.innerHTML = '';
    content.appendChild(create('h2', {}, 'Entregar tarea'));
    const db = loadDB();
    const asg = db.assignments.find(a=>a.id===assignmentId);
    content.appendChild(create('div', {}, `<strong>${asg.title}</strong><div class="small">${asg.description}</div>`));
    const row = create('div',{class:'form-row'});
    const fileInput = create('input', { type:'file', id:'fileInput' });
    row.appendChild(fileInput);
    content.appendChild(row);
    const submitBtn = create('button',{class:'button'}, 'Subir entrega');
    submitBtn.onclick = () => {
      const files = fileInput.files;
      if(!files || files.length===0) return alert('Selecciona un archivo');
      const file = files[0];
      const reader = new FileReader();
      reader.onload = (ev) => {
        const db2 = loadDB();
        const user = getCurrentUser();
        db2.submissions.push({
          id: genId('sub'),
          assignmentId,
          studentId: user.id,
          fileName: file.name,
          contentDataURL: ev.target.result,
          date: todayISO()
        });
        saveDB(db2);
        alert('Entrega subida ✅');
        modal.classList.add('hidden');
        renderApp();
      };
      reader.readAsDataURL(file); // en prototipo guardamos base64 en localStorage (no ideal para producción)
    };
    content.appendChild(submitBtn);
  }

  // ======== Enter grades (teacher) ========
  function renderEnterGrades(root){
    if(!requireRole(['teacher','admin'])) {
      root.appendChild(create('div',{},'No tienes permiso para ingresar notas.'));
      return;
    }
    const db = loadDB();
    root.appendChild(create('h2', {}, 'Ingresar notas'));
    const form = create('div',{class:'card'});
    // select assignment
    const selAsg = create('select',{id:'selAsg'});
    db.assignments.forEach(a => {
      const opt = create('option', { value: a.id }, `${a.title} (vence ${new Date(a.due).toLocaleDateString()})`);
      selAsg.appendChild(opt);
    });
    form.appendChild(create('div', {class:'form-row'}, 'Selecciona asignación:'));
    form.appendChild(selAsg);
    // select student
    const selStudent = create('select',{id:'selStudent'});
    db.users.filter(u=>u.role==='student').forEach(s => {
      selStudent.appendChild(create('option',{value:s.id}, `${s.name} (${s.email})`));
    });
    form.appendChild(create('div',{class:'form-row'}, 'Selecciona estudiante:'));
    form.appendChild(selStudent);
    form.appendChild(create('div',{class:'form-row'}, '<label>Nota (0-100)</label><input id="gradeVal" type="number" min="0" max="100">'));
    form.appendChild(create('button',{class:'button', id:'saveGrade'}, 'Guardar nota'));
    root.appendChild(form);
    $('#saveGrade').onclick = () => {
      const assignmentId = $('#selAsg').value;
      const studentId = $('#selStudent').value;
      const gradeVal = parseFloat($('#gradeVal').value);
      if(isNaN(gradeVal)) return alert('Ingresa una nota válida');
      const db2 = loadDB();
      const user = getCurrentUser();
      db2.grades.push({ id:genId('grade'), assignmentId, studentId, teacherId:user.id, grade: gradeVal, date: todayISO() });
      saveDB(db2);
      alert('Nota registrada ✅');
      // permanecer en la misma pantalla para más entradas
    };
  }

  // ======== Ver mis notas (student) ========
  function renderMyGrades(root){
    const user = getCurrentUser();
    if(!user || user.role !== 'student'){ root.appendChild(create('div',{},'No estás autorizado')); return; }
    const db = loadDB();
    root.appendChild(create('h2', {}, 'Mis notas'));
    const table = create('table',{class:'table'});
    table.innerHTML = `<thead><tr><th>Asignación</th><th>Nota</th><th>Profesor</th><th>Fecha</th></tr></thead>`;
    const tbody = document.createElement('tbody');
    db.grades.filter(g=>g.studentId===user.id).forEach(g => {
      const asg = db.assignments.find(a=>a.id===g.assignmentId);
      const prof = db.users.find(u=>u.id===g.teacherId);
      const tr = create('tr');
      tr.innerHTML = `<td>${asg?.title||'--'}</td><td>${g.grade}</td><td>${prof?.name||'--'}</td><td>${new Date(g.date).toLocaleString()}</td>`;
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    root.appendChild(table);
  }

  // ======== Mis entregas (student) ========
  function renderMySubmissions(root){
    const user = getCurrentUser();
    if(!user || user.role !== 'student'){ root.appendChild(create('div',{},'No estás autorizado')); return; }
    const db = loadDB();
    root.appendChild(create('h2', {}, 'Mis entregas'));
    const container = create('div',{class:'card'});
    db.submissions.filter(s=>s.studentId===user.id).forEach(s => {
      const asg = db.assignments.find(a=>a.id===s.assignmentId);
      const el = create('div');
      el.innerHTML = `<strong>${asg?.title||'-'}</strong> <div class="small">${s.fileName} · ${new Date(s.date).toLocaleString()}</div>`;
      const a = create('a',{href:s.contentDataURL, target:'_blank', class:'button btn-ghost'}, 'Ver archivo');
      el.appendChild(a);
      container.appendChild(el);
    });
    root.appendChild(container);
  }

  // ======== Guardian view ========
  function renderGuardianView(root){
    const user = getCurrentUser();
    if(!user || user.role !== 'guardian'){ root.appendChild(create('div',{},'No autorizado')); return; }
    const db = loadDB();
    root.appendChild(create('h2', {}, 'Vista del acudiente'));
    const wardId = user.wards && user.wards[0];
    if(!wardId) { root.appendChild(create('div',{},'No tienes alumnos asociados aún.')); return; }
    const student = db.users.find(u=>u.id===wardId);
    root.appendChild(create('div',{class:'card'}, `<strong>Alumno:</strong> ${student.name} · ${student.classroom || ''}`));
    // mostrar notas del alumno
    const table = create('table',{class:'table'});
    table.innerHTML = `<thead><tr><th>Asignación</th><th>Nota</th><th>Profesor</th><th>Fecha</th></tr></thead>`;
    const tbody = document.createElement('tbody');
    db.grades.filter(g=>g.studentId===student.id).forEach(g => {
      const asg = db.assignments.find(a=>a.id===g.assignmentId);
      const prof = db.users.find(u=>u.id===g.teacherId);
      const tr = create('tr');
      tr.innerHTML = `<td>${asg?.title||'--'}</td><td>${g.grade}</td><td>${prof?.name||'--'}</td><td>${new Date(g.date).toLocaleString()}</td>`;
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    root.appendChild(table);
  }

  // ======== Admin - manage users ========
  function renderManageUsers(root){
    if(!requireRole('admin')) { root.appendChild(create('div',{},'No autorizado')); return; }
    const db = loadDB();
    root.appendChild(create('h2', {}, 'Gestión de usuarios (admin)'));
    const card = create('div',{class:'card'});
    // lista
    const table = create('table',{class:'table'});
    table.innerHTML = `<thead><tr><th>Nombre</th><th>Email</th><th>Rol</th><th>Acciones</th></tr></thead>`;
    const tbody = document.createElement('tbody');
    db.users.forEach(u => {
      const tr = create('tr');
      tr.innerHTML = `<td>${u.name}</td><td>${u.email}</td><td>${u.role}</td><td></td>`;
      const actionsTd = tr.querySelector('td:last-child');
      const del = create('button',{class:'button btn-ghost'}, 'Eliminar');
      del.onclick = () => {
        if(!confirm('Eliminar usuario?')) return;
        const db2 = loadDB();
        db2.users = db2.users.filter(x=>x.id!==u.id);
        saveDB(db2);
        renderApp();
      };
      actionsTd.appendChild(del);
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    card.appendChild(table);

    // crear usuario
    const form = create('div',{class:'card'});
    form.innerHTML = `
      <h3>Crear nuevo usuario</h3>
      <div class="form-row"><label>Nombre</label><input id="new_name"></div>
      <div class="form-row"><label>Email</label><input id="new_email"></div>
      <div class="form-row"><label>Contraseña</label><input id="new_pass" type="password"></div>
      <div class="form-row"><label>Rol</label>
        <select id="new_role">
          <option value="student">student</option>
          <option value="guardian">guardian</option>
          <option value="teacher">teacher</option>
          <option value="admin">admin</option>
        </select>
      </div>
      <button id="createUser" class="button">Crear usuario</button>
    `;
    card.appendChild(form);
    root.appendChild(card);
    $('#createUser').onclick = () => {
      const name = $('#new_name').value.trim();
      const email = $('#new_email').value.trim();
      const pass = $('#new_pass').value;
      const role = $('#new_role').value;
      if(!name||!email||!pass) return alert('Rellena todos los campos');
      const db2 = loadDB();
      if(db2.users.some(u=>u.email.toLowerCase()===email.toLowerCase())) return alert('Email ya existe');
      db2.users.push({ id: genId('u'), name, email, password:pass, role });
      saveDB(db2);
      alert('Usuario creado ✅');
      renderApp();
    };
  }

  // ======== Auth modal ========
  function showAuth(mode='login'){
    const modal = $('#modalAuth'); modal.classList.remove('hidden');
    const content = $('#authContent'); content.innerHTML = '';
    const db = loadDB();
    if(mode === 'login'){
      content.appendChild(create('h2', {}, 'Iniciar sesión'));
      content.innerHTML += `<div class="form-row"><label>Email</label><input id="li_email"></div>
                           <div class="form-row"><label>Contraseña</label><input id="li_pass" type="password"></div>
                           <button id="btnLogin" class="button">Entrar</button>
                           <div class="small" style="margin-top:8px">¿No tienes cuenta? <a href="#" id="showRegister">Regístrate</a></div>`;
      $('#btnLogin').onclick = () => {
        const email = $('#li_email').value.trim();
        const pass = $('#li_pass').value;
        const res = attemptLogin(email, pass);
        if(!res.ok) return alert(res.message);
        modal.classList.add('hidden');
        renderApp();
      };
      $('#showRegister').onclick = (e) => { e.preventDefault(); showAuth('register'); };
    } else {
      content.appendChild(create('h2', {}, 'Registro (creación de cuenta básica)'));
      content.innerHTML += `<div class="form-row"><label>Nombre</label><input id="reg_name"></div>
                           <div class="form-row"><label>Email</label><input id="reg_email"></div>
                           <div class="form-row"><label>Contraseña</label><input id="reg_pass" type="password"></div>
                           <div class="form-row"><label>Rol</label>
                             <select id="reg_role">
                               <option value="student">student</option>
                               <option value="guardian">guardian</option>
                             </select>
                           </div>
                           <button id="btnRegister" class="button">Crear cuenta</button>
                           <div class="small" style="margin-top:8px">¿Ya tienes cuenta? <a href="#" id="showLogin">Entrar</a></div>`;
      $('#btnRegister').onclick = () => {
        const name = $('#reg_name').value.trim();
        const email = $('#reg_email').value.trim();
        const pass = $('#reg_pass').value;
        const role = $('#reg_role').value;
        if(!name||!email||!pass) return alert('Rellena todos los campos');
        const db2 = loadDB();
        if(db2.users.some(u=>u.email.toLowerCase()===email.toLowerCase())) return alert('Email ya existe');
        const newUser = { id: genId('u'), name, email, password:pass, role };
        if(role === 'guardian') newUser.wards = []; // el admin puede asociar luego
        db2.users.push(newUser); saveDB(db2);
        alert('Cuenta creada. Inicia sesión.');
        showAuth('login');
      };
      $('#showLogin').onclick = (e) => { e.preventDefault(); showAuth('login'); };
    }
  }
  $('#closeAuth')?.addEventListener('click', () => { $('#modalAuth').classList.add('hidden'); });

  // ======== Init ========
  seedData();
  renderApp();

  // Exponer funciones para interacción desde consola (útil para pruebas)
  window._school = {
    loadDB, saveDB, getCurrentUser, setCurrentUser, seedData
  };

})();
