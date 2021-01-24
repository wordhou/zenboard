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
  this.done = done;
  this.pin = pin;
  this.flag = flag;
  this.expand = expand;
  this.x = x;
  this.y = y;
  this.z = z;
  this.category = category;
  this.order = order;
  this.created = created === undefined ? (new Date()).toJSON() : created;
  this.render();
  this.node.style.left = `${this.x}px`;
  this.node.style.top = `${this.y}px`;
}

// List of property names that are stored in localStorage
Task.storableProperties = ['text', 'due', 'done', 'pin', 'flag', 'expand',
  'x', 'y', 'z', 'category', 'order', 'created'];

Task.MAX_WIDTH = 300;
Task.flags = ['done', 'pin', 'flag', 'expand'];

Task.prototype.toJSON = function () {
  const obj = {};
  for ( let key of Task.storableProperties ) {
    obj[key] = this[key];
  }
  return obj;
};

/** Populates the .node property with a generated HTML element */
Task.prototype.render = function () {
  const e = document.createElement('div');
  e.classList.add('todo', 'task-drop-target');
  Task.flags.forEach ( flag => {
    if (this[flag]) e.classList.add(flag);
  });
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
  e.style.zIndex = -100;
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

