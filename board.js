/* global $, dist, clamp, autoResize, makeDynamicField, Template, Task, mex */

/** Stores the state of a board. @constructor */
function Board({
  name = '',
  description = '',
  template = Template.default,
  list = false,
}) {
  this.name = name;
  this.description = description;
  this.template = template;
  this.list = list;
  this.dummyTask = Task.renderDummy();
  this.loadTemplate();
}

Board.storableProperties = ['name', 'description', 'template',  'list'];

Board.prototype.toJSON = function () {
  const obj = {};
  Board.storableProperties.map( key => obj[key] = this[key] );
  return obj;
};

// Updates the state and the DOM
Board.prototype.newTask = function (props = {}) {
  const task = new Task(props);

  if (task.x === undefined) {
    const pos = this.newTaskPosition();
    task.x = pos.x;
    task.y = pos.y;
  }

  this.tasks.set(task.created, task);
  this.moveTaskToTop(task);
  return task;
}

Board.prototype.newTaskPosition = function () {
  let y0 = 25;
  let x0 = 10;

  const rect = this.node.getBoundingClientRect();
  const pos = {x: x0, y: y0};
  const bad = p => Array.from(this.tasks.values()).some(t => dist(p, t) < 5);
  while (bad(pos)) {
    pos.x += 60;
    pos.y += 10;
    if (pos.x + Task.MAX_WIDTH > rect.width) {
      y0 += 80;
      pos.x = x0;
      pos.y = y0;
    }
    if (pos.x + Task.MAX_WIDTH > rect.width && pos.y > 800) {
      return {x: 25, y: 25}; //Don't loop forever
    }
  }
  return pos;
}

// Reindexes the order values in the category that the task is in
Board.prototype.removeTaskFromCategory = function (task) {
  if (task.category === undefined) return false;
  const nodes = Array.from(this.categoryNodes[task.category].children);
  const tasks = nodes.map(node => this.tasks.get(node.dataset.created));
  tasks.forEach(t => { if (t.order > task.order) {
    t.order--;
    t.setStyles();
  }
  });
  task.order = null; // Important
}

/**
 * Sets the tasks category and position values and attaches the task to the DOM 
 * @param task - A task object 
 * @param cat - Category. If unspecified, uses the template default category.
 * @param pos - The position to attach to. If unspecified, adds to the end.
 */
Board.prototype.putTask = function (task, cat, pos) {
  // TODO Check if cat is reasonable and throw error otherwise
  task.category = cat === undefined ? this.currentTemplate.def : cat;
  const categoryNode = this.categoryNodes[task.category];
  const tasks = Array.from(categoryNode.children)
    .map(node => this.tasks.get(node.dataset.created));
  const orders = tasks.map(task => task.order);

  for (let t of categoryNode.children) t.classList.remove('drop-hover');

  if (pos === undefined) { // Put element in least unoccupied slot
    pos = 1;
    while (orders.includes(pos)) pos++;
    task.order = pos;
  } else {
    if (orders.includes(pos)) { // Shift elements
      tasks.forEach(t => { if (t !== task && t.order >= pos) {
          t.order++;
          t.setStyles();
        } });
    }
    task.order = pos;
  }
  task.setStyles();
  task.attach(this.categoryNodes[task.category]);

  return task;
}

Board.prototype.setCategoryOrders = function(cat, pos) {
  const taskNodes = Array.from(this.categoryNodes[cat].children);
  const tasks = taskNodes.map(node => this.tasks.get(node.dataset.created));
  const orders = tasks.map(task => task.order);
  if (pos === undefined) {
    pos = 1;
    while (orders.includes(pos))
      pos++
    return pos;
  }
  tasks.forEach(task => { if (task.order >= pos) task.order++; });
  return pos;
}

/**
 * Sets the task.category property, updates the category orders, and updates the DOM.
 */
Board.prototype.moveTaskToCategory = function (task, cat, pos) {
  this.removeTaskFromCategory(task);
  this.putTask(task, cat, pos);
}

Board.prototype.render = function () {
  const element = document.createElement('div');

  element.classList.add('board');
  if (this.list) element.classList.add('list-view');
  this.node = element;

  this.categoryNodes = {};
  this.currentTemplate.attachCategories(this.node, this.categoryNodes);

  // Add the tasks
  this.tasks.forEach(t => this.putTask(t, t.category, t.order));
  this.addHandlers();
}

