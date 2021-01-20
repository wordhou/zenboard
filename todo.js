/** Builds a new board with no tasks and default style */
function Board(serializedBoard) {
  if (serializedBoard === undefined) {
    this.name = '';
    this.tasks = new Map();
    this.template = 'basic';
    this.width = 1024;
    this.height = 768;
  } else {
    const obj = JSON.parse(serializedBoard);
    this.tasks = new Map(JSON.parse(obj.tasks));
    const props = ['name', 'template', 'width', 'height'];
    for (let key in props) {
      this[key] = obj[key];
    }
  }
}


/** Encodes the board state into a string */
Board.prototype.serialize = function () {
  const props = ['name', 'template', 'width', 'height'];
  const obj = {};
  for (let key in props) {
    obj[key] = this[key];
  }
  obj.tasks = Array.from(this.tasks.entries());
  return JSON.stringify(obj);
};

Board.prototype.render = function () {
  const element = document.createElement('div');
  element.id = 'board';
  this.element = element;
  this.element.style.width = `${this.width}px`;
  this.element.style.height = `${this.height}px`;

  // Replaces the element `<div id="board">` with our newly rendered element
  const oldBoard = document.getElementById('board');
  oldBoard.parentNode.replaceChild(this.element, oldBoard);

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
  autoResize(text);
  text.addEventListener('change', () => {
    task.text = text.value;
    this.save;
  });
  const due = e.getElementsByClassName('due')[0];
  text.addEventListener('change', () => {
    task.due = due.value;
    this.save;
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
    if (task.pin) return;
    x0 = parseInt(e.style.left) - event.x;
    y0 = parseInt(e.style.top) - event.y;
    this.element.addEventListener('mousemove', dragLater);
    this.element.addEventListener('mouseup', drop);
  };
  const drag = event => {
    task.x = clamp (0, x0 + event.x, this.width - Task.WIDTH);
    task.y = clamp (0, y0 + event.y, 100000);
    e.style.left = task.x + 'px';
    e.style.top = task.y + 'px';
  };
  const dragLater = event => setTimeout(() => drag(event), DRAG_DELAY);
  const drop = () => {
    this.element.removeEventListener('mousemove', dragLater);
    this.element.removeEventListener('mouseup', drop);
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

Board.prototype.resize = function (width, height) {
  this.width = width;
  this.height = height;
  this.element.style.width = `${width}px`;
  this.element.style.height = `${height}px`;
  // TODO: move all
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

Task.WIDTH = 200;

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
    this[property] = !this.property;
    this.element.getElementsByClassName(property)[0].classList.toggle('on');
  }
};

Task.prototype.toggleExpand = function () {
  this.expand = !this.expand;
  this.element.getElementsByClassName('expand')[0].classList.toggle('on');
};

Task.prototype.toggleFlag = function () {
  this.flag = !this.flag;
  this.element.getElementsByClassName('flag')[0].classList.toggle('on');
};

Task.prototype.toggleDone = function () {
  this.done = !this.done;
  this.element.getElementsByClassName('done')[0].classList.toggle('on');
};

Task.prototype.togglePin = function () {
  this.pin = !this.pin;
  this.element.getElementsByClassName('pin')[0].classList.toggle('on');
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

Task.prototype.update = function () {
};


/** Describes the background and size of a Board */
function BoardTemplate () {
  this.image = '';
  this.style = {};
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

const $ = document.getElementById;
const $$ = document.querySelector;

window.addEventListener('load', () => {
  const board = new Board();
  board.render();
  board.newTask();
});
