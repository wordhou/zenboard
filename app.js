function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _unsupportedIterableToArray(arr, i) || _nonIterableRest(); }

function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

function _iterableToArrayLimit(arr, i) { if (typeof Symbol === "undefined" || !(Symbol.iterator in Object(arr))) return; var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"] != null) _i["return"](); } finally { if (_d) throw _e; } } return _arr; }

function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }

function _createForOfIteratorHelper(o, allowArrayLike) { var it; if (typeof Symbol === "undefined" || o[Symbol.iterator] == null) { if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; var F = function F() {}; return { s: F, n: function n() { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }, e: function e(_e2) { throw _e2; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var normalCompletion = true, didErr = false, err; return { s: function s() { it = o[Symbol.iterator](); }, n: function n() { var step = it.next(); normalCompletion = step.done; return step; }, e: function e(_e3) { didErr = true; err = _e3; }, f: function f() { try { if (!normalCompletion && it["return"] != null) it["return"](); } finally { if (didErr) throw err; } } }; }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

/* global $, dist, clamp, autoResize, makeDynamicField, Template, Task, mex */

/** Stores the state of a board. @constructor */
function Board(_ref) {
  var _ref$name = _ref.name,
      name = _ref$name === void 0 ? '' : _ref$name,
      _ref$description = _ref.description,
      description = _ref$description === void 0 ? '' : _ref$description,
      _ref$template = _ref.template,
      template = _ref$template === void 0 ? Template["default"] : _ref$template,
      _ref$list = _ref.list,
      list = _ref$list === void 0 ? false : _ref$list;
  this.name = name;
  this.description = description;
  this.template = template;
  this.list = list;
  this.dummyTask = Task.renderDummy();
  this.loadTemplate();
}

Board.BASE_Z_INDEX = 5;
Board.storableProperties = ['name', 'description', 'template', 'list'];

Board.prototype.toJSON = function () {
  var _this = this;

  var obj = {};
  Board.storableProperties.map(function (key) {
    return obj[key] = _this[key];
  });
  return obj;
}; // Updates the state and the DOM


Board.prototype.newTask = function () {
  var props = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  var task = new Task(props);

  if (task.x === undefined) {
    var pos = this.newTaskPosition();
    task.x = pos.x;
    task.y = pos.y;
  }

  this.tasks.set(task.created, task);
  this.moveTaskToTop(task);
  return task;
};

Board.prototype.newTaskPosition = function () {
  var _this2 = this;

  var y0 = 25;
  var x0 = 10;
  var rect = this.node.getBoundingClientRect();
  var pos = {
    x: x0,
    y: y0
  };

  var bad = function bad(p) {
    return Array.from(_this2.tasks.values()).some(function (t) {
      return dist(p, t) < 5;
    });
  };

  while (bad(pos)) {
    pos.x += 60;
    pos.y += 10;

    if (pos.x + Task.MAX_WIDTH > rect.width) {
      y0 += 80;
      pos.x = x0;
      pos.y = y0;
    }

    if (pos.x + Task.MAX_WIDTH > rect.width && pos.y > 800) {
      return {
        x: 25,
        y: 25
      }; //Don't loop forever
    }
  }

  return pos;
}; // Reindexes the order values in the category that the task is in


Board.prototype.removeTaskFromCategory = function (task) {
  var _this3 = this;

  if (task.category === undefined) return false;
  var nodes = Array.from(this.categoryNodes[task.category].children);
  var tasks = nodes.map(function (node) {
    return _this3.tasks.get(node.dataset.created);
  });
  tasks.forEach(function (t) {
    if (t.order > task.order) {
      t.order--;
      t.setStyles();
    }
  });
  task.order = null; // Important
};
/**
 * Sets the tasks category and position values and attaches the task to the DOM 
 * @param task - A task object 
 * @param cat - Category. If unspecified, uses the template default category.
 * @param pos - The position to attach to. If unspecified, adds to the end.
 */


Board.prototype.putTask = function (task, cat, pos) {
  var _this4 = this;

  if (cat !== undefined && this.currentTemplate.categories.has(cat)) task.category = cat;else task.category = this.currentTemplate.def;
  var categoryNode = this.categoryNodes[task.category];
  var tasks = Array.from(categoryNode.children).map(function (node) {
    return _this4.tasks.get(node.dataset.created);
  });
  var orders = tasks.map(function (task) {
    return task.order;
  });

  var _iterator = _createForOfIteratorHelper(categoryNode.children),
      _step;

  try {
    for (_iterator.s(); !(_step = _iterator.n()).done;) {
      var t = _step.value;
      t.classList.remove('drop-hover');
    }
  } catch (err) {
    _iterator.e(err);
  } finally {
    _iterator.f();
  }

  if (pos === undefined) {
    // Put element in least unoccupied slot
    pos = 1;

    while (orders.includes(pos)) {
      pos++;
    }

    task.order = pos;
  } else {
    if (orders.includes(pos)) {
      // Shift elements
      tasks.forEach(function (t) {
        if (t !== task && t.order >= pos) {
          t.order++;
          t.setStyles();
        }
      });
    }

    task.order = pos;
  }

  task.setStyles();
  task.attach(this.categoryNodes[task.category]);
  return task;
};

Board.prototype.setCategoryOrders = function (cat, pos) {
  var _this5 = this;

  var taskNodes = Array.from(this.categoryNodes[cat].children);
  var tasks = taskNodes.map(function (node) {
    return _this5.tasks.get(node.dataset.created);
  });
  var orders = tasks.map(function (task) {
    return task.order;
  });

  if (pos === undefined) {
    pos = 1;

    while (orders.includes(pos)) {
      pos++;
    }

    return pos;
  }

  tasks.forEach(function (task) {
    if (task.order >= pos) task.order++;
  });
  return pos;
};
/**
 * Sets the task.category property, updates the category orders, and updates the DOM.
 */


Board.prototype.moveTaskToCategory = function (task, cat, pos) {
  this.removeTaskFromCategory(task);
  this.putTask(task, cat, pos);
};

Board.prototype.render = function () {
  var _this6 = this;

  var element = document.createElement('div');
  element.classList.add('board');
  if (this.list) element.classList.add('list-view');
  this.node = element;
  this.categoryNodes = {};
  this.currentTemplate.attachCategories(this.node, this.categoryNodes); // Add the tasks

  this.tasks.forEach(function (t) {
    return _this6.putTask(t, t.category, t.order);
  });
  this.addHandlers();
};
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
  var _this7 = this;

  this.node.addEventListener('taskchange', function () {
    return _this7.saveTasks();
  });
  this.node.addEventListener('taskdelete', function (e) {
    return _this7.deleteTask(e.detail);
  });
  this.makeTasksDraggable();
};
/** Attaches all event listeners to the DOM element for a task */


Board.prototype.makeTasksDraggable = function () {
  var _this8 = this;

  this.dragNewTaskHandler = function (event) {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setDragImage(_this8.dummyTask, 0, 0);

    var rect = _this8.node.getBoundingClientRect();

    var data = {
      task: null,
      dx: -rect.x,
      dy: -rect.y
    };
    event.dataTransfer.setData('text/plain', JSON.stringify(data));
  };

  var dragstartHandler = function dragstartHandler(event) {
    event.stopPropagation();
    var elem = event.target;

    while (!elem.classList.contains('todo') && elem !== document) {
      if (elem.classList === undefined || elem === document) return false;
      elem = elem.parentNode;
    }

    if (!elem.classList.contains('todo')) return false;

    var task = _this8.tasks.get(elem.dataset.created);

    if (!_this8.list && task.pin) return false;
    elem.classList.toggle('on'); // TODO does this work?

    event.dataTransfer.effectAllowed = 'move'; // ?

    event.dataTransfer.dropEffect = 'move'; // ?

    var data = {
      task: task.created,
      dx: task.x - event.clientX,
      dy: task.y - event.clientY
    };
    event.dataTransfer.setData('text/plain', JSON.stringify(data));
    return false;
  };

  var dragoverHandler = function dragoverHandler(event) {
    event.preventDefault();
    if (!_this8.list) return false;
    if (event.target.classList === undefined) return false;

    if (event.target.classList.contains('task-drop-target')) {
      event.target.classList.add('drop-hover');
    }
  };

  var dragleaveHandler = function dragleaveHandler(event) {
    if (!_this8.list) return false;
    if (event.target.classList === undefined) return false;

    if (event.target.classList.contains('task-drop-target')) {
      event.target.classList.remove('drop-hover');
    }
  };

  var dropHandler = function dropHandler(event) {
    event.preventDefault();
    var dataString = event.dataTransfer.getData('text/plain');
    if (dataString === "") return console.error('Weird drop events');
    var data = JSON.parse(dataString);
    var task;
    event.target.classList.remove('drop-hover');

    if (_this8.list) {
      var elem = event.target;

      while (!elem.classList.contains('task-drop-target')) {
        if (elem == document.body) return false;
        elem = elem.parentElement;
      }

      if (elem === task) return false; // Dragging task to itself

      task = data.task === null ? _this8.newTask() : _this8.tasks.get(data.task);

      if (elem.classList.contains('task-container')) {
        _this8.moveTaskToCategory(task, Template.getCatFromClassList(elem));
      }

      if (elem.classList.contains('category')) {
        _this8.moveTaskToCategory(task, Template.getCatFromClassList(elem));
      }

      if (elem.classList.contains('todo')) {
        var target = _this8.tasks.get(elem.dataset.created);

        _this8.moveTaskToCategory(task, target.category, target.order);
      }
    }

    if (!_this8.list) {
      if (data.task === null) {
        task = _this8.newTask();

        _this8.putTask(task);
      } else {
        task = _this8.tasks.get(data.task);
      }

      task.x = clamp(0, data.dx + event.clientX, _this8.node.clientWidth - task.node.offsetWidth);
      task.y = clamp(0, data.dy + event.clientY, _this8.node.clientHeight);

      _this8.moveTaskToTop(task);

      task.setStyles();
      if (data.task === null) task.nodes.text.focus();
    }

    _this8.saveTasks();
  };

  this.node.addEventListener('dragstart', dragstartHandler);
  this.node.addEventListener('dragover', dragoverHandler);
  this.node.addEventListener('dragleave', dragleaveHandler);
  this.node.addEventListener('drop', dropHandler);
  this.node.addEventListener('dragend', function (event) {
    event; //TODO anything else?
  });
};
/** Loads from localStorage to populate the tasks property with Tasks */


Board.prototype.loadTasks = function () {
  var tasksStored = localStorage.getItem("tasks-".concat(this.name));
  if (tasksStored === null) return this.tasks = new Map();
  return this.tasks = new Map(JSON.parse(tasksStored).map(function (props) {
    return [props.id, Task.fromJSON(props)];
  }));
};

Board.prototype.loadTemplate = function () {
  this.currentTemplate = Template.getTemplate(this.template);
};

Board.prototype.moveTaskToTop = function (task) {
  var tasks = Array.from(this.tasks.values());
  if (task.z !== undefined) this.tasks.forEach(function (t) {
    if (t.z > task.z) t.z--;
    t.setStyles();
  });
  var zs = tasks.map(function (t) {
    return t === task ? null : t.z;
  });
  var mex = Board.BASE_Z_INDEX;

  while (zs.includes(mex)) {
    mex++;
  }

  task.z = mex;
};

Board.prototype.deleteTask = function (task) {
  this.removeTaskFromCategory(task);
  this.tasks["delete"](task.created);
  task.node.remove();
  this.saveTasks();
};

Board.prototype.deleteTasksFromStorage = function () {
  localStorage.removeItem("tasks-".concat(this.name));
};
/** Creates the DOM node for the board listing this.listingNode */


Board.prototype.renderListing = function () {
  var e = document.createElement('div');
  e.className = 'board-listing-component';
  e.dataset.name = this.name;
  e.innerHTML = "\n      <div class=\"listing-icon\">O</div>\n      <div class=\"listing-main\">\n        <div class=\"listing-name field-wrapper\">\n          <div class=\"field\">\n            <h1 class=\"dyntext on\">".concat(this.name, "</h1>\n            <input class=\"dyninput\" value=\"").concat(this.name, "\">\n            </input>\n          </div>\n          <a class=\"edit-name button\">\n            <svg><use href=\"#edit\" /></svg>\n          </a>\n        </div>\n        <div class=\"listing-description field-wrapper\">\n          <div class=\"field\">\n            <h2 class=\"dyntext on\">").concat(this.description, "</h2>\n            <textarea placeholder=\"Description...\" class=\"dyninput\"\n              value=\"").concat(this.description, "\"></textarea>\n          </div>\n          <a class=\"edit-description button\">\n            <svg><use href=\"#edit\"></svg>\n          </a>\n        </div>\n      </div>");
  this.listingNode = e; // References to DOM components of the listing element

  this.listingNodes = {
    name: e.querySelector('.listing-name'),
    nameText: e.querySelector('.listing-name .dyntext'),
    nameInput: e.querySelector('.listing-name .dyninput'),
    description: e.querySelector('.listing-description'),
    descriptionText: e.querySelector('.listing-description .dyntext'),
    descriptionInput: e.querySelector('.listing-description .dyninput'),
    editName: e.querySelector('.edit-name'),
    editDescription: e.querySelector('.edit-description')
  };
  this.addHandlersToListing();
};

Board.prototype.addHandlersToListing = function () {
  var _this9 = this;

  autoResize(this.listingNodes.descriptionInput);
  this.listingNode.addEventListener('click', function (event) {
    // Check whether ancestor contains class
    var elem = event.target;

    while (elem !== document) {
      if (elem.classList.contains('button')) return false;
      elem = elem.parentNode;
    }

    var e = new CustomEvent('boardselect', {
      detail: _this9.name,
      bubbles: true
    });

    _this9.listingNode.dispatchEvent(e);
  });
  this.editName = makeDynamicField(this.listingNodes.editName, this.listingNodes.nameText, this.listingNodes.nameInput, function (value) {
    return _this9._dispatchRenameBoardEvent(value);
  });
  this.editDescription = makeDynamicField(this.listingNodes.editDescription, this.listingNodes.descriptionText, this.listingNodes.descriptionInput, function (value) {
    _this9.description = value;

    _this9.markChanged();

    return true;
  });
};

Board.prototype._dispatchRenameBoardEvent = function (newName) {
  var ev = new CustomEvent('renameboard', {
    detail: {
      board: this,
      newName: newName
    },
    bubbles: true,
    cancelable: true
  });
  var d = this.listingNode.dispatchEvent(ev);
  return d;
};
/** The board's tasks are saved to localStorage in an array of values */


Board.prototype.saveTasks = function () {
  if (this.tasks === undefined) return;
  var taskJSON = Array.from(this.tasks.values());
  var taskString = JSON.stringify(taskJSON);
  localStorage.setItem("tasks-".concat(this.name), taskString);
};

Board.prototype.moveTasksIntoView = function () {
  var _this10 = this;

  var rect = this.node.getBoundingClientRect();
  this.tasks.forEach(function (task) {
    task.x = clamp(0, task.x, rect.width - task.node.offsetWidth);
    task.y = clamp(0, task.y, rect.height - task.node.offsetHeight);
    task.setStyles();

    _this10.saveTasks();
  });
};

Board.prototype.markChanged = function () {
  var e = new CustomEvent('boardchange', {
    bubbles: true
  });
  this.listingNode.dispatchEvent(e);
};
/* global $, makeExpandible, clamp, autoResize, Template, State */


var addTemplateList = function addTemplateList(target, state) {
  Template.templates.forEach(function (template, name) {
    var element = Template.renderTemplateListing(template);
    element.addEventListener('click', function () {
      return state.changeTemplate(name);
    });
    target.appendChild(element);
  });
};

var state; // DEBUG:

window.addEventListener('load', function () {
  var $ = function $(id) {
    return document.getElementById(id);
  }; // Alias for brevity


  makeExpandible($('board-drawer'), $('board-drawer-handle'));
  makeExpandible($('template-list-expand'), $('template-list-expander'), $('template-list-exit'));
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

function State(_ref2) {
  var boardList = _ref2.boardList,
      board = _ref2.board,
      spinner = _ref2.spinner,
      newTask = _ref2.newTask,
      newBoard = _ref2.newBoard,
      deleteBoard = _ref2.deleteBoard,
      listView = _ref2.listView;
  this.nodes = {
    board: board,
    boardList: boardList,
    spinner: spinner,
    newTask: newTask,
    newBoard: newBoard,
    deleteBoard: deleteBoard,
    listView: listView
  };
}

State.DEFAULT_BOARD_NAME = 'Default Board';
State.NEW_BOARD_NAME = 'New Board';
State.MIN_BOARD_WIDTH = 720;
/** Tries to load boards, current board and settings from localStorage */

State.prototype.load = function () {
  var _this11 = this;

  var boards = localStorage.getItem('boards');
  var current = localStorage.getItem('current');
  var settings = localStorage.getItem('settings');
  this.settings = settings === null ? {} : JSON.parse(settings);

  if (boards !== null) {
    this.boards = new Map();
    JSON.parse(boards).map(function (props) {
      return _this11.addBoard(new Board(props));
    });
    this.current = current;
    this.loadBoard(this.current);
  } else {
    this._setupNew();
  }

  this._addHandlers();
};
/** Used when no existing boards are found in localStorage */


State.prototype._setupNew = function () {
  var def = State.DEFAULT_BOARD_NAME;
  this.boards = new Map();
  var defaultBoard = new Board({
    name: def
  });
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
  board.attach(this.nodes.board, this.nodes.spinner); // Make sure the selected board has class 'on'

  var _iterator2 = _createForOfIteratorHelper(this.boards.values()),
      _step2;

  try {
    for (_iterator2.s(); !(_step2 = _iterator2.n()).done;) {
      var _board = _step2.value;

      _board.listingNode.classList.toggle('on', this.current === _board.name);
    }
  } catch (err) {
    _iterator2.e(err);
  } finally {
    _iterator2.f();
  }

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
};
/** */


State.prototype.save = function () {
  localStorage.setItem('current', this.current);
  localStorage.setItem('boards', JSON.stringify(Array.from(this.boards.values())));
  localStorage.setItem('settings', JSON.stringify(this.settings));
};
/**
  * Loads the board given its name, sets it to the current board, and attaches
  * it to the DOM */


State.prototype.loadBoard = function (boardName) {
  console.log('Loading board', boardName);
  var board = this.boards.get(boardName);

  if (board === undefined) {
    console.log("No board found with name ".concat(boardName, "."));
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
  if (board.name === newName) return true; // Returns true when rename was successful

  if (this.boards.has(newName)) return false; // Fails because two boards can't have the same name

  /* TODO add validity check to name
  if (`name is not valid`)
    return false;
  */

  var oldName = board.name; // Updates the boards map

  this.boards["delete"](oldName);
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
  var newName = State.NEW_BOARD_NAME;

  for (var i = 1; this.boards.has(newName); i++) {
    newName = "".concat(State.NEW_BOARD_NAME, " (").concat(i, ")");
  }

  var board = new Board({
    name: newName
  });
  board.tasks = new Map();
  this.addBoard(board);
  this.save();
};

State.prototype._deleteBoard = function (boardName) {
  var board = this.boards.get(boardName);
  board.deleteTasksFromStorage();
  board.listingNode.remove();
  this.boards["delete"](boardName);
};

State.prototype.deleteBoard = function () {
  var yes = confirm("Are you sure you want to delete ".concat(this.current, "?"));
  if (yes) this._deleteBoard(this.current);

  this._loadLastBoard();
};
/** Load a board (the last one added). If no board exists, call _setupNew */


State.prototype._loadLastBoard = function () {
  var lastBoard = Array.from(this.boards.keys()).pop();

  if (lastBoard === undefined) {
    this._setupNew();
  } else {
    this.loadBoard(lastBoard);
    this.save();
  }
};

State.prototype._addHandlers = function () {
  var _this12 = this;

  window.addEventListener('resize', function () {
    if (_this12.board.list) return false;
    if (_this12.board.node.offsetWidth <= State.MIN_BOARD_WIDTH) return _this12.toggleListView();

    _this12.board.moveTasksIntoView();
  });
  document.addEventListener('boardselect', function (event) {
    _this12.loadBoard(event.detail);
  }, true);
  document.addEventListener('renameboard', function (event) {
    var success = _this12.renameBoard(event.detail.board, event.detail.newName); // Indicates to the event dispatcher that the rename was unsuccessful


    if (!success) event.preventDefault();
  }, {
    passive: false
  });
  document.addEventListener('boardchange', function () {
    return _this12.save();
  });
  this.nodes.newTask.addEventListener('click', function () {
    var task = _this12.board.newTask();

    _this12.board.putTask(task);

    task.nodes.text.focus();

    _this12.board.saveTasks();
  });
  this.nodes.newTask.addEventListener('dragstart', function (event) {
    _this12.board.dragNewTaskHandler(event);
  });
  this.nodes.newBoard.addEventListener('click', function () {
    return _this12.newBoard();
  });
  this.nodes.deleteBoard.addEventListener('click', function () {
    return _this12.deleteBoard();
  });
  this.nodes.listView.addEventListener('click', function () {
    return _this12.toggleListView();
  });
};

State.prototype.toggleListView = function () {
  this.board.list = !this.board.list;
  this.save();
  this.setBoardStyles();
};

State.prototype.setBoardStyles = function () {
  this.board.node.classList.toggle('list-view', this.board.list);
  this.nodes.listView.classList.toggle('on', this.board.list);
};
/* global autoResize  */

/**
 * Represents a task as well as its position in the canvas
 */


function Task(_ref3) {
  var _ref3$text = _ref3.text,
      text = _ref3$text === void 0 ? '' : _ref3$text,
      _ref3$due = _ref3.due,
      due = _ref3$due === void 0 ? '' : _ref3$due,
      _ref3$done = _ref3.done,
      done = _ref3$done === void 0 ? false : _ref3$done,
      _ref3$pin = _ref3.pin,
      pin = _ref3$pin === void 0 ? false : _ref3$pin,
      _ref3$flag = _ref3.flag,
      flag = _ref3$flag === void 0 ? false : _ref3$flag,
      _ref3$expand = _ref3.expand,
      expand = _ref3$expand === void 0 ? false : _ref3$expand,
      x = _ref3.x,
      y = _ref3.y,
      z = _ref3.z,
      category = _ref3.category,
      order = _ref3.order,
      created = _ref3.created;
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
  this.created = created === undefined ? new Date().toJSON() : created;
  this.render();
  this.setStyles();
} // List of property names that are stored in localStorage


Task.storableProps = {
  'text': 't',
  'due': 'u',
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
  var obj = {};

  for (var _i = 0, _Object$entries = Object.entries(Task.storableProps); _i < _Object$entries.length; _i++) {
    var _Object$entries$_i = _slicedToArray(_Object$entries[_i], 2),
        k = _Object$entries$_i[0],
        v = _Object$entries$_i[1];

    if (Task.flags.includes(k)) obj[v] = this[k] ? 1 : 0;else obj[v] = this[k];
  }

  return obj;
};

Task.fromJSON = function (obj) {
  var props = {};

  for (var _i2 = 0, _Object$entries2 = Object.entries(Task.storableProps); _i2 < _Object$entries2.length; _i2++) {
    var _Object$entries2$_i = _slicedToArray(_Object$entries2[_i2], 2),
        k = _Object$entries2$_i[0],
        v = _Object$entries2$_i[1];

    props[k] = obj[v];
  }

  return new Task(props);
};
/** Populates the .node property with a generated HTML element */


Task.prototype.render = function () {
  var _this13 = this;

  var e = document.createElement('div');
  e.classList.add('todo', 'task-drop-target');
  Task.flags.filter(function (f) {
    return _this13[f];
  }).forEach(function (f) {
    return e.classList.add(f);
  });
  e.setAttribute('draggable', !this.pin);
  e.dataset.created = this.created;
  e.innerHTML = "<textarea placeholder=\"Todo...\">".concat(this.text, "</textarea>\n\n    <div class=\"expandible\">\n    Due: <input type=\"date\" class=\"due\" value=\"").concat(this.due, "\"/>\n    </div>\n\n    <ul class=\"icons\">\n    <li><a class=\"expander\"><svg><use href=\"#three-dots\" /></svg> </a></li>\n    <li><a class=\"done\"><svg><use href=\"#check\" /></svg> </a></li>\n    <li><a class=\"pin\"><svg><use href=\"#pin\" /></svg> </a></li>\n    <li><a class=\"flag\"><svg><use href=\"#flag\" /></svg></a> </li>\n    <li><a class=\"trash\"><svg><use href=\"#trash\" /></svg></a> </li>\n    </ul>"); // References to DOM components of the listing element

  this.nodes = {
    text: e.querySelector('textarea'),
    due: e.querySelector('.due'),
    expander: e.querySelector('.expander'),
    expand: e.querySelector('.expandible'),
    done: e.querySelector('.done'),
    flag: e.querySelector('.flag'),
    pin: e.querySelector('.pin'),
    trash: e.querySelector('.trash')
  };
  this.node = e;
  this.setStyles();
  this.addHandlers();
};

Task.renderDummy = function () {
  var e = document.createElement('div');
  e.className = 'todo dummy';
  e.innerHTML = "<textarea>New task! Drop me in the category you want me to be in.</textarea>\n\n    <ul class=\"icons\">\n    <li><a class=\"expander\"><svg><use href=\"#three-dots\" /></svg> </a></li>\n    <li><a class=\"done\"><svg><use href=\"#check\" /></svg> </a></li>\n    <li><a class=\"pin\"><svg><use href=\"#pin\" /></svg> </a></li>\n    <li><a class=\"flag\"><svg><use href=\"#flag\" /></svg></a> </li>\n    <li><a class=\"trash\"><svg><use href=\"#trash\" /></svg></a> </li>\n    </ul>";
  return e;
};

Task.prototype.setStyles = function () {
  this.node.style.left = "".concat(this.x, "px");
  this.node.style.top = "".concat(this.y, "px");
  this.node.style.zIndex = "".concat(this.z);
  this.node.style.order = "".concat(this.order);
};

Task.prototype.addHandlers = function () {
  var _this14 = this;

  autoResize(this.nodes.text);
  this.nodes.text.addEventListener('change', function () {
    _this14.text = _this14.nodes.text.value;

    _this14.markChanged();
  });
  this.nodes.due.addEventListener('change', function () {
    _this14.due = _this14.nodes.due.value;

    _this14.markChanged();
  });
  this.nodes.expander.addEventListener('click', function () {
    _this14.toggle('expand');
  });
  this.nodes.done.addEventListener('click', function () {
    _this14.toggle('done');
  });
  this.nodes.pin.addEventListener('click', function () {
    _this14.toggle('pin');

    _this14.node.setAttribute('draggable', _this14.pin ? 'false' : 'true');
  });
  this.nodes.flag.addEventListener('click', function () {
    _this14.toggle('flag');
  });
  this.nodes.trash.addEventListener('click', function () {
    return _this14.promptDelete();
  });
};

Task.prototype.attach = function (target) {
  if (this.node === undefined) this.render();
  target.appendChild(this.node);
};

Task.prototype.markChanged = function () {
  var e = new CustomEvent('taskchange', {
    bubbles: true,
    detail: true
  });
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
  this["delete"]();
};

Task.prototype["delete"] = function () {
  var e = new CustomEvent('taskdelete', {
    bubbles: true,
    detail: this
  });
  this.node.dispatchEvent(e);
};
/**
 * Defines the background, styles, categories of a board.
 */


function Template(_ref4) {
  var name = _ref4.name,
      description = _ref4.description,
      categories = _ref4.categories,
      def = _ref4.def,
      styles = _ref4.styles;
  this.name = name;
  this.description = description;
  this.categories = new Map(categories);
  this.def = def;
  this.styles = styles;
}

Template["default"] = 'Default';
Template.templates = new Map([// eslint-disable-next-line
{
  "name": "Default",
  "description": "",
  "categories": [["todo", {
    "title": "Todo list",
    "styles": {}
  }]],
  "def": "todo",
  "styles": [// SVG pattern by HeroPatterns.com under CC BY 4.0 license
  ".board {\nbackground-color: #ffffff;\n\nbackground-image: url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='119' height='119' viewBox='0 0 100 100'%3E%3Cg stroke='%23dee6dc' stroke-width='45.7' stroke-opacity='0.61'%3E%3Crect fill='%23f6f6f6' x='-60' y='-60' width='110' height='240'/%3E%3C/g%3E%3C/svg%3E\");\n      }"]
}, {
  "name": "Default",
  "description": "",
  "categories": [["todo", {
    "title": "Todo list",
    "styles": {}
  }]],
  "def": "todo",
  "styles": [// SVG pattern by HeroPatterns.com under CC BY 4.0 license
  ".board {\nbackground-color: #ffffff;\n\nbackground-image: url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='119' height='119' viewBox='0 0 100 100'%3E%3Cg stroke='%23dee6dc' stroke-width='45.7' stroke-opacity='0.61'%3E%3Crect fill='%23f6f6f6' x='-60' y='-60' width='110' height='240'/%3E%3C/g%3E%3C/svg%3E\");\n      }"]
}, {
  "name": "Default",
  "description": "",
  "categories": [["todo", {
    "title": "Todo list",
    "styles": {}
  }]],
  "def": "todo",
  "styles": [// SVG pattern by HeroPatterns.com under CC BY 4.0 license
  ".board {\nbackground-color: #ffffff;\n\nbackground-image: url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='119' height='119' viewBox='0 0 100 100'%3E%3Cg stroke='%23dee6dc' stroke-width='45.7' stroke-opacity='0.61'%3E%3Crect fill='%23f6f6f6' x='-60' y='-60' width='110' height='240'/%3E%3C/g%3E%3C/svg%3E\");\n      }"]
}, {
  "name": "Default",
  "description": "",
  "categories": [["todo", {
    "title": "Todo list",
    "styles": {}
  }]],
  "def": "todo",
  "styles": [// SVG pattern by HeroPatterns.com under CC BY 4.0 license
  ".board {\nbackground-color: #ffffff;\n\nbackground-image: url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='119' height='119' viewBox='0 0 100 100'%3E%3Cg stroke='%23dee6dc' stroke-width='45.7' stroke-opacity='0.61'%3E%3Crect fill='%23f6f6f6' x='-60' y='-60' width='110' height='240'/%3E%3C/g%3E%3C/svg%3E\");\n      }"]
}, {
  "name": "Default",
  "description": "",
  "categories": [["todo", {
    "title": "Todo list",
    "styles": {}
  }]],
  "def": "todo",
  "styles": [// SVG pattern by HeroPatterns.com under CC BY 4.0 license
  ".board {\nbackground-color: #ffffff;\n\nbackground-image: url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='119' height='119' viewBox='0 0 100 100'%3E%3Cg stroke='%23dee6dc' stroke-width='45.7' stroke-opacity='0.61'%3E%3Crect fill='%23f6f6f6' x='-60' y='-60' width='110' height='240'/%3E%3C/g%3E%3C/svg%3E\");\n      }"]
}, {
  "name": "Default",
  "description": "",
  "categories": [["todo", {
    "title": "Todo list",
    "styles": {}
  }]],
  "def": "todo",
  "styles": [// SVG pattern by HeroPatterns.com under CC BY 4.0 license
  ".board {\nbackground-color: #ffffff;\n\nbackground-image: url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='119' height='119' viewBox='0 0 100 100'%3E%3Cg stroke='%23dee6dc' stroke-width='45.7' stroke-opacity='0.61'%3E%3Crect fill='%23f6f6f6' x='-60' y='-60' width='110' height='240'/%3E%3C/g%3E%3C/svg%3E\");\n      }"]
}, {
  "name": "Default",
  "description": "",
  "categories": [["todo", {
    "title": "Todo list",
    "styles": {}
  }]],
  "def": "todo",
  "styles": [// SVG pattern by HeroPatterns.com under CC BY 4.0 license
  ".board {\nbackground-color: #ffffff;\n\nbackground-image: url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='119' height='119' viewBox='0 0 100 100'%3E%3Cg stroke='%23dee6dc' stroke-width='45.7' stroke-opacity='0.61'%3E%3Crect fill='%23f6f6f6' x='-60' y='-60' width='110' height='240'/%3E%3C/g%3E%3C/svg%3E\");\n      }"]
}, {
  "name": "Default",
  "description": "",
  "categories": [["todo", {
    "title": "Todo list",
    "styles": {}
  }]],
  "def": "todo",
  "styles": [// SVG pattern by HeroPatterns.com under CC BY 4.0 license
  ".board {\nbackground-color: #ffffff;\n\nbackground-image: url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='119' height='119' viewBox='0 0 100 100'%3E%3Cg stroke='%23dee6dc' stroke-width='45.7' stroke-opacity='0.61'%3E%3Crect fill='%23f6f6f6' x='-60' y='-60' width='110' height='240'/%3E%3C/g%3E%3C/svg%3E\");\n      }"]
}, {
  "name": "Default",
  "description": "",
  "categories": [["todo", {
    "title": "Todo list",
    "styles": {}
  }]],
  "def": "todo",
  "styles": [// SVG pattern by HeroPatterns.com under CC BY 4.0 license
  ".board {\nbackground-color: #ffffff;\n\nbackground-image: url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='119' height='119' viewBox='0 0 100 100'%3E%3Cg stroke='%23dee6dc' stroke-width='45.7' stroke-opacity='0.61'%3E%3Crect fill='%23f6f6f6' x='-60' y='-60' width='110' height='240'/%3E%3C/g%3E%3C/svg%3E\");\n      }"]
}, {
  "name": "Default",
  "description": "",
  "categories": [["todo", {
    "title": "Todo list",
    "styles": {}
  }]],
  "def": "todo",
  "styles": [// SVG pattern by HeroPatterns.com under CC BY 4.0 license
  ".board {\nbackground-color: #ffffff;\n\nbackground-image: url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='119' height='119' viewBox='0 0 100 100'%3E%3Cg stroke='%23dee6dc' stroke-width='45.7' stroke-opacity='0.61'%3E%3Crect fill='%23f6f6f6' x='-60' y='-60' width='110' height='240'/%3E%3C/g%3E%3C/svg%3E\");\n      }"]
}, {
  "name": "Default",
  "description": "",
  "categories": [["todo", {
    "title": "Todo list",
    "styles": {}
  }]],
  "def": "todo",
  "styles": [// SVG pattern by HeroPatterns.com under CC BY 4.0 license
  ".board {\nbackground-color: #ffffff;\n\nbackground-image: url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='119' height='119' viewBox='0 0 100 100'%3E%3Cg stroke='%23dee6dc' stroke-width='45.7' stroke-opacity='0.61'%3E%3Crect fill='%23f6f6f6' x='-60' y='-60' width='110' height='240'/%3E%3C/g%3E%3C/svg%3E\");\n      }"]
}, {
  "name": "Default",
  "description": "",
  "categories": [["todo", {
    "title": "Todo list",
    "styles": {}
  }]],
  "def": "todo",
  "styles": [// SVG pattern by HeroPatterns.com under CC BY 4.0 license
  ".board {\nbackground-color: #ffffff;\n\nbackground-image: url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='119' height='119' viewBox='0 0 100 100'%3E%3Cg stroke='%23dee6dc' stroke-width='45.7' stroke-opacity='0.61'%3E%3Crect fill='%23f6f6f6' x='-60' y='-60' width='110' height='240'/%3E%3C/g%3E%3C/svg%3E\");\n      }"]
}, {
  "name": "Default",
  "description": "",
  "categories": [["todo", {
    "title": "Todo list",
    "styles": {}
  }]],
  "def": "todo",
  "styles": [// SVG pattern by HeroPatterns.com under CC BY 4.0 license
  ".board {\nbackground-color: #ffffff;\n\nbackground-image: url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='119' height='119' viewBox='0 0 100 100'%3E%3Cg stroke='%23dee6dc' stroke-width='45.7' stroke-opacity='0.61'%3E%3Crect fill='%23f6f6f6' x='-60' y='-60' width='110' height='240'/%3E%3C/g%3E%3C/svg%3E\");\n      }"]
}, {
  "name": "Default",
  "description": "",
  "categories": [["todo", {
    "title": "Todo list",
    "styles": {}
  }]],
  "def": "todo",
  "styles": [// SVG pattern by HeroPatterns.com under CC BY 4.0 license
  ".board {\nbackground-color: #ffffff;\n\nbackground-image: url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='119' height='119' viewBox='0 0 100 100'%3E%3Cg stroke='%23dee6dc' stroke-width='45.7' stroke-opacity='0.61'%3E%3Crect fill='%23f6f6f6' x='-60' y='-60' width='110' height='240'/%3E%3C/g%3E%3C/svg%3E\");\n      }"]
}, {
  "name": "Default",
  "description": "",
  "categories": [["todo", {
    "title": "Todo list",
    "styles": {}
  }]],
  "def": "todo",
  "styles": [// SVG pattern by HeroPatterns.com under CC BY 4.0 license
  ".board {\nbackground-color: #ffffff;\n\nbackground-image: url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='119' height='119' viewBox='0 0 100 100'%3E%3Cg stroke='%23dee6dc' stroke-width='45.7' stroke-opacity='0.61'%3E%3Crect fill='%23f6f6f6' x='-60' y='-60' width='110' height='240'/%3E%3C/g%3E%3C/svg%3E\");\n      }"]
}, {
  "name": "Default",
  "description": "",
  "categories": [["todo", {
    "title": "Todo list",
    "styles": {}
  }]],
  "def": "todo",
  "styles": [// SVG pattern by HeroPatterns.com under CC BY 4.0 license
  ".board {\nbackground-color: #ffffff;\n\nbackground-image: url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='119' height='119' viewBox='0 0 100 100'%3E%3Cg stroke='%23dee6dc' stroke-width='45.7' stroke-opacity='0.61'%3E%3Crect fill='%23f6f6f6' x='-60' y='-60' width='110' height='240'/%3E%3C/g%3E%3C/svg%3E\");\n      }"]
}, {
  "name": "Trifold",
  "description": "",
  "categories": [["todo", {
    "title": "Todo list",
    "styles": {}
  }], ["inprogress", {
    "title": "In progress",
    "styles": {}
  }], ["complete", {
    "title": "Completed",
    "styles": {}
  }]],
  "styles": [" .board {\nbackground-color: #f8f8f8;\n\nbackground-image: url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 56 28' width='56' height='28'%3E%3Cpath fill='%23809883' fill-opacity='0.4' d='M56 26v2h-7.75c2.3-1.27 4.94-2 7.75-2zm-26 2a2 2 0 1 0-4 0h-4.09A25.98 25.98 0 0 0 0 16v-2c.67 0 1.34.02 2 .07V14a2 2 0 0 0-2-2v-2a4 4 0 0 1 3.98 3.6 28.09 28.09 0 0 1 2.8-3.86A8 8 0 0 0 0 6V4a9.99 9.99 0 0 1 8.17 4.23c.94-.95 1.96-1.83 3.03-2.63A13.98 13.98 0 0 0 0 0h7.75c2 1.1 3.73 2.63 5.1 4.45 1.12-.72 2.3-1.37 3.53-1.93A20.1 20.1 0 0 0 14.28 0h2.7c.45.56.88 1.14 1.29 1.74 1.3-.48 2.63-.87 4-1.15-.11-.2-.23-.4-.36-.59H26v.07a28.4 28.4 0 0 1 4 0V0h4.09l-.37.59c1.38.28 2.72.67 4.01 1.15.4-.6.84-1.18 1.3-1.74h2.69a20.1 20.1 0 0 0-2.1 2.52c1.23.56 2.41 1.2 3.54 1.93A16.08 16.08 0 0 1 48.25 0H56c-4.58 0-8.65 2.2-11.2 5.6 1.07.8 2.09 1.68 3.03 2.63A9.99 9.99 0 0 1 56 4v2a8 8 0 0 0-6.77 3.74c1.03 1.2 1.97 2.5 2.79 3.86A4 4 0 0 1 56 10v2a2 2 0 0 0-2 2.07 28.4 28.4 0 0 1 2-.07v2c-9.2 0-17.3 4.78-21.91 12H30zM7.75 28H0v-2c2.81 0 5.46.73 7.75 2zM56 20v2c-5.6 0-10.65 2.3-14.28 6h-2.7c4.04-4.89 10.15-8 16.98-8zm-39.03 8h-2.69C10.65 24.3 5.6 22 0 22v-2c6.83 0 12.94 3.11 16.97 8zm15.01-.4a28.09 28.09 0 0 1 2.8-3.86 8 8 0 0 0-13.55 0c1.03 1.2 1.97 2.5 2.79 3.86a4 4 0 0 1 7.96 0zm14.29-11.86c1.3-.48 2.63-.87 4-1.15a25.99 25.99 0 0 0-44.55 0c1.38.28 2.72.67 4.01 1.15a21.98 21.98 0 0 1 36.54 0zm-5.43 2.71c1.13-.72 2.3-1.37 3.54-1.93a19.98 19.98 0 0 0-32.76 0c1.23.56 2.41 1.2 3.54 1.93a15.98 15.98 0 0 1 25.68 0zm-4.67 3.78c.94-.95 1.96-1.83 3.03-2.63a13.98 13.98 0 0 0-22.4 0c1.07.8 2.09 1.68 3.03 2.63a9.99 9.99 0 0 1 16.34 0z'%3E%3C/path%3E%3C/svg%3E\");\n      }"],
  "def": "todo"
}, {
  "name": "Zen",
  "description": "",
  "categories": [["todo", {
    "title": "Right now",
    "styles": {}
  }], ["later", {
    "title": "Later",
    "styles": {}
  }]],
  "def": "todo",
  "styles": [// SVG pattern by HeroPatterns.com under CC BY 4.0 license
  ".board {\nbackground-color: #f8f8f8;\n\nbackground-image: url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 56 28' width='56' height='28'%3E%3Cpath fill='%23809883' fill-opacity='0.4' d='M56 26v2h-7.75c2.3-1.27 4.94-2 7.75-2zm-26 2a2 2 0 1 0-4 0h-4.09A25.98 25.98 0 0 0 0 16v-2c.67 0 1.34.02 2 .07V14a2 2 0 0 0-2-2v-2a4 4 0 0 1 3.98 3.6 28.09 28.09 0 0 1 2.8-3.86A8 8 0 0 0 0 6V4a9.99 9.99 0 0 1 8.17 4.23c.94-.95 1.96-1.83 3.03-2.63A13.98 13.98 0 0 0 0 0h7.75c2 1.1 3.73 2.63 5.1 4.45 1.12-.72 2.3-1.37 3.53-1.93A20.1 20.1 0 0 0 14.28 0h2.7c.45.56.88 1.14 1.29 1.74 1.3-.48 2.63-.87 4-1.15-.11-.2-.23-.4-.36-.59H26v.07a28.4 28.4 0 0 1 4 0V0h4.09l-.37.59c1.38.28 2.72.67 4.01 1.15.4-.6.84-1.18 1.3-1.74h2.69a20.1 20.1 0 0 0-2.1 2.52c1.23.56 2.41 1.2 3.54 1.93A16.08 16.08 0 0 1 48.25 0H56c-4.58 0-8.65 2.2-11.2 5.6 1.07.8 2.09 1.68 3.03 2.63A9.99 9.99 0 0 1 56 4v2a8 8 0 0 0-6.77 3.74c1.03 1.2 1.97 2.5 2.79 3.86A4 4 0 0 1 56 10v2a2 2 0 0 0-2 2.07 28.4 28.4 0 0 1 2-.07v2c-9.2 0-17.3 4.78-21.91 12H30zM7.75 28H0v-2c2.81 0 5.46.73 7.75 2zM56 20v2c-5.6 0-10.65 2.3-14.28 6h-2.7c4.04-4.89 10.15-8 16.98-8zm-39.03 8h-2.69C10.65 24.3 5.6 22 0 22v-2c6.83 0 12.94 3.11 16.97 8zm15.01-.4a28.09 28.09 0 0 1 2.8-3.86 8 8 0 0 0-13.55 0c1.03 1.2 1.97 2.5 2.79 3.86a4 4 0 0 1 7.96 0zm14.29-11.86c1.3-.48 2.63-.87 4-1.15a25.99 25.99 0 0 0-44.55 0c1.38.28 2.72.67 4.01 1.15a21.98 21.98 0 0 1 36.54 0zm-5.43 2.71c1.13-.72 2.3-1.37 3.54-1.93a19.98 19.98 0 0 0-32.76 0c1.23.56 2.41 1.2 3.54 1.93a15.98 15.98 0 0 1 25.68 0zm-4.67 3.78c.94-.95 1.96-1.83 3.03-2.63a13.98 13.98 0 0 0-22.4 0c1.07.8 2.09 1.68 3.03 2.63a9.99 9.99 0 0 1 16.34 0z'%3E%3C/path%3E%3C/svg%3E\");\n      }"]
}, {
  "name": "Trifold",
  "description": "",
  "categories": [["todo", {
    "title": "Todo list",
    "styles": {}
  }], ["inprogress", {
    "title": "In progress",
    "styles": {}
  }], ["complete", {
    "title": "Completed",
    "styles": {}
  }]],
  "styles": [" .board {\nbackground-color: #f8f8f8;\n\nbackground-image: url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 56 28' width='56' height='28'%3E%3Cpath fill='%23809883' fill-opacity='0.4' d='M56 26v2h-7.75c2.3-1.27 4.94-2 7.75-2zm-26 2a2 2 0 1 0-4 0h-4.09A25.98 25.98 0 0 0 0 16v-2c.67 0 1.34.02 2 .07V14a2 2 0 0 0-2-2v-2a4 4 0 0 1 3.98 3.6 28.09 28.09 0 0 1 2.8-3.86A8 8 0 0 0 0 6V4a9.99 9.99 0 0 1 8.17 4.23c.94-.95 1.96-1.83 3.03-2.63A13.98 13.98 0 0 0 0 0h7.75c2 1.1 3.73 2.63 5.1 4.45 1.12-.72 2.3-1.37 3.53-1.93A20.1 20.1 0 0 0 14.28 0h2.7c.45.56.88 1.14 1.29 1.74 1.3-.48 2.63-.87 4-1.15-.11-.2-.23-.4-.36-.59H26v.07a28.4 28.4 0 0 1 4 0V0h4.09l-.37.59c1.38.28 2.72.67 4.01 1.15.4-.6.84-1.18 1.3-1.74h2.69a20.1 20.1 0 0 0-2.1 2.52c1.23.56 2.41 1.2 3.54 1.93A16.08 16.08 0 0 1 48.25 0H56c-4.58 0-8.65 2.2-11.2 5.6 1.07.8 2.09 1.68 3.03 2.63A9.99 9.99 0 0 1 56 4v2a8 8 0 0 0-6.77 3.74c1.03 1.2 1.97 2.5 2.79 3.86A4 4 0 0 1 56 10v2a2 2 0 0 0-2 2.07 28.4 28.4 0 0 1 2-.07v2c-9.2 0-17.3 4.78-21.91 12H30zM7.75 28H0v-2c2.81 0 5.46.73 7.75 2zM56 20v2c-5.6 0-10.65 2.3-14.28 6h-2.7c4.04-4.89 10.15-8 16.98-8zm-39.03 8h-2.69C10.65 24.3 5.6 22 0 22v-2c6.83 0 12.94 3.11 16.97 8zm15.01-.4a28.09 28.09 0 0 1 2.8-3.86 8 8 0 0 0-13.55 0c1.03 1.2 1.97 2.5 2.79 3.86a4 4 0 0 1 7.96 0zm14.29-11.86c1.3-.48 2.63-.87 4-1.15a25.99 25.99 0 0 0-44.55 0c1.38.28 2.72.67 4.01 1.15a21.98 21.98 0 0 1 36.54 0zm-5.43 2.71c1.13-.72 2.3-1.37 3.54-1.93a19.98 19.98 0 0 0-32.76 0c1.23.56 2.41 1.2 3.54 1.93a15.98 15.98 0 0 1 25.68 0zm-4.67 3.78c.94-.95 1.96-1.83 3.03-2.63a13.98 13.98 0 0 0-22.4 0c1.07.8 2.09 1.68 3.03 2.63a9.99 9.99 0 0 1 16.34 0z'%3E%3C/path%3E%3C/svg%3E\");\n      }"],
  "def": "todo"
}, {
  "name": "Zen",
  "description": "",
  "categories": [["todo", {
    "title": "Right now",
    "styles": {}
  }], ["later", {
    "title": "Later",
    "styles": {}
  }]],
  "def": "todo",
  "styles": [// SVG pattern by HeroPatterns.com under CC BY 4.0 license
  ".board {\nbackground-color: #f8f8f8;\n\nbackground-image: url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 56 28' width='56' height='28'%3E%3Cpath fill='%23809883' fill-opacity='0.4' d='M56 26v2h-7.75c2.3-1.27 4.94-2 7.75-2zm-26 2a2 2 0 1 0-4 0h-4.09A25.98 25.98 0 0 0 0 16v-2c.67 0 1.34.02 2 .07V14a2 2 0 0 0-2-2v-2a4 4 0 0 1 3.98 3.6 28.09 28.09 0 0 1 2.8-3.86A8 8 0 0 0 0 6V4a9.99 9.99 0 0 1 8.17 4.23c.94-.95 1.96-1.83 3.03-2.63A13.98 13.98 0 0 0 0 0h7.75c2 1.1 3.73 2.63 5.1 4.45 1.12-.72 2.3-1.37 3.53-1.93A20.1 20.1 0 0 0 14.28 0h2.7c.45.56.88 1.14 1.29 1.74 1.3-.48 2.63-.87 4-1.15-.11-.2-.23-.4-.36-.59H26v.07a28.4 28.4 0 0 1 4 0V0h4.09l-.37.59c1.38.28 2.72.67 4.01 1.15.4-.6.84-1.18 1.3-1.74h2.69a20.1 20.1 0 0 0-2.1 2.52c1.23.56 2.41 1.2 3.54 1.93A16.08 16.08 0 0 1 48.25 0H56c-4.58 0-8.65 2.2-11.2 5.6 1.07.8 2.09 1.68 3.03 2.63A9.99 9.99 0 0 1 56 4v2a8 8 0 0 0-6.77 3.74c1.03 1.2 1.97 2.5 2.79 3.86A4 4 0 0 1 56 10v2a2 2 0 0 0-2 2.07 28.4 28.4 0 0 1 2-.07v2c-9.2 0-17.3 4.78-21.91 12H30zM7.75 28H0v-2c2.81 0 5.46.73 7.75 2zM56 20v2c-5.6 0-10.65 2.3-14.28 6h-2.7c4.04-4.89 10.15-8 16.98-8zm-39.03 8h-2.69C10.65 24.3 5.6 22 0 22v-2c6.83 0 12.94 3.11 16.97 8zm15.01-.4a28.09 28.09 0 0 1 2.8-3.86 8 8 0 0 0-13.55 0c1.03 1.2 1.97 2.5 2.79 3.86a4 4 0 0 1 7.96 0zm14.29-11.86c1.3-.48 2.63-.87 4-1.15a25.99 25.99 0 0 0-44.55 0c1.38.28 2.72.67 4.01 1.15a21.98 21.98 0 0 1 36.54 0zm-5.43 2.71c1.13-.72 2.3-1.37 3.54-1.93a19.98 19.98 0 0 0-32.76 0c1.23.56 2.41 1.2 3.54 1.93a15.98 15.98 0 0 1 25.68 0zm-4.67 3.78c.94-.95 1.96-1.83 3.03-2.63a13.98 13.98 0 0 0-22.4 0c1.07.8 2.09 1.68 3.03 2.63a9.99 9.99 0 0 1 16.34 0z'%3E%3C/path%3E%3C/svg%3E\");\n      }"]
}, {
  "name": "Trifold",
  "description": "",
  "categories": [["todo", {
    "title": "Todo list",
    "styles": {}
  }], ["inprogress", {
    "title": "In progress",
    "styles": {}
  }], ["complete", {
    "title": "Completed",
    "styles": {}
  }]],
  "styles": [" .board {\nbackground-color: #f8f8f8;\n\nbackground-image: url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 56 28' width='56' height='28'%3E%3Cpath fill='%23809883' fill-opacity='0.4' d='M56 26v2h-7.75c2.3-1.27 4.94-2 7.75-2zm-26 2a2 2 0 1 0-4 0h-4.09A25.98 25.98 0 0 0 0 16v-2c.67 0 1.34.02 2 .07V14a2 2 0 0 0-2-2v-2a4 4 0 0 1 3.98 3.6 28.09 28.09 0 0 1 2.8-3.86A8 8 0 0 0 0 6V4a9.99 9.99 0 0 1 8.17 4.23c.94-.95 1.96-1.83 3.03-2.63A13.98 13.98 0 0 0 0 0h7.75c2 1.1 3.73 2.63 5.1 4.45 1.12-.72 2.3-1.37 3.53-1.93A20.1 20.1 0 0 0 14.28 0h2.7c.45.56.88 1.14 1.29 1.74 1.3-.48 2.63-.87 4-1.15-.11-.2-.23-.4-.36-.59H26v.07a28.4 28.4 0 0 1 4 0V0h4.09l-.37.59c1.38.28 2.72.67 4.01 1.15.4-.6.84-1.18 1.3-1.74h2.69a20.1 20.1 0 0 0-2.1 2.52c1.23.56 2.41 1.2 3.54 1.93A16.08 16.08 0 0 1 48.25 0H56c-4.58 0-8.65 2.2-11.2 5.6 1.07.8 2.09 1.68 3.03 2.63A9.99 9.99 0 0 1 56 4v2a8 8 0 0 0-6.77 3.74c1.03 1.2 1.97 2.5 2.79 3.86A4 4 0 0 1 56 10v2a2 2 0 0 0-2 2.07 28.4 28.4 0 0 1 2-.07v2c-9.2 0-17.3 4.78-21.91 12H30zM7.75 28H0v-2c2.81 0 5.46.73 7.75 2zM56 20v2c-5.6 0-10.65 2.3-14.28 6h-2.7c4.04-4.89 10.15-8 16.98-8zm-39.03 8h-2.69C10.65 24.3 5.6 22 0 22v-2c6.83 0 12.94 3.11 16.97 8zm15.01-.4a28.09 28.09 0 0 1 2.8-3.86 8 8 0 0 0-13.55 0c1.03 1.2 1.97 2.5 2.79 3.86a4 4 0 0 1 7.96 0zm14.29-11.86c1.3-.48 2.63-.87 4-1.15a25.99 25.99 0 0 0-44.55 0c1.38.28 2.72.67 4.01 1.15a21.98 21.98 0 0 1 36.54 0zm-5.43 2.71c1.13-.72 2.3-1.37 3.54-1.93a19.98 19.98 0 0 0-32.76 0c1.23.56 2.41 1.2 3.54 1.93a15.98 15.98 0 0 1 25.68 0zm-4.67 3.78c.94-.95 1.96-1.83 3.03-2.63a13.98 13.98 0 0 0-22.4 0c1.07.8 2.09 1.68 3.03 2.63a9.99 9.99 0 0 1 16.34 0z'%3E%3C/path%3E%3C/svg%3E\");\n      }"],
  "def": "todo"
}, {
  "name": "Zen",
  "description": "",
  "categories": [["todo", {
    "title": "Right now",
    "styles": {}
  }], ["later", {
    "title": "Later",
    "styles": {}
  }]],
  "def": "todo",
  "styles": [// SVG pattern by HeroPatterns.com under CC BY 4.0 license
  ".board {\nbackground-color: #f8f8f8;\n\nbackground-image: url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 56 28' width='56' height='28'%3E%3Cpath fill='%23809883' fill-opacity='0.4' d='M56 26v2h-7.75c2.3-1.27 4.94-2 7.75-2zm-26 2a2 2 0 1 0-4 0h-4.09A25.98 25.98 0 0 0 0 16v-2c.67 0 1.34.02 2 .07V14a2 2 0 0 0-2-2v-2a4 4 0 0 1 3.98 3.6 28.09 28.09 0 0 1 2.8-3.86A8 8 0 0 0 0 6V4a9.99 9.99 0 0 1 8.17 4.23c.94-.95 1.96-1.83 3.03-2.63A13.98 13.98 0 0 0 0 0h7.75c2 1.1 3.73 2.63 5.1 4.45 1.12-.72 2.3-1.37 3.53-1.93A20.1 20.1 0 0 0 14.28 0h2.7c.45.56.88 1.14 1.29 1.74 1.3-.48 2.63-.87 4-1.15-.11-.2-.23-.4-.36-.59H26v.07a28.4 28.4 0 0 1 4 0V0h4.09l-.37.59c1.38.28 2.72.67 4.01 1.15.4-.6.84-1.18 1.3-1.74h2.69a20.1 20.1 0 0 0-2.1 2.52c1.23.56 2.41 1.2 3.54 1.93A16.08 16.08 0 0 1 48.25 0H56c-4.58 0-8.65 2.2-11.2 5.6 1.07.8 2.09 1.68 3.03 2.63A9.99 9.99 0 0 1 56 4v2a8 8 0 0 0-6.77 3.74c1.03 1.2 1.97 2.5 2.79 3.86A4 4 0 0 1 56 10v2a2 2 0 0 0-2 2.07 28.4 28.4 0 0 1 2-.07v2c-9.2 0-17.3 4.78-21.91 12H30zM7.75 28H0v-2c2.81 0 5.46.73 7.75 2zM56 20v2c-5.6 0-10.65 2.3-14.28 6h-2.7c4.04-4.89 10.15-8 16.98-8zm-39.03 8h-2.69C10.65 24.3 5.6 22 0 22v-2c6.83 0 12.94 3.11 16.97 8zm15.01-.4a28.09 28.09 0 0 1 2.8-3.86 8 8 0 0 0-13.55 0c1.03 1.2 1.97 2.5 2.79 3.86a4 4 0 0 1 7.96 0zm14.29-11.86c1.3-.48 2.63-.87 4-1.15a25.99 25.99 0 0 0-44.55 0c1.38.28 2.72.67 4.01 1.15a21.98 21.98 0 0 1 36.54 0zm-5.43 2.71c1.13-.72 2.3-1.37 3.54-1.93a19.98 19.98 0 0 0-32.76 0c1.23.56 2.41 1.2 3.54 1.93a15.98 15.98 0 0 1 25.68 0zm-4.67 3.78c.94-.95 1.96-1.83 3.03-2.63a13.98 13.98 0 0 0-22.4 0c1.07.8 2.09 1.68 3.03 2.63a9.99 9.99 0 0 1 16.34 0z'%3E%3C/path%3E%3C/svg%3E\");\n      }"]
}, {
  "name": "Trifold",
  "description": "",
  "categories": [["todo", {
    "title": "Todo list",
    "styles": {}
  }], ["inprogress", {
    "title": "In progress",
    "styles": {}
  }], ["complete", {
    "title": "Completed",
    "styles": {}
  }]],
  "styles": [" .board {\n      background-color: #dcab95;\n\nbackground-image: url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100%25' height='100%25' viewBox='0 0 1200 800'%3E%3Cdefs%3E%3ClinearGradient id='a' gradientUnits='userSpaceOnUse' x1='600' y1='25' x2='600' y2='777'%3E%3Cstop offset='0' stop-color='%23dcab95'/%3E%3Cstop offset='1' stop-color='%23b6eed0'/%3E%3C/linearGradient%3E%3ClinearGradient id='b' gradientUnits='userSpaceOnUse' x1='650' y1='25' x2='650' y2='777'%3E%3Cstop offset='0' stop-color='%23debb98'/%3E%3Cstop offset='1' stop-color='%23a4e6d0'/%3E%3C/linearGradient%3E%3ClinearGradient id='c' gradientUnits='userSpaceOnUse' x1='700' y1='25' x2='700' y2='777'%3E%3Cstop offset='0' stop-color='%23e0cb9b'/%3E%3Cstop offset='1' stop-color='%2393ded4'/%3E%3C/linearGradient%3E%3ClinearGradient id='d' gradientUnits='userSpaceOnUse' x1='750' y1='25' x2='750' y2='777'%3E%3Cstop offset='0' stop-color='%23e2db9d'/%3E%3Cstop offset='1' stop-color='%2383cdd4'/%3E%3C/linearGradient%3E%3ClinearGradient id='e' gradientUnits='userSpaceOnUse' x1='800' y1='25' x2='800' y2='777'%3E%3Cstop offset='0' stop-color='%23dde3a0'/%3E%3Cstop offset='1' stop-color='%2374b1c8'/%3E%3C/linearGradient%3E%3ClinearGradient id='f' gradientUnits='userSpaceOnUse' x1='850' y1='25' x2='850' y2='777'%3E%3Cstop offset='0' stop-color='%23d2e5a3'/%3E%3Cstop offset='1' stop-color='%236793bc'/%3E%3C/linearGradient%3E%3ClinearGradient id='g' gradientUnits='userSpaceOnUse' x1='900' y1='25' x2='900' y2='777'%3E%3Cstop offset='0' stop-color='%23c7e7a6'/%3E%3Cstop offset='1' stop-color='%235b75ae'/%3E%3C/linearGradient%3E%3ClinearGradient id='h' gradientUnits='userSpaceOnUse' x1='950' y1='25' x2='950' y2='777'%3E%3Cstop offset='0' stop-color='%23bde8a9'/%3E%3Cstop offset='1' stop-color='%23555c9b'/%3E%3C/linearGradient%3E%3ClinearGradient id='i' gradientUnits='userSpaceOnUse' x1='1000' y1='25' x2='1000' y2='777'%3E%3Cstop offset='0' stop-color='%23b4eaac'/%3E%3Cstop offset='1' stop-color='%23565185'/%3E%3C/linearGradient%3E%3ClinearGradient id='j' gradientUnits='userSpaceOnUse' x1='1050' y1='25' x2='1050' y2='777'%3E%3Cstop offset='0' stop-color='%23b0ebb4'/%3E%3Cstop offset='1' stop-color='%23574b70'/%3E%3C/linearGradient%3E%3ClinearGradient id='k' gradientUnits='userSpaceOnUse' x1='1100' y1='25' x2='1100' y2='777'%3E%3Cstop offset='0' stop-color='%23b3edc2'/%3E%3Cstop offset='1' stop-color='%2351455d'/%3E%3C/linearGradient%3E%3ClinearGradient id='l' gradientUnits='userSpaceOnUse' x1='1150' y1='25' x2='1150' y2='777'%3E%3Cstop offset='0' stop-color='%23b6eed0'/%3E%3Cstop offset='1' stop-color='%23473d4b'/%3E%3C/linearGradient%3E%3C/defs%3E%3Cg %3E%3Crect fill='url(%23a)' width='1200' height='800'/%3E%3Crect fill='url(%23b)' x='100' width='1100' height='800'/%3E%3Crect fill='url(%23c)' x='200' width='1000' height='800'/%3E%3Crect fill='url(%23d)' x='300' width='900' height='800'/%3E%3Crect fill='url(%23e)' x='400' width='800' height='800'/%3E%3Crect fill='url(%23f)' x='500' width='700' height='800'/%3E%3Crect fill='url(%23g)' x='600' width='600' height='800'/%3E%3Crect fill='url(%23h)' x='700' width='500' height='800'/%3E%3Crect fill='url(%23i)' x='800' width='400' height='800'/%3E%3Crect fill='url(%23j)' x='900' width='300' height='800'/%3E%3Crect fill='url(%23k)' x='1000' width='200' height='800'/%3E%3Crect fill='url(%23l)' x='1100' width='100' height='800'/%3E%3C/g%3E%3C/svg%3E\");\nbackground-attachment: fixed;\nbackground-size: cover;\n      }"],
  "def": "todo"
}, {
  "name": "Zen",
  "description": "",
  "categories": [["todo", {
    "title": "Right now",
    "styles": {}
  }], ["later", {
    "title": "Later",
    "styles": {}
  }]],
  "def": "todo",
  "styles": [// SVG pattern by HeroPatterns.com under CC BY 4.0 license
  ".board {\nbackground-color: #f8f8f8;\n\nbackground-image: url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 56 28' width='56' height='28'%3E%3Cpath fill='%23809883' fill-opacity='0.4' d='M56 26v2h-7.75c2.3-1.27 4.94-2 7.75-2zm-26 2a2 2 0 1 0-4 0h-4.09A25.98 25.98 0 0 0 0 16v-2c.67 0 1.34.02 2 .07V14a2 2 0 0 0-2-2v-2a4 4 0 0 1 3.98 3.6 28.09 28.09 0 0 1 2.8-3.86A8 8 0 0 0 0 6V4a9.99 9.99 0 0 1 8.17 4.23c.94-.95 1.96-1.83 3.03-2.63A13.98 13.98 0 0 0 0 0h7.75c2 1.1 3.73 2.63 5.1 4.45 1.12-.72 2.3-1.37 3.53-1.93A20.1 20.1 0 0 0 14.28 0h2.7c.45.56.88 1.14 1.29 1.74 1.3-.48 2.63-.87 4-1.15-.11-.2-.23-.4-.36-.59H26v.07a28.4 28.4 0 0 1 4 0V0h4.09l-.37.59c1.38.28 2.72.67 4.01 1.15.4-.6.84-1.18 1.3-1.74h2.69a20.1 20.1 0 0 0-2.1 2.52c1.23.56 2.41 1.2 3.54 1.93A16.08 16.08 0 0 1 48.25 0H56c-4.58 0-8.65 2.2-11.2 5.6 1.07.8 2.09 1.68 3.03 2.63A9.99 9.99 0 0 1 56 4v2a8 8 0 0 0-6.77 3.74c1.03 1.2 1.97 2.5 2.79 3.86A4 4 0 0 1 56 10v2a2 2 0 0 0-2 2.07 28.4 28.4 0 0 1 2-.07v2c-9.2 0-17.3 4.78-21.91 12H30zM7.75 28H0v-2c2.81 0 5.46.73 7.75 2zM56 20v2c-5.6 0-10.65 2.3-14.28 6h-2.7c4.04-4.89 10.15-8 16.98-8zm-39.03 8h-2.69C10.65 24.3 5.6 22 0 22v-2c6.83 0 12.94 3.11 16.97 8zm15.01-.4a28.09 28.09 0 0 1 2.8-3.86 8 8 0 0 0-13.55 0c1.03 1.2 1.97 2.5 2.79 3.86a4 4 0 0 1 7.96 0zm14.29-11.86c1.3-.48 2.63-.87 4-1.15a25.99 25.99 0 0 0-44.55 0c1.38.28 2.72.67 4.01 1.15a21.98 21.98 0 0 1 36.54 0zm-5.43 2.71c1.13-.72 2.3-1.37 3.54-1.93a19.98 19.98 0 0 0-32.76 0c1.23.56 2.41 1.2 3.54 1.93a15.98 15.98 0 0 1 25.68 0zm-4.67 3.78c.94-.95 1.96-1.83 3.03-2.63a13.98 13.98 0 0 0-22.4 0c1.07.8 2.09 1.68 3.03 2.63a9.99 9.99 0 0 1 16.34 0z'%3E%3C/path%3E%3C/svg%3E\");\n      }"]
}, {
  "name": "Trifold",
  "description": "",
  "categories": [["todo", {
    "title": "Todo list",
    "styles": {}
  }], ["inprogress", {
    "title": "In progress",
    "styles": {}
  }], ["complete", {
    "title": "Completed",
    "styles": {}
  }]],
  "styles": [// SVG background from SVGBackgrounds.com
  " .board {\n      background-color: #dcab95;\n\nbackground-image: url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100%25' height='100%25' viewBox='0 0 1200 800'%3E%3Cdefs%3E%3ClinearGradient id='a' gradientUnits='userSpaceOnUse' x1='600' y1='25' x2='600' y2='777'%3E%3Cstop offset='0' stop-color='%23dcab95'/%3E%3Cstop offset='1' stop-color='%23b6eed0'/%3E%3C/linearGradient%3E%3ClinearGradient id='b' gradientUnits='userSpaceOnUse' x1='650' y1='25' x2='650' y2='777'%3E%3Cstop offset='0' stop-color='%23debb98'/%3E%3Cstop offset='1' stop-color='%23a4e6d0'/%3E%3C/linearGradient%3E%3ClinearGradient id='c' gradientUnits='userSpaceOnUse' x1='700' y1='25' x2='700' y2='777'%3E%3Cstop offset='0' stop-color='%23e0cb9b'/%3E%3Cstop offset='1' stop-color='%2393ded4'/%3E%3C/linearGradient%3E%3ClinearGradient id='d' gradientUnits='userSpaceOnUse' x1='750' y1='25' x2='750' y2='777'%3E%3Cstop offset='0' stop-color='%23e2db9d'/%3E%3Cstop offset='1' stop-color='%2383cdd4'/%3E%3C/linearGradient%3E%3ClinearGradient id='e' gradientUnits='userSpaceOnUse' x1='800' y1='25' x2='800' y2='777'%3E%3Cstop offset='0' stop-color='%23dde3a0'/%3E%3Cstop offset='1' stop-color='%2374b1c8'/%3E%3C/linearGradient%3E%3ClinearGradient id='f' gradientUnits='userSpaceOnUse' x1='850' y1='25' x2='850' y2='777'%3E%3Cstop offset='0' stop-color='%23d2e5a3'/%3E%3Cstop offset='1' stop-color='%236793bc'/%3E%3C/linearGradient%3E%3ClinearGradient id='g' gradientUnits='userSpaceOnUse' x1='900' y1='25' x2='900' y2='777'%3E%3Cstop offset='0' stop-color='%23c7e7a6'/%3E%3Cstop offset='1' stop-color='%235b75ae'/%3E%3C/linearGradient%3E%3ClinearGradient id='h' gradientUnits='userSpaceOnUse' x1='950' y1='25' x2='950' y2='777'%3E%3Cstop offset='0' stop-color='%23bde8a9'/%3E%3Cstop offset='1' stop-color='%23555c9b'/%3E%3C/linearGradient%3E%3ClinearGradient id='i' gradientUnits='userSpaceOnUse' x1='1000' y1='25' x2='1000' y2='777'%3E%3Cstop offset='0' stop-color='%23b4eaac'/%3E%3Cstop offset='1' stop-color='%23565185'/%3E%3C/linearGradient%3E%3ClinearGradient id='j' gradientUnits='userSpaceOnUse' x1='1050' y1='25' x2='1050' y2='777'%3E%3Cstop offset='0' stop-color='%23b0ebb4'/%3E%3Cstop offset='1' stop-color='%23574b70'/%3E%3C/linearGradient%3E%3ClinearGradient id='k' gradientUnits='userSpaceOnUse' x1='1100' y1='25' x2='1100' y2='777'%3E%3Cstop offset='0' stop-color='%23b3edc2'/%3E%3Cstop offset='1' stop-color='%2351455d'/%3E%3C/linearGradient%3E%3ClinearGradient id='l' gradientUnits='userSpaceOnUse' x1='1150' y1='25' x2='1150' y2='777'%3E%3Cstop offset='0' stop-color='%23b6eed0'/%3E%3Cstop offset='1' stop-color='%23473d4b'/%3E%3C/linearGradient%3E%3C/defs%3E%3Cg %3E%3Crect fill='url(%23a)' width='1200' height='800'/%3E%3Crect fill='url(%23b)' x='100' width='1100' height='800'/%3E%3Crect fill='url(%23c)' x='200' width='1000' height='800'/%3E%3Crect fill='url(%23d)' x='300' width='900' height='800'/%3E%3Crect fill='url(%23e)' x='400' width='800' height='800'/%3E%3Crect fill='url(%23f)' x='500' width='700' height='800'/%3E%3Crect fill='url(%23g)' x='600' width='600' height='800'/%3E%3Crect fill='url(%23h)' x='700' width='500' height='800'/%3E%3Crect fill='url(%23i)' x='800' width='400' height='800'/%3E%3Crect fill='url(%23j)' x='900' width='300' height='800'/%3E%3Crect fill='url(%23k)' x='1000' width='200' height='800'/%3E%3Crect fill='url(%23l)' x='1100' width='100' height='800'/%3E%3C/g%3E%3C/svg%3E\");\nbackground-attachment: fixed;\nbackground-size: cover;\n      }"],
  "def": "todo"
}, {
  "name": "Zen",
  "description": "",
  "categories": [["todo", {
    "title": "Right now",
    "styles": {}
  }], ["later", {
    "title": "Later",
    "styles": {}
  }]],
  "def": "todo",
  "styles": [// SVG pattern by HeroPatterns.com under CC BY 4.0 license
  ".board {\nbackground-color: #f8f8f8;\n\nbackground-image: url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 56 28' width='56' height='28'%3E%3Cpath fill='%23809883' fill-opacity='0.4' d='M56 26v2h-7.75c2.3-1.27 4.94-2 7.75-2zm-26 2a2 2 0 1 0-4 0h-4.09A25.98 25.98 0 0 0 0 16v-2c.67 0 1.34.02 2 .07V14a2 2 0 0 0-2-2v-2a4 4 0 0 1 3.98 3.6 28.09 28.09 0 0 1 2.8-3.86A8 8 0 0 0 0 6V4a9.99 9.99 0 0 1 8.17 4.23c.94-.95 1.96-1.83 3.03-2.63A13.98 13.98 0 0 0 0 0h7.75c2 1.1 3.73 2.63 5.1 4.45 1.12-.72 2.3-1.37 3.53-1.93A20.1 20.1 0 0 0 14.28 0h2.7c.45.56.88 1.14 1.29 1.74 1.3-.48 2.63-.87 4-1.15-.11-.2-.23-.4-.36-.59H26v.07a28.4 28.4 0 0 1 4 0V0h4.09l-.37.59c1.38.28 2.72.67 4.01 1.15.4-.6.84-1.18 1.3-1.74h2.69a20.1 20.1 0 0 0-2.1 2.52c1.23.56 2.41 1.2 3.54 1.93A16.08 16.08 0 0 1 48.25 0H56c-4.58 0-8.65 2.2-11.2 5.6 1.07.8 2.09 1.68 3.03 2.63A9.99 9.99 0 0 1 56 4v2a8 8 0 0 0-6.77 3.74c1.03 1.2 1.97 2.5 2.79 3.86A4 4 0 0 1 56 10v2a2 2 0 0 0-2 2.07 28.4 28.4 0 0 1 2-.07v2c-9.2 0-17.3 4.78-21.91 12H30zM7.75 28H0v-2c2.81 0 5.46.73 7.75 2zM56 20v2c-5.6 0-10.65 2.3-14.28 6h-2.7c4.04-4.89 10.15-8 16.98-8zm-39.03 8h-2.69C10.65 24.3 5.6 22 0 22v-2c6.83 0 12.94 3.11 16.97 8zm15.01-.4a28.09 28.09 0 0 1 2.8-3.86 8 8 0 0 0-13.55 0c1.03 1.2 1.97 2.5 2.79 3.86a4 4 0 0 1 7.96 0zm14.29-11.86c1.3-.48 2.63-.87 4-1.15a25.99 25.99 0 0 0-44.55 0c1.38.28 2.72.67 4.01 1.15a21.98 21.98 0 0 1 36.54 0zm-5.43 2.71c1.13-.72 2.3-1.37 3.54-1.93a19.98 19.98 0 0 0-32.76 0c1.23.56 2.41 1.2 3.54 1.93a15.98 15.98 0 0 1 25.68 0zm-4.67 3.78c.94-.95 1.96-1.83 3.03-2.63a13.98 13.98 0 0 0-22.4 0c1.07.8 2.09 1.68 3.03 2.63a9.99 9.99 0 0 1 16.34 0z'%3E%3C/path%3E%3C/svg%3E\");\n      }"]
}, {
  "name": "Trifold",
  "description": "",
  "categories": [["todo", {
    "title": "Todo list",
    "styles": {}
  }], ["inprogress", {
    "title": "In progress",
    "styles": {}
  }], ["complete", {
    "title": "Completed",
    "styles": {}
  }]],
  "styles": [// SVG background from SVGBackgrounds.com
  " .board {\n      background-color: #dcab95;\n\nbackground-image: url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100%25' height='100%25' viewBox='0 0 1200 800'%3E%3Cdefs%3E%3ClinearGradient id='a' gradientUnits='userSpaceOnUse' x1='600' y1='25' x2='600' y2='777'%3E%3Cstop offset='0' stop-color='%23dcab95'/%3E%3Cstop offset='1' stop-color='%23b6eed0'/%3E%3C/linearGradient%3E%3ClinearGradient id='b' gradientUnits='userSpaceOnUse' x1='650' y1='25' x2='650' y2='777'%3E%3Cstop offset='0' stop-color='%23debb98'/%3E%3Cstop offset='1' stop-color='%23a4e6d0'/%3E%3C/linearGradient%3E%3ClinearGradient id='c' gradientUnits='userSpaceOnUse' x1='700' y1='25' x2='700' y2='777'%3E%3Cstop offset='0' stop-color='%23e0cb9b'/%3E%3Cstop offset='1' stop-color='%2393ded4'/%3E%3C/linearGradient%3E%3ClinearGradient id='d' gradientUnits='userSpaceOnUse' x1='750' y1='25' x2='750' y2='777'%3E%3Cstop offset='0' stop-color='%23e2db9d'/%3E%3Cstop offset='1' stop-color='%2383cdd4'/%3E%3C/linearGradient%3E%3ClinearGradient id='e' gradientUnits='userSpaceOnUse' x1='800' y1='25' x2='800' y2='777'%3E%3Cstop offset='0' stop-color='%23dde3a0'/%3E%3Cstop offset='1' stop-color='%2374b1c8'/%3E%3C/linearGradient%3E%3ClinearGradient id='f' gradientUnits='userSpaceOnUse' x1='850' y1='25' x2='850' y2='777'%3E%3Cstop offset='0' stop-color='%23d2e5a3'/%3E%3Cstop offset='1' stop-color='%236793bc'/%3E%3C/linearGradient%3E%3ClinearGradient id='g' gradientUnits='userSpaceOnUse' x1='900' y1='25' x2='900' y2='777'%3E%3Cstop offset='0' stop-color='%23c7e7a6'/%3E%3Cstop offset='1' stop-color='%235b75ae'/%3E%3C/linearGradient%3E%3ClinearGradient id='h' gradientUnits='userSpaceOnUse' x1='950' y1='25' x2='950' y2='777'%3E%3Cstop offset='0' stop-color='%23bde8a9'/%3E%3Cstop offset='1' stop-color='%23555c9b'/%3E%3C/linearGradient%3E%3ClinearGradient id='i' gradientUnits='userSpaceOnUse' x1='1000' y1='25' x2='1000' y2='777'%3E%3Cstop offset='0' stop-color='%23b4eaac'/%3E%3Cstop offset='1' stop-color='%23565185'/%3E%3C/linearGradient%3E%3ClinearGradient id='j' gradientUnits='userSpaceOnUse' x1='1050' y1='25' x2='1050' y2='777'%3E%3Cstop offset='0' stop-color='%23b0ebb4'/%3E%3Cstop offset='1' stop-color='%23574b70'/%3E%3C/linearGradient%3E%3ClinearGradient id='k' gradientUnits='userSpaceOnUse' x1='1100' y1='25' x2='1100' y2='777'%3E%3Cstop offset='0' stop-color='%23b3edc2'/%3E%3Cstop offset='1' stop-color='%2351455d'/%3E%3C/linearGradient%3E%3ClinearGradient id='l' gradientUnits='userSpaceOnUse' x1='1150' y1='25' x2='1150' y2='777'%3E%3Cstop offset='0' stop-color='%23b6eed0'/%3E%3Cstop offset='1' stop-color='%23473d4b'/%3E%3C/linearGradient%3E%3C/defs%3E%3Cg %3E%3Crect fill='url(%23a)' width='1200' height='800'/%3E%3Crect fill='url(%23b)' x='100' width='1100' height='800'/%3E%3Crect fill='url(%23c)' x='200' width='1000' height='800'/%3E%3Crect fill='url(%23d)' x='300' width='900' height='800'/%3E%3Crect fill='url(%23e)' x='400' width='800' height='800'/%3E%3Crect fill='url(%23f)' x='500' width='700' height='800'/%3E%3Crect fill='url(%23g)' x='600' width='600' height='800'/%3E%3Crect fill='url(%23h)' x='700' width='500' height='800'/%3E%3Crect fill='url(%23i)' x='800' width='400' height='800'/%3E%3Crect fill='url(%23j)' x='900' width='300' height='800'/%3E%3Crect fill='url(%23k)' x='1000' width='200' height='800'/%3E%3Crect fill='url(%23l)' x='1100' width='100' height='800'/%3E%3C/g%3E%3C/svg%3E\");\nbackground-attachment: fixed;\nbackground-size: cover;\n      }"],
  "def": "todo"
}, {
  "name": "Zen",
  "description": "",
  "categories": [["todo", {
    "title": "Right now",
    "styles": {}
  }], ["later", {
    "title": "Later",
    "styles": {}
  }]],
  "def": "todo",
  "styles": [// SVG pattern by HeroPatterns.com under CC BY 4.0 license
  ".board {\nbackground-color: #f8f8f8;\n\nbackground-image: url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 56 28' width='56' height='28'%3E%3Cpath fill='%23809883' fill-opacity='0.4' d='M56 26v2h-7.75c2.3-1.27 4.94-2 7.75-2zm-26 2a2 2 0 1 0-4 0h-4.09A25.98 25.98 0 0 0 0 16v-2c.67 0 1.34.02 2 .07V14a2 2 0 0 0-2-2v-2a4 4 0 0 1 3.98 3.6 28.09 28.09 0 0 1 2.8-3.86A8 8 0 0 0 0 6V4a9.99 9.99 0 0 1 8.17 4.23c.94-.95 1.96-1.83 3.03-2.63A13.98 13.98 0 0 0 0 0h7.75c2 1.1 3.73 2.63 5.1 4.45 1.12-.72 2.3-1.37 3.53-1.93A20.1 20.1 0 0 0 14.28 0h2.7c.45.56.88 1.14 1.29 1.74 1.3-.48 2.63-.87 4-1.15-.11-.2-.23-.4-.36-.59H26v.07a28.4 28.4 0 0 1 4 0V0h4.09l-.37.59c1.38.28 2.72.67 4.01 1.15.4-.6.84-1.18 1.3-1.74h2.69a20.1 20.1 0 0 0-2.1 2.52c1.23.56 2.41 1.2 3.54 1.93A16.08 16.08 0 0 1 48.25 0H56c-4.58 0-8.65 2.2-11.2 5.6 1.07.8 2.09 1.68 3.03 2.63A9.99 9.99 0 0 1 56 4v2a8 8 0 0 0-6.77 3.74c1.03 1.2 1.97 2.5 2.79 3.86A4 4 0 0 1 56 10v2a2 2 0 0 0-2 2.07 28.4 28.4 0 0 1 2-.07v2c-9.2 0-17.3 4.78-21.91 12H30zM7.75 28H0v-2c2.81 0 5.46.73 7.75 2zM56 20v2c-5.6 0-10.65 2.3-14.28 6h-2.7c4.04-4.89 10.15-8 16.98-8zm-39.03 8h-2.69C10.65 24.3 5.6 22 0 22v-2c6.83 0 12.94 3.11 16.97 8zm15.01-.4a28.09 28.09 0 0 1 2.8-3.86 8 8 0 0 0-13.55 0c1.03 1.2 1.97 2.5 2.79 3.86a4 4 0 0 1 7.96 0zm14.29-11.86c1.3-.48 2.63-.87 4-1.15a25.99 25.99 0 0 0-44.55 0c1.38.28 2.72.67 4.01 1.15a21.98 21.98 0 0 1 36.54 0zm-5.43 2.71c1.13-.72 2.3-1.37 3.54-1.93a19.98 19.98 0 0 0-32.76 0c1.23.56 2.41 1.2 3.54 1.93a15.98 15.98 0 0 1 25.68 0zm-4.67 3.78c.94-.95 1.96-1.83 3.03-2.63a13.98 13.98 0 0 0-22.4 0c1.07.8 2.09 1.68 3.03 2.63a9.99 9.99 0 0 1 16.34 0z'%3E%3C/path%3E%3C/svg%3E\");\n      }"]
}, {
  "name": "Trifold",
  "description": "",
  "categories": [["todo", {
    "title": "Todo list",
    "styles": {}
  }], ["inprogress", {
    "title": "In progress",
    "styles": {}
  }], ["complete", {
    "title": "Completed",
    "styles": {}
  }]],
  "styles": [// SVG background from SVGBackgrounds.com
  " .board {\n      background-color: #dcab95;\n\nbackground-image: url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100%25' height='100%25' viewBox='0 0 1200 800'%3E%3Cdefs%3E%3ClinearGradient id='a' gradientUnits='userSpaceOnUse' x1='600' y1='25' x2='600' y2='777'%3E%3Cstop offset='0' stop-color='%23dcab95'/%3E%3Cstop offset='1' stop-color='%23b6eed0'/%3E%3C/linearGradient%3E%3ClinearGradient id='b' gradientUnits='userSpaceOnUse' x1='650' y1='25' x2='650' y2='777'%3E%3Cstop offset='0' stop-color='%23debb98'/%3E%3Cstop offset='1' stop-color='%23a4e6d0'/%3E%3C/linearGradient%3E%3ClinearGradient id='c' gradientUnits='userSpaceOnUse' x1='700' y1='25' x2='700' y2='777'%3E%3Cstop offset='0' stop-color='%23e0cb9b'/%3E%3Cstop offset='1' stop-color='%2393ded4'/%3E%3C/linearGradient%3E%3ClinearGradient id='d' gradientUnits='userSpaceOnUse' x1='750' y1='25' x2='750' y2='777'%3E%3Cstop offset='0' stop-color='%23e2db9d'/%3E%3Cstop offset='1' stop-color='%2383cdd4'/%3E%3C/linearGradient%3E%3ClinearGradient id='e' gradientUnits='userSpaceOnUse' x1='800' y1='25' x2='800' y2='777'%3E%3Cstop offset='0' stop-color='%23dde3a0'/%3E%3Cstop offset='1' stop-color='%2374b1c8'/%3E%3C/linearGradient%3E%3ClinearGradient id='f' gradientUnits='userSpaceOnUse' x1='850' y1='25' x2='850' y2='777'%3E%3Cstop offset='0' stop-color='%23d2e5a3'/%3E%3Cstop offset='1' stop-color='%236793bc'/%3E%3C/linearGradient%3E%3ClinearGradient id='g' gradientUnits='userSpaceOnUse' x1='900' y1='25' x2='900' y2='777'%3E%3Cstop offset='0' stop-color='%23c7e7a6'/%3E%3Cstop offset='1' stop-color='%235b75ae'/%3E%3C/linearGradient%3E%3ClinearGradient id='h' gradientUnits='userSpaceOnUse' x1='950' y1='25' x2='950' y2='777'%3E%3Cstop offset='0' stop-color='%23bde8a9'/%3E%3Cstop offset='1' stop-color='%23555c9b'/%3E%3C/linearGradient%3E%3ClinearGradient id='i' gradientUnits='userSpaceOnUse' x1='1000' y1='25' x2='1000' y2='777'%3E%3Cstop offset='0' stop-color='%23b4eaac'/%3E%3Cstop offset='1' stop-color='%23565185'/%3E%3C/linearGradient%3E%3ClinearGradient id='j' gradientUnits='userSpaceOnUse' x1='1050' y1='25' x2='1050' y2='777'%3E%3Cstop offset='0' stop-color='%23b0ebb4'/%3E%3Cstop offset='1' stop-color='%23574b70'/%3E%3C/linearGradient%3E%3ClinearGradient id='k' gradientUnits='userSpaceOnUse' x1='1100' y1='25' x2='1100' y2='777'%3E%3Cstop offset='0' stop-color='%23b3edc2'/%3E%3Cstop offset='1' stop-color='%2351455d'/%3E%3C/linearGradient%3E%3ClinearGradient id='l' gradientUnits='userSpaceOnUse' x1='1150' y1='25' x2='1150' y2='777'%3E%3Cstop offset='0' stop-color='%23b6eed0'/%3E%3Cstop offset='1' stop-color='%23473d4b'/%3E%3C/linearGradient%3E%3C/defs%3E%3Cg %3E%3Crect fill='url(%23a)' width='1200' height='800'/%3E%3Crect fill='url(%23b)' x='100' width='1100' height='800'/%3E%3Crect fill='url(%23c)' x='200' width='1000' height='800'/%3E%3Crect fill='url(%23d)' x='300' width='900' height='800'/%3E%3Crect fill='url(%23e)' x='400' width='800' height='800'/%3E%3Crect fill='url(%23f)' x='500' width='700' height='800'/%3E%3Crect fill='url(%23g)' x='600' width='600' height='800'/%3E%3Crect fill='url(%23h)' x='700' width='500' height='800'/%3E%3Crect fill='url(%23i)' x='800' width='400' height='800'/%3E%3Crect fill='url(%23j)' x='900' width='300' height='800'/%3E%3Crect fill='url(%23k)' x='1000' width='200' height='800'/%3E%3Crect fill='url(%23l)' x='1100' width='100' height='800'/%3E%3C/g%3E%3C/svg%3E\");\nbackground-attachment: fixed;\nbackground-size: cover;\n      }"],
  "def": "todo"
}, {
  "name": "Zen",
  "description": "",
  "categories": [["todo", {
    "title": "Right now",
    "styles": {}
  }], ["later", {
    "title": "Later",
    "styles": {}
  }]],
  "def": "todo",
  "styles": [// SVG pattern by HeroPatterns.com under CC BY 4.0 license
  ".board {\nbackground-color: #f8f8f8;\n\nbackground-image: url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 56 28' width='56' height='28'%3E%3Cpath fill='%23809883' fill-opacity='0.4' d='M56 26v2h-7.75c2.3-1.27 4.94-2 7.75-2zm-26 2a2 2 0 1 0-4 0h-4.09A25.98 25.98 0 0 0 0 16v-2c.67 0 1.34.02 2 .07V14a2 2 0 0 0-2-2v-2a4 4 0 0 1 3.98 3.6 28.09 28.09 0 0 1 2.8-3.86A8 8 0 0 0 0 6V4a9.99 9.99 0 0 1 8.17 4.23c.94-.95 1.96-1.83 3.03-2.63A13.98 13.98 0 0 0 0 0h7.75c2 1.1 3.73 2.63 5.1 4.45 1.12-.72 2.3-1.37 3.53-1.93A20.1 20.1 0 0 0 14.28 0h2.7c.45.56.88 1.14 1.29 1.74 1.3-.48 2.63-.87 4-1.15-.11-.2-.23-.4-.36-.59H26v.07a28.4 28.4 0 0 1 4 0V0h4.09l-.37.59c1.38.28 2.72.67 4.01 1.15.4-.6.84-1.18 1.3-1.74h2.69a20.1 20.1 0 0 0-2.1 2.52c1.23.56 2.41 1.2 3.54 1.93A16.08 16.08 0 0 1 48.25 0H56c-4.58 0-8.65 2.2-11.2 5.6 1.07.8 2.09 1.68 3.03 2.63A9.99 9.99 0 0 1 56 4v2a8 8 0 0 0-6.77 3.74c1.03 1.2 1.97 2.5 2.79 3.86A4 4 0 0 1 56 10v2a2 2 0 0 0-2 2.07 28.4 28.4 0 0 1 2-.07v2c-9.2 0-17.3 4.78-21.91 12H30zM7.75 28H0v-2c2.81 0 5.46.73 7.75 2zM56 20v2c-5.6 0-10.65 2.3-14.28 6h-2.7c4.04-4.89 10.15-8 16.98-8zm-39.03 8h-2.69C10.65 24.3 5.6 22 0 22v-2c6.83 0 12.94 3.11 16.97 8zm15.01-.4a28.09 28.09 0 0 1 2.8-3.86 8 8 0 0 0-13.55 0c1.03 1.2 1.97 2.5 2.79 3.86a4 4 0 0 1 7.96 0zm14.29-11.86c1.3-.48 2.63-.87 4-1.15a25.99 25.99 0 0 0-44.55 0c1.38.28 2.72.67 4.01 1.15a21.98 21.98 0 0 1 36.54 0zm-5.43 2.71c1.13-.72 2.3-1.37 3.54-1.93a19.98 19.98 0 0 0-32.76 0c1.23.56 2.41 1.2 3.54 1.93a15.98 15.98 0 0 1 25.68 0zm-4.67 3.78c.94-.95 1.96-1.83 3.03-2.63a13.98 13.98 0 0 0-22.4 0c1.07.8 2.09 1.68 3.03 2.63a9.99 9.99 0 0 1 16.34 0z'%3E%3C/path%3E%3C/svg%3E\");\n      }", " .category header {\n      align-self: center;\n      padding-left: 20%;\n      padding-right: 20%;\n      border-radius: 0.5em;\n      border-background: #444;\n      color: #ececec;\n      }\n      "]
}, {
  "name": "Trifold",
  "description": "",
  "categories": [["todo", {
    "title": "Todo list",
    "styles": {}
  }], ["inprogress", {
    "title": "In progress",
    "styles": {}
  }], ["complete", {
    "title": "Completed",
    "styles": {}
  }]],
  "styles": [// SVG background from SVGBackgrounds.com
  " .board {\n      background-color: #dcab95;\n\nbackground-image: url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100%25' height='100%25' viewBox='0 0 1200 800'%3E%3Cdefs%3E%3ClinearGradient id='a' gradientUnits='userSpaceOnUse' x1='600' y1='25' x2='600' y2='777'%3E%3Cstop offset='0' stop-color='%23dcab95'/%3E%3Cstop offset='1' stop-color='%23b6eed0'/%3E%3C/linearGradient%3E%3ClinearGradient id='b' gradientUnits='userSpaceOnUse' x1='650' y1='25' x2='650' y2='777'%3E%3Cstop offset='0' stop-color='%23debb98'/%3E%3Cstop offset='1' stop-color='%23a4e6d0'/%3E%3C/linearGradient%3E%3ClinearGradient id='c' gradientUnits='userSpaceOnUse' x1='700' y1='25' x2='700' y2='777'%3E%3Cstop offset='0' stop-color='%23e0cb9b'/%3E%3Cstop offset='1' stop-color='%2393ded4'/%3E%3C/linearGradient%3E%3ClinearGradient id='d' gradientUnits='userSpaceOnUse' x1='750' y1='25' x2='750' y2='777'%3E%3Cstop offset='0' stop-color='%23e2db9d'/%3E%3Cstop offset='1' stop-color='%2383cdd4'/%3E%3C/linearGradient%3E%3ClinearGradient id='e' gradientUnits='userSpaceOnUse' x1='800' y1='25' x2='800' y2='777'%3E%3Cstop offset='0' stop-color='%23dde3a0'/%3E%3Cstop offset='1' stop-color='%2374b1c8'/%3E%3C/linearGradient%3E%3ClinearGradient id='f' gradientUnits='userSpaceOnUse' x1='850' y1='25' x2='850' y2='777'%3E%3Cstop offset='0' stop-color='%23d2e5a3'/%3E%3Cstop offset='1' stop-color='%236793bc'/%3E%3C/linearGradient%3E%3ClinearGradient id='g' gradientUnits='userSpaceOnUse' x1='900' y1='25' x2='900' y2='777'%3E%3Cstop offset='0' stop-color='%23c7e7a6'/%3E%3Cstop offset='1' stop-color='%235b75ae'/%3E%3C/linearGradient%3E%3ClinearGradient id='h' gradientUnits='userSpaceOnUse' x1='950' y1='25' x2='950' y2='777'%3E%3Cstop offset='0' stop-color='%23bde8a9'/%3E%3Cstop offset='1' stop-color='%23555c9b'/%3E%3C/linearGradient%3E%3ClinearGradient id='i' gradientUnits='userSpaceOnUse' x1='1000' y1='25' x2='1000' y2='777'%3E%3Cstop offset='0' stop-color='%23b4eaac'/%3E%3Cstop offset='1' stop-color='%23565185'/%3E%3C/linearGradient%3E%3ClinearGradient id='j' gradientUnits='userSpaceOnUse' x1='1050' y1='25' x2='1050' y2='777'%3E%3Cstop offset='0' stop-color='%23b0ebb4'/%3E%3Cstop offset='1' stop-color='%23574b70'/%3E%3C/linearGradient%3E%3ClinearGradient id='k' gradientUnits='userSpaceOnUse' x1='1100' y1='25' x2='1100' y2='777'%3E%3Cstop offset='0' stop-color='%23b3edc2'/%3E%3Cstop offset='1' stop-color='%2351455d'/%3E%3C/linearGradient%3E%3ClinearGradient id='l' gradientUnits='userSpaceOnUse' x1='1150' y1='25' x2='1150' y2='777'%3E%3Cstop offset='0' stop-color='%23b6eed0'/%3E%3Cstop offset='1' stop-color='%23473d4b'/%3E%3C/linearGradient%3E%3C/defs%3E%3Cg %3E%3Crect fill='url(%23a)' width='1200' height='800'/%3E%3Crect fill='url(%23b)' x='100' width='1100' height='800'/%3E%3Crect fill='url(%23c)' x='200' width='1000' height='800'/%3E%3Crect fill='url(%23d)' x='300' width='900' height='800'/%3E%3Crect fill='url(%23e)' x='400' width='800' height='800'/%3E%3Crect fill='url(%23f)' x='500' width='700' height='800'/%3E%3Crect fill='url(%23g)' x='600' width='600' height='800'/%3E%3Crect fill='url(%23h)' x='700' width='500' height='800'/%3E%3Crect fill='url(%23i)' x='800' width='400' height='800'/%3E%3Crect fill='url(%23j)' x='900' width='300' height='800'/%3E%3Crect fill='url(%23k)' x='1000' width='200' height='800'/%3E%3Crect fill='url(%23l)' x='1100' width='100' height='800'/%3E%3C/g%3E%3C/svg%3E\");\nbackground-attachment: fixed;\nbackground-size: cover;\n      }"],
  "def": "todo"
}, {
  "name": "Zen",
  "description": "",
  "categories": [["todo", {
    "title": "Right now",
    "styles": {}
  }], ["later", {
    "title": "Later",
    "styles": {}
  }]],
  "def": "todo",
  "styles": [// SVG pattern by HeroPatterns.com under CC BY 4.0 license
  ".board {\nbackground-color: #f8f8f8;\n\nbackground-image: url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 56 28' width='56' height='28'%3E%3Cpath fill='%23809883' fill-opacity='0.4' d='M56 26v2h-7.75c2.3-1.27 4.94-2 7.75-2zm-26 2a2 2 0 1 0-4 0h-4.09A25.98 25.98 0 0 0 0 16v-2c.67 0 1.34.02 2 .07V14a2 2 0 0 0-2-2v-2a4 4 0 0 1 3.98 3.6 28.09 28.09 0 0 1 2.8-3.86A8 8 0 0 0 0 6V4a9.99 9.99 0 0 1 8.17 4.23c.94-.95 1.96-1.83 3.03-2.63A13.98 13.98 0 0 0 0 0h7.75c2 1.1 3.73 2.63 5.1 4.45 1.12-.72 2.3-1.37 3.53-1.93A20.1 20.1 0 0 0 14.28 0h2.7c.45.56.88 1.14 1.29 1.74 1.3-.48 2.63-.87 4-1.15-.11-.2-.23-.4-.36-.59H26v.07a28.4 28.4 0 0 1 4 0V0h4.09l-.37.59c1.38.28 2.72.67 4.01 1.15.4-.6.84-1.18 1.3-1.74h2.69a20.1 20.1 0 0 0-2.1 2.52c1.23.56 2.41 1.2 3.54 1.93A16.08 16.08 0 0 1 48.25 0H56c-4.58 0-8.65 2.2-11.2 5.6 1.07.8 2.09 1.68 3.03 2.63A9.99 9.99 0 0 1 56 4v2a8 8 0 0 0-6.77 3.74c1.03 1.2 1.97 2.5 2.79 3.86A4 4 0 0 1 56 10v2a2 2 0 0 0-2 2.07 28.4 28.4 0 0 1 2-.07v2c-9.2 0-17.3 4.78-21.91 12H30zM7.75 28H0v-2c2.81 0 5.46.73 7.75 2zM56 20v2c-5.6 0-10.65 2.3-14.28 6h-2.7c4.04-4.89 10.15-8 16.98-8zm-39.03 8h-2.69C10.65 24.3 5.6 22 0 22v-2c6.83 0 12.94 3.11 16.97 8zm15.01-.4a28.09 28.09 0 0 1 2.8-3.86 8 8 0 0 0-13.55 0c1.03 1.2 1.97 2.5 2.79 3.86a4 4 0 0 1 7.96 0zm14.29-11.86c1.3-.48 2.63-.87 4-1.15a25.99 25.99 0 0 0-44.55 0c1.38.28 2.72.67 4.01 1.15a21.98 21.98 0 0 1 36.54 0zm-5.43 2.71c1.13-.72 2.3-1.37 3.54-1.93a19.98 19.98 0 0 0-32.76 0c1.23.56 2.41 1.2 3.54 1.93a15.98 15.98 0 0 1 25.68 0zm-4.67 3.78c.94-.95 1.96-1.83 3.03-2.63a13.98 13.98 0 0 0-22.4 0c1.07.8 2.09 1.68 3.03 2.63a9.99 9.99 0 0 1 16.34 0z'%3E%3C/path%3E%3C/svg%3E\");\n      }", " .category header {\n      align-self: center;\n      padding-left: 20%;\n      padding-right: 20%;\n      border-radius: 0.5em;\n      background-color: rgba(0, 0, 0, 0.8);\n      color: #ececec;\n      }\n      "]
}, {
  "name": "Trifold",
  "description": "",
  "categories": [["todo", {
    "title": "Todo list",
    "styles": {}
  }], ["inprogress", {
    "title": "In progress",
    "styles": {}
  }], ["complete", {
    "title": "Completed",
    "styles": {}
  }]],
  "styles": [// SVG background from SVGBackgrounds.com
  " .board {\n      background-color: #dcab95;\n\nbackground-image: url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100%25' height='100%25' viewBox='0 0 1200 800'%3E%3Cdefs%3E%3ClinearGradient id='a' gradientUnits='userSpaceOnUse' x1='600' y1='25' x2='600' y2='777'%3E%3Cstop offset='0' stop-color='%23dcab95'/%3E%3Cstop offset='1' stop-color='%23b6eed0'/%3E%3C/linearGradient%3E%3ClinearGradient id='b' gradientUnits='userSpaceOnUse' x1='650' y1='25' x2='650' y2='777'%3E%3Cstop offset='0' stop-color='%23debb98'/%3E%3Cstop offset='1' stop-color='%23a4e6d0'/%3E%3C/linearGradient%3E%3ClinearGradient id='c' gradientUnits='userSpaceOnUse' x1='700' y1='25' x2='700' y2='777'%3E%3Cstop offset='0' stop-color='%23e0cb9b'/%3E%3Cstop offset='1' stop-color='%2393ded4'/%3E%3C/linearGradient%3E%3ClinearGradient id='d' gradientUnits='userSpaceOnUse' x1='750' y1='25' x2='750' y2='777'%3E%3Cstop offset='0' stop-color='%23e2db9d'/%3E%3Cstop offset='1' stop-color='%2383cdd4'/%3E%3C/linearGradient%3E%3ClinearGradient id='e' gradientUnits='userSpaceOnUse' x1='800' y1='25' x2='800' y2='777'%3E%3Cstop offset='0' stop-color='%23dde3a0'/%3E%3Cstop offset='1' stop-color='%2374b1c8'/%3E%3C/linearGradient%3E%3ClinearGradient id='f' gradientUnits='userSpaceOnUse' x1='850' y1='25' x2='850' y2='777'%3E%3Cstop offset='0' stop-color='%23d2e5a3'/%3E%3Cstop offset='1' stop-color='%236793bc'/%3E%3C/linearGradient%3E%3ClinearGradient id='g' gradientUnits='userSpaceOnUse' x1='900' y1='25' x2='900' y2='777'%3E%3Cstop offset='0' stop-color='%23c7e7a6'/%3E%3Cstop offset='1' stop-color='%235b75ae'/%3E%3C/linearGradient%3E%3ClinearGradient id='h' gradientUnits='userSpaceOnUse' x1='950' y1='25' x2='950' y2='777'%3E%3Cstop offset='0' stop-color='%23bde8a9'/%3E%3Cstop offset='1' stop-color='%23555c9b'/%3E%3C/linearGradient%3E%3ClinearGradient id='i' gradientUnits='userSpaceOnUse' x1='1000' y1='25' x2='1000' y2='777'%3E%3Cstop offset='0' stop-color='%23b4eaac'/%3E%3Cstop offset='1' stop-color='%23565185'/%3E%3C/linearGradient%3E%3ClinearGradient id='j' gradientUnits='userSpaceOnUse' x1='1050' y1='25' x2='1050' y2='777'%3E%3Cstop offset='0' stop-color='%23b0ebb4'/%3E%3Cstop offset='1' stop-color='%23574b70'/%3E%3C/linearGradient%3E%3ClinearGradient id='k' gradientUnits='userSpaceOnUse' x1='1100' y1='25' x2='1100' y2='777'%3E%3Cstop offset='0' stop-color='%23b3edc2'/%3E%3Cstop offset='1' stop-color='%2351455d'/%3E%3C/linearGradient%3E%3ClinearGradient id='l' gradientUnits='userSpaceOnUse' x1='1150' y1='25' x2='1150' y2='777'%3E%3Cstop offset='0' stop-color='%23b6eed0'/%3E%3Cstop offset='1' stop-color='%23473d4b'/%3E%3C/linearGradient%3E%3C/defs%3E%3Cg %3E%3Crect fill='url(%23a)' width='1200' height='800'/%3E%3Crect fill='url(%23b)' x='100' width='1100' height='800'/%3E%3Crect fill='url(%23c)' x='200' width='1000' height='800'/%3E%3Crect fill='url(%23d)' x='300' width='900' height='800'/%3E%3Crect fill='url(%23e)' x='400' width='800' height='800'/%3E%3Crect fill='url(%23f)' x='500' width='700' height='800'/%3E%3Crect fill='url(%23g)' x='600' width='600' height='800'/%3E%3Crect fill='url(%23h)' x='700' width='500' height='800'/%3E%3Crect fill='url(%23i)' x='800' width='400' height='800'/%3E%3Crect fill='url(%23j)' x='900' width='300' height='800'/%3E%3Crect fill='url(%23k)' x='1000' width='200' height='800'/%3E%3Crect fill='url(%23l)' x='1100' width='100' height='800'/%3E%3C/g%3E%3C/svg%3E\");\nbackground-attachment: fixed;\nbackground-size: cover;\n      }"],
  "def": "todo"
}, {
  "name": "Zen",
  "description": "",
  "categories": [["todo", {
    "title": "Right now",
    "styles": {}
  }], ["later", {
    "title": "Later",
    "styles": {}
  }]],
  "def": "todo",
  "styles": [// SVG pattern by HeroPatterns.com under CC BY 4.0 license
  ".board {\nbackground-color: #f8f8f8;\n\nbackground-image: url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 56 28' width='56' height='28'%3E%3Cpath fill='%23809883' fill-opacity='0.4' d='M56 26v2h-7.75c2.3-1.27 4.94-2 7.75-2zm-26 2a2 2 0 1 0-4 0h-4.09A25.98 25.98 0 0 0 0 16v-2c.67 0 1.34.02 2 .07V14a2 2 0 0 0-2-2v-2a4 4 0 0 1 3.98 3.6 28.09 28.09 0 0 1 2.8-3.86A8 8 0 0 0 0 6V4a9.99 9.99 0 0 1 8.17 4.23c.94-.95 1.96-1.83 3.03-2.63A13.98 13.98 0 0 0 0 0h7.75c2 1.1 3.73 2.63 5.1 4.45 1.12-.72 2.3-1.37 3.53-1.93A20.1 20.1 0 0 0 14.28 0h2.7c.45.56.88 1.14 1.29 1.74 1.3-.48 2.63-.87 4-1.15-.11-.2-.23-.4-.36-.59H26v.07a28.4 28.4 0 0 1 4 0V0h4.09l-.37.59c1.38.28 2.72.67 4.01 1.15.4-.6.84-1.18 1.3-1.74h2.69a20.1 20.1 0 0 0-2.1 2.52c1.23.56 2.41 1.2 3.54 1.93A16.08 16.08 0 0 1 48.25 0H56c-4.58 0-8.65 2.2-11.2 5.6 1.07.8 2.09 1.68 3.03 2.63A9.99 9.99 0 0 1 56 4v2a8 8 0 0 0-6.77 3.74c1.03 1.2 1.97 2.5 2.79 3.86A4 4 0 0 1 56 10v2a2 2 0 0 0-2 2.07 28.4 28.4 0 0 1 2-.07v2c-9.2 0-17.3 4.78-21.91 12H30zM7.75 28H0v-2c2.81 0 5.46.73 7.75 2zM56 20v2c-5.6 0-10.65 2.3-14.28 6h-2.7c4.04-4.89 10.15-8 16.98-8zm-39.03 8h-2.69C10.65 24.3 5.6 22 0 22v-2c6.83 0 12.94 3.11 16.97 8zm15.01-.4a28.09 28.09 0 0 1 2.8-3.86 8 8 0 0 0-13.55 0c1.03 1.2 1.97 2.5 2.79 3.86a4 4 0 0 1 7.96 0zm14.29-11.86c1.3-.48 2.63-.87 4-1.15a25.99 25.99 0 0 0-44.55 0c1.38.28 2.72.67 4.01 1.15a21.98 21.98 0 0 1 36.54 0zm-5.43 2.71c1.13-.72 2.3-1.37 3.54-1.93a19.98 19.98 0 0 0-32.76 0c1.23.56 2.41 1.2 3.54 1.93a15.98 15.98 0 0 1 25.68 0zm-4.67 3.78c.94-.95 1.96-1.83 3.03-2.63a13.98 13.98 0 0 0-22.4 0c1.07.8 2.09 1.68 3.03 2.63a9.99 9.99 0 0 1 16.34 0z'%3E%3C/path%3E%3C/svg%3E\");\n      }", " .category header {\n      align-self: center;\n      padding-left: 20%;\n      padding-right: 20%;\n      border-radius: 0.5em;\n      background-color: rgba(0, 0, 0, 0.4);\n      color: #ececec;\n      }\n      "]
}, {
  "name": "Trifold",
  "description": "",
  "categories": [["todo", {
    "title": "Todo list",
    "styles": {}
  }], ["inprogress", {
    "title": "In progress",
    "styles": {}
  }], ["complete", {
    "title": "Completed",
    "styles": {}
  }]],
  "styles": [// SVG background from SVGBackgrounds.com
  " .board {\n      background-color: #dcab95;\n\nbackground-image: url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100%25' height='100%25' viewBox='0 0 1200 800'%3E%3Cdefs%3E%3ClinearGradient id='a' gradientUnits='userSpaceOnUse' x1='600' y1='25' x2='600' y2='777'%3E%3Cstop offset='0' stop-color='%23dcab95'/%3E%3Cstop offset='1' stop-color='%23b6eed0'/%3E%3C/linearGradient%3E%3ClinearGradient id='b' gradientUnits='userSpaceOnUse' x1='650' y1='25' x2='650' y2='777'%3E%3Cstop offset='0' stop-color='%23debb98'/%3E%3Cstop offset='1' stop-color='%23a4e6d0'/%3E%3C/linearGradient%3E%3ClinearGradient id='c' gradientUnits='userSpaceOnUse' x1='700' y1='25' x2='700' y2='777'%3E%3Cstop offset='0' stop-color='%23e0cb9b'/%3E%3Cstop offset='1' stop-color='%2393ded4'/%3E%3C/linearGradient%3E%3ClinearGradient id='d' gradientUnits='userSpaceOnUse' x1='750' y1='25' x2='750' y2='777'%3E%3Cstop offset='0' stop-color='%23e2db9d'/%3E%3Cstop offset='1' stop-color='%2383cdd4'/%3E%3C/linearGradient%3E%3ClinearGradient id='e' gradientUnits='userSpaceOnUse' x1='800' y1='25' x2='800' y2='777'%3E%3Cstop offset='0' stop-color='%23dde3a0'/%3E%3Cstop offset='1' stop-color='%2374b1c8'/%3E%3C/linearGradient%3E%3ClinearGradient id='f' gradientUnits='userSpaceOnUse' x1='850' y1='25' x2='850' y2='777'%3E%3Cstop offset='0' stop-color='%23d2e5a3'/%3E%3Cstop offset='1' stop-color='%236793bc'/%3E%3C/linearGradient%3E%3ClinearGradient id='g' gradientUnits='userSpaceOnUse' x1='900' y1='25' x2='900' y2='777'%3E%3Cstop offset='0' stop-color='%23c7e7a6'/%3E%3Cstop offset='1' stop-color='%235b75ae'/%3E%3C/linearGradient%3E%3ClinearGradient id='h' gradientUnits='userSpaceOnUse' x1='950' y1='25' x2='950' y2='777'%3E%3Cstop offset='0' stop-color='%23bde8a9'/%3E%3Cstop offset='1' stop-color='%23555c9b'/%3E%3C/linearGradient%3E%3ClinearGradient id='i' gradientUnits='userSpaceOnUse' x1='1000' y1='25' x2='1000' y2='777'%3E%3Cstop offset='0' stop-color='%23b4eaac'/%3E%3Cstop offset='1' stop-color='%23565185'/%3E%3C/linearGradient%3E%3ClinearGradient id='j' gradientUnits='userSpaceOnUse' x1='1050' y1='25' x2='1050' y2='777'%3E%3Cstop offset='0' stop-color='%23b0ebb4'/%3E%3Cstop offset='1' stop-color='%23574b70'/%3E%3C/linearGradient%3E%3ClinearGradient id='k' gradientUnits='userSpaceOnUse' x1='1100' y1='25' x2='1100' y2='777'%3E%3Cstop offset='0' stop-color='%23b3edc2'/%3E%3Cstop offset='1' stop-color='%2351455d'/%3E%3C/linearGradient%3E%3ClinearGradient id='l' gradientUnits='userSpaceOnUse' x1='1150' y1='25' x2='1150' y2='777'%3E%3Cstop offset='0' stop-color='%23b6eed0'/%3E%3Cstop offset='1' stop-color='%23473d4b'/%3E%3C/linearGradient%3E%3C/defs%3E%3Cg %3E%3Crect fill='url(%23a)' width='1200' height='800'/%3E%3Crect fill='url(%23b)' x='100' width='1100' height='800'/%3E%3Crect fill='url(%23c)' x='200' width='1000' height='800'/%3E%3Crect fill='url(%23d)' x='300' width='900' height='800'/%3E%3Crect fill='url(%23e)' x='400' width='800' height='800'/%3E%3Crect fill='url(%23f)' x='500' width='700' height='800'/%3E%3Crect fill='url(%23g)' x='600' width='600' height='800'/%3E%3Crect fill='url(%23h)' x='700' width='500' height='800'/%3E%3Crect fill='url(%23i)' x='800' width='400' height='800'/%3E%3Crect fill='url(%23j)' x='900' width='300' height='800'/%3E%3Crect fill='url(%23k)' x='1000' width='200' height='800'/%3E%3Crect fill='url(%23l)' x='1100' width='100' height='800'/%3E%3C/g%3E%3C/svg%3E\");\nbackground-attachment: fixed;\nbackground-size: cover;\n      }"],
  "def": "todo"
}, {
  "name": "Zen",
  "description": "",
  "categories": [["todo", {
    "title": "Right now",
    "styles": {}
  }], ["later", {
    "title": "Later",
    "styles": {}
  }]],
  "def": "todo",
  "styles": [// SVG pattern by HeroPatterns.com under CC BY 4.0 license
  ".board {\nbackground-color: #f8f8f8;\n\nbackground-image: url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 56 28' width='56' height='28'%3E%3Cpath fill='%23809883' fill-opacity='0.4' d='M56 26v2h-7.75c2.3-1.27 4.94-2 7.75-2zm-26 2a2 2 0 1 0-4 0h-4.09A25.98 25.98 0 0 0 0 16v-2c.67 0 1.34.02 2 .07V14a2 2 0 0 0-2-2v-2a4 4 0 0 1 3.98 3.6 28.09 28.09 0 0 1 2.8-3.86A8 8 0 0 0 0 6V4a9.99 9.99 0 0 1 8.17 4.23c.94-.95 1.96-1.83 3.03-2.63A13.98 13.98 0 0 0 0 0h7.75c2 1.1 3.73 2.63 5.1 4.45 1.12-.72 2.3-1.37 3.53-1.93A20.1 20.1 0 0 0 14.28 0h2.7c.45.56.88 1.14 1.29 1.74 1.3-.48 2.63-.87 4-1.15-.11-.2-.23-.4-.36-.59H26v.07a28.4 28.4 0 0 1 4 0V0h4.09l-.37.59c1.38.28 2.72.67 4.01 1.15.4-.6.84-1.18 1.3-1.74h2.69a20.1 20.1 0 0 0-2.1 2.52c1.23.56 2.41 1.2 3.54 1.93A16.08 16.08 0 0 1 48.25 0H56c-4.58 0-8.65 2.2-11.2 5.6 1.07.8 2.09 1.68 3.03 2.63A9.99 9.99 0 0 1 56 4v2a8 8 0 0 0-6.77 3.74c1.03 1.2 1.97 2.5 2.79 3.86A4 4 0 0 1 56 10v2a2 2 0 0 0-2 2.07 28.4 28.4 0 0 1 2-.07v2c-9.2 0-17.3 4.78-21.91 12H30zM7.75 28H0v-2c2.81 0 5.46.73 7.75 2zM56 20v2c-5.6 0-10.65 2.3-14.28 6h-2.7c4.04-4.89 10.15-8 16.98-8zm-39.03 8h-2.69C10.65 24.3 5.6 22 0 22v-2c6.83 0 12.94 3.11 16.97 8zm15.01-.4a28.09 28.09 0 0 1 2.8-3.86 8 8 0 0 0-13.55 0c1.03 1.2 1.97 2.5 2.79 3.86a4 4 0 0 1 7.96 0zm14.29-11.86c1.3-.48 2.63-.87 4-1.15a25.99 25.99 0 0 0-44.55 0c1.38.28 2.72.67 4.01 1.15a21.98 21.98 0 0 1 36.54 0zm-5.43 2.71c1.13-.72 2.3-1.37 3.54-1.93a19.98 19.98 0 0 0-32.76 0c1.23.56 2.41 1.2 3.54 1.93a15.98 15.98 0 0 1 25.68 0zm-4.67 3.78c.94-.95 1.96-1.83 3.03-2.63a13.98 13.98 0 0 0-22.4 0c1.07.8 2.09 1.68 3.03 2.63a9.99 9.99 0 0 1 16.34 0z'%3E%3C/path%3E%3C/svg%3E\");\n      }", " .category header {\n      align-self: center;\n      border-radius: 0.5em;\n      background-color: rgba(0, 0, 0, 0.4);\n      color: #ececec;\n      }\n      "]
}, {
  "name": "Trifold",
  "description": "",
  "categories": [["todo", {
    "title": "Todo list",
    "styles": {}
  }], ["inprogress", {
    "title": "In progress",
    "styles": {}
  }], ["complete", {
    "title": "Completed",
    "styles": {}
  }]],
  "styles": [// SVG background from SVGBackgrounds.com
  " .board {\n      background-color: #dcab95;\n\nbackground-image: url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100%25' height='100%25' viewBox='0 0 1200 800'%3E%3Cdefs%3E%3ClinearGradient id='a' gradientUnits='userSpaceOnUse' x1='600' y1='25' x2='600' y2='777'%3E%3Cstop offset='0' stop-color='%23dcab95'/%3E%3Cstop offset='1' stop-color='%23b6eed0'/%3E%3C/linearGradient%3E%3ClinearGradient id='b' gradientUnits='userSpaceOnUse' x1='650' y1='25' x2='650' y2='777'%3E%3Cstop offset='0' stop-color='%23debb98'/%3E%3Cstop offset='1' stop-color='%23a4e6d0'/%3E%3C/linearGradient%3E%3ClinearGradient id='c' gradientUnits='userSpaceOnUse' x1='700' y1='25' x2='700' y2='777'%3E%3Cstop offset='0' stop-color='%23e0cb9b'/%3E%3Cstop offset='1' stop-color='%2393ded4'/%3E%3C/linearGradient%3E%3ClinearGradient id='d' gradientUnits='userSpaceOnUse' x1='750' y1='25' x2='750' y2='777'%3E%3Cstop offset='0' stop-color='%23e2db9d'/%3E%3Cstop offset='1' stop-color='%2383cdd4'/%3E%3C/linearGradient%3E%3ClinearGradient id='e' gradientUnits='userSpaceOnUse' x1='800' y1='25' x2='800' y2='777'%3E%3Cstop offset='0' stop-color='%23dde3a0'/%3E%3Cstop offset='1' stop-color='%2374b1c8'/%3E%3C/linearGradient%3E%3ClinearGradient id='f' gradientUnits='userSpaceOnUse' x1='850' y1='25' x2='850' y2='777'%3E%3Cstop offset='0' stop-color='%23d2e5a3'/%3E%3Cstop offset='1' stop-color='%236793bc'/%3E%3C/linearGradient%3E%3ClinearGradient id='g' gradientUnits='userSpaceOnUse' x1='900' y1='25' x2='900' y2='777'%3E%3Cstop offset='0' stop-color='%23c7e7a6'/%3E%3Cstop offset='1' stop-color='%235b75ae'/%3E%3C/linearGradient%3E%3ClinearGradient id='h' gradientUnits='userSpaceOnUse' x1='950' y1='25' x2='950' y2='777'%3E%3Cstop offset='0' stop-color='%23bde8a9'/%3E%3Cstop offset='1' stop-color='%23555c9b'/%3E%3C/linearGradient%3E%3ClinearGradient id='i' gradientUnits='userSpaceOnUse' x1='1000' y1='25' x2='1000' y2='777'%3E%3Cstop offset='0' stop-color='%23b4eaac'/%3E%3Cstop offset='1' stop-color='%23565185'/%3E%3C/linearGradient%3E%3ClinearGradient id='j' gradientUnits='userSpaceOnUse' x1='1050' y1='25' x2='1050' y2='777'%3E%3Cstop offset='0' stop-color='%23b0ebb4'/%3E%3Cstop offset='1' stop-color='%23574b70'/%3E%3C/linearGradient%3E%3ClinearGradient id='k' gradientUnits='userSpaceOnUse' x1='1100' y1='25' x2='1100' y2='777'%3E%3Cstop offset='0' stop-color='%23b3edc2'/%3E%3Cstop offset='1' stop-color='%2351455d'/%3E%3C/linearGradient%3E%3ClinearGradient id='l' gradientUnits='userSpaceOnUse' x1='1150' y1='25' x2='1150' y2='777'%3E%3Cstop offset='0' stop-color='%23b6eed0'/%3E%3Cstop offset='1' stop-color='%23473d4b'/%3E%3C/linearGradient%3E%3C/defs%3E%3Cg %3E%3Crect fill='url(%23a)' width='1200' height='800'/%3E%3Crect fill='url(%23b)' x='100' width='1100' height='800'/%3E%3Crect fill='url(%23c)' x='200' width='1000' height='800'/%3E%3Crect fill='url(%23d)' x='300' width='900' height='800'/%3E%3Crect fill='url(%23e)' x='400' width='800' height='800'/%3E%3Crect fill='url(%23f)' x='500' width='700' height='800'/%3E%3Crect fill='url(%23g)' x='600' width='600' height='800'/%3E%3Crect fill='url(%23h)' x='700' width='500' height='800'/%3E%3Crect fill='url(%23i)' x='800' width='400' height='800'/%3E%3Crect fill='url(%23j)' x='900' width='300' height='800'/%3E%3Crect fill='url(%23k)' x='1000' width='200' height='800'/%3E%3Crect fill='url(%23l)' x='1100' width='100' height='800'/%3E%3C/g%3E%3C/svg%3E\");\nbackground-attachment: fixed;\nbackground-size: cover;\n      }"],
  "def": "todo"
}, {
  "name": "Zen",
  "description": "",
  "categories": [["todo", {
    "title": "Right now",
    "styles": {}
  }], ["later", {
    "title": "Later",
    "styles": {}
  }]],
  "def": "todo",
  "styles": [// SVG pattern by HeroPatterns.com under CC BY 4.0 license
  ".board {\nbackground-color: #f8f8f8;\n\nbackground-image: url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 56 28' width='56' height='28'%3E%3Cpath fill='%23809883' fill-opacity='0.4' d='M56 26v2h-7.75c2.3-1.27 4.94-2 7.75-2zm-26 2a2 2 0 1 0-4 0h-4.09A25.98 25.98 0 0 0 0 16v-2c.67 0 1.34.02 2 .07V14a2 2 0 0 0-2-2v-2a4 4 0 0 1 3.98 3.6 28.09 28.09 0 0 1 2.8-3.86A8 8 0 0 0 0 6V4a9.99 9.99 0 0 1 8.17 4.23c.94-.95 1.96-1.83 3.03-2.63A13.98 13.98 0 0 0 0 0h7.75c2 1.1 3.73 2.63 5.1 4.45 1.12-.72 2.3-1.37 3.53-1.93A20.1 20.1 0 0 0 14.28 0h2.7c.45.56.88 1.14 1.29 1.74 1.3-.48 2.63-.87 4-1.15-.11-.2-.23-.4-.36-.59H26v.07a28.4 28.4 0 0 1 4 0V0h4.09l-.37.59c1.38.28 2.72.67 4.01 1.15.4-.6.84-1.18 1.3-1.74h2.69a20.1 20.1 0 0 0-2.1 2.52c1.23.56 2.41 1.2 3.54 1.93A16.08 16.08 0 0 1 48.25 0H56c-4.58 0-8.65 2.2-11.2 5.6 1.07.8 2.09 1.68 3.03 2.63A9.99 9.99 0 0 1 56 4v2a8 8 0 0 0-6.77 3.74c1.03 1.2 1.97 2.5 2.79 3.86A4 4 0 0 1 56 10v2a2 2 0 0 0-2 2.07 28.4 28.4 0 0 1 2-.07v2c-9.2 0-17.3 4.78-21.91 12H30zM7.75 28H0v-2c2.81 0 5.46.73 7.75 2zM56 20v2c-5.6 0-10.65 2.3-14.28 6h-2.7c4.04-4.89 10.15-8 16.98-8zm-39.03 8h-2.69C10.65 24.3 5.6 22 0 22v-2c6.83 0 12.94 3.11 16.97 8zm15.01-.4a28.09 28.09 0 0 1 2.8-3.86 8 8 0 0 0-13.55 0c1.03 1.2 1.97 2.5 2.79 3.86a4 4 0 0 1 7.96 0zm14.29-11.86c1.3-.48 2.63-.87 4-1.15a25.99 25.99 0 0 0-44.55 0c1.38.28 2.72.67 4.01 1.15a21.98 21.98 0 0 1 36.54 0zm-5.43 2.71c1.13-.72 2.3-1.37 3.54-1.93a19.98 19.98 0 0 0-32.76 0c1.23.56 2.41 1.2 3.54 1.93a15.98 15.98 0 0 1 25.68 0zm-4.67 3.78c.94-.95 1.96-1.83 3.03-2.63a13.98 13.98 0 0 0-22.4 0c1.07.8 2.09 1.68 3.03 2.63a9.99 9.99 0 0 1 16.34 0z'%3E%3C/path%3E%3C/svg%3E\");\n      }", " .category header {\n      border-radius: 0.5em;\n      background-color: rgba(0, 0, 0, 0.4);\n      color: #ececec;\n      }\n      "]
}, {
  "name": "Trifold",
  "description": "",
  "categories": [["todo", {
    "title": "Todo list",
    "styles": {}
  }], ["inprogress", {
    "title": "In progress",
    "styles": {}
  }], ["complete", {
    "title": "Completed",
    "styles": {}
  }]],
  "styles": [// SVG background from SVGBackgrounds.com
  " .board {\n      background-color: #dcab95;\n\nbackground-image: url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100%25' height='100%25' viewBox='0 0 1200 800'%3E%3Cdefs%3E%3ClinearGradient id='a' gradientUnits='userSpaceOnUse' x1='600' y1='25' x2='600' y2='777'%3E%3Cstop offset='0' stop-color='%23dcab95'/%3E%3Cstop offset='1' stop-color='%23b6eed0'/%3E%3C/linearGradient%3E%3ClinearGradient id='b' gradientUnits='userSpaceOnUse' x1='650' y1='25' x2='650' y2='777'%3E%3Cstop offset='0' stop-color='%23debb98'/%3E%3Cstop offset='1' stop-color='%23a4e6d0'/%3E%3C/linearGradient%3E%3ClinearGradient id='c' gradientUnits='userSpaceOnUse' x1='700' y1='25' x2='700' y2='777'%3E%3Cstop offset='0' stop-color='%23e0cb9b'/%3E%3Cstop offset='1' stop-color='%2393ded4'/%3E%3C/linearGradient%3E%3ClinearGradient id='d' gradientUnits='userSpaceOnUse' x1='750' y1='25' x2='750' y2='777'%3E%3Cstop offset='0' stop-color='%23e2db9d'/%3E%3Cstop offset='1' stop-color='%2383cdd4'/%3E%3C/linearGradient%3E%3ClinearGradient id='e' gradientUnits='userSpaceOnUse' x1='800' y1='25' x2='800' y2='777'%3E%3Cstop offset='0' stop-color='%23dde3a0'/%3E%3Cstop offset='1' stop-color='%2374b1c8'/%3E%3C/linearGradient%3E%3ClinearGradient id='f' gradientUnits='userSpaceOnUse' x1='850' y1='25' x2='850' y2='777'%3E%3Cstop offset='0' stop-color='%23d2e5a3'/%3E%3Cstop offset='1' stop-color='%236793bc'/%3E%3C/linearGradient%3E%3ClinearGradient id='g' gradientUnits='userSpaceOnUse' x1='900' y1='25' x2='900' y2='777'%3E%3Cstop offset='0' stop-color='%23c7e7a6'/%3E%3Cstop offset='1' stop-color='%235b75ae'/%3E%3C/linearGradient%3E%3ClinearGradient id='h' gradientUnits='userSpaceOnUse' x1='950' y1='25' x2='950' y2='777'%3E%3Cstop offset='0' stop-color='%23bde8a9'/%3E%3Cstop offset='1' stop-color='%23555c9b'/%3E%3C/linearGradient%3E%3ClinearGradient id='i' gradientUnits='userSpaceOnUse' x1='1000' y1='25' x2='1000' y2='777'%3E%3Cstop offset='0' stop-color='%23b4eaac'/%3E%3Cstop offset='1' stop-color='%23565185'/%3E%3C/linearGradient%3E%3ClinearGradient id='j' gradientUnits='userSpaceOnUse' x1='1050' y1='25' x2='1050' y2='777'%3E%3Cstop offset='0' stop-color='%23b0ebb4'/%3E%3Cstop offset='1' stop-color='%23574b70'/%3E%3C/linearGradient%3E%3ClinearGradient id='k' gradientUnits='userSpaceOnUse' x1='1100' y1='25' x2='1100' y2='777'%3E%3Cstop offset='0' stop-color='%23b3edc2'/%3E%3Cstop offset='1' stop-color='%2351455d'/%3E%3C/linearGradient%3E%3ClinearGradient id='l' gradientUnits='userSpaceOnUse' x1='1150' y1='25' x2='1150' y2='777'%3E%3Cstop offset='0' stop-color='%23b6eed0'/%3E%3Cstop offset='1' stop-color='%23473d4b'/%3E%3C/linearGradient%3E%3C/defs%3E%3Cg %3E%3Crect fill='url(%23a)' width='1200' height='800'/%3E%3Crect fill='url(%23b)' x='100' width='1100' height='800'/%3E%3Crect fill='url(%23c)' x='200' width='1000' height='800'/%3E%3Crect fill='url(%23d)' x='300' width='900' height='800'/%3E%3Crect fill='url(%23e)' x='400' width='800' height='800'/%3E%3Crect fill='url(%23f)' x='500' width='700' height='800'/%3E%3Crect fill='url(%23g)' x='600' width='600' height='800'/%3E%3Crect fill='url(%23h)' x='700' width='500' height='800'/%3E%3Crect fill='url(%23i)' x='800' width='400' height='800'/%3E%3Crect fill='url(%23j)' x='900' width='300' height='800'/%3E%3Crect fill='url(%23k)' x='1000' width='200' height='800'/%3E%3Crect fill='url(%23l)' x='1100' width='100' height='800'/%3E%3C/g%3E%3C/svg%3E\");\nbackground-attachment: fixed;\nbackground-size: cover;\n      }"],
  "def": "todo"
}, {
  "name": "Zen",
  "description": "",
  "categories": [["todo", {
    "title": "Right now",
    "styles": {}
  }], ["later", {
    "title": "Later",
    "styles": {}
  }]],
  "def": "todo",
  "styles": [// SVG pattern by HeroPatterns.com under CC BY 4.0 license
  ".board {\nbackground-color: #f8f8f8;\n\nbackground-image: url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 56 28' width='56' height='28'%3E%3Cpath fill='%23809883' fill-opacity='0.4' d='M56 26v2h-7.75c2.3-1.27 4.94-2 7.75-2zm-26 2a2 2 0 1 0-4 0h-4.09A25.98 25.98 0 0 0 0 16v-2c.67 0 1.34.02 2 .07V14a2 2 0 0 0-2-2v-2a4 4 0 0 1 3.98 3.6 28.09 28.09 0 0 1 2.8-3.86A8 8 0 0 0 0 6V4a9.99 9.99 0 0 1 8.17 4.23c.94-.95 1.96-1.83 3.03-2.63A13.98 13.98 0 0 0 0 0h7.75c2 1.1 3.73 2.63 5.1 4.45 1.12-.72 2.3-1.37 3.53-1.93A20.1 20.1 0 0 0 14.28 0h2.7c.45.56.88 1.14 1.29 1.74 1.3-.48 2.63-.87 4-1.15-.11-.2-.23-.4-.36-.59H26v.07a28.4 28.4 0 0 1 4 0V0h4.09l-.37.59c1.38.28 2.72.67 4.01 1.15.4-.6.84-1.18 1.3-1.74h2.69a20.1 20.1 0 0 0-2.1 2.52c1.23.56 2.41 1.2 3.54 1.93A16.08 16.08 0 0 1 48.25 0H56c-4.58 0-8.65 2.2-11.2 5.6 1.07.8 2.09 1.68 3.03 2.63A9.99 9.99 0 0 1 56 4v2a8 8 0 0 0-6.77 3.74c1.03 1.2 1.97 2.5 2.79 3.86A4 4 0 0 1 56 10v2a2 2 0 0 0-2 2.07 28.4 28.4 0 0 1 2-.07v2c-9.2 0-17.3 4.78-21.91 12H30zM7.75 28H0v-2c2.81 0 5.46.73 7.75 2zM56 20v2c-5.6 0-10.65 2.3-14.28 6h-2.7c4.04-4.89 10.15-8 16.98-8zm-39.03 8h-2.69C10.65 24.3 5.6 22 0 22v-2c6.83 0 12.94 3.11 16.97 8zm15.01-.4a28.09 28.09 0 0 1 2.8-3.86 8 8 0 0 0-13.55 0c1.03 1.2 1.97 2.5 2.79 3.86a4 4 0 0 1 7.96 0zm14.29-11.86c1.3-.48 2.63-.87 4-1.15a25.99 25.99 0 0 0-44.55 0c1.38.28 2.72.67 4.01 1.15a21.98 21.98 0 0 1 36.54 0zm-5.43 2.71c1.13-.72 2.3-1.37 3.54-1.93a19.98 19.98 0 0 0-32.76 0c1.23.56 2.41 1.2 3.54 1.93a15.98 15.98 0 0 1 25.68 0zm-4.67 3.78c.94-.95 1.96-1.83 3.03-2.63a13.98 13.98 0 0 0-22.4 0c1.07.8 2.09 1.68 3.03 2.63a9.99 9.99 0 0 1 16.34 0z'%3E%3C/path%3E%3C/svg%3E\");\n      }", " .category header {\n      border-radius: 0.5em;\n      background-color: rgba(45, 45, 48, 0.55);\n      color: #ececec;\n      }\n      "]
}, {
  "name": "Trifold",
  "description": "",
  "categories": [["todo", {
    "title": "Todo list",
    "styles": {}
  }], ["inprogress", {
    "title": "In progress",
    "styles": {}
  }], ["complete", {
    "title": "Completed",
    "styles": {}
  }]],
  "styles": [// SVG background from SVGBackgrounds.com
  " .board {\n      background-color: #dcab95;\n\nbackground-image: url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100%25' height='100%25' viewBox='0 0 1200 800'%3E%3Cdefs%3E%3ClinearGradient id='a' gradientUnits='userSpaceOnUse' x1='600' y1='25' x2='600' y2='777'%3E%3Cstop offset='0' stop-color='%23dcab95'/%3E%3Cstop offset='1' stop-color='%23b6eed0'/%3E%3C/linearGradient%3E%3ClinearGradient id='b' gradientUnits='userSpaceOnUse' x1='650' y1='25' x2='650' y2='777'%3E%3Cstop offset='0' stop-color='%23debb98'/%3E%3Cstop offset='1' stop-color='%23a4e6d0'/%3E%3C/linearGradient%3E%3ClinearGradient id='c' gradientUnits='userSpaceOnUse' x1='700' y1='25' x2='700' y2='777'%3E%3Cstop offset='0' stop-color='%23e0cb9b'/%3E%3Cstop offset='1' stop-color='%2393ded4'/%3E%3C/linearGradient%3E%3ClinearGradient id='d' gradientUnits='userSpaceOnUse' x1='750' y1='25' x2='750' y2='777'%3E%3Cstop offset='0' stop-color='%23e2db9d'/%3E%3Cstop offset='1' stop-color='%2383cdd4'/%3E%3C/linearGradient%3E%3ClinearGradient id='e' gradientUnits='userSpaceOnUse' x1='800' y1='25' x2='800' y2='777'%3E%3Cstop offset='0' stop-color='%23dde3a0'/%3E%3Cstop offset='1' stop-color='%2374b1c8'/%3E%3C/linearGradient%3E%3ClinearGradient id='f' gradientUnits='userSpaceOnUse' x1='850' y1='25' x2='850' y2='777'%3E%3Cstop offset='0' stop-color='%23d2e5a3'/%3E%3Cstop offset='1' stop-color='%236793bc'/%3E%3C/linearGradient%3E%3ClinearGradient id='g' gradientUnits='userSpaceOnUse' x1='900' y1='25' x2='900' y2='777'%3E%3Cstop offset='0' stop-color='%23c7e7a6'/%3E%3Cstop offset='1' stop-color='%235b75ae'/%3E%3C/linearGradient%3E%3ClinearGradient id='h' gradientUnits='userSpaceOnUse' x1='950' y1='25' x2='950' y2='777'%3E%3Cstop offset='0' stop-color='%23bde8a9'/%3E%3Cstop offset='1' stop-color='%23555c9b'/%3E%3C/linearGradient%3E%3ClinearGradient id='i' gradientUnits='userSpaceOnUse' x1='1000' y1='25' x2='1000' y2='777'%3E%3Cstop offset='0' stop-color='%23b4eaac'/%3E%3Cstop offset='1' stop-color='%23565185'/%3E%3C/linearGradient%3E%3ClinearGradient id='j' gradientUnits='userSpaceOnUse' x1='1050' y1='25' x2='1050' y2='777'%3E%3Cstop offset='0' stop-color='%23b0ebb4'/%3E%3Cstop offset='1' stop-color='%23574b70'/%3E%3C/linearGradient%3E%3ClinearGradient id='k' gradientUnits='userSpaceOnUse' x1='1100' y1='25' x2='1100' y2='777'%3E%3Cstop offset='0' stop-color='%23b3edc2'/%3E%3Cstop offset='1' stop-color='%2351455d'/%3E%3C/linearGradient%3E%3ClinearGradient id='l' gradientUnits='userSpaceOnUse' x1='1150' y1='25' x2='1150' y2='777'%3E%3Cstop offset='0' stop-color='%23b6eed0'/%3E%3Cstop offset='1' stop-color='%23473d4b'/%3E%3C/linearGradient%3E%3C/defs%3E%3Cg %3E%3Crect fill='url(%23a)' width='1200' height='800'/%3E%3Crect fill='url(%23b)' x='100' width='1100' height='800'/%3E%3Crect fill='url(%23c)' x='200' width='1000' height='800'/%3E%3Crect fill='url(%23d)' x='300' width='900' height='800'/%3E%3Crect fill='url(%23e)' x='400' width='800' height='800'/%3E%3Crect fill='url(%23f)' x='500' width='700' height='800'/%3E%3Crect fill='url(%23g)' x='600' width='600' height='800'/%3E%3Crect fill='url(%23h)' x='700' width='500' height='800'/%3E%3Crect fill='url(%23i)' x='800' width='400' height='800'/%3E%3Crect fill='url(%23j)' x='900' width='300' height='800'/%3E%3Crect fill='url(%23k)' x='1000' width='200' height='800'/%3E%3Crect fill='url(%23l)' x='1100' width='100' height='800'/%3E%3C/g%3E%3C/svg%3E\");\nbackground-attachment: fixed;\nbackground-size: cover;\n      }"],
  "def": "todo"
}, {
  "name": "Zen",
  "description": "",
  "categories": [["todo", {
    "title": "Right now",
    "styles": {}
  }], ["later", {
    "title": "Later",
    "styles": {}
  }]],
  "def": "todo",
  "styles": [// SVG pattern by HeroPatterns.com under CC BY 4.0 license
  ".board {\nbackground-color: #f8f8f8;\n\nbackground-image: url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 56 28' width='56' height='28'%3E%3Cpath fill='%23809883' fill-opacity='0.4' d='M56 26v2h-7.75c2.3-1.27 4.94-2 7.75-2zm-26 2a2 2 0 1 0-4 0h-4.09A25.98 25.98 0 0 0 0 16v-2c.67 0 1.34.02 2 .07V14a2 2 0 0 0-2-2v-2a4 4 0 0 1 3.98 3.6 28.09 28.09 0 0 1 2.8-3.86A8 8 0 0 0 0 6V4a9.99 9.99 0 0 1 8.17 4.23c.94-.95 1.96-1.83 3.03-2.63A13.98 13.98 0 0 0 0 0h7.75c2 1.1 3.73 2.63 5.1 4.45 1.12-.72 2.3-1.37 3.53-1.93A20.1 20.1 0 0 0 14.28 0h2.7c.45.56.88 1.14 1.29 1.74 1.3-.48 2.63-.87 4-1.15-.11-.2-.23-.4-.36-.59H26v.07a28.4 28.4 0 0 1 4 0V0h4.09l-.37.59c1.38.28 2.72.67 4.01 1.15.4-.6.84-1.18 1.3-1.74h2.69a20.1 20.1 0 0 0-2.1 2.52c1.23.56 2.41 1.2 3.54 1.93A16.08 16.08 0 0 1 48.25 0H56c-4.58 0-8.65 2.2-11.2 5.6 1.07.8 2.09 1.68 3.03 2.63A9.99 9.99 0 0 1 56 4v2a8 8 0 0 0-6.77 3.74c1.03 1.2 1.97 2.5 2.79 3.86A4 4 0 0 1 56 10v2a2 2 0 0 0-2 2.07 28.4 28.4 0 0 1 2-.07v2c-9.2 0-17.3 4.78-21.91 12H30zM7.75 28H0v-2c2.81 0 5.46.73 7.75 2zM56 20v2c-5.6 0-10.65 2.3-14.28 6h-2.7c4.04-4.89 10.15-8 16.98-8zm-39.03 8h-2.69C10.65 24.3 5.6 22 0 22v-2c6.83 0 12.94 3.11 16.97 8zm15.01-.4a28.09 28.09 0 0 1 2.8-3.86 8 8 0 0 0-13.55 0c1.03 1.2 1.97 2.5 2.79 3.86a4 4 0 0 1 7.96 0zm14.29-11.86c1.3-.48 2.63-.87 4-1.15a25.99 25.99 0 0 0-44.55 0c1.38.28 2.72.67 4.01 1.15a21.98 21.98 0 0 1 36.54 0zm-5.43 2.71c1.13-.72 2.3-1.37 3.54-1.93a19.98 19.98 0 0 0-32.76 0c1.23.56 2.41 1.2 3.54 1.93a15.98 15.98 0 0 1 25.68 0zm-4.67 3.78c.94-.95 1.96-1.83 3.03-2.63a13.98 13.98 0 0 0-22.4 0c1.07.8 2.09 1.68 3.03 2.63a9.99 9.99 0 0 1 16.34 0z'%3E%3C/path%3E%3C/svg%3E\");\n      }", " .category header {\n      border-radius: 0.5em;\n      background-color: rgba(60, 60, 60, 0.7);\n      color: #ececec;\n      }\n      "]
}, {
  "name": "Trifold",
  "description": "",
  "categories": [["todo", {
    "title": "Todo list",
    "styles": {}
  }], ["inprogress", {
    "title": "In progress",
    "styles": {}
  }], ["complete", {
    "title": "Completed",
    "styles": {}
  }]],
  "styles": [// SVG background from SVGBackgrounds.com
  " .board {\n      background-color: #dcab95;\n\nbackground-image: url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100%25' height='100%25' viewBox='0 0 1200 800'%3E%3Cdefs%3E%3ClinearGradient id='a' gradientUnits='userSpaceOnUse' x1='600' y1='25' x2='600' y2='777'%3E%3Cstop offset='0' stop-color='%23dcab95'/%3E%3Cstop offset='1' stop-color='%23b6eed0'/%3E%3C/linearGradient%3E%3ClinearGradient id='b' gradientUnits='userSpaceOnUse' x1='650' y1='25' x2='650' y2='777'%3E%3Cstop offset='0' stop-color='%23debb98'/%3E%3Cstop offset='1' stop-color='%23a4e6d0'/%3E%3C/linearGradient%3E%3ClinearGradient id='c' gradientUnits='userSpaceOnUse' x1='700' y1='25' x2='700' y2='777'%3E%3Cstop offset='0' stop-color='%23e0cb9b'/%3E%3Cstop offset='1' stop-color='%2393ded4'/%3E%3C/linearGradient%3E%3ClinearGradient id='d' gradientUnits='userSpaceOnUse' x1='750' y1='25' x2='750' y2='777'%3E%3Cstop offset='0' stop-color='%23e2db9d'/%3E%3Cstop offset='1' stop-color='%2383cdd4'/%3E%3C/linearGradient%3E%3ClinearGradient id='e' gradientUnits='userSpaceOnUse' x1='800' y1='25' x2='800' y2='777'%3E%3Cstop offset='0' stop-color='%23dde3a0'/%3E%3Cstop offset='1' stop-color='%2374b1c8'/%3E%3C/linearGradient%3E%3ClinearGradient id='f' gradientUnits='userSpaceOnUse' x1='850' y1='25' x2='850' y2='777'%3E%3Cstop offset='0' stop-color='%23d2e5a3'/%3E%3Cstop offset='1' stop-color='%236793bc'/%3E%3C/linearGradient%3E%3ClinearGradient id='g' gradientUnits='userSpaceOnUse' x1='900' y1='25' x2='900' y2='777'%3E%3Cstop offset='0' stop-color='%23c7e7a6'/%3E%3Cstop offset='1' stop-color='%235b75ae'/%3E%3C/linearGradient%3E%3ClinearGradient id='h' gradientUnits='userSpaceOnUse' x1='950' y1='25' x2='950' y2='777'%3E%3Cstop offset='0' stop-color='%23bde8a9'/%3E%3Cstop offset='1' stop-color='%23555c9b'/%3E%3C/linearGradient%3E%3ClinearGradient id='i' gradientUnits='userSpaceOnUse' x1='1000' y1='25' x2='1000' y2='777'%3E%3Cstop offset='0' stop-color='%23b4eaac'/%3E%3Cstop offset='1' stop-color='%23565185'/%3E%3C/linearGradient%3E%3ClinearGradient id='j' gradientUnits='userSpaceOnUse' x1='1050' y1='25' x2='1050' y2='777'%3E%3Cstop offset='0' stop-color='%23b0ebb4'/%3E%3Cstop offset='1' stop-color='%23574b70'/%3E%3C/linearGradient%3E%3ClinearGradient id='k' gradientUnits='userSpaceOnUse' x1='1100' y1='25' x2='1100' y2='777'%3E%3Cstop offset='0' stop-color='%23b3edc2'/%3E%3Cstop offset='1' stop-color='%2351455d'/%3E%3C/linearGradient%3E%3ClinearGradient id='l' gradientUnits='userSpaceOnUse' x1='1150' y1='25' x2='1150' y2='777'%3E%3Cstop offset='0' stop-color='%23b6eed0'/%3E%3Cstop offset='1' stop-color='%23473d4b'/%3E%3C/linearGradient%3E%3C/defs%3E%3Cg %3E%3Crect fill='url(%23a)' width='1200' height='800'/%3E%3Crect fill='url(%23b)' x='100' width='1100' height='800'/%3E%3Crect fill='url(%23c)' x='200' width='1000' height='800'/%3E%3Crect fill='url(%23d)' x='300' width='900' height='800'/%3E%3Crect fill='url(%23e)' x='400' width='800' height='800'/%3E%3Crect fill='url(%23f)' x='500' width='700' height='800'/%3E%3Crect fill='url(%23g)' x='600' width='600' height='800'/%3E%3Crect fill='url(%23h)' x='700' width='500' height='800'/%3E%3Crect fill='url(%23i)' x='800' width='400' height='800'/%3E%3Crect fill='url(%23j)' x='900' width='300' height='800'/%3E%3Crect fill='url(%23k)' x='1000' width='200' height='800'/%3E%3Crect fill='url(%23l)' x='1100' width='100' height='800'/%3E%3C/g%3E%3C/svg%3E\");\nbackground-attachment: fixed;\nbackground-size: cover;\n      }"],
  "def": "todo"
}, {
  "name": "Zen",
  "description": "",
  "categories": [["todo", {
    "title": "Right now",
    "styles": {}
  }], ["later", {
    "title": "Later",
    "styles": {}
  }]],
  "def": "todo",
  "styles": [// SVG pattern by HeroPatterns.com under CC BY 4.0 license
  ".board {\nbackground-color: #f8f8f8;\n\nbackground-image: url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 56 28' width='56' height='28'%3E%3Cpath fill='%23809883' fill-opacity='0.4' d='M56 26v2h-7.75c2.3-1.27 4.94-2 7.75-2zm-26 2a2 2 0 1 0-4 0h-4.09A25.98 25.98 0 0 0 0 16v-2c.67 0 1.34.02 2 .07V14a2 2 0 0 0-2-2v-2a4 4 0 0 1 3.98 3.6 28.09 28.09 0 0 1 2.8-3.86A8 8 0 0 0 0 6V4a9.99 9.99 0 0 1 8.17 4.23c.94-.95 1.96-1.83 3.03-2.63A13.98 13.98 0 0 0 0 0h7.75c2 1.1 3.73 2.63 5.1 4.45 1.12-.72 2.3-1.37 3.53-1.93A20.1 20.1 0 0 0 14.28 0h2.7c.45.56.88 1.14 1.29 1.74 1.3-.48 2.63-.87 4-1.15-.11-.2-.23-.4-.36-.59H26v.07a28.4 28.4 0 0 1 4 0V0h4.09l-.37.59c1.38.28 2.72.67 4.01 1.15.4-.6.84-1.18 1.3-1.74h2.69a20.1 20.1 0 0 0-2.1 2.52c1.23.56 2.41 1.2 3.54 1.93A16.08 16.08 0 0 1 48.25 0H56c-4.58 0-8.65 2.2-11.2 5.6 1.07.8 2.09 1.68 3.03 2.63A9.99 9.99 0 0 1 56 4v2a8 8 0 0 0-6.77 3.74c1.03 1.2 1.97 2.5 2.79 3.86A4 4 0 0 1 56 10v2a2 2 0 0 0-2 2.07 28.4 28.4 0 0 1 2-.07v2c-9.2 0-17.3 4.78-21.91 12H30zM7.75 28H0v-2c2.81 0 5.46.73 7.75 2zM56 20v2c-5.6 0-10.65 2.3-14.28 6h-2.7c4.04-4.89 10.15-8 16.98-8zm-39.03 8h-2.69C10.65 24.3 5.6 22 0 22v-2c6.83 0 12.94 3.11 16.97 8zm15.01-.4a28.09 28.09 0 0 1 2.8-3.86 8 8 0 0 0-13.55 0c1.03 1.2 1.97 2.5 2.79 3.86a4 4 0 0 1 7.96 0zm14.29-11.86c1.3-.48 2.63-.87 4-1.15a25.99 25.99 0 0 0-44.55 0c1.38.28 2.72.67 4.01 1.15a21.98 21.98 0 0 1 36.54 0zm-5.43 2.71c1.13-.72 2.3-1.37 3.54-1.93a19.98 19.98 0 0 0-32.76 0c1.23.56 2.41 1.2 3.54 1.93a15.98 15.98 0 0 1 25.68 0zm-4.67 3.78c.94-.95 1.96-1.83 3.03-2.63a13.98 13.98 0 0 0-22.4 0c1.07.8 2.09 1.68 3.03 2.63a9.99 9.99 0 0 1 16.34 0z'%3E%3C/path%3E%3C/svg%3E\");\n      }", " .category header {\n      border-radius: 0.5em;\n      background-color: rgba(60, 60, 60, 0.7);\n      color: #ececec;\n      }\n      "]
}, {
  "name": "Trifold",
  "description": "",
  "categories": [["todo", {
    "title": "Todo list",
    "styles": {}
  }], ["inprogress", {
    "title": "In progress",
    "styles": {}
  }], ["complete", {
    "title": "Completed",
    "styles": {}
  }]],
  "styles": [// SVG background from SVGBackgrounds.com
  " .board {\n      background-color: #dcab95;\n\nbackground-image: url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100%25' height='100%25' viewBox='0 0 1200 800'%3E%3Cdefs%3E%3ClinearGradient id='a' gradientUnits='userSpaceOnUse' x1='600' y1='25' x2='600' y2='777'%3E%3Cstop offset='0' stop-color='%23dcab95'/%3E%3Cstop offset='1' stop-color='%23b6eed0'/%3E%3C/linearGradient%3E%3ClinearGradient id='b' gradientUnits='userSpaceOnUse' x1='650' y1='25' x2='650' y2='777'%3E%3Cstop offset='0' stop-color='%23debb98'/%3E%3Cstop offset='1' stop-color='%23a4e6d0'/%3E%3C/linearGradient%3E%3ClinearGradient id='c' gradientUnits='userSpaceOnUse' x1='700' y1='25' x2='700' y2='777'%3E%3Cstop offset='0' stop-color='%23e0cb9b'/%3E%3Cstop offset='1' stop-color='%2393ded4'/%3E%3C/linearGradient%3E%3ClinearGradient id='d' gradientUnits='userSpaceOnUse' x1='750' y1='25' x2='750' y2='777'%3E%3Cstop offset='0' stop-color='%23e2db9d'/%3E%3Cstop offset='1' stop-color='%2383cdd4'/%3E%3C/linearGradient%3E%3ClinearGradient id='e' gradientUnits='userSpaceOnUse' x1='800' y1='25' x2='800' y2='777'%3E%3Cstop offset='0' stop-color='%23dde3a0'/%3E%3Cstop offset='1' stop-color='%2374b1c8'/%3E%3C/linearGradient%3E%3ClinearGradient id='f' gradientUnits='userSpaceOnUse' x1='850' y1='25' x2='850' y2='777'%3E%3Cstop offset='0' stop-color='%23d2e5a3'/%3E%3Cstop offset='1' stop-color='%236793bc'/%3E%3C/linearGradient%3E%3ClinearGradient id='g' gradientUnits='userSpaceOnUse' x1='900' y1='25' x2='900' y2='777'%3E%3Cstop offset='0' stop-color='%23c7e7a6'/%3E%3Cstop offset='1' stop-color='%235b75ae'/%3E%3C/linearGradient%3E%3ClinearGradient id='h' gradientUnits='userSpaceOnUse' x1='950' y1='25' x2='950' y2='777'%3E%3Cstop offset='0' stop-color='%23bde8a9'/%3E%3Cstop offset='1' stop-color='%23555c9b'/%3E%3C/linearGradient%3E%3ClinearGradient id='i' gradientUnits='userSpaceOnUse' x1='1000' y1='25' x2='1000' y2='777'%3E%3Cstop offset='0' stop-color='%23b4eaac'/%3E%3Cstop offset='1' stop-color='%23565185'/%3E%3C/linearGradient%3E%3ClinearGradient id='j' gradientUnits='userSpaceOnUse' x1='1050' y1='25' x2='1050' y2='777'%3E%3Cstop offset='0' stop-color='%23b0ebb4'/%3E%3Cstop offset='1' stop-color='%23574b70'/%3E%3C/linearGradient%3E%3ClinearGradient id='k' gradientUnits='userSpaceOnUse' x1='1100' y1='25' x2='1100' y2='777'%3E%3Cstop offset='0' stop-color='%23b3edc2'/%3E%3Cstop offset='1' stop-color='%2351455d'/%3E%3C/linearGradient%3E%3ClinearGradient id='l' gradientUnits='userSpaceOnUse' x1='1150' y1='25' x2='1150' y2='777'%3E%3Cstop offset='0' stop-color='%23b6eed0'/%3E%3Cstop offset='1' stop-color='%23473d4b'/%3E%3C/linearGradient%3E%3C/defs%3E%3Cg %3E%3Crect fill='url(%23a)' width='1200' height='800'/%3E%3Crect fill='url(%23b)' x='100' width='1100' height='800'/%3E%3Crect fill='url(%23c)' x='200' width='1000' height='800'/%3E%3Crect fill='url(%23d)' x='300' width='900' height='800'/%3E%3Crect fill='url(%23e)' x='400' width='800' height='800'/%3E%3Crect fill='url(%23f)' x='500' width='700' height='800'/%3E%3Crect fill='url(%23g)' x='600' width='600' height='800'/%3E%3Crect fill='url(%23h)' x='700' width='500' height='800'/%3E%3Crect fill='url(%23i)' x='800' width='400' height='800'/%3E%3Crect fill='url(%23j)' x='900' width='300' height='800'/%3E%3Crect fill='url(%23k)' x='1000' width='200' height='800'/%3E%3Crect fill='url(%23l)' x='1100' width='100' height='800'/%3E%3C/g%3E%3C/svg%3E\");\nbackground-attachment: fixed;\nbackground-size: cover;\n      }"],
  "def": "todo"
}, {
  "name": "Zen",
  "description": "",
  "categories": [["todo", {
    "title": "Right now",
    "styles": {}
  }], ["later", {
    "title": "Later",
    "styles": {}
  }]],
  "def": "todo",
  "styles": [// SVG pattern by HeroPatterns.com under CC BY 4.0 license
  ".board {\nbackground-color: #f8f8f8;\n\nbackground-image: url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 56 28' width='56' height='28'%3E%3Cpath fill='%23809883' fill-opacity='0.4' d='M56 26v2h-7.75c2.3-1.27 4.94-2 7.75-2zm-26 2a2 2 0 1 0-4 0h-4.09A25.98 25.98 0 0 0 0 16v-2c.67 0 1.34.02 2 .07V14a2 2 0 0 0-2-2v-2a4 4 0 0 1 3.98 3.6 28.09 28.09 0 0 1 2.8-3.86A8 8 0 0 0 0 6V4a9.99 9.99 0 0 1 8.17 4.23c.94-.95 1.96-1.83 3.03-2.63A13.98 13.98 0 0 0 0 0h7.75c2 1.1 3.73 2.63 5.1 4.45 1.12-.72 2.3-1.37 3.53-1.93A20.1 20.1 0 0 0 14.28 0h2.7c.45.56.88 1.14 1.29 1.74 1.3-.48 2.63-.87 4-1.15-.11-.2-.23-.4-.36-.59H26v.07a28.4 28.4 0 0 1 4 0V0h4.09l-.37.59c1.38.28 2.72.67 4.01 1.15.4-.6.84-1.18 1.3-1.74h2.69a20.1 20.1 0 0 0-2.1 2.52c1.23.56 2.41 1.2 3.54 1.93A16.08 16.08 0 0 1 48.25 0H56c-4.58 0-8.65 2.2-11.2 5.6 1.07.8 2.09 1.68 3.03 2.63A9.99 9.99 0 0 1 56 4v2a8 8 0 0 0-6.77 3.74c1.03 1.2 1.97 2.5 2.79 3.86A4 4 0 0 1 56 10v2a2 2 0 0 0-2 2.07 28.4 28.4 0 0 1 2-.07v2c-9.2 0-17.3 4.78-21.91 12H30zM7.75 28H0v-2c2.81 0 5.46.73 7.75 2zM56 20v2c-5.6 0-10.65 2.3-14.28 6h-2.7c4.04-4.89 10.15-8 16.98-8zm-39.03 8h-2.69C10.65 24.3 5.6 22 0 22v-2c6.83 0 12.94 3.11 16.97 8zm15.01-.4a28.09 28.09 0 0 1 2.8-3.86 8 8 0 0 0-13.55 0c1.03 1.2 1.97 2.5 2.79 3.86a4 4 0 0 1 7.96 0zm14.29-11.86c1.3-.48 2.63-.87 4-1.15a25.99 25.99 0 0 0-44.55 0c1.38.28 2.72.67 4.01 1.15a21.98 21.98 0 0 1 36.54 0zm-5.43 2.71c1.13-.72 2.3-1.37 3.54-1.93a19.98 19.98 0 0 0-32.76 0c1.23.56 2.41 1.2 3.54 1.93a15.98 15.98 0 0 1 25.68 0zm-4.67 3.78c.94-.95 1.96-1.83 3.03-2.63a13.98 13.98 0 0 0-22.4 0c1.07.8 2.09 1.68 3.03 2.63a9.99 9.99 0 0 1 16.34 0z'%3E%3C/path%3E%3C/svg%3E\");\n      }", " .category header {\n      border-radius: 0.5em;\n      background-color: rgba(60, 60, 60, 0.7);\n      color: #ececec;\n      }\n      "]
}, {
  "name": "Trifold",
  "description": "",
  "categories": [["todo", {
    "title": "Todo list",
    "styles": {}
  }], ["inprogress", {
    "title": "In progress",
    "styles": {}
  }], ["complete", {
    "title": "Completed",
    "styles": {}
  }]],
  "styles": [// SVG background from SVGBackgrounds.com
  " .board {\n      background-color: #dcab95;\n\nbackground-image: url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100%25' height='100%25' viewBox='0 0 1200 800'%3E%3Cdefs%3E%3ClinearGradient id='a' gradientUnits='userSpaceOnUse' x1='600' y1='25' x2='600' y2='777'%3E%3Cstop offset='0' stop-color='%23dcab95'/%3E%3Cstop offset='1' stop-color='%23b6eed0'/%3E%3C/linearGradient%3E%3ClinearGradient id='b' gradientUnits='userSpaceOnUse' x1='650' y1='25' x2='650' y2='777'%3E%3Cstop offset='0' stop-color='%23debb98'/%3E%3Cstop offset='1' stop-color='%23a4e6d0'/%3E%3C/linearGradient%3E%3ClinearGradient id='c' gradientUnits='userSpaceOnUse' x1='700' y1='25' x2='700' y2='777'%3E%3Cstop offset='0' stop-color='%23e0cb9b'/%3E%3Cstop offset='1' stop-color='%2393ded4'/%3E%3C/linearGradient%3E%3ClinearGradient id='d' gradientUnits='userSpaceOnUse' x1='750' y1='25' x2='750' y2='777'%3E%3Cstop offset='0' stop-color='%23e2db9d'/%3E%3Cstop offset='1' stop-color='%2383cdd4'/%3E%3C/linearGradient%3E%3ClinearGradient id='e' gradientUnits='userSpaceOnUse' x1='800' y1='25' x2='800' y2='777'%3E%3Cstop offset='0' stop-color='%23dde3a0'/%3E%3Cstop offset='1' stop-color='%2374b1c8'/%3E%3C/linearGradient%3E%3ClinearGradient id='f' gradientUnits='userSpaceOnUse' x1='850' y1='25' x2='850' y2='777'%3E%3Cstop offset='0' stop-color='%23d2e5a3'/%3E%3Cstop offset='1' stop-color='%236793bc'/%3E%3C/linearGradient%3E%3ClinearGradient id='g' gradientUnits='userSpaceOnUse' x1='900' y1='25' x2='900' y2='777'%3E%3Cstop offset='0' stop-color='%23c7e7a6'/%3E%3Cstop offset='1' stop-color='%235b75ae'/%3E%3C/linearGradient%3E%3ClinearGradient id='h' gradientUnits='userSpaceOnUse' x1='950' y1='25' x2='950' y2='777'%3E%3Cstop offset='0' stop-color='%23bde8a9'/%3E%3Cstop offset='1' stop-color='%23555c9b'/%3E%3C/linearGradient%3E%3ClinearGradient id='i' gradientUnits='userSpaceOnUse' x1='1000' y1='25' x2='1000' y2='777'%3E%3Cstop offset='0' stop-color='%23b4eaac'/%3E%3Cstop offset='1' stop-color='%23565185'/%3E%3C/linearGradient%3E%3ClinearGradient id='j' gradientUnits='userSpaceOnUse' x1='1050' y1='25' x2='1050' y2='777'%3E%3Cstop offset='0' stop-color='%23b0ebb4'/%3E%3Cstop offset='1' stop-color='%23574b70'/%3E%3C/linearGradient%3E%3ClinearGradient id='k' gradientUnits='userSpaceOnUse' x1='1100' y1='25' x2='1100' y2='777'%3E%3Cstop offset='0' stop-color='%23b3edc2'/%3E%3Cstop offset='1' stop-color='%2351455d'/%3E%3C/linearGradient%3E%3ClinearGradient id='l' gradientUnits='userSpaceOnUse' x1='1150' y1='25' x2='1150' y2='777'%3E%3Cstop offset='0' stop-color='%23b6eed0'/%3E%3Cstop offset='1' stop-color='%23473d4b'/%3E%3C/linearGradient%3E%3C/defs%3E%3Cg %3E%3Crect fill='url(%23a)' width='1200' height='800'/%3E%3Crect fill='url(%23b)' x='100' width='1100' height='800'/%3E%3Crect fill='url(%23c)' x='200' width='1000' height='800'/%3E%3Crect fill='url(%23d)' x='300' width='900' height='800'/%3E%3Crect fill='url(%23e)' x='400' width='800' height='800'/%3E%3Crect fill='url(%23f)' x='500' width='700' height='800'/%3E%3Crect fill='url(%23g)' x='600' width='600' height='800'/%3E%3Crect fill='url(%23h)' x='700' width='500' height='800'/%3E%3Crect fill='url(%23i)' x='800' width='400' height='800'/%3E%3Crect fill='url(%23j)' x='900' width='300' height='800'/%3E%3Crect fill='url(%23k)' x='1000' width='200' height='800'/%3E%3Crect fill='url(%23l)' x='1100' width='100' height='800'/%3E%3C/g%3E%3C/svg%3E\");\nbackground-attachment: fixed;\nbackground-size: cover;\n      }"],
  "def": "todo"
}, {
  "name": "Zen",
  "description": "",
  "categories": [["todo", {
    "title": "Right now",
    "styles": {}
  }], ["later", {
    "title": "Later",
    "styles": {}
  }]],
  "def": "todo",
  "styles": [// SVG pattern by HeroPatterns.com under CC BY 4.0 license
  ".board {\nbackground-color: #f8f8f8;\n\nbackground-image: url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 56 28' width='56' height='28'%3E%3Cpath fill='%23809883' fill-opacity='0.4' d='M56 26v2h-7.75c2.3-1.27 4.94-2 7.75-2zm-26 2a2 2 0 1 0-4 0h-4.09A25.98 25.98 0 0 0 0 16v-2c.67 0 1.34.02 2 .07V14a2 2 0 0 0-2-2v-2a4 4 0 0 1 3.98 3.6 28.09 28.09 0 0 1 2.8-3.86A8 8 0 0 0 0 6V4a9.99 9.99 0 0 1 8.17 4.23c.94-.95 1.96-1.83 3.03-2.63A13.98 13.98 0 0 0 0 0h7.75c2 1.1 3.73 2.63 5.1 4.45 1.12-.72 2.3-1.37 3.53-1.93A20.1 20.1 0 0 0 14.28 0h2.7c.45.56.88 1.14 1.29 1.74 1.3-.48 2.63-.87 4-1.15-.11-.2-.23-.4-.36-.59H26v.07a28.4 28.4 0 0 1 4 0V0h4.09l-.37.59c1.38.28 2.72.67 4.01 1.15.4-.6.84-1.18 1.3-1.74h2.69a20.1 20.1 0 0 0-2.1 2.52c1.23.56 2.41 1.2 3.54 1.93A16.08 16.08 0 0 1 48.25 0H56c-4.58 0-8.65 2.2-11.2 5.6 1.07.8 2.09 1.68 3.03 2.63A9.99 9.99 0 0 1 56 4v2a8 8 0 0 0-6.77 3.74c1.03 1.2 1.97 2.5 2.79 3.86A4 4 0 0 1 56 10v2a2 2 0 0 0-2 2.07 28.4 28.4 0 0 1 2-.07v2c-9.2 0-17.3 4.78-21.91 12H30zM7.75 28H0v-2c2.81 0 5.46.73 7.75 2zM56 20v2c-5.6 0-10.65 2.3-14.28 6h-2.7c4.04-4.89 10.15-8 16.98-8zm-39.03 8h-2.69C10.65 24.3 5.6 22 0 22v-2c6.83 0 12.94 3.11 16.97 8zm15.01-.4a28.09 28.09 0 0 1 2.8-3.86 8 8 0 0 0-13.55 0c1.03 1.2 1.97 2.5 2.79 3.86a4 4 0 0 1 7.96 0zm14.29-11.86c1.3-.48 2.63-.87 4-1.15a25.99 25.99 0 0 0-44.55 0c1.38.28 2.72.67 4.01 1.15a21.98 21.98 0 0 1 36.54 0zm-5.43 2.71c1.13-.72 2.3-1.37 3.54-1.93a19.98 19.98 0 0 0-32.76 0c1.23.56 2.41 1.2 3.54 1.93a15.98 15.98 0 0 1 25.68 0zm-4.67 3.78c.94-.95 1.96-1.83 3.03-2.63a13.98 13.98 0 0 0-22.4 0c1.07.8 2.09 1.68 3.03 2.63a9.99 9.99 0 0 1 16.34 0z'%3E%3C/path%3E%3C/svg%3E\");\n      }", " .category header {\n      border-radius: 0.5em;\n      background-color: rgba(60, 60, 60, 0.7);\n      color: #ececec;\n      }\n      "]
}].map(function (t) {
  return [t.name, new Template(t)];
}));

Template.prototype.attachCategories = function (target, map) {
  this.categories.forEach(function (cat, name) {
    var element = document.createElement('div');
    element.className = "category cat-".concat(name, " task-drop-target");
    element.innerHTML = "<header><h1>".concat(cat.title, "</h1></header>\n    <div class=\"task-container cat-").concat(name, " task-drop-target\"></div>");
    map[name] = element.lastChild;
    target.appendChild(element);
  });
};

Template.prototype.attachStylesheet = function (target) {
  var style = document.createElement('style');
  style.appendChild(document.createTextNode(""));
  target.appendChild(style);

  for (var i in this.styles) {
    style.sheet.insertRule(this.styles[i], i);
  }
};

Template.getTemplate = function (template) {
  return Template.templates.get(template);
};

Template.renderTemplateListing = function (template) {
  var element = document.createElement('li');
  element.className = 'template-listing';
  element.innerHTML = "<h1>".concat(template.name, "</h1>\n    ").concat(template.description);
  return element;
};

Template.getCatFromClassList = function (elem) {
  var _iterator3 = _createForOfIteratorHelper(elem.classList.values()),
      _step3;

  try {
    for (_iterator3.s(); !(_step3 = _iterator3.n()).done;) {
      var s = _step3.value;

      if (s.substr(0, 4) === 'cat-') {
        return s.substr(4);
      }
    }
  } catch (err) {
    _iterator3.e(err);
  } finally {
    _iterator3.f();
  }
};

var clamp = function clamp(a, b, c) {
  return Math.max(a, Math.min(b, c));
};

var mex = function mex(arr) {
  var min = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 1;
  var n = min;

  while (arr.includes(n)) {
    n++;
  }

  return n;
};

var dist = function dist(p1, p2) {
  return Math.sqrt(p1.x - p2.x ^ 2 + (p1.y - p2.y) ^ 2);
};

var autoResize = function autoResize(text) {
  var resizeTextarea = function resizeTextarea() {
    text.style.height = 'auto';
    text.style.height = clamp(0, text.scrollHeight, 500) + 'px';
  };

  text.addEventListener('change', resizeTextarea);
  text.addEventListener('cut', function () {
    return setTimeout(resizeTextarea, 0);
  });
  text.addEventListener('paste', function () {
    return setTimeout(resizeTextarea, 0);
  });
  text.addEventListener('input', function () {
    return setTimeout(resizeTextarea, 0);
  });
  setTimeout(resizeTextarea, 0);
};

function makeExpandible(expandible, handle, exitButton) {
  handle.addEventListener('click', function () {
    expandible.classList.toggle('expanded');
    handle.classList.toggle('on');
  });

  if (exitButton !== undefined) {
    exitButton.addEventListener('click', function () {
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


var makeDynamicField = function makeDynamicField(editTrigger, dyntext, dyninput, changeHandler) {
  var updateAndSave = function updateAndSave() {
    var good = changeHandler(dyninput.value);
    if (good) dyntext.innerText = dyninput.value;else dyninput.value = dyntext.innerText;
    dyntext.classList.add('on');
    dyninput.classList.remove('on');
  };

  var edit = function edit() {
    if (document.activeElement === dyninput) return false; // Don't do anything if the board is already being edited

    dyninput.value = dyntext.innerText;
    dyntext.classList.remove('on');
    dyninput.classList.add('on');
    dyninput.focus();
    setTimeout(function () {
      return dyninput.select();
    }, 0);
  };

  dyninput.addEventListener('focusout', updateAndSave);
  editTrigger.addEventListener('click', edit);
  return edit;
};