/** Makes sure board is rendered and attaches it to the DOM target node */
Board.prototype.attach = function (target, spinner) {
  if (spinner !== undefined) spinner.classList.add('on');
  if (this.node === undefined) this.render();
  // Replaces the element `<div id="board">` with our new element
  target.innerHTML = '';
  target.appendChild(this.dummyTask);
  target.appendChild(this.node);
  if (spinner !== undefined) spinner.classList.remove('on');
};

Board.prototype.addHandlers = function () {
  this.node.addEventListener('taskchange', () => this.saveTasks());
  this.node.addEventListener('taskdelete', e => this.deleteTask(e.detail));
  this.makeTasksDraggable();
};

/** Attaches all event listeners to the DOM element for a task */
Board.prototype.makeTasksDraggable = function () {
  this.dragNewTaskHandler = event => {
    console.log('dragNewTaskHandler');
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setDragImage(this.dummyTask, 0, 0);

    const rect = this.node.getBoundingClientRect();
    const data = {
      task: null,
      dx: -rect.x,
      dy: -rect.y 
    };
    event.dataTransfer.setData('text/plain', JSON.stringify(data));
  };

  const dragstartHandler = event => {
    event.stopPropagation();
    // Check whether ancestor contains class
    let elem = event.target;
    while (!elem.classList.contains('todo') && elem !== document)
      elem = elem.parentNode;
    if (!elem.classList.contains('todo')) return false;

    const task = this.tasks.get(elem.dataset.created);
    if (!this.list && task.pin) return false;

    elem.classList.toggle('on'); // TODO does this work?

    event.dataTransfer.effectAllowed = 'move'; // ?
    event.dataTransfer.dropEffect = 'move'; // ?
    const data = { 
      task: task.created,
      dx: task.x - event.clientX,
      dy: task.y - event.clientY
    }
    event.dataTransfer.setData('text/plain', JSON.stringify(data));

    return false;
  };

  const dragoverHandler = event => {
    event.preventDefault();
    if (!this.list) return false;
    if (event.target.classList === undefined) return false;
    if (event.target.classList.contains('task-drop-target')) {
      event.target.classList.add('drop-hover');
    }
  };

  const dragleaveHandler = event => {
    if (!this.list) return false;
    if (event.target.classList === undefined) return false;
    if (event.target.classList.contains('task-drop-target')) {
      event.target.classList.remove('drop-hover');
    }
  };

  const dropHandler = event => {
    event.preventDefault();
    const data = JSON.parse(event.dataTransfer.getData('text/plain'));
    let task;

    event.target.classList.remove('drop-hover');

    if (this.list) {
      console.log('Dragging new task into list mode.');
      var elem = event.target;
      while (!elem.classList.contains('task-drop-target')) {
        if (elem == document.body) return false;
        elem = elem.parentElement;
      }
      if (elem === task) return false; // Dragging task to itself
      task = data.task === null 
        ? this.newTask() : this.tasks.get(data.task);

      if (elem.classList.contains('task-container')) {
        this.moveTaskToCategory(task, Template.getCatFromClassList(elem));
      }
      if (elem.classList.contains('category')) {
        this.moveTaskToCategory(task, Template.getCatFromClassList(elem));
      }
      if (elem.classList.contains('todo')) {
        const target = this.tasks.get(elem.dataset.created);
        this.moveTaskToCategory(task, target.category, target.order);
      }
    }

    if (!this.list) {
      if (data.task === null) {
        task = this.newTask();
        this.putTask(task);
      } else {
        task = this.tasks.get(data.task);
      }

      task.x = clamp (0, data.dx + event.clientX,
        this.node.clientWidth - task.node.offsetWidth);
      task.y = clamp (0, data.dy + event.clientY, this.node.clientHeight);
      this.moveTaskToTop(task);
      task.setStyles();
      if (data.task === null) task.nodes.text.focus();
    }

    this.saveTasks();
  };

  this.node.addEventListener('dragstart', dragstartHandler);
  this.node.addEventListener('dragover', dragoverHandler);
  this.node.addEventListener('dragleave', dragleaveHandler);
  this.node.addEventListener('drop', dropHandler);
  this.node.addEventListener('dragend', event => {
    event;//TODO anything else?
  });
};

/** Loads from localStorage to populate the tasks property with Tasks */
Board.prototype.loadTasks = function () {
  const tasksStored = localStorage.getItem(`tasks-${this.name}`);
  const tasksStr = tasksStored !== null ? tasksStored : 'null';

  if (tasksStored === null) return this.tasks = new Map();

  return this.tasks = new Map(JSON.parse(tasksStr).map( props =>
    [props.created, new Task(props)]));
};

