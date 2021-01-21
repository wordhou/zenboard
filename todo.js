const clamp = (a, b, c) => Math.max(a, Math.min(b, c));
const MAX_TEXT_HEIGHT = 100;
const DRAG_DELAY = 5;

var state; // DEBUG

State.DEFAULT_BOARD_NAME = 'Default Board';
State.NEW_BOARD_NAME = 'New Board';

/**
 * Manages the global state of the application as well as saving and
 * loading information from localStorage.
 */
function State ({ boardListNode, boardNode }) {
  this.boardListNode = boardListNode;
  this.boardNode = boardNode;
}

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
};

/** Used when no existing boards are found in localStorage */
State.prototype._setupNew = function () {
  const def = State.DEFAULT_BOARD_NAME;
  this.boards = new Map();
  
  const defaultBoard = new Board({name: def, width: 1024, height: 768});
  defaultBoard.saveTasks();
  this.addBoard(defaultBoard);
  this._setBoard(defaultBoard);
};

/** */
State.prototype._setBoard = function (board) {
  console.log('set board', board);
  this.current = board.name;
  this.board = board;
  board.attach(this.boardNode);
  this._styleActiveListing();
  this.save();
};

State.prototype._styleActiveListing = function () {
  for (let board of this.boards.values()) {
    console.log(board, this.current===board.name);
    board.listingElement.classList.toggle('on', this.current === board.name);
  }
};

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
  console.log('loading board', boardName);
  const obj = this.boards.get(boardName);
  if (obj === null)
    return Error(`No board found with name ${boardName}.`);

  const tasksStr = localStorage.getItem(`tasks-${boardName}`);
  if (tasksStr === null)
    return Error(`Couldn't get tasks for ${boardName} from localStorage.`);

  obj.tasks = new Map(JSON.parse(tasksStr).map( props =>
    [props.created, new Task(props)]));
  const board = new Board(obj);
  this._setBoard(board);
};

/**
 * Adds a Board object to the board list, renders the listing, and
 * adds the listing element to the boardListNode
 */
State.prototype.addBoard = function (board) {
  if (this.boards.has(board.name)) {
    return false;
  } else {
    this.boards.set(board.name, board);
    this._attachListing(board);
    return true;
  }
};

State.prototype._attachListing = function (board) {
  board.renderListing();
  this.boardListNode.appendChild(board.listingElement);
  board.addHandlersToListing();
};

State.prototype.renameBoard = function (board, newName) {
  if (board.name === newName) {
    return true;
  } else if (this.boards.has(board.newName)) {
    return false;
  } else {
    board.name = newName;
    // TODO this is all wrong
    this.boards.set(newName, board);
    this.boards.delete(newName);
    this.board.renderListing();
    this.save();
    return true;
  }
};

State.prototype.newBoard = function () {
  let newName = State.NEW_BOARD_NAME;
  for (let i = 1; this.boards.has(newName); i++)
    newName = `${State.NEW_BOARD_NAME} (${i})`;
  const board = new Board({ name: newName });
  board.saveTasks();
  this.addBoard(board);
  this.save();
};

State.prototype._deleteBoard = function (boardName) {
  console.log('deleting');
  const board = this.boards.get(boardName);
  board.deleteTasks();
  board.listingElement.remove();
  this.boards.delete(boardName); 
  this.save();
};

State.prototype.deleteBoard = function () {
  const yes = confirm(`Are you sure you want to delete ${this.current}?`);
  if (yes) {
    this._deleteBoard(this.current);
    //TODO load any (last) board. If no board exists, call _setupNew
    const lastBoard = Array.from(this.boards.keys()).pop();
    console.log(Array.from(this.boards.values()));
    if (lastBoard === undefined) {
      this._setupNew();
    } else {
      this.loadBoard(lastBoard);
    }
  }
};

State.prototype.addHandlers = function () {
  document.addEventListener('selectboard', event => {
    this.loadBoard(event.detail);
  }, true);
};

/** Stores the state of a board. @constructor */
function Board({
  name = '',
  description = '',
  template = 'default',
  width=1024,
  element,
  tasks
}) {
  this.name = name;
  this.description = description;
  this.template = template;
  this.width = width;
  this.tasks = tasks === undefined ? new Map() : tasks;
  this.element = element;
}

Board.prototype.toJSON = function () {
  return { name: this.name
    , description: this.description
    , template: this.template
    , width: this.width };
};

/** Renders this board and attaches it to the DOM node */
Board.prototype.attach = function (node) {
  const element = document.createElement('div');
  element.id = 'board';
  this.element = element;
  this.element.style.width = `${this.width}px`;

  // Replaces the element `<div id="board">` with our new element
  node.innerHTML = '';
  node.appendChild(element);

  for (let task of this.tasks.values()) {
    this.addTask(task);
  }

  this.addHandlers();
};

