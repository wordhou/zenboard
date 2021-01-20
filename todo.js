/** Builds a new board with no tasks and default style */
function Board() {
  this.name = "";
  this.tasks = new Map();
  this.template = "basic";
  this.width = 1024;
  this.height = 768;
}

/** Builds a board from a serialized string */
function Board(serializedBoard) {
  const obj = JSON.parse(serializedBoard);
  this.tasks = new Map(JSON.parse(obj.tasks));
  const props = ['name', 'template', 'width', 'height'];
  for (key in props) {
    this[key] = props[key]
  };
}

/** Encodes the board state into a string */
Board.prototype.serialize = function () {
  const obj = {};
  obj.template = this.template;
  obj.size = this.size;
  obj.tasks = Array.from(this.tasks.entries());
  return JSON.stringify(o);
};

Board.prototype.render = function () {
  const element = document.createElement('div');
  element.id = 'board';
  // TODO: Add any HTML or attributes as necessary to the new DOM element
  this.element = element;
  document.getElementById('board').replaceWith(element);
  // TODO: Create all the tasks elements and add them to the DOM
  // TODO: Attach event handlers to individual tasks elements
  element.addEventListener('deleteTask', event => {
    this.tasks.delete(event.detail);
    this.save();
  })

  // Save the board state when
  element.addEventListener('taskChanged', event => {
    this.save();
  })
};

Board.prototype.save = function () {
  localStorage.setItem(`board-${this.name}`, this.serialize());
};

Board.prototype.rename = function (newName) {
  this.name = newName;
  // TODO: Rerender name

  // TODO: Update global state with new name
  localStorage.setItem(`board-${newName}`, this.serialize);
  localStorage.removeItem(`board-${this.name}`);
};

/** Adds a new task to the Board's task map and adds it to the board's DOM */
Board.prototype.addTask = function (task) {
  this.tasks.set(task.created, task);
  this.element.appendChild(task.element);
  task.attachEventHandlers();
};

Board.prototype.resize = function (width, height) {
  this.width = width;
  this.height = height;
  this.element.style.width = `${width}px`;
  this.element.style.height = `${height}px`;
  // TODO: move all
}

/** Describes the background and size of a Board */
function BoardTemplate () {
  this.image = "";
  this.style = {};
}

/**
 * Represents a task as well as its position in the canvas
 */
function Task ({ text = ''
  , due = ''
  , pos
  , created
}) {
  this.text = text;
  this.due = due;
  this.x = x;
  this.y = y;
  this.done = false;
  this.pinned = false;
  this.flagged = false;
  this.created = created ? created : (new Date()).toJSON();

  this.element = this.createHtml();
}

Task.prototype.createHtml = function () {
  var e = document.createElement('div');
  e.className = 'todo';
  // TODO: populate the DOM and connect event handlers
  return e;
};

Task.prototype.delete = function () {
  this.element.remove();
  const e = new CustomEvent('deleteTask', { detail : this.created })
  dispatchEvent(e);
};

Task.prototype.update = function () {
};


function makeDraggable(element) {
  element.addEventListener('mousedown', grab);
  var x0, y0;
  function grab(event) {
    x0 = parseInt(element.style.left) - event.x;
    y0 = parseInt(element.style.top) - event.y;
    document.addEventListener('mousemove', dragDeferred);
    document.addEventListener('mouseup', drop);
  }
  const drag = function (event) {
    element.style.left = x0 + event.x + 'px';
    element.style.top = y0 + event.y + 'px';
  };
  const dragDeferred = function (event) {
    setTimeout(() => drag(event), DRAG_DELAY);
  };
  const drop = function (event) {
    document.removeEventListener('mousemove', dragDeferred);
    document.removeEventListener('mouseup', drop);
  };
}

const clamp = (a, b, c) => Math.max(a, Math.min(b, c));
const MAX_TEXT_HEIGHT = 100;
const DRAG_DELAY = 5;

function autoResize(textarea) {
  const resize = function () {
    textarea.style.height = 'auto';
    textarea.style.height =
      clamp(0, textarea.scrollHeight, MAX_TEXT_HEIGHT) + 'px';
  };
  textarea.addEventListener('change', resize);
  textarea.addEventListener('cut', () => setTimeout(resize, 0));
  textarea.addEventListener('paste', () => setTimeout(resize, 0));
  textarea.addEventListener('input', () => setTimeout(resize, 0));
  setTimeout(resize, 0);
}

function attachExpand(button, expandible) {
  const toggleExpandible = () => {
    expandible.classList.toggle('expanded');
  };
  button.addEventListener('click', toggleExpandible);
}

const setupTestTodo = () => {
  const t = document.getElementById('test');
  const textarea = t.getElementsByTagName('textarea')[0];
  const threedots = t.getElementsByClassName('expand')[0];
  const expandible = t.getElementsByClassName('expandible')[0];

  t.style.left = 50 + 'px';
  t.style.top = 50 + 'px';
  makeDraggable(t);

  autoResize(textarea);
  attachExpand(threedots, expandible);
};

window.addEventListener('load', () => {
  setupTestTodo();
});