Board.prototype.loadTemplate = function () {
  this.currentTemplate = Template.getTemplate(this.template);
};

Board.prototype.moveTaskToTop = function (task) {
  const tasks = Array.from(this.tasks.values());
  const zs = tasks.map(t => t === task ? null : t.z);
  if (task.z !== undefined)
    this.tasks.forEach(t => { if (t.z > task.z) t.z--; t.setStyles(); });
  let mex = Board.BASE_Z_INDEX;
  while (zs.includes(mex)) mex++;
  task.z = mex;
};

Board.prototype.deleteTask = function (task) {
  this.removeTaskFromCategory(task);
  this.tasks.delete(task.created);
  task.node.remove();
  this.saveTasks();
};

Board.prototype.deleteTasksFromStorage = function () {
  localStorage.removeItem(`tasks-${this.name}`);
};

/** Creates the DOM node for the board listing this.listingNode */
Board.prototype.renderListing = function () {
  const e = document.createElement('div');
  e.className = 'board-listing-component';
  e.dataset.name = this.name;
  e.innerHTML = `
      <div class="listing-icon">O</div>
      <div class="listing-main">
        <div class="listing-name field-wrapper">
          <div class="field">
            <h1 class="dyntext on">${this.name}</h1>
            <input class="dyninput" value="${this.name}">
            </input>
          </div>
          <a class="edit-name button">
            <svg><use href="#edit" /></svg>
          </a>
        </div>
        <div class="listing-description field-wrapper">
          <div class="field">
            <h2 class="dyntext on">${this.description}</h2>
            <textarea placeholder="Description..." class="dyninput"
              value="${this.description}"></textarea>
          </div>
          <a class="edit-description button">
            <svg><use href="#edit"></svg>
          </a>
        </div>
      </div>`;
  this.listingNode = e;
  // References to DOM components of the listing element
  this.listingNodes = {
    name : e.querySelector('.listing-name'),
    nameText : e.querySelector('.listing-name .dyntext'),
    nameInput : e.querySelector('.listing-name .dyninput'),
    description : e.querySelector('.listing-description'),
    descriptionText : e.querySelector('.listing-description .dyntext'),
    descriptionInput : e.querySelector('.listing-description .dyninput'),
    editName: e.querySelector('.edit-name'),
    editDescription: e.querySelector('.edit-description')
  };

  this.addHandlersToListing();
};

Board.prototype.addHandlersToListing = function () {
  autoResize(this.listingNodes.descriptionInput);
  this.listingNode.addEventListener('click', event => {
    // Check whether ancestor contains class
    let elem = event.target;
    while (elem !== document) {
      if (elem.classList.contains('button'))
        return false;
      elem = elem.parentNode;
    }
    const e = new CustomEvent('boardselect', { detail: this.name, bubbles: true });
    this.listingNode.dispatchEvent(e);
  });

  this.editName = makeDynamicField(
    this.listingNodes.editName,
    this.listingNodes.nameText,
    this.listingNodes.nameInput,
    value => this._dispatchRenameBoardEvent(value)
  );

  this.editDescription = makeDynamicField(
    this.listingNodes.editDescription,
    this.listingNodes.descriptionText,
    this.listingNodes.descriptionInput,
    value => {
      this.description = value;
      this.markChanged();
      return true;
    }
  );
};

Board.prototype._dispatchRenameBoardEvent = function (newName) {
  const ev = new CustomEvent('renameboard', { detail : { board: this, newName },
    bubbles: true,
    cancelable: true
  });

  const d = this.listingNode.dispatchEvent(ev);
  return d;
};

/** The board's tasks are saved to localStorage in an array of values */
Board.prototype.saveTasks = function () {
  if (this.tasks === undefined) return;
  const taskJSON = Array.from(this.tasks.values());
  const taskString = JSON.stringify(taskJSON);
  console.log('Saving tasks:', taskJSON);
  localStorage.setItem(`tasks-${this.name}`, taskString);
};

Board.prototype.moveTasksIntoView = function () {
  const rect = this.node.getBoundingClientRect();
  this.tasks.forEach( task => {
    task.x = clamp(0, task.x, rect.width - task.node.offsetWidth);
    task.y = clamp(0, task.y, rect.height - task.node.offsetHeight);
    task.setStyles();
    this.saveTasks();
  });
};

Board.prototype.markChanged = function () {
  const e = new CustomEvent('boardchange', { bubbles: true });
  this.listingNode.dispatchEvent(e);
};

Board.BASE_Z_INDEX = 5;
