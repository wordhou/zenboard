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

Board.BASE_Z_INDEX = 5;
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
  if (cat !== undefined && this.currentTemplate.categories.has(cat))
    task.category = cat;
  else task.category = this.currentTemplate.def;

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
  target.innerHTML = '';
  target.appendChild(this.dummyTask);
  target.appendChild(this.node);
  this.currentTemplate.attachStylesheet(target);
  if (spinner !== undefined) spinner.classList.remove('on');
  this.moveTasksIntoView();
};

Board.prototype.addHandlers = function () {
  this.node.addEventListener('taskchange', () => this.saveTasks());
  this.node.addEventListener('taskdelete', e => this.deleteTask(e.detail));
  this.makeTasksDraggable();
};

/** Attaches all event listeners to the DOM element for a task */
Board.prototype.makeTasksDraggable = function () {
  this.dragNewTaskHandler = event => {
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
    let elem = event.target;
    while (!elem.classList.contains('todo') && elem !== document) {
      if (elem.classList === undefined || elem === document) return false;
      elem = elem.parentNode;
    }
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
    const dataString = event.dataTransfer.getData('text/plain');
    if (dataString === "") return console.error('Weird drop events');
    const data = JSON.parse(dataString);
    let task;

    event.target.classList.remove('drop-hover');

    if (this.list) {
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
  if (tasksStored === null) return this.tasks = new Map();

  return this.tasks = new Map(JSON.parse(tasksStored).map(props =>
    [props.id, Task.fromJSON(props)]
  ));
};

Board.prototype.loadTemplate = function () {
  this.currentTemplate = Template.getTemplate(this.template);
};

Board.prototype.moveTaskToTop = function (task) {
  const tasks = Array.from(this.tasks.values());
  if (task.z !== undefined)
    this.tasks.forEach(t => { if (t.z > task.z) t.z--; t.setStyles(); });
  const zs = tasks.map(t => t === task ? null : t.z);
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

/* global $, makeExpandible, clamp, autoResize, Template, State */

const addTemplateList = function (target, state) {
  Template.templates.forEach((template, name) => {
    const element = Template.renderTemplateListing(template);
    element.addEventListener('click', () => state.changeTemplate(name));
    target.appendChild(element);
  });
}

var state; // DEBUG:
window.addEventListener('load', () => {
  const $ = id => document.getElementById(id); // Alias for brevity

  makeExpandible($('board-drawer'), $('board-drawer-handle'));
  makeExpandible($('template-list-expand'),
    $('template-list-expander'),
    $('template-list-exit')
  );
  state = new State({
    board: $('board-wrapper'),
    boardList: $('board-list-content'),
    spinner: undefined,
    newTask: $('new-task'),
    newBoard: $('new-board'),
    deleteBoard: $('delete-board'),
    listView: $('toggle-view')
  });
  state.load();

  addTemplateList($('template-list-content'), state);
});

/* global $, clamp, autoResize, Template, Task, Board */

/**
 * Manages the global state of the application as well as saving and
 * loading information from localStorage.
 */
function State ({ boardList, board, spinner, newTask, newBoard
  , deleteBoard, listView}) {
  this.nodes = {
    board,
    boardList,
    spinner,
    newTask,
    newBoard,
    deleteBoard,
    listView
  };
}

State.DEFAULT_BOARD_NAME = 'Default Board';
State.NEW_BOARD_NAME = 'New Board';
State.MIN_BOARD_WIDTH = 720;

/** Tries to load boards, current board and settings from localStorage */
State.prototype.load = function() {
  const boards = localStorage.getItem('boards');
  const current = localStorage.getItem('current');
  const settings = localStorage.getItem('settings');

  this.settings = settings === null ? {} : JSON.parse(settings);
  if (boards !== null) {
    this.boards = new Map();
    JSON.parse(boards).map(props => this.addBoard(new Board(props)));
    this.current = current;
    this.loadBoard(this.current);
  } else {
    this._setupNew();
  }
this._addHandlers();
};

/** Used when no existing boards are found in localStorage */
State.prototype._setupNew = function () {
  const def = State.DEFAULT_BOARD_NAME;
  this.boards = new Map();
  
  const defaultBoard = new Board({name: def});
  defaultBoard.saveTasks(); // TODO necessary?
  this.addBoard(defaultBoard);
  this._setBoard(defaultBoard);
};

/** */
State.prototype._setBoard = function (board) {
  this.current = board.name;
  this.board = board;
  if (board.tasks === undefined) board.loadTasks();
  if (!board.list) this.nodes.listView.classList.remove('on');
  if (board.list) this.nodes.listView.classList.add('on');
  board.attach(this.nodes.board, this.nodes.spinner);

  // Make sure the selected board has class 'on'
  for (let board of this.boards.values())
    board.listingNode.classList.toggle('on', this.current === board.name);

  this.save();
};

State.prototype.changeTemplate = function (templateName, board) {
  if (board === undefined) board = this.board;
  board.template = templateName;
  board.loadTemplate();
  if (this.board === board) {
    board.render();
    board.attach(this.nodes.board, this.nodes.spinner);
  }
  this.save();
}

/** */
State.prototype.save = function () {
  localStorage.setItem('current', this.current);
  localStorage.setItem('boards', JSON.stringify(
    Array.from(this.boards.values())
  ));
  localStorage.setItem('settings', JSON.stringify(this.settings));
};

/**
  * Loads the board given its name, sets it to the current board, and attaches
  * it to the DOM */
State.prototype.loadBoard = function (boardName) {
  console.log('Loading board', boardName);
  const board = this.boards.get(boardName);
  if (board === undefined) {
    console.log(`No board found with name ${boardName}.`);
    return this._loadLastBoard();
  }

  if (board.tasks === undefined) board.loadTasks();
  this._setBoard(board);
};

/**
 * Adds a Board object to the board list, renders the listing, and
 * adds the listingNode to the boardListNode
 */
State.prototype.addBoard = function (board) {
  if (this.boards.has(board.name)) return false;
  this.boards.set(board.name, board);
  this._attachListing(board);
  return true;
};

State.prototype._attachListing = function (board) {
  board.renderListing();
  this.nodes.boardList.appendChild(board.listingNode);
};

State.prototype.renameBoard = function (board, newName) {
  if (board.name === newName)
    return true; // Returns true when rename was successful
  if (this.boards.has(newName))
    return false; // Fails because two boards can't have the same name

  /* TODO add validity check to name
  if (`name is not valid`)
    return false;
  */

  const oldName = board.name;
  // Updates the boards map
  this.boards.delete(oldName);
  this.boards.set(newName, board);

  if (board.tasks === undefined) board.loadTasks();
  board.deleteTasksFromStorage(); // clears localStorage at old task name
  board.name = newName;
  board.saveTasks(); // writes board.tasks to localStorage at new name

  if (this.current === oldName) this.current = newName;
  
  this.save();
  return true;
};

State.prototype.newBoard = function () {
  let newName = State.NEW_BOARD_NAME;
  for (let i = 1; this.boards.has(newName); i++)
    newName = `${State.NEW_BOARD_NAME} (${i})`;
  const board = new Board({ name: newName });
  board.tasks = new Map();
  this.addBoard(board);
  this.save();
};

State.prototype._deleteBoard = function (boardName) {
  const board = this.boards.get(boardName);
  board.deleteTasksFromStorage();
  board.listingNode.remove();
  this.boards.delete(boardName); 
};

State.prototype.deleteBoard = function () {
  const yes = confirm(`Are you sure you want to delete ${this.current}?`);
  if (yes) this._deleteBoard(this.current);
  this._loadLastBoard();
};

/** Load a board (the last one added). If no board exists, call _setupNew */
State.prototype._loadLastBoard = function () {
  const lastBoard = Array.from(this.boards.keys()).pop();
  if (lastBoard === undefined) {
    this._setupNew();
  } else {
    this.loadBoard(lastBoard);
    this.save();
  }
};

State.prototype._addHandlers = function () {
  window.addEventListener('resize', () => {
    if (this.board.list) return false;
    if (this.board.node.offsetWidth <= State.MIN_BOARD_WIDTH)
      return this.toggleListView();
    this.board.moveTasksIntoView();
  });
  document.addEventListener('boardselect', event => {
    this.loadBoard(event.detail);
  }, true);

  document.addEventListener('renameboard', event => {
    const success = this.renameBoard( event.detail.board, event.detail.newName );
    // Indicates to the event dispatcher that the rename was unsuccessful
    if (!success) event.preventDefault();
  }, { passive: false });

  document.addEventListener('boardchange', () => this.save());

  this.nodes.newTask.addEventListener('click', () => {
    const task = this.board.newTask();
    this.board.putTask(task);
    task.nodes.text.focus();
    this.board.saveTasks();
  });

  this.nodes.newTask.addEventListener('dragstart', event => {
    this.board.dragNewTaskHandler(event);
  });

  this.nodes.newBoard.addEventListener('click', () => this.newBoard());
  this.nodes.deleteBoard.addEventListener('click', () =>
    this.deleteBoard()
);
  this.nodes.listView.addEventListener('click', () =>
    this.toggleListView()
  );
};

State.prototype.toggleListView = function () {
  this.board.list = !this.board.list;
  this.save();
  this.setBoardStyles();
};

State.prototype.setBoardStyles = function () {
  this.board.node.classList.toggle('list-view', this.board.list);
  this.nodes.listView.classList.toggle('on', this.board.list);
}

/* global autoResize  */

/**
 * Represents a task as well as its position in the canvas
 */
function Task (
  { text = ''
    , due = ''
    , done = false
    , pin = false
    , flag = false
    , expand = false
    , x, y, z
    , category, order
    , created}) {
  this.text = text;
  this.due = due;
  this.done = !!done;
  this.pin = !!pin;
  this.flag = !!flag;
  this.expand = !!expand;
  this.x = x;
  this.y = y;
  this.z = z;
  this.category = category;
  this.order = order;
  this.created = created === undefined ? (new Date()).toJSON() : created;
  this.render();
  this.setStyles();
}

// List of property names that are stored in localStorage
Task.storableProps = {
  'text': 't',
  'due' : 'u',
  'done': 'd',
  'pin': 'p',
  'flag': 'f',
  'expand': 'e',
  'x': 'x',
  'y': 'y',
  'z': 'z',
  'category': 'c',
  'order': 'o',
  'created': 'id'
};

Task.flags = ['done', 'pin', 'flag', 'expand'];

Task.prototype.toJSON = function () {
  const obj = {};
  for (let [k, v] of Object.entries(Task.storableProps)) {
    if (Task.flags.includes(k))
      obj[v] = this[k] ? 1 : 0;
    else
      obj[v] = this[k];
  }
  return obj;
};

Task.fromJSON = function (obj) {
  const props = {};
  for (let [k,v] of Object.entries(Task.storableProps)) props[k] = obj[v];
  return new Task(props);
}

/** Populates the .node property with a generated HTML element */
Task.prototype.render = function () {
  const e = document.createElement('div');
  e.classList.add('todo', 'task-drop-target');
  Task.flags.filter(f => this[f]).forEach(f => e.classList.add(f));

  e.setAttribute('draggable', !this.pin);
  e.dataset.created = this.created;
  e.innerHTML = `<textarea placeholder="Todo...">${this.text}</textarea>

    <div class="expandible">
    Due: <input type="date" class="due" value="${this.due}"/>
    </div>

    <ul class="icons">
    <li><a class="expander"><svg><use href="#three-dots" /></svg> </a></li>
    <li><a class="done"><svg><use href="#check" /></svg> </a></li>
    <li><a class="pin"><svg><use href="#pin" /></svg> </a></li>
    <li><a class="flag"><svg><use href="#flag" /></svg></a> </li>
    <li><a class="trash"><svg><use href="#trash" /></svg></a> </li>
    </ul>`;
  // References to DOM components of the listing element
  this.nodes = {
    text : e.querySelector('textarea'),
    due : e.querySelector('.due'),
    expander : e.querySelector('.expander'),
    expand : e.querySelector('.expandible'),
    done : e.querySelector('.done'),
    flag : e.querySelector('.flag'),
    pin : e.querySelector('.pin'),
    trash : e.querySelector('.trash'),
  };
  this.node = e;

  this.setStyles();
  this.addHandlers();
};

Task.renderDummy = function () {
  const e = document.createElement('div');
  e.className = 'todo dummy';
  e.innerHTML = `<textarea>New task! Drop me in the category you want me to be in.</textarea>

    <ul class="icons">
    <li><a class="expander"><svg><use href="#three-dots" /></svg> </a></li>
    <li><a class="done"><svg><use href="#check" /></svg> </a></li>
    <li><a class="pin"><svg><use href="#pin" /></svg> </a></li>
    <li><a class="flag"><svg><use href="#flag" /></svg></a> </li>
    <li><a class="trash"><svg><use href="#trash" /></svg></a> </li>
    </ul>`;
  return e;
}

Task.prototype.setStyles = function () {
  this.node.style.left = `${this.x}px`;
  this.node.style.top = `${this.y}px`;
  this.node.style.zIndex = `${this.z}`;
  this.node.style.order = `${this.order}`;
}

Task.prototype.addHandlers = function() {
  autoResize(this.nodes.text);

  this.nodes.text.addEventListener('change', () => {
    this.text = this.nodes.text.value;
    this.markChanged();
  });

  this.nodes.due.addEventListener('change', () => {
    this.due = this.nodes.due.value;
    this.markChanged();
  });

  this.nodes.expander.addEventListener('click', () => {
    this.toggle('expand');
  });
  this.nodes.done.addEventListener('click', () => {
    this.toggle('done');
  });
  this.nodes.pin.addEventListener('click', () => {
    this.toggle('pin');
    this.node.setAttribute('draggable', this.pin ? 'false' : 'true');
  });
  this.nodes.flag.addEventListener('click', () => {
    this.toggle('flag');
  });
  this.nodes.trash.addEventListener('click', () => this.promptDelete());
};

Task.prototype.attach = function (target) {
  if (this.node === undefined) this.render();
  target.appendChild(this.node);
}

Task.prototype.markChanged = function () {
  const e = new CustomEvent('taskchange', { bubbles: true, detail: true });
  this.node.dispatchEvent(e);
};

Task.prototype.toggle = function (property) {
  if (Task.flags.includes(property)) {
    this[property] = !this[property];
    this.node.classList.toggle(property);
  }
  this.markChanged();
};

Task.prototype.promptDelete = function () {
  //const confirmed = confirm('Are you sure you want to delete?');
  //if (confirmed)
    this.delete();
};

Task.prototype.delete = function () {
  const e = new CustomEvent('taskdelete', { bubbles: true, detail: this });
  this.node.dispatchEvent(e);
};


/**
 * Defines the background, styles, categories of a board.
 */
function Template({ name, description, categories, def, styles }) {
  this.name = name;
  this.description = description;
  this.categories = new Map(categories);
  this.def = def;
  this.styles = styles
}

Template.default = 'Default';

Template.templates = new Map (
[
  // eslint-disable-next-line
    {
    "name": "Default",
    "description": "",
    "categories": [
      ["todo", {
        "title": "Todo list",
        "styles": {}
      }]
    ],
    "def": "todo",
    "styles": [
    "\/* SVG pattern by HeroPatterns.com with CC BY 4.0 license *\/\r\n.board {\r\nbackground-color: #ffffff;\r\n\r\nbackground-image: url(\"data:image\/svg+xml,%3Csvg xmlns='http:\/\/www.w3.org\/2000\/svg' width='119' height='119' viewBox='0 0 100 100'%3E%3Cg stroke='%23dee6dc' stroke-width='45.7' stroke-opacity='0.61'%3E%3Crect fill='%23f6f6f6' x='-60' y='-60' width='110' height='240'\/%3E%3C\/g%3E%3C\/svg%3E\");\r\n}"
    ]
  },

  {
    "name": "Trifold",
    "description": "",
    "categories": [
      ["todo", {
        "title": "Todo list",
        "styles": {}
      }],
      ["inprogress", {
        "title": "In progress",
        "styles": {}
      }],
      ["complete", {
        "title": "Completed",
        "styles": {}
      }]
    ],
    "styles": [
      " \/* SVG background generated by SVGBackgrounds.com under CC BY 4.0 *\/ .board { background-color: #dcab95; background-image: url(\"data:image\/svg+xml,%3Csvg xmlns='http:\/\/www.w3.org\/2000\/svg' width='100%25' height='100%25' viewBox='0 0 1200 800'%3E%3Cdefs%3E%3ClinearGradient id='a' gradientUnits='userSpaceOnUse' x1='600' y1='25' x2='600' y2='777'%3E%3Cstop offset='0' stop-color='%23dcab95'\/%3E%3Cstop offset='1' stop-color='%23b6eed0'\/%3E%3C\/linearGradient%3E%3ClinearGradient id='b' gradientUnits='userSpaceOnUse' x1='650' y1='25' x2='650' y2='777'%3E%3Cstop offset='0' stop-color='%23debb98'\/%3E%3Cstop offset='1' stop-color='%23a4e6d0'\/%3E%3C\/linearGradient%3E%3ClinearGradient id='c' gradientUnits='userSpaceOnUse' x1='700' y1='25' x2='700' y2='777'%3E%3Cstop offset='0' stop-color='%23e0cb9b'\/%3E%3Cstop offset='1' stop-color='%2393ded4'\/%3E%3C\/linearGradient%3E%3ClinearGradient id='d' gradientUnits='userSpaceOnUse' x1='750' y1='25' x2='750' y2='777'%3E%3Cstop offset='0' stop-color='%23e2db9d'\/%3E%3Cstop offset='1' stop-color='%2383cdd4'\/%3E%3C\/linearGradient%3E%3ClinearGradient id='e' gradientUnits='userSpaceOnUse' x1='800' y1='25' x2='800' y2='777'%3E%3Cstop offset='0' stop-color='%23dde3a0'\/%3E%3Cstop offset='1' stop-color='%2374b1c8'\/%3E%3C\/linearGradient%3E%3ClinearGradient id='f' gradientUnits='userSpaceOnUse' x1='850' y1='25' x2='850' y2='777'%3E%3Cstop offset='0' stop-color='%23d2e5a3'\/%3E%3Cstop offset='1' stop-color='%236793bc'\/%3E%3C\/linearGradient%3E%3ClinearGradient id='g' gradientUnits='userSpaceOnUse' x1='900' y1='25' x2='900' y2='777'%3E%3Cstop offset='0' stop-color='%23c7e7a6'\/%3E%3Cstop offset='1' stop-color='%235b75ae'\/%3E%3C\/linearGradient%3E%3ClinearGradient id='h' gradientUnits='userSpaceOnUse' x1='950' y1='25' x2='950' y2='777'%3E%3Cstop offset='0' stop-color='%23bde8a9'\/%3E%3Cstop offset='1' stop-color='%23555c9b'\/%3E%3C\/linearGradient%3E%3ClinearGradient id='i' gradientUnits='userSpaceOnUse' x1='1000' y1='25' x2='1000' y2='777'%3E%3Cstop offset='0' stop-color='%23b4eaac'\/%3E%3Cstop offset='1' stop-color='%23565185'\/%3E%3C\/linearGradient%3E%3ClinearGradient id='j' gradientUnits='userSpaceOnUse' x1='1050' y1='25' x2='1050' y2='777'%3E%3Cstop offset='0' stop-color='%23b0ebb4'\/%3E%3Cstop offset='1' stop-color='%23574b70'\/%3E%3C\/linearGradient%3E%3ClinearGradient id='k' gradientUnits='userSpaceOnUse' x1='1100' y1='25' x2='1100' y2='777'%3E%3Cstop offset='0' stop-color='%23b3edc2'\/%3E%3Cstop offset='1' stop-color='%2351455d'\/%3E%3C\/linearGradient%3E%3ClinearGradient id='l' gradientUnits='userSpaceOnUse' x1='1150' y1='25' x2='1150' y2='777'%3E%3Cstop offset='0' stop-color='%23b6eed0'\/%3E%3Cstop offset='1' stop-color='%23473d4b'\/%3E%3C\/linearGradient%3E%3C\/defs%3E%3Cg %3E%3Crect fill='url(%23a)' width='1200' height='800'\/%3E%3Crect fill='url(%23b)' x='100' width='1100' height='800'\/%3E%3Crect fill='url(%23c)' x='200' width='1000' height='800'\/%3E%3Crect fill='url(%23d)' x='300' width='900' height='800'\/%3E%3Crect fill='url(%23e)' x='400' width='800' height='800'\/%3E%3Crect fill='url(%23f)' x='500' width='700' height='800'\/%3E%3Crect fill='url(%23g)' x='600' width='600' height='800'\/%3E%3Crect fill='url(%23h)' x='700' width='500' height='800'\/%3E%3Crect fill='url(%23i)' x='800' width='400' height='800'\/%3E%3Crect fill='url(%23j)' x='900' width='300' height='800'\/%3E%3Crect fill='url(%23k)' x='1000' width='200' height='800'\/%3E%3Crect fill='url(%23l)' x='1100' width='100' height='800'\/%3E%3C\/g%3E%3C\/svg%3E\"); background-attachment: fixed; background-size: cover; }"
    ],
    "def": "todo"
  },

  {
    "name": "Zen",
    "description": "",
    "categories": [
      ["todo", {
        "title": "Right now",
        "styles": {}
      }],
      ["later", {
        "title": "Later",
        "styles": {}
      }]
    ],
    "def": "todo",
    "styles": [
        "\/* SVG pattern by HeroPatterns.com under CC BY 4.0 license *\/ .board { background-color: #f8f8f8; background-image: url(\"data:image\/svg+xml,%3Csvg xmlns='http:\/\/www.w3.org\/2000\/svg' viewBox='0 0 56 28' width='56' height='28'%3E%3Cpath fill='%23809883' fill-opacity='0.4' d='M56 26v2h-7.75c2.3-1.27 4.94-2 7.75-2zm-26 2a2 2 0 1 0-4 0h-4.09A25.98 25.98 0 0 0 0 16v-2c.67 0 1.34.02 2 .07V14a2 2 0 0 0-2-2v-2a4 4 0 0 1 3.98 3.6 28.09 28.09 0 0 1 2.8-3.86A8 8 0 0 0 0 6V4a9.99 9.99 0 0 1 8.17 4.23c.94-.95 1.96-1.83 3.03-2.63A13.98 13.98 0 0 0 0 0h7.75c2 1.1 3.73 2.63 5.1 4.45 1.12-.72 2.3-1.37 3.53-1.93A20.1 20.1 0 0 0 14.28 0h2.7c.45.56.88 1.14 1.29 1.74 1.3-.48 2.63-.87 4-1.15-.11-.2-.23-.4-.36-.59H26v.07a28.4 28.4 0 0 1 4 0V0h4.09l-.37.59c1.38.28 2.72.67 4.01 1.15.4-.6.84-1.18 1.3-1.74h2.69a20.1 20.1 0 0 0-2.1 2.52c1.23.56 2.41 1.2 3.54 1.93A16.08 16.08 0 0 1 48.25 0H56c-4.58 0-8.65 2.2-11.2 5.6 1.07.8 2.09 1.68 3.03 2.63A9.99 9.99 0 0 1 56 4v2a8 8 0 0 0-6.77 3.74c1.03 1.2 1.97 2.5 2.79 3.86A4 4 0 0 1 56 10v2a2 2 0 0 0-2 2.07 28.4 28.4 0 0 1 2-.07v2c-9.2 0-17.3 4.78-21.91 12H30zM7.75 28H0v-2c2.81 0 5.46.73 7.75 2zM56 20v2c-5.6 0-10.65 2.3-14.28 6h-2.7c4.04-4.89 10.15-8 16.98-8zm-39.03 8h-2.69C10.65 24.3 5.6 22 0 22v-2c6.83 0 12.94 3.11 16.97 8zm15.01-.4a28.09 28.09 0 0 1 2.8-3.86 8 8 0 0 0-13.55 0c1.03 1.2 1.97 2.5 2.79 3.86a4 4 0 0 1 7.96 0zm14.29-11.86c1.3-.48 2.63-.87 4-1.15a25.99 25.99 0 0 0-44.55 0c1.38.28 2.72.67 4.01 1.15a21.98 21.98 0 0 1 36.54 0zm-5.43 2.71c1.13-.72 2.3-1.37 3.54-1.93a19.98 19.98 0 0 0-32.76 0c1.23.56 2.41 1.2 3.54 1.93a15.98 15.98 0 0 1 25.68 0zm-4.67 3.78c.94-.95 1.96-1.83 3.03-2.63a13.98 13.98 0 0 0-22.4 0c1.07.8 2.09 1.68 3.03 2.63a9.99 9.99 0 0 1 16.34 0z'%3E%3C\/path%3E%3C\/svg%3E\");}",
        " .category header { border-radius: 0.5em; background-color: rgba(60, 60, 60, 0.7); color: #ececec; } "
    ]
  },


].map( t => [t.name, new Template(t)])
);

Template.prototype.attachCategories = function (target, map) {
  this.categories.forEach ( (cat, name) => {
    const element = document.createElement('div');
    element.className = `category cat-${name} task-drop-target`;
    element.innerHTML = `<header><h1>${cat.title}</h1></header>
    <div class="task-container cat-${name} task-drop-target"></div>`;

    map[name] = element.lastChild;
    target.appendChild(element);
  });
}

Template.prototype.attachStylesheet = function (target) {
  const style = document.createElement('style');
  style.appendChild(document.createTextNode(""));
  target.appendChild(style);
  for (let i in this.styles) {
    style.sheet.insertRule(this.styles[i], i);
  }
};


Template.getTemplate = function (template) {
  return Template.templates.get(template);
}

Template.renderTemplateListing = function (template) {
  const element = document.createElement('li');
  element.className = 'template-listing';
  element.innerHTML = `<h1>${template.name}</h1>
    ${template.description}`;
  return element;
}

Template.getCatFromClassList = function (elem) {
  for (let s of elem.classList.values()) {
    if (s.substr(0,4) === 'cat-') {
      return s.substr(4);
    }
  }
};

const clamp = (a, b, c) => Math.max(a, Math.min(b, c));

const mex = function (arr, min = 1) {
  var n = min;
  while (arr.includes(n)) n++;
  return n;
};

const dist = (p1, p2) => Math.sqrt((p1.x - p2.x)^2 + (p1.y - p2.y)^2);

const autoResize = function (text) {
  const resizeTextarea = () => {
    text.style.height = 'auto';
    text.style.height = clamp(0, text.scrollHeight, 500) + 'px';
  };
  text.addEventListener('change', resizeTextarea);
  text.addEventListener('cut', () => setTimeout(resizeTextarea, 0));
  text.addEventListener('paste', () => setTimeout(resizeTextarea, 0));
  text.addEventListener('input', () => setTimeout(resizeTextarea, 0));
  setTimeout(resizeTextarea, 0);
};

function makeExpandible (expandible, handle, exitButton) {
  handle.addEventListener('click', () => {
    expandible.classList.toggle('expanded');
    handle.classList.toggle('on');
  });
  if (exitButton !== undefined) {
    exitButton.addEventListener('click', () => {
      expandible.classList.remove('expanded');
      handle.classList.remove('on');
    });
  }
}

/**
 * Returns a click handler used to make a text field editable.
 * @param editTrigger - The element that triggers the edit. 
 * @param dyntext - The text field that displays the dynamic content
 * @param dyninput - The input field used to edit the content
 * @param changeHandler - a callback that takes the new content
 * @returns edit() - a function that makes the text field editable
 */
const makeDynamicField = function (editTrigger, dyntext, dyninput, changeHandler) {
  const updateAndSave = () => {
    const good = changeHandler(dyninput.value);
    if (good)
      dyntext.innerText = dyninput.value;
    else
      dyninput.value = dyntext.innerText;
    dyntext.classList.add('on');
    dyninput.classList.remove('on');
  };

  const edit = () => {
    if (document.activeElement === dyninput)
      return false; // Don't do anything if the board is already being edited
    dyninput.value = dyntext.innerText;
    dyntext.classList.remove('on');
    dyninput.classList.add('on');

    dyninput.focus();
    setTimeout(() => dyninput.select(), 0);
  };

  dyninput.addEventListener('focusout', updateAndSave);
  editTrigger.addEventListener('click', edit);
  return edit;
};
