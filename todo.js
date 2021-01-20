const clamp = (a, b, c) => Math.max(a, Math.min(b, c));
const $ = id => document.getElementById(id);
const $$ = sel => document.querySelector(sel);
const MAX_TEXT_HEIGHT = 100;
const DRAG_DELAY = 5;

var state; // DEBUG

/**
 * Manages the global state of the application as well as saving and
 * loading information from localStorage.
 */
function State () {
  const boards = localStorage.getItem('boards');
  const current = localStorage.getItem('current');
  const settings = localStorage.getItem('settings');

  this.settings = settings === null ? {} : JSON.parse(settings);
  if (boards === null) {
    this.boards = ['Default'];
    this.current = 'Default';
    this.board = new Board({name: 'Default', width: 1024, height: 768});
    this.save();
  } else {
    this.boards = JSON.parse(boards);
    this.current = current;
    this.board = new Board(localStorage.getItem(`board-${current}`));
  }

  this.loadBoard();
}

State.prototype.save = function () {
  localStorage.setItem('current', this.current);
  localStorage.setItem('boards', JSON.stringify(this.boards));
  localStorage.setItem('settings', JSON.stringify(this.settings));
};

State.prototype.loadBoard = function () {
  this.board.render();
};


State.prototype.addBoard = function () {
  this.save();
};

State.prototype.renameBoard = function () {
  this.save();
};

State.prototype.deleteBoard = function () {
  this.save();
};

State.prototype.attachEventListenersToDocument = function () {
  $('addBoard').addEventListener('click', () => {
  });
  $('deleteBoard').addEventListener('click', () => {
  });
  $('switchBoard').addEventListener('click', () => {
  });
  $('renameBoard').addEventListener('click', () => {
  });
  $('newTask').addEventListener('click', () => {
    const task = this.board.newTask();
    // TODO: On click, add task to random? board position;
    // On hold, create drag and drop event listeners.
    task.element.getElementsByTagName('textarea')[0].focus();
  });
  $('tileBoard').addEventListener('click', () => {
  });
  $('shuffleBoard').addEventListener('change', () => () => {
  });
  $('setSort').addEventListener('change', () => () => {
  });
  $('changeTemplate').addEventListener('change', () => () => {
  });
};


/** Stores the state of a board.
  * @constructor
  * @param string - Constructs a board from a serialized string
  * @param object - Constructs a board using the object's properties
  * @param undefined - Constructs a board with default properties
  */
function Board(parameter) {
  const type = typeof(parameter);
  if (type === 'undefined') {
    this.name = '';
    this.tasks = new Map();
    this.template = 'basic';
    this.width = 1024;
    this.height = 768;
    this.save();
  } else if (type === 'object') {
    this.tasks = new Map();
    for (let key of Board.copyProps) {
      this[key] = parameter[key];
    }
    this.save();
  } else if (type === 'string') {
    const obj = JSON.parse(parameter);
    // TODO this bit of code here is a bit ugly.
    // Takes the tasks array and replaces all the values (plain objects) with a 
    // new Task object. This in turn generates the DOM elements that later get
    // attached to the board DOM element.
    this.tasks = new Map(obj.tasks.map(a => [a[0], new Task(a[1])]));
    for (let key of Board.copyProps) {
      this[key] = obj[key];
    }
  } else {
    console.error('Problem loading board from localStorage.');
  }
}

Board.copyProps = ['name', 'template', 'width', 'height'];

/** Encodes the board state into a string */
Board.prototype.serialize = function () {
  const obj = {};
  for (let key of Board.copyProps) {
    obj[key] = this[key];
  }
  obj.tasks = Array.from(this.tasks.entries());
  return JSON.stringify(obj);
};

/** Renders this board by adding all its tasks to the DOM*/
Board.prototype.render = function () {
  const element = document.createElement('div');
  element.id = 'board';
  this.element = element;
  this.element.style.width = `${this.width}px`;
  this.element.style.height = `${this.height}px`;

  // Replaces the element `<div id="board">` with our new element
  const oldBoard = document.getElementById('board');
  oldBoard.parentNode.replaceChild(this.element, oldBoard);

  console.log(this.tasks.values()); //DEBUG

  for (let task of this.tasks.values()) {
    element.appendChild(task.element);
    this.attachEventListenersToTask(task);
  }

  // TODO: Drag to resize feature. Attach event listener to element and
  // implement grab, drag, and drop functions.
};