/** Adds a new task to the board DOM and the board.tasks map */
Board.prototype.addTask = function (task) {
  this.tasks.set(task.created, task);
  task.render();
  this.element.appendChild(task.element); // TODO ??
  task.element.style.left = `${task.x}px`;
  task.element.style.top = `${task.y}px`;
  task.addHandlers();
  this.saveTasks();
  return task;
};

Board.prototype.deleteTask = function (task) {
  this.tasks.delete(task.created);
  this.saveTasks();
};

Board.prototype.deleteTasks = function () {
  localStorage.removeItem(`tasks-${this.name}`);
};

Board.prototype.addHandlers = function () {
  this.element.addEventListener('taskchange', () => this.saveTasks());

  this.element.addEventListener('taskdelete', e => this.deleteTask(e.detail));

  this.makeTasksDraggable();
  // TODO: Drag to resize feature. Attach event listener to element and
  // implement grab, drag, and drop functions.
};

/** Attaches all event listeners to the DOM element for a task */
Board.prototype.makeTasksDraggable = function () {
  // Creates a closure that stores the mouse offset based on initial click
  // position.  Since only one task can be dragged at a time, only one position
  // needs to be kept.
  var x0, y0, task;

  const grab = (t, event) => {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.dropEffect = 'move';

    t.element.classList.toggle('on');
    setTimeout(() => t.element.classList.toggle('on'), 10);

    if (!t.pin) {
      x0 = t.x - event.x;
      y0 = t.y - event.y;
      task = t;
      //TODO holdmybeer this.element.addEventListener('mousemove', dragLater);
      //this.element.addEventListener('dragend', drop);
      document.addEventListener('drop', drop);
      document.addEventListener('dragover', dragoverHandler);
    }
  };

  const dragoverHandler = e => {
    e.preventDefault();
    return false;
  };

  const drop = event => {
    event.preventDefault();
    task.x = clamp (0, x0 + event.x, this.width - task.element.offsetWidth);
    task.y = clamp (0, y0 + event.y, 100000);
    task.element.style.left = task.x + 'px';
    task.element.style.top = task.y + 'px';
    // this.element.removeEventListener('mousemove', dragLater);
    document.removeEventListener('drop', drop);
    document.removeEventListener('dragover', dragoverHandler);
    this.saveTasks();
  };

  this.element.addEventListener('dragstart', event => {
    // Check whether ancestor contains class
    let elem = event.target;
    while (!elem.classList.contains('todo') && elem.id !== 'board') {
      elem = elem.parentNode;
    }
    if (elem.classList.contains('todo')) {
      const task = this.tasks.get(elem.dataset.created);
      grab (task, event);
    }
    return false;
  });

  // this.element.addEventListener('drag', event => event.preventDefault());
};

/** Creates the DOM node for the board listing this.listingElement */
Board.prototype.renderListing = function () {
  const e = document.createElement('div');
  e.className = 'board-listing-component';
  e.dataset.name = this.name;
  e.innerHTML = `
    <li>
      <a class="select-board">
      <div class="board-listing-icon">O</div>
      <div class="board-listing-main">
        <h1>${this.name}</h1>
        <h2>${this.description}</h2>
      </div>
      </a>
    </li>`;
  this.listingElement = e;
  return e;
};

Board.prototype.addHandlersToListing = function () {
  const select = this.listingElement.getElementsByClassName('select-board')[0];
  select.addEventListener('click', () => {
    const e = new CustomEvent('selectboard', { detail: this.name, bubbles: true });
    this.listingElement.dispatchEvent(e);
  });

  // TODO Click on name: create input to change name
  // TODO Click on description: create input to change description
};

/** The board's tasks are saved to localStorage in an array of values */
Board.prototype.saveTasks = function () {
  const taskString = JSON.stringify(Array.from(this.tasks.values()));
  localStorage.setItem(`tasks-${this.name}`, taskString);
};

Board.prototype.resize = function (width) {
  this.width = width;
  this.element.style.width = `${width}px`;
  this.markChanged();
};

Board.prototype.markChanged = function () {
  const e = new CustomEvent('boardchange', { bubbles: true });
  this.element.dispatchEvent(e);
};

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
    , z = -100
    , x, y, created}) {
  this.text = text;
  this.due = due;
  this.done = done;
  this.pin = pin;
  this.flag = flag;
  this.expand = expand;
  this.x = x;
  this.y = y;
  this.z = z;
  this.created = created === undefined ? (new Date()).toJSON() : created;
  this.element = this.render();
  this.element.style.left = `${this.x}px`;
  this.element.style.top = `${this.y}px`;
}

