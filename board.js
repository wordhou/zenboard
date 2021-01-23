/* global dist, clamp, autoResize, makeDynamicField, Template, Task, mex */

/** Stores the state of a board. @constructor */
function Board({
  name = '',
  description = '',
  template = Template.default,
  list = false,
  width=1024
}) {
  this.name = name;
  this.description = description;
  this.template = template;
  this.width = width;
  this.list = list;
}

Board.storableProperties = ['name', 'description', 'template', 'width', 'list'];

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
  this.putTask(task);

  return task;
}

Board.prototype.newTaskPosition = function () {
  let y0 = 25;
  let x0 = 10;

  const pos = {x: x0, y: y0};
  const bad = p => Array.from(this.tasks.values()).some(t => dist(p, t) < 5);
  while (bad(pos)) {
    pos.x += 60;
    pos.y += 10;
    if (pos.x + Task.MAX_WIDTH > this.width) {
      y0 += 80;
      pos.x = x0;
      pos.y = y0;
    }
  }
  return pos;
}

// Reindexes the order values in the category that the task is in
Board.prototype.removeTaskFromCategory = function (task) {
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
  const template = Template.templates.get(this.template);
  task.category = cat === undefined ? template.def : cat;
  const categoryNode = this.categoryNodes[task.category];
  const tasks = Array.from(categoryNode.children)
    .map(node => this.tasks.get(node.dataset.created));
  console.log('putTask: Here are the nodes currently in the cat before:',
    Array.from(tasks.map(t => `${t.order}: ${t.text}`)));
  const orders = tasks.map(task => task.order);

  if (pos === undefined) { // Put element in least unoccupied slot
    pos = 1;
    while (orders.includes(pos)) pos++;
    console.log('putTask: Position not given. Position computed: ', pos);
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
  console.log('putTask: Here are the orders after:',
      Array.from(categoryNode.children)
          .map(node => this.tasks.get(node.dataset.created))
          .map(t => `${t.order}: ${t.text}`));

  this.saveTasks();
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
  element.style.width = `${this.width}px`;
  if (this.list) element.classList.add('list-view');
  this.node = element;

  const temp = Template.templates.get(this.template);

  this.categoryNodes = {};
  temp.categories.forEach ( cat => {
    // TODO move this into a method Template.proto...renderCategory(cat)
    const catElement = document.createElement('div');
    catElement.className = `category task-drop-target cat-${cat}`;
    this.categoryNodes[cat] = catElement;
    this.node.appendChild(catElement);
  });

  // Add the tasks
  this.tasks.forEach(t => this.putTask(t, t.category, t.order));

  console.log("Orders:", Array.from(this.tasks.values()).map(t => `${t.order}: ${t.text}`));
  this.addHandlers();
}

/** Makes sure board is rendered and attaches it to the DOM target node */
Board.prototype.attach = function (target) {
  if (this.node === undefined) this.render();
  // Replaces the element `<div id="board">` with our new element
  target.innerHTML = '';
  target.appendChild(this.node);
};

Board.prototype.addHandlers = function () {
  this.node.addEventListener('taskchange', () => this.saveTasks());
  this.node.addEventListener('taskdelete', e => this.deleteTask(e.detail));

  this.makeTasksDraggable();
  // TODO: Drag to resize feature. Attach event listener to element and
  // implement grab, drag, and drop functions.
};

/** Attaches all event listeners to the DOM element for a task */
Board.prototype.makeTasksDraggable = function () {
  this.node.addEventListener('dragstart', event => {
    // Check whether ancestor contains class
    let elem = event.target;
    // TODO stop before elem == document
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
      dx: task.x - event.x,
      dy: task.y - event.y
    }
    event.dataTransfer.setData('text/plain', JSON.stringify(data));

    return false;
  });

  this.node.addEventListener('dragover', event => {
    event.preventDefault();
    if (this.list && event.target.classList.contains('task-drop-target')) {
      event.preventDefault();
      event.target.classList.add('drop-hover');
    }
    return false; // TODO is this necessary to return false?
  });

  this.node.addEventListener('dragleave', event => {
    if (this.list && event.target.classList.contains('task-drop-target')) {
      event.target.classList.remove('drop-hover');
    }
  });

  document.addEventListener('drop', event => {
    event.preventDefault();
    const data = JSON.parse(event.dataTransfer.getData('text/plain'));
    const task = this.tasks.get(data.task);

    if (this.list) {
      var elem = event.target;
      while (!elem.classList.contains('task-drop-target')) {
        if (elem == document.body) return false;
        elem = elem.parentElement;
      }
      console.log('dropevent target elem:', elem);
      if (elem === task) return false;
      if (elem.classList.contains('category')) {
        this.moveTaskToCategory(task, Template.getCatFromClassList(elem));
      }
      if (elem.classList.contains('todo')) {
        const target = this.tasks.get(elem.dataset.created);
        this.moveTaskToCategory(task, target.category, target.order);
      }
    }

    if (!this.list) {
      task.x = clamp (0, data.dx + event.x, this.width - task.node.offsetWidth);
      task.y = clamp (0, data.dy + event.y, 100000);
      this.moveTaskToTop(task);
      task.setStyles();
    }
  });

  document.addEventListener('dragend', event => {
    event;//TODO anything?
  });
};

/** Loads from localStorage to populate the tasks property with Tasks */
Board.prototype.loadTasks = function () {
  const tasksStored = localStorage.getItem(`tasks-${this.name}`);
  const tasksStr = tasksStored !== null ? tasksStored : 'null';

  if (tasksStored === null)
    return this.tasks = new Map();

  return this.tasks = new Map(JSON.parse(tasksStr).map( props =>
    [props.created, new Task(props)]));
};

Board.prototype.moveTaskToTop = function (task) {
  const tasks = Array.from(this.tasks.values());
  const zs = tasks.map(t => t === task ? null : t.z);

  let mex = Board.BASE_Z_INDEX;
  while (zs.includes(mex)) mex++;

  // Move every node above its prev pos down by 1
  this.tasks.forEach(t => { if (t.z > task.z) t.z--; t.setStyles(); });
  return task.z = mex;
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

Board.prototype.resize = function (width) {
  this.width = width;
  this.node.style.width = `${width}px`;
  this.markChanged();
};

Board.prototype.markChanged = function () {
  const e = new CustomEvent('boardchange', { bubbles: true });
  this.listingNode.dispatchEvent(e);
};

Board.BASE_Z_INDEX = 5;