/** Attaches all event listeners to the DOM element for a task */
Board.prototype.attachEventListenersToTask = function (task) {
  const e = task.element;
  const text = e.getElementsByTagName('textarea')[0];

  const resize = function () {
    text.style.height = 'auto';
    text.style.height =
    clamp(0, text.scrollHeight, MAX_TEXT_HEIGHT) + 'px';
  };
  text.addEventListener('change', resize);
  text.addEventListener('cut', () => setTimeout(resize, 0));
  text.addEventListener('paste', () => setTimeout(resize, 0));
  text.addEventListener('input', () => setTimeout(resize, 0));
  setTimeout(resize, 0);

  text.addEventListener('change', () => {
    task.text = text.value;
    console.log('Text change event, saving...'); //DEBUG
    this.save();
  });
  const due = e.getElementsByClassName('due')[0];
  text.addEventListener('change', () => {
    task.due = due.value;
    this.save();
  });
  e.getElementsByClassName('expander')[0].addEventListener('click', () => {
    task.toggle('expand');
    this.save();
  });
  e.getElementsByClassName('done')[0].addEventListener('click', () => {
    task.toggle('done');
    this.save();
  });
  e.getElementsByClassName('pin')[0].addEventListener('click', () => {
    task.toggle('pin');
    this.save();
  });
  e.getElementsByClassName('flag')[0].addEventListener('click', () => {
    task.toggle('flag');
    this.save();
  });
  e.getElementsByClassName('trash')[0].addEventListener('click', () => {
    task.promptDelete();
    this.save();
  });

  var x0, y0;
  const grab = event => {
    if (!task.pin) {
      x0 = parseInt(e.style.left) - event.x;
      y0 = parseInt(e.style.top) - event.y;
      this.element.addEventListener('mousemove', dragLater);
      this.element.addEventListener('mouseup', drop);
    }
  };
  const drag = event => {
    task.x = clamp (0, x0 + event.x, this.width - e.offsetWidth);
    task.y = clamp (0, y0 + event.y, 100000);
    e.style.left = task.x + 'px';
    e.style.top = task.y + 'px';
  };
  const dragLater = event => setTimeout(() => drag(event), DRAG_DELAY);
  const drop = () => {
    this.element.removeEventListener('mousemove', dragLater);
    this.element.removeEventListener('mouseup', drop);
    console.log('Saving from end of drag-and-drop event'); //DEBUG
    this.save();
  };
  e.addEventListener('mousedown', grab);
};

/** Creates a new task and adds it to the board */
Board.prototype.newTask = function () {
  const task = new Task({x:200, y:200});
  this.tasks.set(task.created, task);
  this.element.appendChild(task.element);
  this.attachEventListenersToTask(task);
  return task;
};

Board.prototype.save = function () {
  localStorage.setItem(`board-${this.name}`, this.serialize());
  console.log(localStorage.getItem(`board-${this.name}`));
};

Board.prototype.rename = function (newName) {
  this.name = newName;
  // TODO: Rerender name

  // TODO: Update global state with new name
  localStorage.setItem(`board-${newName}`, this.serialize);
  localStorage.removeItem(`board-${this.name}`);
};

Board.prototype.resize = function (width, height) {
  this.width = width;
  this.height = height;
  this.element.style.width = `${width}px`;
  this.element.style.height = `${height}px`;
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
    , x, y, created}) {
  this.text = text;
  this.due = due;
  this.done = done;
  this.pin = pin;
  this.flag = flag;
  this.expand = expand;
  this.x = x;
  this.y = y;
  this.created = created === undefined ? (new Date()).toJSON() : created;
  this.element = this.createHtml();
  this.element.style.left = `${this.x}px`;
  this.element.style.top = `${this.y}px`;
}

Task.prototype.createHtml = function () {
  const e = document.createElement('div');
  e.className = 'todo';
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
  return e;
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
  this.element.remove();
  const e = new CustomEvent('deleteTask', { detail : this.created });
  dispatchEvent(e);
};

/** Describes the background and size of a Board */
/*function BoardTemplate () {
  this.image = '';
  this.style = {};
}*/

window.addEventListener('load', () => {
  state = new State();
  state.attachEventListenersToDocument();
});
