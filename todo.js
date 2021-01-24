/* global $, clamp, autoResize, State, Task, Board */

function makeExpandible (expandible, handle) {
  handle.addEventListener('click', () => {
    expandible.classList.toggle('expanded');
    handle.classList.toggle('expanded');
  });
}

var state; // DEBUG:
window.addEventListener('load', () => {
  makeExpandible($('board-drawer'), $('board-drawer-handle'));
  makeExpandible($('template-list'), $('template-list-expander'));

  state = new State({
    board: $('board-wrapper'),
    boardList: $('board-list-content'),
    spinner: undefined,
    newTask: $('new-task'),
    newBoard: $('new-board'),
    deleteBoard: $('delete-board'),
    toggleView: $('toggle-view')
  });
  state.load();
});