Task.prototype.toJSON = function () {
  const obj = Object.assign({}, this);
  delete obj.element;
  return obj;
};

/** Populates the .element property with a generated HTML element */
Task.prototype.render = function () {
  const e = document.createElement('div');
  e.className = 'todo';
  e.setAttribute('draggable', !this.pin);
  e.dataset.created = this.created;
  e.innerHTML = `<textarea placeholder="Todo...">${this.text}</textarea>

    <div class="expand${this.expand ? ' on' : ''}">
    Due: <input type="date" class="due" value="${this.due}"/>
    </div>

    <ul class="icons">
    <li><a class="expander"><svg><use href="#three-dots" /></svg> </a></li>
    <li><a class="done${this.done ? ' on' : ''}"><svg><use href="#check" /></svg> </a></li>
    <li><a class="pin${this.pin ? ' on' : ''}"><svg><use href="#pin" /></svg> </a></li>
    <li><a class="flag${this.flag ? ' on' : ''}"><svg><use href="#flag" /></svg></img></a> </li>
    <li><a class="trash"><svg><use href="#trash" /></svg></img></a> </li>
    </ul>`;
  this.element = e;
  return e;
};

Task.prototype.addHandlers = function() {
  const e = this.element;
  const text = e.getElementsByTagName('textarea')[0];

  const resizeTextarea = function () {
    text.style.height = 'auto';
    text.style.height = clamp(0, text.scrollHeight, MAX_TEXT_HEIGHT) + 'px';
  };
  text.addEventListener('change', resizeTextarea);
  text.addEventListener('cut', () => setTimeout(resizeTextarea, 0));
  text.addEventListener('paste', () => setTimeout(resizeTextarea, 0));
  text.addEventListener('input', () => setTimeout(resizeTextarea, 0));
  setTimeout(resizeTextarea, 0);

  text.addEventListener('change', () => {
    this.text = text.value;
    this.markChanged();
  });

  const due = e.getElementsByClassName('due')[0];
  text.addEventListener('change', () => {
    this.due = due.value;
    this.markChanged();
  });

  //TODO see if I can refactor this to be less repetitive
  e.getElementsByClassName('expander')[0].addEventListener('click', () => {
    this.toggle('expand');
    this.markChanged();
  });
  e.getElementsByClassName('done')[0].addEventListener('click', () => {
    this.toggle('done');
    this.markChanged();
  });
  e.getElementsByClassName('pin')[0].addEventListener('click', () => {
    this.toggle('pin');
    this.element.setAttribute('draggable', this.pin ? 'false' : 'true');
    this.markChanged();
  });
  e.getElementsByClassName('flag')[0].addEventListener('click', () => {
    this.toggle('flag');
    this.markChanged();
  });
  e.getElementsByClassName('trash')[0].addEventListener('click', () => {
    this.promptDelete();
  });
};

Task.prototype.markChanged = function () {
  const e = new CustomEvent('taskchange',{ bubbles: true, detail: true });
  this.element.dispatchEvent(e);
};

Task.prototype.toggle = function (property) {
  if (typeof(this[property]) === 'boolean') {
    this[property] = !this[property];
    this.element.getElementsByClassName(property)[0].classList.toggle('on');
  }
};

Task.prototype.promptDelete = function () {
  const confirmed = confirm('Are you sure you want to delete?');
  if (confirmed)
    this.delete();
};

Task.prototype.delete = function () {
  const e = new CustomEvent('taskdelete', { bubbles: true, detail: this });
  this.element.dispatchEvent(e);
  this.element.remove();
};

/** Describes the background and size of a Board */
/*function BoardTemplate () {
  this.image = '';
  this.style = {};
}*/


function addEventListenersToDocument (state) {
  document.getElementById('newTask').addEventListener('click', () => {
    const task = state.board.addTask(new Task({x: 200, y: 200}));

    // TODO: On click, add task to random? board position;
    // On hold, create drag and drop event listeners.
    task.element.getElementsByTagName('textarea')[0].focus();
  });

  document.getElementById('new-board').addEventListener('click', () => {
    state.newBoard();
  });
  document.getElementById('delete-board').addEventListener('click', () => {
    state.deleteBoard();
  });
}

window.addEventListener('load', () => {
  state = new State({
    boardNode: document.getElementById('board-wrapper'),
    boardListNode: document.getElementById('board-list')
  });
  state.load();
  state.addHandlers();
  addEventListenersToDocument (state);
});
