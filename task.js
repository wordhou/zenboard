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
  this.render();
  this.node.style.left = `${this.x}px`;
  this.node.style.top = `${this.y}px`;
}

// List of property names that are stored in localStorage
Task.storableProperties = ['text', 'due', 'done', 'pin', 'flag', 'expand',
  'x', 'y', 'z', 'created'];

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
  // References to DOM components of the listing element
  this.nodes = {
    text : e.querySelector('textarea'),
    due : e.querySelector('.due'),
    expander : e.querySelector('.expander'),
    expand : e.querySelector('.expand'),
    done : e.querySelector('.done'),
    flag : e.querySelector('.flag'),
    pin : e.querySelector('.pin'),
    trash : e.querySelector('.trash'),
  };

  // Set styles
  e.style.left = `${this.x}px`;
  e.style.top = `${this.y}px`;

  this.node = e;
};

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
    this.markChanged();
  });
  this.nodes.done.addEventListener('click', () => {
    this.toggle('done');
    this.markChanged();
  });
  this.nodes.pin.addEventListener('click', () => {
    this.toggle('pin');
    this.node.setAttribute('draggable', this.pin ? 'false' : 'true');
    this.markChanged();
  });
  this.nodes.flag.addEventListener('click', () => {
    this.toggle('flag');
    this.markChanged();
  });
  this.nodes.trash.addEventListener('click', () => this.promptDelete());
};

Task.prototype.markChanged = function () {
  const e = new CustomEvent('taskchange', { bubbles: true, detail: true });
  this.node.dispatchEvent(e);
};

Task.prototype.toggle = function (property) {
  if (typeof(this[property]) === 'boolean') {
    this[property] = !this[property];
    this.nodes[property].classList.toggle('on');
  }
};

Task.prototype.promptDelete = function () {
  const confirmed = confirm('Are you sure you want to delete?');
  if (confirmed)
    this.delete();
};

Task.prototype.delete = function () {
  const e = new CustomEvent('taskdelete', { bubbles: true, detail: this });
  this.node.dispatchEvent(e);
  this.node.remove();
};

