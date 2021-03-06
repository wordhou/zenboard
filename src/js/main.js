/* global $, makeExpandible, clamp, autoResize, Template, State */

const addTemplateList = function (target, state) {
  Template.templates.forEach((template, name) => {
    const element = Template.renderTemplateListing(template);
    element.addEventListener('click', () => state.changeTemplate(name));
    target.appendChild(element);
  });
}

var state; // DEBUG:
window.addEventListener('load', () => {
  const $ = id => document.getElementById(id); // Alias for brevity

  makeExpandible($('board-drawer'), $('board-drawer-handle'));
  makeExpandible($('template-list-expand'),
    $('template-list-expander'),
    $('template-list-exit')
  );
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
