/* global clamp, autoResize, makeDynamicField, Template, Task */

/** Stores the state of a board. @constructor */
function Board({
  name = '',
  description = '',
  template = Template.default,
  width=1024
}) {
  this.name = name;
  this.description = description;
  this.template = template;
  this.width = width;
}

Board.storableProperties = ['name', 'description', 'template', 'width'];

Board.prototype.toJSON = function () {
  const obj = {};
  Board.storableProperties.map( key => obj[key] = this[key] );
  return obj;
};

/** Creates a new task, adds it to the boards map, and attaches it to the doc */
Board.prototype.addTask = function (task) {
  this.tasks.set(task.created, task);
  this.saveTasks();
  this.attachTask(task);
};

/** Adds a task to the board DOM and the board.tasks map */
Board.prototype.attachTask = function (task) {
  if (task.node === undefined) task.render();
  this.node.appendChild(task.node);
  task.addHandlers();
  return task;
};

/** Renders this board and attaches it to the DOM node */
Board.prototype.attach = function (target) {
  const element = document.createElement('div');
  element.classList.add('board');
  element.style.width = `${this.width}px`;

  this.node = element;

  // Replaces the element `<div id="board">` with our new element
  target.innerHTML = '';
  target.appendChild(element);

  for (let task of this.tasks.values()) {
    this.attachTask(task);
  }

  this.addHandlers();
};

/** Loads from localStorage to populate the tasks property with Tasks */
Board.prototype.loadTasks = function () {
  const tasksStored = localStorage.getItem(`tasks-${this.name}`);
  const tasksStr = tasksStored !== null ? tasksStored : 'null';

  if (tasksStored === null)
    return new Error(`Couldn't load tasks for board '${this.name}' from localStorage.`);

  this.tasks = new Map(JSON.parse(tasksStr).map( props =>
    [props.created, new Task(props)]));
};

Board.prototype.deleteTask = function (task) {
  this.tasks.delete(task.created);
  this.saveTasks();
};

Board.prototype.deleteTasksFromStorage = function () {
  localStorage.removeItem(`tasks-${this.name}`);
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
  // Creates a closure that stores the mouse offset based on initial click
  // position.  Since only one task can be dragged at a time, only one position
  // needs to be kept.
  var x0, y0, task;

  const grab = (t, event) => {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.dropEffect = 'move';
    t.node.classList.toggle('on');
    setTimeout(() => t.node.classList.toggle('on'), 10);

    if (!t.pin) {
      x0 = t.x - event.x;
      y0 = t.y - event.y;
      task = t;

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
    task.x = clamp (0, x0 + event.x, this.width - task.node.offsetWidth);
    task.y = clamp (0, y0 + event.y, 100000);
    task.node.style.left = task.x + 'px';
    task.node.style.top = task.y + 'px';
    document.removeEventListener('drop', drop);
    document.removeEventListener('dragover', dragoverHandler);
    this.saveTasks();
  };

  this.node.addEventListener('dragstart', event => {
    // Check whether ancestor contains class
    let elem = event.target;
    // TODO stop before elem == document
    while (!elem.classList.contains('todo') && elem !== document)
      elem = elem.parentNode;
    if (elem.classList.contains('todo')) {
      const task = this.tasks.get(elem.dataset.created);
      grab (task, event);
    }
    return false;
  });
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
  console.log('return from dispatchevent:', d);
  return d;
};

/** The board's tasks are saved to localStorage in an array of values */
Board.prototype.saveTasks = function () {
  const taskString = JSON.stringify(Array.from(this.tasks.values()));
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
