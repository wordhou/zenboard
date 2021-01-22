/* global $, clamp, autoResize, Task, Board */

/**
 * Manages the global state of the application as well as saving and
 * loading information from localStorage.
 */
function State ({ boardListNode, boardNode }) {
  this.boardListNode = boardListNode;
  this.boardNode = boardNode;
}

State.DEFAULT_BOARD_NAME = 'Default Board';
State.NEW_BOARD_NAME = 'New Board';

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
  
  const defaultBoard = new Board({name: def, width: 1024, height: 768});
  defaultBoard.saveTasks();
  this.addBoard(defaultBoard);
  this._setBoard(defaultBoard);
  this.save();
};

/** */
State.prototype._setBoard = function (board) {
  this.current = board.name;
  this.board = board;
  board.attach(this.boardNode);
  this._styleActiveListing();
};

State.prototype._styleActiveListing = function () {
  for (let board of this.boards.values()) {
    board.listingNode.classList.toggle('on', this.current === board.name);
    // TODO This doesn't seem right
  }
};

/** */
State.prototype.save = function () {
  console.log('Saving settings and board info...');
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
  this.boardListNode.appendChild(board.listingNode);
  board.addHandlersToListing();
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
  board.saveTasks();
  this.addBoard(board);
  this.save();
};

State.prototype._deleteBoard = function (boardName) {
  console.log('deleting');
  const board = this.boards.get(boardName);
  board.deleteTasks();
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
  document.addEventListener('boardselect', event => {
    this.loadBoard(event.detail);
  }, true);

  document.addEventListener('renameboard', event => {
    const success = this.renameBoard( event.detail.board, event.detail.newName );
    console.log('Was rename successful?', success);
    // Indicates to the event dispatcher that the rename was unsuccessful
    if (!success) event.preventDefault();
  }, { passive: false });

  document.addEventListener('boardchange', () => this.save());

  $('new-task').addEventListener('click', () => {
    const task = this.board.addTask(new Task({x: 200, y: 200}));

    // TODO: On click, add task to random? board position;
    // On hold, create drag and drop event listeners.
    task.node.getElementsByTagName('textarea')[0].focus();
  });

  $('new-board').addEventListener('click', () => this.newBoard());
  $('delete-board').addEventListener('click', () => this.deleteBoard());
};