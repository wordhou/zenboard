/* global clamp, autoResize, makeDynamicField, Template, Task */

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
  this.tasks.set(task.created, task);

  if (task.x === undefined) {
    // TODO generate x,y values
    task.x = 200;
    task.y = 200;
  }
  if (task.category === undefined)

  this.moveTaskToTop(task);
  this.addTask(task);

  return task;
}


// Reindexes the category values
Board.prototype.removeTaskFromCategory = function (task) {
  const taskNodes = Array.from(this.categoryNodes[task.category].children);
  const tasks = taskNodes.map(node => this.tasks.get(node.dataset.created));
  tasks.forEach(t => { if (t.order >= task.order) {
    t.order++;
    t.setStyles();
  }
  });
  task.order = undefined;
}

/**
 * Sets the tasks category and position values and attaches the task to the DOM 
 * @param task - A task object 
 * @param cat - Category. If unspecified, uses the template default category.
 * @param pos - The position to attach to. If unspecified, adds to the end.
 */
Board.prototype.addTask = function (task, cat, pos) {
  // TODO Check if cat is reasonable and throw error otherwise
  const temp = Template.templates.get(this.template);
  task.category = cat === undefined ? temp.def : cat;

 /*Sets the category orders to allow another task to be insterted at a position.
  * If position is not given, it calculates the minimum unused index in the
  * category and also returns the value. */
  const taskNodes = Array.from(this.categoryNodes[task.category].children);
  const tasks = taskNodes.map(node => this.tasks.get(node.dataset.created));
  if (pos === undefined) {
    const orders = tasks.map(task => task.order);
    pos = 1;
    while (orders.includes(pos))
      pos++
    task.order = pos;
  } else {
    tasks.forEach(t => { if (t.order >= pos) {
        t.order++;
        t.setStyles();
      } });
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
  if (task.category !== cat) this.removeTaskFromCategory(task);
  this.addTask(task, cat, pos);
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
    const catElement = document.createElement('div');
    catElement.className = `category cat-${cat}`;
    this.categoryNodes[cat] = catElement;
    this.node.appendChild(catElement);
  });

  // Add the tasks
  this.tasks.forEach(task => this.addTask(task));

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
  // Creates a closure that stores the mouse offset based on initial click
  // position.  Since only one task can be dragged at a time, only one position
  // needs to be kept.
  var x0, y0, task;


  const grab = (t, event) => {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.dropEffect = 'move';

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
    this.moveTaskToTop(task);
    task.setStyles();
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
  console.log('moveTaskToTop', task, task.z);
  const tasks = Array.from(this.tasks.values());
  const zs = tasks.map(t => t === task ? null : t.z);
  console.log('zs', zs);

  let mex = Board.BASE_Z_INDEX;
  while (zs.includes(mex)) mex++;
  console.log('mex', mex);

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
