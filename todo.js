/* global $, clamp, autoResize, State, Task, Board */

var state; // DEBUG:
window.addEventListener('load', () => {
  (() => {
    const expandible = $('boards-drawer');
    const handle = $('boards-drawer-handle');

    handle.addEventListener('click', () => {
      expandible.classList.toggle('expanded');
      handle.classList.toggle('expanded');
    });
  })();

  state = new State({
    boardNode: document.getElementById('board-wrapper'),
    boardListNode: document.getElementById('board-list')
  });
  state.load();
});
